import crypto from "node:crypto";

export const STATUS=["available","experiment","preparation","future"];
export const STORE_PREFIX="pz:manifest:v1";
export const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
export const rand=()=>crypto.randomBytes(32).toString("hex");
export const safeString=(x,max)=>typeof x==="string"&&x.length<=max;
export const dateOk=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
export const escapeHTML=x=>String(x).replace(/[&<>"']/g,s=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[s]));
export const setNoStore=res=>{res.setHeader("Cache-Control","no-store, max-age=0");res.setHeader("X-Content-Type-Options","nosniff");};
export const error=(res,status,message)=>res.status(status).json({error:message});
export const credentialsReady=()=>!!(process.env.UPSTASH_REDIS_REST_URL&&process.env.UPSTASH_REDIS_REST_TOKEN);
export const waitlistReady=()=>credentialsReady()&&!!(process.env.RESEND_API_KEY&&process.env.POINTZERO_PUBLIC_ORIGIN&&process.env.TURNSTILE_SECRET_KEY&&process.env.POINTZERO_FROM_EMAIL&&process.env.POINTZERO_PRIVACY_EMAIL&&process.env.POINTZERO_LEGAL_ENTITY&&process.env.POINTZERO_PRIVACY_POLICY_URL&&/^https:\/\//i.test(process.env.POINTZERO_PRIVACY_POLICY_URL));
export const adminReady=()=>credentialsReady()&&!!process.env.POINTZERO_LAUNCH_ADMIN_SECRET;
export const adminAuthorized=req=>{
 const expected=process.env.POINTZERO_LAUNCH_ADMIN_SECRET,got=String(req.headers["x-pointzero-admin"]||"");
 if(!expected||!got||got.length>400)return false;
 return crypto.timingSafeEqual(Buffer.from(hash(expected)),Buffer.from(hash(got)));
};
const redisURL=()=>String(process.env.UPSTASH_REDIS_REST_URL||"").replace(/\/$/,"");
export async function redis(...args){
 if(!credentialsReady())throw Error("Stockage d'inscriptions non configuré.");
 const response=await fetch(redisURL(),{
  method:"POST",
  headers:{"Authorization":"Bearer "+process.env.UPSTASH_REDIS_REST_TOKEN,"Content-Type":"application/json"},
  body:JSON.stringify(args),signal:AbortSignal.timeout(7500)
 });
 if(!response.ok)throw Error("Stockage temporairement indisponible.");
 const data=await response.json();
 if(data.error)throw Error("Opération de stockage refusée.");
 return data.result;
}
export const expectedRoutes={
 identite:"one-space",administratif:"admin",web:"mini-site",chronologique:"programme",creatif:"design",
 evenementiel:"one-space",transmission:"art-world",organisation:"one-space",formation:"academy",causalite:"causal",
 metamorphose:"metamorphose",ripplecircle:"ripplecircle",game:"game"
};
export function validConfig(raw){
 if(!raw||typeof raw!=="object"||raw.version!==1)return false;
 if(!safeString(raw.title,130)||!safeString(raw.eyebrow,130)||!safeString(raw.subtitle,220)||
 !safeString(raw.introduction,900)||!safeString(raw.announcement,500)||!safeString(raw.mainLabel,130)||
 !(raw.mainDate===null||dateOk(raw.mainDate))||!Array.isArray(raw.studios)||raw.studios.length!==13||
 !Array.isArray(raw.journal)||raw.journal.length>80||
 (raw.aimeSignatures!==undefined&&(!Array.isArray(raw.aimeSignatures)||raw.aimeSignatures.length<1||
 raw.aimeSignatures.length>8||raw.aimeSignatures.some(x=>!safeString(x,160)||!x.startsWith("Architecture Intelligente ")))))return false;
 const ids=new Set();
 for(const s of raw.studios){
  if(!s||!(s.id in expectedRoutes)||ids.has(s.id)||s.route!==expectedRoutes[s.id]||
   !STATUS.includes(s.status)||!safeString(s.title,120)||!safeString(s.description,550)||
   !/^\d{2}$/.test(s.number)||typeof s.published!=="boolean"||typeof s.preview!=="boolean"||
   !(s.openAt===null||dateOk(s.openAt))||!Array.isArray(s.history)||s.history.length>20||
   !s.history.every(x=>safeString(x,300)))return false;
  ids.add(s.id);
 }
 return raw.journal.every(j=>j&&safeString(j.id,100)&&/^\d{4}-\d\d-\d\d$/.test(j.date)&&
  ["Conçu","Développé","Testé","Publié","Prévu"].includes(j.status)&&safeString(j.title,240)&&safeString(j.source,900));
}
export const validOrigin=req=>{
 const origin=req.headers.origin;
 if(!origin)return true; // Same-origin requests often omit Origin; tokens/captcha still required.
 const host=String(req.headers["x-forwarded-host"]||req.headers.host||"").split(",")[0].trim().toLowerCase();
 try{return new URL(origin).host.toLowerCase()===host}catch{return false}
};
export async function verifyTurnstile(token,ip){
 if(!process.env.TURNSTILE_SECRET_KEY||typeof token!=="string"||token.length<10||token.length>3000)return false;
 const body=new URLSearchParams({secret:process.env.TURNSTILE_SECRET_KEY,response:token});
 if(ip)body.set("remoteip",ip);
 const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",
  {method:"POST",body,signal:AbortSignal.timeout(9000)});
 if(!response.ok)return false;
 const data=await response.json();
 return data.success===true;
}
export const clientIP=req=>String(req.headers["x-forwarded-for"]||req.socket?.remoteAddress||"unknown").split(",")[0].trim().slice(0,100);
export const normalizeEmail=email=>String(email||"").trim().toLowerCase();
export const validEmail=email=>email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
export async function resendEmail(to,subject,html){
 const sender=String(process.env.POINTZERO_FROM_EMAIL||"");
 const response=await fetch("https://api.resend.com/emails",{
  method:"POST",
  headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
  body:JSON.stringify({from:sender,to:[to],subject,html}),
  signal:AbortSignal.timeout(9000)
 });
 if(!response.ok)throw Error("Le courriel de validation n'a pas pu être envoyé.");
 return response.json();
}
export const fullUrl=(action,token)=>{
 const root=String(process.env.POINTZERO_PUBLIC_ORIGIN||"");
 const url=new URL("/api/pointzero-confirm",root);
 url.searchParams.set("action",action);url.searchParams.set("token",token);return url.toString();
};
export const respondPage=(res,title,body)=>{
 res.setHeader("Content-Type","text/html; charset=utf-8");
 res.setHeader("Content-Security-Policy","default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
 return res.status(200).end("<!doctype html><html lang='fr'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>"+escapeHTML(title)+" · POINTZERO</title><body style='font:16px system-ui;background:#f8f8f7;color:#222;margin:0;padding:8vh 24px;text-align:center'><main style='max-width:480px;margin:auto'><p>POINTZERO .0</p><h1>"+escapeHTML(title)+"</h1>"+body+"<p style='margin-top:35px'><a href='/'>Retour à POINTZERO</a></p></main></body></html>");
};

// Shared helper is not a public endpoint.
export default function notAnEndpoint(_req,res){return res.status(404).end();}

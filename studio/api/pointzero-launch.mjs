import {
 adminAuthorized,adminReady,clientIP,credentialsReady,error,escapeHTML,fullUrl,hash,
 normalizeEmail,rand,redis,resendEmail,setNoStore,validConfig,validEmail,validOrigin,
 waitlistReady,verifyTurnstile
} from "./_launch-utils.mjs";

const key="pz:manifest:v1";
const supported=new Set(["identite","administratif","web","chronologique","creatif","evenementiel","transmission","organisation","formation","causalite","metamorphose","ripplecircle","game"]);
const safeConfig=async()=>{
 if(!credentialsReady())return null;
 try{const val=await redis("GET",key+":config");const parsed=val?JSON.parse(val):null;return validConfig(parsed)?parsed:null;}catch{return null;}
};
export default async function handler(req,res){
 setNoStore(res);
 res.setHeader("X-Frame-Options","DENY");
 if(!validOrigin(req))return error(res,403,"Origine de la requête non autorisée.");
 if(req.method==="GET"){
  if(req.query?.admin==="1"){
   if(!adminReady()||!adminAuthorized(req))return error(res,401,"Administration non autorisée.");
   try{
    const totals={};
    for(const k of supported)totals[k]=Number(await redis("SCARD",key+":interest:"+k)||0);
    return res.status(200).json({
      config:await safeConfig(),draft:await (async()=>{const d=await redis("GET",key+":draft");try{const c=JSON.parse(d);return validConfig(c)?c:null}catch{return null}})(),confirmed:Number(await redis("SCARD",key+":confirmed")||0),
      interests:totals
    });
   }catch{return error(res,503,"Stockage administrateur indisponible.");}
  }
  return res.status(200).json({
   config:await safeConfig(),
   signupReady:waitlistReady()&&!!process.env.TURNSTILE_SITE_KEY,
   turnstileSiteKey:waitlistReady()?process.env.TURNSTILE_SITE_KEY||"":"",
   legalEntity:process.env.POINTZERO_LEGAL_ENTITY||"",
   privacyContact:process.env.POINTZERO_PRIVACY_EMAIL||"",
   privacyPolicyUrl:process.env.POINTZERO_PRIVACY_POLICY_URL||""});
 }
 if(req.method!=="POST")return error(res,405,"Méthode non autorisée.");
 if(Number(req.headers["content-length"]||0)>160_000)return error(res,413,"Requête trop volumineuse.");
 const action=req.body?.action;
 if(action==="admin-save"||action==="admin-publish"){
  if(!adminReady()||!adminAuthorized(req))return error(res,401,"Code administrateur non valide.");
  if(!validConfig(req.body?.config))return error(res,400,"Configuration invalide.");
  try{
   await redis("SET",key+(action==="admin-save"?":draft":":config"),JSON.stringify(req.body.config));
   return res.status(200).json({saved:true,published:action==="admin-publish"});
  }catch{return error(res,503,"Sauvegarde non disponible.");}
 }
 if(action==="unsubscribe-request"){
  if(!waitlistReady()||!process.env.TURNSTILE_SITE_KEY)return error(res,503,"Service de désinscription indisponible.");
  const email=normalizeEmail(req.body?.email);
  if(!validEmail(email))return error(res,400,"Adresse e-mail invalide.");
  let ok=false;try{ok=await verifyTurnstile(req.body?.turnstile,clientIP(req));}catch{}
  if(!ok)return error(res,400,"Vérification anti-robot incorrecte.");
  try{
   const userHash=hash(email),emailKey=key+":email:"+userHash;
   const serialized=await redis("GET",emailKey);
   if(serialized){
    const data=JSON.parse(serialized);
    if(data.status==="confirmed"){
     const token=rand(),old=data.unsubscribeHash;data.unsubscribeHash=hash(token);
     await redis("SET",emailKey,JSON.stringify(data));
     await redis("SET",key+":unsubscribe:"+hash(token),userHash,"EX",259200);
     if(old)await redis("DEL",key+":unsubscribe:"+old);
     await resendEmail(email,"Désinscription POINTZERO .0","<p>Pour vous désinscrire des informations POINTZERO, ouvrez ce lien : <a href='"+escapeHTML(fullUrl("unsubscribe",token))+"'>Me désinscrire</a>.</p><p>Ce lien expire dans 72 heures.</p>");
    }
   }
   return res.status(200).json({status:"sent",message:"Si cette adresse est inscrite, un lien de désinscription a été envoyé."});
  }catch{return error(res,503,"Demande de désinscription momentanément indisponible.");}
 }
 if(action!=="subscribe")return error(res,400,"Action inconnue.");
 if(!waitlistReady()||!process.env.TURNSTILE_SITE_KEY)return error(res,503,"Les inscriptions ne sont pas encore activées.");
 const body=req.body||{},email=normalizeEmail(body.email);
 if(body.website)return error(res,400,"Inscription refusée.");
 if(!validEmail(email)||typeof body.firstName!=="string"||body.firstName.length>70||
  body.consent!==true||!Array.isArray(body.interests)||body.interests.length<1||
  body.interests.length>8||!body.interests.every(k=>supported.has(k))||
  new Set(body.interests).size!==body.interests.length)return error(res,400,"Veuillez vérifier les champs et accepter l'inscription.");
 const ip=clientIP(req);
 let allowed=false;
 try{allowed=await verifyTurnstile(body.turnstile,ip);}catch{}
 if(!allowed)return error(res,400,"Vérification anti-robot non réussie.");
 const normalized=hash(email),emailKey=key+":email:"+normalized,token=rand(),unsubscribe=rand();
 const data={
   email,firstName:body.firstName.trim(),interests:body.interests,consentedAt:new Date().toISOString(),
   consentText:"Recevoir les informations d'ouverture des studios POINTZERO",
   status:"pending",unsubscribeHash:hash(unsubscribe)
 };
 try{
  const throttled=await redis("SET",key+":rate:"+hash(ip),"1","EX",60,"NX");
  if(throttled!=="OK")return error(res,429,"Trop de tentatives. Réessayez ultérieurement.");
  const inserted=await redis("SET",emailKey,JSON.stringify(data),"EX",259200,"NX");
  if(inserted!=="OK")return res.status(200).json({status:"pending",message:"Une inscription existe déjà pour cette adresse. Vérifiez votre boîte mail."});
  await redis("SET",key+":confirm:"+hash(token),normalized,"EX",259200);
  await redis("SET",key+":unsubscribe:"+hash(unsubscribe),normalized,"EX",259200);
  try{
   const link=fullUrl("confirm",token);
   const name=data.firstName?escapeHTML(data.firstName)+", ":"";
   await resendEmail(email,"Confirmez votre intérêt pour POINTZERO .0",
    "<div style='font-family:system-ui;line-height:1.6;max-width:620px'><h1>POINTZERO .0 — Le temps retrouvé.</h1><p>Bonjour "+name+"confirmez votre inscription aux informations d'ouverture des studios.</p><p><a href='"+escapeHTML(link)+"'>Confirmer mon inscription</a></p><p>Ce lien expire dans 72 heures. Sans confirmation, vos informations en attente seront effacées.</p><p><a href='"+escapeHTML(fullUrl("unsubscribe",unsubscribe))+"'>Lien de désinscription</a> à conserver si vous confirmez.</p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p></div>");
  }catch{
   await Promise.allSettled([redis("DEL",emailKey),redis("DEL",key+":confirm:"+hash(token)),redis("DEL",key+":unsubscribe:"+hash(unsubscribe))]);
   return error(res,502,"Le mail de confirmation n'a pas pu être envoyé. Aucune inscription n'a été enregistrée.");
  }
  return res.status(200).json({status:"pending",message:"Vérifiez votre e-mail : un lien de confirmation vient d'être envoyé."});
 }catch{return error(res,503,"Les inscriptions sont temporairement indisponibles.");}
}

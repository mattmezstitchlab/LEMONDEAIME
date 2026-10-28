import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";
import crypto from "node:crypto";

/** Prototype: restricted, read-only HTML inspection. Never a legal certification. */
export const config={maxDuration:20};
const text=(value,max=200)=>String(value||"").replace(/\s+/g," ").trim().slice(0,max);
const deny=(res,code,message)=>res.status(code).json({error:message});
function publicIPv4(address){
 if(net.isIP(address)!==4)return false; // IPv6 disabled until full IPv6 egress policy is available.
 const [a,b,c]=address.split(".").map(Number);
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||
 a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||
 a===198&&(b===18||b===19||b===51)||a===203&&b===0||a===192&&b===0&&c===2);
}
function safeUrl(raw){
 if(typeof raw!=="string"||raw.length>1500)throw Error("Adresse invalide.");
 const u=new URL(raw);
 if(u.protocol!=="https:"||u.username||u.password||(u.port&&u.port!=="443")||
 net.isIP(u.hostname)||!u.hostname.includes(".")||/\.(local|internal|localhost|test|invalid)$/i.test(u.hostname))throw Error("Seules les URLs HTTPS publiques sans authentification sont autorisées.");
 u.hash="";return u;
}
const matchText=(html,pattern)=>text((pattern.exec(html)||[])[1]||"");
const plain=s=>text(String(s||"").replace(/<[^>]*>/g," ").replace(/&(?:amp|nbsp);/g," ").replace(/&quot;/g,'"'),350);
async function getHtml(input){
 const u=safeUrl(input);
 const allowed=(process.env.POINTZERO_SCAN_ALLOWED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 if(!allowed.length||!allowed.includes(u.hostname.toLowerCase()))throw Error("Domaine non autorisé : configurez la liste des sites de test possédés.");
 const addresses=await dns.lookup(u.hostname,{all:true,verbatim:true});
 if(!addresses.length||addresses.some(({address})=>!publicIPv4(address)))throw Error("Destination réseau bloquée.");
 const chosen=addresses[0];
 return new Promise((resolve,reject)=>{
  const req=https.request(u,{timeout:9000,lookup:(_h,_o,cb)=>cb(null,chosen.address,chosen.family),
   headers:{"User-Agent":"POINTZERO-Metamorphose/0.2 (read-only)",Accept:"text/html","Accept-Encoding":"identity"}},res=>{
   if((res.statusCode||0)<200||(res.statusCode||0)>299){res.resume();return reject(Error("Réponse HTTP "+res.statusCode+" (redirections non suivies)."));}
   if(!String(res.headers["content-type"]||"").toLowerCase().includes("text/html")){res.resume();return reject(Error("La page ne renvoie pas de HTML."));}
   let size=0;const chunks=[];
   res.on("data",chunk=>{size+=chunk.length;if(size>1_000_000){req.destroy(Error("HTML trop volumineux."));return;}chunks.push(chunk);});
   res.on("end",()=>resolve({html:Buffer.concat(chunks).toString("utf8"),url:u.href}));
  });
  req.on("error",reject);req.on("timeout",()=>req.destroy(Error("Délai du site dépassé.")));req.end();
 });
}
const abs=(href,base)=>{try{const x=new URL(href,base);return x.protocol==="https:"?x.href:"";}catch{return ""}};
function inspect(input){
 const {html,url}=input;
 const hostname=new URL(url).hostname;
 const title=plain(matchText(html,/<title[^>]*>([\s\S]*?)<\/title>/i))||hostname;
 const sections=[...html.matchAll(/<(h[1-3])(?:\s[^>]*)?>([\s\S]{1,2000}?)<\/\1>/gi)].slice(0,24);
 const og=(/<meta[^>]*(?:property=["']og:image["'][^>]*content=["']([^"']+)|content=["']([^"']+)["'][^>]*property=["']og:image)/i.exec(html)||[]);
 const image=abs(og[1]||og[2]||"",url);
 const fragments=[{id:"scan_0",title,description:"Structure HTML initiale du site",kind:"source",sourceUrl:url,image,span:2,locked:false,crop:{x:50,y:50,zoom:100},notes:""}];
 for(const [i,m] of sections.entries()){
  const value=plain(m[2]);if(!value)continue;
  fragments.push({id:"scan_"+(i+1),title:value,description:"En-tête "+m[1].toUpperCase()+" · vérifier le rendu visuel",kind:"section",sourceUrl:url,image:"",span:1,locked:false,crop:{x:50,y:50,zoom:100},notes:""});
 }
 const findings=[];
 const add=(label,evidence)=>findings.push({id:"obs_"+findings.length,title:label,evidence,status:"verification_humaine"});
 if(!/<html[^>]+\blang\s*=/i.test(html))add("Langue non déclarée","L'attribut lang est absent du HTML reçu.");
 if(!/<h1[\s>]/i.test(html))add("H1 à vérifier","Le HTML initial ne contient aucun h1 détectable.");
 for(const [pattern,label] of [[/mentions.l.gales|impressum|legal.notice/i,"Mentions légales"],[/cgv|conditions.g.n.rales|conditions.de.vente/i,"CGV"],[/confidentialit|privacy/i,"Confidentialité"]]){
  if(!pattern.test(html))add(label+" à vérifier","Lien non détecté par heuristique textuelle. Il peut exister dans la version rendue.");
 }
 if(/cookie|consent|onetrust|didomi/i.test(html))add("Cookies : contrôle manuel","Marqueurs détectés ; aucun scénario de consentement n'a été exécuté.");
 return {url,title,fragments,findings,limitations:["Une seule page HTML statique, sans exécution JavaScript.","Une image OpenGraph éventuelle, pas une capture pixel à pixel.","Aucune observation ne vaut avis juridique ou certificat de conformité."]};
}
let lastScan=0,scanActive=false;
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST")return deny(res,405,"Méthode non autorisée.");
 const gate=process.env.POINTZERO_SCAN_ACCESS_CODE;
 if(!gate)return deny(res,503,"Scan désactivé : POINTZERO_SCAN_ACCESS_CODE non configuré côté serveur.");
 const origin=req.headers.origin;
 if(origin){try{if(new URL(origin).host!==String(req.headers.host||''))return deny(res,403,"Origine refusée.");}catch{return deny(res,403,"Origine refusée.");}}
 const provided=String(req.headers["x-pointzero-scan-code"]||"");
 const hash=s=>crypto.createHash("sha256").update(s).digest();
 if(!provided||provided.length>400||!crypto.timingSafeEqual(hash(provided),hash(gate)))return deny(res,401,"Code d'accès incorrect.");
 if(Number(req.headers["content-length"]||0)>3000)return deny(res,413,"Requête trop grande.");
 if(req.body?.authorized!==true)return deny(res,400,"L'autorisation d'inspection de ce site est requise.");
 if(Buffer.byteLength(JSON.stringify(req.body||{}),'utf8')>3000)return deny(res,413,"Requête trop grande.");
 // Per-instance bound only; not a distributed rate limiter.
 const now=Date.now();
 if(now-lastScan<10_000||scanActive)return deny(res,429,"Scanner occupé : réessayez dans quelques secondes.");
 lastScan=now;scanActive=true;
 try{return res.status(200).json(inspect(await getHtml(req.body?.url)));}
 catch(e){return deny(res,400,text(e?.message||"Analyse impossible.",220));}
 finally{scanActive=false;}
}

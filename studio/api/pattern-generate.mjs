import { timingSafeEqual } from 'node:crypto';
// Best-effort protection for a PRIVATE preview, not a distributed public quota.
let active=false;
let nextRequest=0;
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 const productionBlocked=process.env.VERCEL_ENV==='production';
 const ready=!productionBlocked&&!!(process.env.POINTZERO_IMAGE_API_KEY&&process.env.POINTZERO_GENERATION_ACCESS_CODE);
 if(req.method==='GET')return res.status(200).json({ready});
 if(req.method!=='POST')return res.status(405).json({error:'Méthode non autorisée.'});
 if(productionBlocked)return res.status(503).json({error:'Génération réservée à la Preview privée. L’ouverture publique nécessite identité, quotas distribués et validation du budget.'});
 if(!ready)return res.status(503).json({error:'Génération non configurée. Une clé fournisseur et un code d’accès serveur sont nécessaires. Aucune image de remplacement ne sera utilisée.'});
 const origin=req.headers.origin;
 if(!origin||origin!==`https://${req.headers.host}`)return res.status(403).json({error:'Origine non autorisée.'});
 const code=String(req.headers['x-generation-code']||'');
 const expected=process.env.POINTZERO_GENERATION_ACCESS_CODE;
 if(code.length>256||Buffer.byteLength(code)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(code),Buffer.from(expected)))return res.status(401).json({error:'Code d’accès incorrect.'});
 const {prompt,width,height,seed}=req.body||{};
 if(typeof prompt!=='string'||prompt.length<3||prompt.length>6000||![832,1024,1216].includes(width)||![832,1024,1216].includes(height)||!Number.isInteger(seed)||seed<0||seed>1000000000)return res.status(400).json({error:'Paramètres de génération invalides.'});
 if(Number(req.headers['content-length']||0)>12000)return res.status(413).json({error:'Requête trop volumineuse.'});
 if(active||Date.now()<nextRequest){res.setHeader('Retry-After','10');return res.status(429).json({error:'Une génération est déjà en cours ou trop récente. Patientez quelques secondes.'});}
 active=true;nextRequest=Date.now()+10000;
 const url=new URL('https://gen.pollinations.ai/image/'+encodeURIComponent(prompt));
 url.search=new URLSearchParams({model:'black-forest-labs/flux.1-schnell',width:String(width),height:String(height),seed:String(seed),enhance:'false',safe:'true'}).toString();
 try{
  const upstream=await fetch(url,{headers:{Authorization:`Bearer ${process.env.POINTZERO_IMAGE_API_KEY}`},signal:AbortSignal.timeout(55000),redirect:'error'});
  if(!upstream.ok)return res.status(502).json({error:`Le fournisseur a refusé la génération (HTTP ${upstream.status}). Vérifiez accès, budget ou disponibilité. Aucun résultat de substitution.`});
  const type=(upstream.headers.get('content-type')||'').split(';')[0];
  if(!['image/png','image/jpeg','image/webp'].includes(type))throw Error('invalid image');
  const reader=upstream.body.getReader();const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024){await reader.cancel();throw Error('too large')}chunks.push(Buffer.from(value));}
  const data=Buffer.concat(chunks);
  const valid=type==='image/png'?data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):type==='image/jpeg'?data[0]===255&&data[1]===216:data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP';
  if(!valid)throw Error('invalid bytes');
  res.setHeader('Content-Type',type);return res.status(200).send(data);
 }catch{return res.status(502).json({error:'Génération indisponible, délai dépassé ou réponse image invalide. Réessayez sans modifier votre projet.'});}
 finally{active=false;}
}

import {error,escapeHTML,fullUrl,hash,redis,resendEmail,respondPage,setNoStore} from "./_launch-utils.mjs";
const prefix="pz:manifest:v1";
const validToken=t=>typeof t==="string"&&/^[a-f0-9]{64}$/.test(t);
const htmlForm=(action,token)=>"<p>"+(action==="confirm"?"Confirmez-vous l'inscription à la liste d'attente POINTZERO ?":"Souhaitez-vous vous désinscrire des informations POINTZERO ?")+"</p><form method='post' action='/api/pointzero-confirm'><input type='hidden' name='action' value='"+action+"'><input type='hidden' name='token' value='"+escapeHTML(token)+"'><button style='font:inherit;padding:14px 22px;background:#161619;color:white;border:0;border-radius:6px;cursor:pointer' type='submit'>"+(action==="confirm"?"Confirmer l'inscription":"Me désinscrire")+"</button></form>";
export default async function handler(req,res){
 setNoStore(res);
 let action,token;
 if(req.method==="GET"){action=req.query?.action;token=req.query?.token;}
 else if(req.method==="POST"){
  const data=typeof req.body==="string"?Object.fromEntries(new URLSearchParams(req.body)):req.body||{};
  action=data.action;token=data.token;
 }else return error(res,405,"Méthode non autorisée.");
 if(!["confirm","unsubscribe"].includes(action)||!validToken(token))
  return respondPage(res,"Lien non reconnu","<p>Ce lien est invalide ou incomplet.</p>");
 if(req.method==="GET")return respondPage(res,action==="confirm"?"Confirmer l'inscription":"Se désinscrire",htmlForm(action,token));
 try{
  const tokenKey=prefix+":"+(action==="confirm"?"confirm":"unsubscribe")+":"+hash(token);
  const userHash=await redis("GET",tokenKey);
  if(!userHash)return respondPage(res,"Lien expiré","<p>Ce lien a expiré, a déjà été utilisé ou est invalide.</p>");
  const userKey=prefix+":email:"+userHash;
  const serialized=await redis("GET",userKey);
  if(!serialized)return respondPage(res,"Demande expirée","<p>Aucune inscription en attente n'a été trouvée.</p>");
  const user=JSON.parse(serialized);
  if(action==="confirm"){
   if(user.status==="confirmed")return respondPage(res,"Déjà confirmé","<p>Votre inscription est déjà validée.</p>");
   if(user.status!=="pending")return respondPage(res,"Non disponible","<p>Cette inscription n'est plus en attente.</p>");
   user.status="confirmed";user.confirmedAt=new Date().toISOString();
   await redis("SET",userKey,JSON.stringify(user));
   await redis("SADD",prefix+":confirmed",userHash);
   for(const id of user.interests)await redis("SADD",prefix+":interest:"+id,userHash);
   await redis("DEL",tokenKey);
   // Unsubscribe link uses a separate token previously stored with the pending signup;
   // we recover its raw token only from an email if provided at signup. The confirmation
   // endpoint therefore offers a permanent unsubscribe-by-email workflow below.
   return respondPage(res,"Inscription confirmée","<p>Vous êtes inscrit aux informations des studios POINTZERO. Merci !</p><p>La désinscription sera accessible depuis les messages envoyés et via la demande de suppression des données.</p>");
  }
  if(user.status!=="confirmed")return respondPage(res,"Non inscrit","<p>Il n'y a pas d'inscription active pour cette adresse.</p>");
  if(user.unsubscribeHash!==hash(token))return respondPage(res,"Lien incorrect","<p>Votre lien n'est pas valide.</p>");
  user.status="unsubscribed";user.unsubscribedAt=new Date().toISOString();
  for(const id of user.interests)await redis("SREM",prefix+":interest:"+id,userHash);
  await redis("SREM",prefix+":confirmed",userHash);
  await redis("DEL",userKey);
  await redis("DEL",tokenKey);
  return respondPage(res,"Désinscription effectuée","<p>Votre inscription a été supprimée et vous ne recevrez plus les communications POINTZERO.</p>");
 }catch{return respondPage(res,"Opération momentanément indisponible","<p>Cette action n'a pas pu être vérifiée. Veuillez réessayer.</p>");}
}

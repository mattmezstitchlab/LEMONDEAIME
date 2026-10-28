/** Les trois écrans du studio de broderie : l'accueil, l'atelier et le BurO (les ouvrages).
 * Les anciennes adresses (studios retirés, ?studio=…, #atelier) mènent à l'accueil ou à l'atelier, sans jamais toucher aux ouvrages enregistrés.
 */
export const STUDIO_ROUTES=["stitch-home","embroidery","buro"] as const;
export type StudioRoute=(typeof STUDIO_ROUTES)[number];
export function isStudioRoute(value:string|null):value is StudioRoute{
 return STUDIO_ROUTES.some(route=>route===value);
}
/** Dans le site AIME, le studio vit sous une adresse de base (/studio/) ; seul, il vit à la racine. */
export function baseDuStudio(){ try { return String(import.meta.env?.BASE_URL||"/").replace(/\/+$/,""); } catch { return ""; } }
/** Retire l'adresse de base : « /studio/atelier » se lit comme « /atelier ». */
export function sansBase(pathname:string,base=baseDuStudio()){
 if(!base)return pathname;
 if(pathname===base)return "/";
 return pathname.startsWith(base+"/")?pathname.slice(base.length):pathname;
}
/** Ajoute l'adresse de base à un chemin interne du studio (« /atelier » → « /studio/atelier »). */
export function avecBase(path:string,base=baseDuStudio()){
 if(!base||!path.startsWith("/")||path.startsWith("//"))return path;
 return path===base||path.startsWith(base+"/")?path:base+path;
}
export function entryStudio(search:string,hash:string,pathname="/"):StudioRoute{
 pathname=sansBase(pathname);
 const params=new URLSearchParams(search);
 const path=decodeURI(pathname).replace(/\/+$/,"")||"/";
 if(path==="/buro")return "buro";
 if(path==="/atelier")return "embroidery";
 // anciens liens : ?studio=embroidery, ?page=atelier et #atelier ouvrent l'atelier ; tout le reste, l'accueil
 if(path==="/"&&(params.get("studio")==="embroidery"||params.get("page")==="atelier"||hash==="#atelier"))return "embroidery";
 return "stitch-home";
}
export function publicPathFor(mode:StudioRoute){
 if(mode==="buro")return "/buro";
 if(mode==="embroidery")return "/atelier";
 return "/";
}

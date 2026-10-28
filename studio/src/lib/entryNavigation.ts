/** Cross-stitch entry and legacy AIME hierarchy with compatibility for pre-existing POINTZERO query links.
 * This module never reads or clears a user's saved projects.
 */
export const STUDIO_ROUTES=[
 "design","embroidery","photo","fashion","budget","programme","admin",
 "mini-site","pdf","generation","music","art-world","aime-landing",
 "music-production","accessibility","academy","one-space","causal",
 "legal","metamorphose","ripplecircle","game","manifest","manifest-admin",
 "stitch-home","buro","pattern-boutique","aime-home","universe-index","universe-detail","studio-detail","vision","reference-dossier","universal-dossier"
] as const;
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
 // Historical external links take precedence and remain permanent.
 if(params.get("site")==="le-monde-aime")return "aime-landing";
 if(params.get("page")==="manifest")return "manifest";
 if(params.get("page")==="atelier"||hash==="#atelier")return "design";
 const path=decodeURI(pathname).replace(/\/+$/,"")||"/";
 if(path==="/") {
  const legacy=params.get("studio");
  return isStudioRoute(legacy)&&legacy!=="manifest-admin"?legacy:"stitch-home";
 }
 if(path==="/aime")return "aime-home";
 if(path==="/boutique")return "pattern-boutique";
 if(path==="/buro")return "buro";
 if(path==="/pointzero")return "manifest";
 if(path==="/le-monde-aime")return "aime-landing";
 if(path==="/vision")return "vision";
 if(path==="/dossier")return "reference-dossier";
 if(path==="/espace")return "universal-dossier";
 if(path==="/univers")return "universe-index";
 if(/^\/univers\/[a-z0-9-]+$/.test(path))return "universe-detail";
 if(/^\/studios\/[a-z0-9-]+$/.test(path))return "studio-detail";
 if(path==="/atelier"){
  const chosen=params.get("studio");
  return isStudioRoute(chosen)&&!["manifest-admin","buro","stitch-home","aime-home","universe-index","universe-detail","studio-detail","vision","reference-dossier","universal-dossier","manifest","aime-landing"].includes(chosen)?chosen:"embroidery";
 }
 return "stitch-home";
}
export function publicPathFor(mode:StudioRoute){
 if(mode==="stitch-home")return "/";
 if(mode==="pattern-boutique")return "/boutique";
 if(mode==="buro")return "/buro";
 if(mode==="aime-home")return "/aime";
 if(mode==="manifest")return "/pointzero";
 if(mode==="aime-landing")return "/le-monde-aime";
 if(mode==="vision")return "/vision";
 if(mode==="reference-dossier")return "/dossier";
 if(mode==="universal-dossier")return "/espace";
 if(mode==="universe-index")return "/univers";
 // /atelier est le studio point de croix ; le studio de composition garde une adresse explicite.
 if(mode==="embroidery")return "/atelier";
 if(mode==="design")return "/atelier?studio=design";
 if(mode==="manifest-admin")return "/pointzero"; // admin remains a stateful protected overlay, not an unguarded link
 return "/atelier?studio="+encodeURIComponent(mode);
}

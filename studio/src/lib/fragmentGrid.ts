import {validDesignSource,type DesignFragmentSource} from "./fragmentResources";
/**
 * AIME METAMORPHOSE / POINTZERO — grille de fragments universelle.
 * Séparée du Pattern DMC : ni points de croix ni historique de broderie ne changent.
 */
export interface Fragment {
  source?:DesignFragmentSource;
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  image: string;
  kind: string;
  span: 1 | 2 | 3 | 4;
  locked: boolean;
  crop: { x: number; y: number; zoom: number };
  notes: string;
}
export interface FragmentCollection {
  version: 1;
  name: string;
  fragments: Fragment[];
}
const trunc = (value: unknown,max=500) => typeof value === "string" ? value.slice(0,max) : "";
const clip = (n: unknown,min:number,max:number) => Math.min(max,Math.max(min,Number.isFinite(Number(n))?Number(n):min));
export function allowedFragmentUrl(value: unknown): string {
  const raw=trunc(value,2000);
  if (!raw) return "";
  try {
    const url=new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname.includes(".")) return "";
    if (url.hostname === "localhost" || /\.(local|internal|localhost|invalid)$/.test(url.hostname) || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":"))return "";
    return url.href;
  } catch { return ""; }
}
export function readFragments(value: unknown): FragmentCollection | null {
  if(!value || typeof value !== "object")return null;
  const input=value as Record<string,unknown>;
  const entries=input.fragments;
  if(!Array.isArray(entries) || entries.length>120)return null;
  const used=new Set<string>(),fragments:Fragment[]=[];
  for(const [i,entry] of entries.entries()) {
    if(!entry||typeof entry!=="object")continue;
    const raw=entry as Record<string,unknown>;
    if(raw.source!==undefined&&!validDesignSource(raw.source))return null;
    const id=trunc(raw.id,100)||"frag_"+i;
    if(used.has(id))continue; used.add(id);
    const title=trunc(raw.title,160)||"Fragment "+(i+1);
    const crop=raw.crop&&typeof raw.crop==="object"?raw.crop as Record<string,unknown>:{};
    fragments.push({
      ...(raw.source?{source:raw.source as DesignFragmentSource}:{}),
      id,title,description:trunc(raw.description,600),
      sourceUrl:allowedFragmentUrl(raw.sourceUrl),
      image:allowedFragmentUrl(raw.image),
      kind:trunc(raw.kind,45)||"fragment",
      span:clip(raw.span,1,4) as 1|2|3|4,
      locked:raw.locked===true,
      crop:{x:clip(crop.x??50,0,100),y:clip(crop.y??50,0,100),zoom:clip(crop.zoom??100,100,230)},
      notes:trunc(raw.notes,1500)
    });
  }
  return {version:1,name:trunc(input.name,120)||"Collection de fragments",fragments};
}
export function updateFragment(collection: FragmentCollection,id:string,change:Partial<Fragment>):FragmentCollection {
  return {...collection,fragments:collection.fragments.map(f=>f.id!==id?f:f.locked?f:{...f,...change})};
}
export function reorderFragments(collection:FragmentCollection,moving:string,target:string):FragmentCollection {
  const from=collection.fragments.findIndex(x=>x.id===moving),to=collection.fragments.findIndex(x=>x.id===target);
  if(from<0||to<0||from===to||collection.fragments[from].locked)return collection;
  const items=[...collection.fragments],moved=items.splice(from,1)[0];items.splice(to,0,moved);
  return {...collection,fragments:items};
}
export function demoFragments():FragmentCollection {
  return readFragments({version:1,name:"Cabinet de curiosités",fragments:[
    {id:"f1",title:"RIPPLECIRCLE",description:"Le temps devient une interface.",sourceUrl:"https://ripplecircle.vercel.app/",kind:"Temps",span:2},
    {id:"f2",title:"POINTZERO",description:"La grille, le point et la matière.",sourceUrl:"https://pointzero-zeta.vercel.app/",kind:"Création",span:1},
    {id:"f3",title:"AIME COMPOSER",description:"Une grammaire de design universelle.",sourceUrl:"https://aime-composer.vercel.app/",kind:"Système",span:1},
    {id:"f4",title:"AIME STUDIO",description:"Explorer, découper, composer.",sourceUrl:"https://aime-studio-mu.vercel.app/",kind:"Atelier",span:2},
    {id:"f5",title:"PASSEPORT AIME",description:"Identités et liens universels.",sourceUrl:"https://aime-passport.vercel.app/",kind:"Relations",span:1}
  ]})!;
}

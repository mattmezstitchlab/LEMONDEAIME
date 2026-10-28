import { deltaE2000 } from "./colorScience";
import { FLOSS, nearestFloss } from "./dmc";
import { clonePattern, compositePattern, createPattern, ensurePalette, fromObject, makeId, toObject, type Pattern, type Seg } from "./pattern";
import { removeConfetti } from "./quantize";

/**
 * Composer V1 is a deterministic decision assistant, not an object detector.
 * Semantics such as "eye" or "beak" require a future user/vision annotation:
 * this module never claims to have identified them automatically.
 */
export type Detail = "simple" | "equilibree" | "precise";
export type Difficulty = "debutant" | "intermediaire" | "expert";
export type PaletteMode = "originale" | "harmonisee" | "personnalisee" | "complementaire" | "douce" | "contrastee";
export interface ComposeSettings {
  detail: Detail;
  difficulty: Difficulty;
  palette: PaletteMode;
  codes: string;
  width: number;
  height: number;
  count?: Pattern["count"];
}
export interface RegionCard {
  id: string;
  name: string;
  count: number;
  color: number;
  box: { x: number; y: number; w: number; h: number };
  visible: boolean;
  overrideCode?: string;
}
export type DecisionKind = "couleur" | "confetti" | "contour" | "fraction" | "reduction";
export interface Decision {
  kind: DecisionKind;
  confidence: number;
  reason: string;
  count: number;
}
export interface CompositionSnapshot {
  version: 1;
  /** Self-contained source Pattern JSON; free of recursive composition metadata. */
  source: string;
  settings: ComposeSettings;
  cards: { id: string; name: string; visible: boolean; overrideCode?: string }[];
}
export interface CompositionResult {
  pattern: Pattern;
  regions: RegionCard[];
  decisions: Decision[];
  coverage: { source: number; result: number; lost: number };
  warnings: string[];
  estimatedDifficulty: "Débutant" | "Intermédiaire" | "Expert";
}

const MAX_CELLS = 250_000;
const LIMIT_REGIONS = 9;
const idxAt = (x: number, y: number, w: number) => y * w + x;
const inBounds = (x: number, y: number, w: number, h: number) => x >= 0 && y >= 0 && x < w && y < h;
const luma = (color: number) => FLOSS[color]?.lab[0] ?? 50;
const distance = (a: number, b: number) =>
  a === b ? 0 : !FLOSS[a] || !FLOSS[b] ? 0 : deltaE2000(FLOSS[a].lab, FLOSS[b].lab);
export const initialSettings = (p: Pattern): ComposeSettings => ({
  detail: "equilibree", difficulty: "intermediaire", palette: "originale", codes: "",
  width: p.w, height: p.h, count: p.count,
});

/**
 * Exact-colour 4-connected flood fill. Does not make up semantic names.
 * Even excluded small parts are preserved inside the catch-all card.
 */
export function segmentRegions(source: Pattern): RegionCard[] {
  const p = compositePattern(source);
  const { w, h, cross } = p;
  if (cross.length > MAX_CELLS) return [{
    id: "entier", name: "Motif entier · grande grille", color: -1, count: cross.reduce((n, v) => n + +(v >= 0), 0),
    box: { x: 0, y: 0, w, h }, visible: true,
  }];
  const mark = new Uint8Array(w * h);
  const components: RegionCard[] = [];
  for (let i = 0; i < cross.length; i++) {
    if (mark[i] || cross[i] < 0) continue;
    const color = cross[i], queue = [i];
    mark[i] = 1;
    let minX = i % w, maxX = minX, minY = Math.floor(i / w), maxY = minY;
    for (let n = 0; n < queue.length; n++) {
      const cell = queue[n], x = cell % w, y = Math.floor(cell / w);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const xx = x + dx, yy = y + dy;
        if (!inBounds(xx, yy, w, h)) continue;
        const j = idxAt(xx, yy, w);
        if (!mark[j] && cross[j] === color) { mark[j] = 1; queue.push(j); }
      }
    }
    components.push({
      id: String(i), color, count: queue.length, visible: true,
      name: "Zone DMC " + (FLOSS[color]?.code ?? "?"),
      box: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    });
  }
  // "Other" must not be dropped: tiny accents often contain a bird's eye.
  components.sort((a, b) => b.count - a.count || Number(a.id) - Number(b.id));
  const major = components.slice(0, LIMIT_REGIONS);
  const rest = components.slice(LIMIT_REGIONS);
  if (rest.length) major.push({
    id: "autres", name: "Micro-détails et autres régions", color: -1,
    count: rest.reduce((n, r) => n + r.count, 0), visible: true,
    box: { x: 0, y: 0, w, h },
  });
  return major;
}

/** For preview/visibility, reidentify exact connected components deterministically. */
function regionIds(p: Pattern, major: RegionCard[]): string[] {
  const { w, h, cross } = p;
  if (major.length === 1 && major[0].id === "entier") return Array(cross.length).fill("entier");
  const seen = new Uint8Array(cross.length), ids = Array(cross.length).fill("") as string[];
  const selected = new Set(major.map(r => r.id));
  for (let i = 0; i < cross.length; i++) {
    if (cross[i] < 0 || seen[i]) continue;
    const color = cross[i], queue = [i], id = selected.has(String(i)) ? String(i) : "autres";
    seen[i] = 1;
    for (let k = 0; k < queue.length; k++) {
      const j = queue[k], x = j % w, y = Math.floor(j / w);
      ids[j] = id;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const xx = x + dx, yy = y + dy;
        if (!inBounds(xx, yy, w, h)) continue;
        const n = idxAt(xx, yy, w);
        if (cross[n] === color && !seen[n]) { seen[n] = 1; queue.push(n); }
      }
    }
  }
  return ids;
}

const usedColors = (cross: Int16Array) => {
  const counts = new Map<number, number>();
  for (const i of cross) if (i >= 0) counts.set(i, (counts.get(i) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
};

/** Never silently lose occupancy when cleaning isolated coloured stitches. */
function guardedConfetti(cross: Int16Array, w: number, h: number, passes: number): number {
  if (!passes) return 0;
  const original = cross.slice();
  const proposal = cross.slice();
  removeConfetti(proposal, w, h, passes); // reuse the current project's algorithm
  let changed = 0;
  for (let i = 0; i < original.length; i++) {
    const a = original[i], b = proposal[i];
    if (a < 0 || b < 0 || a === b) continue;
    const x = i % w, y = Math.floor(i / w);
    const neighbours = [[-1,0],[1,0],[0,-1],[0,1]]
      .map(([dx,dy]) => inBounds(x+dx,y+dy,w,h) ? original[idxAt(x+dx,y+dy,w)] : -1)
      .filter(v => v >= 0);
    // Protect small high-contrast accents (potential eyes, stamens, etc.).
    if (neighbours.length < 3 || neighbours.every(v => distance(a, v) > 9)) continue;
    if (distance(a,b) > 10) continue;
    cross[i] = b; changed++;
  }
  return changed;
}

/** 
 * Weighted palette cap, retaining contrasting dark/light accent colours.
 * Pool is existing DMC indices, never synthesised computer colours.
 */
function remapPalette(p: Pattern, settings: ComposeSettings): number {
  const ranked = usedColors(p.cross);
  if (!ranked.length) return 0;
  const target = settings.detail === "simple" ? 7 : settings.detail === "equilibree" ? 16 : 38;
  const adjusted = settings.palette === "harmonisee" ? Math.max(3, Math.ceil(target * .65)) : target;
  const quota = settings.difficulty === "debutant" ? Math.min(adjusted, 10) : settings.difficulty === "intermediaire" ? Math.min(adjusted, 24) : adjusted;
  let keep = ranked.slice(0, quota).map(x => x[0]);
  const accents = ranked
    .filter(([,count]) => count >= 1)
    .map(([idx]) => idx)
    .filter(idx => luma(idx) < 38 || luma(idx) > 90);
  for (const accent of accents.slice(0, 2)) if (!keep.includes(accent) && keep.length > 1) keep[keep.length - 1] = accent;
  keep = [...new Set(keep)];
  if (settings.palette === "personnalisee") {
    const allowed = settings.codes.split(/[,\s;]+/).map(s => FLOSS.findIndex(f => f.code.toLowerCase() === s.toLowerCase())).filter(i => i >= 0);
    if (allowed.length) keep = [...new Set(allowed)].slice(0, 40);
  }
  const map = new Map<number, number>();
  const harmony=(idx:number):number=>{
    const c=FLOSS[idx];if(!c)return idx;
    const [L,a,b]=c.lab;
    switch(settings.palette){
      case "douce":
        return nearestFloss([Math.min(94,Math.max(0,L*.65+25)),a*.6,b*.6]);
      case "contrastee":
        return nearestFloss([Math.min(98,Math.max(2,50+(L-50)*1.24)),a*1.1,b*1.1]);
      case "complementaire":
        // Preserve the dominant reference; propose complementary accents.
        return idx===ranked[0][0] ? idx : nearestFloss([L,-a,-b]);
      default:return idx;
    }
  };
  const altered=["douce","contrastee","complementaire"].includes(settings.palette);
  if(altered){
    const weights=new Map<number,number>();
    for(const [idx,n] of ranked){const mapped=harmony(idx);weights.set(mapped,(weights.get(mapped)??0)+n);}
    keep=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,quota).map(a=>a[0]);
  }
  for (const [idx] of ranked){
    const transformed=harmony(idx);
    map.set(idx,keep.includes(transformed)?transformed:nearestFloss(FLOSS[transformed].lab,keep));
  }
  for (let i = 0; i < p.cross.length; i++) if (p.cross[i] >= 0) p.cross[i] = map.get(p.cross[i])!;
  const apply = (idx: number) => idx >= 0 ? map.get(idx) ?? nearestFloss(FLOSS[harmony(idx)].lab, keep) : -1;
  for (const arr of [p.fwd, p.bwd, ...p.q]) for (let i = 0; i < arr.length; i++) arr[i] = apply(arr[i]);
  p.back = p.back.map(x => ({ ...x, c: apply(x.c) }));
  p.long = p.long.map(x => ({ ...x, c: apply(x.c) }));
  p.knots = p.knots.map(x => ({ ...x, c: apply(x.c) }));
  p.special = p.special?.map(x => ({ ...x, c: apply(x.c) }));
  p.palette = [];
  for (const idx of usedColors(p.cross).map(v => v[0])) ensurePalette(p, idx);
  for (const i of [...p.fwd, ...p.bwd, ...p.q.flatMap(arr => [...arr]), ...p.back.map(x => x.c), ...p.knots.map(x => x.c), ...(p.special??[]).map(x=>x.c)]) if (i >= 0 && !p.palette.includes(i)) ensurePalette(p, i);
  return ranked.length - usedColors(p.cross).length;
}

function scalePattern(source: Pattern, targetW: number, targetH: number) {
  if (targetW === source.w && targetH === source.h) return clonePattern(source);
  if (targetW < 8 || targetH < 8 || targetW > 1000 || targetH > 1000 || targetW * targetH > MAX_CELLS) {
    throw new Error("Dimensions hors limites pour la composition (8 à 1000, maximum 250 000 cases).");
  }
  const p = createPattern(source.name, targetW, targetH, source.count, source.strands);
  for (let y = 0; y < targetH; y++) for (let x = 0; x < targetW; x++) {
    const sx = Math.min(source.w-1, Math.floor((x+.5)*source.w/targetW));
    const sy = Math.min(source.h-1, Math.floor((y+.5)*source.h/targetH));
    const i=sy*source.w+sx, j=y*targetW+x;
    p.cross[j] = source.cross[i];
    p.fwd[j] = source.fwd[i]; p.bwd[j] = source.bwd[i];
    for (let k=0;k<4;k++) p.q[k][j]=source.q[k][i];
  }
  const rx = targetW / source.w, ry = targetH / source.h;
  const mapNode = (x:number,y:number) => ({x:Math.min(targetW,Math.round(x*rx)),y:Math.min(targetH,Math.round(y*ry))});
  const mapSeg = (s:Seg) => {
    const a=mapNode(s.x1,s.y1),b=mapNode(s.x2,s.y2);
    return {...s,x1:a.x,y1:a.y,x2:b.x,y2:b.y};
  };
  p.back = source.back.map(mapSeg); p.long=source.long.map(mapSeg);
  p.knots=source.knots.map(k=>({...k,...mapNode(k.x,k.y)}));
  p.special=source.special?.map(k=>({...k,...mapNode(k.x,k.y)}));
  return { ...source, ...p, id:source.id, provenance:source.provenance, notes:source.notes,
    fabric:source.fabric, beadMap:source.beadMap, supplies:source.supplies, stock:source.stock,
    reference:source.reference, layers:[] };
}

/**
 * Deliberately selective contour propositions: small contrasted connected
 * components only, never tracing all DMC boundary transitions.
 */
function selectiveContours(p: Pattern, detail: Detail, difficulty: Difficulty): { segments: Seg[]; count: number } {
  if (detail === "simple" || difficulty === "debutant") return {segments:[],count:0};
  const maxSegments=detail==="precise"?120:40;
  const maxComponent=detail==="precise"?28:12;
  const visited=new Uint8Array(p.cross.length);
  const candidates:{color:number;cells:number[];strength:number}[]=[];
  // Important: this scan is not limited to the nine biggest display cards.
  // Small accents such as eyes must be evaluated even if the UI groups them
  // into "micro-details".
  for(let i=0;i<p.cross.length;i++){
    const color=p.cross[i];
    if(color<0 || visited[i])continue;
    const queue=[i];visited[i]=1;
    let boundary=0,contrast=0;
    for(let k=0;k<queue.length;k++){
      const cell=queue[k],x=cell%p.w,y=Math.floor(cell/p.w);
      for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
        const xx=x+dx,yy=y+dy;
        if(!inBounds(xx,yy,p.w,p.h)){boundary++;contrast+=20;continue;}
        const next=idxAt(xx,yy,p.w),other=p.cross[next];
        if(other===color){if(!visited[next]){visited[next]=1;queue.push(next);}}
        else {boundary++;contrast+=other<0?12:distance(color,other);}
      }
    }
    if(queue.length<2||queue.length>maxComponent||luma(color)>60)continue;
    const average=contrast/Math.max(1,boundary);
    if(average<12)continue;
    candidates.push({color,cells:queue,strength:average});
  }
  candidates.sort((a,b)=>b.strength-a.strength || a.cells.length-b.cells.length);
  const segments:Seg[]=[];
  const keys=new Set<string>();
  for(const candidate of candidates.slice(0,9)){
    for(const i of candidate.cells){
      const x=i%p.w,y=Math.floor(i/p.w),color=candidate.color;
      const edges:Array<[number,number,number,number,number,number]>=[
        [0,-1,x,y,x+1,y],[1,0,x+1,y,x+1,y+1],
        [0,1,x,y+1,x+1,y+1],[-1,0,x,y,x,y+1]
      ];
      for(const [dx,dy,x1,y1,x2,y2] of edges){
        const xx=x+dx,yy=y+dy,other=inBounds(xx,yy,p.w,p.h)?p.cross[idxAt(xx,yy,p.w)]:-1;
        if(other===color || (other>=0 && distance(color,other)<12))continue;
        const key=x1+","+y1+":"+x2+","+y2;
        if(!keys.has(key)){keys.add(key);segments.push({x1,y1,x2,y2,c:color});}
        if(segments.length>=maxSegments)return {segments,count:segments.length};
      }
    }
  }
  return {segments,count:segments.length};
}

function fractionalBridges(p: Pattern, detail: Detail, difficulty: Difficulty): number {
  if (detail !== "precise" || difficulty !== "expert") return 0;
  let n=0, max=40;
  const before=p.cross.slice();
  for(let y=1;y<p.h-1;y++)for(let x=1;x<p.w-1;x++){
    if (n>=max) return n;
    const i=idxAt(x,y,p.w);
    if(before[i]>=0||p.fwd[i]>=0||p.bwd[i]>=0)continue;
    const a=before[idxAt(x-1,y-1,p.w)],b=before[idxAt(x+1,y+1,p.w)];
    const c=before[idxAt(x+1,y-1,p.w)],d=before[idxAt(x-1,y+1,p.w)];
    const sides=[before[i-1],before[i+1],before[i-p.w],before[i+p.w]];
    if(sides.some(v=>v>=0))continue;
    if(a>=0 && a===b && c!==a && d!==a){p.bwd[i]=a;n++;}
    else if(c>=0 && c===d && a!==c && b!==c){p.fwd[i]=c;n++;}
  }
  for(const idx of [...p.fwd,...p.bwd]) if(idx>=0 && !p.palette.includes(idx))ensurePalette(p,idx);
  return n;
}

export function composePattern(source: Pattern, settings: ComposeSettings, cards?: RegionCard[]): CompositionResult {
  const original = compositePattern(source);
  if (original.w * original.h > MAX_CELLS) throw new Error("Ce motif dépasse la limite actuelle de composition (250 000 cases). Il reste utilisable dans l'atelier classique.");
  if (original.w < 1 || original.h < 1) throw new Error("Source invalide.");
  const regions=segmentRegions(original);
  const configured=new Map((cards??[]).map(r=>[r.id,r]));
  for(const r of regions){const saved=configured.get(r.id);if(saved){r.visible=saved.visible;r.name=saved.name;r.overrideCode=saved.overrideCode;}}
  if(cards?.length){
    const order=new Map(cards.map((c,i)=>[c.id,i]));
    regions.sort((a,b)=>(order.get(a.id)??999)-(order.get(b.id)??999));
  }
  const before=original.cross.reduce((n,v)=>n+ +(v>=0),0);
  const work=clonePattern(original);
  const invisible=new Set(regions.filter(r=>!r.visible).map(r=>r.id));
  const recolor = new Map(regions.filter(r=>r.overrideCode && FLOSS.some(f=>f.code===r.overrideCode))
    .map(r=>[r.id,FLOSS.findIndex(f=>f.code===r.overrideCode)]));
  if(invisible.size || recolor.size){
    const ids=regionIds(original,regions);
    for(let i=0;i<work.cross.length;i++){
      const id=ids[i];
      if(invisible.has(id)) {
        work.cross[i]=-1;work.fwd[i]=-1;work.bwd[i]=-1;
        for(const q of work.q)q[i]=-1;
      } else if(recolor.has(id) && work.cross[i]>=0) work.cross[i]=recolor.get(id)!;
    }
    // Geometric association for existing ornament strokes. Their original
    // coordinates are preserved in the saved source recipe.
    const midRegion=(x:number,y:number)=>{
      const xx=Math.max(0,Math.min(original.w-1,Math.floor(x)));
      const yy=Math.max(0,Math.min(original.h-1,Math.floor(y)));
      return ids[idxAt(xx,yy,original.w)];
    };
    work.back=work.back.filter(v=>!invisible.has(midRegion((v.x1+v.x2)/2,(v.y1+v.y2)/2)));
    work.long=work.long.filter(v=>!invisible.has(midRegion((v.x1+v.x2)/2,(v.y1+v.y2)/2)));
    work.knots=work.knots.filter(v=>!invisible.has(midRegion(v.x,v.y)));
    work.special=work.special?.filter(v=>!invisible.has(midRegion(v.x,v.y)));
  }
  const target = scalePattern(work,settings.width,settings.height);
  target.count = settings.count ?? original.count;
  const warnings:string[]=[];
  if(settings.width<original.w || settings.height<original.h)warnings.push("Réduction de grille : les petits détails peuvent fusionner. Comparez le résultat avec la source avant validation.");
  const changes=guardedConfetti(target.cross,target.w,target.h,settings.detail==="simple"?2:settings.detail==="equilibree"?1:0);
  const reduced=remapPalette(target,settings);
  const outlines=selectiveContours(target,settings.detail,settings.difficulty);
  const originals=new Set(target.back.map(s=>[s.x1,s.y1,s.x2,s.y2,s.c].join("|")));
  for(const seg of outlines.segments){
    const key=[seg.x1,seg.y1,seg.x2,seg.y2,seg.c].join("|");
    if(!originals.has(key)){target.back.push(seg);originals.add(key);}
  }
  const fractions=fractionalBridges(target,settings.detail,settings.difficulty);
  const resultCount=target.cross.reduce((n,v)=>n+ +(v>=0),0);
  if(resultCount===0 && before>0)warnings.push("Aucune croix dans cette variante : vérifiez la visibilité des cartes.");
  if(!invisible.size && settings.width===original.w && settings.height===original.h && resultCount<before){
    warnings.push("Des croix ont disparu : génération refusée.");
    throw new Error("Conservation des régions impossible. Le motif source n'a pas été modifié.");
  }
  const complexity=target.palette.length*.8 + (target.back.length/45) + (fractions/10);
  const estimatedDifficulty=complexity<8?"Débutant":complexity<19?"Intermédiaire":"Expert";
  target.subjectScene=undefined; // Composing a new flattened variant must not retain stale editable subject positions.
  if(original.subjectScene)warnings.push("Cette variante est aplatie ; conservez le projet précédent pour déplacer les sujets indépendamment.");
  target.name=original.name + " · " + ({simple:"Simple",equilibree:"Équilibré",precise:"Précis"} as const)[settings.detail];
  target.id=makeId();
  target.notes=[original.notes??"", "POINTZERO Composition (propositions automatiques)", "Détail : "+settings.detail, "Difficulté choisie : "+settings.difficulty, "Difficulté estimée (indicative) : "+estimatedDifficulty, "Points arrière ajoutés : "+outlines.count, "Points fractionnés ajoutés : "+fractions,
    "Attention : segmentation basée sur les codes DMC, sans reconnaissance sémantique des yeux, ailes ou feuilles."].filter(Boolean).join("\n");
  target.palette=[];
  const all=new Set<number>([...target.cross,...target.fwd,...target.bwd,...target.q.flatMap(arr=>[...arr]),...target.back.map(s=>s.c),...target.knots.map(s=>s.c),...(target.special??[]).map(s=>s.c)]);
  for(const i of all)if(i>=0 && FLOSS[i])ensurePalette(target,i);
  target.composition = {
    version:1,
    source: JSON.stringify(toObject({...original,composition:undefined})),
    settings:{...settings},
    cards:regions.map(({id,name,visible,overrideCode})=>({id,name,visible,overrideCode})),
  };
  const decisions:Decision[]=[
    {kind:"couleur",confidence:.95,count:reduced,reason:"Rapprochement perceptuel CIEDE2000 entre fils DMC."},
    {kind:"confetti",confidence:.72,count:changes,reason:"Regroupement des points isolés proches, avec conservation du dessin et des accents contrastés."},
    {kind:"contour",confidence:.68,count:outlines.count,reason:"Segments proposés sur de petites régions sombres et contrastées, non sur toutes les transitions."},
    {kind:"fraction",confidence:.74,count:fractions,reason:"Ponts diagonaux sur cases vides uniquement, réservés au niveau expert précis."},
  ];
  return {pattern:target,regions,decisions,coverage:{source:before,result:resultCount,lost:before-resultCount},warnings,estimatedDifficulty};
}

/** Reopen a composed project with the original source; no overwrite of the current design. */
export function compositionSource(p:Pattern): Pattern | null {
  if(p.composition?.version!==1)return null;
  try {
    const original=fromObject(JSON.parse(p.composition.source));
    if(!original || original.composition || original.w*original.h>MAX_CELLS)return null;
    return original;
  } catch {return null;}
}

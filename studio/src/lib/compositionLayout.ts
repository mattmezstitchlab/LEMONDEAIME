import {resolveCollection} from "./fragmentResources";
import {GRID_CONTENT_CSS} from "./gridConstraints";
import {standaloneDesignCSS} from './designSystem';
import {readFragments,type FragmentCollection} from './fragmentGrid';
export const COMPOSITIONS=['editorial','regular','immersive'] as const;
export type CompositionMode=typeof COMPOSITIONS[number];
export function compositionCSS(mode:CompositionMode):string {
 if(!COMPOSITIONS.includes(mode))throw Error('Composition inconnue');
 return GRID_CONTENT_CSS+`.aime-composition{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:clamp(16px,3vw,40px);max-width:1440px;margin:auto;padding:clamp(20px,4.5vw,64px)}.aime-composition article{grid-column:span ${mode==='regular'?4:6};min-width:0;max-width:100%;height:auto;overflow-wrap:anywhere;box-sizing:border-box;padding:24px;background:var(--aime-subtle);border-radius:var(--aime-radius)}.aime-composition article:first-child{grid-column:span ${mode==='immersive'?12:mode==='editorial'?8:4};${mode==='immersive'?'min-height:60vh;':''}}.aime-composition h2{font-size:clamp(24px,3.5vw,54px);line-height:1.12}.aime-composition p{line-height:1.7}.aime-composition img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}@media(max-width:900px){.aime-composition article{grid-column:span 6}.aime-composition article:first-child{grid-column:span ${mode==='regular'?6:12}}}@media(max-width:600px){.aime-composition article,.aime-composition article:first-child{grid-column:span 12;min-height:0}}`;
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function fragmentsHTML(collection:FragmentCollection,mode:CompositionMode,context:'private'|'export'='export'):string {
 const checked=readFragments(collection);if(!checked)throw Error('Fragments invalides');
 const parsed=resolveCollection(checked,context);
 return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(parsed.name)}</title><style>${standaloneDesignCSS()}body{margin:0;background:var(--aime-surface)}${compositionCSS(mode)}</style><body><header style="padding:24px"><h1>${escape(parsed.name)}</h1><p>Recomposition de fragments · export statique, pas une copie fonctionnelle du site source.</p></header><main class="aime-composition aime-content-grid">${parsed.fragments.map(f=>`<article class="aime-content-cell">${f.image?`<img src="${escape(f.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<h2>${escape(f.title)}</h2><p>${escape(f.description)}</p>${f.sourceUrl?`<a href="${escape(f.sourceUrl)}" rel="noopener noreferrer">Consulter la source</a>`:''}</article>`).join('')}</main></body></html>`;
}

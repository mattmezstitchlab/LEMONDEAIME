import {useState} from 'react';
import {FLOSS} from '../lib/dmc';
import type {Pattern} from '../lib/pattern';
import {demoZoomPattern,cellInfo,editZoomCell,zoomHTML,zoomSVG,zoomJSON} from '../lib/zoomCode';
import {saveStudioFile} from './StudioFrame';
export default function ZoomCodePrototype(){
 const [p,setPattern]=useState(demoZoomPattern),[selected,select]=useState(0),[draft,setDraft]=useState('321');
 const [past,setPast]=useState<Pattern[]>([]),[future,setFuture]=useState<Pattern[]>([]),[error,setError]=useState('');
 const [proposal,setProposal]=useState<Pattern|null>(null),[width,setWidth]=useState(390);
 const info=cellInfo(p,selected);
 return <details className="aime-zoom-prototype"><summary>Recherche expérimentale — Zoom Code, du point au rendu web</summary>
  <p>Exemple fictif en mémoire. Aucune création existante modifiée ou sauvegardée automatiquement. Les aperçus relisent le même Pattern.</p>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:24,padding:16,background:'#fff',color:'#161616'}}>
   <section aria-label="Canevas du motif"><h3>1. Choisir une case</h3><div style={{display:'grid',gridTemplateColumns:'repeat(8,minmax(0,1fr))',maxWidth:400}}>{Array.from(p.cross,(color,i)=><button key={i} type="button" aria-label={`Case ${i%8+1}, ${Math.floor(i/8)+1}`} aria-pressed={selected===i} onClick={()=>{select(i);setProposal(null)}} style={{aspectRatio:'1',border:selected===i?'3px solid #164c70':'1px solid #aaa',background:color>=0?FLOSS[color].hex:'#fff',minHeight:32}}/>)}</div></section>
   <section aria-label="Inspecteur Zoom Code"><h3>2. Comprendre</h3><p>{info.explanation}</p><p>Position : {info.x+1}, {info.y+1} · Fil : {info.thread??'aucun'}</p>
    <label>Référence DMC (vide pour effacer)<input aria-label="Référence de fil Zoom Code" value={draft} onChange={e=>{setDraft(e.target.value);setProposal(null)}} style={{border:'1px solid #777',padding:10,width:'100%'}}/></label>
    <button type="button" onClick={()=>{try{setProposal(editZoomCell(p,selected,draft));setError('')}catch(e){setError(String(e));setProposal(null)}}}>Prévisualiser la modification</button>
    {proposal&&<div><p>Conséquence : une seule cellule change ; les rendus graphique et web suivront après confirmation.</p><button type="button" onClick={()=>{setPast([...past.slice(-19),p]);setFuture([]);setPattern(proposal);setProposal(null)}}>Confirmer la modification</button></div>}
    {error&&<p role="alert">{error}</p>}
    <button type="button" disabled={!past.length} onClick={()=>{setFuture([p,...future]);setPattern(past[past.length-1]);setPast(past.slice(0,-1));setProposal(null)}}>Annuler</button>
    <button type="button" disabled={!future.length} onClick={()=>{setPast([...past,p]);setPattern(future[0]);setFuture(future.slice(1));setProposal(null)}}>Rétablir</button>
    <details><summary>3. Code structuré de la cellule</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(info,null,2)}</pre><details><summary>SVG généré du motif</summary><textarea readOnly aria-label="Code SVG généré" value={zoomSVG(p)} rows={6} style={{width:"100%",fontFamily:"monospace"}}/></details><p>Représentation interne, pas le code d’un site externe. Pas d’exécution de code libre.</p></details>
   </section>
  </div>
  <label>Largeur de rendu <select value={width} onChange={e=>setWidth(Number(e.target.value))}><option value={390}>390 px</option><option value={768}>768 px</option><option value={1200}>1200 px</option></select></label>
  <div style={{overflowX:'auto'}}><iframe title="Projection web du motif Zoom Code" sandbox="" srcDoc={zoomHTML(proposal??p)} style={{width,height:500,maxWidth:'none',background:'white'}}/></div>
  <button type="button" onClick={()=>saveStudioFile('aime-motif.pointzero.json',zoomJSON(p))}>Exporter JSON natif</button>
  <button type="button" onClick={()=>saveStudioFile('aime-motif.svg',zoomSVG(p),'image/svg+xml')}>Exporter SVG</button>
  <button type="button" onClick={()=>saveStudioFile('aime-motif.html',zoomHTML(p),'text/html;charset=utf-8')}>Exporter page HTML</button>
  <p>Pas d’import dans le Dossier ou de publication. Annulation limitée à 20 étapes en session ; fermer recharge le motif de démonstration. Le SVG est un visuel, pas une interface interactive générée.</p>
 </details>;
}

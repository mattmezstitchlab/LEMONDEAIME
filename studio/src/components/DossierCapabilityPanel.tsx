import {useEffect,useState} from 'react';
import {inspectStoredDossierCapability,proposeDossierNeed,type DossierCapabilityReport} from '../lib/dossierCapabilities';
import {AIME_WORLD_CHANGED,readDossier} from '../lib/universalDossier';
import {exportNeeds,type DevelopmentNeed} from '../lib/developmentNeeds';
const labels={immédiat:'Réalisable immédiatement',composition:'Réalisable par composition',développement:'Réalisable après développement','à-vérifier':'À vérifier','non-réalisable':'Non réalisable actuellement'};
export default function DossierCapabilityPanel({dossierId}:{dossierId:string}){
 const [target,setTarget]=useState('academy'),[report,setReport]=useState<DossierCapabilityReport|null>(null);
 const [detail,setDetail]=useState('');
 const [need,setNeed]=useState<DevelopmentNeed|null>(null),[error,setError]=useState('');
 useEffect(()=>{const reset=()=>{setReport(null);setNeed(null)};window.addEventListener(AIME_WORLD_CHANGED,reset);window.addEventListener('storage',reset);return()=>{window.removeEventListener(AIME_WORLD_CHANGED,reset);window.removeEventListener('storage',reset)}},[]);
 const requested=target==='other'?detail.trim():target;
 return <section className="ud-capabilities" aria-label="Diagnostic des capacités AIME">
  <h3>Capacités du dossier · prototype local</h3>
  <p>Diagnostic sans sauvegarde ni exécution. Cible structurée à confirmer ; pas une analyse IA.</p>
  <label>Résultat souhaité <select value={target} onChange={e=>{setTarget(e.target.value);setReport(null);setNeed(null);setError('')}}>
   <option value="academy">Préparer un support pédagogique</option><option value="formation">Voir la projection Formation</option><option value="chronology">Voir le programme</option><option value="mini-site">Préparer un mini-site lié</option><option value="document-html">Préparer un récapitulatif</option><option value="dossier-json">Exporter les données du dossier</option><option value="other">Un autre besoin à cadrer</option>
  </select></label>
  {target==='other'&&<label>Décrivez le résultat manquant <input value={detail} onChange={e=>{setDetail(e.target.value);setReport(null);setNeed(null)}}/></label>}
  <button type="button" onClick={()=>{try{setReport(inspectStoredDossierCapability(dossierId,requested,true));setNeed(null);setError('')}catch(e){setReport(null);setError(String(e))}}}>Confirmer la cible et diagnostiquer</button>
  {error&&<p role="alert">{error}</p>}
  {report&&<div role="status"><strong>{labels[report.diagnostic.status]}</strong><p>{report.diagnostic.reason}</p>
   <p>{report.diagnostic.path.length>0?`${report.diagnostic.path.length} étape(s) proposée(s), aucune action exécutée`:''}</p><p>Support Academy existant : {{none:'aucun support lié',available:'présent sur cet appareil',missing:'introuvable',invalid:'invalide — conservé'}[report.academyHealth]}. Préparer un support ne signifie pas le publier.</p>
   {report.limits.map(x=><p key={x}>{x}</p>)}
   {report.diagnostic.status==='développement'&&<button type="button" onClick={()=>{try{const s=readDossier(dossierId);if(!s)throw Error('Dossier introuvable');setNeed(proposeDossierNeed(s,requested,'need-'+crypto.randomUUID(),new Date().toISOString()));setError('')}catch(e){setError(String(e))}}}>Préparer une proposition de besoin (sans sauvegarde)</button>}
  </div>}
  {need&&<label>Proposition JSON à copier avant de quitter — non enregistrée<textarea readOnly value={exportNeeds([need])} rows={10}/></label>}
 </section>;
}

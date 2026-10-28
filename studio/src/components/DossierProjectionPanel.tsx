import {executeCapability} from '../lib/capabilityRegistry';
import {useMemo,useState} from 'react';
import type {WorldSpace} from '../lib/oneSpaceCore';
import type {MiniSite} from '../lib/miniSiteCore';
import {miniSiteToHTML} from '../lib/miniSiteCore';
import {DOSSIER_INTERFACE,chronology,linkedMiniSite,projectMiniSite} from '../lib/dossierProjections';
import {updateUniversalMoment} from '../lib/universalDossier';
import {saveStudioFile} from './StudioFrame';
export default function DossierProjectionPanel({space,onOpenMiniSite}:{space:WorldSpace;onOpenMiniSite?:(site:MiniSite)=>void}){
 const [error,setError]=useState('');
 const site=useMemo(()=>linkedMiniSite(space),[space.id]);
 const preview=miniSiteToHTML(projectMiniSite(site,space)),document=executeCapability("document.project",space) as string;
 const plan=executeCapability("chronology.project",space) as ReturnType<typeof chronology>;
 return <section className="ud-sheet ud-projections" aria-label="Un dossier, trois projections">
  <h3>Un dossier, trois projections</h3><p>Programme du dossier, mini-site et récapitulatif utilisent les mêmes moments. Local uniquement · aucune publication.</p>
  {DOSSIER_INTERFACE.blocks.includes('chronology')&&<div aria-label="Programme canonique">{plan.moments.map(m=><form key={m.id+':'+m.time} onSubmit={e=>{e.preventDefault();try{const data=new FormData(e.currentTarget);updateUniversalMoment(space.id,m.id,String(data.get('time')));setError('')}catch(err){setError(String(err))}}}>
   <label>{m.title} <input name="time" type="time" defaultValue={m.time} aria-label={'Horaire '+m.title} required/></label><button type="submit">Confirmer l’horaire</button>
  </form>)}</div>}
  {error&&<p role="alert">{error}</p>}
  <details><summary>Voir le mini-site lié</summary><iframe title="Mini-site lié au programme canonique" sandbox="" srcDoc={preview} loading="lazy" style={{width:'100%',height:460,border:'1px solid #c7ccc2'}}/></details>
  <details><summary>Voir le document récapitulatif</summary><iframe title="Récapitulatif lié au programme canonique" sandbox="" srcDoc={document} loading="lazy" style={{width:'100%',height:460,border:'1px solid #c7ccc2'}}/></details>
  <button type="button" onClick={()=>saveStudioFile('aime-programme.html',document,'text/html;charset=utf-8')}>Exporter le récapitulatif</button>
  {onOpenMiniSite&&<button type="button" onClick={()=>{if(window.confirm('Ouvrir un mini-site lié dans l’éditeur ? Exportez auparavant le brouillon courant du Studio Mini-site si nécessaire.'))onOpenMiniSite(site)}}>Personnaliser dans le Studio Mini-site</button>}
  <p>Les aperçus sont vivants sur cet appareil. Un fichier HTML téléchargé est un instantané ; il ne se synchronise pas à distance.</p>
 </section>;
}

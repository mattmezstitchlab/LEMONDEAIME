import {AIME_DOMAINS,domainToolPath} from '../lib/aimeDomains';
export default function AimeDomainNavigation({onNavigate}:{onNavigate:(path:string)=>void}){
 return <section className="aime-domain-navigation" aria-label="Trouver les outils par objectif">
  <h2>Que souhaitez-vous accomplir ?</h2><p>Un même projet, plusieurs disciplines. Tous ces outils restent accessibles manuellement ; leurs limites sont indiquées avant de commencer.</p>
  <a href="/espace" onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();onNavigate('/espace')}}}>Commencer dans Mon Espace — Dossier Universel local</a>
  <div>{AIME_DOMAINS.map(d=><details key={d.id}><summary>{d.intent} <small>{d.title}</small></summary><ul>{d.tools.map(t=><li key={t.route}><a href={domainToolPath(t.route)} onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();onNavigate(domainToolPath(t.route))}}}>{t.label}</a><span>{t.state==='local'?'Fonction locale':'Expérimental'} · {t.limit}</span></li>)}</ul></details>)}</div>
  <p>Collaborer, inviter, publier ou synchroniser un compte externe n’est pas encore un parcours disponible. Aucun compte externe n’est connecté par cette page.</p>
  <a href="/le-monde-aime" onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0){e.preventDefault();onNavigate('/le-monde-aime')}}}>LE MONDE AIME — association distincte, projets et transmission</a>
 </section>;
}

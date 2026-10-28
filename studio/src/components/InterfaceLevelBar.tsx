import { LEVEL_HELP, LEVEL_LABELS, type InterfaceLevel } from "../lib/interfaceLevel";

/** Capsule de niveau, centrée dans l'en-tête du studio. Présentation seulement : le patron n'est jamais modifié. */
export default function InterfaceLevelBar({value,onChange}:{value:InterfaceLevel;onChange:(v:InterfaceLevel)=>void}) {
 return <div className="pz-level-bar" role="group" aria-label="Affichage" aria-describedby="pz-level-help">
  {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id=>
   <button key={id} type="button" aria-pressed={value===id} title={LEVEL_HELP[id]} onClick={()=>onChange(id)}>{LEVEL_LABELS[id]}</button>)}
  <span id="pz-level-help" className="sr-only" role="status">{LEVEL_HELP[value]}</span>
 </div>;
}

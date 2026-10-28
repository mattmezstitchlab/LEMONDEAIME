import AimeSymbol from "./AimeSymbol";
import {AIME_SYMBOLS,AIME_SYMBOL_VERSION,symbolSVG,type AimeSymbolName} from "../lib/aimeSymbols";
import {useState} from 'react';
import {DESIGN_SYSTEM,designCSS,designVariables} from '../lib/designSystem';
import {contrastGrade} from '../lib/accessibilityCore';
import {saveStudioFile} from './StudioFrame';
import '../design/components.css';
export default function DesignFoundation(){
 const [mode,setMode]=useState<'light'|'dark'>('light');
 const tokens={...DESIGN_SYSTEM.tokens,...(mode==='dark'?DESIGN_SYSTEM.dark:{})};
 return <section data-aime-design={DESIGN_SYSTEM.version} data-aime-mode={mode} className="aime-foundation aime-panel" style={Object.fromEntries(designVariables(mode).split(';').filter(Boolean).map(x=>{const n=x.indexOf(':');return [x.slice(0,n),x.slice(n+1)]}))}>
  <h3>Fondations canoniques AIME · {DESIGN_SYSTEM.version}</h3>
  <p>Référence : Design System Lab, commit {DESIGN_SYSTEM.reference.commit.slice(0,7)}. Les règles de marque ne remplacent ni vos couleurs de projet ni votre profil d’accessibilité. Les polices ont des replis locaux ; aucun téléchargement distant ajouté.</p>
  <label>Prévisualiser le thème <select className="aime-field" value={mode} onChange={e=>setMode(e.target.value as 'light'|'dark')}><option value="light">Clair</option><option value="dark">Sombre</option></select></label>
  <div className="aime-swatches">{(['ink','muted','surface','petrol','turquoise','seafoam','focus'] as const).map(key=><div key={key}><div className="aime-swatch" style={{background:tokens[key]}}/><strong>{key}</strong><br/><code>{tokens[key]}</code></div>)}</div>
  <p>Contraste texte/fond : {contrastGrade(tokens.ink,tokens.surface).ratio.toFixed(2)}:1. Secondaire : {contrastGrade(tokens.muted,tokens.surface).ratio.toFixed(2)}:1. Les accents ne sont pas tous utilisables comme texte.</p>
  <div className="aime-actions"><button className="aime-button" type="button" onClick={()=>saveStudioFile('aime-design-1.0.0.json',JSON.stringify(DESIGN_SYSTEM,null,2))}>Exporter les tokens JSON</button><button className="aime-button" type="button" onClick={()=>saveStudioFile('aime-design-1.0.0.css',designCSS(),'text/css;charset=utf-8')}>Exporter le CSS isolé</button></div>
  <h3>Grammaire vectorielle AIME · {AIME_SYMBOL_VERSION}</h3>
  <div className="aime-swatches">{(Object.keys(AIME_SYMBOLS) as AimeSymbolName[]).map(name=><div key={name}><AimeSymbol name={name} label={name}/><span>{name}</span><button className="aime-button" type="button" onClick={()=>saveStudioFile('aime-'+name+'.svg',symbolSVG(name),'image/svg+xml')}>SVG</button></div>)}</div>
  <p>Grille 24 × 24 · trait 1,5 · tailles 16/24/32 · pas d’animation par défaut. Exclusivité juridique non vérifiée.</p>
  <p>Échelle : 4 / 8 / 16 / 24 / 40 / 64 px · contenu 1440 px · rayon 12 px · bouton 48 px. Cette bibliothèque est raccordée progressivement ; elle ne gouverne pas encore tous les Studios.</p>
 </section>;
}

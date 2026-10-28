import { Download, Upload, ZoomIn, ZoomOut, Scan, Search } from "lucide-react";
export default function StudioActionBar({onImport,onExport,onZoom,onFit,onMagnify}:{onImport:()=>void;onExport:()=>void;onZoom:(direction:"in"|"out")=>void;onFit:()=>void;onMagnify:()=>void}){
 return <nav className="pz-action-bar pz-chrome-toolbar" aria-label="Actions rapides du studio">
  <button type="button" onClick={onImport} aria-label="Importer un fichier" title="Importer"><Upload size={19} aria-hidden="true"/></button>
  <button type="button" onClick={onExport} aria-label="Exporter et partager" title="Exporter"><Download size={19} aria-hidden="true"/></button>
  <span className="pz-action-divider" aria-hidden="true"/>
  <button type="button" onClick={onMagnify} aria-label="Activer la loupe" title="Loupe : doubler le zoom de la zone visible, sans modifier le patron"><Search size={19} aria-hidden="true"/></button>
  <button type="button" onClick={()=>onZoom("out")} aria-label="Dézoomer la grille"><ZoomOut size={19}/></button>
  <button type="button" onClick={()=>onZoom("in")} aria-label="Zoomer la grille"><ZoomIn size={19}/></button>
  <button type="button" onClick={onFit} aria-label="Recentrer la grille" title="Recentrer"><Scan size={19} aria-hidden="true"/></button>
 </nav>;
}

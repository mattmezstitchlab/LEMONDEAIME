import { useState } from "react";
import { ArrowLeft, UserPlus, Ellipsis, FolderOpen, Layers, PanelLeft, PanelRight, Pencil, Redo2, Settings2, Share2, Type, Undo2 } from "lucide-react";
import type { Pattern } from "../lib/pattern";
import type { ViewMode } from "./Canvas";

interface Props {
  pattern: Pattern;
  onCreate: () => void;
  onDesign?: () => void;
  onLibrary: () => void;
  onExport: () => void;
  onSettings: () => void;
  onShare: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  symbols: boolean;
  onSymbols: () => void;
  view: ViewMode;
  onView: (value: ViewMode) => void;
  onFit: () => void;
  saving: string;
  onDrawing?: () => void;
  onAdvanced?: () => void;
  drawing?: boolean;
  onToggleLeft?: () => void;
  onToggleRight?: () => void;
}
const views: ViewMode[] = ["real", "flat", "pattern"];
const iconButton = "pz-chrome-icon-button grid size-10 shrink-0 place-items-center text-white/80 hover:text-white disabled:opacity-25";
export default function TopBar(p: Props) {
  const [more, setMore] = useState(false);
  const cycle = () => p.onView(views[(views.indexOf(p.view) + 1) % views.length]);
  return <header className="pz-embroidery-header pz-chrome-toolbar fixed inset-x-0 top-0 z-40 flex h-[58px] items-center justify-between gap-2 px-3 text-white" aria-label="En-tête de l'atelier">
    <div className="flex min-w-0 shrink-0 items-center gap-2">
      {p.onDesign && <button type="button" onClick={p.onDesign} aria-label="Accueil Point Zéro" title="Accueil point de croix"
        className={iconButton + " border border-white/20"}><ArrowLeft size={17}/></button>}
      <button type="button" onClick={p.onCreate} aria-label="Point Zéro : créer un motif"
        className="min-w-0 text-left text-[13px] font-semibold tracking-tight text-white hover:text-white/80">
        <span className="hidden sm:inline"><span aria-hidden="true" className="text-[var(--pz-brand-text)]">×</span> Point Zéro </span><span className="text-white/60">Studio</span>
      </button>
      <span className="hidden max-w-[220px] truncate text-[11px] text-white/45 2xl:inline" title={p.pattern.name}>{p.pattern.name}</span>
    </div>
    <div className="flex min-w-0 shrink items-center gap-0.5">
      {p.onToggleLeft && <button className={iconButton + " lg:hidden"} type="button" aria-label="Afficher la bibliothèque broderie" onClick={p.onToggleLeft}><PanelLeft size={18}/></button>}
      {p.onToggleRight && <button className={iconButton + " xl:hidden"} type="button" aria-label="Afficher les propriétés broderie" onClick={p.onToggleRight}><PanelRight size={18}/></button>}
      <button type="button" className={iconButton} aria-label="Annuler" title="Annuler" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17}/></button>
      <button type="button" className={iconButton + " hidden sm:grid"} aria-label="Rétablir" title="Rétablir" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17}/></button>
      <button type="button" className={iconButton + " hidden sm:grid"} aria-label="Bibliothèque" title="Bibliothèque" onClick={p.onLibrary}><FolderOpen size={17}/></button>

      <button type="button" className={iconButton + " hidden sm:grid"} aria-label="Réglages et aide" title="Réglages" onClick={p.onSettings}><Settings2 size={17}/></button>
      <button type="button" className={iconButton + " gap-1 px-2 w-auto"} onClick={p.onShare} title="Inviter à voir mon ouvrage" aria-label="Inviter une personne à voir mon ouvrage"><UserPlus size={17}/><span className="hidden 2xl:inline text-xs">Inviter</span></button>
      <div className="relative">
        <button type="button" className={iconButton} aria-label="Plus d'options" aria-expanded={more} onClick={() => setMore(v => !v)}><Ellipsis size={19}/></button>
        {more && <div className="pz-surface absolute right-0 top-[calc(100%+8px)] z-50 grid w-[215px] gap-1 p-2 text-sm text-white" aria-label="Options d'affichage">
          <button disabled={!p.canUndo} className="flex min-h-11 items-center gap-2 rounded-[5px] px-2 text-left disabled:opacity-30 sm:hidden" onClick={() => {p.onUndo();setMore(false);}}><Undo2 size={16}/> Annuler</button>
          <button disabled={!p.canRedo} className="flex min-h-11 items-center gap-2 rounded-[5px] px-2 text-left disabled:opacity-30 sm:hidden" onClick={() => {p.onRedo();setMore(false);}}><Redo2 size={16}/> Rétablir</button>
          <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10 sm:hidden" onClick={() => { p.onLibrary(); setMore(false); }}><FolderOpen size={16}/> Bibliothèque</button>
          <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10 sm:hidden" onClick={() => { p.onSettings(); setMore(false); }}><Settings2 size={16}/> Réglages et aide</button>
          {p.onAdvanced && <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10" onClick={() => { p.onAdvanced?.(); setMore(false); }}><Layers size={16}/> Options de composition</button>}
          {p.onDrawing && <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10" onClick={() => { p.onDrawing?.(); setMore(false); }} aria-pressed={!!p.drawing}><Pencil size={16}/> {p.drawing ? "Masquer les outils" : "Outils de dessin"}</button>}
          <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10" onClick={() => { cycle(); setMore(false); }}><Layers size={16}/> Affichage · {p.view}</button>
          <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10" onClick={() => { p.onSymbols(); setMore(false); }} aria-pressed={p.symbols}><Type size={16}/> Symboles</button>
          <button className="flex min-h-10 items-center gap-2 rounded-[5px] px-2 text-left text-white/85 hover:bg-white/10" onClick={() => { p.onShare(); setMore(false); }}><Share2 size={16}/> Partager</button>
        </div>}
      </div>
    </div>
    <span className="sr-only" role="status">{p.pattern.name} · {p.saving}</span>
  </header>;
}

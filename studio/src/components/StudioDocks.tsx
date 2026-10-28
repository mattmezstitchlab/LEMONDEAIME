import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, Redo2, Search, Undo2 } from "lucide-react";
import type { Tool } from "../lib/stitch";
import type { ViewMode } from "./Canvas";
import { LEVEL_LABELS, type InterfaceLevel } from "../lib/interfaceLevel";
import { VISIBILITY, VISIBILITY_ORDER, type Visibility } from "../lib/visibility";
import VisibilityOrb from "./VisibilityOrb";

/**
 * Les deux docks du studio (charte UniO du Monde AIME).
 * En haut, blanc : des verbes. Dessiner, Broder, Fils, Partager ; chacun se déploie
 * dans le dock lui-même, le contexte d'abord (le fil actif), la profondeur ensuite.
 * En bas, sombre : des lieux. Le BurO, l'ouvrage, l'affichage et le zoom.
 * Créer, ouvrir et importer vivent au BurO : on entre dans le studio avec un projet.
 */
export type DockPath = null | "dessiner" | "dessiner-plus" | "fils" | "broder" | "partager" | "visibilite";

export interface DockActions {
  buro: () => void; home: () => void; shop: () => void; settings: () => void; share: () => void;
  motifs: () => void; exportPanel: () => void; save: () => void; palette: () => void;
  threadsSettings: () => void; follow: () => void; layers: () => void; drawSettings: () => void;
}

interface Props {
  patternName: string;
  saving: string;
  workspace: "create" | "stitch";
  onWorkspace: (mode: "create" | "stitch") => void;
  tool: Tool;
  onTool: (tool: Tool) => void;
  level: InterfaceLevel;
  onLevel: (level: InterfaceLevel) => void;
  view: ViewMode;
  onView: (view: ViewMode) => void;
  symbols: boolean;
  onSymbols: () => void;
  canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void;
  colorHex: string; colorLabel: string;
  path: DockPath; onPath: (path: DockPath) => void;
  inspectorOpen: boolean;
  visibility: Visibility; onVisibility: (value: Visibility) => void;
  actions: DockActions;
  zoom: { zoomIn: () => void; zoomOut: () => void; fit: () => void; magnify: () => void };
  readOnly?: boolean;
}

const DRAW: [Tool, string][] = [["hand", "Main"], ["cross", "Croix"], ["erase", "Gomme"], ["fill", "Remplir"], ["pick", "Pipette"], ["select", "Sélection"]];
const DRAW_MORE: [Tool, string][] = [["half", "Demi-point"], ["quarter", "Quart"], ["threeQuarter", "Trois quarts"], ["petite", "Petite croix"], ["bead", "Perle"], ["back", "Point arrière"], ["knot", "Nœud"], ["long", "Point lancé"], ["line", "Ligne"], ["rect", "Rectangle"], ["ellipse", "Ellipse"], ["lasso", "Lasso"], ["move", "Déplacer"]];
const STITCH: [Tool, string][] = [["hand", "Main"], ["mark", "Marquer"], ["block", "Bloc 10 × 10"], ["row", "Ligne"], ["pick", "Pipette"], ["details", "Détails"], ["park", "Parking"], ["unpick", "À défaire"], ["note", "Note"]];
const BEGINNER = new Set<Tool>(["hand", "cross", "erase", "pick", "mark"]);
const VIEWS: [ViewMode, string][] = [["real", "Réaliste"], ["flat", "À plat"], ["pattern", "Patron"]];
const LABELS: Record<Exclude<DockPath, null>, string> = { dessiner: "Dessiner", "dessiner-plus": "Plus d’outils", fils: "Fils", broder: "Broder", partager: "Partager", visibilite: "Visibilité" };
const PARENT: Partial<Record<Exclude<DockPath, null>, DockPath>> = { "dessiner-plus": "dessiner", visibilite: "partager" };

function Tool_({ children, pressed, onClick, disabled, haspopup, count, soon }: { children: ReactNode; pressed?: boolean; onClick?: () => void; disabled?: boolean; haspopup?: boolean; count?: number; soon?: boolean }) {
  return <button type="button" className="pzs-tool" aria-pressed={pressed === undefined ? undefined : pressed} aria-haspopup={haspopup ? "true" : undefined}
    disabled={disabled} onClick={onClick} data-on={pressed ? "1" : undefined}>
    {children}{count !== undefined && <span className="pzs-count" aria-hidden="true">{count}</span>}
    {soon && <span className="buro-soon">Bientôt</span>}
  </button>;
}

export default function StudioDocks(p: Props) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const upRef = useRef<HTMLButtonElement>(null);
  const wasPath = useRef<DockPath>(p.path);
  useEffect(() => {
    if (p.path && p.path !== wasPath.current) upRef.current?.focus();
    wasPath.current = p.path;
  }, [p.path]);
  useEffect(() => { if (menu) menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus(); }, [menu]);

  const up = () => p.onPath(p.path ? PARENT[p.path] ?? null : null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (menu) { e.preventDefault(); setMenu(false); document.getElementById("pzs-brand")?.focus(); return; }
    if (p.path) { e.preventDefault(); up(); }
  };
  const level = (list: [Tool, string][]) => p.level === "beginner" ? list.filter(([id]) => BEGINNER.has(id) || id === p.tool) : list;
  const thread = <button type="button" className="pzs-tool pzs-threadtool" onClick={() => p.onPath("fils")} aria-label={`Fil actif ${p.colorLabel}, changer de fil`}>
    <span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />{p.colorLabel}
  </button>;

  let items: ReactNode;
  if (p.path === "dessiner") items = <>
    {thread}<span className="pzs-sep" aria-hidden="true" />
    {level(DRAW).map(([id, name]) => <Tool_ key={id} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => p.onTool(id)}>{name}</Tool_>)}
    <Tool_ haspopup count={DRAW_MORE.length} onClick={() => p.onPath("dessiner-plus")} disabled={p.readOnly}>Plus d’outils</Tool_>
    <Tool_ onClick={p.actions.motifs} disabled={p.readOnly}>Motifs</Tool_>
    <Tool_ pressed={p.inspectorOpen} onClick={p.actions.layers}>Calques</Tool_>
    <Tool_ onClick={p.actions.drawSettings}>Réglages du dessin</Tool_>
  </>;
  else if (p.path === "dessiner-plus") items = <>
    {DRAW_MORE.map(([id, name]) => <Tool_ key={id} pressed={p.tool === id} disabled={p.readOnly} onClick={() => p.onTool(id)}>{name}</Tool_>)}
  </>;
  else if (p.path === "fils") items = <>
    <span className="pzs-chip"><span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />Fil actif · {p.colorLabel}</span>
    <Tool_ onClick={p.actions.palette}>Palette DMC</Tool_>
    <Tool_ onClick={p.actions.threadsSettings}>Fils et toile</Tool_>
  </>;
  else if (p.path === "broder") items = <>
    {thread}<span className="pzs-sep" aria-hidden="true" />
    {level(STITCH).map(([id, name]) => <Tool_ key={id} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => p.onTool(id)}>{name}</Tool_>)}
    <Tool_ onClick={p.actions.follow}>Suivi</Tool_>
  </>;
  else if (p.path === "partager") items = <>
    <Tool_ onClick={p.actions.share}>Inviter à regarder</Tool_>
    <Tool_ haspopup count={4} onClick={() => p.onPath("visibilite")}><VisibilityOrb value={p.visibility} size={20} />Visibilité · {VISIBILITY[p.visibility].label}</Tool_>
    <Tool_ onClick={p.actions.exportPanel}>Exporter</Tool_>
    <Tool_ onClick={p.actions.save}>Enregistrer</Tool_>
    <Tool_ disabled soon>Lancer un SAL</Tool_>
    <Tool_ disabled soon>Publier en Boutique</Tool_>
  </>;
  else if (p.path === "visibilite") items = <>
    {VISIBILITY_ORDER.map(v => <Tool_ key={v} pressed={p.visibility === v} onClick={() => p.onVisibility(v)}><VisibilityOrb value={v} size={20} />{VISIBILITY[v].label}</Tool_>)}
  </>;
  else items = <>
    <Tool_ haspopup count={DRAW.length + 4} pressed={p.workspace === "create"} onClick={() => { p.onWorkspace("create"); p.onPath("dessiner"); }}>Dessiner</Tool_>
    <Tool_ haspopup count={STITCH.length + 1} pressed={p.workspace === "stitch"} onClick={() => { p.onWorkspace("stitch"); p.onPath("broder"); }}>Broder</Tool_>
    <Tool_ haspopup count={2} onClick={() => p.onPath("fils")}>Fils</Tool_>
    <Tool_ haspopup count={6} onClick={() => p.onPath("partager")}>Partager</Tool_>
  </>;

  const toolName = [...DRAW, ...DRAW_MORE, ...STITCH].find(([id]) => id === p.tool)?.[1];
  const crumbs = ["Point Zéro", p.patternName];
  if (p.path) { const parent = PARENT[p.path]; if (parent) crumbs.push(LABELS[parent]); crumbs.push(LABELS[p.path]); }
  if ((p.path === "dessiner" || p.path === "dessiner-plus" || p.path === "broder") && toolName) crumbs.push(toolName);

  return <>
    <header className="pzs-head" aria-label="En-tête du studio">
      <nav className="pzs-top" aria-label="Dock des outils du studio de broderie" onKeyDown={onKey}>
        <div className="pzs-brandwrap">
          <button id="pzs-brand" type="button" className="pzs-tool pzs-brand" aria-label="Menu Point Zéro" aria-expanded={menu} aria-controls="pzs-menu" onClick={() => setMenu(v => !v)}>
            <span className="pzs-x" aria-hidden="true">×</span><span className="pzs-brandtxt"> Point Zéro</span> <ChevronDown size={13} aria-hidden="true" style={{ transform: menu ? "rotate(180deg)" : undefined }} />
          </button>
          {menu && <>
            <div className="pzs-veil" aria-hidden="true" onClick={() => setMenu(false)} />
            <div id="pzs-menu" ref={menuRef} className="pzs-menu">
              <ul>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.buro(); }}>BurO</button></li>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.home(); }}>Accueil Point Zéro</button></li>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.shop(); }}>Boutique de patrons</button></li>
                <li><button type="button" onClick={() => { setMenu(false); p.actions.settings(); }}>Réglages et aide</button></li>
              </ul>
              <div className="pzs-levels" role="group" aria-label="Affichage du studio">
                <span>Affichage</span>
                {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id =>
                  <button key={id} type="button" aria-pressed={p.level === id} onClick={() => p.onLevel(id)}>{LEVEL_LABELS[id]}</button>)}
              </div>
            </div>
          </>}
        </div>
        <span className="pzs-sep" aria-hidden="true" />
        <div className="pzs-row">
          {p.path && <>
            <button ref={upRef} type="button" className="pzs-tool pzs-up" aria-label="Remonter d’un niveau" onClick={up}><ArrowLeft size={18} aria-hidden="true" /></button>
            <span className="pzs-parent">{LABELS[p.path]}</span>
            <span className="pzs-sep" aria-hidden="true" />
          </>}
          {items}
        </div>
        <span className="pzs-sep" aria-hidden="true" />
        <button type="button" className="pzs-tool pzs-icon" aria-label="Annuler" title="Annuler" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17} aria-hidden="true" /></button>
        <button type="button" className="pzs-tool pzs-icon pzs-redo" aria-label="Rétablir" title="Rétablir" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17} aria-hidden="true" /></button>
      </nav>
      <span className="sr-only" role="status">{p.patternName} · {p.saving}</span>
      <p className="pzs-crumbs">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> › </span>}{i === crumbs.length - 1 ? <strong>{c}</strong> : c}</span>)}</p>
    </header>

    <nav className="pzs-bottom" aria-label="Se repérer dans le studio">
      <button type="button" className="pzs-btm pzs-buro" onClick={p.actions.buro} aria-label="Revenir au BurO">
        <span className="pzs-orb" aria-hidden="true" />BurO
      </button>
      <span className="pzs-place" title={p.patternName}><VisibilityOrb value={p.visibility} size={18} dark /><span className="sr-only">{VISIBILITY[p.visibility].label} · </span>{p.patternName}</span>
      <span className="pzs-sep" aria-hidden="true" />
      <div className="pzs-seg" role="group" aria-label="Affichage de la grille">
        {VIEWS.map(([id, name]) => <button key={id} type="button" aria-pressed={p.view === id} onClick={() => p.onView(id)}>{name}</button>)}
      </div>
      <button type="button" className="pzs-btm" aria-pressed={p.symbols} onClick={p.onSymbols}>Symboles</button>
      <span className="pzs-sep" aria-hidden="true" />
      <button type="button" className="pzs-btm pzs-sq" aria-label="Loupe : doubler le zoom de la zone visible" title="Loupe" onClick={p.zoom.magnify}><Search size={17} aria-hidden="true" /></button>
      <button type="button" className="pzs-btm pzs-sq" aria-label="Dézoomer" onClick={p.zoom.zoomOut}>−</button>
      <button type="button" className="pzs-btm pzs-sq" aria-label="Zoomer" onClick={p.zoom.zoomIn}>+</button>
      <button type="button" className="pzs-btm pzs-light" onClick={p.zoom.fit}>Tout voir</button>
    </nav>
  </>;
}

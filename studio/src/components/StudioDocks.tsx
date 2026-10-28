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
  /** le mode Fils du dock du bas : les pastilles DMC (FlossRail en variante dock) */
  fils?: ReactNode;
  /** la progression du patron : le cercle du dock et le mode Progression */
  progression?: { total: number; done: number; couleurs: { idx: number; hex: string; code: string; cells: number; done: number }[] };
  onCouleur?: (idx: number) => void;
}
type ModeBas = "reperes" | "fils" | "progression";
const MODES: [ModeBas, string, string][] = [["reperes", "Repères", "#FFFFFF"], ["fils", "Fils", "#4FD69A"], ["progression", "Progression", "#F5B754"]];

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
  const [modes, setModes] = useState(false);
  const [modeBas, setModeBas] = useState<ModeBas>(p.path === "fils" ? "fils" : "reperes");
  const cercleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (p.path === "fils") { setModeBas("fils"); setModes(false); } else setModeBas(m => m === "fils" ? "reperes" : m); }, [p.path]);
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

  const total = p.progression?.total ?? 0, prog = total ? (p.progression!.done / total) : 0;
  const teinte = MODES.find(m => m[0] === modeBas)?.[2] ?? "#FFFFFF";
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

    <nav className="pzs-bottom" aria-label="Se repérer dans le studio" onKeyDown={e => { if (e.key === "Escape" && modes) { e.preventDefault(); setModes(false); cercleRef.current?.focus(); } }}>
      <Cercle refBouton={cercleRef} ouvert={modes} onClick={() => setModes(v => !v)} part={prog} teinte={teinte}
        label={(modes ? "Revenir au dock" : "Changer le dock") + ", mode " + (MODES.find(m => m[0] === modeBas)?.[1] ?? "") + (total ? ", patron brodé à " + Math.round(prog * 100) + " %" : "")} />
      {modes
        ? <div className="pzs-modes" role="group" aria-label="Les modes du dock">
          {MODES.map(([id, nom, halo]) => <button key={id} type="button" className="pzs-btm pzs-halo-mode" aria-pressed={modeBas === id}
            onClick={() => { setModeBas(id); setModes(false); if (id === "fils" && p.path !== "fils") p.onPath("fils"); else if (id !== "fils" && p.path === "fils") p.onPath(null); requestAnimationFrame(() => cercleRef.current?.focus()); }}>
            <span aria-hidden="true" className="pzs-halo" style={{ boxShadow: `0 0 0 2px ${halo}, 0 0 12px 2px ${halo}` }} />{nom}
          </button>)}
        </div>
        : modeBas === "fils" ? (p.fils ?? null)
        : modeBas === "progression" ? <Progression progression={p.progression} onCouleur={p.onCouleur} />
        : <>
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
        </>}
    </nav>
  </>;
}

/* Le cercle du dock du bas : l'anneau suit la progression du patron ; un clic change le dock (Repères, Fils, Progression). */
function Cercle({ refBouton, ouvert, onClick, part, teinte, label }: { refBouton: React.RefObject<HTMLButtonElement | null>; ouvert: boolean; onClick: () => void; part: number; teinte: string; label: string }) {
  const c = 2 * Math.PI * 11;
  const pt = (a: number) => { const t = a * Math.PI / 180; return (22 + 18 * Math.cos(t)).toFixed(2) + " " + (22 + 18 * Math.sin(t)).toFixed(2); };
  const arcs = Array.from({ length: 12 }, (_, k) => { const a0 = -90 + k * 30 + 5, a1 = a0 + 20; return "M " + pt(a0) + " A 18 18 0 0 1 " + pt(a1); });
  return <button ref={refBouton} type="button" className="pzs-cercle" aria-expanded={ouvert} aria-label={label} title={ouvert ? "Revenir au dock" : "Changer le dock"} onClick={onClick}>
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      {arcs.map((d, k) => <path key={k} d={d} fill="none" stroke={teinte} strokeOpacity={.55} strokeWidth={2} strokeLinecap="round" />)}
      <circle cx="22" cy="22" r="11" fill="none" stroke="#fff" strokeOpacity={.18} strokeWidth="2" />
      <circle cx="22" cy="22" r="11" fill="none" stroke={teinte} strokeWidth="2" strokeDasharray={`${(c * part).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 22 22)" />
      <circle cx="22" cy="22" r="5.5" fill="url(#pzs-iris)" />
      <defs><radialGradient id="pzs-iris" cx="35%" cy="32%" r="75%"><stop offset="0%" stopColor="#ffffff" /><stop offset="35%" stopColor="#d9e8ff" /><stop offset="60%" stopColor="#c9b8ff" /><stop offset="80%" stopColor="#ffd6ec" /><stop offset="100%" stopColor="#b9f0e4" /></radialGradient></defs>
    </svg>
  </button>;
}

/* La timeline du patron : chaque fil, de celui qui compte le plus de points au plus petit, rempli à mesure qu'il est brodé. */
function Progression({ progression, onCouleur }: { progression?: Props["progression"]; onCouleur?: (idx: number) => void }) {
  if (!progression || !progression.total) return <span className="pzs-place">Rien à broder pour l’instant : dessinez, importez ou ouvrez un patron.</span>;
  const { total, done } = progression, reste = Math.max(0, total - done);
  const couleurs = [...progression.couleurs].filter(c => c.cells > 0).sort((a, b) => b.cells - a.cells);
  return <>
    <span className="pzs-place" style={{ fontWeight: 700 }}>{Math.round(done / total * 100)} %<span style={{ fontWeight: 400, opacity: .7 }}> · {reste.toLocaleString("fr-FR")} à broder</span></span>
    <div className="pzs-timeline" role="list" aria-label="La timeline du patron, fil par fil">
      {couleurs.map(c => { const part = c.done / c.cells;
        return <button key={c.idx} type="button" role="listitem" className="pzs-etape" onClick={() => onCouleur?.(c.idx)}
          style={{ flexGrow: Math.max(1, c.cells), minWidth: 34 }} aria-label={`DMC ${c.code} : ${Math.round(part * 100)} % brodé, ${c.cells - c.done} points restants`} title={`DMC ${c.code} · ${Math.round(part * 100)} %`}>
          <span className="pzs-etape-fond" style={{ background: c.hex }} />
          <span className="pzs-etape-reste" style={{ left: `${part * 100}%` }} />
          <span className="pzs-etape-code">{c.code}</span>
        </button>; })}
    </div>
  </>;
}

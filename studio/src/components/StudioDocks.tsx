import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import OuvragesBloc from "./OuvragesBloc";
import { ToolIcon } from "./ToolIcons";
import { ArrowLeft, Redo2, Search, Undo2, X } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import { dansAime } from "../lib/aimeSync";
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
  /** relancer la visite de l'orbe */
  visite?: () => void;
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
  /** le rond du profil : mes ouvrages (ouvrir d'un clic ou glisser sur la grille) et déposer un fichier */
  ouvrages?: { courant?: string; ouvrir: (id: string) => void; importer: (f: File) => void };
  /** la progression du patron : le cercle du dock et le mode Progression */
  progression?: { total: number; done: number; couleurs: { idx: number; hex: string; code: string; cells: number; done: number }[] };
  onCouleur?: (idx: number) => void;
}
type Genre = "tout" | "outils" | "fils" | "fonctions";
const GENRES: [Genre, string][] = [["tout", "Tout"], ["outils", "Outils"], ["fils", "Fils"], ["fonctions", "Fonctions"]];
type Resultat = { id: string; genre: Exclude<Genre, "tout">; label: string; meta: string; hex?: string; faire: () => void };
const sansAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/* les noms DMC sont en anglais : on cherche aussi en français */
const COULEURS_FR: Record<string, string[]> = { rouge: ["red"], bleu: ["blue"], vert: ["green"], jaune: ["yellow"], rose: ["pink", "rose"], noir: ["black"], blanc: ["white"], gris: ["gray", "grey"], violet: ["violet", "purple"], mauve: ["mauve", "lavender"], orange: ["orange"], marron: ["brown"], brun: ["brown"], beige: ["beige", "tan"], or: ["gold"], dore: ["gold"], argent: ["silver"], turquoise: ["turquoise"], corail: ["coral"], creme: ["cream", "ecru"], ecru: ["ecru"], kaki: ["khaki"], saumon: ["salmon"], lilas: ["lavender", "lilac"], fonce: ["dark", "dk"], clair: ["light", "lt"], pale: ["pale", "vy lt"] };
const correspond = (texte: string, q: string) => { const t = sansAccents(texte); return q.split(/\s+/).every(m => t.includes(m) || (COULEURS_FR[m] ?? []).some(e => t.includes(e))); };
const initiales = (s: string) => s.trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "·";
type ModeBas = "reperes" | "fils" | "progression";
const MODES: [ModeBas, string, string][] = [["reperes", "Repères", "#FFFFFF"], ["fils", "Fils", "#4FD69A"], ["progression", "Progression", "#F5B754"]];

const DRAW: [Tool, string][] = [["hand", "Main"], ["cross", "Croix"], ["erase", "Gomme"], ["fill", "Remplir"], ["pick", "Pipette"], ["select", "Sélection"]];
const DRAW_MORE: [Tool, string][] = [["half", "Demi-point"], ["quarter", "Quart"], ["threeQuarter", "Trois quarts"], ["petite", "Petite croix"], ["bead", "Perle"], ["back", "Point arrière"], ["knot", "Nœud"], ["long", "Point lancé"], ["line", "Ligne"], ["rect", "Rectangle"], ["ellipse", "Ellipse"], ["lasso", "Lasso"], ["move", "Déplacer"]];
const STITCH: [Tool, string][] = [["hand", "Main"], ["mark", "Marquer"], ["block", "Bloc 10 × 10"], ["row", "Ligne"], ["pick", "Pipette"], ["details", "Détails"], ["park", "Parking"], ["unpick", "À défaire"], ["note", "Note"]];
const BEGINNER = new Set<Tool>(["hand", "cross", "erase", "pick", "mark"]);
const VIEWS: [ViewMode, string][] = [["real", "Réaliste"], ["flat", "À plat"], ["pattern", "Patron"]];
const LABELS: Record<Exclude<DockPath, null>, string> = { dessiner: "Dessiner", "dessiner-plus": "Plus d’outils", fils: "Fils", broder: "Broder", partager: "Partager", visibilite: "Visibilité" };
const PARENT: Partial<Record<Exclude<DockPath, null>, DockPath>> = { "dessiner-plus": "dessiner", visibilite: "partager" };

function Tool_({ children, pressed, onClick, disabled, haspopup, count, soon, label, guide }: { children: ReactNode; pressed?: boolean; onClick?: () => void; disabled?: boolean; haspopup?: boolean; count?: number; soon?: boolean; label?: string; guide?: string }) {
  return <button type="button" data-guide={guide} className={"pzs-tool" + (label ? " pzs-icon pzs-picto" : "")} aria-label={label} title={label} aria-pressed={pressed === undefined ? undefined : pressed} aria-haspopup={haspopup ? "true" : undefined}
    disabled={disabled} onClick={onClick} data-on={pressed ? "1" : undefined}>
    {children}{count !== undefined && <span className="pzs-count" aria-hidden="true">{count}</span>}
    {soon && <span className="buro-soon">Bientôt</span>}
  </button>;
}

export default function StudioDocks(p: Props) {
  const [bloc, setBloc] = useState<null | "menu" | "chercher" | "inviter">(null);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<Genre>("tout");
  const [moi, setMoi] = useState<{ name?: string; email?: string; image?: string } | null>(null);
  const blocRef = useRef<HTMLDivElement>(null);
  const aime = dansAime();
  useEffect(() => { if (!aime) return; let vivant = true;
    fetch("/api/auth/get-session", { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).then(j => { if (vivant && j && j.user) setMoi({ name: j.user.name, email: j.user.email, image: j.user.image }); }).catch(() => {});
    return () => { vivant = false; }; }, [aime]);
  const ouvrir = (b: "menu" | "chercher" | "inviter") => setBloc(x => x === b ? null : b);
  const fermer = () => setBloc(null);
  const retourSite = () => { try { if (document.referrer && new URL(document.referrer).origin === window.location.origin && !new URL(document.referrer).pathname.startsWith("/studio")) { window.history.back(); return; } } catch { /* adresse illisible */ } window.location.href = "/"; };
  useEffect(() => { if (bloc === "chercher") document.getElementById("pzs-cherche")?.focus(); else if (bloc) blocRef.current?.querySelector<HTMLElement>("a, button")?.focus(); }, [bloc]);
  const [modes, setModes] = useState(false);
  const [modeBas, setModeBas] = useState<ModeBas>(p.path === "fils" ? "fils" : "reperes");
  const cercleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (p.path === "fils") { setModeBas("fils"); setModes(false); } else setModeBas(m => m === "fils" ? "reperes" : m); }, [p.path]);
  const upRef = useRef<HTMLButtonElement>(null);
  const wasPath = useRef<DockPath>(p.path);
  useEffect(() => {
    if (p.path && p.path !== wasPath.current) upRef.current?.focus();
    wasPath.current = p.path;
  }, [p.path]);

  const up = () => p.onPath(p.path ? PARENT[p.path] ?? null : null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (bloc) { e.preventDefault(); const b = bloc; setBloc(null); (b === "menu" ? document.getElementById("pzs-brand") : document.querySelector<HTMLElement>(b === "chercher" ? ".pzs-loupe" : ".pzs-profil"))?.focus(); return; }
    if (p.path) { e.preventDefault(); up(); }
  };
  const level = (list: [Tool, string][]) => p.level === "beginner" ? list.filter(([id]) => BEGINNER.has(id) || id === p.tool) : list;
  const thread = <button type="button" className="pzs-tool pzs-threadtool" onClick={() => p.onPath("fils")} aria-label={`Fil actif ${p.colorLabel}, changer de fil`}>
    <span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />{p.colorLabel}
  </button>;

  let items: ReactNode;
  if (p.path === "dessiner") items = <>
    {thread}<span className="pzs-sep" aria-hidden="true" />
    {level(DRAW).map(([id, name]) => <Tool_ key={id} label={name} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => p.onTool(id)}><ToolIcon tool={id} /></Tool_>)}
    <Tool_ haspopup count={DRAW_MORE.length} onClick={() => p.onPath("dessiner-plus")} disabled={p.readOnly}>Plus d’outils</Tool_>
    <Tool_ onClick={p.actions.motifs} disabled={p.readOnly}>Motifs</Tool_>
    <Tool_ pressed={p.inspectorOpen} onClick={p.actions.layers}>Calques</Tool_>
    <Tool_ onClick={p.actions.drawSettings}>Réglages du dessin</Tool_>
  </>;
  else if (p.path === "dessiner-plus") items = <>
    {DRAW_MORE.map(([id, name]) => <Tool_ key={id} label={name} pressed={p.tool === id} disabled={p.readOnly} onClick={() => p.onTool(id)}><ToolIcon tool={id} /></Tool_>)}
  </>;
  else if (p.path === "fils") items = <>
    <span className="pzs-chip"><span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />Fil actif · {p.colorLabel}</span>
    <Tool_ onClick={p.actions.palette}>Palette DMC</Tool_>
    <Tool_ onClick={p.actions.threadsSettings}>Fils et toile</Tool_>
  </>;
  else if (p.path === "broder") items = <>
    {thread}<span className="pzs-sep" aria-hidden="true" />
    {level(STITCH).map(([id, name]) => <Tool_ key={id} label={name} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => p.onTool(id)}><ToolIcon tool={id} /></Tool_>)}
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
    <Tool_ guide="dessiner" haspopup count={DRAW.length + 4} pressed={p.workspace === "create"} onClick={() => { p.onWorkspace("create"); p.onPath("dessiner"); }}>Dessiner</Tool_>
    <Tool_ guide="broder" haspopup count={STITCH.length + 1} pressed={p.workspace === "stitch"} onClick={() => { p.onWorkspace("stitch"); p.onPath("broder"); }}>Broder</Tool_>
    <Tool_ guide="fils" haspopup count={2} onClick={() => p.onPath("fils")}>Fils</Tool_>
    <Tool_ guide="partager" haspopup count={6} onClick={() => p.onPath("partager")}>Partager</Tool_>
  </>;

  const ql = sansAccents(q.trim());
  const resultats: Resultat[] = [
    ...[...DRAW, ...DRAW_MORE, ...STITCH].filter((x, i, l) => l.findIndex(y => y[0] === x[0]) === i).map(([id, name]): Resultat => ({ id: "o-" + id, genre: "outils", label: name, meta: "Outil" + (STITCH.some(x => x[0] === id) && !DRAW.some(x => x[0] === id) ? " · Broder" : " · Dessiner"), faire: () => { const broder = STITCH.some(x => x[0] === id) && !DRAW.some(x => x[0] === id) && !DRAW_MORE.some(x => x[0] === id);
      p.onWorkspace(broder ? "stitch" : "create"); p.onPath(broder ? "broder" : DRAW_MORE.some(x => x[0] === id) ? "dessiner-plus" : "dessiner"); p.onTool(id); } })),
    ...(p.progression?.couleurs ?? []).map((c): Resultat => ({ id: "f-" + c.idx, genre: "fils", label: "DMC " + c.code, meta: (FLOSS[c.idx]?.name ?? "") + " · dans le motif" + (c.cells ? " · " + Math.round(c.done / c.cells * 100) + " % brodé" : ""), hex: c.hex, faire: () => p.onCouleur?.(c.idx) })),
    ...(ql ? FLOSS.map((f, idx): Resultat => ({ id: "d-" + idx, genre: "fils", label: "DMC " + f.code, meta: f.name + " · nuancier", hex: f.hex, faire: () => p.onCouleur?.(idx) })).filter(r => !(p.progression?.couleurs ?? []).some(c => "f-" + c.idx === r.id.replace("d-", "f-"))) : []),
    ...([["motifs", "Motifs", p.actions.motifs], ["calques", "Calques", p.actions.layers], ["reglages-dessin", "Réglages du dessin", p.actions.drawSettings], ["palette", "Palette DMC", p.actions.palette], ["fils-toile", "Fils et toile", p.actions.threadsSettings], ["suivi", "Suivi de broderie", p.actions.follow], ["inviter", "Inviter à regarder", p.actions.share], ["exporter", "Exporter", p.actions.exportPanel], ["enregistrer", "Enregistrer", p.actions.save], ["tout-voir", "Tout voir", p.zoom.fit], ["symboles", "Symboles", p.onSymbols], ["reglages", "Réglages et aide", p.actions.settings], ...(p.actions.visite ? [["visite", "Revoir la visite des docks", p.actions.visite]] : [])] as [string, string, () => void][])
      .map(([id, label, f]): Resultat => ({ id: "x-" + id, genre: "fonctions", label, meta: "Fonction de la grille", faire: f })),
  ];
  const trouves = resultats.filter(r => (genre === "tout" || r.genre === genre) && (!ql || correspond(r.label + " " + r.meta, ql))).slice(0, ql ? 40 : 24);
  const total = p.progression?.total ?? 0, prog = total ? (p.progression!.done / total) : 0;
  const teinte = MODES.find(m => m[0] === modeBas)?.[2] ?? "#FFFFFF";
  const toolName = [...DRAW, ...DRAW_MORE, ...STITCH].find(([id]) => id === p.tool)?.[1];
  const crumbs = ["Point Zéro", p.patternName];
  if (p.path) { const parent = PARENT[p.path]; if (parent) crumbs.push(LABELS[parent]); crumbs.push(LABELS[p.path]); }
  if ((p.path === "dessiner" || p.path === "dessiner-plus" || p.path === "broder") && toolName) crumbs.push(toolName);

  return <>
    <header className="pzs-head" aria-label="En-tête du studio">
      {bloc && <div className="pzs-voile" aria-hidden="true" onClick={fermer} />}
      <nav className={"pzs-top" + (bloc ? " pzs-ouvert" : "")} aria-label="Dock des outils du studio de broderie" onKeyDown={onKey}>
        <div className="pzs-ligne">
          {aime && <button type="button" className="pzs-tool pzs-icon" aria-label="Revenir sur Le Monde AIME" title="Retour" onClick={retourSite}><ArrowLeft size={18} aria-hidden="true" /></button>}
          <button id="pzs-brand" data-guide="orbe" type="button" className="pzs-orbe" aria-label="Menu AIME et Point Zéro" aria-expanded={bloc === "menu"} aria-controls="pzs-bloc" onClick={() => ouvrir("menu")}>
            <span className="pzs-orb" aria-hidden="true" />
          </button>
          <span className="pzs-sep" aria-hidden="true" />
          {aime ? <a className="pzs-tool pzs-marque" href="/" aria-label="AIME, Le Monde AIME">AIME<sup aria-hidden="true">®</sup></a> : <span className="pzs-tool pzs-marque">Point Zéro</span>}
          <span className="pzs-sep" aria-hidden="true" />
          <div className="pzs-row" data-guide="outils">
            {p.path && <>
              <button ref={upRef} type="button" className="pzs-tool pzs-up" aria-label="Remonter d’un niveau" onClick={up}><ArrowLeft size={18} aria-hidden="true" /></button>
              <span className="pzs-parent">{LABELS[p.path]}</span>
              <span className="pzs-sep" aria-hidden="true" />
            </>}
            {items}
          </div>
          <span className="pzs-sep" aria-hidden="true" />
          <button type="button" className="pzs-tool pzs-icon" data-guide="historique" aria-label="Annuler" title="Annuler" disabled={!p.canUndo} onClick={p.onUndo}><Undo2 size={17} aria-hidden="true" /></button>
          <button type="button" className="pzs-tool pzs-icon pzs-redo" data-guide="historique" aria-label="Rétablir" title="Rétablir" disabled={!p.canRedo} onClick={p.onRedo}><Redo2 size={17} aria-hidden="true" /></button>
          <span className="pzs-sep" aria-hidden="true" />
          <button type="button" data-guide="chercher" className="pzs-tool pzs-icon pzs-loupe" aria-label={bloc === "chercher" ? "Fermer la recherche" : "Chercher un fil, un outil ou une fonction de la grille"} title="Chercher dans la grille" aria-expanded={bloc === "chercher"} aria-controls="pzs-bloc" onClick={() => ouvrir("chercher")}>
            {bloc === "chercher" ? <X size={17} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
          </button>
          <button type="button" data-guide="profil" className="pzs-tool pzs-icon pzs-profil" aria-label={"Mes ouvrages, et inviter quelqu’un à rejoindre la grille" + (moi?.name ? ", " + moi.name : "")} title="Mes ouvrages et inviter" aria-expanded={bloc === "inviter"} aria-controls="pzs-bloc" onClick={() => ouvrir("inviter")}>
            {moi?.image ? <img className="pzs-avatar" src={moi.image} alt="" /> : <span className="pzs-avatar" aria-hidden="true">{moi ? initiales(moi.name || moi.email || "") : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="9" r="3.6" /><path d="M5 19.5c1.4-3.2 4-4.7 7-4.7s5.6 1.5 7 4.7" /></svg>}</span>}
            <span className="pzs-plus" aria-hidden="true">+</span>
          </button>
        </div>
        {bloc && <div id="pzs-bloc" className="pzs-bloc" ref={blocRef}>
          {bloc === "menu" && <>
            <div id="pzs-menu" className="pzs-bloc-corps">
              <ul className="pzs-bloc-menu">
                {aime && <li><a href="/">Le Monde AIME</a></li>}
                <li><button type="button" onClick={() => { setBloc(null); p.actions.buro(); }}>BurO</button></li>
                <li><button type="button" onClick={() => { setBloc(null); p.actions.home(); }}>Accueil Point Zéro</button></li>
                <li><button type="button" onClick={() => { setBloc(null); p.actions.shop(); }}>Boutique de patrons</button></li>
                <li><button type="button" onClick={() => { setBloc(null); p.actions.settings(); }}>Réglages et aide</button></li>
                {p.actions.visite && <li><button type="button" onClick={() => { setBloc(null); p.actions.visite!(); }}>Revoir la visite des docks</button></li>}
              </ul>
            </div>
            <div className="pzs-mini pzs-levels" role="group" aria-label="Affichage du studio">
              <span>Affichage</span>
              {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id =>
                <button key={id} type="button" aria-pressed={p.level === id} onClick={() => p.onLevel(id)}>{LEVEL_LABELS[id]}</button>)}
            </div>
          </>}
          {bloc === "chercher" && <>
            <div className="pzs-bloc-corps">
              <label htmlFor="pzs-cherche" className="sr-only">Chercher un fil, un outil ou une fonction</label>
              <input id="pzs-cherche" className="pzs-champ" type="search" autoComplete="off" placeholder="Chercher : 310, rouge, croix, calques, exporter…" value={q} onChange={e => setQ(e.target.value)} />
              <p className="pzs-note" role="status">{q.trim() ? trouves.length + " résultat" + (trouves.length > 1 ? "s" : "") : "Les fils du motif, les outils et les fonctions de la grille"}</p>
              <ul className="pzs-resultats">
                {trouves.map(r => <li key={r.id}><button type="button" onClick={() => { r.faire(); setBloc(null); }}>
                  {r.hex ? <span className="pzs-swatch" style={{ background: r.hex }} aria-hidden="true" /> : null}<b>{r.label}</b><span>{r.meta}</span>
                </button></li>)}
              </ul>
            </div>
            <div className="pzs-mini" role="group" aria-label="Chercher dans">
              {GENRES.map(([g, l]) => <button key={g} type="button" aria-pressed={genre === g} onClick={() => setGenre(g)}>{l}</button>)}
            </div>
          </>}
          {bloc === "inviter" && <>
            <div className="pzs-bloc-corps">
              <p className="pzs-titre">Mes ouvrages{moi?.name ? " · " + moi.name.split(" ")[0] : ""}</p>
              {p.ouvrages && <OuvragesBloc courant={p.ouvrages.courant} ouvrir={id => { setBloc(null); p.ouvrages!.ouvrir(id); }} importer={f => { setBloc(null); p.ouvrages!.importer(f); }} />}
              <p className="pzs-note">Inviter : quelqu’un regarde l’ouvrage en direct, depuis son appareil, pendant que vous brodez.{!moi && aime ? " Entrez dans AIME pour retrouver vos ouvrages sur tous vos appareils." : ""}</p>
            </div>
            <div className="pzs-mini" role="group" aria-label="Inviter et votre espace">
              <button type="button" onClick={() => { setBloc(null); p.actions.share(); }}>+ Inviter à rejoindre la grille</button>
              {aime && <a href={moi ? "/buro" : "/entrer"}>{moi ? "Votre espace AIME" : "Entrer"}</a>}
            </div>
          </>}
        </div>}
      </nav>
      <span className="sr-only" role="status">{p.patternName} · {p.saving}</span>
      {!bloc && <p className="pzs-crumbs">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> › </span>}{i === crumbs.length - 1 ? <strong>{c}</strong> : c}</span>)}</p>}
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
      <span className="pzs-place" data-guide="ouvrage" title={p.patternName}><VisibilityOrb value={p.visibility} size={18} dark /><span className="sr-only">{VISIBILITY[p.visibility].label} · </span>{p.patternName}</span>
      <span className="pzs-sep" aria-hidden="true" />
      <div className="pzs-seg" data-guide="lectures" role="group" aria-label="Affichage de la grille">
        {VIEWS.map(([id, name]) => <button key={id} type="button" aria-pressed={p.view === id} onClick={() => p.onView(id)}>{name}</button>)}
      </div>
      <button type="button" data-guide="symboles" className="pzs-btm" aria-pressed={p.symbols} onClick={p.onSymbols}>Symboles</button>
      <span className="pzs-sep" aria-hidden="true" />
      <button type="button" data-guide="zoom" className="pzs-btm pzs-sq" aria-label="Loupe : doubler le zoom de la zone visible" title="Loupe" onClick={p.zoom.magnify}><Search size={17} aria-hidden="true" /></button>
      <button type="button" data-guide="zoom" className="pzs-btm pzs-sq" aria-label="Dézoomer" onClick={p.zoom.zoomOut}>−</button>
      <button type="button" data-guide="zoom" className="pzs-btm pzs-sq" aria-label="Zoomer" onClick={p.zoom.zoomIn}>+</button>
      <button type="button" data-guide="tout-voir" className="pzs-btm pzs-light" onClick={p.zoom.fit}>Tout voir</button>
        </>}
    </nav>
  </>;
}

/* Le cercle du dock du bas : l'anneau suit la progression du patron ; un clic change le dock (Repères, Fils, Progression). */
function Cercle({ refBouton, ouvert, onClick, part, teinte, label }: { refBouton: React.RefObject<HTMLButtonElement | null>; ouvert: boolean; onClick: () => void; part: number; teinte: string; label: string }) {
  const c = 2 * Math.PI * 11;
  const pt = (a: number) => { const t = a * Math.PI / 180; return (22 + 18 * Math.cos(t)).toFixed(2) + " " + (22 + 18 * Math.sin(t)).toFixed(2); };
  const arcs = Array.from({ length: 12 }, (_, k) => { const a0 = -90 + k * 30 + 5, a1 = a0 + 20; return "M " + pt(a0) + " A 18 18 0 0 1 " + pt(a1); });
  return <button ref={refBouton} type="button" data-guide="cercle" className="pzs-cercle" aria-expanded={ouvert} aria-label={label} title={ouvert ? "Revenir au dock" : "Changer le dock"} onClick={onClick}>
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

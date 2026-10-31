import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import OuvragesBloc from "./OuvragesBloc";
import { ToolIcon } from "./ToolIcons";
import { ArrowLeft, CircleHelp, Compass, Folder, Grid3x3, LayoutGrid, Maximize, Menu, Palette, Pencil, Redo2, Search, Shapes, Share2, Sparkles, Spool, Square, Undo2, X } from "lucide-react";
import { GrilleOutils, GROUPES_BRODER, GROUPES_DESSIN, Loupe, Nuancier } from "./DockGrilles";
import type { Pattern } from "../lib/pattern";
import type { ProjectRecord } from "../lib/library";
import { FLOSS } from "../lib/dmc";
import { dansAime } from "../lib/aimeSync";
import PreferencesCompte from "./PreferencesCompte";
import type { Tool } from "../lib/stitch";
import type { ViewMode } from "./Canvas";
import { LEVEL_LABELS, type InterfaceLevel } from "../lib/interfaceLevel";
import { VISIBILITY, VISIBILITY_ORDER, type Visibility } from "../lib/visibility";
import VisibilityOrb from "./VisibilityOrb";
import Point, { ouvrirConfort } from "./point/Point";
import PointDuBloc from "./point/PointDuBloc";
import "./blocs/broderie";
import type { ContexteBroderie } from "./blocs/broderie";
import { commandesDuBloc, ecrireEssaiBloc, lireEssaiBloc } from "../lib/point/registre";
import { GALERIE } from "../lib/site";
import TambourAtelier, { ecrireCadreTambour, lireCadreTambour } from "./TambourAtelier";
import { aVoir, Indicateurs, trier, type Indicateur } from "../lib/point/indicateurs";
import { suggestion } from "./blocs/guideBroderie";
import { replaceColor } from "../lib/editing";
import { dernierCoche } from "../lib/tambour/suivi";
import type { ModePoint } from "../lib/point/modes";

/**
 * Les deux docks du studio (charte UniO du Monde AIME).
 * En haut, blanc : des verbes. Dessiner, Broder, Fils, Partager. Chaque verbe garde une ligne courte
 * (le fil actif, les outils les plus utilisés) et déplie sous lui une grille : tous les points et outils,
 * ou le nuancier DMC. Choisir replie le dock. Les ouvrages se rangent sous le rond du profil.
 * En bas, sombre : se repérer. Le cercle, l'ouvrage, les lectures, la loupe qui agrandit sous le pointeur, le zoom.
 */
export type DockPath = null | "dessiner" | "fils" | "broder" | "partager" | "visibilite";
/** les blocs qu'on peut demander d'ailleurs : Mes ouvrages, le nuancier, la grille des outils */
export type BlocDemande = "inviter" | "nuancier" | "outils" | "aucun";
type Bloc = null | "menu" | "chercher" | "inviter" | "outils" | "nuancier";

export interface DockActions {
  home: () => void; settings: () => void; share: () => void;
  motifs: () => void; exportPanel: () => void; save: () => void; palette: () => void;
  threadsSettings: () => void; follow: () => void; layers: () => void; drawSettings: () => void;
  /** une nouvelle grille vierge (l'ouvrage en cours reste rangé dans Mes ouvrages) */
  nouveau: () => void;
  /** relancer la visite de l'orbe */
  visite?: () => void;
  /** exposer une copie de l'ouvrage dans la Galerie des Vivants (feuille « Exposer ») */
  exposer?: () => void;
}

interface Props {
  /** un autre contexte (le compositeur) a la main sur le Point : le dock ne le rend pas, un seul Point à l'écran */
  sansPoint?: boolean;
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
  /** remplacer le motif (avec historique : annulable) — pour les actions du disque (remplacement de fil) */
  onPattern?: (p: Pattern) => void;
  /** le patron : pour le nuancier (fils du motif) et la loupe */
  pattern?: Pattern;
  /** l'index DMC du fil actif */
  couleur?: number;
  /** un bloc demandé d'ailleurs ; n change à chaque demande */
  blocDemande?: { bloc: BlocDemande; n: number } | null;
  /** les lignes de la grille, visibles ou masquées (Affichage, dans le Point du bloc) */
  grille?: "visible" | "masquee"; onGrille?: () => void;
  /** ouvrir le sélecteur de fichier de l'import (image, PDF, projet) */
  onImporter?: (genre?: "image" | "pdf" | "projet") => void;
  /** ouvrir le compositeur de rosaces */
  onComposer?: () => void;
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
const VIEWS: [ViewMode, string][] = [["flat", "À plat"], ["pattern", "Patron"], ["real", "Réaliste"]];
const ICONES_VUE: Record<string, ReactNode> = { flat: <Square aria-hidden="true" />, pattern: <Grid3x3 aria-hidden="true" />, real: <Sparkles aria-hidden="true" /> };
const LABELS: Record<Exclude<DockPath, null>, string> = { dessiner: "Dessiner", fils: "Fils", broder: "Broder", partager: "Partager", visibilite: "Visibilité" };
const PARENT: Partial<Record<Exclude<DockPath, null>, DockPath>> = { visibilite: "partager" };
/* la ligne courte de Broder : les gestes les plus fréquents ; tout le reste est dans la grille */
const STITCH_VITE: [Tool, string][] = [["hand", "Main"], ["mark", "Marquer"], ["block", "Bloc 10 × 10"], ["row", "Ligne"]];

function Tool_({ children, pressed, onClick, disabled, haspopup, count, soon, label, guide, verbe }: { children: ReactNode; pressed?: boolean; onClick?: () => void; disabled?: boolean; haspopup?: boolean; count?: number; soon?: boolean; label?: string; guide?: string; verbe?: boolean }) {
  return <button type="button" data-guide={guide} className={"pzs-tool" + (label ? " pzs-icon pzs-picto" : "") + (verbe ? " pzs-verbe" : "")} aria-label={label} title={label} aria-pressed={pressed === undefined ? undefined : pressed} aria-haspopup={haspopup ? "true" : undefined}
    disabled={disabled} onClick={onClick} data-on={pressed ? "1" : undefined}>
    {children}{count !== undefined && <span className="pzs-count" aria-hidden="true">{count}</span>}
    {soon && <span className="pzs-soon">Bientôt</span>}
  </button>;
}

/**
 * Un rang qui défile, dit clairement : quand il déborde, un fondu et une flèche montrent qu'il y a d'autres boutons,
 * de quel côté ; le bouton qui reçoit le focus est ramené entièrement à l'écran. Jamais de bouton coupé sans indice.
 */
function useDefile() {
  const ref = useRef<HTMLElement | null>(null);
  const maj = () => { const e = ref.current; if (!e) return; const g = e.scrollLeft > 2, d = e.scrollLeft + e.clientWidth < e.scrollWidth - 2;
    e.dataset.plus = g && d ? "deux" : g ? "gauche" : d ? "droite" : ""; };
  useLayoutEffect(maj);
  useEffect(() => { const e = ref.current; if (!e) return;
    const focus = (ev: FocusEvent) => { const t = ev.target as HTMLElement; try { t.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch { /* jsdom */ } };
    e.addEventListener("scroll", maj, { passive: true }); e.addEventListener("focusin", focus); window.addEventListener("resize", maj);
    return () => { e.removeEventListener("scroll", maj); e.removeEventListener("focusin", focus); window.removeEventListener("resize", maj); }; }, []);
  return ref;
}

/**
 * Essai du Cadre-Tambour : le dock du bas accroché sous le format, comme l'étiquette du Cadre l'est au-dessus.
 * Il suit le Cadre (déplacé, agrandi, zoomé) ; si le format sort de l'écran, il reste en bas de l'écran. La logique du Cadre ne change pas :
 * on lit seulement la place qu'il publie (--fx0, --fy0, --fw, --fh).
 */
function useAccroche(ref: { current: HTMLElement | null }, actif: boolean) {
  useLayoutEffect(() => {
    const nav = ref.current; if (!nav) return;
    const nettoyer = () => { for (const k of ["left", "top", "bottom", "transform"]) nav.style.removeProperty(k); document.documentElement.style.removeProperty("--pz-dock-haut"); document.documentElement.classList.remove("pz-dock-accroche"); };
    if (!actif) { nettoyer(); return; }
    let raf = 0, obs: MutationObserver | null = null, cadre: Element | null = null;
    const placer = () => {
      cadre = cadre && document.contains(cadre) ? cadre : document.querySelector(".cadre");
      if (!cadre) return;
      const cs = getComputedStyle(cadre), v = (k: string) => parseFloat(cs.getPropertyValue(k));
      const fx = v("--fx0"), fy = v("--fy0"), fw = v("--fw"), fh = v("--fh");
      if (!Number.isFinite(fx) || !fw) return;
      const w = nav.offsetWidth, h = nav.offsetHeight, bas = window.innerHeight - h - Math.max(12, parseFloat(getComputedStyle(nav).getPropertyValue("--pz-sur")) || 12);
      const top = Math.max(fy + 24, Math.min(fy + fh + 12, bas)), left = Math.max(12, Math.min(fx + fw / 2 - w / 2, window.innerWidth - w - 12));
      nav.style.left = left + "px"; nav.style.top = top + "px"; nav.style.bottom = "auto"; nav.style.transform = "none";
      /* les notifications se posent au-dessus du dock accroché, jamais dessus */
      document.documentElement.style.setProperty("--pz-dock-haut", top + "px"); document.documentElement.classList.add("pz-dock-accroche");
    };
    const programmer = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(placer); };
    const brancher = () => { const c = document.querySelector(".cadre"); if (c && c !== cadre) { cadre = c; obs?.disconnect(); obs = new MutationObserver(programmer); obs.observe(c, { attributes: true, attributeFilter: ["style"] }); } };
    brancher(); placer();
    const minuteur = window.setInterval(() => { brancher(); programmer(); }, 800);
    const ro = new ResizeObserver(programmer); ro.observe(nav);
    window.addEventListener("resize", programmer);
    return () => { obs?.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); window.clearInterval(minuteur); window.removeEventListener("resize", programmer); nettoyer(); };
  }, [ref, actif]);
}

/* « Navigation intégrale .0 » : par défaut seulement dans la construction d'essai privée (--mode essai, VITE_POINTZERO_NAV0=1) ;
   la construction de production garde la navigation classique. Le choix de la personne (Réglages › Navigation classique) est retenu. */
const NAV0_CLE = "pointzero:essai:navigation-0";
export const NAV0_PAR_DEFAUT = import.meta.env.VITE_POINTZERO_NAV0 === "1";
export function lireNav0(): boolean { try { const v = localStorage.getItem(NAV0_CLE); return v === "1" || (v === null && NAV0_PAR_DEFAUT); } catch { return NAV0_PAR_DEFAUT; } }

export default function StudioDocks(p: Props) {
  const rangHaut = useDefile(), rangBas = useDefile();
  const navBas = useRef<HTMLElement | null>(null);
  const [bloc, setBloc] = useState<Bloc>(null);
  const [loupe, setLoupe] = useState(false);
  const [aideOuvrages, setAideOuvrages] = useState(false);
  /* essai : les outils sur le bloc (le Point posé sur le Cadre) au lieu du dock du bas ; réversible depuis le menu */
  const [essaiBloc, setEssaiBloc] = useState(lireEssaiBloc);
  /* essai : le Cadre-Tambour (le dock du bas accroché sous le format ; le tambour, cercle d'outils posé sur l'ouvrage) */
  const [cadreTambour, setCadreTambour] = useState(() => (lireCadreTambour() || lireNav0()) && !lireEssaiBloc());
  /* en .0, le disque est la navigation : il est ouvert dès l'arrivée */
  const [tambourOuvert, setTambourOuvert] = useState(() => lireNav0() && !lireEssaiBloc());
  /* essai « Navigation intégrale .0 » : le dock du haut s'efface, le disque devient la navigation (retour possible par Réglages) */
  const [nav0, setNav0] = useState(lireNav0);
  const changerNav0 = (v: boolean) => { setNav0(v); try { localStorage.setItem(NAV0_CLE, v ? "1" : "0"); } catch { /* rien */ }
    if (v) { ecrireCadreTambour(true); setCadreTambour(true); ecrireEssaiBloc(false); setEssaiBloc(false); } setBloc(null); };
  useLayoutEffect(() => { document.documentElement.classList.toggle("pz-nav0", nav0 && cadreTambour); return () => document.documentElement.classList.remove("pz-nav0"); }, [nav0, cadreTambour]);
  const tambourBouton = useRef<HTMLButtonElement>(null);
  /* .0 : le Bureau est un contexte du disque (les ouvrages au centre, la navigation dans la couronne) ; son état est retenu entre deux visites */
  const [vueDisque, setVueDisque] = useState<"atelier" | "bureau">("atelier");
  const [bureauPlein, setBureauPlein] = useState(false);
  const [bureauDossier, setBureauDossier] = useState<string | null>(null);
  const [bureauListe, setBureauListe] = useState<ProjectRecord[]>([]);
  const bureauDefile = useRef(0);
  /* les points lumineux : un seul tableau d'indicateurs pour l'atelier (le disque, le bouton du dock) ; des événements réels seulement */
  const indicateurs = useMemo(() => new Indicateurs(), []);
  const [listeIndic, setListeIndic] = useState<Indicateur[]>([]);
  useEffect(() => indicateurs.abonner(setListeIndic), [indicateurs]);
  const [filChoisi, setFilChoisi] = useState(false);
  const [suggestions, setSuggestions] = useState(() => { try { return localStorage.getItem("pointzero:disque:suggestions") !== "0"; } catch { return true; } });
  useAccroche(navBas, cadreTambour && !essaiBloc);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState<Genre>("tout");
  const [moi, setMoi] = useState<{ name?: string; email?: string; image?: string } | null>(null);
  const blocRef = useRef<HTMLDivElement>(null);
  const aime = dansAime();
  useEffect(() => { if (!aime) return; let vivant = true;
    fetch("/api/auth/get-session", { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).then(j => { if (vivant && j && j.user) setMoi({ name: j.user.name, email: j.user.email, image: j.user.image }); }).catch(() => {});
    return () => { vivant = false; }; }, [aime]);
  const ouvrir = (b: Exclude<Bloc, null>) => setBloc(x => x === b ? null : b);
  useEffect(() => { if (p.blocDemande) setBloc(p.blocDemande.bloc === "aucun" ? null : p.blocDemande.bloc); }, [p.blocDemande]);
  const fermer = () => setBloc(null);
  const retourSite = () => { try { if (document.referrer && new URL(document.referrer).origin === window.location.origin && !new URL(document.referrer).pathname.startsWith("/studio")) { window.history.back(); return; } } catch { /* adresse illisible */ } window.location.href = "/"; };
  useEffect(() => { if (bloc === "chercher") document.getElementById("pzs-cherche")?.focus(); else if (bloc === "nuancier") document.getElementById("dg-cherche-fil")?.focus(); else if (bloc) blocRef.current?.querySelector<HTMLElement>("[aria-pressed=\"true\"], a, button")?.focus(); }, [bloc]);
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

  const up = () => { if (bloc === "outils" || bloc === "nuancier") setBloc(null); p.onPath(p.path ? PARENT[p.path] ?? null : null); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (bloc) { e.preventDefault(); const b = bloc; setBloc(null); (b === "menu" ? document.getElementById("pzs-brand") : document.querySelector<HTMLElement>(b === "chercher" ? ".pzs-loupe" : b === "inviter" ? ".pzs-profil" : "[data-guide=\"grille\"]"))?.focus(); return; }
    if (p.path) { e.preventDefault(); up(); }
  };
  const level = (list: [Tool, string][]) => p.level === "beginner" ? list.filter(([id]) => BEGINNER.has(id) || id === p.tool) : list;
  const thread = <button type="button" className="pzs-tool pzs-threadtool" onClick={() => p.onPath("fils")} aria-label={`Fil actif ${p.colorLabel}, changer de fil`}>
    <span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />{p.colorLabel}
  </button>;

  const grille = (label: string, n: number) => <button type="button" data-guide="grille" className={"pzs-tool pzs-grille" + (bloc === "outils" ? " pzs-grille-on" : "")} aria-expanded={bloc === "outils"} aria-controls="pzs-bloc" onClick={() => ouvrir("outils")}>
    <LayoutGrid size={17} aria-hidden="true" />{label}<span className="pzs-count" aria-hidden="true">{n}</span>
  </button>;
  const choisir = (id: Tool) => { p.onTool(id); setBloc(null); };

  let items: ReactNode;
  if (p.path === "dessiner") items = <>
    {thread}<span className="pzs-sep" aria-hidden="true" />
    {level(DRAW).map(([id, name]) => <Tool_ key={id} label={name} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => p.onTool(id)}><ToolIcon tool={id} /></Tool_>)}
    {grille("Tous les points", DRAW.length + DRAW_MORE.length)}
  </>;
  else if (p.path === "fils") items = <>
    <span className="pzs-chip"><span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />Fil actif · {p.colorLabel}</span>
    <button type="button" data-guide="grille" className={"pzs-tool pzs-grille" + (bloc === "nuancier" ? " pzs-grille-on" : "")} aria-expanded={bloc === "nuancier"} aria-controls="pzs-bloc" onClick={() => ouvrir("nuancier")}><LayoutGrid size={17} aria-hidden="true" />Nuancier DMC</button>
    <Tool_ onClick={p.actions.threadsSettings}>Fils et toile</Tool_>
  </>;
  else if (p.path === "broder") items = <>
    {thread}<span className="pzs-sep" aria-hidden="true" />
    {level(STITCH_VITE).map(([id, name]) => <Tool_ key={id} label={name} pressed={p.tool === id} disabled={p.readOnly && id !== "hand"} onClick={() => p.onTool(id)}><ToolIcon tool={id} /></Tool_>)}
    {grille("Tous les gestes", STITCH.length + 1)}
  </>;
  else if (p.path === "partager") items = <>
    <Tool_ onClick={p.actions.share}>Inviter à regarder</Tool_>
    {p.actions.exposer && <Tool_ onClick={p.actions.exposer}>Exposer</Tool_>}
    <Tool_ haspopup count={4} onClick={() => p.onPath("visibilite")}><VisibilityOrb value={p.visibility} size={20} />Visibilité · {VISIBILITY[p.visibility].label}</Tool_>
    <Tool_ onClick={p.actions.exportPanel}>Exporter</Tool_>
    <Tool_ onClick={p.actions.save}>Enregistrer</Tool_>
    <Tool_ disabled soon>Lancer un SAL</Tool_>
  </>;
  else if (p.path === "visibilite") items = <>
    {VISIBILITY_ORDER.map(v => <Tool_ key={v} pressed={p.visibility === v} onClick={() => p.onVisibility(v)}><VisibilityOrb value={v} size={20} />{VISIBILITY[v].label}</Tool_>)}
  </>;
  else items = <>
    {/* les verbes : un pictogramme et un mot ; sur téléphone, le mot passe sous le pictogramme, les quatre tiennent sans défiler */}
    <Tool_ guide="dessiner" verbe haspopup count={DRAW.length + DRAW_MORE.length} pressed={p.workspace === "create"} onClick={() => { p.onWorkspace("create"); p.onPath("dessiner"); setBloc("outils"); }}><Pencil aria-hidden="true" /><span className="pzs-lib">Dessiner</span></Tool_>
    <Tool_ guide="broder" verbe haspopup count={STITCH.length + 1} pressed={p.workspace === "stitch"} onClick={() => { p.onWorkspace("stitch"); p.onPath("broder"); setBloc("outils"); }}><Spool aria-hidden="true" /><span className="pzs-lib">Broder</span></Tool_>
    <Tool_ guide="fils" verbe haspopup count={2} onClick={() => { p.onPath("fils"); setBloc("nuancier"); }}><Palette aria-hidden="true" /><span className="pzs-lib">Fils</span></Tool_>
    <Tool_ guide="partager" verbe haspopup count={p.actions.exposer ? 6 : 5} onClick={() => p.onPath("partager")}><Share2 aria-hidden="true" /><span className="pzs-lib">Partager</span></Tool_>
  </>;

  const ql = sansAccents(q.trim());
  const resultats: Resultat[] = [
    ...[...DRAW, ...DRAW_MORE, ...STITCH].filter((x, i, l) => l.findIndex(y => y[0] === x[0]) === i).map(([id, name]): Resultat => ({ id: "o-" + id, genre: "outils", label: name, meta: "Outil" + (STITCH.some(x => x[0] === id) && !DRAW.some(x => x[0] === id) ? " · Broder" : " · Dessiner"), faire: () => { const broder = STITCH.some(x => x[0] === id) && !DRAW.some(x => x[0] === id) && !DRAW_MORE.some(x => x[0] === id);
      p.onWorkspace(broder ? "stitch" : "create"); p.onPath(broder ? "broder" : "dessiner"); p.onTool(id); } })),
    ...(p.progression?.couleurs ?? []).map((c): Resultat => ({ id: "f-" + c.idx, genre: "fils", label: "DMC " + c.code, meta: (FLOSS[c.idx]?.name ?? "") + " · dans le motif" + (c.cells ? " · " + Math.round(c.done / c.cells * 100) + " % brodé" : ""), hex: c.hex, faire: () => p.onCouleur?.(c.idx) })),
    ...(ql ? FLOSS.map((f, idx): Resultat => ({ id: "d-" + idx, genre: "fils", label: "DMC " + f.code, meta: f.name + " · nuancier", hex: f.hex, faire: () => p.onCouleur?.(idx) })).filter(r => !(p.progression?.couleurs ?? []).some(c => "f-" + c.idx === r.id.replace("d-", "f-"))) : []),
    ...([["motifs", "Motifs", p.actions.motifs], ["calques", "Calques", p.actions.layers], ["reglages-dessin", "Réglages du dessin", p.actions.drawSettings], ["palette", "Palette DMC", p.actions.palette], ["fils-toile", "Fils et toile", p.actions.threadsSettings], ["suivi", "Suivi de broderie", p.actions.follow], ["nouveau", "Nouvelle grille", p.actions.nouveau], ["inviter", "Inviter à regarder", p.actions.share], ["exporter", "Exporter", p.actions.exportPanel], ["enregistrer", "Enregistrer", p.actions.save], ["tout-voir", "Tout voir", p.zoom.fit], ["symboles", "Symboles", p.onSymbols], ["reglages", "Réglages et aide", p.actions.settings], ...(p.actions.visite ? [["visite", "Revoir la visite avec Le Point", p.actions.visite]] : [])] as [string, string, () => void][])
      .map(([id, label, f]): Resultat => ({ id: "x-" + id, genre: "fonctions", label, meta: "Fonction de la grille", faire: f })),
  ];
  const trouves = resultats.filter(r => (genre === "tout" || r.genre === genre) && (!ql || correspond(r.label + " " + r.meta, ql))).slice(0, ql ? 40 : 24);
  const total = p.progression?.total ?? 0, prog = total ? (p.progression!.done / total) : 0;
  const teinte = MODES.find(m => m[0] === modeBas)?.[2] ?? "#FFFFFF";
  const toolName = [...DRAW, ...DRAW_MORE, ...STITCH].find(([id]) => id === p.tool)?.[1];
  const crumbs = ["Point Zéro", p.patternName];
  if (p.path) { const parent = PARENT[p.path]; if (parent) crumbs.push(LABELS[parent]); crumbs.push(LABELS[p.path]); }
  if ((p.path === "dessiner" || p.path === "broder") && toolName) crumbs.push(toolName);

  /* — Scénario A : le Guide lumineux, des règles explicites sur l'état réel (il ne fait rien à la place de la personne) — */
  const couleurs = p.progression?.couleurs ?? [];
  const active = couleurs.find(c => c.idx === p.couleur);
  /* — le suivi dans le cercle : le prochain point de la couleur active, près du dernier point coché (calculé seulement quand le tambour est ouvert) — */
  const dernierPoint = useRef<number | null>(null), motifPrecedent = useRef<Pattern | null>(null);
  const depuis = useMemo(() => {
    if (!cadreTambour || !tambourOuvert || !p.pattern || p.couleur == null) { motifPrecedent.current = p.pattern ?? null; return null; }
    if (motifPrecedent.current && (motifPrecedent.current.w !== p.pattern.w || motifPrecedent.current.h !== p.pattern.h)) dernierPoint.current = null;
    const d = dernierCoche(motifPrecedent.current, p.pattern, p.couleur); if (d != null) dernierPoint.current = d;
    motifPrecedent.current = p.pattern;
    return dernierPoint.current;
  }, [cadreTambour, tambourOuvert, p.pattern, p.couleur]);
  const conseil = suggestion({ points: total, brodes: p.progression?.done ?? 0, filChoisi, outilEnMain: p.path === "dessiner" || p.path === "broder", couleurTerminee: !!active && active.cells > 0 && active.done >= active.cells });
  useEffect(() => {
    if (!suggestions || !conseil) { indicateurs.retirer("guide"); return; }
    indicateurs.publier({ id: "guide", commande: conseil.commande, contexte: "broderie", etat: "guide", libelle: conseil.libelle });
  }, [indicateurs, suggestions, conseil?.commande, conseil?.libelle]); // eslint-disable-line react-hooks/exhaustive-deps
  /* — une couleur entièrement brodée (le vrai suivi) : un « terminé » discret, une seule fois — */
  const avancees = useRef(new Map<number, number>());
  useEffect(() => {
    for (const c of couleurs) {
      const avant = avancees.current.get(c.idx);
      if (avant !== undefined && c.cells > 0 && avant < c.cells && c.done >= c.cells)
        indicateurs.publier({ id: "couleur-" + c.idx, commande: "broder", contexte: "broderie", etat: "reussite", libelle: `Tous les points de DMC ${c.code} sont terminés.`, duree: 8000 });
      avancees.current.set(c.idx, c.done);
    }
  }, [couleurs, indicateurs]);
  /* — Scénario B : remplacer un fil, avec une décision en attente (aperçu sur le vrai motif, son historique) — */
  const [attente, setAttente] = useState<{ de: number; vers: number; avant: Pattern; apres: Pattern } | null>(null);
  const remplacement = {
    attente: attente && { de: attente.de, vers: attente.vers },
    preparer: (de: number, vers: number) => {
      if (!p.pattern || !p.onPattern || attente) return;
      const avant = p.pattern, apres = replaceColor(avant, de, vers);
      p.onPattern(apres); setAttente({ de, vers, avant, apres });
      indicateurs.publier({ id: "remplacement", commande: "remplacer-confirmer", contexte: "broderie", etat: "action", libelle: `Aperçu : DMC ${FLOSS[de]?.code} remplacé par DMC ${FLOSS[vers]?.code}. Confirmez ou annulez.` });
    },
    confirmer: () => {
      if (!attente) return; setAttente(null); setFilChoisi(true); indicateurs.retirer("remplacement");
      indicateurs.publier({ id: "remplacement-fin", commande: "fils", contexte: "broderie", etat: "reussite", libelle: `Remplacement confirmé : DMC ${FLOSS[attente.vers]?.code}.`, duree: 5000 });
    },
    annuler: () => {
      if (!attente) return;
      const meme = p.pattern === attente.apres || p.pattern?.cross === attente.apres.cross;
      /* l'annulation ne défait jamais autre chose que l'aperçu : si le motif a changé depuis, on le dit plutôt que de deviner */
      if (meme && p.canUndo) p.onUndo();
      else if (p.pattern && p.onPattern && !attente.avant.palette.includes(attente.vers)) p.onPattern(replaceColor(p.pattern, attente.vers, attente.de));
      else { indicateurs.publier({ id: "remplacement", commande: "remplacer-annuler", contexte: "broderie", etat: "erreur", libelle: "Le motif a changé depuis l’aperçu : utilisez Annuler (↶) dans le dock du haut." }); return; }
      setAttente(null); indicateurs.retirer("remplacement");
      indicateurs.publier({ id: "remplacement-fin", commande: "fils", contexte: "broderie", etat: "info", libelle: `Remplacement annulé : DMC ${FLOSS[attente.de]?.code} revient.`, duree: 4000 });
    },
  };
  /* — Scénario C : l'export du projet, son état réel (en cours, prêt, ou l'erreur), sans réussite fictive — */
  const exporterProjet = () => {
    indicateurs.publier({ id: "export", commande: "exp-projet", contexte: "broderie", etat: "encours", libelle: "Préparation du fichier du projet…", annonce: false });
    window.setTimeout(() => {
      try { p.actions.save(); indicateurs.publier({ id: "export", commande: "exp-projet", contexte: "broderie", etat: "reussite", libelle: "Le fichier du projet est prêt : son téléchargement a commencé.", duree: 6000, annonce: false }); }
      catch (e) { indicateurs.publier({ id: "export", commande: "exp-projet", contexte: "broderie", etat: "erreur", libelle: "L’export n’a pas abouti" + (e instanceof Error && e.message ? " : " + e.message : ".") }); }
    }, 60);
  };
  /* — la sauvegarde, telle qu'elle est vraiment (jamais « dans votre compte » si seule une copie locale existe) — */
  useEffect(() => {
    const s = p.saving || "", pub = (etat: Indicateur["etat"], libelle: string, duree?: number, priorite?: number) => indicateurs.publier({ id: "sauvegarde", commande: nav0 ? "bureau" : "imp-ouvrages", contexte: "broderie", etat, libelle, duree, priorite, annonce: etat === "erreur" });
    if (/en cours/i.test(s)) pub("encours", "Sauvegarde en cours…");
    else if (/indisponible/i.test(s)) pub("erreur", "Sauvegarde indisponible sur cet appareil : téléchargez le projet (Exporter).");
    else if (/injoignable/i.test(s)) pub("info", "Sauvegardé sur cet appareil seulement : votre espace AIME est injoignable pour l’instant.");
    else if (/espace AIME/i.test(s)) pub("reussite", "Rangé dans votre espace AIME.", 4000);
    /* la sauvegarde ordinaire, confirmée : une information discrète, qui ne recouvre jamais l'issue d'une décision de la personne */
    else if (/Sauvegardé sur cet appareil|Copie locale/i.test(s)) pub("info", s + ".", 3000, -1);
  }, [p.saving, indicateurs, nav0]);
  const basculerSuggestions = () => { const v = !suggestions; setSuggestions(v); try { localStorage.setItem("pointzero:disque:suggestions", v ? "1" : "0"); } catch { /* rien */ } };

  /* les outils de l'ouvrage, pour le Point posé sur le bloc (essai) comme pour l'anneau du tambour */
  const contexteBroderie: ContexteBroderie = {
      outil: p.tool,
      choisirOutil: (t, atelier) => { if (p.workspace !== atelier) p.onWorkspace(atelier); p.onPath(atelier === "stitch" ? "broder" : "dessiner"); p.onTool(t); },
      couleur: p.couleur ?? 0, filsDuMotif: (p.progression?.couleurs ?? []).map(c => c.idx),
      choisirFil: idx => { setFilChoisi(true); p.onCouleur?.(idx); },
      vue: p.view, choisirVue: p.onView,
      symboles: !!p.symbols, basculerSymboles: p.onSymbols,
      grille: p.grille ?? "visible", basculerGrille: () => p.onGrille?.(),
      loupe, basculerLoupe: () => setLoupe(v => !v), toutVoir: p.zoom.fit,
      importer: genre => p.onImporter?.(genre), ouvrages: () => setBloc("inviter"), composer: p.onComposer,
      exporter: p.actions.exportPanel, enregistrer: exporterProjet, partager: p.actions.share, remplacement,
      suggestions: { actives: suggestions, basculer: basculerSuggestions },
      avancee: (p.progression?.couleurs ?? []).map(c => ({ idx: c.idx, code: c.code, cells: c.cells, done: c.done })),
      prochain: cadreTambour && tambourOuvert && active && active.done < active.cells ? { code: active.code, reste: active.cells - active.done, montrer: () => window.dispatchEvent(new CustomEvent("pointzero:prochain-point")) } : undefined,
      filsEtToile: p.actions.threadsSettings, suivi: p.actions.follow,
      aide: p.actions.settings, chercher: () => setBloc("chercher"),
      guide: p.actions.visite,
      dockClassique: () => { ecrireEssaiBloc(false); setEssaiBloc(false); requestAnimationFrame(() => cercleRef.current?.focus()); },
  };
  /* la racine .0 : les mêmes commandes réelles (le registre « broderie »), rangées pour naviguer sans le dock du haut */
  const racine0 = (): ModePoint[] => {
    /* « Sur ma toile » (le Tambour vivant, superposer ce patron) : la même adresse que le tambour, pour qu'elle reste dans Broder en .0 */
    const surMaToile = () => { window.location.href = import.meta.env.BASE_URL + "tambour?mode=superposer" + (p.pattern?.id ? "&ouvrage=" + encodeURIComponent(p.pattern.id) : ""); };
    const b = commandesDuBloc<ContexteBroderie>("broderie", { ...contexteBroderie, dockClassique: undefined, surMaToile }), pris = (id: string) => b.find(m => m.id === id);
    const points = pris("points"), exporter = pris("exporter");
    return [
      { id: "bureau", nom: "Bureau", icone: <Folder aria-hidden="true" />, aide: "vos ouvrages au centre du disque : les retrouver, en ouvrir un, en créer un", groupe: "socle", ouvrir: () => setVueDisque("bureau") },
      { id: "creer", nom: "Créer", icone: <Pencil aria-hidden="true" />, aide: "les points et les outils de dessin, une rosace, annuler et rétablir", groupe: "metier", ouvrir: () => {},
        enfants: () => [
          ...(points?.enfants?.() ?? []),
          ...(p.onComposer ? [{ id: "creer-rosace", nom: "Composer une rosace", icone: <Sparkles aria-hidden="true" />, aide: "le compositeur de rosaces 5D", groupe: "creation", ouvrir: p.onComposer } satisfies ModePoint] : []),
          { id: "annuler", nom: "Annuler", icone: <Undo2 aria-hidden="true" />, aide: p.canUndo ? "défaire la dernière modification" : "rien à défaire", groupe: "socle", resteOuvert: true, ouvrir: () => { if (p.canUndo) p.onUndo(); } },
          { id: "retablir", nom: "Rétablir", icone: <Redo2 aria-hidden="true" />, aide: p.canRedo ? "refaire la modification défaite" : "rien à refaire", groupe: "socle", resteOuvert: true, ouvrir: () => { if (p.canRedo) p.onRedo(); } },
        ] },
      ...["broder", "fils", "affichage", "importer"].map(pris).filter((m): m is ModePoint => !!m),
      ...(!GALERIE ? [] : [{ id: "galerie", nom: "Galerie", icone: <LayoutGrid aria-hidden="true" />, aide: "la Galerie des Vivants", groupe: "creation" as const, ouvrir: () => { window.location.href = import.meta.env.BASE_URL + "galerie"; } }]),
      { id: "partager", nom: "Partager", icone: <Share2 aria-hidden="true" />, aide: !GALERIE ? "exporter le patron en PDF, le projet" : "exporter le patron, le projet, exposer dans la Galerie", groupe: "creation", ouvrir: () => {},
        enfants: () => [...(exporter?.enfants?.() ?? []), ...(p.actions.exposer && GALERIE ? [{ id: "partager-exposer", nom: "Exposer", icone: <Sparkles aria-hidden="true" />, aide: "une copie dans la Galerie des Vivants", groupe: "creation", ouvrir: p.actions.exposer } satisfies ModePoint] : [])] },
      ...["guide"].map(pris).filter((m): m is ModePoint => !!m),
      { id: "reglages", nom: "Réglages", icone: <CircleHelp aria-hidden="true" />, aide: "les réglages du studio, l’aide, la navigation classique", groupe: "socle", ouvrir: () => {},
        enfants: () => [
          { id: "reglages-studio", nom: "Réglages et aide", icone: <CircleHelp aria-hidden="true" />, aide: "les réglages du studio et l’aide", groupe: "socle", ouvrir: p.actions.settings },
          { id: "nav-classique", nom: "Navigation classique", icone: <Menu aria-hidden="true" />, aide: "retrouver le dock du haut", groupe: "socle", ouvrir: () => { changerNav0(false); setTambourOuvert(false); setVueDisque("atelier"); } },
        ] },
      ...["loupe"].map(pris).filter((m): m is ModePoint => !!m),
    ];
  };
  /* la racine du Bureau : naviguer et agir dans la couronne ; le centre montre les vrais ouvrages (le même composant que « Mes ouvrages ») */
  const racineBureau = (): ModePoint[] => {
    const b = commandesDuBloc<ContexteBroderie>("broderie", { ...contexteBroderie, dockClassique: undefined }), importer = b.find(m => m.id === "importer");
    const dossiers = [...new Set(bureauListe.map(r => r.folder).filter((d): d is string => !!d))].sort((a, c) => a.localeCompare(c, "fr"));
    return [
      { id: "atelier", nom: "Atelier", icone: <Pencil aria-hidden="true" />, aide: "revenir à l’ouvrage ouvert : " + p.patternName, groupe: "metier", ouvrir: () => { setBureauPlein(false); setVueDisque("atelier"); } },
      { id: "bureau-dossiers", nom: "Dossiers", icone: <Folder aria-hidden="true" />, aide: bureauDossier ? "dossier : " + bureauDossier : "tous les ouvrages", groupe: "socle", ouvrir: () => {},
        enfants: () => [{ id: "dossier-tous", nom: `Tous (${bureauListe.length})`, aide: "tous les ouvrages", groupe: "socle", actif: bureauDossier === null, ouvrir: () => setBureauDossier(null) } satisfies ModePoint,
          ...dossiers.map((d): ModePoint => ({ id: "dossier-" + d, nom: `${d} (${bureauListe.filter(r => r.folder === d).length})`, aide: "les ouvrages du dossier " + d, groupe: "socle", actif: bureauDossier === d, ouvrir: () => setBureauDossier(d) }))] },
      { id: "bureau-nouveau", nom: "Nouvel ouvrage", icone: <Square aria-hidden="true" />, aide: "une grille vierge, ouverte dans l’atelier", groupe: "creation", ouvrir: () => { p.actions.nouveau(); setBureauPlein(false); setVueDisque("atelier"); } },
      ...(importer ? [importer] : []),
      { id: "bureau-chercher", nom: "Chercher", icone: <Search aria-hidden="true" />, aide: "un fil, un outil, une fonction", groupe: "socle", ouvrir: () => setBloc("chercher") },
      { id: "bureau-plein", nom: bureauPlein ? "Revenir au disque" : "Plein écran", icone: <Maximize aria-hidden="true" />, aide: bureauPlein ? "les ouvrages reviennent au centre du disque" : "les ouvrages occupent tout l’écran", groupe: "socle", actif: bureauPlein, ouvrir: () => setBureauPlein(v => !v) },
      ...(!GALERIE ? [] : [{ id: "galerie", nom: "Galerie", icone: <LayoutGrid aria-hidden="true" />, aide: "la Galerie des Vivants", groupe: "creation" as const, ouvrir: () => { window.location.href = import.meta.env.BASE_URL + "galerie"; } }]),
      { id: "reglages", nom: "Réglages", icone: <CircleHelp aria-hidden="true" />, aide: "les réglages du studio, l’aide, la navigation classique", groupe: "socle", ouvrir: () => {},
        enfants: () => [
          { id: "reglages-studio", nom: "Réglages et aide", icone: <CircleHelp aria-hidden="true" />, aide: "les réglages du studio et l’aide", groupe: "socle", ouvrir: p.actions.settings },
          { id: "nav-classique", nom: "Navigation classique", icone: <Menu aria-hidden="true" />, aide: "retrouver le dock du haut", groupe: "socle", ouvrir: () => { changerNav0(false); setTambourOuvert(false); setVueDisque("atelier"); } },
        ] },
    ];
  };
  const bureauCentre = nav0 && vueDisque === "bureau" && p.ouvrages ? {
    titre: "Bureau : mes ouvrages", plein: bureauPlein, quitterPlein: () => setBureauPlein(false), defile: bureauDefile,
    element: <OuvragesBloc courant={p.ouvrages.courant} dossier={bureauDossier} onDossier={setBureauDossier} onListe={setBureauListe}
      ouvrir={id => { setBureauPlein(false); setVueDisque("atelier"); p.ouvrages!.ouvrir(id); }} importer={f => { setBureauPlein(false); setVueDisque("atelier"); p.ouvrages!.importer(f); }} />,
  } : undefined;
  const retracterTambour = () => { setTambourOuvert(false); requestAnimationFrame(() => tambourBouton.current?.focus()); };

  return <>
    <header className="pzs-head" aria-label="En-tête du studio">
      <button type="button" className="lp-evitement" onClick={() => { setLoupe(false); ouvrirConfort(); }}>Réglages de confort</button>
      {bloc && <div className="pzs-voile" aria-hidden="true" onClick={fermer} />}
      <nav className={"pzs-top" + (bloc ? " pzs-ouvert" : "")} aria-label="Dock des outils du studio de broderie" onKeyDown={onKey}>
        <div className="pzs-ligne">
          {aime && <button type="button" className="pzs-tool pzs-icon" aria-label="Revenir sur Le Monde AIME" title="Retour" onClick={retourSite}><ArrowLeft size={18} aria-hidden="true" /></button>}
          <button id="pzs-brand" data-guide="orbe" type="button" className="pzs-orbe" aria-label="Menu AIME : accueil, réglages, affichage" title="Menu AIME" aria-expanded={bloc === "menu"} aria-controls="pzs-bloc" onClick={() => ouvrir("menu")}>
            <Menu size={18} aria-hidden="true" />
          </button>
          <span className="pzs-sep" aria-hidden="true" />
          {aime ? <a className="pzs-tool pzs-marque" href="/" aria-label="AIME, Le Monde AIME">AIME<sup aria-hidden="true">®</sup></a> : <span className="pzs-tool pzs-marque">Point Zéro</span>}
          <span className="pzs-sep" aria-hidden="true" />
          <div className="pzs-row" data-guide="outils" data-defile ref={el => { rangHaut.current = el; }}>
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
          {/* Mes ouvrages : un dossier, nommé, toujours dans la barre du haut (le compte s'affiche dans le dossier) */}
          <button type="button" data-guide="profil" className="pzs-tool pzs-ouvrages" aria-label={"Mes ouvrages" + (moi?.name ? ", " + moi.name : "")} title="Mes ouvrages" aria-expanded={bloc === "inviter"} aria-controls="pzs-bloc" onClick={() => ouvrir("inviter")}>
            <Folder size={18} aria-hidden="true" /><span className="pzs-lib">Ouvrages</span>
          </button>
        </div>
        {bloc && <div id="pzs-bloc" className="pzs-bloc" ref={blocRef}>
          {bloc === "menu" && <>
            <div id="pzs-menu" className="pzs-bloc-corps" data-defile>
              <ul className="pzs-bloc-menu">
                {aime && <li><a href="/">Le Monde AIME</a></li>}
                <li><button type="button" onClick={() => { setBloc(null); p.actions.home(); }}>Accueil Point Zéro</button></li>
                <li><button type="button" onClick={() => setBloc("inviter")}>Mes ouvrages</button></li>
                <li><button type="button" onClick={() => setBloc("chercher")}>Chercher</button></li>
                {GALERIE && <li><a href={import.meta.env.BASE_URL + "galerie"}>Galerie des Vivants</a></li>}
                <li><a href={import.meta.env.BASE_URL + "tambour"}>Essai : le Tambour vivant</a></li>
                <li><button type="button" aria-pressed={essaiBloc} onClick={() => { const v = !essaiBloc; ecrireEssaiBloc(v); setEssaiBloc(v); if (v) { ecrireCadreTambour(false); setCadreTambour(false); setTambourOuvert(false); } setBloc(null); }}>{essaiBloc ? "Revenir au dock du bas" : "Essai : les outils sur le bloc"}</button></li>
                <li><button type="button" aria-pressed={nav0} onClick={() => changerNav0(!nav0)}>{nav0 ? "Quitter la navigation intégrale .0" : "Essai : Navigation intégrale .0"}</button></li>
                <li><button type="button" aria-pressed={cadreTambour} onClick={() => { const v = !cadreTambour; ecrireCadreTambour(v); setCadreTambour(v); setTambourOuvert(false); if (v) { ecrireEssaiBloc(false); setEssaiBloc(false); } setBloc(null); }}>{cadreTambour ? "Revenir au dock en bas de l’écran" : "Essai : le Cadre-Tambour"}</button></li>
                <li><button type="button" onClick={() => { setBloc(null); p.actions.settings(); }}>Réglages et aide</button></li>
                {p.actions.visite && <li><button type="button" onClick={() => { setBloc(null); p.actions.visite!(); }}>Revoir la visite avec Le Point</button></li>}
              </ul>
            </div>
            <div className="pzs-mini pzs-levels" role="group" aria-label="Affichage du studio">
              <span>Affichage</span>
              {(Object.keys(LEVEL_LABELS) as InterfaceLevel[]).map(id =>
                <button key={id} type="button" aria-pressed={p.level === id} onClick={() => p.onLevel(id)}>{LEVEL_LABELS[id]}</button>)}
            </div>
          </>}
          {bloc === "outils" && <>
            <div className="pzs-bloc-corps" data-defile>
              {p.path === "broder"
                ? <GrilleOutils groupes={GROUPES_BRODER} outil={p.tool} onOutil={choisir} filtre={p.level === "beginner" ? (id => BEGINNER.has(id) || id === p.tool || id === "block" || id === "row") : undefined} desactive={id => !!p.readOnly && id !== "hand"} plus={[["Suivi de broderie", () => { setBloc(null); p.actions.follow(); }]]} />
                : <GrilleOutils groupes={GROUPES_DESSIN} outil={p.tool} onOutil={choisir} filtre={p.level === "beginner" ? (id => BEGINNER.has(id) || id === p.tool) : undefined} desactive={id => !!p.readOnly && id !== "hand"}
                  plus={[["Motifs", () => { setBloc(null); p.actions.motifs(); }], ["Calques", () => { setBloc(null); p.actions.layers(); }], ["Réglages du dessin", () => { setBloc(null); p.actions.drawSettings(); }]]} />}
            </div>
            <div className="pzs-mini" role="group" aria-label="Le fil actif">
              <span>Fil actif</span>
              <button type="button" onClick={() => setBloc("nuancier")}><span className="pzs-swatch" style={{ background: p.colorHex }} aria-hidden="true" />&nbsp;{p.colorLabel} · changer</button>
              <button type="button" onClick={() => setBloc(null)}>Replier</button>
            </div>
          </>}
          {bloc === "nuancier" && p.pattern && <>
            <div className="pzs-bloc-corps" data-defile>
              <Nuancier pattern={p.pattern} couleur={p.couleur ?? 0} onCouleur={idx => { p.onCouleur?.(idx); setBloc(null); }} />
            </div>
            <div className="pzs-mini" role="group" aria-label="Fils">
              <button type="button" onClick={() => { setBloc(null); p.actions.threadsSettings(); }}>Fils et toile</button>
              <button type="button" onClick={() => setBloc(null)}>Replier</button>
            </div>
          </>}
          {bloc === "chercher" && <>
            <div className="pzs-bloc-corps" data-defile>
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
            <div className="pzs-bloc-corps" data-defile>
              <p className="pzs-titre">{moi ? (moi.image ? <img className="pzs-avatar" src={moi.image} alt="" /> : <span className="pzs-avatar" aria-hidden="true">{initiales(moi.name || moi.email || "")}</span>) : null}Mes ouvrages{moi?.name ? " · " + moi.name.split(" ")[0] : ""}
                <button type="button" className="pzs-aide-bouton" aria-expanded={aideOuvrages} aria-controls="pzs-aide-ouvrages" onClick={() => setAideOuvrages(v => !v)}><CircleHelp size={16} aria-hidden="true" /><span className="sr-only">Aide sur Mes ouvrages</span></button></p>
              {p.ouvrages && <OuvragesBloc courant={p.ouvrages.courant} ouvrir={id => { setBloc(null); p.ouvrages!.ouvrir(id); }} importer={f => { setBloc(null); p.ouvrages!.importer(f); }} />}
              {moi && <PreferencesCompte />}
              {aideOuvrages && <p id="pzs-aide-ouvrages" className="pzs-note">Touchez un ouvrage pour l’ouvrir ; déposez un fichier pour l’importer. « Partager en direct » : quelqu’un regarde l’ouvrage ouvert, depuis son appareil.{!moi && aime ? " Entrez dans AIME pour retrouver vos ouvrages partout." : moi ? " Vos ouvrages sont sur votre compte AIME et sur cet appareil." : ""}</p>}
            </div>
            <div className="pzs-mini" role="group" aria-label="Nouvel ouvrage et invitation">
              <button type="button" onClick={() => { setBloc(null); p.actions.nouveau(); }}>+ Nouveau motif</button>
              <button type="button" onClick={() => { setBloc(null); p.actions.share(); }}>Partager en direct</button>
              {aime && !moi && <a href="/entrer">Entrer dans AIME</a>}
            </div>
          </>}
        </div>}
      </nav>
      <span className="sr-only" role="status">{p.patternName} · {p.saving}</span>
      {!bloc && <p className="pzs-crumbs">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> › </span>}{i === crumbs.length - 1 ? <strong>{c}</strong> : c}</span>)}</p>}
    </header>

    {loupe && p.pattern && <div className="pzs-loupe-dock"><Loupe pattern={p.pattern} /><button type="button" className="pzs-loupe-fermer" aria-label="Fermer la loupe" onClick={() => setLoupe(false)}><X size={16} aria-hidden="true" /></button></div>}
    {essaiBloc ? (p.sansPoint ? null : <PointDuBloc<ContexteBroderie> type="broderie" nom={p.patternName} part={prog} etiquette={total ? "patron brodé à " + Math.round(prog * 100) + " %" : undefined} contexte={contexteBroderie} />) : <>
    <nav className={"pzs-bottom" + (cadreTambour ? " pzs-accroche" : "")} aria-label="Se repérer dans le studio" data-defile ref={el => { rangBas.current = el; navBas.current = el; }} onKeyDown={e => { if (e.key === "Escape" && loupe) { e.preventDefault(); setLoupe(false); return; } if (e.key === "Escape" && modes) { e.preventDefault(); setModes(false); cercleRef.current?.focus(); } }}>
      {/* Le Point, contrôleur universel : Confort (toujours premier), Loupe, Guide, puis le métier (Broderie : Repères, Fils, Progression) */}
      {p.sansPoint ? null : <Point contexte="broderie" refBouton={cercleRef} part={prog} teinte={teinte}
        etiquette={"Dock en mode " + (MODES.find(m => m[0] === modeBas)?.[1] ?? "") + (total ? ", patron brodé à " + Math.round(prog * 100) + " %" : "")}
        modes={[
          { id: "loupe", nom: "Loupe", icone: <Search aria-hidden="true" />, aide: "la grille agrandie sous le pointeur ou à la case choisie au clavier, sans rien modifier", groupe: "socle", actif: loupe, ouvrir: () => setLoupe(v => !v) },
          ...(p.actions.visite ? [{ id: "guide", nom: "Guide", icone: <Compass aria-hidden="true" />, aide: "la visite du studio avec Le Point", groupe: "socle", ouvrir: () => p.actions.visite!() } satisfies ModePoint] : []),
          { id: "broderie", nom: "Broderie", icone: <Spool aria-hidden="true" />, aide: "le dock du bas en Repères, Fils DMC ou Progression", groupe: "metier", actif: modes, ouvrir: () => { setModes(v => !v); requestAnimationFrame(() => document.querySelector<HTMLElement>(".pzs-modes [aria-pressed=\"true\"]")?.focus()); } },
        ]} />}
      {/* essai du Cadre-Tambour : le tambour se déploie depuis le dock accroché ; ses outils l'entourent */}
      {cadreTambour && !p.sansPoint && <button ref={tambourBouton} type="button" className="pzs-btm pzs-sq pzs-ouvrir-tambour" aria-expanded={tambourOuvert}
        aria-label={"Tambour : refermer l’ouvrage en cercle, les outils tout autour" + (aVoir(listeIndic).length ? `. ${aVoir(listeIndic).length} information${aVoir(listeIndic).length > 1 ? "s" : ""} à voir` : "")} title="Tambour" onClick={() => setTambourOuvert(true)}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="13" r="8" /><circle cx="12" cy="13" r="4.5" strokeDasharray="2 2.5" /><path d="M10 3.5h4" strokeLinecap="round" /></svg>
        {(() => { const t = trier(listeIndic.filter(i => i.etat !== "guide"))[0]; return t ? <span className="lp-indic" data-etat={t.etat} aria-hidden="true" /> : null; })()}</button>}
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
      {/* le dock du bas, réduit à l'essentiel : le nom de l'ouvrage est dans l'étiquette du Cadre ; le zoom à la molette, aux touches + et −, ou à deux doigts */}
      {/* Symboles (le mot des brodeuses), les trois lectures, Tout voir, la Loupe. Sur téléphone : pictogramme et mot court, tout tient sans défiler ; la Loupe y passe par le Point. */}
      <button type="button" data-guide="symboles" className="pzs-btm pzs-vue" aria-pressed={p.symbols} aria-label="Symboles : les symboles par-dessus les couleurs" onClick={p.onSymbols}><Shapes aria-hidden="true" /><span className="pzs-lib">Symboles</span></button>
      <div className="pzs-seg" data-guide="lectures" role="group" aria-label="Affichage de la grille">
        {VIEWS.map(([id, name]) => <button key={id} type="button" className="pzs-vue" aria-pressed={p.view === id} onClick={() => p.onView(id)}>{ICONES_VUE[id]}<span className="pzs-lib">{name}</span></button>)}
      </div>
      <span className="pzs-sep" aria-hidden="true" />
      <button type="button" data-guide="tout-voir" className="pzs-btm pzs-light pzs-vue" onClick={p.zoom.fit}><Maximize aria-hidden="true" /><span className="pzs-lib">Tout voir</span></button>
      <button type="button" data-guide="loupe" className="pzs-btm pzs-loupe-btn" aria-pressed={loupe} aria-label="Loupe : la grille agrandie sous le pointeur" title="Loupe" onClick={() => setLoupe(v => !v)}><Search size={17} aria-hidden="true" /><span className="pzs-loupe-txt">Loupe</span></button>
        </>}
    </nav>
    {cadreTambour && tambourOuvert && !p.sansPoint && <TambourAtelier racine={nav0 ? (vueDisque === "bureau" ? racineBureau() : racine0()) : undefined} centreContenu={bureauCentre} indicateurs={indicateurs} ouvrage={p.pattern?.id} contexte={contexteBroderie} retracter={retracterTambour} suivi={active && active.cells > 0 && p.pattern && p.couleur != null ? { code: active.code, hex: active.hex, cells: active.cells, done: active.done, motif: p.pattern!, couleur: p.couleur!, depuis, montrer: suggestions && (p.workspace === "stitch" || conseil?.commande === "broder") } : undefined} part={prog} etiquette={total ? "patron brodé à " + Math.round(prog * 100) + " %" : undefined} />}
    </>}
  </>;
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

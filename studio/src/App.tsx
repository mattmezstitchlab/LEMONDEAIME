import StudioDocks, { type DockPath } from "./components/StudioDocks";
import Buro from "./components/Buro";
import { VISIBILITY, visibilityOf, writeVisibility } from "./lib/visibility";
import { readInterfaceLevel, INTERFACE_LEVEL_KEY, type InterfaceLevel } from "./lib/interfaceLevel";
import CrossStitchHome, { type StitchEntry } from "./components/CrossStitchHome";
import PatternBoutique from "./components/PatternBoutique";
import {writeStoredJSON} from "./lib/storageSafety";
import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { BASE_FLOSS, FLOSS, flossIndex } from "./lib/dmc";
import { blankPattern, initState, loadStored, reducer, saveStored } from "./lib/store";
import { clonePattern, compositePattern, computeStats, createPattern, ensurePalette, toObject, fromObject, type Pattern, type Supply } from "./lib/pattern";
import { readProjectFile, readTextFile, saveProjectFile } from "./lib/io";
import { fromOxs } from "./lib/oxs";
import { getProject, listProjects, readInventory, saveLibrary, tirerDuCompte, writeInventory } from "./lib/library";
import { estConnecte } from "./lib/aimeSync";
import { clearSelection, extractSelection, pasteSelection, transformPart, type Selection } from "./lib/editing";
import { useMedia } from "./lib/useMedia";
import type { Tool } from "./lib/stitch";
import { runChecks } from "./lib/checks";
import Canvas, { type Insets, type ViewMode } from "./components/Canvas";
import { avecBase, entryStudio, publicPathFor, type StudioRoute } from "./lib/entryNavigation";
import AtelierCreate from "./components/AtelierCreate";
import { type AtelierCategory } from "./components/CategoryBar";
import MotifLibrary from "./components/MotifLibrary";
import EmbroideryInspector from "./components/EmbroideryInspector";
import { getMotifPreset } from "./lib/motifPresets";
import { attachSubject, changeSubject, duplicateSubject, recomposeSubjects, removeSubject, reorderSubject, sceneFromPattern, type SubjectScene, type SubjectLayer } from "./lib/subjectEngine";
import PaletteSheet from "./components/PaletteSheet";
import FlossRail from "./components/FlossRail";
import WorkspacePanel, { DEFAULT_PREFS, type Preferences } from "./components/WorkspacePanel";
import LibrarySheet from "./components/LibrarySheet";
import SelectionBar from "./components/SelectionBar";
import ImportStudio from "./components/ImportStudio";
import { OUVRAGE_DRAG_TYPE } from "./components/OuvragesBloc";
import PdfPrep from "./components/PdfPrep";
import PromptStudio from "./components/PromptStudio";
import CompositionStudio from "./components/CompositionStudio";
import AutomaticImageImport from "./components/AutomaticImageImport";
import ExportStudio from "./components/ExportStudio";
import ErrorBoundary from "./components/ErrorBoundary";
import PeerShare from "./components/PeerShare";
import OrbeGuide, { visiteVue } from "./components/OrbeGuide";

type Panel = "palette" | "library" | "share" | "export" | null;
type RightSection = "properties" | "motifs" | "edit" | "prepare" | "follow" | "settings";
type Workspace = "create" | "stitch";
const STITCH_TOOLS = new Set<Tool>(["hand", "pick", "mark", "details", "block", "row", "park", "unpick", "note"]);
/**
 * Raccourcis d'outils.
 *
 * Les lettres couvrent les outils du dock ; les chiffres, ceux qui n'étaient
 * accessibles que depuis le panneau Projet. T, P et F restent réservés : T cycle
 * l'affichage, P ouvre la palette (ou gare un fil en mode Broder), F ouvre la
 * palette.
 */
const KEYS: Record<string, Tool> = {
  v: "hand", x: "cross", d: "half", q: "quarter", r: "back", k: "knot", l: "long",
  i: "pick", g: "fill", e: "erase", m: "mark", j: "details", b: "block", h: "row",
  u: "unpick", s: "select",
  "1": "threeQuarter", "2": "petite", "3": "bead", "4": "line", "5": "rect",
  "6": "ellipse", "7": "lasso", "8": "move", "9": "note",
};

function initialPreferences(): Preferences {
  try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("point-zero:preferences") ?? "{}") }; } catch { return DEFAULT_PREFS; }
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function App() {
  const [boot] = useState(loadStored);
  // The root opens the cross-stitch welcome without replacing stored projects.
  // Explicit deep links continue to open their original studios without clearing data.
  const [studioMode, setStudioMode] = useState<StudioRoute>(() => {
    try { return entryStudio(window.location.search,window.location.hash,window.location.pathname); }
    catch { return "stitch-home"; }
  });
  useEffect(()=>{
    if(studioMode==="pattern-boutique")document.title="Point Zéro — Éditions de patrons";
    else if(studioMode==="stitch-home")document.title="Point Zéro — Studio de point de croix";
    else if(studioMode==="buro")document.title="BurO — Point Zéro";
  },[studioMode]);
  // Public pages are addressable and reversible with browser back/forward.
  // Workspace data remains in its original localStorage keys, untouched.
  const navigatePage=(path:string,transientIntention?:string)=>{
    const next=new URL(avecBase(path),window.location.origin);
    if(next.origin!==window.location.origin)return;
    // Pass a user-entered intention in same-tab navigation state, not in a shareable URL.
    const navigationState=transientIntention?{aimeIntention:transientIntention.slice(0,800)}:null;
    if(next.pathname!==window.location.pathname||next.search!==window.location.search||next.hash!==window.location.hash||navigationState){
      window.history.pushState(navigationState,"",next.pathname+next.search+next.hash);
    }
    setStudioMode(entryStudio(next.search,next.hash,next.pathname));
  };
  useEffect(()=>{
    const restoreRoute=()=>setStudioMode(entryStudio(window.location.search,window.location.hash,window.location.pathname));
    window.addEventListener("popstate",restoreRoute);
    return()=>window.removeEventListener("popstate",restoreRoute);
  },[]);
  const switchStudio = (mode: StudioRoute) => navigatePage(publicPathFor(mode));
  const [store, dispatch] = useReducer(reducer, boot, (v) => initState(v ?? blankPattern()));
  const [remote, setRemote] = useState<Pattern | null>(null);
  const [activeCategory, setActiveCategory] = useState<AtelierCategory>("compose");
  const [showWelcome, setShowWelcome] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const subjectMove = useRef<{ scene: SubjectScene; base: Pattern; id: string; x: number; y: number } | null>(null);
  const [interfaceLevel, setInterfaceLevel] = useState(readInterfaceLevel);
  const [, setShowDrawingTools] = useState(() => readInterfaceLevel() === "expert");
  const [, setMobileLibraryOpen] = useState(false);
  const [dockPath, setDockPath] = useState<DockPath>(null);
  const [, setVisibilityTick] = useState(0);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [rightSection, setRightSection] = useState<RightSection>("properties");
  const [compositionInput, setCompositionInput] = useState<Pattern | null>(null);
  const [autoImage, setAutoImage] = useState<File | null>(null);
  const P = remote ?? store.present;
  /* la progression du patron pour le dock du bas (le cercle et la timeline) ; différée pour ne pas freiner le tracé */
  const Pdiffere = useDeferredValue(P);
  const progression = useMemo(() => { const st = computeStats(Pdiffere);
    return { total: st.rows.reduce((n, r) => n + r.cells, 0), done: st.rows.reduce((n, r) => n + r.done, 0), couleurs: st.rows.map(r => ({ idx: r.idx, hex: r.hex, code: r.code, cells: r.cells, done: r.done })) }; }, [Pdiffere]);
  const [tool, setTool] = useState<Tool>("cross"), [color, setColor] = useState(Math.max(0, flossIndex("3801"))), [view, setView] = useState<ViewMode>("real"), [workspace, setWorkspace] = useState<Workspace>("create");
  const [symbols, setSymbols] = useState(false), [panel, setPanel] = useState<Panel>(null), [file, setFile] = useState<File | null>(null), [pdfFile, setPdfFile] = useState<File | null>(null), [promptOpen, setPromptOpen] = useState(false), [selection, setSelection] = useState<Selection | null>(null), [clipboard, setClipboard] = useState<Pattern | null>(null);
  const [prefs, setPrefs] = useState(initialPreferences), [inventory, setInventory] = useState(readInventory), [saving, setSaving] = useState("Sauvegarde locale"), [toast, setToast] = useState("");
  const [fitKey, setFitKey] = useState(0), wide = useMedia("(min-width: 1280px)");
  const ready = useRef(true), prevTool = useRef<Tool>("cross"), lastViews = useRef<{ create: ViewMode; stitch: ViewMode }>({ create: "real", stitch: "pattern" });
  const snapshot = useRef({ P, remote, prefs, workspace, store }); snapshot.current = { P, remote, prefs, workspace, store };
  const checked = useRef(false);
  const notify = useCallback((msg: string) => setToast(msg), []);
  const closePanel = useCallback(() => setPanel(null), []);
  // Les outils sont de véritables panneaux, comme dans Photo.
  // Canvas conserve son moteur plein écran mais centre/ajuste le patron
  // dans la surface libre, entre les panneaux et la bande DMC.
  // Deux docks flottants : la grille occupe toute la page, entre le dock du haut et celui du bas.
  const insets: Insets = { top: 112, right: mobileInspectorOpen && wide ? 316 : 0, bottom: dockPath === "fils" ? 212 : 104, left: 0 };

  useEffect(() => {
    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI)).catch(() => undefined);
    }
  }, []);
  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    const failures = runChecks().filter((v) => !v.ok);
    if (failures.length) notify(`Vérification du moteur : ${failures.length} anomalie(s). Consultez Réglages avant de travailler.`);
  }, [notify]);

  const setPattern = useCallback((p: Pattern, quiet = false) => {
    if (snapshot.current.remote) notify("Lecture partagée : seul l’hôte modifie ce projet.");
    else dispatch({ type: quiet ? "quiet" : "set", pattern: p });
  }, [notify]);
  const chooseWorkspace = useCallback((mode: Workspace) => {
    const current = snapshot.current.workspace;
    if (mode === current) return;
    lastViews.current[current] = view;
    setWorkspace(mode); setView(lastViews.current[mode]); setTool(mode === "stitch" ? "mark" : "cross"); setSelection(null);
    window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "clearSelection" } }));
  }, [view]);
  const chooseTool = useCallback((next: Tool) => {
    if (snapshot.current.remote && next !== "hand") { notify("Le patron partagé est en lecture seule."); return; }
    if (snapshot.current.workspace === "stitch" && !STITCH_TOOLS.has(next)) { notify("Passez en mode Créer pour modifier le dessin."); return; }
    if (["mark", "details", "block", "row", "park", "unpick"].includes(next) && snapshot.current.workspace === "create") { setWorkspace("stitch"); setView("pattern"); setActiveCategory("stitch"); }
    if (next !== "pick") prevTool.current = next;
    setTool(next);
  }, [notify]);
  const pickColor = (idx: number) => {
    setColor(idx);
    if (!P.palette.includes(idx) && !remote) { const next = clonePattern(P); ensurePalette(next, idx); setPattern(next); }
    if (workspace === "stitch") setTool(remote ? "hand" : "mark");
    else if (["erase", "hand", "pick", "mark"].includes(tool)) setTool("cross");
    if (panel === "palette") closePanel();
  };
  const updateSupply = (code: string, supply: Supply) => {
    const values = { ...inventory, [code]: supply };
    if (!remote) { setInventory(values); try { writeInventory(values); } catch { notify("Stock non sauvegardé : exportez votre JSON."); } }
    setPattern({ ...P, supplies: { ...P.supplies, [code]: supply } }, true);
  };
  const openingPattern = useRef(false);
  const loadPattern = async (p: Pattern) => {
    if (openingPattern.current) { notify("Un ouvrage est déjà en cours d’ouverture."); return false; }
    openingPattern.current = true;
    try {
      if (!remote) {
        try { await saveLibrary(store.present, true); }
        catch {
          notify("Ouverture bloquée : impossible de conserver le projet actif. Exportez son JSON avant de réessayer.");
          return false;
        }
      }
      const next = { ...p, supplies: { ...p.supplies, ...inventory } };
      setRemote(null); dispatch({ type: "load", pattern: next }); ready.current = true;
      setSelection(null); setSelectedSubjectId(null); setMobileLibraryOpen(false); setMobileInspectorOpen(false); setFitKey((k) => k + 1); setColor(next.palette[0] ?? flossIndex("3801")); closePanel(); setFile(null); setShowWelcome(false);
      return true;
    } finally { openingPattern.current = false; }
  };

  useEffect(() => {
    // Les anciens liens #atelier / #slame pointent désormais vers l'unique atelier.
    if (window.location.hash === "#atelier" || window.location.hash === "#slame") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    if (studioMode === "embroidery") document.title = `${P.name} | POINTZERO · Atelier`;
  }, [P.name, studioMode]);
  useEffect(() => {
    try { writeStoredJSON("point-zero:preferences", JSON.stringify(prefs),v=>!!v&&typeof v==="object"&&!Array.isArray(v)); } catch { /* Optional preferences do not block the editor. */ }
  }, [prefs]);
  // Aucun motif de démonstration n'est chargé sur la grille initiale.
  // La véritable toile Canvas est visible sous la saisie de création.
  useEffect(() => {
    if (!ready.current || remote) return;
    const timer = window.setTimeout(() => {
      setSaving("Sauvegarde en cours…");
      const local = saveStored(store.present);
      saveLibrary(store.present).then(() => setSaving("Sauvegardé sur cet appareil")).catch(() => { setSaving(local ? "Copie locale sauvegardée" : "Sauvegarde indisponible : exporter le JSON"); if (!local) notify("Stockage local indisponible. Sauvegardez le projet en JSON."); });
    }, 650);
    return () => clearTimeout(timer);
  }, [store.present, remote, notify]);
  /* Dans AIME et connecté : les ouvrages du compte reviennent sur l'appareil ; ?ouvrage=<id> ouvre celui choisi dans Votre espace. */
  const [compteAime, setCompteAime] = useState(false);
  useEffect(() => {
    let fini = false;
    void (async () => {
      const connecte = await estConnecte(); if (fini) return; setCompteAime(connecte);
      if (!connecte) return;
      const ecrits = await tirerDuCompte().catch(() => [] as string[]);
      const id = new URLSearchParams(window.location.search).get("ouvrage");
      if (id) { const r = (await listProjects()).find(x => x.id === id), p = r && getProject(r); if (p && !fini) void loadPattern(p); else if (!fini) notify("Cet ouvrage n’est pas dans votre espace AIME."); }
      else if (ecrits.length && !fini) notify(ecrits.length > 1 ? `${ecrits.length} ouvrages récupérés depuis votre espace AIME.` : "Un ouvrage récupéré depuis votre espace AIME.");
    })();
    const etat = (e: Event) => { const d = (e as CustomEvent<{ etat: string; nom: string }>).detail;
      if (d.etat === "range") setSaving("Rangé dans votre espace AIME");
      else if (d.etat === "trop-gros") notify(`« ${d.nom} » est trop lourd pour votre espace AIME : il reste sur cet appareil.`);
      else setSaving("Sauvegardé sur cet appareil · espace AIME injoignable"); };
    window.addEventListener("pointzero:aime-espace", etat);
    return () => { fini = true; window.removeEventListener("pointzero:aime-espace", etat); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const flush = () => { if (!snapshot.current.remote) saveStored(snapshot.current.store.present); };
    window.addEventListener("pagehide", flush); return () => window.removeEventListener("pagehide", flush);
  }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(""), 4000); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    const syncInventory = () => setInventory(readInventory());
    window.addEventListener("pointzero:inventory-changed", syncInventory);
    return () => window.removeEventListener("pointzero:inventory-changed", syncInventory);
  }, []);

  useEffect(() => {
    if (studioMode !== "embroidery" || workspace !== "stitch" || remote) return;
    let start = performance.now(), lastDone = computeStats(snapshot.current.P).totals.doneCells;
    const accrue = () => {
      if (document.hidden) { start = performance.now(); return; }
      const seconds = Math.floor((performance.now() - start) / 1000); start = performance.now();
      if (seconds < 1) return;
      const p = snapshot.current.P, currentDone = computeStats(p).totals.doneCells, date = today(), sessions = [...(p.sessions ?? [])];
      const found = sessions.findIndex((v) => v.date === date), delta = currentDone - lastDone; lastDone = currentDone;
      if (found >= 0) sessions[found] = { ...sessions[found], seconds: sessions[found].seconds + seconds, cells: Math.max(0, sessions[found].cells + delta) };
      else sessions.push({ date, seconds, cells: Math.max(0, delta) });
      dispatch({ type: "quiet", pattern: { ...p, sessions } });
    };
    const timer = setInterval(accrue, 30000); const visible = () => { if (!document.hidden) start = performance.now(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [workspace, !!remote, studioMode]);
  useEffect(() => {
    if (studioMode !== "embroidery" || workspace !== "stitch" || !prefs.keepAwake || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | null = null, stopped = false;
    const request = async () => { if (document.hidden) return; try { const result = await navigator.wakeLock.request("screen"); if (stopped) void result.release(); else lock = result; } catch { /* Power-saving policies can deny the request. */ } };
    void request(); document.addEventListener("visibilitychange", request);
    return () => { stopped = true; void lock?.release(); document.removeEventListener("visibilitychange", request); };
  }, [workspace, prefs.keepAwake, studioMode]);

  const selectionAction = (action: string) => {
    if (!selection) return;
    const d = compositePattern(P);
    if (action === "close") { setSelection(null); window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "clearSelection" } })); return; }
    if (action === "copy") { setClipboard(extractSelection(d, selection)); notify("Sélection copiée dans le presse-papiers de l’atelier"); return; }
    if (action === "move") { chooseTool("move"); notify("Glissez la sélection vers sa nouvelle position"); return; }
    if (action === "paste" && clipboard) setPattern(pasteSelection(P, clipboard, selection.x, selection.y));
    if (action === "delete") setPattern(clearSelection(P, selection));
    if (["rotate", "flipX", "flipY"].includes(action)) {
      const part = transformPart(extractSelection(P, selection), action as "rotate" | "flipX" | "flipY");
      setPattern(pasteSelection(clearSelection(P, selection), part, selection.x, selection.y)); setSelection({ ...selection, w: part.w, h: part.h });
    }
  };
  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (studioMode !== "embroidery") return;
      // Rien ne doit passer pendant qu'on écrit : un raccourci déclenché dans un
      // champ mange des lettres. La cible peut ne pas être un Element.
      const cible = e.target;
      if (cible instanceof Element && cible.closest('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (!remote) dispatch({ type: e.shiftKey ? "redo" : "undo" }); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (KEYS[key]) chooseTool(KEYS[key]);
      else if (key === "p") { if (workspace === "stitch") chooseTool("park"); else setPanel("palette"); }
      else if (key === "f") setPanel("palette");
      else if (key === "t") setView((v) => v === "real" ? "flat" : v === "flat" ? "pattern" : "real");
      else if (key === "escape") { closePanel(); setSelection(null); }
    };
    window.addEventListener("keydown", keys); return () => window.removeEventListener("keydown", keys);
  }, [chooseTool, remote, workspace, closePanel, studioMode]);

  /** Même décodeur pour tous les fichiers de projet, depuis le même atelier. */
  const openProjectFromFile = async (f: File): Promise<string | null> => {
    try {
      if (!/\.(json|oxs)$/i.test(f.name)) throw new Error("Choisissez un fichier .pointzero.json, .json ou .oxs.");
      if (f.size > 25 * 1024 * 1024) throw new Error("Ce projet dépasse 25 Mo.");
      const p = /\.oxs$/i.test(f.name) ? fromOxs(await readTextFile(f)) : await readProjectFile(f);
      if (!p) throw new Error("Projet invalide ou format JSON incompatible. Le fichier original reste intact.");
      if (!await loadPattern(p)) return "Ouverture bloquée : ouvrage précédent conservé.";
      setWorkspace("create");
      setView("pattern");
      setTool("cross");
      notify(`« ${p.name} » ouvert · ${p.w} × ${p.h} points · ${p.palette.length} couleurs DMC`);
      return null;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Impossible d’ouvrir ce projet.";
      notify(message);
      return message;
    }
  };

  const panelActions = {
    importFile: (f: File) => {
      closePanel();
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") setPdfFile(f);
      else setAutoImage(f);
    },
    importAdvanced: (f: File) => { closePanel(); setFile(f); },
    openFile: (f: File) => { void openProjectFromFile(f); },
    export: () => setPanel("export" as Panel), save: () => { saveProjectFile(P); notify("Fichier projet téléchargé"); },
    new: (w: number, h: number) => { try { const next = createPattern("Nouveau motif", w, h, P.count, P.strands); next.fabric = P.fabric; void loadPattern(next); } catch (e) { notify(e instanceof Error ? e.message : "Dimensions invalides"); } },
    library: () => setPanel("library" as Panel), share: () => setPanel("share" as Panel), prompt: () => { closePanel(); setPromptOpen(true); }, notify,
  };

  const projectInputRef = useRef<HTMLInputElement>(null);
  const actionImportRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const openComposition = () => { if (!remote) { closePanel(); setCompositionInput(P); } };
  const onRemote = useCallback((p: Pattern | null) => {
    setRemote(p);
    if (p) { setShowWelcome(false); setActiveCategory("stitch"); setWorkspace("stitch"); setView("pattern"); setTool("hand"); setColor((c) => p.palette.includes(c) ? c : p.palette[0] ?? 0); }
  }, []);
  /** Ouvrir un ouvrage de « Mes ouvrages » (rond du profil) : d'un clic, ou glissé sur la grille. */
  const ouvrirOuvrage = async (id: string) => {
    if (remote) { notify("Vous regardez l’ouvrage de quelqu’un : revenez au vôtre pour en ouvrir un autre."); return; }
    if (id === P.id) { notify(`« ${P.name} » est déjà ouvert.`); return; }
    const r = (await listProjects()).find(x => x.id === id), p = r && getProject(r);
    if (!p) { notify("Cet ouvrage n’est plus sur cet appareil."); return; }
    if (await loadPattern(p)) { setShowWelcome(false); notify(`« ${p.name} » ouvert · ${p.w} × ${p.h} points`); }
  };
  const [depot, setDepot] = useState(false);
  const importAnyFile = (chosen: File) => {
    if (/\.(json|oxs)$/i.test(chosen.name)) { void openProjectFromFile(chosen); }
    else if (/\.pdf$/i.test(chosen.name) || chosen.type === "application/pdf") { setPdfFile(chosen); }
    else if (chosen.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(chosen.name)) { setAutoImage(chosen); }
    else { notify("Format non reconnu : image, PDF, JSON ou OXS."); return; }
    setShowWelcome(false); };
  /* Glisser-déposer sur toute la grille : un fichier de l'ordinateur (image, PDF, projet) ou un ouvrage tiré de « Mes ouvrages ». */
  const deposeRef = useRef({ ouvrir: ouvrirOuvrage, importer: importAnyFile });
  deposeRef.current = { ouvrir: ouvrirOuvrage, importer: importAnyFile };
  const atelierLibre = studioMode === "embroidery" && !pdfFile && !promptOpen && !compositionInput && !file && !autoImage;
  /* l'orbe qui guide : à la première ouverture de l'atelier, elle présente les deux docks, outil par outil */
  const [visite, setVisite] = useState(false);
  useEffect(() => { if (atelierLibre && !panel && !showWelcome && !visiteVue()) setVisite(true); }, [atelierLibre, panel, showWelcome]);
  useEffect(() => {
    if (!atelierLibre) return;
    const utile = (e: DragEvent) => { const t = Array.from(e.dataTransfer?.types ?? []); return t.includes(OUVRAGE_DRAG_TYPE) || t.includes("Files"); };
    let sortie: number | undefined;
    const sur = (e: DragEvent) => { if (!utile(e) || e.defaultPrevented) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; window.clearTimeout(sortie); setDepot(true); sortie = window.setTimeout(() => setDepot(false), 160); };
    const lacher = (e: DragEvent) => {
      if (!utile(e) || e.defaultPrevented) return;
      e.preventDefault(); setDepot(false);
      const id = e.dataTransfer?.getData(OUVRAGE_DRAG_TYPE); if (id) { void deposeRef.current.ouvrir(id); return; }
      const f = e.dataTransfer?.files?.[0]; if (f) deposeRef.current.importer(f);
    };
    window.addEventListener("dragover", sur); window.addEventListener("drop", lacher);
    return () => { window.removeEventListener("dragover", sur); window.removeEventListener("drop", lacher); window.clearTimeout(sortie); };
  }, [atelierLibre]);
  // Snapshots are native POINTZERO projects, never flat decorative images.
  const sceneOf = (p: Pattern): SubjectScene => {
    const saved = sceneFromPattern(p);
    if (saved) return saved;
    const base = compositePattern({ ...p, subjectScene: undefined });
    const snapshot = JSON.stringify(toObject({ ...base, subjectScene: undefined, composition: undefined, layers: [], activeLayer: undefined }));
    return { version: 1, source: snapshot, backdrop: snapshot, layers: [], warnings: [] };
  };
  const addStitchedPattern = (sprite: Pattern, position?: { x: number; y: number }) => {
    if (remote) { notify("Le projet partagé est en lecture seule."); return; }
    try {
      const scene = sceneOf(P);
      const offset = Math.min(6, scene.layers.length) * 3;
      const x = position ? Math.round(position.x - sprite.w / 2) : Math.round((P.w - sprite.w) / 2) + offset;
      const y = position ? Math.round(position.y - sprite.h / 2) : Math.round((P.h - sprite.h) / 2) + offset;
      const next = attachSubject(scene, sprite,
        Math.max(0, Math.min(P.w - 1, x)), Math.max(0, Math.min(P.h - 1, y)));
      setPattern(recomposeSubjects(next));
      setSelectedSubjectId(next.layers[next.layers.length - 1]?.id ?? null);
      setRightSection("properties");
      setTool("hand"); setWorkspace("create"); setView("flat");
      setActiveCategory("compose"); setShowWelcome(false); closePanel();
    } catch (error) { notify(error instanceof Error ? error.message : "Impossible d’ajouter ce motif."); }
  };
  const updateScene = (change: (scene: SubjectScene) => SubjectScene) => {
    if (remote) return;
    try { setPattern(recomposeSubjects(change(sceneOf(P)))); }
    catch (error) { notify(error instanceof Error ? error.message : "Recomposition impossible."); }
  };
  const subjectStart = (x: number, y: number): boolean => {
    if (remote || activeCategory !== "compose") return false;
    const scene = sceneFromPattern(P);
    if (!scene?.layers.length) return false;
    const hit = [...scene.layers].reverse().find(layer => {
      if (!layer.visible) return false;
      const sprite = fromObject(JSON.parse(layer.sprite));
      return sprite && x >= layer.x && y >= layer.y &&
        x < layer.x + sprite.w * layer.scale && y < layer.y + sprite.h * layer.scale;
    });
    if (!hit) { setSelectedSubjectId(null); return false; }
    setSelectedSubjectId(hit.id);
    if (!hit.locked) {
      subjectMove.current = { scene, base: P, id: hit.id, x: hit.x, y: hit.y };
      dispatch({ type: "begin" });
    }
    return true;
  };
  const subjectMoveTo = (dx: number, dy: number) => {
    const drag = subjectMove.current;
    if (!drag || remote) return;
    try {
      const scene = changeSubject(drag.scene, drag.id, { x: drag.x + dx, y: drag.y + dy });
      dispatch({ type: "live", pattern: recomposeSubjects(scene) });
    } catch (error) { notify(error instanceof Error ? error.message : "Déplacement impossible."); }
  };
  const subjectEnd = (changed: boolean) => {
    if (!subjectMove.current) return;
    const drag = subjectMove.current;
    subjectMove.current = null;
    if (!changed) dispatch({ type: "live", pattern: drag.base });
    dispatch({ type: "end", changed });
  };
  const changeSelectedSubject = (id: string, patch: Partial<Pick<SubjectLayer, "x" | "y" | "scale" | "visible" | "tint">>) =>
    updateScene(scene => changeSubject(scene, id, patch));
  const duplicateSelectedSubject = (id: string) => updateScene(scene => {
    const next = duplicateSubject(scene, id);
    const added = next.layers.find(layer => !scene.layers.some(old => old.id === layer.id));
    if (added) setSelectedSubjectId(added.id);
    return next;
  });
  const removeSelectedSubject = (id: string) => updateScene(scene => {
    const next = removeSubject(scene, id);
    setSelectedSubjectId(next.layers[next.layers.length - 1]?.id ?? null);
    return next;
  });
  const openRightPanel = (section: RightSection) => {
    setRightSection(section);
    setPanel(null);
    setMobileLibraryOpen(false);
    setMobileInspectorOpen(true);
  };
  const openCategory = (next: AtelierCategory) => {
    setActiveCategory(next);
    setPanel(null);
    setShowWelcome(false);
    if (next === "create") {
      chooseWorkspace("create");
      setRightSection("properties");
      setMobileInspectorOpen(false);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setMobileLibraryOpen(true);
      return;
    }
    if (next === "stitch") chooseWorkspace("stitch");
    else chooseWorkspace("create");
    if (next === "compose") setTool("hand");
    openRightPanel(next === "stitch" ? "follow" : next === "threads" ? "prepare" : "edit");
  };
  const useImportedPattern = async (p: Pattern, keepGenerator = false) => {
    try {
      if (!await loadPattern(p)) return false;
      setWorkspace("create"); setView("flat"); setTool("hand");
      setActiveCategory("compose"); setRightSection("properties");
      setAutoImage(null); if (!keepGenerator) setPromptOpen(false); setPdfFile(null);
      notify("Motif ouvert dans la grille. Composer / décomposer reste disponible dans Dessiner.");
      return true;
    } catch { return false; }
  };
  const createActions = {
    prompt: promptText, onPrompt: setPromptText,
    onGenerate: () => setPromptOpen(true),
    onImport: importAnyFile,
    onBlank: () => { panelActions.new(80, 80); setActiveCategory("compose"); setShowDrawingTools(false); },
    onLibrary: () => { setShowWelcome(false); setPanel("library"); },
  };
  const contextSection: "prepare" | "edit" | "follow" | "settings" =
    rightSection === "properties" || rightSection === "motifs" ? "edit" : rightSection;
  const enterStitchStudio = (entry: StitchEntry) => {
    if (entry === "library") { switchStudio("buro"); return; }
    switchStudio("embroidery");
    openCategory(entry === "prepare" ? "threads" : entry === "stitch" ? "stitch" : "create");
  };
  return studioMode === "buro"
    ? <Buro currentName={P.name}
        onOpen={p => { void loadPattern(p).then(ok => { if (ok) { setShowWelcome(false); setTool("hand"); setDockPath(null); switchStudio("embroidery"); } }); }}
        onContinue={() => { setShowWelcome(false); switchStudio("embroidery"); }}
        onNew={() => { panelActions.new(80, 80); setShowWelcome(false); setActiveCategory("compose"); setDockPath("dessiner"); switchStudio("embroidery"); }}
        onImport={f => { importAnyFile(f); switchStudio("embroidery"); }}
        onGenerate={() => { setShowWelcome(false); switchStudio("embroidery"); setPromptOpen(true); }}
        onModels={() => switchStudio("pattern-boutique")}
        onWatch={() => { setShowWelcome(false); switchStudio("embroidery"); setPanel("share"); }}
        onInvite={p => { void loadPattern(p).then(ok => { if (ok) { setShowWelcome(false); switchStudio("embroidery"); setPanel("share"); } }); }}
        onHome={() => switchStudio("stitch-home")} />
    : studioMode === "pattern-boutique"
    ? <PatternBoutique onBack={() => switchStudio("stitch-home")} onCreate={() => { switchStudio("embroidery"); setShowWelcome(true); }} onGenerate={() => { switchStudio("embroidery"); setShowWelcome(false); setPromptOpen(true); }} onOpenPattern={p => { void loadPattern(p).then(ok => { if (ok) { switchStudio("embroidery"); setTool("hand"); } }); }} />
    : studioMode === "stitch-home"
    ? <CrossStitchHome projectName={P.name} onOpen={enterStitchStudio}
        onShop={() => switchStudio("pattern-boutique")}
        onBuro={() => switchStudio("buro")}
        onShare={() => { switchStudio("embroidery"); setPanel("share"); }}
        onImport={chosen => { switchStudio("embroidery"); importAnyFile(chosen); }}/>
    : <div data-interface-level={interfaceLevel} className={`pz-atelier pz-embroidery-studio fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#faf9f7] ${prefs.largeText ? "large-text" : ""} ${prefs.highContrast ? "high-contrast" : ""}`}>
    <input
      ref={imageInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="sr-only"
      aria-label="Choisir une image à composer"
      onChange={e=>{const selected=e.target.files?.[0];e.target.value="";if(selected)setAutoImage(selected);}}
    />
    <input
      ref={projectInputRef}
      type="file"
      accept=".json,.oxs,application/json"
      aria-label="Sélectionner un projet POINTZERO JSON"
      className="sr-only"
      onChange={e => {
        const chosen = e.target.files?.[0];
        e.target.value = "";
        if (chosen) void openProjectFromFile(chosen);
      }}
    />
    <input ref={actionImportRef} type="file" className="sr-only" aria-label="Importer une image, un PDF ou un projet" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={e=>{const selected=e.target.files?.[0];e.target.value="";if(selected)importAnyFile(selected);}}/>
    <Canvas pattern={P} tool={remote ? "hand" : tool} color={color} view={view} symbols={symbols} highlightActive={workspace === "stitch"} insets={insets} fitKey={fitKey} onlyActive={prefs.onlyActive} highContrast={prefs.highContrast} pencilOnly={prefs.pencilOnly} symmetry={prefs.symmetry} annotation={prefs.annotation} readOnly={!!remote} selection={selection} halfDirection={prefs.halfDirection}
      onSelection={setSelection} onBegin={() => { if (!remote) dispatch({ type: "begin" }); }}
      onLive={(p) => { if (!remote) dispatch({ type: "live", pattern: p }); }}
      onEnd={(changed) => { if (!remote) dispatch({ type: "end", changed }); }}
      onPick={(idx) => { setColor(idx); if (tool === "pick") setTool(prevTool.current); }}
      onSubjectStart={subjectStart} onSubjectMove={subjectMoveTo} onSubjectEnd={subjectEnd}
      onMotifDrop={(id,x,y) => { const preset = getMotifPreset(id); if (preset) addStitchedPattern(preset,{x,y}); }} />
    {depot && <div className="pzs-depot-voile" aria-hidden="true"><span>Déposez ici : l’ouvrage s’ouvre dans la grille</span></div>}
    {!pdfFile && !promptOpen && !compositionInput && !file && !autoImage && <StudioDocks
      patternName={P.name} saving={saving} workspace={workspace}
      onWorkspace={mode => { chooseWorkspace(mode); setActiveCategory(mode === "stitch" ? "stitch" : "compose"); setShowWelcome(false); }}
      tool={remote ? "hand" : tool} onTool={chooseTool}
      level={interfaceLevel} onLevel={(value: InterfaceLevel) => {
        setInterfaceLevel(value);
        setShowDrawingTools(value === "expert");
        try { localStorage.setItem(INTERFACE_LEVEL_KEY, value); } catch { notify("Affichage changé pour cette session uniquement."); }
      }}
      view={view} onView={setView} symbols={symbols} onSymbols={() => setSymbols(v => !v)}
      canUndo={!remote && store.past.length > 0 && !store.pending}
      canRedo={!remote && store.future.length > 0 && !store.pending}
      onUndo={() => dispatch({ type: "undo" })} onRedo={() => dispatch({ type: "redo" })}
      colorHex={FLOSS[color]?.hex ?? "#000000"} colorLabel={FLOSS[color] ? "DMC " + FLOSS[color].code : "Aucun fil"}
      path={dockPath} onPath={next => { setDockPath(next); if (next) setShowWelcome(false); }}
      inspectorOpen={mobileInspectorOpen} readOnly={!!remote}
      visibility={visibilityOf(P.id)}
      onVisibility={value => {
        if (!P.id) { notify("Enregistrez d’abord ce projet pour choisir sa visibilité."); return; }
        if (writeVisibility(P.id, value)) { setVisibilityTick(t => t + 1); notify("Visibilité : " + VISIBILITY[value].label.toLowerCase() + ". Le partage en ligne arrive avec les comptes."); }
        else notify("Cet appareil refuse d’enregistrer ce réglage.");
      }}
      actions={{
        buro: () => switchStudio("buro"),
        home: () => switchStudio("stitch-home"),
        shop: () => switchStudio("pattern-boutique"),
        settings: () => openRightPanel("settings"),
        share: () => setPanel("share"),
        motifs: () => openRightPanel("motifs"),
        exportPanel: () => setPanel("export"),
        save: panelActions.save,
        palette: () => setPanel("palette"),
        threadsSettings: () => openRightPanel("prepare"),
        follow: () => openRightPanel("follow"),
        drawSettings: () => { setActiveCategory("compose"); openRightPanel("edit"); },
        layers: () => { if (mobileInspectorOpen && rightSection === "properties") setMobileInspectorOpen(false); else openRightPanel("properties"); },
        visite: () => setVisite(true),
      }}
      zoom={{
        zoomIn: () => window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "zoomIn" } })),
        zoomOut: () => window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "zoomOut" } })),
        magnify: () => window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "magnify" } })),
        fit: () => setFitKey(k => k + 1),
      }}
      progression={progression} onCouleur={pickColor}
      ouvrages={{ courant: P.id, ouvrir: id => { void ouvrirOuvrage(id); }, importer: importAnyFile }}
      fils={<FlossRail dock pattern={P} active={color} onActive={pickColor} onPattern={(p) => setPattern(p)} onSupply={updateSupply} onBrowse={() => setPanel("palette")} stitching={workspace === "stitch"} hidden={showWelcome || !!file} />} />}
    {atelierLibre && <OrbeGuide ouverte={visite} onFermer={() => setVisite(false)} onChemin={setDockPath} />}
    <aside aria-label="Inspecteur de broderie"
      hidden={!mobileInspectorOpen}
      className="pz-embroidery-right pzs-panel thin-scroll fixed bottom-[96px] right-3 top-[112px] z-30 w-[min(300px,calc(100vw-24px))] overflow-y-auto rounded-[18px] border border-white/15 bg-[#09090b] text-white shadow-2xl">
      <button type="button" className="pzs-panel-close" aria-label="Fermer le panneau" onClick={() => setMobileInspectorOpen(false)}>×</button>
      <nav className="sticky top-0 z-10 grid grid-cols-3 gap-1 border-b border-white/10 bg-[#09090b] p-2 pr-11" aria-label="Sections de l'inspecteur">
        {([
          ["properties","Calques"],["motifs","Motifs"],["settings","Réglages"],
        ] as [RightSection,string][]).map(([id,label]) =>
          <button key={id} type="button" aria-pressed={rightSection===id}
            onClick={() => openRightPanel(id)}
            className={"min-h-9 rounded-[var(--pz-radius-sm)] px-1 text-[11px] font-semibold transition-colors "+(rightSection===id ? "bg-[var(--pz-brand)] text-[var(--pz-brand-ink)]" : "text-white/75 hover:bg-white/10")}>{label}</button>)}
      </nav>
      {rightSection === "motifs" ? (
        <MotifLibrary docked readOnly={!!remote}
          onAdd={id => { const preset = getMotifPreset(id); if (preset) addStitchedPattern(preset); setMobileInspectorOpen(false); }}
          onAddSaved={sprite => { addStitchedPattern(sprite); setMobileInspectorOpen(false); }}
          onOpenProject={p => { void loadPattern(p); setTool("hand"); setMobileInspectorOpen(false); }}
          onBlank={() => { panelActions.new(80,80); setTool("hand"); setMobileInspectorOpen(false); }}
          onOpenLibrary={() => { setMobileInspectorOpen(false); setPanel("library"); }} />
      ) : rightSection === "properties" ? (
        <EmbroideryInspector pattern={P} activeColor={color}
          onSettings={() => openRightPanel("settings")}
          onBrowse={() => { setMobileInspectorOpen(false); setPanel("palette"); }} workspace={workspace}
          scene={sceneFromPattern(P)} selectedId={selectedSubjectId}
          onSelect={id => {setSelectedSubjectId(id);setActiveCategory("compose");setTool("hand");}}
          onChange={changeSelectedSubject} onReorder={(id,delta) => updateScene(scene=>reorderSubject(scene,id,delta))}
          onDuplicate={duplicateSelectedSubject} onRemove={removeSelectedSubject} readOnly={!!remote}/>
      ) : (
        <div className="px-3 py-3">
          <div className="mb-3 border-b border-white/10 pb-3">
            <h2 className="text-[14px] font-semibold">{{
              edit:"Composer",prepare:"Fils & toile",follow:"Broder",settings:"Réglages & aide"
            }[contextSection]}</h2>
            <p className="mt-1 truncate text-[11px] text-white/50">{P.name}</p>
          </div>
          <WorkspacePanel key={contextSection} level={interfaceLevel} inline open onClose={() => openRightPanel("properties")} pattern={P} onSet={setPattern}
            actions={panelActions} prefs={prefs} onPrefs={setPrefs} color={color}
            onColor={setColor} workspace={workspace} section={contextSection}
            extraActions={contextSection === "edit" ? <button type="button" className="btn-tinted" disabled={!!remote} onClick={openComposition}>Composer / décomposer le motif</button> : undefined} />
        </div>
      )}
    </aside>
    {showWelcome && !remote && <div className="pointer-events-none fixed inset-0 z-[28] flex items-center justify-center px-3 pb-12 pt-12"><div className="pointer-events-auto"><AtelierCreate {...createActions} /></div></div>}
    {!showWelcome && selection && workspace === "create" && !remote && <SelectionBar selection={selection} hasClipboard={!!clipboard} onAction={selectionAction} />}
    <PaletteSheet open={panel === "palette"} onClose={closePanel} pattern={P} color={color} onPick={pickColor} />
    <LibrarySheet compte={compteAime} open={panel === "library"} onClose={closePanel} onLoad={(p) => void loadPattern(p)} onNew={() => panelActions.new(80, 80)} inventory={inventory} />
    {autoImage && <AutomaticImageImport file={autoImage}
      onCancel={() => setAutoImage(null)}
      onReady={async p => { if (!await useImportedPattern(p)) throw new Error("Projet précédent conservé : exportez son JSON puis réessayez."); }}/> }
    {file && <ImportStudio file={file} onClose={() => setFile(null)} onImport={(p) => {
      void useImportedPattern(p);
    }} />}
    {pdfFile && (
      <ErrorBoundary label="La préparation du PDF" onReset={() => setPdfFile(null)}>
        <PdfPrep
          file={pdfFile}
          integrated
          onClose={() => setPdfFile(null)}
          onImport={p => { void useImportedPattern(p); }}
        />
      </ErrorBoundary>
    )}
    {promptOpen && <PromptStudio initialPrompt={promptText} onClose={() => setPromptOpen(false)} onImport={p => { void useImportedPattern(p, true); }} embedded /> }
    {compositionInput && (
      <ErrorBoundary label="Le moteur de composition" onReset={() => setCompositionInput(null)}>
        <CompositionStudio
          pattern={compositionInput}
          embedded
          onCancel={() => setCompositionInput(null)}
          onUse={async p => {
            if (!await loadPattern(p)) return;
            setCompositionInput(null);
            setWorkspace("create"); setView("pattern");
            notify("Motif composé. La source reste dans le JSON ; contrôlez les détails avant de broder.");
          }}
        />
      </ErrorBoundary>
    )}
    {panel === "export" && <ExportStudio pattern={P} onClose={closePanel} />}
    <PeerShare open={panel === "share"} onClose={closePanel} pattern={store.present} onView={onRemote} />
    {remote && <button onClick={() => { window.dispatchEvent(new Event("pointzero:disconnect")); setRemote(null); }} className="glass fixed left-1/2 top-[124px] z-30 -translate-x-1/2 rounded-full px-4 py-2 text-[12px] text-accent-2">Lecture partagée · revenir à mon projet</button>}
    {toast && <div role="status" aria-live="polite" className="toast-in glass pointer-events-none fixed left-1/2 z-[80] max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-[14px] px-4 py-2.5 text-center text-[13px] font-medium" style={{ bottom: dockPath === "fils" ? 210 : 104 }}>{toast}</div>}
    <span className="sr-only">Direction B. {BASE_FLOSS.length} références DMC documentées. {FLOSS[color]?.name}.</span>
  </div>;
}
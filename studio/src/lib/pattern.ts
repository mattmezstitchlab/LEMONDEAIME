import { lirePhoto } from "./photoSource";
import { lireRecetteOuvrage } from "./motif5d/code";
import { FLOSS, flossIndex } from "./dmc";
import { SYMBOL_COUNT } from "./symbols";

/** La toile par défaut : un Aida gris très clair (l'ancien crème, jamais choisi par la brodeuse, est relu comme tel). */
export const TOILE_DEFAUT = "#f3f3f1";
export const TOILE_ANCIENNE = "#f7f2e8";
export type Count = 7 | 11 | 14 | 16 | 18 | 20 | 22 | 25 | 28 | 32 | 36 | 40;
export const COUNTS: Count[] = [7, 11, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40];
export const SIZES = [40, 80, 120, 200, 300];

export interface FabricSettings {
  type: "aida" | "linen" | "evenweave";
  over: 1 | 2;
  color: string;
  margin: number;
  units: "cm" | "in";
}
export interface Provenance {
  kind: "original" | "image" | "pdf" | "oxs" | "demo" | "galerie";
  source: string;
  author: string;
  license: string;
  personalOnly: boolean;
}
export interface Supply { whole: number; partialMeters: number; lot: string }
export interface Parked { x: number; y: number; corner: number; c: number }
export interface Annotation { x: number; y: number; text: string }
export interface Session { date: string; seconds: number; cells: number }
export interface Layer { id: string; name: string; visible: boolean; locked: boolean; snapshot: string | null }
export interface Special { x: number; y: number; c: number; kind: "petite" | "bead" }

/** DMC : un écheveau standard contient 8 m de mouliné à 6 brins = 48 m de brin simple. */
export const SKEIN_M = 8;
export const SKEIN_STRAND_M = 48;
/** Marge de chute, départs/arrêts et défaits, usuelle en planification. */
export const WASTE = 1.15;

/**
 * Consommation totale des brins simples, en multiples du pas de toile (2,54 / comptage).
 * Croix : 2,5 cm de longueur de travail à 2 brins sur Aida 14, soit ~5 cm
 * cumulés de brin simple (modèle d'estimation, pas mesure fabricant).
 * Demi-point : moitié. Quart de point : ~2 pas. Arrière : ~3 pas (1 brin en général).
 * Lancé : aller-retour par brin. Noeud français : ~2 cm par brin.
 */
const CROSS_K = 14;
const HALF_K = 7;
const QUARTER_K = 4;
const BACK_K = 3;
const LONG_K = 2;
const KNOT_CM = 2;

export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  c: number;
}
export interface Knot {
  x: number;
  y: number;
  c: number;
}

/**
 * Motif. Les tableaux de cases stockent l'index FLOSS (ou -1).
 * - cross : point de croix (case entière)
 * - fwd / bwd : demi-points « / » et « \ »
 * - q[0..3] : quarts de point NW, NE, SE, SW (du coin vers le centre) ;
 *   un demi-point + un quart = trois-quarts de point, comme sur les vraies grilles.
 * - done : marquage d'avancement (points déjà brodés)
 * Les points arrière, lancés et noeuds vivent sur les trous (0..w / 0..h).
 */
export interface CompositionMetadata {
  version: 1;
  source: string;
  settings: {
    detail: "simple" | "equilibree" | "precise";
    difficulty: "debutant" | "intermediaire" | "expert";
    palette: "originale" | "harmonisee" | "personnalisee" | "complementaire" | "douce" | "contrastee";
    codes: string; width: number; height: number; count?: Count;
  };
  cards: { id: string; name: string; visible: boolean; overrideCode?: string }[];
}

export interface Pattern {
  /** Optional auditable DMC adaptation recipe. Original sprite scene unaffected. */
  adaptation?: {
    version:1;mode: import("./brodeuseProfile").AdaptationMode;
    substitutions:{from:string;to:string;deltaE:number}[];
    warnings:string[];profileBrand:string;
  };
  /** Autonomous reusable subject layers; optional in legacy projects. */
  subjectScene?: import("./subjectEngine").SubjectScene;
  /** Optional recipe; legacy projects remain compatible and unchanged. */
  composition?: CompositionMetadata;
  name: string;
  w: number;
  h: number;
  count: Count;
  strands: number;
  cross: Int16Array;
  fwd: Int16Array;
  bwd: Int16Array;
  q: [Int16Array, Int16Array, Int16Array, Int16Array];
  done: Uint8Array;
  back: Seg[];
  long: Seg[];
  knots: Knot[];
  palette: number[];
  stock: Record<string, number>;
  updated: number;
  id?: string;
  folder?: string;
  fabric?: FabricSettings;
  provenance?: Provenance;
  symbolMap?: Record<string, number>;
  /** Code DMC -> reference de perle fabricant (Miyuki Delica), choisie par la brodeuse. */
  beadMap?: Record<string, string>;
  supplies?: Record<string, Supply>;
  mistakes?: number[];
  parked?: Parked[];
  special?: Special[];
  annotations?: Annotation[];
  notes?: string;
  reference?: string;
  /** La photo d'origine et ses réglages : le Cadre reconvertit depuis elle à chaque nouveau format. */
  photo?: import("./photoSource").PhotoSource;
  /** La recette 5D d'un motif composé : le Cadre la régénère à une autre taille. */
  recette?: import("./motif5d/code").RecetteOuvrage;
  sessions?: Session[];
  layers?: Layer[];
  activeLayer?: string;
  backStrands?: number;
  waste?: number;
  ornamentDone?: string[];
}

const clampN = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** Garde-fou de désérialisation : un objet plat code -> code, ou rien. */
const isCodeMap = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === "object" && !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((x) => typeof x === "string" && x.length <= 40);
export const makeId = () => globalThis.crypto?.randomUUID?.() ?? `pz-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
const q4 = (n: number): Pattern["q"] => [
  new Int16Array(n).fill(-1),
  new Int16Array(n).fill(-1),
  new Int16Array(n).fill(-1),
  new Int16Array(n).fill(-1),
];

export function createPattern(name: string, w: number, h: number, count: Count = 14, strands = 2): Pattern {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 1000 || h > 1000) throw new Error("Grille : dimensions entières de 1 à 1000 requises");
  const n = w * h;
  return {
    id: makeId(),
    name,
    w,
    h,
    count,
    strands,
    cross: new Int16Array(n).fill(-1),
    fwd: new Int16Array(n).fill(-1),
    bwd: new Int16Array(n).fill(-1),
    q: q4(n),
    done: new Uint8Array(n),
    back: [],
    long: [],
    knots: [],
    palette: [],
    stock: {},
    fabric: { type: "aida", over: 1, color: TOILE_DEFAUT, margin: 7.5, units: "cm" },
    provenance: { kind: "original", source: "", author: "", license: "Tous droits réservés", personalOnly: false },
    symbolMap: {}, supplies: {}, mistakes: [], parked: [], special: [], annotations: [], notes: "", sessions: [], layers: [],
    updated: Date.now(),
  };
}

export function clonePattern(p: Pattern): Pattern {
  return {
    ...p,
    composition: p.composition ? { ...p.composition, settings: { ...p.composition.settings }, cards: p.composition.cards.map(c => ({ ...c })) } : undefined,
    subjectScene: p.subjectScene ? { ...p.subjectScene, layers: p.subjectScene.layers.map(l=>({...l})), warnings:[...p.subjectScene.warnings] } : undefined,
    adaptation:p.adaptation ? { ...p.adaptation, substitutions:p.adaptation.substitutions.map(s=>({...s})), warnings:p.adaptation.warnings.slice()} : undefined,
    cross: p.cross.slice(),
    fwd: p.fwd.slice(),
    bwd: p.bwd.slice(),
    q: [p.q[0].slice(), p.q[1].slice(), p.q[2].slice(), p.q[3].slice()],
    done: p.done.slice(),
    back: p.back.slice(),
    long: p.long.slice(),
    knots: p.knots.slice(),
    palette: p.palette.slice(),
    stock: { ...p.stock },
    symbolMap: { ...p.symbolMap }, beadMap: { ...p.beadMap }, supplies: { ...p.supplies },
    mistakes: [...(p.mistakes ?? [])], parked: [...(p.parked ?? [])],
    special: [...(p.special ?? [])], annotations: [...(p.annotations ?? [])],
    layers: (p.layers ?? []).map((l) => ({ ...l })), sessions: [...(p.sessions ?? [])],
    ornamentDone: [...(p.ornamentDone ?? [])],
  };
}

/** Ajoute un fil à la palette du projet (sa position détermine son symbole). */
export function ensurePalette(p: Pattern, idx: number) {
  if (!p.palette.includes(idx)) {
    p.palette = [...p.palette, idx];
    const used = new Set(p.palette.filter((v) => v !== idx).map((v) => assignedSymbol(p, v)));
    let sym = 0;
    while (used.has(sym) && sym < SYMBOL_COUNT) sym++;
    if (sym >= SYMBOL_COUNT) throw new Error("Bibliothèque de symboles saturée");
    p.symbolMap = { ...p.symbolMap, [FLOSS[idx].code]: sym };
  }
}

export function assignedSymbol(p: Pattern, idx: number) {
  return p.symbolMap?.[FLOSS[idx]?.code] ?? Math.max(0, p.palette.indexOf(idx));
}

export function effectiveCount(p: Pattern) { return p.count / (p.fabric?.over ?? 1); }

export function ornamentKey(kind: string, v: Seg | Knot | Special): string {
  const code = FLOSS[v.c]?.code ?? "?";
  return "x1" in v ? `${kind}:DMC=${code}:${v.x1},${v.y1},${v.x2},${v.y2}` : `${kind}:DMC=${code}:${v.x},${v.y}`;
}

/**
 * Instantanés de calques déjà relus.
 *
 * `compositePattern` est appelée à chaque image du rendu — y compris au simple
 * survol de la grille, qui redessine pour l'infobulle. Sans mémoire, chaque
 * calque non actif était redésérialisé (JSON.parse de tout le motif) à chaque
 * image. La clé est la chaîne de l'instantané : si le calque change, la chaîne
 * change, donc l'entrée devient inaccessible et finit évincée.
 *
 * La mémoire est bornée des deux côtés : on ne garde pas les instantanés d'un
 * motif trop grand (un 1 000 × 1 000 pèse ~15 Mo de tableaux typés une fois
 * relu) et on ne garde que huit entrées, éviction par la plus ancienne.
 */
const SNAPSHOT_CACHE = new Map<string, Pattern>();
const SNAPSHOT_CACHE_CELLS = 250_000;
const SNAPSHOT_CACHE_MAX = 8;

/** Relit l'instantané d'un calque, une fois par version de son contenu. */
function layerSnapshot(json: string, w: number, h: number): Pattern | null {
  const cached = SNAPSHOT_CACHE.get(json);
  if (cached) return cached;
  try {
    const part = fromObject(JSON.parse(json));
    if (!part || part.w !== w || part.h !== h) return null;
    if (w * h <= SNAPSHOT_CACHE_CELLS) {
      if (SNAPSHOT_CACHE.size >= SNAPSHOT_CACHE_MAX) {
        const oldest = SNAPSHOT_CACHE.keys().next();
        if (!oldest.done) SNAPSHOT_CACHE.delete(oldest.value);
      }
      SNAPSHOT_CACHE.set(json, part);
    }
    return part;
  } catch {
    /* Un calque optionnel corrompu ne doit pas faire tomber le projet en cours. */
    return null;
  }
}

export function compositePattern(p: Pattern): Pattern {
  if (!p.layers?.length) return p;
  const out = createPattern(p.name, p.w, p.h, p.count, p.strands);
  const merge = (part: Pattern) => {
    for (let i = 0; i < out.cross.length; i++) {
      if (cellHasContent(part, i)) {
        out.cross[i] = part.cross[i]; out.fwd[i] = part.fwd[i]; out.bwd[i] = part.bwd[i];
        for (let k = 0; k < 4; k++) out.q[k][i] = part.q[k][i];
      }
    }
    out.back.push(...part.back); out.long.push(...part.long); out.knots.push(...part.knots);
    out.special = [...(out.special ?? []), ...(part.special ?? [])];
  };
  for (const layer of p.layers) {
    if (!layer.visible) continue;
    if (layer.id === p.activeLayer) merge(p);
    else if (layer.snapshot) {
      const part = layerSnapshot(layer.snapshot, p.w, p.h);
      if (part) merge(part);
    }
  }
  return { ...p, cross: out.cross, fwd: out.fwd, bwd: out.bwd, q: out.q, back: out.back, long: out.long, knots: out.knots, special: out.special, layers: [] };
}

/** La case contient-elle au moins un point comptable ? */
export function cellHasContent(p: Pattern, i: number): boolean {
  return (
    p.cross[i] >= 0 || p.fwd[i] >= 0 || p.bwd[i] >= 0 || p.q[0][i] >= 0 || p.q[1][i] >= 0 || p.q[2][i] >= 0 || p.q[3][i] >= 0
  );
}

export interface ColorStat {
  idx: number;
  code: string;
  name: string;
  hex: string;
  pos: number;
  cross: number;
  half: number;
  quarter: number;
  back: number;
  long: number;
  knots: number;
  cells: number;
  done: number;
  meters: number;
  skeins: number;
  owned: number;
  petite: number;
  beads: number;
}

export interface Totals {
  cross: number;
  half: number;
  quarter: number;
  backCm: number;
  longCm: number;
  knots: number;
  colors: number;
  meters: number;
  skeins: number;
  contentCells: number;
  doneCells: number;
  units: number;
  doneUnits: number;
}

export function pitchCm(count: Count) {
  return 2.54 / count;
}

/**
 * Longueur cumulée de brin simple, en cm, pour une ligne de couleur et un
 * comptage effectif donné (points par pouce). C'est la seule formule de
 * consommation de l'app : l'export PDF et la légende l'utilisent aussi, pour
 * que le nombre d'écheveaux annoncé soit le même partout.
 */
export function consumptionCm(r: ColorStat, p: Pattern, effective: number): number {
  const pitch = 2.54 / Math.max(1, effective);
  const strands = FLOSS[r.idx]?.blend?.reduce((n, b) => n + b.strands, 0) ?? p.strands;
  return (
    r.cross * strands * CROSS_K * pitch +
    r.half * strands * HALF_K * pitch +
    r.quarter * strands * QUARTER_K * pitch +
    r.back * BACK_K * pitch * (p.backStrands ?? 1) +
    r.long * LONG_K * strands * pitch +
    r.knots * KNOT_CM * strands +
    r.petite * CROSS_K * pitch / 2 * strands
  );
}

/**
 * Écheveaux nécessaires si le motif était brodé sur un autre comptage de toile.
 * Chaque fil est arrondi séparément : on n'achète pas un quart d'écheveau.
 */
export function skeinsAtCount(p: Pattern, rows: ColorStat[], effective: number): number {
  let total = 0;
  for (const r of rows) {
    const meters = (consumptionCm(r, p, effective) * (p.waste ?? WASTE)) / 100;
    if (meters > 0) total += Math.ceil(meters / SKEIN_STRAND_M);
  }
  return total;
}

export function computeStats(input: Pattern): { rows: ColorStat[]; totals: Totals } {
  const p = compositePattern(input);
  const map = new Map<number, ColorStat>();
  const get = (idx: number) => {
    let s = map.get(idx);
    if (!s) {
      const f = FLOSS[idx];
      s = {
        idx,
        code: f.code,
        name: f.name,
        hex: f.hex,
        pos: assignedSymbol(p, idx),
        cross: 0,
        half: 0,
        quarter: 0,
        back: 0,
        long: 0,
        knots: 0,
        cells: 0,
        done: 0,
        meters: 0,
        skeins: 0,
        owned: (p.supplies?.[f.code]?.whole ?? p.stock[f.code] ?? 0) + (p.supplies?.[f.code]?.partialMeters ?? 0) / SKEIN_M,
        petite: 0, beads: 0,
      };
      map.set(idx, s);
    }
    return s;
  };

  const n = p.w * p.h;
  const finishedDetails = new Set(p.ornamentDone ?? []);
  let detailUnits = 0, doneDetails = 0;
  const detail = (kind: string, v: Seg | Knot | Special) => {
    const row = get(v.c); row.cells++; detailUnits++;
    if (finishedDetails.has(ornamentKey(kind, v))) { row.done++; doneDetails++; }
  };
  let cross = 0;
  let half = 0;
  let quarter = 0;
  let contentCells = 0;
  let doneCells = 0;
  for (let i = 0; i < n; i++) {
    let has = false;
    const cellColors = new Set<number>();
    const a = p.cross[i];
    if (a >= 0) {
      get(a).cross++;
      cellColors.add(a);
      cross++;
      has = true;
    }
    const f = p.fwd[i];
    if (f >= 0) {
      get(f).half++;
      cellColors.add(f);
      half++;
      has = true;
    }
    const b = p.bwd[i];
    if (b >= 0) {
      get(b).half++;
      cellColors.add(b);
      half++;
      has = true;
    }
    for (let k = 0; k < 4; k++) {
      const v = p.q[k][i];
      if (v >= 0) {
        get(v).quarter++;
        cellColors.add(v);
        quarter++;
        has = true;
      }
    }
    if (has) {
      contentCells++;
      if (p.done[i]) doneCells++;
      for (const idx of cellColors) {
        get(idx).cells++;
        if (p.done[i]) get(idx).done++;
      }
    }
  }

  let backCells = 0;
  for (const s of p.back) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    get(s.c).back += len;
    backCells += len;
    detail("back", s);
  }
  let longCells = 0;
  for (const s of p.long) {
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    get(s.c).long += len;
    longCells += len;
    detail("long", s);
  }
  for (const k of p.knots) { get(k.c).knots++; detail("knot", k); }
  for (const k of p.special ?? []) {
    const row = get(k.c);
    if (k.kind === "bead") row.beads++; else row.petite++;
    detail(k.kind, k);
  }

  let totalM = 0;
  let totalSk = 0;
  const pitch = 2.54 / effectiveCount(p);
  for (const s of map.values()) {
    const cm = consumptionCm(s, p, effectiveCount(p));
    // meters = somme des longueurs de chacun des brins séparés.
    s.meters = (cm * (p.waste ?? WASTE)) / 100;
    s.skeins = s.meters > 0 ? Math.ceil(s.meters / SKEIN_STRAND_M) : 0;
    totalM += s.meters;
    totalSk += s.skeins;
  }

  const rows = [...map.values()].sort((a, b) => (a.pos < 0 ? 1e9 : a.pos) - (b.pos < 0 ? 1e9 : b.pos));
  return {
    rows,
    totals: {
      cross,
      half,
      quarter,
      backCm: backCells * pitch,
      longCm: longCells * pitch,
      knots: p.knots.length,
      colors: map.size,
      meters: totalM,
      skeins: totalSk,
      contentCells,
      doneCells,
      units: contentCells + detailUnits,
      doneUnits: doneCells + doneDetails,
    },
  };
}

/** Taille finie = nombre de points / comptage du tissu (pouces) → cm. */
export function fabricInfo(p: Pattern) {
  const pitch = 2.54 / effectiveCount(p);
  const fw = p.w * pitch;
  const fh = p.h * pitch;
  return {
    pitchMm: 25.4 / effectiveCount(p),
    fw,
    fh,
    mw: fw + (p.fabric?.margin ?? 7.5) * 2,
    mh: fh + (p.fabric?.margin ?? 7.5) * 2,
  };
}

export function toObject(p: Pattern) {
  return {
    v: 3,
    composition: p.composition,
    subjectScene: p.subjectScene,
    adaptation:p.adaptation,
    id: p.id, folder: p.folder, fabric: p.fabric, provenance: p.provenance,
    backStrands: p.backStrands, waste: p.waste,
    ornamentDone: p.ornamentDone,
    symbolMap: p.symbolMap, beadMap: p.beadMap, supplies: p.supplies, mistakes: p.mistakes,
    parked: p.parked, special: p.special, annotations: p.annotations,
    notes: p.notes, reference: p.reference, photo: p.photo, recette: p.recette, sessions: p.sessions, layers: p.layers, activeLayer: p.activeLayer,
    // Les points sont stockés par indices pour rester compacts. Cette table rend
    // le fichier stable même si l'ordre de la palette DMC évolue dans une version future.
    flossCodes: FLOSS.map((f) => f.code),
    name: p.name,
    w: p.w,
    h: p.h,
    count: p.count,
    strands: p.strands,
    cross: Array.from(p.cross),
    fwd: Array.from(p.fwd),
    bwd: Array.from(p.bwd),
    q0: Array.from(p.q[0]),
    q1: Array.from(p.q[1]),
    q2: Array.from(p.q[2]),
    q3: Array.from(p.q[3]),
    done: Array.from(p.done),
    back: p.back,
    long: p.long,
    knots: p.knots,
    palette: p.palette,
    stock: p.stock,
    updated: Date.now(),
  };
}

export function fromObject(input: unknown): Pattern | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const w = Number(o.w);
  const h = Number(o.h);
  if (!(Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w <= 1000 && h <= 1000)) return null;
  const n = w * h;
  const sourceCodes = Array.isArray(o.flossCodes) ? (o.flossCodes as unknown[]) : null;
  // Les anciens fichiers ne contenaient pas la table des codes : après extension de
  // la palette, leurs indices sont ambigus. Refuser vaut mieux que changer les couleurs silencieusement.
  if (!sourceCodes || sourceCodes.some((v) => typeof v !== "string")) return null;
  const indexMap = sourceCodes.map((code) => flossIndex(code as string));
  const remap = (v: number) => (v < 0 ? -1 : indexMap[v] ?? -1);
  const arr = (k: string) => (Array.isArray(o[k]) && (o[k] as number[]).length === n ? (o[k] as number[]) : null);
  const cross = arr("cross");
  const fwd = arr("fwd");
  const bwd = arr("bwd");
  if (!cross || !fwd || !bwd) return null;
  if ([cross, fwd, bwd].some((a) => a.some((v) => !Number.isInteger(v) || v < -1 || v >= sourceCodes.length))) return null;
  for (const key of ["q0", "q1", "q2", "q3"]) {
    if (o[key] !== undefined && (!arr(key) || arr(key)!.some((v) => !Number.isInteger(v) || v < -1 || v >= sourceCodes.length))) return null;
  }
  const validNode = (v: unknown, segment = false) => {
    if (!v || typeof v !== "object") return false;
    const a = v as Record<string, unknown>;
    if (!Number.isInteger(a.c) || Number(a.c) < 0 || Number(a.c) >= sourceCodes.length || remap(Number(a.c)) < 0) return false;
    const pairs = segment ? [["x1", "y1"], ["x2", "y2"]] : [["x", "y"]];
    return pairs.every(([x, y]) => typeof a[x] === "number" && Number.isFinite(a[x]) && Number(a[x]) >= 0 && Number(a[x]) <= w && typeof a[y] === "number" && Number.isFinite(a[y]) && Number(a[y]) >= 0 && Number(a[y]) <= h);
  };
  for (const key of ["back", "long", "knots", "special", "parked"]) {
    if (o[key] !== undefined && (!Array.isArray(o[key]) || (o[key] as unknown[]).some((v) => !validNode(v, key === "back" || key === "long")))) return null;
  }
  if (Array.isArray(o.parked) && (o.parked as Parked[]).some((v) => !Number.isInteger(v.corner) || v.corner < 0 || v.corner > 3)) return null;
  if (Array.isArray(o.special) && (o.special as Special[]).some((v) => v.kind !== "bead" && v.kind !== "petite")) return null;
  const rawFabric = o.fabric && typeof o.fabric === "object" ? o.fabric as Partial<FabricSettings> : {};
  const fabric: FabricSettings = {
    type: rawFabric.type === "linen" || rawFabric.type === "evenweave" ? rawFabric.type : "aida",
    over: rawFabric.type !== "aida" && rawFabric.over === 2 ? 2 : 1,
    color: typeof rawFabric.color === "string" && /^#[0-9a-f]{6}$/i.test(rawFabric.color) && rawFabric.color.toLowerCase() !== TOILE_ANCIENNE ? rawFabric.color : TOILE_DEFAUT,
    margin: Number.isFinite(rawFabric.margin) ? clampN(Number(rawFabric.margin), 0, 30) : 7.5,
    units: rawFabric.units === "in" ? "in" : "cm",
  };
  const i16 = (k: string) => {
    const a = arr(k);
    return a ? Int16Array.from(a, remap) : new Int16Array(n).fill(-1);
  };
  const doneArr = arr("done");
  const countN = Number(o.count) as Count;
  return {
    id: typeof o.id === "string" ? o.id : makeId(),
    backStrands: clampN(Math.round(Number(o.backStrands) || 1), 1, 6), waste: clampN(Number(o.waste) || WASTE, 1, 2),
    ornamentDone: Array.isArray(o.ornamentDone) ? o.ornamentDone.filter((v): v is string => typeof v === "string") : [],
    folder: typeof o.folder === "string" ? o.folder : "",
    fabric,
    composition: (() => {
      const v = o.composition;
      if (!v || typeof v !== "object") return undefined;
      const c = v as Partial<CompositionMetadata>;
      if (c.version !== 1 || typeof c.source !== "string" || c.source.length > 8_000_000 ||
          !c.settings || typeof c.settings !== "object" || !Array.isArray(c.cards) ||
          c.cards.length > 32 ||
          c.cards.some(x => !x || typeof x.id !== "string" || typeof x.name !== "string" ||
            x.name.length > 120 || typeof x.visible !== "boolean" ||
            (x.overrideCode !== undefined && (typeof x.overrideCode !== "string" || x.overrideCode.length > 30)))) return undefined;
      return c as CompositionMetadata;
    })(),
    subjectScene: (() => {
      const value=o.subjectScene;
      if(!value || typeof value!=="object")return undefined;
      const scene=value as import("./subjectEngine").SubjectScene;
      if(scene.version!==1 || typeof scene.source!=="string" || scene.source.length>12_000_000 ||
        typeof scene.backdrop!=="string" || scene.backdrop.length>12_000_000 ||
        !Array.isArray(scene.layers) || scene.layers.length>16 ||
        !Array.isArray(scene.warnings) || scene.warnings.some(v=>typeof v!=="string"||v.length>500) ||
        scene.layers.some(l=> !l || typeof l.id!=="string" || l.id.length>110 ||
          typeof l.name!=="string" || l.name.length>120 ||
          typeof l.sprite!=="string" || l.sprite.length>5_000_000 ||
          !Number.isInteger(l.x) || !Number.isInteger(l.y) ||
          Math.abs(l.x)>1000 || Math.abs(l.y)>1000 ||
          typeof l.scale!=="number" || !Number.isFinite(l.scale) || l.scale<.25 || l.scale>3 ||
          typeof l.visible!=="boolean" || typeof l.locked!=="boolean" ||
          !["auto","manual","library"].includes(l.origin) ||
          (l.tint!==undefined && (typeof l.tint!=="string" || l.tint.length>30))
        ))return undefined;
      return scene;
    })(),
    adaptation: (() => {
      const x=o.adaptation;
      if(!x||typeof x!=="object")return undefined;
      const a=x as NonNullable<Pattern["adaptation"]>;
      if(a.version!==1||!["original","stock","debutant","expert","petit","reduite"].includes(a.mode)||
        typeof a.profileBrand!=="string"||a.profileBrand.length>40||!Array.isArray(a.warnings)||
        a.warnings.length>30||a.warnings.some(v=>typeof v!=="string"||v.length>500)||
        !Array.isArray(a.substitutions)||a.substitutions.length>100||
        a.substitutions.some(t=>!t||typeof t.from!=="string"||typeof t.to!=="string"||
          flossIndex(t.from)<0||flossIndex(t.to)<0||!Number.isFinite(t.deltaE)))return undefined;
      return a;
    })(),
    provenance: o.provenance as Provenance | undefined,
    symbolMap: o.symbolMap as Record<string, number> | undefined,
    beadMap: isCodeMap(o.beadMap) ? (o.beadMap as Record<string, string>) : undefined,
    supplies: o.supplies as Record<string, Supply> | undefined,
    mistakes: Array.isArray(o.mistakes) ? o.mistakes.filter((i) => Number.isInteger(i) && i >= 0 && i < n) : [],
    parked: Array.isArray(o.parked) ? (o.parked as Parked[]).map((k) => ({ ...k, c: remap(k.c) })).filter((k) => k.c >= 0) : [],
    special: Array.isArray(o.special) ? (o.special as Special[]).map((k) => ({ ...k, c: remap(k.c) })).filter((k) => k.c >= 0) : [],
    annotations: Array.isArray(o.annotations) ? o.annotations as Annotation[] : [],
    notes: typeof o.notes === "string" ? o.notes : "",
    reference: typeof o.reference === "string" ? o.reference : undefined,
    photo: lirePhoto(o.photo),
    recette: lireRecetteOuvrage(o.recette),
    sessions: Array.isArray(o.sessions) ? o.sessions as Session[] : [],
    layers: Array.isArray(o.layers) ? o.layers as Layer[] : [],
    activeLayer: typeof o.activeLayer === "string" ? o.activeLayer : undefined,
    name: typeof o.name === "string" ? o.name : "Motif",
    w,
    h,
    count: COUNTS.includes(countN) ? countN : 14,
    strands: clampN(Math.round(Number(o.strands) || 2), 1, 6),
    cross: Int16Array.from(cross, remap),
    fwd: Int16Array.from(fwd, remap),
    bwd: Int16Array.from(bwd, remap),
    q: [i16("q0"), i16("q1"), i16("q2"), i16("q3")],
    done: doneArr ? Uint8Array.from(doneArr) : new Uint8Array(n),
    back: Array.isArray(o.back) ? (o.back as Seg[]).map((s) => ({ ...s, c: remap(s.c) })).filter((s) => s.c >= 0) : [],
    long: Array.isArray(o.long) ? (o.long as Seg[]).map((s) => ({ ...s, c: remap(s.c) })).filter((s) => s.c >= 0) : [],
    knots: Array.isArray(o.knots) ? (o.knots as Knot[]).map((k) => ({ ...k, c: remap(k.c) })).filter((k) => k.c >= 0) : [],
    palette: Array.isArray(o.palette)
      ? [...new Set((o.palette as number[]).map(remap).filter((v) => v >= 0))]
      : [],
    stock: o.stock && typeof o.stock === "object" ? (o.stock as Record<string, number>) : {},
    updated: Date.now(),
  };
}

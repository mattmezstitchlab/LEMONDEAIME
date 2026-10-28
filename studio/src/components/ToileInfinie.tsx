import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Home, X, Users, Heart, Hand, Frame } from "lucide-react";
import CardDeck from "./CardDeck";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { FLOSS } from "../lib/dmc";
import type { Point } from "../lib/slame";
import { couleursZone, reglageDe, type RectZone, type ReglageZone } from "../lib/requant";

/**
 * La toile infinie : le site entier est UNE grille.
 *
 * Pas un fond décoratif : la vraie grille, celle de l'atelier et de la table
 * magnétique — des cases où les croix se posent. Le hero est un format
 * paysage posé dessus, sans fond : le motif (d'ambiance, ou celui qu'on
 * décrit) se brode case par case derrière le champ, à même la toile. Autour,
 * des voisines brodent en direct, la table magnétique du PDF se pose sur la
 * toile avec ses blocs qu'on déplace, et les 54 cartes du SAL forment un
 * tableau — comme les Noces de Cana : des dizaines de scènes, une seule
 * composition. On dézoome lentement et l'on comprend : on est dans la grille.
 *
 * Honnêteté : pas de serveur pour l'instant — les voisines sont simulées en
 * local et le paiement est une démo. C'est écrit sur la toile, en petit.
 */

export const CELL = 26; // une case de la toile, en pixels monde, à zoom 1
const BLOC = 10; // un repère épais tous les dix points, comme sur un patron
const HERO = { w: 50, h: 30 }; // le format paysage du hero, en cases
const K_MIN = 0.05;
const K_MAX = 1.8;

interface Vue {
  x: number;
  y: number;
  k: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function flossIdx(code: string): number {
  const i = FLOSS.findIndex((f) => f.code === code);
  return i >= 0 ? i : 0;
}

/* ------------------------------------------------------------------ */
/*  Les mini-motifs des voisines — déterministes, symétriques, réels   */
/* ------------------------------------------------------------------ */

export interface MiniDesign {
  w: number;
  h: number;
  cross: Int16Array; // indices FLOSS, -1 = toile nue
  palette: number[];
  ordre: number[]; // l'ordre de broderie : rangée par rangée
}

const FILS_DESIGN = ["321", "815", "703", "798", "963", "3865", "434", "907", "517", "739"];

export function miniDesign(seed: number, w = 20, h = 20): MiniDesign {
  const rng = mulberry32(seed * 2654435761);
  const nFils = 3 + Math.floor(rng() * 3);
  const pool = [...FILS_DESIGN];
  const palette: number[] = [];
  for (let i = 0; i < nFils && pool.length; i += 1) {
    palette.push(flossIdx(pool.splice(Math.floor(rng() * pool.length), 1)[0]));
  }
  const cross = new Int16Array(w * h).fill(-1);
  for (let y = 0; y < Math.ceil(h / 2); y += 1) {
    for (let x = 0; x < Math.ceil(w / 2); x += 1) {
      const r = rng();
      // Un cœur plus dense au centre, plus aéré sur les bords : ça ressemble
      // à un vrai petit motif, pas à du bruit.
      const dx = Math.abs(x - (w - 1) / 2) / (w / 2);
      const dy = Math.abs(y - (h - 1) / 2) / (h / 2);
      const densite = 0.82 - 0.45 * Math.max(dx, dy);
      if (r > densite) continue;
      const v = palette[Math.floor(rng() * palette.length)];
      cross[y * w + x] = v;
      cross[y * w + (w - 1 - x)] = v;
      cross[(h - 1 - y) * w + x] = v;
      cross[(h - 1 - y) * w + (w - 1 - x)] = v;
    }
  }
  const ordre: number[] = [];
  for (let i = 0; i < cross.length; i += 1) if (cross[i] >= 0) ordre.push(i);
  return { w, h, cross, palette, ordre };
}

/** Le motif tel qu'il sera livré : chaque case du dessin devient 2 × 2. */
function livrer(d: MiniDesign, titre: string, voisine: Voisine): Pattern {
  const w = d.w * 2;
  const h = d.h * 2;
  const p = createPattern(titre, w, h, 14, 2);
  for (let y = 0; y < d.h; y += 1) {
    for (let x = 0; x < d.w; x += 1) {
      const v = d.cross[y * d.w + x];
      if (v < 0) continue;
      p.cross[y * 2 * w + x * 2] = v;
      p.cross[y * 2 * w + x * 2 + 1] = v;
      p.cross[(y * 2 + 1) * w + x * 2] = v;
      p.cross[(y * 2 + 1) * w + x * 2 + 1] = v;
    }
  }
  for (const v of d.palette) ensurePalette(p, v);
  p.provenance = {
    kind: "demo",
    source: voisine.sal ? `SAL « ${titre} » rejoint sur la toile` : `Motif de ${voisine.brodeuse}, acheté sur la toile`,
    author: voisine.brodeuse,
    license: "Démo : paiement simulé, motif libre de droits pour vous",
    personalOnly: false,
  };
  p.notes = voisine.sal
    ? `Vous avez rejoint le SAL « ${titre} » animé par ${voisine.brodeuse}. ${p.w} × ${p.h} cases, ${p.palette.length} fils DMC.`
    : `« ${titre} » de ${voisine.brodeuse}, approprié depuis la toile. ${p.w} × ${p.h} cases, ${p.palette.length} fils DMC.`;
  return p;
}

/* ------------------------------------------------------------------ */
/*  Les voisines, en cases de la toile                                 */
/* ------------------------------------------------------------------ */

export interface Voisine {
  id: string;
  titre: string;
  brodeuse: string;
  prix: number;
  sal: boolean;
  brodeuses?: number;
  cx: number; // colonne de cases
  cy: number; // rangée de cases
  seed: number;
}

export const VOISINES: Voisine[] = [
  { id: "renard", titre: "Renard des bois", brodeuse: "Camille", prix: 4.9, sal: false, cx: -30, cy: -2, seed: 7 },
  { id: "bleets", titre: "Bleuets de juin", brodeuse: "Inès", prix: 3.5, sal: false, cx: 58, cy: -6, seed: 21 },
  { id: "maison", titre: "Maison sous la neige", brodeuse: "Margot", prix: 6, sal: true, brodeuses: 12, cx: -32, cy: 24, seed: 35 },
  { id: "rosace", titre: "Rosace de grand-mère", brodeuse: "Léonie", prix: 5.2, sal: false, cx: 60, cy: 26, seed: 49 },
  { id: "baleine", titre: "Baleine douce", brodeuse: "Alma", prix: 6, sal: true, brodeuses: 8, cx: 16, cy: -28, seed: 63 },
  { id: "citron", titre: "Citronnade", brodeuse: "Thaïs", prix: 2.9, sal: false, cx: 14, cy: 36, seed: 77 },
];

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function dessinerCroix(ctx: CanvasRenderingContext2D, px: number, py: number, c: number, hex: string) {
  ctx.strokeStyle = hex;
  ctx.lineWidth = Math.max(1.4, c * 0.22);
  ctx.lineCap = "round";
  const p = c * 0.18;
  ctx.beginPath();
  ctx.moveTo(px + p, py + p);
  ctx.lineTo(px + c - p, py + c - p);
  ctx.moveTo(px + c - p, py + p);
  ctx.lineTo(px + p, py + c - p);
  ctx.stroke();
}

/* Une voisine : ses croix à même la grille, son étiquette dessous. */
function Vivante({
  voisine,
  design,
  fait,
  total,
  onChoisir,
}: {
  voisine: Voisine;
  design: MiniDesign;
  fait: number;
  total: number;
  onChoisir: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const fini = fait >= total;
  const pct = Math.round((fait / total) * 100);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = design.w * CELL;
    cv.height = design.h * CELL;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let n = 0; n < fait; n += 1) {
      const i = design.ordre[n];
      const v = design.cross[i];
      if (v < 0) continue;
      const x = i % design.w;
      const y = Math.floor(i / design.w);
      dessinerCroix(ctx, x * CELL, y * CELL, CELL, FLOSS[v]?.hex ?? "#888");
    }
  }, [design, fait]);

  return (
    <article
      className="motif-vivant"
      style={{ left: voisine.cx * CELL, top: voisine.cy * CELL, width: design.w * CELL }}
      aria-label={`${voisine.titre}, brodé en direct par ${voisine.brodeuse}`}
    >
      <div className="mv-haut">
        <canvas ref={ref} className="mv-canvas" aria-hidden="true" />
        <span className={`mv-direct${fini ? " fini" : ""}`}>{fini ? "terminé" : "en direct"}</span>
      </div>
      <div className="mv-etiquette">
        <div>
          <h3 className="mv-titre">{voisine.titre}</h3>
          <p className="mv-qui">
            {voisine.brodeuse}
            {voisine.sal ? ` · SAL · ${voisine.brodeuses} brodeuses` : ""}
          </p>
          <div className="mv-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="mv-pct" data-progres={pct}>
            {pct} % {fini ? "· motif complet, à s'approprier" : "· brode…"}
          </p>
        </div>
        <button type="button" className="mv-cta" data-cta onClick={onChoisir}>
          {voisine.sal ? <Users size={15} aria-hidden="true" /> : <Heart size={15} aria-hidden="true" />}
          {voisine.sal ? `Rejoindre · ${eur(voisine.prix)}` : `S'approprier · ${eur(voisine.prix)}`}
        </button>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Le motif brodé sur la grille (ambiance ou décrit)                  */
/* ------------------------------------------------------------------ */

export interface MotifGrille {
  cross: Int16Array;
  palette: number[];
  w: number;
  h: number;
  nom: string;
}

function MotifSurGrille({ motif, onPret }: { motif: MotifGrille; onPret: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = motif.w * CELL;
    cv.height = motif.h * CELL;
    let row = 0;
    const step = Math.max(1, Math.round(motif.h / 26));
    const peindre = () => {
      const last = Math.min(motif.h, row);
      for (let y = row - step < 0 ? 0 : row - step; y < last; y += 1) {
        for (let x = 0; x < motif.w; x += 1) {
          const v = motif.cross[y * motif.w + x];
          if (v < 0) continue;
          dessinerCroix(ctx, x * CELL, y * CELL, CELL, FLOSS[v]?.hex ?? "#888");
        }
      }
      row = last;
    };
    ctx.clearRect(0, 0, cv.width, cv.height);
    const id = window.setInterval(() => {
      row = Math.min(motif.h, row + step);
      peindre();
      if (row >= motif.h) {
        window.clearInterval(id);
        onPret();
      }
    }, 60);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motif]);

  return (
    <div className="grille-motif" style={{ width: motif.w * CELL, height: motif.h * CELL }}>
      <canvas ref={ref} aria-label={`Motif « ${motif.nom} » brodé sur la grille`} />
      <span className="grille-motif-tag">« {motif.nom} » · brodé sur la grille</span>
    </div>
  );
}

/* Un motif exporté hors du hero reste sur la toile, posé là. */
export interface PoseMotif {
  id: string;
  motif: MotifGrille;
  cx: number;
  cy: number;
}

function MotifPose({ pose }: { pose: PoseMotif }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    cv.width = pose.motif.w * CELL;
    cv.height = pose.motif.h * CELL;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < pose.motif.h; y += 1) {
      for (let x = 0; x < pose.motif.w; x += 1) {
        const v = pose.motif.cross[y * pose.motif.w + x];
        if (v < 0) continue;
        dessinerCroix(ctx, x * CELL, y * CELL, CELL, FLOSS[v]?.hex ?? "#888");
      }
    }
  }, [pose]);
  return (
    <div className="motif-pose" style={{ left: pose.cx * CELL, top: pose.cy * CELL }}>
      <canvas ref={ref} aria-label={`Motif « ${pose.motif.nom} » posé sur la toile`} />
      <span className="grille-motif-tag">« {pose.motif.nom} » · posé ici</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  La feuille d'appropriation                                         */
/* ------------------------------------------------------------------ */

interface Achat {
  voisine: Voisine;
  design: MiniDesign;
}

function FeuilleAchat({
  achat,
  onFermer,
  onMotif,
}: {
  achat: Achat;
  onFermer: () => void;
  onMotif: (p: Pattern) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { voisine, design } = achat;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const cell = 13;
    cv.width = design.w * cell;
    cv.height = design.h * cell;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = "rgba(17,17,20,0.1)";
    ctx.lineWidth = 1;
    for (let i = 1; i < design.w; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, cv.height);
      ctx.stroke();
    }
    for (let j = 1; j < design.h; j += 1) {
      ctx.beginPath();
      ctx.moveTo(0, j * cell);
      ctx.lineTo(cv.width, j * cell);
      ctx.stroke();
    }
    for (let y = 0; y < design.h; y += 1) {
      for (let x = 0; x < design.w; x += 1) {
        const v = design.cross[y * design.w + x];
        if (v < 0) continue;
        dessinerCroix(ctx, x * cell, y * cell, cell, FLOSS[v]?.hex ?? "#888");
      }
    }
  }, [design]);

  const confirmer = () => {
    onMotif(livrer(design, voisine.titre, voisine));
    onFermer();
  };

  return (
    <div className="achat-voile" data-scroll-interne role="dialog" aria-label={`${voisine.titre} — s'approprier le motif`}>
      <div className="achat-feuille">
        <button type="button" className="achat-x" onClick={onFermer} aria-label="Fermer">
          <X size={16} />
        </button>
        <div className="achat-corps">
          <div className="achat-apercu">
            <canvas ref={ref} aria-label={`Aperçu complet de « ${voisine.titre} »`} />
          </div>
          <div className="achat-texte">
            <p className="achat-oeil">{voisine.sal ? "Stitch-along en cours" : "Brode en direct sur la toile"}</p>
            <h2>{voisine.titre}</h2>
            <p className="achat-qui">
              par {voisine.brodeuse}
              {voisine.sal ? ` · ${voisine.brodeuses} brodeuses inscrites` : ""} · {design.w * 2} × {design.h * 2} cases ·{" "}
              {design.palette.length} fils DMC
            </p>
            <p className="achat-prix">{eur(voisine.prix)}</p>
            <button type="button" className="mv-cta achat-cta" data-confirmer onClick={confirmer}>
              {voisine.sal ? `Rejoindre le SAL · ${eur(voisine.prix)}` : `Payer ${eur(voisine.prix)} · le motif est à moi`}
            </button>
            <p className="achat-honnete">
              Démo : le paiement est simulé — aucun argent ne circule. Le motif, lui, est bien réel :
              il s'ouvre directement dans l'atelier, sans fichier ni dossier.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Le contexte : les ancres posées sur la toile                       */
/* ------------------------------------------------------------------ */

interface Ancres {
  table: HTMLDivElement | null;
  k: number;
  motifPret: boolean;
}
const AncresCtx = createContext<Ancres>({ table: null, k: 1, motifPret: false });
export const useAncreToile = () => useContext(AncresCtx);

/* ------------------------------------------------------------------ */
/*  La toile                                                           */
/* ------------------------------------------------------------------ */

export default function ToileInfinie({
  onOpen,
  onMotif,
  motif,
  motifsPoses = [],
  reglages,
  onReglage,
  nbCouleursSource,
  musicMode = false,
  showShowcase = false,
  displayMotifOnToile = false,
  musicTrail = [],
  onMusicCell,
  children,
}: {
  onOpen: () => void;
  onMotif: (p: Pattern) => void;
  /** Le motif brodé à même la grille, derrière le champ : ambiance ou décrit. */
  motif: MotifGrille | null;
  /** Les motifs libérés du hero, posés ailleurs sur la toile. */
  motifsPoses?: PoseMotif[];
  /** Les réglages de zone déjà appliqués (outil zone). */
  reglages: ReglageZone[];
  onReglage: (rect: RectZone, n: number) => void;
  /** Combien de fils la zone porte dans le motif source (plafond du réglage). */
  nbCouleursSource: (rect: RectZone) => number;
  /** SLÂME selection takes place on the real homepage canvas. */
  musicMode?: boolean;
  /** Animations et badges commerciaux historiques : masqués sur l’accueil. */
  showShowcase?: boolean;
  /** Préférer un aperçu dans le résultat du champ, non derrière le champ. */
  displayMotifOnToile?: boolean;
  musicTrail?: Point[];
  onMusicCell?: (point: Point) => void;
  children: ReactNode;
}) {
  const monde = useRef<HTMLDivElement>(null);
  const [table, setTable] = useState<HTMLDivElement | null>(null);
  const [motifPret, setMotifPret] = useState(false);

  const HERO_PX = { w: HERO.w * CELL, h: HERO.h * CELL };

  const fit = (): Vue => {
    const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
    const vh = typeof window === "undefined" ? 800 : window.innerHeight;
    const k = clamp(Math.min(vw / (HERO_PX.w + 160), vh / (HERO_PX.h + 140)), 0.4, 1.15);
    return { k, x: (vw - HERO_PX.w * k) / 2, y: (vh - HERO_PX.h * k) / 2 };
  };

  const [vue, setVue] = useState<Vue>(fit);
  const [achat, setAchat] = useState<Achat | null>(null);
  const [outil, setOutil] = useState<"deplacer" | "zone">("deplacer");
  const [zoneTemp, setZoneTemp] = useState<{ ax: number; ay: number; bx: number; by: number } | null>(null);
  const [zone, setZone] = useState<RectZone | null>(null);

  useEffect(() => setMotifPret(false), [motif]);
  useEffect(() => { if (musicMode) { setOutil("deplacer"); setZone(null); } }, [musicMode]);

  /* Les voisines avancent ensemble : un seul battement pour toute la toile. */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!showShowcase) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 800);
    return () => window.clearInterval(id);
  }, [showShowcase]);

  const nZone =
    zone && motif ? (reglageDe(zone, reglages)?.n ?? couleursZone(motif.cross, motif.w, motif.h, zone).length) : 0;
  const maxZone = zone ? nbCouleursSource(zone) : 0;

  const designs = useMemo(() => {
    const m = new Map<string, MiniDesign[]>();
    for (const v of showShowcase ? VOISINES : []) {
      m.set(v.id, [miniDesign(v.seed), miniDesign(v.seed + 101), miniDesign(v.seed + 202)]);
    }
    return m;
  }, [showShowcase]);

  const zoomAt = (cx: number, cy: number, facteur: number) => {
    setVue((v) => {
      const k = clamp(v.k * facteur, K_MIN, K_MAX);
      if (k === v.k) return v;
      const r = k / v.k;
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
    });
  };

  /* Molette : lente, et jamais pendant qu'on déroule une table posée là. */
  useEffect(() => {
    const el = monde.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as Element).closest?.("[data-scroll-interne]")) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0006));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* La souris en cases de la toile : pour dessiner une zone. */
  const clientToCell = (clientX: number, clientY: number) => {
    const r = monde.current?.getBoundingClientRect();
    if (!r) return { cx: 0, cy: 0 };
    return {
      cx: (clientX - r.left - vue.x) / (CELL * vue.k),
      cy: (clientY - r.top - vue.y) / (CELL * vue.k),
    };
  };

  /* Glisser pour se déplacer, pincer pour zoomer, ou dessiner une zone. */
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const dernier = useRef<{ x: number; y: number } | null>(null);
  const dist = useRef(0);
  const bouge = useRef(false);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest?.("[data-stop-toile]")) return;
    if (outil === "zone" && motif) {
      const c = clientToCell(e.clientX, e.clientY);
      setZoneTemp({ ax: c.cx, ay: c.cy, bx: c.cx, by: c.cy });
      setZone(null);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dernier.current = { x: e.clientX, y: e.clientY };
    bouge.current = false;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      dist.current = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (zoneTemp) {
      const c = clientToCell(e.clientX, e.clientY);
      setZoneTemp({ ...zoneTemp, bx: c.cx, by: c.cy });
      return;
    }
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = monde.current?.getBoundingClientRect();
      if (d && dist.current && r) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / dist.current);
      dist.current = d || dist.current;
      return;
    }
    if (dernier.current) {
      const dx = e.clientX - dernier.current.x;
      const dy = e.clientY - dernier.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) bouge.current = true;
      setVue((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    }
    dernier.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    if (zoneTemp && motif) {
      const ox = HERO.w / 2 - motif.w / 2; // origine du motif, en cases monde
      const oy = HERO.h / 2 - motif.h / 2;
      const x0 = Math.min(zoneTemp.ax, zoneTemp.bx) - ox;
      const y0 = Math.min(zoneTemp.ay, zoneTemp.by) - oy;
      const x1 = Math.max(zoneTemp.ax, zoneTemp.bx) - ox;
      const y1 = Math.max(zoneTemp.ay, zoneTemp.by) - oy;
      const rect: RectZone = {
        x: clamp(Math.round(x0), 0, motif.w - 2),
        y: clamp(Math.round(y0), 0, motif.h - 2),
        w: clamp(Math.round(x1 - x0), 2, motif.w),
        h: clamp(Math.round(y1 - y0), 2, motif.h),
      };
      setZoneTemp(null);
      setZone(rect);
      if (!reglageDe(rect, reglages)) {
        onReglage(rect, couleursZone(motif.cross, motif.w, motif.h, rect).length);
      }
      return;
    }
    if (musicMode && motif && onMusicCell && pts.current.size === 1 && !bouge.current &&
        !(e.target as Element).closest?.("button,input,textarea,select,a,[data-stop-toile]")) {
      const c = clientToCell(e.clientX, e.clientY);
      const x = Math.floor(c.cx - (HERO.w - motif.w) / 2);
      const y = Math.floor(c.cy - (HERO.h - motif.h) / 2);
      if (x >= 0 && x < motif.w && y >= 0 && y < motif.h) onMusicCell({ x, y });
    }
    pts.current.delete(e.pointerId);
    dernier.current = null;
  };

  /* Après un glisser, le relâchement ne doit pas acheter un motif. */
  const clicFiable = () => {
    if (bouge.current) {
      bouge.current = false;
      return false;
    }
    return true;
  };

  const ouvrir = (v: Voisine) => {
    if (!clicFiable()) return;
    const liste = designs.get(v.id) ?? [miniDesign(v.seed)];
    const cycle = liste[0].ordre.length + 6;
    const idx = Math.floor(((v.seed * 7 + tick) % (cycle * liste.length)) / cycle) % liste.length;
    setAchat({ voisine: v, design: liste[idx] });
  };

  return (
    <AncresCtx.Provider value={{ table, k: vue.k, motifPret }}>
      <div
        ref={monde}
        className={`toile${outil === "zone" ? " outil-zone" : ""}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Le tissu : deux grilles superposées, fines et repères de patron. */}
        <div
          className="toile-grille blocs"
          style={{
            backgroundSize: `${CELL * BLOC * vue.k}px ${CELL * BLOC * vue.k}px`,
            backgroundPosition: `${vue.x}px ${vue.y}px`,
          }}
          aria-hidden="true"
        />
        <div
          className="toile-grille fines"
          style={{
            backgroundSize: `${CELL * vue.k}px ${CELL * vue.k}px`,
            backgroundPosition: `${vue.x}px ${vue.y}px`,
            opacity: clamp((vue.k - 0.28) / 0.3, 0, 1),
          }}
          aria-hidden="true"
        />

        {/* Le monde : tout ce qui est posé sur la toile, hero compris. */}
        <div
          className="toile-monde"
          data-k={vue.k.toFixed(3)}
          style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.k})` }}
        >
          {displayMotifOnToile && motif && <MotifSurGrille motif={motif} onPret={() => setMotifPret(true)} />}
          {musicMode && motif && musicTrail.length > 0 && (
            <svg
              aria-hidden="true"
              style={{
                position: "absolute",
                left: (HERO.w - motif.w) / 2 * CELL,
                top: (HERO.h - motif.h) / 2 * CELL,
                width: motif.w * CELL,
                height: motif.h * CELL,
                overflow: "visible",
                pointerEvents: "none",
                zIndex: 2,
              }}
              viewBox={"0 0 " + motif.w * CELL + " " + motif.h * CELL}
            >
              <polyline
                fill="none"
                stroke="#6047a0"
                strokeWidth={Math.max(2.5, CELL * .16)}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity=".85"
                points={musicTrail.slice(-512).map(p => ((p.x + .5) * CELL) + "," + ((p.y + .5) * CELL)).join(" ")}
              />
              {musicTrail.slice(-1).map((p, i) => (
                <circle key={i} cx={(p.x + .5) * CELL} cy={(p.y + .5) * CELL} r={CELL * .3} fill="#6047a0" stroke="#fff" strokeWidth="2" />
              ))}
            </svg>
          )}

          <div className="hero-sheet" style={{ width: HERO_PX.w, height: HERO_PX.h }}>
            <span className="sheet-marque tl" aria-hidden="true" />
            <span className="sheet-marque tr" aria-hidden="true" />
            <span className="sheet-marque bl" aria-hidden="true" />
            <span className="sheet-marque br" aria-hidden="true" />
            <div className="hero-contenu">{children}</div>
          </div>

          {motif && zone && (
            <div
              className="zone-rect"
              style={{
                left: (HERO.w / 2 - motif.w / 2 + zone.x) * CELL,
                top: (HERO.h / 2 - motif.h / 2 + zone.y) * CELL,
                width: zone.w * CELL,
                height: zone.h * CELL,
              }}
              aria-hidden="true"
            />
          )}
          {motif && zoneTemp && (
            <div
              className="zone-rect temp"
              style={{
                left: Math.min(zoneTemp.ax, zoneTemp.bx) * CELL,
                top: Math.min(zoneTemp.ay, zoneTemp.by) * CELL,
                width: Math.abs(zoneTemp.bx - zoneTemp.ax) * CELL,
                height: Math.abs(zoneTemp.by - zoneTemp.ay) * CELL,
              }}
              aria-hidden="true"
            />
          )}

          {motifsPoses.map((po) => (
            <MotifPose key={po.id} pose={po} />
          ))}

          {showShowcase && VOISINES.map((v) => {
            const liste = designs.get(v.id) ?? [miniDesign(v.seed)];
            const depart = (v.seed * 7) % 9;
            const cycle = liste[0].ordre.length + 6; // terminé, puis on repart
            const brut = depart + tick;
            const tour = Math.floor(brut / cycle) % liste.length;
            const design = liste[tour];
            const fait = Math.min(brut % cycle, design.ordre.length);
            return (
              <Vivante
                key={v.id}
                voisine={v}
                design={design}
                fait={fait}
                total={design.ordre.length}
                onChoisir={() => ouvrir(v)}
              />
            );
          })}

          {/* Le tableau des 54 cartes : une composition, pas une liste. */}
          {showShowcase && <div className="tableau-cartes" data-stop-toile style={{ left: 88 * CELL, top: -4 * CELL }}>
            <p className="tableau-titre">Le tableau du SAL · 54 cartes</p>
            <CardDeck dense />
          </div>}

          {/* La table magnétique du PDF se pose ici quand on dépose un fichier. */}
          {showShowcase && <div
            ref={setTable}
            className="ancre-table"
            data-scroll-interne
            data-stop-toile
            style={{ left: 0, top: (HERO.h + 6) * CELL, width: 46 * CELL }}
          />}
        </div>

        {/* Le strict minimum d'interface, posé sur la toile. */}
        <header className="toile-nav">
          <span className="toile-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="17" height="17">
              <path d="M6 6l12 12M18 6L6 18" stroke="#ff453a" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </span>
          <span className="toile-nom">POINT ZÉRO</span>
          <button type="button" className="toile-atelier" onClick={onOpen}>
            Ouvrir l’atelier
          </button>
        </header>

        {displayMotifOnToile && <div className="outil-palette" role="group" aria-label="Palette d'outils">
          <button
            type="button"
            aria-label="Outil déplacer"
            aria-pressed={outil === "deplacer"}
            onClick={() => {
              setOutil("deplacer");
              setZoneTemp(null);
            }}
          >
            <Hand size={16} />
          </button>
          <button
            type="button"
            aria-label="Outil zone : sélectionner un rectangle de cases"
            aria-pressed={outil === "zone"}
            onClick={() => setOutil(outil === "zone" ? "deplacer" : "zone")}
          >
            <Frame size={16} />
          </button>
        </div>}

        {displayMotifOnToile && zone && motif && (
          <div className="zone-panneau" data-zone role="group" aria-label="Réglage de la zone sélectionnée">
            <p className="zone-titre">
              Zone {zone.w} × {zone.h} cases · ≈ {((zone.w * 2.54) / 14).toFixed(1).replace(".", ",")} ×{" "}
              {((zone.h * 2.54) / 14).toFixed(1).replace(".", ",")} cm en Aida 14
            </p>
            <div className="zone-ligne">
              <button type="button" aria-label="Moins de couleurs" disabled={nZone <= 2} onClick={() => onReglage(zone, nZone - 1)}>
                <Minus size={14} />
              </button>
              <span className="zone-n" data-couleurs={nZone}>
                {nZone} fils
              </span>
              <button type="button" aria-label="Plus de couleurs" disabled={nZone >= maxZone} onClick={() => onReglage(zone, nZone + 1)}>
                <Plus size={14} />
              </button>
              <button type="button" className="zone-oubli" onClick={() => setZone(null)}>
                oublier la zone
              </button>
            </div>
            <p className="zone-aide">Moins de fils = moins à acheter : réglez selon votre toile.</p>
          </div>
        )}

        <div className="toile-zoom" role="group" aria-label="Zoom de la toile">
          <button type="button" aria-label="Zoomer" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1.18)}>
            <Plus size={16} />
          </button>
          <button type="button" aria-label="Dézoomer" onClick={() => zoomAt(window.innerWidth / 2, window.innerHeight / 2, 1 / 1.18)}>
            <Minus size={16} />
          </button>
          <button type="button" aria-label="Revenir au hero" onClick={() => setVue(fit())}>
            <Home size={15} />
          </button>
        </div>

        {showShowcase && <div className="toile-chips">
          <p className="toile-chip geste">Molette : zoomer doucement · Glisser : se déplacer · Dézoomez : tout est sur la grille</p>
          <p className="toile-chip honnete">
            Démo hors ligne : les voisines sont simulées en local (pas encore de serveur) et le paiement est simulé
          </p>
        </div>}

        {showShowcase && achat && <FeuilleAchat achat={achat} onFermer={() => setAchat(null)} onMotif={onMotif} />}
      </div>
    </AncresCtx.Provider>
  );
}

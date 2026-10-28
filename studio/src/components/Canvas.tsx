import { useEffect, useRef, useState, type DragEvent as RDragEvent, type PointerEvent as RPointerEvent } from "react";
import { FLOSS, contrastOn } from "../lib/dmc";
import { drawSymbol } from "../lib/symbols";
import { assignedSymbol, clonePattern, compositePattern, ornamentKey, type Pattern } from "../lib/pattern";
import { boundedSelection, clearSelection, drawShape, extractSelection, pasteSelection, type Selection } from "../lib/editing";
import {
  addLongTo,
  applyStrokeSegment,
  cellOf,
  MIRROR_TOOLS,
  mirrorContexts,
  nodeOf,
  pickAt,
  reflectPoint,
  symmetryAxes,
  type Node,
  type Pt,
  type StrokeCtx,
  type Symmetry,
  type Tool,
} from "../lib/stitch";

export type ViewMode = "real" | "flat" | "pattern";

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Props {
  pattern: Pattern;
  tool: Tool;
  color: number;
  view: ViewMode;
  symbols: boolean;
  highlightActive: boolean;
  onlyActive?: boolean;
  highContrast?: boolean;
  pencilOnly?: boolean;
  symmetry?: Symmetry;
  annotation?: string;
  onSelection?: (s: Selection | null) => void;
  readOnly?: boolean;
  selection?: Selection | null;
  halfDirection?: "auto" | "forward" | "backward";
  insets: Insets;
  fitKey: number;
  onBegin: () => void;
  onLive: (p: Pattern) => void;
  onEnd: (changed: boolean) => void;
  onPick: (idx: number) => void;
  /** Native subject editing uses the exact Canvas zoom/pan transform. */
  onSubjectStart?: (x: number, y: number) => boolean;
  onSubjectMove?: (dx: number, dy: number) => void;
  onSubjectEnd?: (changed: boolean) => void;
  onMotifDrop?: (id: string, x: number, y: number) => void;
}

interface Stroke {
  tool: Tool;
  ctx: StrokeCtx;
  /** Un contexte par axe de symétrie, dans l'ordre de `symmetryAxes`. */
  mirror: StrokeCtx[];
  last: Pt;
  start: Node;
  end: Node;
  base: Pattern;
  /** Brouillon unique du trait, muté sur place jusqu'au relâchement. */
  draft: Pattern | null;
  changed: boolean;
}

const MAX_S = 64;
const FABRIC_A = "#f7f2e8";
const PAPER = "#fbfaf7";
const AXIS = "#ff453a";
const ACCENT = "#0a84ff";
const DONE = "rgba(10,132,255,0.30)";
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
const NODE_TOOLS: Tool[] = ["back", "knot", "long"];
/** Coin de départ des quarts de point : NW, NE, SE, SW. */
const Q_CORNER: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const fmt = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

/**
 * Grille plein écran : zoom au pincement, défilement à deux doigts, tracé à un doigt / stylet.
 * Trois affichages : toile brodée, aplat couleur, et « patron » (symboles noir sur blanc,
 * comme une grille imprimée Etsy — l'avancement y reste surligné).
 */
export default function Canvas(props: Props) {
  const { pattern, tool, insets, fitKey } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;

  /**
   * Composition des calques, mémorisée par identité de motif.
   *
   * Le rendu redessine à chaque image, y compris pour la seule infobulle qui
   * suit le pointeur : recomposer les calques à ce rythme relit tous les
   * instantanés pour rien. Tant que l'objet motif est le même, la composition
   * est la même.
   */
  const compositeCache = useRef<{ src: Pattern; out: Pattern } | null>(null);
  const compositeOf = (src: Pattern): Pattern => {
    const hit = compositeCache.current;
    if (hit && hit.src === src) return hit.out;
    const out = compositePattern(src);
    compositeCache.current = { src, out };
    return out;
  };

  const view = useRef({ s: 16, ox: 0, oy: 0, fit: 16, w: 1, h: 1, dpr: 1, ready: false });
  const frame = useRef<number | null>(null);
  const hoverPt = useRef<Pt | null>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number } | null>(null);
  const subjectDrag = useRef<{ id: number; x: number; y: number; dx: number; dy: number; moved: boolean } | null>(null);
  const pinch = useRef<{ d0: number; s0: number; mx: number; my: number; ox: number; oy: number } | null>(null);
  const idle = useRef(false);
  const stroke = useRef<Stroke | null>(null);
  const selected = useRef<Selection | null>(null);
  const lasso = useRef<Pt[]>([]);
  const keyCell = useRef<Pt>({ x: 0, y: 0 });
  const [announcement, setAnnouncement] = useState("");

  const schedule = () => {
    if (frame.current === null) frame.current = requestAnimationFrame(draw);
  };

  const content = () => {
    const v = view.current;
    return { x0: 0, y0: 0, x1: v.w, y1: v.h };
  };

  const minScale = () => Math.max(3, view.current.fit * 0.6);

  const toWorld = (p: { x: number; y: number }): Pt => {
    const v = view.current;
    return { x: (p.x - v.ox) / v.s, y: (p.y - v.oy) / v.s };
  };

  const clampView = () => {
    const P = latest.current.pattern;
    const c = content();
    const v = view.current;
    const gw = P.w * v.s;
    const gh = P.h * v.s;
    const pad = 48;
    const cw = c.x1 - c.x0;
    const ch = c.y1 - c.y0;
    if (gw + pad * 2 <= cw) v.ox = c.x0 + (cw - gw) / 2;
    else v.ox = clamp(v.ox, c.x1 - gw - pad, c.x0 + pad);
    if (gh + pad * 2 <= ch) v.oy = c.y0 + (ch - gh) / 2;
    else v.oy = clamp(v.oy, c.y1 - gh - pad, c.y0 + pad);
  };

  const fitView = () => {
    const P = latest.current.pattern;
    const c = content();
    const v = view.current;
    const cw = c.x1 - c.x0;
    const ch = c.y1 - c.y0;
    const s = Math.max(2, Math.min(cw / P.w, ch / P.h) * 0.94);
    v.fit = s;
    v.s = s;
    v.ox = c.x0 + (cw - P.w * s) / 2;
    v.oy = c.y0 + (ch - P.h * s) / 2;
    v.ready = true;
  };

  const zoomAt = (f: number, sx: number, sy: number) => {
    const v = view.current;
    const ns = clamp(v.s * f, minScale(), MAX_S);
    const wx = (sx - v.ox) / v.s;
    const wy = (sy - v.oy) / v.s;
    v.s = ns;
    v.ox = sx - wx * ns;
    v.oy = sy - wy * ns;
    clampView();
    schedule();
  };

  const layout = () => {
    const el = wrapRef.current;
    const cv = canvasRef.current;
    if (!el || !cv) return;
    const r = el.getBoundingClientRect();
    const v = view.current;
    v.w = r.width;
    v.h = r.height;
    v.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cv.width = Math.round(v.w * v.dpr);
    cv.height = Math.round(v.h * v.dpr);
  };

  /* ---------------------------- Dessin ---------------------------- */

  function draw() {
    frame.current = null;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const v = view.current;
    const { view: mode, symbols, highlightActive, highContrast, color: activeColor, tool: activeTool } = latest.current;
    // Pendant un trait, le brouillon est mutable : la composition doit être
    // refaite à chaque image. En dehors, le motif ne change que par identité,
    // et la mémoire ci-dessus évite de recomposer au moindre survol.
    const live = stroke.current?.draft;
    const P = live ? compositePattern(live) : compositeOf(latest.current.pattern);
    const c = content();
    const { s, ox, oy } = v;
    const { w, h } = P;
    const isPattern = mode === "pattern";

    // La grille se prolonge jusqu'aux quatre bords de l'écran : aucun
    // cadre, ombre ou séparation entre le patron et la toile de travail.
    ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
    ctx.clearRect(0, 0, v.w, v.h);
    const cloth = isPattern ? PAPER : (P.fabric?.color ?? FABRIC_A);
    ctx.fillStyle = cloth;
    ctx.fillRect(0, 0, v.w, v.h);
    if (s >= 4) {
      const firstCol = Math.floor(-ox / s);
      const lastCol = Math.ceil((v.w - ox) / s);
      const firstRow = Math.floor(-oy / s);
      const lastRow = Math.ceil((v.h - oy) / s);
      const minor = highContrast ? "rgba(0,0,0,.38)" : "rgba(38,35,30,.16)";
      const major = highContrast ? "rgba(0,0,0,.55)" : "rgba(38,35,30,.32)";
      for (const strong of [false, true]) {
        ctx.beginPath();
        for (let k = firstCol; k <= lastCol; k++) {
          if ((k % 10 === 0) !== strong) continue;
          const x = Math.round(ox + k * s) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, v.h);
        }
        for (let k = firstRow; k <= lastRow; k++) {
          if ((k % 10 === 0) !== strong) continue;
          const y = Math.round(oy + k * s) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(v.w, y);
        }
        ctx.lineWidth = strong ? 1.2 : 1;
        ctx.strokeStyle = strong ? major : minor;
        ctx.stroke();
      }
    }
    // Un repère discret indique le centre du motif, sans bordure.
    ctx.beginPath();
    const axisX = Math.round(ox + w * s / 2) + .5;
    const axisY = Math.round(oy + h * s / 2) + .5;
    ctx.moveTo(axisX, 0); ctx.lineTo(axisX, v.h);
    ctx.moveTo(0, axisY); ctx.lineTo(v.w, axisY);
    ctx.strokeStyle = AXIS; ctx.globalAlpha = .5; ctx.lineWidth = 1;
    ctx.stroke(); ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.x0, c.y0, c.x1 - c.x0, c.y1 - c.y0);
    ctx.clip();

    const c0 = clamp(Math.floor((c.x0 - ox) / s), 0, w);
    const c1 = clamp(Math.ceil((c.x1 - ox) / s), 0, w);
    const r0 = clamp(Math.floor((c.y0 - oy) / s), 0, h);
    const r1 = clamp(Math.ceil((c.y1 - oy) / s), 0, h);

    if (c1 > c0 && r1 > r0) {
      const symPos = new Map<number, number>();
      P.palette.forEach((idx) => symPos.set(idx, assignedSymbol(P, idx)));

      if (mode === "real") {
        // Croix brodées, regroupées par fil
        const xs = new Map<number, Path2D>();
        const hs = new Map<number, Path2D>();
        const ins2 = s * 0.14;
        const pathFor = (m: Map<number, Path2D>, k: number) => {
          let p = m.get(k);
          if (!p) {
            p = new Path2D();
            m.set(k, p);
          }
          return p;
        };
        for (let r = r0; r < r1; r++) {
          for (let k = c0; k < c1; k++) {
            const i = r * w + k;
            const x = ox + k * s;
            const y = oy + r * s;
            const cr = P.cross[i];
            if (cr >= 0) {
              const p = pathFor(xs, cr);
              p.moveTo(x + ins2, y + ins2);
              p.lineTo(x + s - ins2, y + s - ins2);
              p.moveTo(x + s - ins2, y + ins2);
              p.lineTo(x + ins2, y + s - ins2);
            }
            const f = P.fwd[i];
            if (f >= 0) {
              const p = pathFor(hs, f);
              p.moveTo(x + ins2, y + s - ins2);
              p.lineTo(x + s - ins2, y + ins2);
            }
            const b = P.bwd[i];
            if (b >= 0) {
              const p = pathFor(hs, b);
              p.moveTo(x + ins2, y + ins2);
              p.lineTo(x + s - ins2, y + s - ins2);
            }
            for (let qk = 0; qk < 4; qk++) {
              const qv = P.q[qk][i];
              if (qv < 0) continue;
              const p = pathFor(hs, qv);
              const [qx, qy] = Q_CORNER[qk];
              p.moveTo(x + (qx === 0 ? ins2 : s - ins2), y + (qy === 0 ? ins2 : s - ins2));
              p.lineTo(x + s / 2, y + s / 2);
            }
          }
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(1, s * 0.2);
        ctx.strokeStyle = "rgba(60, 35, 20, 0.28)";
        ctx.save();
        ctx.translate(s * 0.05, s * 0.07);
        for (const p of xs.values()) ctx.stroke(p);
        for (const p of hs.values()) ctx.stroke(p);
        ctx.restore();
        for (const [idx, p] of xs) {
          ctx.strokeStyle = FLOSS[idx].hex;
          ctx.stroke(p);
        }
        for (const [idx, p] of hs) {
          ctx.strokeStyle = FLOSS[idx].hex;
          ctx.stroke(p);
        }
      } else {
        // Aplat / patron : cases pleines (le patron ne colore que si trop dézoomé pour les symboles)
        const paintCells = mode === "flat" || s < 9;
        for (let r = r0; r < r1; r++) {
          for (let k = c0; k < c1; k++) {
            const i = r * w + k;
            const x = ox + k * s;
            const y = oy + r * s;
            const cr = P.cross[i];
            if (cr >= 0 && paintCells) {
              ctx.fillStyle = FLOSS[cr].hex;
              ctx.globalAlpha = isPattern ? 0.55 : 1;
              ctx.fillRect(x, y, s + 0.5, s + 0.5);
              ctx.globalAlpha = 1;
            }
            const f = P.fwd[i];
            const b = P.bwd[i];
            if (f >= 0) {
              if (isPattern) {
                ctx.strokeStyle = FLOSS[f].hex;
                ctx.lineWidth = Math.max(1.4, s * 0.13);
                ctx.beginPath();
                ctx.moveTo(x + s * 0.12, y + s - s * 0.12);
                ctx.lineTo(x + s - s * 0.12, y + s * 0.12);
                ctx.stroke();
              } else {
                ctx.fillStyle = FLOSS[f].hex;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + s, y);
                ctx.lineTo(x, y + s);
                ctx.closePath();
                ctx.fill();
              }
            }
            if (b >= 0) {
              if (isPattern) {
                ctx.strokeStyle = FLOSS[b].hex;
                ctx.lineWidth = Math.max(1.4, s * 0.13);
                ctx.beginPath();
                ctx.moveTo(x + s * 0.12, y + s * 0.12);
                ctx.lineTo(x + s - s * 0.12, y + s - s * 0.12);
                ctx.stroke();
              } else {
                ctx.fillStyle = FLOSS[b].hex;
                ctx.beginPath();
                ctx.moveTo(x + s, y);
                ctx.lineTo(x + s, y + s);
                ctx.lineTo(x, y + s);
                ctx.closePath();
                ctx.fill();
              }
            }
            for (let qk = 0; qk < 4; qk++) {
              const qv = P.q[qk][i];
              if (qv < 0) continue;
              const [qx, qy] = Q_CORNER[qk];
              if (isPattern) {
                ctx.strokeStyle = FLOSS[qv].hex;
                ctx.lineWidth = Math.max(1.4, s * 0.13);
                ctx.beginPath();
                ctx.moveTo(x + qx * s, y + qy * s);
                ctx.lineTo(x + s / 2, y + s / 2);
                ctx.stroke();
              } else {
                // Aplat : triangle du quadrant (coin + milieux des deux côtés adjacents)
                ctx.fillStyle = FLOSS[qv].hex;
                ctx.beginPath();
                ctx.moveTo(x + qx * s, y + qy * s);
                ctx.lineTo(x + (qx === 0 ? s / 2 : s / 2), y + qy * s);
                ctx.lineTo(x + qx * s, y + (qy === 0 ? s / 2 : s / 2));
                ctx.closePath();
                ctx.fill();
              }
            }
          }
        }
      }

      // Avancement : cases marquées brodées
      ctx.fillStyle = DONE;
      for (let r = r0; r < r1; r++) {
        for (let k = c0; k < c1; k++) {
          const i = r * w + k;
          if (P.done[i]) ctx.fillRect(ox + k * s, oy + r * s, s, s);
        }
      }

      // En mode Broder, le fil actif est repéré immédiatement comme dans les lecteurs
      // de patrons professionnels : toutes ses occurrences sont mises en évidence.
      if (highlightActive && isPattern) {
        ctx.fillStyle = "rgba(10,132,255,0.22)";
        for (let r = r0; r < r1; r++) {
          for (let k = c0; k < c1; k++) {
            const i = r * w + k;
            const active =
              P.cross[i] === activeColor ||
              P.fwd[i] === activeColor ||
              P.bwd[i] === activeColor ||
              P.q[0][i] === activeColor ||
              P.q[1][i] === activeColor ||
              P.q[2][i] === activeColor ||
              P.q[3][i] === activeColor;
            if (active) ctx.fillRect(ox + k * s, oy + r * s, s, s);
          }
        }
      }

      // Symboles (toujours actifs en mode patron)
      if ((symbols || isPattern) && s >= 9) {
        for (let r = r0; r < r1; r++) {
          for (let k = c0; k < c1; k++) {
            const i = r * w + k;
            const cr = P.cross[i];
            if (cr >= 0) {
              const pos = symPos.get(cr) ?? 0;
              const col = isPattern ? "#141210" : mode === "flat" ? contrastOn(FLOSS[cr].hex) : "#1c1410";
              drawSymbol(ctx, pos, ox + (k + 0.5) * s, oy + (r + 0.5) * s, s * 0.33, col);
            }
            if (isPattern && s >= 16) {
              for (const [idx, x] of [[P.fwd[i], .24], [P.bwd[i], .76]]) {
                if (idx >= 0) drawSymbol(ctx, assignedSymbol(P, idx), ox + (k + x) * s, oy + (r + .24) * s, s * .16, "#141210");
              }
              for (let q = 0; q < 4; q++) {
                const idx = P.q[q][i]; if (idx < 0) continue;
                const [qx, qy] = Q_CORNER[q];
                drawSymbol(ctx, assignedSymbol(P, idx), ox + (k + (qx ? .82 : .18)) * s, oy + (r + (qy ? .72 : .28)) * s, s * .12, "#141210");
              }
            }
          }
        }
      }

      for (const k of P.special ?? []) {
        ctx.globalAlpha = P.ornamentDone?.includes(ornamentKey(k.kind, k)) ? .38 : 1;
        const x = ox + k.x * s, y = oy + k.y * s;
        ctx.strokeStyle = FLOSS[k.c].hex; ctx.fillStyle = FLOSS[k.c].hex; ctx.lineWidth = Math.max(1.5, s * .12);
        if (k.kind === "petite") {
          ctx.beginPath(); ctx.moveTo(x - s * .18, y - s * .18); ctx.lineTo(x + s * .18, y + s * .18);
          ctx.moveTo(x + s * .18, y - s * .18); ctx.lineTo(x - s * .18, y + s * .18); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.ellipse(x, y, Math.max(2, s * .17), Math.max(3, s * .28), -.4, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = contrastOn(FLOSS[k.c].hex); ctx.beginPath(); ctx.moveTo(x, y - s * .12); ctx.lineTo(x, y + s * .12); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "#ff453a"; ctx.lineWidth = 2;
      for (const i of P.mistakes ?? []) {
        const x = ox + (i % w) * s, y = oy + Math.floor(i / w) * s;
        ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
        ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + s - 3, y + s - 3); ctx.stroke();
      }
      for (const park of P.parked ?? []) {
        const [qx, qy] = Q_CORNER[park.corner];
        const x = ox + (park.x + qx) * s, y = oy + (park.y + qy) * s;
        ctx.fillStyle = FLOSS[park.c].hex; ctx.beginPath(); ctx.arc(x, y, Math.max(3, s * .17), 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
      }
      for (const a of P.annotations ?? []) {
        const x = ox + (a.x + .5) * s, y = oy + (a.y + .5) * s;
        ctx.fillStyle = "#ff9f0a"; ctx.fillRect(x - 5, y - 5, 10, 10);
        if (s > 18) { ctx.font = `12px ${MONO}`; ctx.fillStyle = "#222"; ctx.fillText(a.text.slice(0, 30), x + 10, y); }
      }

      const selection = selected.current;
      if (selection) {
        ctx.save(); ctx.fillStyle = "rgba(10,132,255,.1)"; ctx.strokeStyle = ACCENT; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.fillRect(ox + selection.x * s, oy + selection.y * s, selection.w * s, selection.h * s);
        ctx.strokeRect(ox + selection.x * s, oy + selection.y * s, selection.w * s, selection.h * s); ctx.restore();
      }

      // Point arrière
      ctx.lineCap = "round";
      for (const seg of P.back) {
        if (Math.max(seg.x1, seg.x2) < c0 || Math.min(seg.x1, seg.x2) > c1 || Math.max(seg.y1, seg.y2) < r0 || Math.min(seg.y1, seg.y2) > r1) continue;
        ctx.globalAlpha = P.ornamentDone?.includes(ornamentKey("back", seg)) ? .35 : 1;
        ctx.beginPath();
        ctx.moveTo(ox + seg.x1 * s, oy + seg.y1 * s);
        ctx.lineTo(ox + seg.x2 * s, oy + seg.y2 * s);
        if (!isPattern) {
          ctx.strokeStyle = "rgba(0,0,0,0.32)";
          ctx.lineWidth = Math.max(2, s * 0.14);
          ctx.stroke();
        }
        ctx.strokeStyle = FLOSS[seg.c].hex;
        ctx.lineWidth = Math.max(1.4, s * 0.1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Point lancé
      for (const seg of P.long) {
        if (Math.max(seg.x1, seg.x2) < c0 || Math.min(seg.x1, seg.x2) > c1 || Math.max(seg.y1, seg.y2) < r0 || Math.min(seg.y1, seg.y2) > r1) continue;
        ctx.globalAlpha = P.ornamentDone?.includes(ornamentKey("long", seg)) ? .35 : 1;
        ctx.beginPath();
        ctx.moveTo(ox + seg.x1 * s, oy + seg.y1 * s);
        ctx.lineTo(ox + seg.x2 * s, oy + seg.y2 * s);
        if (!isPattern) {
          ctx.strokeStyle = "rgba(0,0,0,0.26)";
          ctx.lineWidth = Math.max(2.4, s * 0.22);
          ctx.stroke();
        }
        ctx.strokeStyle = FLOSS[seg.c].hex;
        ctx.lineWidth = Math.max(1.8, s * 0.17);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Noeuds français
      for (const k of P.knots) {
        if (k.x < c0 - 1 || k.x > c1 + 1 || k.y < r0 - 1 || k.y > r1 + 1) continue;
        ctx.globalAlpha = P.ornamentDone?.includes(ornamentKey("knot", k)) ? .35 : 1;
        const x = ox + k.x * s;
        const y = oy + k.y * s;
        const rr = Math.max(2.6, s * 0.24);
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fillStyle = FLOSS[k.c].hex;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.stroke();
        if (!isPattern) {
          ctx.beginPath();
          ctx.arc(x - rr * 0.3, y - rr * 0.3, rr * 0.3, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.45)";
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Aperçu du point lancé en cours
      const st = stroke.current;
      if (st && st.tool === "long") {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(ox + st.start.x * s, oy + st.start.y * s);
        ctx.lineTo(ox + st.end.x * s, oy + st.end.y * s);
        ctx.strokeStyle = FLOSS[st.ctx.color].hex;
        ctx.lineWidth = Math.max(2, s * 0.17);
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      }

      // Survol
      const hp = hoverPt.current;
      if (hp && ptrs.current.size === 0 && activeTool !== "hand") {
        if (NODE_TOOLS.includes(activeTool)) {
          const n = nodeOf(P, hp);
          ctx.beginPath();
          ctx.arc(ox + n.x * s, oy + n.y * s, Math.max(5, s * 0.28), 0, Math.PI * 2);
          ctx.fillStyle = "rgba(10,132,255,0.35)";
          ctx.fill();
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          const cc = cellOf(P, hp);
          const x = ox + cc.c * s;
          const y = oy + cc.r * s;
          ctx.fillStyle = "rgba(10,132,255,0.16)";
          ctx.fillRect(x, y, s, s);
          ctx.strokeStyle = ACCENT;
          ctx.lineWidth = 2;
          ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
        }
      }
    }
    ctx.restore();

  }

  /* ---------------------------- Tracé ---------------------------- */

  /**
   * Applique les échantillons d'un segment de tracé.
   *
   * Le brouillon est cloné une seule fois par trait puis muté sur place : le
   * clonage à chaque déplacement de stylet allouait ~1,3 Mo par échantillon sur
   * un 300 × 300 et ~15 Mo sur un 1 000 × 1 000, ce qui gelait l'atelier en
   * plein tracé. `onLive` reçoit une copie superficielle : nouvelle identité
   * pour que React redescende l'état, mêmes tableaux typés en dessous.
   */
  const processSamples = (from: Pt, to: Pt) => {
    const st = stroke.current;
    if (!st) return;
    if (!st.draft) st.draft = clonePattern(st.base);
    const draft = st.draft;
    if (applyStrokeSegment(draft, st.ctx, st.mirror, from, to, latest.current.symmetry)) {
      st.changed = true;
      latest.current.onLive({ ...draft });
      schedule();
    }
  };

  const beginStroke = (pt: Pt) => {
    const { pattern: P, tool: t, color, onBegin, onPick } = latest.current;
    if (t === "hand") return;
    if (latest.current.readOnly) return;
    if (pt.x < 0 || pt.y < 0 || pt.x >= P.w || pt.y >= P.h) return;
    const activeLayer = P.layers?.find((l) => l.id === P.activeLayer);
    if (activeLayer?.locked && !["mark", "details", "block", "row", "park", "unpick", "pick", "note"].includes(t)) {
      setAnnouncement("Ce calque est verrouillé."); return;
    }
    if (t === "pick") {
      const idx = pickAt(P, pt);
      if (idx >= 0) onPick(idx);
      return;
    }
    const node = nodeOf(P, pt);
    const ctx: StrokeCtx = {
      tool: t,
      color,
      lastNode: t === "knot" ? null : node,
      fillDone: false,
      markMode: -1,
      onlyActive: latest.current.onlyActive,
      annotation: latest.current.annotation,
      halfDirection: latest.current.halfDirection,
      lookup: ["mark", "details", "block", "row"].includes(t) ? compositeOf(P) : undefined,
    };
    stroke.current = {
      tool: t,
      ctx,
      mirror: MIRROR_TOOLS.includes(t) ? mirrorContexts(P, ctx, latest.current.symmetry) : [],
      last: pt,
      start: node,
      end: node,
      base: P,
      draft: null,
      changed: false,
    };
    onBegin();
    lasso.current = [pt];
    if (["select", "lasso", "move", "line", "rect", "ellipse"].includes(t)) return;
    processSamples(pt, pt);
    schedule();
  };

  const continueStroke = (pt: Pt) => {
    const st = stroke.current;
    if (!st) return;
    if (["select", "lasso", "move", "line", "rect", "ellipse"].includes(st.tool)) {
      st.last = pt;
      if (st.tool === "lasso") lasso.current.push(pt);
      if (st.tool === "select" || st.tool === "lasso") {
        const pts = lasso.current;
        const a = st.tool === "lasso" ? { x: Math.min(...pts.map((v) => v.x)), y: Math.min(...pts.map((v) => v.y)) } : lasso.current[0];
        const b = st.tool === "lasso" ? { x: Math.max(...pts.map((v) => v.x)), y: Math.max(...pts.map((v) => v.y)) } : pt;
        selected.current = boundedSelection(st.base, a, b, st.tool === "lasso" ? pts.slice() : undefined);
      }
      schedule(); return;
    }
    if (st.tool === "long") {
      st.end = nodeOf(latest.current.pattern, pt);
      schedule();
      return;
    }
    processSamples(st.last, pt);
    st.last = pt;
  };

  const endStroke = () => {
    const st = stroke.current;
    if (!st) return;
    stroke.current = null;
    if (st.tool === "select" || st.tool === "lasso") {
      if (!selected.current) selected.current = boundedSelection(st.base, lasso.current[0], st.last);
      latest.current.onSelection?.(selected.current);
    } else if (["line", "rect", "ellipse"].includes(st.tool)) {
      const shape = st.tool as "line" | "rect" | "ellipse";
      const a = lasso.current[0], b = st.last;
      let d = drawShape(st.base, shape, a, b, st.ctx.color);
      // La forme est reflétée une fois, au relâchement : deux points suffisent
      // à la définir, et la refléter pendant le tracé la ferait clignoter.
      for (const axis of symmetryAxes(latest.current.symmetry)) {
        d = drawShape(d, shape, reflectPoint(st.base, a, axis), reflectPoint(st.base, b, axis), st.ctx.color);
      }
      latest.current.onLive(d); st.changed = true;
    } else if (st.tool === "move" && selected.current) {
      const s = selected.current, dx = Math.round(st.last.x - lasso.current[0].x), dy = Math.round(st.last.y - lasso.current[0].y);
      const d = pasteSelection(clearSelection(st.base, s), extractSelection(st.base, s), s.x + dx, s.y + dy);
      selected.current = { ...s, x: Math.max(0, s.x + dx), y: Math.max(0, s.y + dy) };
      latest.current.onSelection?.(selected.current); latest.current.onLive(d); st.changed = true;
    }
    if (st.tool === "long" && (st.start.x !== st.end.x || st.start.y !== st.end.y)) {
      const draft = st.draft ?? clonePattern(st.base);
      let added = addLongTo(draft, st.start, st.end, st.ctx.color);
      for (const axis of symmetryAxes(latest.current.symmetry)) {
        const a = reflectPoint(st.base, st.start, axis), b = reflectPoint(st.base, st.end, axis);
        if (addLongTo(draft, a, b, st.ctx.color)) added = true;
      }
      if (added) {
        st.draft = draft;
        st.changed = true;
        latest.current.onLive({ ...draft });
      }
    }
    latest.current.onEnd(st.changed);
    schedule();
  };

  const cancelStroke = () => {
    const st = stroke.current;
    if (!st) return;
    stroke.current = null;
    if (st.changed) latest.current.onLive(st.base);
    latest.current.onEnd(false);
    schedule();
  };

  /* ---------------------------- Pointeurs ---------------------------- */

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const updateTip = (p: { x: number; y: number }) => {
    const tip = tipRef.current;
    if (!tip) return;
    const P = latest.current.pattern;
    const wpt = toWorld(p);
    const inside = wpt.x >= 0 && wpt.y >= 0 && wpt.x <= P.w && wpt.y <= P.h;
    if (!inside) {
      hoverPt.current = null;
      tip.style.opacity = "0";
      return;
    }
    hoverPt.current = wpt;
    let lx: number;
    let ly: number;
    let code = "";
    if (NODE_TOOLS.includes(latest.current.tool)) {
      const n = nodeOf(P, wpt);
      lx = n.x - P.w / 2;
      ly = n.y - P.h / 2;
    } else {
      const { c, r } = cellOf(P, wpt);
      lx = c - P.w / 2;
      ly = r - P.h / 2;
      const idx = pickAt(P, wpt);
      if (idx >= 0) code = `DMC ${FLOSS[idx].code}`;
    }
    tip.textContent = `${fmt(lx)} · ${fmt(ly)}${code ? `   ${code}` : ""}`;
    tip.style.transform = `translate(${Math.min(p.x + 16, view.current.w - 180)}px, ${Math.max(p.y - 40, 8)}px)`;
    tip.style.opacity = "1";
    schedule();
  };

  const onDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    ptrs.current.set(e.pointerId, p);
    if (ptrs.current.size >= 2) {
      if (subjectDrag.current) {
        latest.current.onSubjectEnd?.(subjectDrag.current.moved);
        subjectDrag.current = null;
      }
      cancelStroke();
      pan.current = null;
      const [a, b] = [...ptrs.current.values()];
      const v = view.current;
      pinch.current = {
        d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        s0: v.s,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
        ox: v.ox,
        oy: v.oy,
      };
      idle.current = true;
      hoverPt.current = null;
      schedule();
      return;
    }
    idle.current = false;
    const t = latest.current.tool;
    if (e.button === 0 && t === "hand" && latest.current.onSubjectStart) {
      const world = toWorld(p);
      if (latest.current.onSubjectStart(world.x, world.y)) {
        subjectDrag.current = { id: e.pointerId, x: world.x, y: world.y, dx: 0, dy: 0, moved: false };
        return;
      }
    }
    if (t === "hand" || e.button === 1 || e.button === 2 || (latest.current.pencilOnly && e.pointerType === "touch")) {
      pan.current = p;
      return;
    }
    if (e.button !== 0) return;
    beginStroke(toWorld(p));
  };

  const onMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, p);
    const v = view.current;
    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()];
      const pc = pinch.current;
      const ns = clamp((pc.s0 * Math.hypot(a.x - b.x, a.y - b.y)) / pc.d0, minScale(), MAX_S);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const wx = (pc.mx - pc.ox) / pc.s0;
      const wy = (pc.my - pc.oy) / pc.s0;
      v.s = ns;
      v.ox = mx - wx * ns;
      v.oy = my - wy * ns;
      clampView();
      schedule();
      return;
    }
    if (ptrs.current.size === 0) {
      if (e.pointerType !== "touch") updateTip(p);
      return;
    }
    if (idle.current) return;
    if (subjectDrag.current?.id === e.pointerId && ptrs.current.size === 1) {
      const drag = subjectDrag.current, w = toWorld(p);
      const dx = Math.round(w.x - drag.x), dy = Math.round(w.y - drag.y);
      if (drag.dx !== dx || drag.dy !== dy) {
        drag.dx = dx; drag.dy = dy; drag.moved ||= dx !== 0 || dy !== 0;
        latest.current.onSubjectMove?.(dx, dy);
      }
      return;
    }
    if (pan.current && ptrs.current.size === 1) {
      v.ox += p.x - pan.current.x;
      v.oy += p.y - pan.current.y;
      pan.current = p;
      clampView();
      schedule();
      return;
    }
    if (stroke.current && ptrs.current.size === 1) continueStroke(toWorld(p));
  };

  const onUp = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (subjectDrag.current?.id === e.pointerId) {
      latest.current.onSubjectEnd?.(subjectDrag.current.moved);
      subjectDrag.current = null;
    }
    ptrs.current.delete(e.pointerId);
    if (pinch.current && ptrs.current.size < 2) pinch.current = null;
    if (ptrs.current.size === 0) {
      pan.current = null;
      idle.current = false;
      endStroke();
    }
  };

  const onDropMotif = (e: RDragEvent<HTMLCanvasElement>) => {
    const id = e.dataTransfer.getData("application/x-pointzero-motif");
    if (!id || !latest.current.onMotifDrop) return;
    e.preventDefault();
    const point = toWorld(local(e));
    latest.current.onMotifDrop(id, point.x, point.y);
  };
  const onLeave = () => {
    if (ptrs.current.size === 0) {
      hoverPt.current = null;
      if (tipRef.current) tipRef.current.style.opacity = "0";
      schedule();
    }
  };

  /* ---------------------------- Effets ---------------------------- */

  useEffect(() => {
    schedule();
  });

  useEffect(() => {
    if (latest.current.selection !== undefined) selected.current = latest.current.selection;
    schedule();
  }, [props.selection]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      layout();
      if (!view.current.ready) fitView();
      else clampView();
      schedule();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const control = (e: Event) => {
      const d = (e as CustomEvent<{ action: string; x?: number; y?: number; scale?: number }>).detail;
      if (d.action === "fit") fitView();
      if (["zoomIn", "zoomOut", "magnify"].includes(d.action)) {
        const c = content();
        zoomAt(d.action === "zoomOut" ? .8 : d.action === "magnify" ? 2 : 1.25, (c.x0+c.x1)/2, (c.y0+c.y1)/2);
      }
      if (d.action === "focus") {
        const c = content(), v = view.current;
        v.s = d.scale ?? 24; v.ox = (c.x0 + c.x1) / 2 - (d.x ?? 0) * v.s; v.oy = (c.y0 + c.y1) / 2 - (d.y ?? 0) * v.s;
        clampView();
      }
      if (d.action === "clearSelection") { selected.current = null; latest.current.onSelection?.(null); }
      schedule();
    };
    window.addEventListener("pointzero:canvas", control);
    return () => window.removeEventListener("pointzero:canvas", control);
  }, []);

  const dimsKey = `${pattern.w}x${pattern.h}`;
  const insetsKey = `${insets.top}-${insets.right}-${insets.bottom}-${insets.left}`;
  useEffect(() => {
    layout();
    fitView();
    schedule();
  }, [dimsKey, insetsKey, fitKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      if (e.ctrlKey || e.metaKey) {
        zoomAt(Math.exp(-e.deltaY * 0.01), sx, sy);
      } else {
        const v = view.current;
        v.ox -= e.deltaX;
        v.oy -= e.deltaY;
        clampView();
        schedule();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  const cursor =
    tool === "hand" ? (ptrs.current.size ? "grabbing" : "grab") : tool === "pick" ? "copy" : tool === "erase" ? "cell" : "crosshair";

  return (
    <div ref={wrapRef} data-guide="canvas" className="absolute inset-0 overflow-hidden bg-[#faf9f7]">
      <canvas
        ref={canvasRef}
        role="application"
        tabIndex={0}
        aria-label="Grille de broderie. Flèches : changer de case. Entrée : utiliser l'outil. Plus et moins : zoomer."
        className="block h-full w-full touch-none select-none"
        style={{ cursor }}
        onPointerDown={onDown}
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes("application/x-pointzero-motif") && latest.current.onMotifDrop) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }
        }}
        onDrop={onDropMotif}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={(e) => { ptrs.current.delete(e.pointerId); cancelStroke(); }}
        onKeyDown={(e) => {
          const q = keyCell.current, P = latest.current.pattern;
          if (e.key === "+" || e.key === "-") { e.preventDefault(); zoomAt(e.key === "+" ? 1.25 : .8, view.current.w / 2, view.current.h / 2); return; }
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            q.x = clamp(q.x + (e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0), 0, P.w - 1);
            q.y = clamp(q.y + (e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0), 0, P.h - 1);
            hoverPt.current = { x: q.x + .5, y: q.y + .5 };
            const idx = pickAt(P, hoverPt.current);
            setAnnouncement(`Colonne ${q.x + 1}, rangée ${q.y + 1}, ${idx >= 0 ? `DMC ${FLOSS[idx].code}` : "toile vide"}`); schedule();
          }
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); beginStroke({ x: q.x + .5, y: q.y + .5 }); endStroke(); }
        }}
        onPointerLeave={onLeave}
        onContextMenu={(e) => e.preventDefault()}
      />
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
      <div
        ref={tipRef}
        className="glass pointer-events-none absolute top-0 left-0 rounded-[10px] px-2.5 py-1.5 font-mono text-[12px] whitespace-nowrap text-label opacity-0 transition-opacity duration-150"
        aria-hidden="true"
      />
    </div>
  );
}

import type { jsPDF } from "jspdf";

/**
 * Symboles de légende, identiques à ceux des grilles imprimées (type PCStitch / Etsy) :
 * chaque fil du motif reçoit une forme géométrique unique, dans l'ordre d'arrivée.
 * Les formes sont déclaratives : un seul dessin, trois rendus (canvas, PDF, SVG).
 * Espace unitaire : [-1, 1] × [-1, 1].
 */

export type Prim =
  | { t: "c"; r: number; f?: boolean }
  | { t: "p"; pts: [number, number][]; f?: boolean }
  | { t: "s"; segs: [number, number, number, number][] }
  | { t: "r"; x: number; y: number; w: number; h: number; f?: boolean };

const S = 0.70710678;

export const SYMBOLS: Prim[][] = [
  /* dot      */ [{ t: "c", r: 0.6, f: true }],
  /* x        */ [{ t: "s", segs: [[-0.65, -0.65, 0.65, 0.65], [0.65, -0.65, -0.65, 0.65]] }],
  /* sq       */ [{ t: "r", x: -0.55, y: -0.55, w: 1.1, h: 1.1, f: true }],
  /* tri      */ [{ t: "p", pts: [[0, -0.75], [0.8, 0.6], [-0.8, 0.6]], f: true }],
  /* ring     */ [{ t: "c", r: 0.55 }],
  /* plus     */ [{ t: "s", segs: [[0, -0.75, 0, 0.75], [-0.75, 0, 0.75, 0]] }],
  /* dia      */ [{ t: "p", pts: [[0, -0.8], [0.8, 0], [0, 0.8], [-0.8, 0]], f: true }],
  /* triD     */ [{ t: "p", pts: [[0, 0.75], [0.8, -0.6], [-0.8, -0.6]], f: true }],
  /* sqO      */ [{ t: "r", x: -0.55, y: -0.55, w: 1.1, h: 1.1 }],
  /* star8    */ [{ t: "s", segs: [[0, -0.8, 0, 0.8], [-0.8, 0, 0.8, 0], [-0.8 * S, -0.8 * S, 0.8 * S, 0.8 * S], [0.8 * S, -0.8 * S, -0.8 * S, 0.8 * S]] }],
  /* bar      */ [{ t: "r", x: -0.75, y: -0.24, w: 1.5, h: 0.48, f: true }],
  /* diaO     */ [{ t: "p", pts: [[0, -0.8], [0.8, 0], [0, 0.8], [-0.8, 0]] }],
  /* target   */ [{ t: "c", r: 0.75 }, { t: "c", r: 0.3, f: true }],
  /* slash    */ [{ t: "s", segs: [[-0.6, 0.7, 0.6, -0.7]] }],
  /* triO     */ [{ t: "p", pts: [[0, -0.75], [0.8, 0.6], [-0.8, 0.6]] }],
  /* vbar     */ [{ t: "r", x: -0.24, y: -0.75, w: 0.48, h: 1.5, f: true }],
  /* hour     */ [{ t: "p", pts: [[0, 0], [-0.7, -0.78], [0.7, -0.78]], f: true }, { t: "p", pts: [[0, 0], [-0.7, 0.78], [0.7, 0.78]], f: true }],
  /* eq       */ [{ t: "s", segs: [[-0.65, -0.38, 0.65, -0.38], [-0.65, 0.38, 0.65, 0.38]] }],
  /* bow      */ [{ t: "p", pts: [[0, 0], [-0.78, -0.7], [-0.78, 0.7]], f: true }, { t: "p", pts: [[0, 0], [0.78, -0.7], [0.78, 0.7]], f: true }],
  /* bslash   */ [{ t: "s", segs: [[-0.6, -0.7, 0.6, 0.7]] }],
  /* chevU    */ [{ t: "s", segs: [[-0.7, 0.45, 0, -0.55], [0, -0.55, 0.7, 0.45]] }],
  /* diaS     */ [{ t: "p", pts: [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]], f: true }],
  /* chevD    */ [{ t: "s", segs: [[-0.7, -0.45, 0, 0.55], [0, 0.55, 0.7, -0.45]] }],
  /* triDO    */ [{ t: "p", pts: [[0, 0.75], [0.8, -0.6], [-0.8, -0.6]] }],
];

// Variantes vectorielles avec cinq marqueurs périphériques. Les 24 formes de base
// restent inchangées, puis 20 combinaisons distinctes portent la bibliothèque à 504.
const bases = SYMBOLS.slice();
const markers: [number, number][] = [[-.95, -.95], [.68, -.95], [.68, .68], [-.95, .68], [-.14, .84]];
for (let mask = 1; mask <= 20; mask++) {
  for (const base of bases) {
    const scaled: Prim[] = base.map((p): Prim => {
      if (p.t === "c") return { ...p, r: p.r * .68 };
      if (p.t === "r") return { ...p, x: p.x * .68, y: p.y * .68, w: p.w * .68, h: p.h * .68 };
      if (p.t === "p") return { ...p, pts: p.pts.map(([x, y]) => [x * .68, y * .68]) };
      return { ...p, segs: p.segs.map(([x1, y1, x2, y2]) => [x1 * .68, y1 * .68, x2 * .68, y2 * .68]) };
    });
    markers.forEach(([x, y], bit) => { if (mask & (1 << bit)) scaled.push({ t: "r", x, y, w: .28, h: .28, f: true }); });
    SYMBOLS.push(scaled);
  }
}
export const SYMBOL_COUNT = SYMBOLS.length;
export const symbolFor = (pos: number) => Math.max(0, pos) % SYMBOL_COUNT;

/* ------------------------- Rendu canvas ------------------------- */

export function drawSymbol(ctx: CanvasRenderingContext2D, sym: number, cx: number, cy: number, r: number, color: string) {
  const prims = SYMBOLS[symbolFor(sym)];
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.32);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const p of prims) {
    if (p.t === "c") {
      ctx.beginPath();
      ctx.arc(cx, cy, p.r * r, 0, Math.PI * 2);
      p.f ? ctx.fill() : ctx.stroke();
    } else if (p.t === "r") {
      if (p.f) ctx.fillRect(cx + p.x * r, cy + p.y * r, p.w * r, p.h * r);
      else ctx.strokeRect(cx + p.x * r, cy + p.y * r, p.w * r, p.h * r);
    } else if (p.t === "p") {
      ctx.beginPath();
      p.pts.forEach(([x, y], i) => (i ? ctx.lineTo(cx + x * r, cy + y * r) : ctx.moveTo(cx + x * r, cy + y * r)));
      ctx.closePath();
      p.f ? ctx.fill() : ctx.stroke();
    } else {
      ctx.beginPath();
      for (const [x1, y1, x2, y2] of p.segs) {
        ctx.moveTo(cx + x1 * r, cy + y1 * r);
        ctx.lineTo(cx + x2 * r, cy + y2 * r);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ------------------------- Rendu PDF (jsPDF) ------------------------- */

export function drawSymbolPdf(doc: jsPDF, sym: number, cx: number, cy: number, r: number, ink: [number, number, number]) {
  const prims = SYMBOLS[symbolFor(sym)];
  doc.setFillColor(ink[0], ink[1], ink[2]);
  doc.setDrawColor(ink[0], ink[1], ink[2]);
  doc.setLineWidth(Math.max(0.12, r * 0.3));
  doc.setLineCap("round");
  doc.setLineJoin("round");
  for (const p of prims) {
    if (p.t === "c") {
      doc.circle(cx, cy, p.r * r, p.f ? "F" : "S");
    } else if (p.t === "r") {
      doc.rect(cx + p.x * r, cy + p.y * r, p.w * r, p.h * r, p.f ? "F" : "S");
    } else if (p.t === "p") {
      const pts = p.pts.map(([x, y]) => [cx + x * r, cy + y * r] as [number, number]);
      if (p.f) {
        for (let i = 1; i < pts.length - 1; i++)
          doc.triangle(pts[0][0], pts[0][1], pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], "F");
      } else {
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i];
          const b = pts[(i + 1) % pts.length];
          doc.line(a[0], a[1], b[0], b[1]);
        }
      }
    } else {
      for (const [x1, y1, x2, y2] of p.segs) doc.line(cx + x1 * r, cy + y1 * r, cx + x2 * r, cy + y2 * r);
    }
  }
}

/* ------------------------- Rendu SVG (texte) ------------------------- */

const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

/**
 * Troisième rendu de la même définition déclarative : une chaîne SVG, pour
 * l'export vectoriel du patron. Même géométrie que le canvas et le PDF, donc
 * un symbole changé dans l'atelier change partout à la fois.
 */
export function symbolMarkup(sym: number, cx: number, cy: number, r: number, color: string): string {
  const prims = SYMBOLS[symbolFor(sym)];
  const sw = Math.max(r * 0.32, 0.08);
  const out: string[] = [];
  for (const p of prims) {
    if (p.t === "c") {
      out.push(
        p.f
          ? `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(p.r * r)}" fill="${color}"/>`
          : `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(p.r * r)}" fill="none" stroke="${color}" stroke-width="${n2(sw)}"/>`,
      );
    } else if (p.t === "r") {
      const x = cx + p.x * r;
      const y = cy + p.y * r;
      out.push(
        p.f
          ? `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(p.w * r)}" height="${n2(p.h * r)}" fill="${color}"/>`
          : `<rect x="${n2(x)}" y="${n2(y)}" width="${n2(p.w * r)}" height="${n2(p.h * r)}" fill="none" stroke="${color}" stroke-width="${n2(sw)}"/>`,
      );
    } else if (p.t === "p") {
      const pts = p.pts.map(([x, y]) => `${n2(cx + x * r)},${n2(cy + y * r)}`).join(" ");
      out.push(
        p.f
          ? `<polygon points="${pts}" fill="${color}"/>`
          : `<polygon points="${pts}" fill="none" stroke="${color}" stroke-width="${n2(sw)}" stroke-linejoin="round"/>`,
      );
    } else {
      const d = p.segs.map(([x1, y1, x2, y2]) => `M${n2(cx + x1 * r)} ${n2(cy + y1 * r)}L${n2(cx + x2 * r)} ${n2(cy + y2 * r)}`).join("");
      out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${n2(sw)}" stroke-linecap="round"/>`);
    }
  }
  return out.join("");
}

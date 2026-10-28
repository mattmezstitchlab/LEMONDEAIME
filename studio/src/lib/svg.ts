import { FLOSS, contrastOn } from "./dmc";
import { symbolMarkup } from "./symbols";
import { assignedSymbol, compositePattern, computeStats, fabricInfo, type Pattern } from "./pattern";
import { downloadBlob, slugify } from "./io";

/**
 * Export SVG vectoriel du patron.
 *
 * Troisième rendu de la même définition de symboles (canvas, jsPDF, SVG) : un
 * symbole personnalisé dans l'atelier est identique partout.
 *
 * Le SVG est compact par construction — les aplats et le réseau de grille sont
 * regroupés en un seul chemin par couleur / par épaisseur, pas un élément par
 * case. Les symboles, eux, restent individuels : au-delà de `symbolLimit`
 * cases le fichier deviendrait inutilisable, ils sont alors omis et l'atelier
 * le dit.
 */

export interface SvgOptions {
  /** Symboles seuls sur fond blanc, sans aplat de couleur. */
  bw?: boolean;
  /** Imprimer les symboles dans les cases. */
  symbols?: boolean;
  /** Réseau de grille, avec les dizaines renforcées. */
  grid?: boolean;
  /** Légende des fils sous la grille. */
  legend?: boolean;
  /** Taille d'une case, en unités SVG. */
  cell?: number;
  /** Au-delà, les symboles sont omis pour garder un fichier exploitable. */
  symbolLimit?: number;
}

const DEFAULTS = { bw: false, symbols: true, grid: true, legend: true, cell: 12, symbolLimit: 90_000 };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const Q_CORNER: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

export interface SvgResult {
  svg: string;
  /** Cases trop nombreuses pour porter des symboles : ils ont été omis. */
  symbolsOmitted: boolean;
  bytes: number;
}

export function patternToSvg(input: Pattern, options: SvgOptions = {}): SvgResult {
  const o = { ...DEFAULTS, ...options };
  const p = compositePattern(input);
  const { rows, totals } = computeStats(p);
  const fab = fabricInfo(p);
  const S = o.cell;
  const PAD = S * 3;
  const gw = p.w * S;
  const gh = p.h * S;
  const symbolsOmitted = o.symbols && p.w * p.h > o.symbolLimit;
  const drawSymbols = o.symbols && !symbolsOmitted;
  const paper = o.bw ? "#ffffff" : (p.fabric?.color ?? "#f7f2e8");
  const gridMinor = o.bw ? "rgba(30,30,30,0.16)" : "rgba(92,70,48,0.22)";
  const gridMajor = o.bw ? "rgba(20,20,20,0.55)" : "rgba(92,70,48,0.5)";
  const inkOf = (idx: number) => (o.bw ? "#141210" : contrastOn(FLOSS[idx]?.hex ?? "#ffffff"));

  const legendColumns = o.legend ? Math.max(1, Math.min(4, Math.floor(gw / (S * 15)) || 1)) : 1;
  const legendRows = o.legend ? Math.ceil(rows.length / legendColumns) : 0;
  const legendH = o.legend ? legendRows * S * 2.1 + S * 3 : 0;
  const width = gw + PAD * 2;
  const height = gh + PAD * 2 + legendH;

  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(width)}" height="${n2(height)}" viewBox="0 0 ${n2(width)} ${n2(height)}" shape-rendering="geometricPrecision">`);

  const desc = [
    `${p.name} — ${p.w} × ${p.h} cases`,
    `${p.fabric?.type ?? "aida"} ${p.count} ct sur ${p.fabric?.over ?? 1}, ${fab.fw.toFixed(1)} × ${fab.fh.toFixed(1)} cm`,
    `${totals.colors} fils, ${totals.cross} points de croix`,
    p.provenance?.author ? `Auteur : ${p.provenance.author}` : "",
    p.provenance?.source ? `Source : ${p.provenance.source}` : "",
    p.provenance?.license ? `Droits : ${p.provenance.license}` : "",
    "Généré par Point Zéro. Données couleur : craft-color-codes par MakeBead, CC BY 4.0.",
  ]
    .filter(Boolean)
    .join(" · ");
  out.push(`<title>${esc(p.name)}</title><desc>${esc(desc)}</desc>`);
  out.push(`<rect width="${n2(width)}" height="${n2(height)}" fill="#fbfaf7"/>`);
  out.push(`<g transform="translate(${n2(PAD)},${n2(PAD)})">`);
  out.push(`<rect width="${n2(gw)}" height="${n2(gh)}" fill="${paper}"/>`);

  /* --- Aplats de couleur, un chemin par fil --- */
  if (!o.bw) {
    for (const r of rows) {
      const d: string[] = [];
      for (let i = 0; i < p.cross.length; i++) {
        if (p.cross[i] !== r.idx) continue;
        const x = (i % p.w) * S;
        const yy = Math.floor(i / p.w) * S;
        d.push(`M${n2(x)} ${n2(yy)}h${n2(S)}v${n2(S)}h${n2(-S)}Z`);
      }
      if (d.length) out.push(`<path d="${d.join("")}" fill="${r.hex}"/>`);
    }
  }

  /* --- Demi-points et quarts de point --- */
  for (const [arr, flip] of [[p.fwd, false], [p.bwd, true]] as const) {
    for (const r of rows) {
      const d: string[] = [];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] !== r.idx) continue;
        const x = (i % p.w) * S;
        const yy = Math.floor(i / p.w) * S;
        d.push(flip ? `M${n2(x)} ${n2(yy)}L${n2(x + S)} ${n2(yy + S)}` : `M${n2(x)} ${n2(yy + S)}L${n2(x + S)} ${n2(yy)}`);
      }
      if (d.length) {
        out.push(`<path d="${d.join("")}" fill="none" stroke="${o.bw ? "#3a3a3a" : r.hex}" stroke-width="${n2(S * 0.16)}" stroke-linecap="round"/>`);
      }
    }
  }
  for (let k = 0; k < 4; k++) {
    for (const r of rows) {
      const d: string[] = [];
      for (let i = 0; i < p.q[k].length; i++) {
        if (p.q[k][i] !== r.idx) continue;
        const [qx, qy] = Q_CORNER[k];
        const x = (i % p.w) * S + qx * S;
        const yy = Math.floor(i / p.w) * S + qy * S;
        d.push(`M${n2(x)} ${n2(yy)}L${n2((i % p.w) * S + S / 2)} ${n2(Math.floor(i / p.w) * S + S / 2)}`);
      }
      if (d.length) out.push(`<path d="${d.join("")}" fill="none" stroke="${o.bw ? "#3a3a3a" : r.hex}" stroke-width="${n2(S * 0.16)}" stroke-linecap="round"/>`);
    }
  }

  /* --- Réseau de grille --- */
  if (o.grid) {
    const minor: string[] = [];
    const major: string[] = [];
    for (let c = 0; c <= p.w; c++) {
      const x = c * S;
      (c % 10 === 0 ? major : minor).push(`M${n2(x)} 0V${n2(gh)}`);
    }
    for (let r = 0; r <= p.h; r++) {
      const yy = r * S;
      (r % 10 === 0 ? major : minor).push(`M0 ${n2(yy)}H${n2(gw)}`);
    }
    if (minor.length) out.push(`<path d="${minor.join("")}" fill="none" stroke="${gridMinor}" stroke-width="0.6"/>`);
    if (major.length) out.push(`<path d="${major.join("")}" fill="none" stroke="${gridMajor}" stroke-width="1.2"/>`);
  }

  /* --- Axes du point zéro --- */
  const ax = (p.w / 2) * S;
  const ay = (p.h / 2) * S;
  out.push(`<path d="M${n2(ax)} 0V${n2(gh)}M0 ${n2(ay)}H${n2(gw)}" fill="none" stroke="#ff453a" stroke-width="1.4" opacity="0.85"/>`);

  /* --- Symboles --- */
  if (drawSymbols) {
    for (const r of rows) {
      const parts: string[] = [];
      const sym = assignedSymbol(p, r.idx);
      const color = inkOf(r.idx);
      for (let i = 0; i < p.cross.length; i++) {
        if (p.cross[i] !== r.idx) continue;
        parts.push(symbolMarkup(sym, (i % p.w) * S + S / 2, Math.floor(i / p.w) * S + S / 2, S * 0.33, color));
      }
      for (let i = 0; i < p.fwd.length; i++) {
        if (p.fwd[i] !== r.idx) continue;
        parts.push(symbolMarkup(sym, (i % p.w) * S + S * 0.24, Math.floor(i / p.w) * S + S * 0.24, S * 0.15, color));
      }
      for (let i = 0; i < p.bwd.length; i++) {
        if (p.bwd[i] !== r.idx) continue;
        parts.push(symbolMarkup(sym, (i % p.w) * S + S * 0.76, Math.floor(i / p.w) * S + S * 0.24, S * 0.15, color));
      }
      for (let k = 0; k < 4; k++) {
        for (let i = 0; i < p.q[k].length; i++) {
          if (p.q[k][i] !== r.idx) continue;
          const [qx, qy] = Q_CORNER[k];
          parts.push(symbolMarkup(sym, (i % p.w) * S + S * (qx ? 0.82 : 0.18), Math.floor(i / p.w) * S + S * (qy ? 0.72 : 0.28), S * 0.12, color));
        }
      }
      if (parts.length) out.push(`<g data-floss="${esc(r.code)}">${parts.join("")}</g>`);
    }
  }

  /* --- Contours, lancés, nœuds, petites croix et perles --- */
  for (const [list, widthFactor] of [[p.back, 0.12], [p.long, 0.2]] as const) {
    for (const r of rows) {
      const d: string[] = [];
      for (const s of list) {
        if (s.c !== r.idx) continue;
        d.push(`M${n2(s.x1 * S)} ${n2(s.y1 * S)}L${n2(s.x2 * S)} ${n2(s.y2 * S)}`);
      }
      if (d.length) out.push(`<path d="${d.join("")}" fill="none" stroke="${o.bw ? "#6e6e6e" : r.hex}" stroke-width="${n2(S * widthFactor)}" stroke-linecap="round"/>`);
    }
  }
  for (const r of rows) {
    const knots = p.knots.filter((k) => k.c === r.idx);
    if (knots.length) {
      const fill = o.bw ? "#141210" : r.hex;
      out.push(
        `<g fill="${fill}" stroke="${o.bw ? "none" : "#5a5a5a"}" stroke-width="0.5">` +
          knots.map((k) => `<circle cx="${n2(k.x * S)}" cy="${n2(k.y * S)}" r="${n2(S * 0.24)}"/>`).join("") +
          "</g>",
      );
    }
    for (const kind of ["petite", "bead"] as const) {
      const items = (p.special ?? []).filter((s) => s.c === r.idx && s.kind === kind);
      if (!items.length) continue;
      const color = o.bw ? "#141210" : r.hex;
      if (kind === "petite") {
        const d = items.map((s) => `M${n2((s.x - 0.18) * S)} ${n2((s.y - 0.18) * S)}L${n2((s.x + 0.18) * S)} ${n2((s.y + 0.18) * S)}M${n2((s.x + 0.18) * S)} ${n2((s.y - 0.18) * S)}L${n2((s.x - 0.18) * S)} ${n2((s.y + 0.18) * S)}`).join("");
        out.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${n2(S * 0.1)}" stroke-linecap="round"/>`);
      } else {
        out.push(
          `<g fill="${color}" stroke="${o.bw ? "#141210" : "#464646"}" stroke-width="0.5">` +
            items.map((s) => `<ellipse cx="${n2(s.x * S)}" cy="${n2(s.y * S)}" rx="${n2(S * 0.17)}" ry="${n2(S * 0.28)}" transform="rotate(-20 ${n2(s.x * S)} ${n2(s.y * S)})"/>`).join("") +
            "</g>",
        );
      }
    }
  }

  /* --- Repères d'annotations --- */
  (p.annotations ?? []).forEach((a, i) => {
    const x = (a.x + 0.5) * S;
    const yy = (a.y + 0.5) * S;
    const k = S * 0.34;
    out.push(`<rect x="${n2(x - k)}" y="${n2(yy - k)}" width="${n2(k * 2)}" height="${n2(k * 2)}" fill="#ff9f0a" stroke="#5a5a5a" stroke-width="0.5"/>`);
    out.push(`<text x="${n2(x)}" y="${n2(yy + k * 0.42)}" font-family="ui-monospace, Menlo, monospace" font-size="${n2(S * 0.62)}" font-weight="700" fill="#282828" text-anchor="middle">${i + 1}</text>`);
  });

  /* --- Numéros d'axe --- */
  const axisFont = `font-family="ui-monospace, Menlo, monospace" font-size="${n2(S * 0.62)}" fill="#6e6e6e"`;
  for (let c = 0; c <= p.w; c += 10) {
    out.push(`<text x="${n2(c * S)}" y="${n2(-S * 0.7)}" ${axisFont} text-anchor="middle">${c - p.w / 2}</text>`);
    out.push(`<text x="${n2(c * S)}" y="${n2(gh + S * 1.2)}" ${axisFont} text-anchor="middle">${c - p.w / 2}</text>`);
  }
  for (let r = 0; r <= p.h; r += 10) {
    out.push(`<text x="${n2(-S * 0.7)}" y="${n2(r * S + S * 0.22)}" ${axisFont} text-anchor="end">${r - p.h / 2}</text>`);
  }

  out.push("</g>");

  /* --- Légende --- */
  if (o.legend && rows.length) {
    const top = PAD + gh + S * 2;
    const colW = gw / legendColumns;
    out.push(`<g transform="translate(${n2(PAD)},${n2(top)})">`);
    rows.forEach((r, i) => {
      const column = Math.floor(i / legendRows);
      const rank = i % legendRows;
      const x = column * colW;
      const yy = rank * S * 2.1;
      const sym = assignedSymbol(p, r.idx);
      out.push(`<g transform="translate(${n2(x)},${n2(yy)})">`);
      out.push(
        o.bw
          ? `<rect width="${n2(S * 1.4)}" height="${n2(S * 1.4)}" fill="none" stroke="#787878" stroke-width="0.8"/>`
          : `<rect width="${n2(S * 1.4)}" height="${n2(S * 1.4)}" fill="${r.hex}" stroke="#787878" stroke-width="0.8"/>`,
      );
      out.push(`<g transform="translate(${n2(S * 0.7)},${n2(S * 0.7)}) scale(${n2((S * 0.55) / 1)})">${symbolMarkup(sym, 0, 0, 1, "#141210")}</g>`);
      const bead = p.beadMap?.[r.code];
      const label = `${FLOSS[r.idx].blend ? "Mix" : r.code} · ${r.name}${bead ? ` · ${bead}` : ""}`;
      out.push(
        `<text x="${n2(S * 2)}" y="${n2(S * 0.62)}" font-family="-apple-system, Inter, system-ui, sans-serif" font-size="${n2(S * 0.62)}" fill="#1c1c1e">${esc(label.slice(0, 42))}</text>`,
      );
      out.push(
        `<text x="${n2(S * 2)}" y="${n2(S * 1.24)}" font-family="ui-monospace, Menlo, monospace" font-size="${n2(S * 0.52)}" fill="#6e6e6e">${num(r.cross + r.half + r.quarter + r.petite + r.beads)} pts · ${r.meters.toFixed(1)} m · ${r.skeins} éch.</text>`,
      );
      out.push("</g>");
    });
    out.push(
      `<text x="0" y="${n2(legendRows * S * 2.1 + S)}" font-family="-apple-system, Inter, system-ui, sans-serif" font-size="${n2(S * 0.5)}" fill="#8c8c8c">Données couleur : craft-color-codes par MakeBead, CC BY 4.0. Teintes écran approchées : à confirmer sur carte physique.${symbolsOmitted ? ` Symboles omis : au-delà de ${o.symbolLimit.toLocaleString("fr-FR")} cases, le fichier SVG deviendrait inutilisable.` : ""}</text>`,
    );
    out.push("</g>");
  }

  out.push("</svg>");
  const svg = out.join("\n");
  return { svg, symbolsOmitted, bytes: new Blob([svg]).size };
}

const num = (v: number) => v.toLocaleString("fr-FR");

export function downloadSvg(p: Pattern, options: SvgOptions = {}) {
  const { svg } = patternToSvg(p, options);
  downloadBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), `${slugify(p.name)}-grille${options.bw ? "-nb" : "-couleur"}.svg`);
}

import type { jsPDF } from "jspdf";
import { FLOSS } from "./dmc";
import { beadByCode, GLASS_LABEL, loadBeads, type Bead } from "./beads";
import { equivalenceWarning, FAR_DELTA_E, STATUS_LABEL, type EquivalenceTable } from "./palettes";
import { drawSymbolPdf } from "./symbols";
import {
  assignedSymbol,
  compositePattern,
  computeStats,
  effectiveCount,
  fabricInfo,
  skeinsAtCount,
  type Pattern,
} from "./pattern";
import { slugify } from "./io";

/**
 * Export PDF du patron : couverture, légende des fils, index des pages,
 * notes, table des contours et ornements, puis les grilles.
 *
 * Ce qui est imprimé est le **motif**, pas l'avancement : `done`, `mistakes`
 * et `parked` (fils garés) restent à l'écran. Les calques sont fusionnés par
 * `compositePattern`, exactement comme le canvas, l'export PNG et l'OXS — un
 * projet à calques s'imprime tel qu'il s'affiche.
 *
 * Les symboles viennent de `assignedSymbol` (donc du `symbolMap` persistant et
 * des changements faits dans la fiche fil), jamais de la position dans la
 * palette : la grille imprimée, sa légende, l'écran et le fichier OXS montrent
 * le même symbole.
 *
 * La numérotation est résolue en fin de production (`doc.getNumberOfPages()`),
 * jamais estimée : la couverture, la légende et les notes peuvent déborder sur
 * plusieurs pages, et un total deviné serait faux dès qu'une ligne se replie.
 */

const BLOCK = 40; // cases par page de grille
const OVERLAP = 10; // cases répétées en bord de page, pour caler les feuilles
const ORN_PER_PAGE = 32; // lignes d'ornement par page, sûr en A4 comme en Letter
const LEFT = 22;
const RIGHT = 14;
const TOP = 30;
const BOTTOM = 18;
const MAX_CELL = 7;
const MIN_CELL = 1.4;

export interface PdfOptions {
  /** Grille noir et blanc (symboles seuls), comme les patrons Etsy classiques. */
  bw: boolean;
  paper?: "a4" | "letter";
  /**
   * Répète `OVERLAP` cases du bloc voisin en bas et à droite de chaque page,
   * sur fond grisé. En posant deux feuilles bord à bord, la bande grise de
   * l'une recouvre exactement le début de l'autre : c'est un repère de calage
   * réel, pas seulement une marge teintée.
   */
  overlap?: boolean;
  /**
   * Table de correspondance vers une autre marque (broderie diamant, perles à
   * repasser), calculée par l'appelant. Une page de couverture la résume et une
   * page dédiée la détaille, après la légende des fils.
   */
  equivalences?: EquivalenceTable;
  /** Progression (pages de grille produites / total), pour un export long. */
  onProgress?: (done: number, total: number, label: string) => void;
  /** Annulation coopérative, vérifiée entre chaque page. */
  signal?: AbortSignal;
}

/** Interruption demandée par l'utilisateur : n'est pas une erreur d'export. */
export class PdfAborted extends Error {
  constructor() {
    super("Export interrompu");
    this.name = "PdfAborted";
  }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const hexRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const isDark = ([r, g, b]: [number, number, number]) => 0.299 * r + 0.587 * g + 0.114 * b < 150;
const fmt = (n: number, d = 1) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (n: number) => n.toLocaleString("fr-FR");
const axis = (v: number, half: number) => {
  const d = v - half;
  return d > 0 ? `+${d}` : String(d);
};

/**
 * jsPDF n'embarque que des fontes standard Latin-1 (WinAnsi). Tout caractère
 * hors de cette table — œ, …, —, Δ, les flèches de navigation, les guillemets
 * typographiques, un emoji dans un nom de projet — part en glyphe parasite à
 * l'impression.
 *
 * Le dépôt écrivait déjà « Noeud » au lieu de « Nœud » pour cette raison, mais
 * les flèches et les points de suspension de l'ancienne version étaient
 * illisibles une fois imprimés. Le repli est appliqué à la source, sur `text`
 * et `splitTextToSize`, pour qu'aucun appel du fichier ne puisse y échapper —
 * y compris le texte saisi par la personne qui brode.
 */
const GLYPH_FALLBACK: Record<string, string> = {
  "\u0153": "oe", "\u0152": "OE", "\u00e6": "ae", "\u00c6": "AE",
  "\u2026": "...", "\u2014": "-", "\u2013": "-", "\u2011": "-",
  "\u2191": "haut ", "\u2193": "bas ", "\u2190": "gauche ", "\u2192": "droite ",
  "\u0394": "delta ", "\u2265": ">=", "\u2264": "<=", "\u2248": "~",
  "\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'",
  "\u2022": "-", "\u00a0": " ", "\u00b0": " deg", "\u20ac": "EUR",
};
const latin1 = (value: string) => value.replace(/[^\u0020-\u007E\u00A1-\u00FF]/g, (c) => GLYPH_FALLBACK[c] ?? "");

function onlyLatin1(doc: jsPDF): jsPDF {
  const rawText = doc.text.bind(doc) as (value: string | string[], x: number, y: number, options?: unknown) => jsPDF;
  const rawSplit = doc.splitTextToSize.bind(doc) as (value: string, width: number) => string[];
  doc.splitTextToSize = ((value: string, width: number) => rawSplit(latin1(String(value)), width)) as unknown as typeof doc.splitTextToSize;
  doc.text = ((value: string | string[], x: number, y: number, options?: unknown) =>
    rawText(Array.isArray(value) ? value.map(latin1) : latin1(String(value)), x, y, options)) as unknown as typeof doc.text;
  return doc;
}

/** Nom de fichier cohérent, partagé par tous les appelants. */
export function pdfFileName(p: Pattern, opts: PdfOptions) {
  return `${slugify(p.name)}-${opts.paper ?? "a4"}${opts.bw ? "-symboles" : "-couleur"}.pdf`;
}

/** Chevrons de demi-points, dessinés comme sur les grilles imprimées. */
function chevron(doc: jsPDF, cell: number, x: number, y: number, flip: boolean, ink: [number, number, number]) {
  doc.setDrawColor(ink[0], ink[1], ink[2]);
  doc.setLineWidth(Math.max(0.15, cell * 0.16));
  doc.setLineCap("round");
  doc.line(x + cell * 0.5, y + cell * (flip ? 0.78 : 0.22), x + cell * (flip ? 0.86 : 0.14), y + cell * 0.5);
  doc.line(x + cell * (flip ? 0.14 : 0.86), y + cell * 0.5, x + cell * 0.5, y + cell * (flip ? 0.22 : 0.78));
}

interface OrnRow {
  kind: string;
  from: string;
  to: string;
  idx: number;
  len: number;
}

/** Contours et ornements listés avec leurs coordonnées relatives au point zéro. */
function ornamentRows(p: Pattern): OrnRow[] {
  const cx = p.w / 2;
  const cy = p.h / 2;
  const at = (x: number, y: number) => `${axis(Math.round(x), cx)} ; ${axis(Math.round(y), cy)}`;
  const out: OrnRow[] = [];
  for (const s of p.back) {
    out.push({ kind: "Point arrière", from: at(s.x1, s.y1), to: at(s.x2, s.y2), idx: s.c, len: Math.hypot(s.x2 - s.x1, s.y2 - s.y1) });
  }
  for (const s of p.long) {
    out.push({ kind: "Point lancé", from: at(s.x1, s.y1), to: at(s.x2, s.y2), idx: s.c, len: Math.hypot(s.x2 - s.x1, s.y2 - s.y1) });
  }
  for (const k of p.knots) out.push({ kind: "Noeud français", from: at(k.x, k.y), to: "-", idx: k.c, len: 1 });
  for (const s of p.special ?? []) {
    out.push({ kind: s.kind === "bead" ? "Perle" : "Petite croix", from: at(s.x, s.y), to: "-", idx: s.c, len: 1 });
  }
  return out;
}

/** Export PDF professionnel. Renvoie le blob ; ne télécharge rien. */
export async function buildPdf(input: Pattern, opts: PdfOptions = { bw: false }): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const p = compositePattern(input);
  const bw = !!opts.bw;
  const overlap = opts.overlap !== false ? OVERLAP : 0;
  const { rows, totals } = computeStats(p);
  const fab = fabricInfo(p);
  const doc = onlyLatin1(new jsPDF({ unit: "mm", format: opts.paper ?? "a4", orientation: "portrait" }));
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const printW = pageW - LEFT - RIGHT;
  const pageCounts = [11, 14, 16, 18];

  const cols = Math.ceil(p.w / BLOCK);
  const rowsB = Math.ceil(p.h / BLOCK);
  const gridPages = cols * rowsB;
  /* La case est calculée sur le bloc réellement le plus large à imprimer, pas
     sur le bloc nominal : un 12 × 12 ne dessine jamais 40 cases plus le
     chevauchement, il peut donc être imprimé bien plus grand. Le chevauchement
     est compté dès qu'il existe, car la grille le dessine vraiment (les
     colonnes et lignes sont bornées par la taille du motif). */
  const tileW = Math.min(p.w, BLOCK + overlap);
  const tileH = Math.min(p.h, BLOCK + overlap);
  const CELL = Math.min(
    MAX_CELL,
    Math.max(MIN_CELL, Math.min((pageW - LEFT - RIGHT) / tileW, (pageH - TOP - BOTTOM) / tileH)),
  );

  const annotations = p.annotations ?? [];
  const ornaments = ornamentRows(p);

  /* --------- Références de perle choisies, si le motif en porte --------- */
  const beads = new Map<string, Bead>();
  if (p.beadMap && Object.keys(p.beadMap).length) {
    try {
      const palette = await loadBeads();
      for (const [code, ref] of Object.entries(p.beadMap)) {
        const found = beadByCode(palette.colors, ref);
        if (found) beads.set(code, found);
      }
    } catch {
      /* Les perles sont un complément : leur absence ne bloque pas l'impression. */
    }
  }

  const ink: [number, number, number] = bw ? [18, 18, 18] : [20, 20, 20];
  const grey: [number, number, number] = [110, 110, 110];

  let y = 0;
  /** Replie un texte sur la largeur imprimable (déjà passé par le repli Latin-1). */
  const wrap = (value: string, width: number) => doc.splitTextToSize(value, width) as string[];

  const footer = (page: number, pageCount: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(p.name.slice(0, 60), LEFT, pageH - 11);
    const credit = [
      p.provenance?.author || p.provenance?.source
        ? `© ${p.provenance.author || "Auteur non renseigné"}${p.provenance.source ? ` · ${p.provenance.source}` : ""}`
        : "",
      p.provenance?.personalOnly ? "Usage personnel uniquement" : "",
    ]
      .filter(Boolean)
      .join(" · ");
    if (credit) {
      doc.setFontSize(6.5);
      doc.text(credit.slice(0, 120), LEFT, pageH - 15.5);
    }
    doc.setFontSize(8);
    doc.text(`Page ${page} / ${pageCount}`, pageW - RIGHT, pageH - 11, { align: "right" });
    doc.setTextColor(0);
  };

  const heading = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text(title, LEFT, 22);
  };

  /* --------------------------- 1. Page de couverture --------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  const titleLines = wrap(p.name, printW);
  doc.text(titleLines.slice(0, 2), LEFT, 34);
  y = 34 + Math.min(2, titleLines.length) * 10 + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(115);
  doc.text("Grille de broderie point de croix", LEFT, y);
  y = Math.max(y + 14, 58);

  const section = (title: string) => {
    if (y > pageH - 46) {
      doc.addPage();
      y = 24;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(0);
    doc.text(title, LEFT, y);
    doc.setDrawColor(210);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y + 2.5, pageW - RIGHT, y + 2.5);
    y += 9;
  };
  const line = (k: string, v: string) => {
    if (y > pageH - 26) {
      doc.addPage();
      y = 24;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(115);
    doc.text(k, LEFT + 2, y);
    doc.setTextColor(0);
    const lines = wrap(v, printW - 66);
    doc.text(lines, LEFT + 66, y);
    y += 6.6 * Math.max(1, lines.length);
  };

  section("Spécifications");
  line("Grille", `${p.w} × ${p.h} cases (point zéro au centre)`);
  line("Toile", `${p.fabric?.type ?? "aida"} ${p.count} ct, sur ${p.fabric?.over ?? 1} fil(s), soit ${fmt(effectiveCount(p), 1)} pts/pouce`);
  line("Brins", `${p.strands} brin${p.strands > 1 ? "s" : ""} · point arrière ${p.backStrands ?? 1} brin${(p.backStrands ?? 1) > 1 ? "s" : ""}`);
  line("Taille finie", `${fmt(fab.fw)} × ${fmt(fab.fh)} cm`);
  line("Toile minimum", `${fmt(fab.mw, 0)} × ${fmt(fab.mh, 0)} cm (marge ${fmt(p.fabric?.margin ?? 7.5, 1)} cm / côté)`);
  line(
    "Impression",
    `${opts.paper === "letter" ? "US Letter" : "A4"} · ${bw ? "symboles noir et blanc" : "couleur et symboles"} · ${num(gridPages)} page${gridPages > 1 ? "s" : ""} de grille · case de ${fmt(CELL, 2)} mm${overlap ? ` · chevauchement de ${overlap} cases` : ""}`,
  );

  y += 2;
  section("Comptage des points");
  line("Points de croix", num(totals.cross));
  if (totals.half) line("Demi-points", num(totals.half));
  if (totals.quarter) line("Quarts de point", num(totals.quarter));
  if (totals.backCm) line("Point arrière", `${fmt(totals.backCm, 0)} cm de tracé`);
  if (totals.longCm) line("Point lancé", `${fmt(totals.longCm, 0)} cm de tracé`);
  if (totals.knots) line("Noeuds français", num(totals.knots));
  const petites = rows.reduce((n, r) => n + r.petite, 0);
  const beadsCount = rows.reduce((n, r) => n + r.beads, 0);
  if (petites) line("Petites croix", num(petites));
  if (beadsCount) line("Perles", num(beadsCount));
  line("Fils différents", num(totals.colors));
  line("Métrage estimé", `${fmt(totals.meters, 1)} m de brin simple · ${num(totals.skeins)} écheveau(x)`);

  y += 2;
  section("Taille et écheveaux selon le comptage de toile");
  for (const c of pageCounts) {
    const f = fabricInfo({ ...p, count: c as Pattern["count"] });
    line(`Aida ${c} ct`, `${fmt(f.fw)} × ${fmt(f.fh)} cm · ${num(skeinsAtCount(p, rows, c))} écheveau(x)`);
  }

  const eq = opts.equivalences?.rows.length ? opts.equivalences : null;
  if (eq) {
    y += 2;
    section("Correspondances multi-marques");
    line("Marque", `${eq.palette.brand} ${eq.palette.product}`);
    line("Table", `${eq.palette.count} références, statut « ${eq.palette.status} » (${STATUS_LABEL[eq.palette.status] ?? eq.palette.status}), licence ${eq.palette.license}`);
    line("Écart de teinte", `médian ${fmt(eq.median, 1)} delta E00, le plus mauvais ${fmt(eq.worst, 1)}`);
    line(
      "Sans correspondance",
      eq.far.length
        ? `${eq.far.length} couleur(s) au-delà de ${FAR_DELTA_E} delta E00, à choisir à la main`
        : `aucune couleur au-delà de ${FAR_DELTA_E} delta E00`,
    );
    line("Détail", `${eq.rows.length} ligne(s) dans la page dédiée, après la légende des fils`);
  }

  if (beads.size) {
    y += 2;
    section("Perles");
    line("Référence", "Miyuki Delica 11/0 (DB)");
    line("Appariements", `${beads.size} fil(s), détaillés dans la légende`);
    line(
      "Fidélité",
      "Table mesurée sur les photos produit Miyuki : la bonne perle, une teinte approchée (écart médian de 6 à 12 ΔE00 selon la source). Les finitions métallisées, galvanisées, AB et silver-lined ne sont pas une couleur plate.",
    );
  }

  y += 2;
  section("Comment lire cette grille");
  const note = [
    `Chaque fil possède un symbole unique, reporté dans la légende${bw ? "" : " et imprimé en couleur dans les cases"}.`,
    "Les demi-points sont des chevrons, les quarts de point des traits du coin vers le centre, le point arrière un trait fin entre deux trous, le point lancé un trait épais, le noeud français un cercle, la petite croix une croix réduite et la perle une ellipse percée.",
    `Les lignes rouges marquent le point zéro central. Les axes sont numérotés depuis ce point${overlap ? `. Les bandes grisées en bas et à droite répètent ${overlap} cases de la page suivante : elles servent à caler les feuilles avant collage.` : "."}`,
    ornaments.length ? "Chaque contour et ornement est listé avec ses coordonnées et son fil dans la table dédiée." : "",
    annotations.length ? "Les repères carrés numérotés renvoient aux notes de la page dédiée." : "",
    "L'avancement, les cases à défaire et les fils garés ne sont pas imprimés : ce PDF est le motif, pas votre suivi.",
    "Les couleurs DMC affichées sont des approximations numériques : vérifiez sur une carte physique avant d'acheter. Le métrage est une estimation géométrique avec marge, pas une mesure de votre tension.",
  ]
    .filter(Boolean)
    .join(" ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110);
  const noteLines = wrap(note, printW);
  doc.text(noteLines, LEFT, y);
  y += noteLines.length * 3.6 + 4;

  if (y > pageH - 40) {
    doc.addPage();
    y = 24;
  }
  doc.setFontSize(7);
  doc.setTextColor(140);
  const attribution =
    "Données couleur : craft-color-codes par MakeBead (makebead.com), licence CC BY 4.0 — DMC Mouliné Spécial art. 117" +
    (beads.size ? " et Miyuki Delica 11/0" : "") +
    (eq ? ` et ${eq.palette.brand} ${eq.palette.product}, licence ${eq.palette.license}` : "") +
    ". Ces marques ne publient pas de table RGB officielle exploitable : les teintes écran sont des approximations à confirmer sur carte physique.";
  doc.text(wrap(attribution, printW), LEFT, y);
  doc.setTextColor(0);

  /* ------------------ 1bis. Échelle d'impression à vérifier ------------------ */
  y += 8;
  if (y > pageH - BOTTOM - 30) {
    doc.addPage();
    y = 24;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("Échelle d'impression", LEFT, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(90);
  const rulerNote = wrap(
    `Ce trait doit mesurer exactement 10 cm une fois imprimé. S'il est plus court ou plus long, ` +
      `l'imprimante redimensionne la page : réglez l'échelle sur 100 % et désactivez l'ajustement à la page. ` +
      `La taille finie annoncée et la case de ${fmt(CELL, 2)} mm ne sont justes qu'à cette condition.`,
    printW,
  );
  doc.text(rulerNote, LEFT, y);
  y += rulerNote.length * 3.6 + 6;
  const rulerX = LEFT;
  doc.setDrawColor(60);
  doc.setLineWidth(0.4);
  doc.line(rulerX, y, rulerX + 100, y);
  doc.setLineWidth(0.25);
  for (let mm = 0; mm <= 100; mm += 5) {
    const major = mm % 10 === 0;
    doc.line(rulerX + mm, y, rulerX + mm, y - (major ? 3.5 : 2));
    if (major) {
      doc.setFontSize(6.5);
      doc.setTextColor(110);
      doc.text(String(mm / 10), rulerX + mm, y + 3.2, { align: "center" });
    }
  }
  doc.setTextColor(0);

  /* --------------------------- 2. Légende des fils --------------------------- */
  doc.addPage();
  y = 22;
  heading("Légende des fils");
  y += 10;

  const legendHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(115);
    doc.text("Couleur", LEFT, y);
    doc.text("Sym.", LEFT + 13, y);
    doc.text("DMC", LEFT + 21, y);
    doc.text("Nom", LEFT + 36, y);
    if (beads.size) doc.text("Perle Delica", pageW - RIGHT - 78, y, { align: "right" });
    doc.text("Points", pageW - RIGHT - 36, y, { align: "right" });
    doc.text("Mètres", pageW - RIGHT - 17, y, { align: "right" });
    doc.text("Échev.", pageW - RIGHT, y, { align: "right" });
    doc.setTextColor(0);
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y + 1.5, pageW - RIGHT, y + 1.5);
    y += 7;
  };
  legendHeader();

  doc.setFont("helvetica", "normal");
  for (const r of rows) {
    if (y > pageH - BOTTOM - 12) {
      doc.addPage();
      y = 20;
      legendHeader();
    }
    if (bw) {
      doc.setDrawColor(120);
      doc.setLineWidth(0.2);
      doc.rect(LEFT, y - 3.4, 7, 5.4, "S");
    } else {
      const rgb = hexRgb(r.hex);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.setDrawColor(120);
      doc.setLineWidth(0.2);
      doc.rect(LEFT, y - 3.4, 7, 5.4, "FD");
    }
    // Le symbole imprimé est celui de l'atelier (symbolMap), pas la position
    // dans la palette : identique à l'écran, au canvas et à l'export OXS.
    drawSymbolPdf(doc, r.pos, LEFT + 16, y - 0.7, 2.3, ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0);
    doc.text(FLOSS[r.idx].blend ? "Mix" : r.code, LEFT + 21, y);
    doc.text(r.name.slice(0, 22), LEFT + 36, y);
    if (beads.size) {
      const bead = beads.get(r.code);
      doc.setFontSize(7.5);
      doc.setTextColor(bead ? 0 : 165);
      const glass = bead?.glass ? GLASS_LABEL[bead.glass] ?? bead.glass : "";
      doc.text(bead ? `${bead.code}${bead.discontinued ? " (arrêtée)" : glass ? ` · ${glass}` : ""}` : "-", pageW - RIGHT - 78, y, { align: "right" });
      doc.setFontSize(9.5);
      doc.setTextColor(0);
    }
    doc.text(num(r.cross + r.half + r.quarter + r.petite + r.beads), pageW - RIGHT - 36, y, { align: "right" });
    doc.text(fmt(r.meters, 1), pageW - RIGHT - 17, y, { align: "right" });
    doc.text(String(r.skeins), pageW - RIGHT, y, { align: "right" });
    y += 6.4;
  }

  if (beads.size) {
    y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(125);
    const beadNote =
      "Perles Miyuki Delica 11/0, table « measured » de craft-color-codes (CC BY 4.0). Appariement par CIEDE2000 entre le fil DMC et la perle : la référence est juste, la teinte est approchée (écart médian de 6 à 12 ΔE00). Une perle « arrêtée » n'est plus fabriquée.";
    doc.text(wrap(beadNote, printW), LEFT, y);
    doc.setTextColor(0);
  }

  /* ------------------ 2bis. Correspondances multi-marques ------------------ */
  if (eq) {
    doc.addPage();
    y = 22;
    heading(`Correspondances ${eq.palette.brand}`);
    y += 10;
    section(`Vos fils DMC et ${eq.palette.brand} ${eq.palette.product}`);
    for (const r of eq.rows) {
      const best = r.matches[0];
      const rest = r.matches.slice(1).map((m) => `${m.code} (delta E ${fmt(m.deltaE, 1)})`).join(", ");
      line(
        FLOSS[r.idx].blend ? `Mix ${r.code}` : r.code,
        best
          ? `${best.code}${best.sameCode ? " (même code)" : ""} · delta E ${fmt(best.deltaE, 1)} · ${num(r.cells)} élément(s)` +
              (rest ? ` · ensuite ${rest}` : "")
          : "aucune correspondance dans cette table",
      );
    }
    y += 3;
    if (y > pageH - BOTTOM - 24) {
      doc.addPage();
      y = 24;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(125);
    const eqLines = wrap(`${equivalenceWarning(eq)} Note de la source, en anglais : ${eq.palette.notes}`, printW);
    doc.text(eqLines, LEFT, y);
    doc.setTextColor(0);
  }

  /* --------------------------- 3. Index des pages --------------------------- */
  doc.addPage();
  const indexPage = doc.getNumberOfPages();
  const indexMarks: { x: number; y: number; gridIndex: number }[] = [];
  y = 22;
  heading("Index des pages de grille");
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(115);
  const indexIntro = `${p.w} × ${p.h} cases réparties en ${cols} colonne(s) × ${rowsB} rangée(s) de ${BLOCK} cases. Axes numérotés depuis le point zéro central. Case imprimée : ${fmt(CELL, 2)} mm${overlap ? `. Chevauchement de ${overlap} cases` : ""}.`;
  const introLines = wrap(indexIntro, printW);
  doc.text(introLines, LEFT, y);
  y += introLines.length * 4.6 + 6;
  doc.setTextColor(0);

  const cellW = printW / cols;
  const cellH = Math.min(46, (pageH - y - 40) / rowsB);
  for (let by = 0; by < rowsB; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x = LEFT + bx * cellW;
      const yy = y + by * cellH;
      doc.setDrawColor(215);
      doc.setLineWidth(0.2);
      doc.rect(x + 1.5, yy + 1.5, cellW - 3, cellH - 3, "S");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(115);
      doc.text(`col. ${axis(bx * BLOCK, p.w / 2)}…`, x + 5, yy + 9);
      doc.text(`rang. ${axis(by * BLOCK, p.h / 2)}…`, x + 5, yy + 14.5);
      doc.setTextColor(0);
      // Le numéro est écrit en fin de production, une fois le nombre réel de
      // pages connu.
      indexMarks.push({ x: x + 5, y: yy + cellH - 8, gridIndex: by * cols + bx });
    }
  }

  /* --------------------------- 4. Notes et annotations --------------------------- */
  if (annotations.length || p.notes?.trim()) {
    doc.addPage();
    y = 22;
    heading("Notes");
    y += 9;
    if (annotations.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(115);
      const lines = wrap(
        "Les repères carrés numérotés sur les pages de grille renvoient à ces notes. Coordonnées depuis le point zéro central.",
        printW,
      );
      doc.text(lines, LEFT, y);
      y += lines.length * 4.4 + 6;
      doc.setTextColor(0);
      annotations.forEach((a, i) => {
        if (y > pageH - BOTTOM - 14) {
          doc.addPage();
          y = 24;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(String(i + 1), LEFT, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(115);
        doc.text(`${axis(a.x + 0.5, p.w / 2)} ; ${axis(a.y + 0.5, p.h / 2)}`, LEFT + 8, y);
        doc.setTextColor(0);
        const textLines = wrap(a.text, printW - 48);
        doc.text(textLines, LEFT + 48, y);
        y += 5.2 * Math.max(1, textLines.length) + 1.6;
      });
    }
    if (p.notes?.trim()) {
      if (y > pageH - 60) {
        doc.addPage();
        y = 24;
      }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Consignes du projet", LEFT, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(wrap(p.notes, printW), LEFT, y);
    }
  }

  /* --------------------------- 5. Table des contours et ornements --------------------------- */
  // Paginée par blocs fixes : le nombre de pages est exactement connu, ce qui
  // garde la numérotation juste sans avoir à deviner les replis de texte.
  for (let start = 0; start < ornaments.length; start += ORN_PER_PAGE) {
    const chunk = ornaments.slice(start, start + ORN_PER_PAGE);
    doc.addPage();
    y = 22;
    heading(start === 0 ? "Contours et ornements" : `Contours et ornements (suite ${start / ORN_PER_PAGE + 1})`);
    y += 9;
    if (start === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(115);
      const intro = bw
        ? "En noir et blanc, les contours sont imprimés en gris : cette table donne le fil de chaque élément. Coordonnées depuis le point zéro central."
        : "Les contours sont imprimés dans la couleur de leur fil sur les pages de grille. Coordonnées depuis le point zéro central.";
      const lines = wrap(intro, printW);
      doc.text(lines, LEFT, y);
      y += lines.length * 4.4 + 5;
      doc.setTextColor(0);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(115);
    doc.text("Élément", LEFT, y);
    doc.text("Départ", LEFT + 38, y);
    doc.text("Arrivée", LEFT + 70, y);
    doc.text("Sym.", LEFT + 102, y);
    doc.text("Fil", LEFT + 112, y);
    if (!bw) doc.text("Couleur", LEFT + 132, y);
    doc.text("Long.", pageW - RIGHT, y, { align: "right" });
    doc.setTextColor(0);
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(LEFT, y + 1.5, pageW - RIGHT, y + 1.5);
    y += 7;
    for (const o of chunk) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(o.kind, LEFT, y);
      doc.text(o.from, LEFT + 38, y);
      doc.text(o.to, LEFT + 70, y);
      drawSymbolPdf(doc, assignedSymbol(p, o.idx), LEFT + 106, y - 0.9, 2.1, ink);
      doc.text(FLOSS[o.idx] ? (FLOSS[o.idx].blend ? "Mix" : FLOSS[o.idx].code) : "?", LEFT + 112, y);
      if (!bw && FLOSS[o.idx]) {
        const rgb = hexRgb(FLOSS[o.idx].hex);
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.setDrawColor(120);
        doc.setLineWidth(0.2);
        doc.rect(LEFT + 132, y - 3.2, 6, 5, "FD");
      }
      doc.text(o.len > 1 ? `${fmt(o.len, 1)} cases` : "-", pageW - RIGHT, y, { align: "right" });
      y += 6.2;
    }
  }

  /* --------------------------- 6. Pages de grille --------------------------- */
  // Nombre réel de pages produites avant les grilles : la première page de
  // grille porte donc ce numéro + 1, sans estimation.
  const gridStart = doc.getNumberOfPages() + 1;
  const cx0 = p.w / 2;
  const cy0 = p.h / 2;
  const qCorner: [number, number][] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];

  let produced = 0;
  for (let by = 0; by < rowsB; by++) {
    for (let bx = 0; bx < cols; bx++) {
      if (opts.signal?.aborted) throw new PdfAborted();
      doc.addPage();

      const c0 = bx * BLOCK;
      const r0 = by * BLOCK;
      const c1 = Math.min(p.w, c0 + BLOCK);
      const r1 = Math.min(p.h, r0 + BLOCK);
      const cEnd = Math.min(p.w, c1 + overlap);
      const rEnd = Math.min(p.h, r1 + overlap);

      const X = (c: number) => LEFT + (c - c0) * CELL;
      const Y = (r: number) => TOP + (r - r0) * CELL;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(wrap(p.name, printW - 62)[0] ?? p.name, LEFT, 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(115);
      doc.text(`col. ${axis(c0, cx0)}…${axis(c1, cx0)} · rang. ${axis(r0, cy0)}…${axis(r1, cy0)}`, LEFT, 26);

      const pageOf = (gx: number, gy: number) => gridStart + gy * cols + gx;
      const up = by > 0 ? pageOf(bx, by - 1) : null;
      const down = by < rowsB - 1 ? pageOf(bx, by + 1) : null;
      const left = bx > 0 ? pageOf(bx - 1, by) : null;
      const right = bx < cols - 1 ? pageOf(bx + 1, by) : null;
      doc.setFontSize(8);
      doc.text(`↑ p.${up ?? "—"}  ↓ p.${down ?? "—"}  ← p.${left ?? "—"}  → p.${right ?? "—"}`, pageW - RIGHT, 26, { align: "right" });
      doc.setTextColor(0);

      // Bande de calage : ces cases appartiennent aussi à la page suivante.
      if (overlap && (cEnd > c1 || rEnd > r1)) {
        doc.setFillColor(236, 236, 236);
        if (cEnd > c1) doc.rect(X(c1), Y(r0), (cEnd - c1) * CELL, (rEnd - r0) * CELL, "F");
        if (rEnd > r1) doc.rect(X(c0), Y(r1), (c1 - c0) * CELL, (rEnd - r1) * CELL, "F");
      }

      /* --- Cases : croix, demi-points, quarts --- */
      for (let r = r0; r < rEnd; r++) {
        for (let c = c0; c < cEnd; c++) {
          const i = r * p.w + c;
          const x = X(c);
          const yy = Y(r);

          const cr = p.cross[i];
          if (cr >= 0) {
            if (!bw) {
              const rgb = hexRgb(FLOSS[cr].hex);
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.rect(x, yy, CELL, CELL, "F");
            }
            const shade: [number, number, number] = bw ? ink : isDark(hexRgb(FLOSS[cr].hex)) ? [255, 255, 255] : ink;
            drawSymbolPdf(doc, assignedSymbol(p, cr), x + CELL / 2, yy + CELL / 2, CELL * 0.34, shade);
          }

          for (const [arr, flip] of [[p.fwd, false], [p.bwd, true]] as const) {
            const f = arr[i];
            if (f < 0) continue;
            if (bw) {
              chevron(doc, CELL, x, yy, flip, grey);
              if (CELL >= 3.2) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(Math.min(6, CELL * 1.4));
                doc.setTextColor(grey[0]);
                doc.text(FLOSS[f].blend ? "Mix" : FLOSS[f].code, x + CELL * (flip ? 0.18 : 0.82), yy + CELL * 0.32, { align: flip ? "left" : "right" });
                doc.setTextColor(0);
              }
            } else {
              const rgb = hexRgb(FLOSS[f].hex);
              doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
              doc.setLineWidth(Math.max(0.2, CELL * 0.14));
              doc.setLineCap("round");
              if (!flip) doc.line(x, yy + CELL, x + CELL, yy);
              else doc.line(x, yy, x + CELL, yy + CELL);
              if (CELL >= 5) drawSymbolPdf(doc, assignedSymbol(p, f), x + CELL * (flip ? 0.76 : 0.24), yy + CELL * 0.24, CELL * 0.15, isDark(rgb) ? [255, 255, 255] : ink);
            }
          }

          for (let k = 0; k < 4; k++) {
            const v = p.q[k][i];
            if (v < 0) continue;
            const [qx, qy] = qCorner[k];
            if (bw) doc.setDrawColor(grey[0], grey[1], grey[2]);
            else {
              const rgb = hexRgb(FLOSS[v].hex);
              doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            }
            doc.setLineWidth(Math.max(0.2, CELL * 0.14));
            doc.setLineCap("round");
            doc.line(x + qx * CELL, yy + qy * CELL, x + CELL / 2, yy + CELL / 2);
          }
        }
      }

      /* --- Réseau de grille --- */
      doc.setLineWidth(0.12);
      doc.setDrawColor(bw ? 200 : 195);
      for (let c = c0; c <= cEnd; c++) {
        if (c % 10 === 0) continue;
        doc.line(X(c), Y(r0), X(c), Y(rEnd));
      }
      for (let r = r0; r <= rEnd; r++) {
        if (r % 10 === 0) continue;
        doc.line(X(c0), Y(r), X(cEnd), Y(r));
      }
      doc.setLineWidth(0.4);
      doc.setDrawColor(70);
      for (let c = c0; c <= cEnd; c++) {
        if (c % 10 !== 0) continue;
        doc.line(X(c), Y(r0), X(c), Y(rEnd));
      }
      for (let r = r0; r <= rEnd; r++) {
        if (r % 10 !== 0) continue;
        doc.line(X(c0), Y(r), X(cEnd), Y(r));
      }
      doc.setDrawColor(120);
      doc.setLineWidth(0.3);
      doc.rect(X(c0), Y(r0), (c1 - c0) * CELL, (r1 - r0) * CELL, "S");
      doc.setDrawColor(210, 50, 40);
      doc.setLineWidth(0.5);
      if (cx0 >= c0 && cx0 <= cEnd) doc.line(X(cx0), Y(r0), X(cx0), Y(rEnd));
      if (cy0 >= r0 && cy0 <= rEnd) doc.line(X(c0), Y(cy0), X(cEnd), Y(cy0));

      /* --- Contours et lancés, sur les trous --- */
      const onPage = (x1: number, y1: number, x2: number, y2: number) =>
        Math.max(x1, x2) >= c0 && Math.min(x1, x2) <= cEnd && Math.max(y1, y2) >= r0 && Math.min(y1, y2) <= rEnd;
      doc.setLineCap("round");
      for (const [list, thick] of [[p.back, false], [p.long, true]] as const) {
        for (const seg of list) {
          if (!onPage(seg.x1, seg.y1, seg.x2, seg.y2)) continue;
          const floss = FLOSS[seg.c];
          if (!floss) continue;
          if (bw) doc.setDrawColor(grey[0], grey[1], grey[2]);
          else {
            const rgb = hexRgb(floss.hex);
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          }
          doc.setLineWidth(Math.max(0.25, CELL * (thick ? 0.2 : 0.12)));
          doc.line(X(seg.x1), Y(seg.y1), X(seg.x2), Y(seg.y2));
          if (bw && CELL >= 3.2) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(Math.min(6, CELL * 1.3));
            doc.setTextColor(grey[0]);
            doc.text(floss.blend ? "Mix" : floss.code, (X(seg.x1) + X(seg.x2)) / 2, (Y(seg.y1) + Y(seg.y2)) / 2 - CELL * 0.22, { align: "center" });
            doc.setTextColor(0);
          }
        }
      }

      /* --- Noeuds français --- */
      for (const k of p.knots) {
        if (k.x < c0 || k.x > cEnd || k.y < r0 || k.y > rEnd) continue;
        const radius = Math.max(0.35, CELL * 0.24);
        if (bw) {
          doc.setDrawColor(ink[0], ink[1], ink[2]);
          doc.setFillColor(ink[0], ink[1], ink[2]);
          doc.setLineWidth(0.3);
          doc.circle(X(k.x), Y(k.y), radius, "S");
          doc.circle(X(k.x), Y(k.y), radius * 0.35, "F");
        } else {
          const rgb = hexRgb(FLOSS[k.c]?.hex ?? "#444444");
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.setDrawColor(90);
          doc.setLineWidth(0.15);
          doc.circle(X(k.x), Y(k.y), radius, "FD");
        }
      }

      /* --- Petites croix et perles --- */
      for (const s of p.special ?? []) {
        if (s.x < c0 - 1 || s.x > cEnd + 1 || s.y < r0 - 1 || s.y > rEnd + 1) continue;
        const x = X(s.x);
        const yy = Y(s.y);
        if (s.kind === "petite") {
          const k = Math.max(0.3, CELL * 0.18);
          if (bw) doc.setDrawColor(grey[0], grey[1], grey[2]);
          else {
            const rgb = hexRgb(FLOSS[s.c]?.hex ?? "#444444");
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
          }
          doc.setLineWidth(Math.max(0.2, CELL * 0.1));
          doc.line(x - k, yy - k, x + k, yy + k);
          doc.line(x + k, yy - k, x - k, yy + k);
        } else {
          const rx = Math.max(0.35, CELL * 0.17);
          const ry = Math.max(0.5, CELL * 0.28);
          if (bw) {
            doc.setDrawColor(ink[0], ink[1], ink[2]);
            doc.setFillColor(ink[0], ink[1], ink[2]);
            doc.setLineWidth(0.3);
            doc.ellipse(x, yy, rx, ry, "S");
            doc.circle(x, yy, rx * 0.28, "F");
          } else {
            const rgb = hexRgb(FLOSS[s.c]?.hex ?? "#444444");
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.setDrawColor(70);
            doc.setLineWidth(0.15);
            doc.ellipse(x, yy, rx, ry, "FD");
            doc.setDrawColor(isDark(rgb) ? 255 : 40);
            doc.setLineWidth(0.25);
            doc.line(x, yy - ry * 0.45, x, yy + ry * 0.45);
          }
        }
      }

      /* --- Repères d'annotations --- */
      annotations.forEach((a, i) => {
        if (a.x < c0 || a.x >= cEnd || a.y < r0 || a.y >= rEnd) return;
        const x = X(a.x + 0.5);
        const yy = Y(a.y + 0.5);
        const k = Math.max(0.9, CELL * 0.3);
        if (bw) doc.setFillColor(205, 205, 205);
        else doc.setFillColor(255, 159, 10);
        doc.setDrawColor(90);
        doc.setLineWidth(0.2);
        doc.rect(x - k, yy - k, k * 2, k * 2, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(Math.max(5, Math.min(8, CELL * 1.6)));
        doc.setTextColor(bw ? 0 : 40);
        doc.text(String(i + 1), x, yy + k * 0.42, { align: "center" });
        doc.setTextColor(0);
      });

      /* --- Numéros d'axe --- */
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(90);
      for (let c = c0; c <= cEnd; c++) {
        if (c % 10 !== 0) continue;
        doc.text(String(c - cx0), X(c), TOP - 2, { align: "center" });
      }
      for (let r = r0; r <= rEnd; r++) {
        if (r % 10 !== 0) continue;
        doc.text(String(r - cy0), LEFT - 2, Y(r) + 1, { align: "right" });
      }
      doc.setTextColor(0);

      produced++;
      opts.onProgress?.(produced, gridPages, `Page de grille ${produced} / ${gridPages}`);
      // Laisse respirer l'interface entre deux pages : un grand patron en
      // produit plusieurs centaines.
      await tick();
    }
  }

  /* --------------------------- 7. Pieds de page et index --------------------------- */
  const pageCount = doc.getNumberOfPages();
  for (const mark of indexMarks) {
    doc.setPage(indexPage);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`p. ${gridStart + mark.gridIndex}`, mark.x, mark.y);
  }
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    footer(i, pageCount);
  }

  return doc.output("blob");
}

import { FLOSS, flossIndex, labOf, nearestFloss } from "./dmc";
import { assignedSymbol, compositePattern, createPattern, ensurePalette, type Pattern } from "./pattern";
import { SYMBOL_COUNT } from "./symbols";
import { downloadBlob, slugify } from "./io";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** OXS V1: palette index 0 is cloth, fullstitches and backstitches are mandatory. */
export function toOxs(input: Pattern): string {
  const p = compositePattern(input), palette = p.palette, pi = (c: number) => palette.indexOf(c) + 1;
  const stitches: string[] = [], back: string[] = [], parts: string[] = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x;
    if (p.cross[i] >= 0) stitches.push(`<stitch x="${x}" y="${y}" palindex="${pi(p.cross[i])}"/>`);
    if (p.fwd[i] >= 0) parts.push(`<partstitch x="${x}" y="${y}" palindex1="${pi(p.fwd[i])}" palindex2="0" direction="3"/>`);
    if (p.bwd[i] >= 0) parts.push(`<partstitch x="${x}" y="${y}" palindex1="${pi(p.bwd[i])}" palindex2="0" direction="4"/>`);
  }
  for (const [arr, type] of [[p.back, "backstitch"], [p.long, "straightstitch"]] as const) for (const s of arr) back.push(`<backstitch x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" palindex="${pi(s.c)}" objecttype="${type}"/>`);
  /* Les références de perle ne font partie d'aucun coeur OXS : elles voyagent
     dans l'extension, restreintes aux fils réellement présents dans la palette
     pour ne pas alourdir le fichier. Un lecteur qui ignore l'extension perd les
     codes de perle, pas le motif. */
  const beadEntries = p.beadMap
    ? Object.fromEntries(Object.entries(p.beadMap).filter(([code]) => palette.some((idx) => FLOSS[idx].code === code)))
    : undefined;
  // Fractional conventions differ between OXS consumers. Exact project data is kept
  // in an optional extension; portable core full crosses and backstitches remain standard.
  return `<?xml version="1.0" encoding="UTF-8"?><chart><properties chartwidth="${p.w}" chartheight="${p.h}" charttitle="${esc(p.name)}" author="${esc(p.provenance?.author ?? "")}" copyright="${esc(p.provenance?.license ?? "")}" instructions="${esc(p.notes ?? "")}" stitchesperinch="${p.count / (p.fabric?.over ?? 1)}" palettecount="${palette.length}" software="Point Zero B"/><palette><palette_item index="0" number="Cloth" name="Cloth" color="${(p.fabric?.color ?? "#f7f2e8").slice(1)}"/>${palette.map((idx) => `<palette_item index="${pi(idx)}" number="DMC ${esc(FLOSS[idx].code)}" name="${esc(FLOSS[idx].name)}" color="${FLOSS[idx].hex.slice(1)}" strands="${p.strands}" bsstrands="${p.backStrands ?? 1}" symbol="${assignedSymbol(p, idx)}"/>`).join("")}</palette><fullstitches>${stitches.join("")}</fullstitches><partstitches>${parts.join("")}</partstitches><backstitches>${back.join("")}</backstitches><pointzero_extra>${esc(JSON.stringify({ q: p.q.map((v) => Array.from(v, (c) => c < 0 ? -1 : pi(c))), special: p.special?.map((k) => ({ ...k, c: pi(k.c) })), knots: p.knots.map((k) => ({ ...k, c: pi(k.c) })), beadMap: beadEntries }))}</pointzero_extra></chart>`;
}

export function fromOxs(xml: string): Pattern {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror") || !doc.querySelector("chart > properties")) throw new Error("OXS invalide");
  const prop = doc.querySelector("properties")!, w = Number(prop.getAttribute("chartwidth")), h = Number(prop.getAttribute("chartheight"));
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 1000 || h > 1000) throw new Error("Dimensions OXS non prises en charge");
  const p = createPattern(prop.getAttribute("charttitle") ?? "Import OXS", w, h), map = new Map<number, number>();
  const count = Number(prop.getAttribute("stitchesperinch"));
  if ([7, 11, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40].includes(count)) p.count = count as Pattern["count"];
  for (const item of doc.querySelectorAll("palette_item")) {
    const id = Number(item.getAttribute("index")); if (!id) continue;
    const code = (item.getAttribute("number") ?? "").replace(/^DMC\s*/i, ""); let idx = flossIndex(code);
    if (idx < 0) { const raw = (item.getAttribute("color") ?? "000000").replace("#", ""); const rgb: [number, number, number] = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16) || 0) as [number, number, number]; idx = nearestFloss(labOf(rgb)); }
    map.set(id, idx); ensurePalette(p, idx);
    /* Le coeur porte déjà le numéro de symbole écrit par Point Zéro : le
       relire évite de réattribuer les symboles par défaut et de perdre un
       choix de l'atelier au premier aller-retour. */
    const sym = Number(item.getAttribute("symbol"));
    if (Number.isInteger(sym) && sym >= 0 && sym < SYMBOL_COUNT) (p.symbolMap ??= {})[FLOSS[idx].code] = sym;
  }
  for (const s of doc.querySelectorAll("fullstitches > stitch")) {
    const x = Number(s.getAttribute("x")), y = Number(s.getAttribute("y")), c = map.get(Number(s.getAttribute("palindex")));
    if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < w && y < h && c !== undefined) p.cross[y * w + x] = c;
  }
  for (const s of doc.querySelectorAll("backstitch")) {
    const c = map.get(Number(s.getAttribute("palindex"))); if (c === undefined) continue;
    const seg = { x1: Number(s.getAttribute("x1")), y1: Number(s.getAttribute("y1")), x2: Number(s.getAttribute("x2")), y2: Number(s.getAttribute("y2")), c };
    if (Object.values(seg).every(Number.isFinite)) (s.getAttribute("objecttype") === "straightstitch" ? p.long : p.back).push(seg);
  }
  for (const s of doc.querySelectorAll("partstitch")) {
    const x = Number(s.getAttribute("x")), y = Number(s.getAttribute("y")), c = map.get(Number(s.getAttribute("palindex1"))), direction = Number(s.getAttribute("direction"));
    if (c !== undefined && x >= 0 && y >= 0 && x < w && y < h && Number.isInteger(x) && Number.isInteger(y)) { if (direction === 3) p.fwd[y * w + x] = c; if (direction === 4) p.bwd[y * w + x] = c; }
  }
  p.notes = prop.getAttribute("instructions") ?? "";
  const extra = doc.querySelector("pointzero_extra")?.textContent;
  if (extra) {
    try {
      const parsed = JSON.parse(extra) as { q: number[][]; special: Pattern["special"]; knots: Pattern["knots"]; beadMap?: Record<string, string> };
      if (parsed.q?.length === 4 && parsed.q.every((q) => q.length === w * h)) p.q = parsed.q.map((q) => Int16Array.from(q, (c) => map.get(c) ?? -1)) as Pattern["q"];
      p.special = parsed.special?.map((k) => ({ ...k, c: map.get(k.c) ?? -1 })).filter((k) => k.c >= 0);
      p.knots = parsed.knots?.map((k) => ({ ...k, c: map.get(k.c) ?? -1 })).filter((k) => k.c >= 0) ?? [];
      if (parsed.beadMap && typeof parsed.beadMap === "object") {
        const known = new Set(p.palette.map((idx) => FLOSS[idx].code));
        const kept: Record<string, string> = {};
        for (const [code, bead] of Object.entries(parsed.beadMap)) {
          if (known.has(code) && typeof bead === "string" && bead.length > 0 && bead.length <= 40) kept[code] = bead;
        }
        if (Object.keys(kept).length) p.beadMap = kept;
      }
    } catch { /* An invalid optional extension must not destroy the portable core. */ }
  }
  p.provenance = { kind: "oxs", source: "OXS importé", author: prop.getAttribute("author") ?? "", license: prop.getAttribute("copyright") ?? "Droits du créateur", personalOnly: true };
  return p;
}
export function downloadOxs(p: Pattern) { downloadBlob(new Blob([toOxs(p)], { type: "application/xml" }), `${slugify(p.name)}.oxs`); }
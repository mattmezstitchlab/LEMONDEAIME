import { flossIndex } from "./dmc";
import { createPattern, ensurePalette, type Pattern } from "./pattern";
import { floralBird, floralBranch, floralFlower, floralLeaf } from "./floralComposition";

export type PresetCategory = "Fleurs" | "Feuilles" | "Nature" | "Ornements" | "Bordures";
export interface MotifPreset {
  id: string;
  name: string;
  category: PresetCategory;
  /** Each factory creates a genuine editable DMC cross-stitch Pattern. */
  make: () => Pattern;
}
function motif(name: string, w: number, h: number) {
  const p = createPattern(name, w, h, 14, 2);
  p.provenance = { kind: "original", source: "Bibliothèque graphique POINTZERO", author: "POINTZERO", license: "Motif géométrique original réutilisable", personalOnly: false };
  const put = (x: number, y: number, code: string) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = flossIndex(code);
    if (idx < 0) throw new Error("Référence DMC non disponible : " + code);
    p.cross[y * w + x] = idx;
    ensurePalette(p, idx);
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, code: string) => {
    for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(h - 1, Math.ceil(cy + ry)); y++) {
      for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(w - 1, Math.ceil(cx + rx)); x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(x, y, code);
      }
    }
  };
  const line = (x1: number, y1: number, x2: number, y2: number, code: string) => {
    const n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2));
    for (let i = 0; i <= n; i++) put(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), code);
  };
  return { p, put, ellipse, line };
}
function butterfly(): Pattern {
  const { p, ellipse, line, put } = motif("Papillon", 32, 26);
  ellipse(9, 8, 8, 7, "603"); ellipse(23, 8, 8, 7, "603");
  ellipse(10, 18, 6, 5, "602"); ellipse(22, 18, 6, 5, "602");
  ellipse(9, 8, 3, 3, "725"); ellipse(23, 8, 3, 3, "725");
  ellipse(16, 13, 2, 9, "801"); line(16, 7, 12, 1, "938"); line(16, 7, 20, 1, "938");
  put(12, 1, "310"); put(20, 1, "310");
  return p;
}
function heart(): Pattern {
  const { p, put } = motif("Cœur", 24, 22);
  for (let y = 1; y < 21; y++) for (let x = 1; x < 23; x++) {
    const dx = (x - 11.5) / 10.5, dy = (y - 9) / 9;
    const eq = Math.pow(dx * dx + dy * dy - 1, 3) - dx * dx * dy * dy * dy;
    // Flip the classical heart to point down the grid.
    const yy = -dy;
    const shape = Math.pow(dx * dx + yy * yy - 1, 3) - dx * dx * yy * yy * yy;
    if (shape <= 0 || (eq <= 0 && y < 10)) put(x, y, y < 9 ? "603" : "321");
  }
  return p;
}
function star(): Pattern {
  const { p, put } = motif("Étoile", 23, 23);
  const points = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 === 0 ? 10 : 4.5;
    return { x: 11 + Math.cos(a) * r, y: 11 + Math.sin(a) * r };
  });
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    if (inside) put(x, y, y < 11 ? "725" : "3820");
  }
  return p;
}
function bud(): Pattern {
  const { p, line, ellipse } = motif("Bouton floral", 18, 31);
  line(9, 15, 9, 30, "700");
  ellipse(9, 11, 6, 9, "321"); ellipse(9, 10, 3, 6, "815");
  ellipse(5, 22, 4, 2, "703"); ellipse(13, 24, 4, 2, "704");
  return p;
}
function tree(): Pattern {
  const { p, ellipse, line } = motif("Petit arbre", 30, 34);
  line(15, 17, 15, 33, "801");
  ellipse(15, 11, 11, 10, "700"); ellipse(10, 9, 7, 6, "703");
  ellipse(20, 15, 5, 4, "704");
  return p;
}
function house(): Pattern {
  const { p, put, line } = motif("Petite maison", 28, 28);
  for (let y = 11; y <= 26; y++) for (let x = 5; x <= 22; x++) put(x, y, "738");
  for (let y = 2; y <= 12; y++) for (let x = 3; x <= 24; x++)
    if (y >= 2 + Math.ceil(Math.abs(x - 13.5) * .8)) put(x, y, "801");
  for (let y = 18; y <= 26; y++) for (let x = 11; x <= 16; x++) put(x, y, "436");
  for (let y = 16; y <= 20; y++) for (let x = 18; x <= 21; x++) put(x, y, "828");
  line(13, 18, 13, 26, "938");
  return p;
}
function twig(): Pattern {
  const { p, line, ellipse } = motif("Brindille", 36, 24);
  line(3, 21, 32, 4, "934");
  for (const [x,y] of [[10,16],[17,12],[24,8]]) {
    ellipse(x - 3, y - 4, 4, 2, "703");
    ellipse(x + 3, y + 3, 4, 2, "704");
  }
  return p;
}
function bouquetMini(): Pattern {
  const { p, line, ellipse } = motif("Bouquet miniature", 39, 42);
  for (const [x, y, code] of [[10, 13, "603"], [19, 9, "321"], [29, 15, "819"]] as const) {
    line(x, y + 5, 19, 40, "700");
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      ellipse(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 3, code);
    }
    ellipse(x, y, 2, 2, "725");
  }
  ellipse(13, 29, 6, 2, "703"); ellipse(25, 31, 6, 2, "704");
  return p;
}
function border(): Pattern {
  const { p, ellipse, line } = motif("Frise botanique", 78, 16);
  line(2, 9, 75, 9, "934");
  for (const x of [8, 23, 38, 53, 68]) {
    ellipse(x, 5, 4, 3, "703"); ellipse(x + 5, 12, 4, 2, "704");
    ellipse(x, 8, 1, 1, "725");
  }
  return p;
}
function diamonds(): Pattern {
  const { p, put } = motif("Frise géométrique", 66, 17);
  for (const cx of [8, 24, 40, 56]) for (let y = 1; y < 16; y++) for (let x = cx - 7; x <= cx + 7; x++) {
    const d = Math.abs(x - cx) + Math.abs(y - 8);
    if (d <= 7 && d >= 5) put(x, y, "321");
    else if (d <= 2) put(x, y, "725");
  }
  return p;
}
export const MOTIF_PRESETS: MotifPreset[] = [
  { id: "fleur-rose", name: "Fleur rose", category: "Fleurs", make: () => floralFlower("Fleur rose", "603", "602", "725") },
  { id: "fleur-rouge", name: "Fleur rouge", category: "Fleurs", make: () => floralFlower("Fleur rouge", "321", "815", "3820") },
  { id: "fleur-pastel", name: "Fleur pastel", category: "Fleurs", make: () => floralFlower("Fleur pastel", "819", "776", "725") },
  { id: "bourgeon", name: "Bouton floral", category: "Fleurs", make: bud },
  { id: "bouquet", name: "Mini bouquet", category: "Fleurs", make: bouquetMini },
  { id: "feuille", name: "Feuille verte", category: "Feuilles", make: () => floralLeaf("Feuille verte", "703") },
  { id: "feuille-claire", name: "Feuille claire", category: "Feuilles", make: () => floralLeaf("Feuille claire", "704") },
  { id: "brindille", name: "Brindille", category: "Feuilles", make: twig },
  { id: "branche", name: "Branche", category: "Feuilles", make: floralBranch },
  { id: "oiseau", name: "Petit oiseau", category: "Nature", make: floralBird },
  { id: "papillon", name: "Papillon", category: "Nature", make: butterfly },
  { id: "arbre", name: "Petit arbre", category: "Nature", make: tree },
  { id: "maison", name: "Maisonnette", category: "Nature", make: house },
  { id: "coeur", name: "Cœur", category: "Ornements", make: heart },
  { id: "etoile", name: "Étoile", category: "Ornements", make: star },
  { id: "frise-feuilles", name: "Frise botanique", category: "Bordures", make: border },
  { id: "frise-geometrique", name: "Frise graphique", category: "Bordures", make: diamonds },
];
export const PRESET_CATEGORIES: PresetCategory[] = ["Fleurs", "Feuilles", "Nature", "Ornements", "Bordures"];
export function getMotifPreset(id: string): Pattern | null {
  return MOTIF_PRESETS.find(item => item.id === id)?.make() ?? null;
}

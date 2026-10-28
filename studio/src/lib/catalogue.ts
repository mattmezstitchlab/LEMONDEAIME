import { FLOSS, flossIndex } from "./dmc";
import { createPattern, ensurePalette, type Pattern } from "./pattern";

/**
 * Catalogue de patrons originaux. Les images visibles dans la boutique
 * proviennent exactement des mêmes cases DMC que le PDF final.
 *
 * Aucun dessin Etsy ni contenu de tiers n'est recopié. Les prix sont des
 * hypothèses de merchandising et NE déclenchent aucune transaction en V1.
 */
export type ThemeMotif = "Fleurs" | "Animaux" | "Maison" | "Saisons" | "Cadeaux";
export interface ProduitPatron {
  id: string;
  titre: string;
  sousTitre: string;
  theme: ThemeMotif;
  prixCents: number;
  niveau: "Débutant" | "Intermédiaire";
  taille: [number, number];
  toile: "Aïda 14";
  conception: string;
}
export const CATALOGUE: ProduitPatron[] = [
  { id: "bouquet-champetre", titre: "Bouquet des champs", sousTitre: "Fleurs sauvages & tiges délicates", theme: "Fleurs", prixCents: 490, niveau: "Débutant", taille: [44, 44], toile: "Aïda 14", conception: "Botanique" },
  { id: "chat-lecteur", titre: "Le chat lecteur", sousTitre: "Une pile de livres et un chat curieux", theme: "Animaux", prixCents: 590, niveau: "Intermédiaire", taille: [44, 44], toile: "Aïda 14", conception: "Compagnons" },
  { id: "renard-bois", titre: "Renard des sous-bois", sousTitre: "Petit portrait des forêts", theme: "Animaux", prixCents: 490, niveau: "Débutant", taille: [44, 44], toile: "Aïda 14", conception: "Forêt" },
  { id: "tournesol", titre: "Soleil d’été", sousTitre: "Grand tournesol lumineux", theme: "Fleurs", prixCents: 490, niveau: "Débutant", taille: [44, 44], toile: "Aïda 14", conception: "Botanique" },
  { id: "maison-automne", titre: "Maison d’automne", sousTitre: "Petite demeure et jardin orangé", theme: "Maison", prixCents: 590, niveau: "Intermédiaire", taille: [44, 44], toile: "Aïda 14", conception: "Cottage" },
  { id: "couronne-hiver", titre: "Couronne d’hiver", sousTitre: "Feuillage, baies rouges et ruban", theme: "Saisons", prixCents: 490, niveau: "Débutant", taille: [44, 44], toile: "Aïda 14", conception: "Fêtes" },
  { id: "cafe-douceur", titre: "Pause café", sousTitre: "Petite tasse et croissant", theme: "Cadeaux", prixCents: 390, niveau: "Débutant", taille: [44, 44], toile: "Aïda 14", conception: "Cuisine" },
  { id: "coeur-folk", titre: "Cœur fleuri", sousTitre: "Cœur traditionnel aux fleurs", theme: "Cadeaux", prixCents: 490, niveau: "Débutant", taille: [44, 44], toile: "Aïda 14", conception: "Folk" },
];

type Color = string;
class Dessin {
  readonly p: Pattern;
  private idx = new Map<Color, number>();
  constructor(p: Pattern) { this.p = p; }
  pixel(x: number, y: number, color: Color) {
    const xx = Math.round(x), yy = Math.round(y);
    if (xx < 0 || yy < 0 || xx >= this.p.w || yy >= this.p.h) return;
    let v = this.idx.get(color);
    if (v === undefined) {
      v = flossIndex(color);
      if (v < 0 || !FLOSS[v]) throw new Error("Couleur DMC inconnue : " + color);
      ensurePalette(this.p, v);
      this.idx.set(color, v);
    }
    this.p.cross[yy * this.p.w + xx] = v;
  }
  rect(x: number, y: number, w: number, h: number, c: Color) {
    for (let yy = Math.floor(y); yy < y + h; yy++) for (let xx = Math.floor(x); xx < x + w; xx++) this.pixel(xx, yy, c);
  }
  ellipse(x: number, y: number, rx: number, ry: number, c: Color) {
    for (let yy = Math.floor(y - ry); yy <= y + ry; yy++) for (let xx = Math.floor(x - rx); xx <= x + rx; xx++)
      if (Math.pow((xx - x) / rx, 2) + Math.pow((yy - y) / ry, 2) <= 1) this.pixel(xx, yy, c);
  }
  line(x1: number, y1: number, x2: number, y2: number, c: Color, r = 0) {
    const steps = Math.ceil(Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2) + 1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
      if (r === 0) this.pixel(x, y, c); else this.ellipse(x, y, r, r, c);
    }
  }
  polygon(vertices: [number, number][], c: Color) {
    const xs = vertices.map(p => p[0]), ys = vertices.map(p => p[1]);
    const minX = Math.floor(Math.min(...xs)), maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys)), maxY = Math.ceil(Math.max(...ys));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      let inside = false;
      for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const a = vertices[i], b = vertices[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      if (inside) this.pixel(x, y, c);
    }
  }
  petals(cx: number, cy: number, petal: Color, mid: Color, r = 4) {
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      this.ellipse(cx + Math.cos(a) * (r + 1), cy + Math.sin(a) * (r + 1), r * .65, r * .65, petal);
    }
    this.ellipse(cx, cy, r * .9, r * .9, mid);
  }
  leaf(x: number, y: number, side = 1, color: Color = "703") {
    this.ellipse(x + 2 * side, y, 3.5, 1.8, color);
    this.line(x, y, x + 5 * side, y, "434");
  }
}

export function fabriquerPatron(id: string): Pattern {
  const article = CATALOGUE.find(x => x.id === id);
  if (!article) throw new Error("Patron introuvable : " + id);
  const p = createPattern(article.titre, ...article.taille);
  p.folder = "Boutique POINT ZÉRO";
  p.provenance = {
    kind: "original",
    source: "Création originale générative POINT ZÉRO · collection " + article.conception,
    author: "POINT ZÉRO Studio",
    license: "Usage personnel, redistribution et revente du patron interdites",
    personalOnly: true,
  };
  const a = new Dessin(p);
  switch (id) {
    case "bouquet-champetre": {
      a.line(21, 37, 14, 16, "703"); a.line(21, 37, 26, 12, "703"); a.line(21, 37, 34, 20, "703");
      a.leaf(17, 29, -1); a.leaf(24, 28, 1); a.leaf(27, 31, 1); a.leaf(18, 23, -1);
      a.petals(14, 15, "963", "742", 3.5);
      a.petals(26, 12, "550", "742", 4);
      a.petals(34, 19, "798", "444", 3.3);
      a.polygon([[14, 36], [30, 36], [27, 43], [17, 43]], "517");
      a.rect(15, 36, 14, 2, "798");
      break;
    }
    case "chat-lecteur": {
      a.rect(7, 35, 31, 4, "798"); a.rect(9, 31, 28, 4, "815"); a.rect(6, 27, 32, 4, "703");
      a.rect(7, 35, 2, 4, "3865"); a.rect(11, 31, 2, 4, "3865"); a.rect(33, 27, 2, 4, "3865");
      a.ellipse(23, 24, 10, 10, "434");
      a.ellipse(23, 15, 9, 8, "434");
      a.polygon([[15, 14], [15, 3], [21, 10]], "434");
      a.polygon([[25, 10], [31, 3], [31, 14]], "434");
      a.polygon([[17, 11], [17, 7], [20, 11]], "963");
      a.polygon([[27, 11], [29, 7], [29, 11]], "963");
      a.ellipse(23, 18, 5, 3, "739");
      a.ellipse(19, 15, 1, 1.5, "310"); a.ellipse(27, 15, 1, 1.5, "310");
      a.pixel(23, 18, "815"); a.line(23, 19, 22, 21, "815"); a.line(23, 19, 24, 21, "815");
      a.line(30, 26, 38, 24, "434", 1); a.line(38, 24, 39, 19, "434", 1);
      break;
    }
    case "renard-bois": {
      a.polygon([[8, 11], [13, 4], [19, 13]], "815");
      a.polygon([[24, 13], [31, 4], [37, 12]], "815");
      a.polygon([[10, 12], [13, 7], [16, 12]], "963");
      a.polygon([[28, 12], [31, 7], [34, 12]], "963");
      a.polygon([[8, 13], [36, 13], [39, 26], [30, 38], [22, 42], [12, 37], [5, 26]], "742");
      a.polygon([[5, 25], [19, 29], [22, 41], [12, 37]], "3865");
      a.polygon([[39, 25], [25, 29], [22, 41], [30, 37]], "3865");
      a.ellipse(15, 24, 1.4, 1.4, "310"); a.ellipse(29, 24, 1.4, 1.4, "310");
      a.ellipse(22, 33, 2.7, 2, "310");
      a.line(22, 35, 22, 37, "815");
      break;
    }
    case "tournesol": {
      a.line(22, 25, 21, 43, "703", 1);
      a.leaf(21, 34, -1); a.leaf(22, 38, 1);
      for (let i = 0; i < 12; i++) {
        const angle = i * Math.PI / 6;
        a.ellipse(22 + 12 * Math.cos(angle), 18 + 12 * Math.sin(angle), 4.5, 4.5, i % 2 ? "742" : "444");
      }
      a.ellipse(22, 18, 9, 9, "434");
      a.ellipse(22, 18, 7, 7, "815");
      for (let y = 13; y < 24; y += 3) for (let x = 17; x < 28; x += 3) if ((x - 22) ** 2 + (y - 18) ** 2 < 45) a.pixel(x, y, "742");
      break;
    }
    case "maison-automne": {
      a.rect(8, 19, 29, 20, "739");
      a.polygon([[5, 20], [22, 6], [40, 20]], "815");
      a.polygon([[11, 19], [22, 10], [34, 19]], "434");
      a.rect(30, 7, 4, 8, "434");
      a.rect(18, 27, 8, 12, "434");
      a.rect(11, 23, 6, 7, "517"); a.rect(29, 23, 6, 7, "517");
      a.line(14, 23, 14, 29, "3865"); a.line(32, 23, 32, 29, "3865");
      a.rect(8, 39, 29, 2, "703");
      a.ellipse(9, 38, 5, 3, "742"); a.ellipse(36, 38, 5, 3, "742");
      a.line(9, 34, 9, 36, "703"); a.line(36, 34, 36, 36, "703");
      break;
    }
    case "couronne-hiver": {
      for (let i = 0; i < 68; i++) {
        const angle = i * Math.PI * 2 / 68;
        const radius = 14 + (i % 3 - 1) * 1.2;
        a.ellipse(22 + Math.cos(angle) * radius, 22 + Math.sin(angle) * radius, 2.6, 1.8, i % 4 ? "703" : "907");
      }
      for (const [x, y] of [[11, 14], [32, 12], [36, 25], [15, 33], [9, 25], [29, 36]]) a.ellipse(x, y, 1.7, 1.7, "321");
      a.ellipse(19, 36, 4, 3, "815"); a.ellipse(25, 36, 4, 3, "815");
      a.rect(21, 35, 3, 3, "321");
      a.polygon([[20, 38], [16, 44], [22, 41]], "815");
      a.polygon([[24, 38], [30, 44], [23, 41]], "815");
      break;
    }
    case "cafe-douceur": {
      a.rect(9, 19, 22, 15, "517"); a.rect(11, 21, 18, 11, "3865");
      a.ellipse(20, 19, 11, 2.5, "434");
      a.ellipse(32, 25, 5, 6, "798"); a.ellipse(32, 25, 2.5, 3.5, "3865");
      a.rect(10, 34, 28, 3, "434");
      a.line(13, 14, 12, 7, "739"); a.line(21, 14, 22, 6, "739");
      a.line(27, 14, 27, 8, "739");
      a.ellipse(21, 40, 13, 2, "742");
      break;
    }
    case "coeur-folk": {
      for (let y = 6; y < 38; y++) for (let x = 5; x < 39; x++) {
        const xx = (x - 22) / 14, yy = (25 - y) / 14;
        const v = Math.pow(xx * xx + yy * yy - 1, 3) - xx * xx * Math.pow(yy, 3);
        if (v <= 0) a.pixel(x, y, Math.abs(xx) + Math.abs(yy) > 1.35 ? "815" : "321");
      }
      a.line(22, 14, 22, 32, "703");
      a.leaf(22, 24, -1, "907"); a.leaf(22, 29, 1, "907");
      a.petals(22, 17, "963", "444", 2.1);
      a.ellipse(11, 40, 3, 1.8, "703"); a.ellipse(33, 40, 3, 1.8, "703");
      break;
    }
  }
  p.notes = [
    "POINT ZÉRO · patron de point de croix original.",
    "Motif en " + p.w + " × " + p.h + " points, Aïda 14, deux brins.",
    "Correspondance DMC et estimation des fils dans le PDF.",
    "Le PDF est produit par le moteur intégré : aucune image de motif téléchargée sur Etsy.",
    "Usage personnel uniquement ; ne pas revendre ni redistribuer.",
  ].join("\n");
  return p;
}

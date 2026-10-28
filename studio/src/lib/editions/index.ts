import { FLOSS, flossIndex } from "../dmc";
import { createPattern, ensurePalette, type Pattern } from "../pattern";
import { EDITIONS, type EditionProduct } from "./catalog";
import { DRAWINGS } from "./drawings";
import { Toile } from "./kit";

export { EDITIONS, COLLECTIONS, type EditionProduct, type Collection, type Level } from "./catalog";

/** Grille brute d'une édition (codes DMC ou vide), sans créer de projet. */
export function editionGrid(id: string): { product: EditionProduct; toile: Toile } {
  const product = EDITIONS.find(e => e.id === id);
  if (!product) throw new Error("Édition introuvable : " + id);
  const draw = DRAWINGS[id];
  if (!draw) throw new Error("Dessin manquant pour l’édition " + id);
  const toile = new Toile(product.width, product.height);
  draw(toile);
  return { product, toile };
}

/**
 * Fabrique le patron natif d'une édition : mêmes cases que l'aperçu de la boutique,
 * ouvrable dans le studio et exportable en PDF par le moteur existant.
 */
export function fabriquerEdition(id: string): Pattern {
  const { product, toile } = editionGrid(id);
  const p = createPattern(product.title, product.width, product.height, 14, 2);
  p.folder = "Point Zéro · Éditions";
  p.provenance = {
    kind: "original",
    source: "Création originale Point Zéro · Éditions, collection " + product.collection,
    author: "Point Zéro Studio",
    license: "Usage personnel, redistribution et revente du patron interdites",
    personalOnly: true,
  };
  const index = new Map<string, number>();
  toile.cells.forEach((code, i) => {
    if (code === null) return;
    let v = index.get(code);
    if (v === undefined) {
      v = flossIndex(code);
      if (v < 0 || !FLOSS[v]) throw new Error("Couleur DMC inconnue dans " + id + " : " + code);
      ensurePalette(p, v);
      index.set(code, v);
    }
    p.cross[i] = v;
  });
  p.notes = [
    "Point Zéro · Éditions — " + product.title + ".",
    product.description,
    "Motif de " + p.w + " × " + p.h + " points, Aïda 14, deux brins, " + p.palette.length + " fils DMC.",
    "Couleurs écran indicatives ; vérifiez vos fils sur une carte DMC.",
    "Usage personnel uniquement ; ne pas revendre ni redistribuer.",
  ].join("\n");
  return p;
}

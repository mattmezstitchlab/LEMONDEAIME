/** Les grilles des éditions, réduites pour la page Brode Way du site (src/lib/oiseaux-botaniques.json) :
 *  pour chaque patron, ses fils (code DMC, couleur) et ses lignes, une lettre par case (« . » = toile). */
import { FLOSS, flossIndex } from "../dmc";
import { EDITIONS, editionGrid } from "./index";

const LETTRES = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export interface GrilleVitrine { id: string; titre: string; w: number; h: number; fils: [string, string][]; lignes: string[] }
export function grilleVitrine(id: string): GrilleVitrine {
  const { product, toile } = editionGrid(id);
  const codes = toile.codes();
  if (codes.length > LETTRES.length) throw new Error("Trop de fils pour la vitrine : " + id);
  const k = new Map(codes.map((c, i) => [c, LETTRES[i]]));
  const lignes = Array.from({ length: toile.h }, (_, y) => Array.from({ length: toile.w }, (_, x) => { const c = toile.get(x, y); return c === null ? "." : k.get(c)!; }).join(""));
  return { id, titre: product.title, w: toile.w, h: toile.h, fils: codes.map(c => [c, FLOSS[flossIndex(c)].hex]), lignes };
}
export const vitrineBotanique = () => EDITIONS.filter(e => e.collection === "Oiseaux botaniques").map(e => grilleVitrine(e.id));

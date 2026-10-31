/**
 * Capturer le Tambour : l'image figée devient un vrai ouvrage, par le même chemin qu'un import de photo
 * (la photo gardée avec l'ouvrage, la conversion DMC, puis Mes ouvrages dans l'atelier). Rien n'est envoyé à un serveur :
 * l'ouvrage passe de la page du Tambour à l'atelier dans la session de cet onglet, puis il est effacé de là.
 */
import { asyncRasterToCells } from "../convert";
import { photoDe } from "../cadrePhoto";
import { poserConversion, REGLAGES_AUTO } from "../cadre";
import { createPattern, fromObject, toObject, type Pattern } from "../pattern";

export const CLE_CAPTURE = "pointzero:tambour:capture:v1";

export async function motifDuTambour(image: HTMLCanvasElement, { cote, couleurs, echanges }: { cote: number; couleurs: number; echanges: ReadonlyMap<number, number> }): Promise<Pattern> {
  const src = await photoDe(image);
  const r = await asyncRasterToCells(image, cote, cote, { maxColors: couleurs, dropWhite: false, confetti: true, pixelArt: false });
  const cross = echanges.size ? r.cross.map(c => (c >= 0 && echanges.has(c) ? echanges.get(c)! : c)) as Int16Array : r.cross;
  const palette = [...new Set(r.palette.map(c => echanges.get(c) ?? c))];
  const base = createPattern("Mon tambour vivant", cote, cote);
  base.provenance = { kind: "image", source: "Tambour vivant (photo prise avec la caméra de l’appareil)", author: "", license: "", personalOnly: false };
  return poserConversion(base, cote, cote, cross, palette, { src, reglages: { ...REGLAGES_AUTO, fond: false }, empreinte: 0 });
}

/** Déposer l'ouvrage pour l'atelier (cet onglet seulement). Faux si le navigateur le refuse. */
export function deposer(p: Pattern): boolean {
  try { sessionStorage.setItem(CLE_CAPTURE, JSON.stringify(toObject(p))); return true; } catch { return false; }
}
/** Reprendre l'ouvrage déposé, une seule fois. */
export function reprendre(): Pattern | null {
  try {
    const t = sessionStorage.getItem(CLE_CAPTURE); if (!t) return null;
    sessionStorage.removeItem(CLE_CAPTURE);
    return fromObject(JSON.parse(t));
  } catch { return null; }
}

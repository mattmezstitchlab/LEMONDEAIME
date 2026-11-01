import { FLOSS } from '../lib/dmc';

// Références de la palette DMC existante, sans nouvelle table de couleurs.
export const FILS_CHAPITRES = ['154', '3347', '823', '3713', '3820', '932', '3818', '3848'] as const;
const luminance = (hex: string) => {
  const c = hex.replace('#', '').match(/../g)!.map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
};
export function couleurChapitre(n: number) {
  const code = FILS_CHAPITRES[n % FILS_CHAPITRES.length];
  const fil = FLOSS.find(f => f.code === code);
  if (!fil) throw new Error(`Référence DMC absente : ${code}`);
  const l = luminance(fil.hex), noir = (l + .05) / .05, blanc = 1.05 / (l + .05);
  return { code, hex: fil.hex, texte: noir >= blanc ? '#000000' : '#ffffff', contraste: Math.max(noir, blanc) };
}

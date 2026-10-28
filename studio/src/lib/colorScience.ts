// CIEDE2000, Sharma, Wu & Dalal (2005). Tested against their published reference pairs.
type Lab = [number, number, number];
const rad = (v: number) => v * Math.PI / 180;
const hue = (a: number, b: number) => a === 0 && b === 0 ? 0 : (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
export function deltaE2000([L1, a1, b1]: Lab, [L2, a2, b2]: Lab): number {
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), C = (c1 + c2) / 2;
  const g = .5 * (1 - Math.sqrt(C ** 7 / (C ** 7 + 25 ** 7)));
  const ap1 = a1 * (1 + g), ap2 = a2 * (1 + g);
  const cp1 = Math.hypot(ap1, b1), cp2 = Math.hypot(ap2, b2);
  const h1 = hue(ap1, b1), h2 = hue(ap2, b2);
  let dh = cp1 * cp2 === 0 ? 0 : h2 - h1;
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(rad(dh / 2));
  const lp = (L1 + L2) / 2, cp = (cp1 + cp2) / 2;
  let hp = h1 + h2;
  if (cp1 * cp2 !== 0) { if (Math.abs(h1 - h2) > 180) hp += hp < 360 ? 360 : -360; hp /= 2; }
  const T = 1 - .17 * Math.cos(rad(hp - 30)) + .24 * Math.cos(rad(2 * hp)) + .32 * Math.cos(rad(3 * hp + 6)) - .2 * Math.cos(rad(4 * hp - 63));
  const sl = 1 + .015 * (lp - 50) ** 2 / Math.sqrt(20 + (lp - 50) ** 2);
  const sc = 1 + .045 * cp, sh = 1 + .015 * cp * T;
  const rt = -2 * Math.sqrt(cp ** 7 / (cp ** 7 + 25 ** 7)) * Math.sin(rad(60 * Math.exp(-(((hp - 275) / 25) ** 2))));
  const dl = (L2 - L1) / sl, dc = (cp2 - cp1) / sc, d = dH / sh;
  return Math.sqrt(dl * dl + dc * dc + d * d + rt * dc * d);
}

/**
 * Plus proches voisins d'une couleur dans une table fabricant.
 *
 * Une seule implémentation pour toutes les tables (fils, perles de verre,
 * perles à repasser, strass) : le tri par CIEDE2000 croissant et l'exclusion
 * des références arrêtées sont les mêmes partout.
 */
export function nearestColors<T extends { lab: Lab; discontinued?: boolean }>(
  lab: Lab,
  pool: T[],
  limit = 3,
  includeDiscontinued = false,
): (T & { deltaE: number })[] {
  const out: (T & { deltaE: number })[] = [];
  for (const item of pool) {
    if (item.discontinued && !includeDiscontinued) continue;
    out.push({ ...item, deltaE: deltaE2000(lab, item.lab) });
  }
  out.sort((a, b) => a.deltaE - b.deltaE);
  return out.slice(0, Math.max(0, limit));
}

/**
 * Libellé court d'un écart CIEDE2000, sur l'échelle documentée par la source
 * des données couleur : sous ~1 l'écart est invisible, sous ~3 les deux
 * couleurs sont proches, au-dessus de ~10 elles sont différentes.
 *
 * Sert aux fils comme aux perles, pour ne pas avoir deux échelles en vitrine.
 */
export function deltaELabel(d: number): string {
  if (d < 1) return "identique à l'œil";
  if (d < 3) return "très proche";
  if (d < 6) return "proche";
  if (d < 12) return "teinte approchée";
  return "teinte différente";
}

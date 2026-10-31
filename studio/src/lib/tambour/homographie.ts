/**
 * Superposer un patron à la vraie toile (Tambour vivant, lot B) : la perspective par quatre coins.
 * Mathématiques pures, sans dépendance : quatre points de départ et quatre points d'arrivée donnent une homographie (3 × 3),
 * appliquée au patron par une transformation CSS matrix3d. Rien n'est envoyé : tout est calculé sur l'appareil.
 */
export type Pt = { x: number; y: number };
/** l'homographie, ligne par ligne : [a, b, c, d, e, f, g, h, 1] ; (x, y) → ((a x + b y + c) / (g x + h y + 1), (d x + e y + f) / (g x + h y + 1)) */
export type H = [number, number, number, number, number, number, number, number, number];

/** Résout A·x = b (8 × 8) par élimination de Gauss avec pivot partiel ; null si le système est dégénéré. */
function resoudre(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((l, i) => [...l, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-10) return null;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) { if (r === c) continue; const k = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= k * M[c][j]; }
  }
  return M.map((l, i) => l[n] / l[i]);
}

/** L'homographie qui envoie les quatre points `de` sur les quatre points `vers` ; null si trois points sont alignés. */
export function homographie(de: Pt[], vers: Pt[]): H | null {
  if (de.length !== 4 || vers.length !== 4) return null;
  const A: number[][] = [], b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = de[i], { x: u, y: v } = vers[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const s = resoudre(A, b); if (!s || s.some(v => !Number.isFinite(v))) return null;
  const h: H = [s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], 1];
  /* une transformation qui écrase le plan (trois points d'arrivée alignés) n'est pas une perspective */
  const det = h[0] * (h[4] * h[8] - h[5] * h[7]) - h[1] * (h[3] * h[8] - h[5] * h[6]) + h[2] * (h[3] * h[7] - h[4] * h[6]);
  const echelle = Math.max(...h.slice(0, 6).map(Math.abs)) ** 2 || 1;
  return Math.abs(det) / echelle < 1e-9 ? null : h;
}

export function appliquer(h: H, p: Pt): Pt {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

/** La transformation CSS (à poser avec transform-origin: 0 0) : matrix3d est rangée par colonnes. */
export function matrix3d(h: H): string {
  const [a, b, c, d, e, f, g, k, i] = h, r = (v: number) => +v.toPrecision(10);
  return `matrix3d(${[a, d, 0, g, b, e, 0, k, 0, 0, 1, 0, c, f, 0, i].map(r).join(",")})`;
}

/** Un quadrilatère utilisable : convexe, dans l'ordre haut-gauche, haut-droite, bas-droite, bas-gauche (sens des aiguilles). */
export function convexe(q: Pt[]): boolean {
  if (q.length !== 4) return false;
  let signe = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    const z = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(z) < 1e-9) return false;
    if (!signe) signe = Math.sign(z); else if (Math.sign(z) !== signe) return false;
  }
  return signe > 0;
}

/** Les coins de départ : le patron centré dans le tambour, à son format, sur 70 % du diamètre (en fractions du côté du tambour). */
export function coinsInitiaux(w: number, h: number, part = .7): Pt[] {
  const k = part / Math.max(w, h), lw = w * k, lh = h * k, x0 = (1 - lw) / 2, y0 = (1 - lh) / 2;
  return [{ x: x0, y: y0 }, { x: x0 + lw, y: y0 }, { x: x0 + lw, y: y0 + lh }, { x: x0, y: y0 + lh }];
}

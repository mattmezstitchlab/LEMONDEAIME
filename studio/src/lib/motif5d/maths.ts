/**
 * Calculs reproductibles à l'identique sur tous les navigateurs et sur le serveur.
 * Les quatre opérations et Math.sqrt sont arrondies exactement par la norme IEEE 754 ;
 * Math.sin, cos, atan2, exp, log et pow ne le sont pas (leur dernier chiffre varie selon le moteur JavaScript).
 * Ce module n'utilise donc que + − × ÷, Math.sqrt, Math.floor, Math.abs, Math.min, Math.max et Math.imul.
 */

/** Mélange d'entiers (finaliseur de MurmurHash3) : deux graines voisines donnent des suites sans rapport. */
export function melanger(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ (b | 0)) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32 : une suite de nombres dans [0, 1), la même pour la même graine, partout. */
export function hasard(graine: number) {
  let s = graine >>> 0;
  const suivant = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(suivant, { entier: (a: number, b: number) => a + Math.floor(suivant() * (b - a + 1)) });
}
export type Hasard = ReturnType<typeof hasard>;

/** cos(2π·x), x en tours. Approximation de Bhaskara (écart < 0,002), en arithmétique pure. */
export function cosTour(x: number): number {
  let t = x - Math.floor(x);           // [0, 1)
  t = t + 0.25; t = t - Math.floor(t);  // cos(2πx) = sin(2π(x + ¼))
  const negatif = t >= 0.5;
  const u = (negatif ? t - 0.5 : t) * 2; // [0, 1) ↔ θ ∈ [0, π)
  const p = u * (1 - u);                 // θ(π − θ) / π²
  const s = (16 * p) / (5 - 4 * p);
  return negatif ? -s : s;
}

/** L'angle dans l'octant (0 ≤ v ≤ u), en fraction de 45° : atan(v/u)/(π/4), approximation en arithmétique pure. */
export function fractionOctant(u: number, v: number): number {
  if (u <= 0) return 0;
  const t = v / u;                       // [0, 1]
  // atan(t) ≈ π/4·t + 0,273·t·(1 − t) (écart < 0,004 rad) ; divisé par π/4
  return t + 0.34759 * t * (1 - t);
}

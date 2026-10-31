/**
 * Le défilement de l'édition : UN seul écouteur pour toute la page, une seule lecture de position par image.
 * Chaque scène abonnée reçoit sa progression (0 → 1 pendant que son plateau reste collé à l'écran) ;
 * elle est aussi écrite en variable CSS --p sur la scène, pour que les transformations se fassent en CSS (pas de mise en page à chaque image).
 * Mouvement réduit (système ou Confort) : chaque scène est montrée dans son état final, sans défilement piloté.
 */
type Abonne = { el: HTMLElement; rappel?: (p: number) => void; dernier: number };
const abonnes = new Set<Abonne>();
let image = 0, installe = false;

export function mouvementReduit(): boolean {
  if (typeof window === "undefined") return true;
  if (document.documentElement.dataset.pzMotion === "reduce") return true;
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** La progression d'une scène : 0 quand son haut touche le haut de l'écran, 1 quand son bas touche le bas. */
export function progression(haut: number, hauteur: number, ecran: number): number {
  const course = hauteur - ecran;
  if (course <= 0) return haut <= 0 ? 1 : 0;
  return Math.min(1, Math.max(0, -haut / course));
}

function calculer() {
  image = 0;
  const H = window.innerHeight;
  for (const a of abonnes) {
    const r = a.el.getBoundingClientRect();
    if (r.bottom < -H || r.top > 2 * H) continue; // hors de vue : rien à faire
    const p = mouvementReduit() ? 1 : progression(r.top, r.height, H);
    if (Math.abs(p - a.dernier) < 0.0004) continue;
    a.dernier = p;
    a.el.style.setProperty("--p", p.toFixed(4));
    a.rappel?.(p);
  }
}
const demander = () => { if (!image) image = requestAnimationFrame(calculer); };

/** S'abonner : renvoie la fonction de désabonnement. */
export function suivreScene(el: HTMLElement, rappel?: (p: number) => void): () => void {
  const a: Abonne = { el, rappel, dernier: -1 };
  abonnes.add(a);
  if (!installe) {
    installe = true;
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    window.addEventListener("pz:accessibility", demander);
  }
  demander();
  return () => {
    abonnes.delete(a);
    if (!abonnes.size && installe) { installe = false; window.removeEventListener("scroll", demander); window.removeEventListener("resize", demander); window.removeEventListener("pz:accessibility", demander); }
  };
}

/** Une étape (0 … n-1) d'après des seuils de progression : ne change d'état React qu'au passage d'un seuil. */
export const etapeDe = (p: number, seuils: number[]) => seuils.reduce((e, s, k) => (p >= s ? k : e), 0);
export const lisse = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

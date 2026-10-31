/**
 * Le patron posé sur la toile filmée (Tambour vivant, lot B) : son rendu (aplats, symboles, grille seule, une seule couleur),
 * les points qui restent à faire (reliés au suivi des points de l'ouvrage), et les coins retenus par ouvrage, sur cet appareil.
 */
import { FLOSS } from "../dmc";
import { assignedSymbol, type Pattern } from "../pattern";
import { drawSymbol } from "../symbols";
import type { Pt } from "./homographie";

export type AffichageSuperpose = "aplats" | "symboles" | "grille" | "couleur";
export interface OptionsSuperpose { affichage: AffichageSuperpose; couleur: number | null; aFaire: boolean }

/** la taille d'une case à l'écran : assez fine pour la netteté, sans dépasser 2400 px de côté */
export const pasDe = (p: Pattern) => Math.max(2, Math.min(16, Math.floor(2400 / Math.max(p.w, p.h))));

/** Dessine le patron (fond transparent : la toile filmée se voit au travers). */
export function dessinerPatron(p: Pattern, o: OptionsSuperpose, c: HTMLCanvasElement) {
  const k = pasDe(p); c.width = p.w * k; c.height = p.h * k;
  const x = c.getContext("2d"); if (!x) return;
  x.clearRect(0, 0, c.width, c.height);
  const garde = (i: number) => { const f = p.cross[i]; if (f < 0) return false; if (o.aFaire && p.done[i]) return false; if (o.affichage === "couleur" && o.couleur !== null && f !== o.couleur) return false; return true; };
  if (o.affichage !== "grille") {
    for (let i = 0; i < p.cross.length; i++) {
      if (!garde(i)) continue;
      const f = p.cross[i], cx = (i % p.w) * k, cy = Math.floor(i / p.w) * k;
      if (o.affichage === "symboles") {
        x.fillStyle = "rgba(255,255,255,.82)"; x.fillRect(cx, cy, k, k);
        if (k >= 6) drawSymbol(x, assignedSymbol(p, f), cx + k / 2, cy + k / 2, k * .36, "#0a0a0b");
      } else { x.fillStyle = FLOSS[f]?.hex ?? "#888"; x.fillRect(cx, cy, k, k); }
    }
  }
  /* la grille : fine à chaque case, marquée toutes les dix, comme sur un patron imprimé */
  x.lineWidth = 1;
  for (let i = 0; i <= p.w; i++) { x.strokeStyle = i % 10 ? "rgba(10,10,11,.28)" : "rgba(10,10,11,.75)"; x.beginPath(); x.moveTo(i * k + .5, 0); x.lineTo(i * k + .5, p.h * k); x.stroke(); }
  for (let j = 0; j <= p.h; j++) { x.strokeStyle = j % 10 ? "rgba(10,10,11,.28)" : "rgba(10,10,11,.75)"; x.beginPath(); x.moveTo(0, j * k + .5); x.lineTo(p.w * k, j * k + .5); x.stroke(); }
}

/** Ce qui reste à broder, en points (toutes couleurs, ou une seule). */
export function resteAFaire(p: Pattern, couleur: number | null = null): number {
  let n = 0; for (let i = 0; i < p.cross.length; i++) { const f = p.cross[i]; if (f >= 0 && !p.done[i] && (couleur === null || f === couleur)) n++; } return n;
}

/* les coins retenus pour chaque ouvrage, sur cet appareil (on remet son téléphone au même endroit, on retrouve son alignement) */
const CLE = "pointzero:tambour:coins:v1";
export function lireCoins(id: string): Pt[] | null {
  try { const t = JSON.parse(localStorage.getItem(CLE) || "{}")[id]; return Array.isArray(t) && t.length === 4 && t.every((q: Pt) => Number.isFinite(q?.x) && Number.isFinite(q?.y)) ? t : null; } catch { return null; }
}
export function ecrireCoins(id: string, q: Pt[]) {
  try { const t = JSON.parse(localStorage.getItem(CLE) || "{}"); t[id] = q.map(p => ({ x: +p.x.toFixed(4), y: +p.y.toFixed(4) }));
    const ids = Object.keys(t); if (ids.length > 30) delete t[ids[0]]; localStorage.setItem(CLE, JSON.stringify(t)); } catch { /* rien : l'alignement reste pour la séance */ }
}

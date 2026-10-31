/**
 * Le Tambour vivant, lot A : ce que la caméra voit devient du point de croix, en direct.
 * Rien ne quitte l'appareil. L'aperçu est une petite grille (48 à 80 points de côté), recalculée quelques fois par seconde :
 * la dernière image gagne, aucune ne s'accumule. Le calcul est celui de l'import (quantizePixels), dans un seul worker.
 */
import { FLOSS } from "../dmc";
import { quantizePixels } from "../quantize";
import type { ConvertOptions } from "../convert";

export interface Grille { w: number; h: number; cross: Int16Array; palette: number[] }

/** Le plus grand carré centré dans une image (le tambour est rond : on garde le carré qui le contient). */
export function carreCentre(w: number, h: number) { const cote = Math.min(w, h); return { sx: Math.floor((w - cote) / 2), sy: Math.floor((h - cote) / 2), cote }; }

/** Une file qui ne garde que le dernier travail en attente : si un calcul est en cours, le suivant remplace l'ancien. */
export class DerniereImage<T, R> {
  private enCours = false; private attente: T | null = null;
  constructor(private calcul: (t: T) => Promise<R>, private surResultat: (r: R) => void, private surErreur: (e: unknown) => void = () => {}) {}
  get occupe() { return this.enCours; }
  soumettre(t: T) { if (this.enCours) { this.attente = t; return; } void this.lancer(t); }
  private async lancer(t: T) {
    this.enCours = true;
    try { this.surResultat(await this.calcul(t)); } catch (e) { this.surErreur(e); }
    this.enCours = false;
    const suite = this.attente; this.attente = null; if (suite !== null) void this.lancer(suite);
  }
}

/** Le convertisseur d'une séance : un worker gardé, sinon le calcul sur place (même résultat). */
export class ConvertisseurVivant {
  private worker: Worker | null = null; private n = 0; private attentes = new Map<number, (r: Grille | Error) => void>();
  constructor() {
    if (typeof Worker === "undefined") return;
    try {
      this.worker = new Worker(new URL("./vivant.worker.ts", import.meta.url), { type: "module" });
      this.worker.onmessage = (e: MessageEvent<{ id: number; cross?: Int16Array; palette?: number[]; erreur?: string }>) => {
        const f = this.attentes.get(e.data.id); if (!f) return; this.attentes.delete(e.data.id);
        f(e.data.erreur || !e.data.cross ? new Error(e.data.erreur || "Conversion impossible") : { w: 0, h: 0, cross: e.data.cross, palette: e.data.palette ?? [] });
      };
      this.worker.onerror = () => { this.worker?.terminate(); this.worker = null; for (const f of this.attentes.values()) f(new Error("Le calcul en arrière-plan est indisponible")); this.attentes.clear(); };
    } catch { this.worker = null; }
  }
  async convertir(pixels: Uint8ClampedArray, w: number, h: number, opts: ConvertOptions): Promise<Grille> {
    if (!this.worker) { const r = quantizePixels(pixels, w, h, opts); return { w, h, cross: r.cross, palette: r.palette }; }
    const id = ++this.n, copie = pixels.slice();
    const r = await new Promise<Grille | Error>(res => { this.attentes.set(id, res); this.worker!.postMessage({ id, pixels: copie.buffer, w, h, opts }, [copie.buffer]); });
    if (r instanceof Error) { const q = quantizePixels(pixels, w, h, opts); return { w, h, cross: q.cross, palette: q.palette }; }
    return { ...r, w, h };
  }
  fermer() { this.worker?.terminate(); this.worker = null; this.attentes.clear(); }
}

/** Les fils échangés (« je remplace ce DMC par celui-là ») appliqués à une grille, sans toucher à l'original. */
export function echanger(g: Grille, echanges: ReadonlyMap<number, number>): Grille {
  if (!echanges.size) return g;
  const cross = g.cross.map(c => (c >= 0 && echanges.has(c) ? echanges.get(c)! : c)) as Int16Array;
  return { ...g, cross, palette: [...new Set(g.palette.map(c => echanges.get(c) ?? c))] };
}

/** Les fils de la grille, du plus présent au moins présent. */
export function filsParPresence(g: Grille): { fil: number; n: number }[] {
  const n = new Map<number, number>(); for (const c of g.cross) if (c >= 0) n.set(c, (n.get(c) ?? 0) + 1);
  return [...n].map(([fil, k]) => ({ fil, n: k })).sort((a, b) => b.n - a.n);
}

/** Les fils DMC les plus proches d'un fil (en CIELAB, comme la conversion), pour l'échanger. */
export function voisins(fil: number, combien = 8): number[] {
  const a = FLOSS[fil]?.lab; if (!a) return [];
  return FLOSS.map((f, i) => ({ i, d: (f.lab[0] - a[0]) ** 2 + (f.lab[1] - a[1]) ** 2 + (f.lab[2] - a[2]) ** 2 }))
    .filter(x => x.i !== fil).sort((x, y) => x.d - y.d).slice(0, combien).map(x => x.i);
}

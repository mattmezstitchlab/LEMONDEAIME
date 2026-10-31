/**
 * La mémoire du Point : les habitudes de la personne, sur cet appareil, jamais dans l'ouvrage.
 * Le noyau ne sait pas ce qu'il retient : il note des chemins d'identifiants (« fils › famille-rouges › dmc-321 »)
 * et les retrouve dans les commandes du moment. Ce qui a disparu du contexte est simplement ignoré.
 */
import type { ModePoint } from "./modes";

export interface Usage { c: string[]; n: number; t: number }
export const USAGE_CLE = "pointzero:point:usage:";
const MAX = 40;
let horloge = 0; // un ordre strict, même pour deux choix dans la même milliseconde

export function lireUsage(cle: string): Usage[] {
  try { const v = JSON.parse(localStorage.getItem(USAGE_CLE + cle) ?? "[]"); return Array.isArray(v) ? v.filter(u => Array.isArray(u?.c) && u.c.length) : []; } catch { return []; }
}
export function noterUsage(cle: string, chemin: string[]): void {
  if (!chemin.length) return;
  const k = chemin.join("/"), l = lireUsage(cle), u = l.find(x => x.c.join("/") === k);
  const t = Math.max(Date.now(), horloge + 1, ...l.map(x => x.t + 1)); horloge = t;
  if (u) { u.n++; u.t = t; } else l.push({ c: chemin, n: 1, t });
  l.sort((a, b) => b.t - a.t);
  try { localStorage.setItem(USAGE_CLE + cle, JSON.stringify(l.slice(0, MAX))); } catch { /* l'appareil refuse : rien n'est retenu */ }
}
export function oublierUsage(cle: string): void { try { localStorage.removeItem(USAGE_CLE + cle); } catch { /* rien */ } }

/** Retrouver une commande d'après son chemin, dans les commandes du moment ; avec les familles traversées. */
export function resoudre(racine: ModePoint[], chemin: string[]): { mode: ModePoint; familles: ModePoint[] } | null {
  let niveau = racine; const familles: ModePoint[] = [];
  for (let i = 0; i < chemin.length; i++) {
    const m = niveau.find(x => x.id === chemin[i]); if (!m) return null;
    if (i === chemin.length - 1) return m.enfants ? null : { mode: m, familles };
    if (!m.enfants) return null;
    familles.push(m); niveau = m.enfants();
  }
  return null;
}

export interface Favori { chemin: string[]; mode: ModePoint; familles: ModePoint[]; genre: "recent" | "frequent"; n: number }
/**
 * Les accès rapides : d'abord les derniers choix (au plus `parFamille` d'une même famille du premier cercle, pour que
 * le dernier outil, le dernier fil et le dernier affichage s'y côtoient), puis les plus utilisés qui n'y sont pas déjà.
 */
export function favoris(usages: Usage[], racine: ModePoint[], { recents = 6, parFamille = 3, frequents = 3 } = {}): Favori[] {
  const vus = new Set<string>(), parF = new Map<string, number>(), out: Favori[] = [];
  const valides = usages.map(u => ({ u, r: resoudre(racine, u.c) })).filter(x => x.r) as { u: Usage; r: NonNullable<ReturnType<typeof resoudre>> }[];
  for (const { u, r } of [...valides].sort((a, b) => b.u.t - a.u.t)) {
    if (out.length >= recents) break;
    const f = u.c[0], k = u.c.join("/");
    if ((parF.get(f) ?? 0) >= parFamille || vus.has(k)) continue;
    parF.set(f, (parF.get(f) ?? 0) + 1); vus.add(k);
    out.push({ chemin: u.c, ...r, genre: "recent", n: u.n });
  }
  for (const { u, r } of [...valides].sort((a, b) => b.u.n - a.u.n || b.u.t - a.u.t)) {
    if (out.filter(x => x.genre === "frequent").length >= frequents) break;
    const k = u.c.join("/"); if (vus.has(k) || u.n < 2) continue;
    vus.add(k); out.push({ chemin: u.c, ...r, genre: "frequent", n: u.n });
  }
  return out;
}

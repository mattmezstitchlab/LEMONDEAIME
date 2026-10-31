/**
 * L'import en cours : les fichiers restent dans la mémoire de cette page (rien n'est envoyé ni enregistré ; un rechargement
 * les oublie, et le Disque le dit). Les lectures sont faites une fois, à la demande.
 */
import { lire, ORDRE_TYPES, typeDe, type Lecture, type TypeFichier } from "./lire";

export const EVT_IMPORT = "aime:import";
let fichiers: File[] = [];
let demonstration = false;
const lectures = new Map<File, Promise<Lecture>>();

export const importes = () => fichiers;
export const estDemonstration = () => demonstration;
export function importer(liste: File[], demo = false) {
  const vus = new Set(fichiers.map(f => f.name + f.size));
  if (demo !== demonstration) { fichiers = []; vus.clear(); }
  fichiers = [...fichiers, ...liste.filter(f => !vus.has(f.name + f.size) && !/(^|\/)\./.test((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name))];
  demonstration = demo;
  window.dispatchEvent(new Event(EVT_IMPORT));
}
export function vider() { fichiers = []; demonstration = false; lectures.clear(); window.dispatchEvent(new Event(EVT_IMPORT)); }
/** les types réellement présents, dans un ordre stable, avec leurs fichiers */
export function parType(liste = fichiers): { type: TypeFichier; fichiers: File[] }[] {
  return ORDRE_TYPES.map(type => ({ type, fichiers: liste.filter(f => typeDe(f) === type) })).filter(g => g.fichiers.length);
}
export function lecture(f: File): Promise<Lecture> {
  let p = lectures.get(f); if (!p) { p = lire(f); lectures.set(f, p); } return p;
}
/** la démonstration : des fichiers réels du Studio (un PDF, un Markdown, une page HTML, une image), dits comme démonstration */
export async function chargerDemonstration(base: string) {
  const noms: [string, string][] = [["one-lecture-claire.pdf", "application/pdf"], ["one-lecture-claire.md", "text/markdown"], ["one-lecture-claire.html", "text/html"], ["papillon.png", "image/png"]];
  const liste = await Promise.all(noms.map(async ([n, t]) => {
    const r = await fetch(base + (n === "papillon.png" ? "images/papillon.png" : "one/demonstration/" + n));
    if (!r.ok) throw new Error(n);
    return new File([await r.blob()], n, { type: t, lastModified: Date.parse("2026-10-30T10:35:00+01:00") });
  }));
  importer(liste, true);
}

/**
 * ATLAS dans le calendrier du Disque : un projet du Monde AIME, lu EN DIRECT dans ATLAS (atlas.lemondeaime.com/data/temps.json),
 * jamais copié ici. Le fichier est généré par ATLAS (outils/temps.mjs) depuis ses données publiques : les entrées publiées
 * de la chronologie 1999 – 2025 et les jours de création des applications Base44, chacun avec sa précision et sa source.
 * Si ATLAS ne répond pas, le projet n'apparaît pas : rien n'est inventé pour le remplacer.
 */
import { ATLAS_URL } from "../destinations";
import type { Element, Precision } from "./projets";
import type { Projet } from "./recommander";

export const ATLAS_TEMPS = ATLAS_URL.replace(/\/?$/, "/") + "data/temps.json";

interface ElementBrut { id: string; genre: string; titre: string; date: string; precision: string; source: string; lien?: string }
export interface TempsAtlas { format: string; version: number; adresse?: string; elements: ElementBrut[] }

const PRECISIONS: Precision[] = ["annee", "mois", "jour"];
/** la date de fin d'une date partielle (« 2005 » → 31/12/2005), pour savoir où en est le projet sans rien supposer de plus */
const fin = (d: string) => { const [a, m, j] = d.split("-").map(Number); return m ? (j ? Date.UTC(a, m - 1, j) : Date.UTC(a, m, 0)) : Date.UTC(a, 11, 31); };

/** pure : le fichier d'ATLAS devient un projet et ses éléments datés ; un fichier inattendu est refusé (null) */
export function depuisTemps(t: unknown): { projet: Projet & { etat: string; adresse: string }; elements: Element[] } | null {
  const x = t as TempsAtlas;
  if (!x || x.format !== "atlas-temps" || x.version !== 1 || !Array.isArray(x.elements)) return null;
  const elements: Element[] = [];
  for (const e of x.elements) {
    if (!e || typeof e.id !== "string" || typeof e.titre !== "string" || typeof e.source !== "string") continue;
    if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(e.date) || !PRECISIONS.includes(e.precision as Precision)) continue;
    elements.push({ id: "atlas-" + e.id, projet: "atlas", titre: e.titre.slice(0, 160), date: e.date, precision: e.precision as Precision, source: "ATLAS · " + e.source.slice(0, 200), genre: "passe" });
  }
  if (!elements.length) return null;
  const dernier = Math.max(...elements.map(e => fin(e.date!)));
  const chronologie = elements.filter(e => e.id.startsWith("atlas-c-")).length, apps = elements.length - chronologie;
  return {
    projet: { id: "atlas", titre: "ATLAS", genre: "site", univers: "temps", modifie: dernier,
      etat: `${chronologie} entrée${chronologie > 1 ? "s" : ""} de la chronologie · ${apps} jour${apps > 1 ? "s" : ""} de création d’applications`,
      adresse: ATLAS_URL.replace(/\/?$/, "/") + "chronologie" },
    elements,
  };
}

let promesse: Promise<ReturnType<typeof depuisTemps>> | null = null;
/** une seule lecture par visite ; une erreur réseau donne null (le projet n'apparaît pas) */
export function chargerAtlas(): Promise<ReturnType<typeof depuisTemps>> {
  promesse ??= fetch(ATLAS_TEMPS, { credentials: "omit" }).then(r => r.ok ? r.json() : null).then(depuisTemps, () => null);
  return promesse;
}

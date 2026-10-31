/**
 * Les projets du Portail : les VRAIS ouvrages de l'appareil, et LUMIERE, projet documenté (lu dans ses données, jamais modifié).
 * Chaque information porte sa source. Aucune échéance, aucune intention n'est inventée : seules celles que Matt a déclarées
 * (avec leur date) sont reprises ; le reste est « non renseigné ».
 * Le journal (le passé daté) distingue les dates exactes, approximatives et les éléments sans date.
 */
import film from "../../film/lumiere/donnees/fleur-du-ciel.film.json";
import type { ProjectRecord } from "../library";
import type { Projet } from "./recommander";

/** un élément du temps d'un projet : sa date (ISO, éventuellement partielle) et la précision qu'on en a vraiment */
export type Precision = "minute" | "jour" | "mois" | "annee" | "aucune";
export interface Element { id: string; projet: string; titre: string; date?: string; precision: Precision; source: string; genre: "passe" | "futur" }

/* ——— LUMIERE : ce que disent ses données ——— */
type PlanBrut = { active: string; versions: { id: string; nature: string }[] };
const plans = (film as unknown as { plans: PlanBrut[] }).plans;
const natures = plans.reduce<Record<string, number>>((n, p) => { const v = p.versions.find(x => x.id === p.active); if (v) n[v.nature] = (n[v.nature] ?? 0) + 1; return n; }, {});
export const LUMIERE_PLANS = { total: plans.length, previz: natures.previz ?? 0, attente: natures.attente ?? 0, substitution: natures.substitution ?? 0 };

const DECLARE = "décision de Matt, 30/10/2026";
export const LUMIERE: Projet & { etat: string; adresse: string } = {
  id: "lumiere", titre: "LUMIERE", genre: "film", univers: "musique",
  etat: `${LUMIERE_PLANS.total} plans · ${LUMIERE_PLANS.previz} en prévisualisation · ${LUMIERE_PLANS.attente} en attente`,
  /* la dernière activité réelle : le dernier commit du film (c08039d) */
  modifie: Date.parse("2026-10-30T07:25:41+01:00"),
  intention: { texte: "vous voulez en faire une œuvre cinématographique (de 30 min à 1 h)", source: DECLARE },
  prochaine: { texte: "générer avec Manus les plans prioritaires (prompts déjà écrits)", source: "note d’intention et séquencier validés, 30/10/2026" },
  bloque: [
    { texte: "droits de la musique non validés (rien de public)", source: "règle LUMIERE, 30/10/2026" },
    { texte: "prise de vue réelle de vos mains à faire", source: DECLARE },
  ],
  adresse: "one/lumiere/vivre",
};

/** le passé daté de LUMIERE : l'historique Git du film (dates exactes, à la minute), et ce qui n'a pas de date connue */
export const JOURNAL_LUMIERE: Element[] = [
  { id: "l-album", projet: "lumiere", titre: "Les 22 fichiers originaux de l’album, rangés dans une branche privée", date: "2026-10-29T22:59", precision: "minute", source: "commit 18f416a", genre: "passe" },
  { id: "l-point", projet: "lumiere", titre: "« La naissance du Point », première séquence", date: "2026-10-30T01:08", precision: "minute", source: "commit b4680bf", genre: "passe" },
  { id: "l-montage", projet: "lumiere", titre: "Le moteur de montage et l’ouverture immersive", date: "2026-10-30T02:41", precision: "minute", source: "commit 8f27c6e", genre: "passe" },
  { id: "l-clip", projet: "lumiere", titre: "Le clip entier de « La Fleur du Ciel » devient l’ouverture", date: "2026-10-30T04:08", precision: "minute", source: "commit d124243", genre: "passe" },
  { id: "l-preprod", projet: "lumiere", titre: "Préproduction : prévisualisation, planches, le film en données", date: "2026-10-30T05:56", precision: "minute", source: "commit d39384a", genre: "passe" },
  { id: "l-31", projet: "lumiere", titre: "Le film de 31 plans ouvre le site (aperçu privé)", date: "2026-10-30T07:25", precision: "minute", source: "commit c08039d", genre: "passe" },
  { id: "l-composition", projet: "lumiere", titre: "La composition de « La Fleur du Ciel », impact voulu à 03:18", precision: "aucune", source: "Matt (date non documentée)", genre: "passe" },
];

/** le futur : des possibilités, jamais des engagements ni des dates */
export const FUTUR_LUMIERE: Element[] = [
  { id: "f-manus", projet: "lumiere", titre: "Remplacer la prévisualisation par les plans générés, plan par plan", precision: "aucune", source: "modèle VersionPlan, déjà dans les données", genre: "futur" },
  { id: "f-cinema", projet: "lumiere", titre: "Le Disque CINÉMA : les plans éditables dans le Bureau", precision: "aucune", source: "demande de Matt, 30/10/2026", genre: "futur" },
  { id: "f-long", projet: "lumiere", titre: "Le film long : 11 morceaux, 30 min à 1 h (ordre proposé)", precision: "aucune", source: "montage « court métrage », à valider", genre: "futur" },
];

/* ——— les ouvrages de l'appareil ——— */
export function depuisOuvrage(o: ProjectRecord): Projet {
  return { id: "o-" + o.id.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 38), titre: o.name, genre: "ouvrage", ref: o.id, avancement: Math.max(0, Math.min(100, o.progress)), modifie: o.updated, univers: "broderie",
    demonstration: /Démonstration/.test(o.name) };
}
export const journalOuvrage = (o: ProjectRecord): Element =>
  ({ id: "e-" + o.id.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30), projet: "o-" + o.id.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 38), titre: `« ${o.name} » modifié`, date: isoLocal(o.updated), precision: "minute", source: "Mes ouvrages, sur cet appareil", genre: "passe" });

/** une date en heure locale, à la minute (« 2026-10-30T07:25 ») : le temps du Portail est celui de l'appareil */
export function isoLocal(ms: number): string {
  const d = new Date(ms), z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

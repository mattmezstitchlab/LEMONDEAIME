/**
 * Le PRÉSENT : quel projet reprendre maintenant, et pourquoi. Une fonction pure, déterministe, explicable.
 *
 * L'ordre (Matt, « Le portail du temps ») : 1. épinglé · 2. échéance déclarée · 3. presque terminé ·
 * 4. intention explicite · 5. activité récente · 6. favoris. Un projet bloqué reste proposable, mais il est dit bloqué.
 * Rien n'est deviné : une intention, une échéance ou un blocage n'existe que s'il a été DÉCLARÉ (avec sa source).
 * Ce qui manque est dit (« non renseigné »), jamais comblé. Le plus récent ne gagne jamais seul contre un rang plus haut.
 */

/** ● une donnée réelle (mesurée : avancement, date) · ◆ déclarée par la personne (avec sa source) · ○ non renseignée */
export type Nature = "donnee" | "declaree" | "manque";
export interface Raison { texte: string; nature: Nature; source?: string }
export interface Declaration { texte: string; source: string; date?: string }

export interface Projet {
  id: string;
  titre: string;
  /** le genre, pour savoir où le reprendre */
  genre: "ouvrage" | "film" | "site";
  /** l'identifiant d'origine (l'ouvrage dans Mes ouvrages), pour le reprendre là où il vit */
  ref?: string;
  /** 0..100 quand l'avancement est mesuré ; absent sinon (jamais estimé) */
  avancement?: number;
  /** la dernière activité réelle (ms) */
  modifie?: number;
  /** l'univers .0NE du projet (pour les favoris) */
  univers?: string;
  /** déclarés, avec leur source */
  echeance?: Declaration & { date: string };
  intention?: Declaration;
  bloque?: Declaration[];
  prochaine?: Declaration;
  /** une démonstration est toujours annoncée comme telle */
  demonstration?: boolean;
}

export interface Choix { epingle?: string; ignores?: Record<string, number> }
export interface Proposition { projet: Projet; raisons: Raison[]; rang: number; bloque: boolean }

export const IGNORER_MS = 7 * 864e5;
export const PRESQUE = 70;
const RECENT_MS = 14 * 864e5;

const jours = (a: number, b: number) => Math.round((a - b) / 864e5);
const quand = (ms: number, maintenant: number) => { const j = jours(maintenant, ms); return j <= 0 ? "aujourd’hui" : j === 1 ? "hier" : `il y a ${j} jours`; };

/** les propositions, de la plus pertinente à la moins pertinente (les ignorés sont retirés pendant 7 jours) */
export function recommander(projets: Projet[], choix: Choix, favoris: string[], maintenant: number): Proposition[] {
  const ignores = choix.ignores ?? {};
  const candidats = projets.filter(p => {
    if (p.id === choix.epingle) return true;
    const ig = ignores[p.id]; if (ig && maintenant - ig < IGNORER_MS) return false;
    /* un ouvrage terminé ou jamais commencé n'est pas « à reprendre » ; un projet sans mesure reste candidat s'il a une activité ou une déclaration */
    if (p.avancement !== undefined && (p.avancement <= 0 || p.avancement >= 100)) return false;
    return p.avancement !== undefined || !!p.modifie || !!p.intention || !!p.echeance;
  });
  const props = candidats.map((p): Proposition & { cle: number[] } => {
    const raisons: Raison[] = [];
    const epingle = p.id === choix.epingle;
    if (epingle) raisons.push({ texte: "épinglé par vous", nature: "declaree" });
    const ech = p.echeance ? Date.parse(p.echeance.date) : NaN;
    if (p.echeance && !Number.isNaN(ech)) {
      const j = jours(ech, maintenant);
      raisons.push({ texte: j < 0 ? `échéance dépassée depuis ${-j} jour${-j > 1 ? "s" : ""}` : j === 0 ? "échéance aujourd’hui" : `échéance dans ${j} jour${j > 1 ? "s" : ""}`, nature: "declaree", source: p.echeance.source });
    }
    const presque = p.avancement !== undefined && p.avancement >= PRESQUE;
    if (p.avancement !== undefined) raisons.push({ texte: presque ? `presque terminé (${Math.round(p.avancement)} %)` : `commencé (${Math.round(p.avancement)} %)`, nature: "donnee" });
    if (p.intention) raisons.push({ texte: p.intention.texte, nature: "declaree", source: p.intention.source });
    const recent = !!p.modifie && maintenant - p.modifie < RECENT_MS;
    if (p.modifie) raisons.push({ texte: `dernière activité ${quand(p.modifie, maintenant)}`, nature: "donnee" });
    const favori = !!p.univers && favoris.includes(p.univers);
    if (favori) raisons.push({ texte: "dans un univers que vous avez choisi", nature: "declaree", source: "Première rencontre" });
    for (const b of p.bloque ?? []) raisons.push({ texte: "bloqué : " + b.texte, nature: "declaree", source: b.source });
    /* ce qui manque, dit tel quel */
    if (!p.echeance) raisons.push({ texte: "aucune échéance renseignée", nature: "manque" });
    if (!p.prochaine) raisons.push({ texte: "prochaine action non renseignée", nature: "manque" });
    if (p.avancement === undefined) raisons.push({ texte: "avancement non mesuré", nature: "manque" });
    /* la clé de rang : lexicographique, dans l'ordre décidé ; l'activité récente ne compte qu'à rang égal */
    const cle = [epingle ? 1 : 0, Number.isNaN(ech) ? 0 : 1, Number.isNaN(ech) ? 0 : -ech, presque ? 1 : 0, p.intention ? 1 : 0, recent ? 1 : 0, p.modifie ?? 0, favori ? 1 : 0];
    return { projet: p, raisons, rang: 0, bloque: !!p.bloque?.length, cle };
  });
  props.sort((a, b) => { for (let i = 0; i < a.cle.length; i++) if (a.cle[i] !== b.cle[i]) return b.cle[i] - a.cle[i]; return a.projet.titre.localeCompare(b.projet.titre, "fr"); });
  return props.map(({ cle: _c, ...x }, i) => ({ ...x, rang: i + 1 }));
}

/** la phrase quand rien ne peut être proposé : le Studio le dit, il ne devine pas */
export const RIEN = "Je ne sais pas encore ce qui compte pour vous : épinglez un projet, ou commencez-en un.";

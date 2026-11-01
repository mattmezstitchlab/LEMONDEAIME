/**
 * Le domaine « élément SYST'AIME » de la fiche contextuelle : une case du manifeste (un croisement thème × couche, ou un
 * garde-fou transversal) présentée par LA MÊME fiche que le fil DMC, avec ses propres données et ses propres règles.
 *
 * La source est la version PUBLIQUE du manifeste (celle que lit déjà la page /systaime) : elle est injectée, jamais copiée ici.
 * Ce domaine ne connaît ni chemins, ni empreintes, ni défauts de sécurité : ils sont réservés à l'administration, et la fiche
 * le dit (information « non renseignée », avec la raison) au lieu de le cacher.
 * Une seule action, locale et réversible : épingler l'élément sur cet appareil (relue à sa source après écriture).
 */
import type { Domaine } from "./registre";
import type { Action, Fait, Fiche, Relation, Source } from "./fiche";

export interface CaseSyst { id: string; type: string; theme: string | null; couche: string | null; nom: string; resume: string | null; etat: string }
export interface ManifestePublic {
  version: string;
  libelles: Record<string, { titre: string; texte: string }>;
  cases: CaseSyst[];
  decompte: Record<string, number>;
}
export interface SourcesSyst {
  manifeste(): ManifestePublic;
  /** les éléments épinglés sur cet appareil */
  epingles(): string[];
  /** enregistre la liste ; lève une erreur dite si l'appareil refuse d'écrire */
  enregistrerEpingles(ids: string[]): void;
}

export const NOMS_THEMES: Record<string, string> = {
  visuel: "Visuel", interaction: "Interaction", donnees: "Données", relations: "Relations", restitution: "Restitution", memoire: "Mémoire",
};
export const NOMS_COUCHES: Record<string, string> = {
  principes: "Principes", tokens: "Tokens", composants: "Composants", contrats: "Contrats", tests: "Tests", versions: "Versions",
};
export const MAX_EPINGLES = 64;
const CLE = "aime:system:epingles-v1";
const ID_CASE = /^[A-Za-z0-9._-]{1,76}$/;

/** Les épingles vivent dans le navigateur de la personne ; une lecture illisible vaut « aucune », une écriture refusée est dite. */
export function epinglesDeLAppareil(): Pick<SourcesSyst, "epingles" | "enregistrerEpingles"> {
  return {
    epingles() {
      try {
        const v: unknown = JSON.parse(localStorage.getItem(CLE) ?? "[]");
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && ID_CASE.test(x)).slice(0, MAX_EPINGLES) : [];
      } catch { return []; }
    },
    enregistrerEpingles(ids) {
      try { localStorage.setItem(CLE, JSON.stringify(ids.slice(0, MAX_EPINGLES))); }
      catch { throw new Error("Épingle non enregistrée : ce navigateur refuse d'écrire sur l'appareil."); }
    },
  };
}

const libelleEtat = (m: ManifestePublic, etat: string) => m.libelles[etat] ?? { titre: etat, texte: "" };

export function domaineSyst(src: SourcesSyst): Domaine {
  return {
    id: "syst",
    nom: "Élément SYST'AIME",
    resoudre(id): Fiche | null {
      const m = src.manifeste();
      const c = m.cases.find(x => x.id === id);
      if (!c) return null;
      const etat = libelleEtat(m, c.etat);
      const croisement = c.type === "croisement";
      const epingle = src.epingles().includes(c.id);
      const sansPhrase = m.cases.filter(x => !x.resume).length;

      const faits: Fait[] = [
        { cle: "nature", libelle: "Nature", valeur: croisement ? "Croisement thème × couche" : "Garde-fou transversal", statut: "lu", source: "manifeste" },
        ...(croisement && c.theme && c.couche ? [
          { cle: "theme", libelle: "Thème", valeur: NOMS_THEMES[c.theme] ?? c.theme, statut: "lu" as const, source: "manifeste" },
          { cle: "couche", libelle: "Couche", valeur: NOMS_COUCHES[c.couche] ?? c.couche, statut: "lu" as const, source: "manifeste" },
        ] : []),
        { cle: "constat", libelle: "Ce que le manifeste constate", valeur: etat.titre, statut: "lu", source: "manifeste", principal: true },
        ...(etat.texte ? [{ cle: "sens", libelle: "Ce que cela veut dire", valeur: etat.texte, statut: "lu" as const, source: "manifeste" }] : []),
        { cle: "validation", libelle: "Validé par une personne", valeur: c.etat === "validee" ? "Oui" : "Pas encore", statut: "calcule", source: "manifeste", principal: true },
        c.resume
          ? { cle: "resume", libelle: "En une phrase", valeur: c.resume, statut: "lu", source: "manifeste" }
          : { cle: "resume", libelle: "En une phrase", valeur: null, statut: "manquant", source: "manifeste", manque: `le manifeste public ne donne une phrase que pour ${m.cases.length - sansPhrase} cases sur ${m.cases.length}.` },
        { cle: "canonique", libelle: "Source canonique", valeur: null, statut: "manquant", source: "manifeste",
          manque: "chemins, empreintes et commit sont dans le détail interne, réservé à l'administration ; la version publique ne les contient pas." },
        { cle: "epingle", libelle: "Épinglé sur cet appareil", valeur: epingle ? "Oui" : "Non", statut: "declare", source: "appareil", visibilite: "prive" },
      ];

      const relations: Relation[] = croisement && c.theme && c.couche ? [
        ...m.cases.filter(x => x.type === "croisement" && x.theme === c.theme && x.id !== c.id).map(x => ({
          domaine: "syst", id: x.id, libelle: x.nom, nature: "même thème", navigable: true,
          raison: `Les six couches d'un même thème : ${NOMS_THEMES[c.theme!] ?? c.theme}.`,
        })),
        ...m.cases.filter(x => x.type === "croisement" && x.couche === c.couche && x.id !== c.id).map(x => ({
          domaine: "syst", id: x.id, libelle: x.nom, nature: "même couche", navigable: true,
          raison: `La même couche (${NOMS_COUCHES[c.couche!] ?? c.couche}) lue dans chacun des six thèmes.`,
        })),
      ] : [];

      const sources: Source[] = [
        { id: "manifeste", libelle: "Manifeste SYST'AIME, version publique", lieu: "code", detail: `Version ${m.version} : la même lecture que la page /systaime. Ni chemins, ni empreintes, ni détails de sécurité.` },
        { id: "appareil", libelle: "Éléments épinglés de cet appareil", lieu: "appareil", detail: "Gardés dans ce navigateur ; rien n'est envoyé." },
      ];

      const agir = (ajouter: boolean): Action["executer"] => () => {
        const avant = src.epingles();
        if (ajouter && avant.length >= MAX_EPINGLES && !avant.includes(c.id)) return { ok: false, message: `Épingle refusée : ${MAX_EPINGLES} éléments sont déjà épinglés. Retirez-en un.` };
        const apres = ajouter ? [...new Set([...avant, c.id])] : avant.filter(x => x !== c.id);
        src.enregistrerEpingles(apres);
        const relu = src.epingles().includes(c.id);   // relu à la source, pas seulement annoncé
        if (relu !== ajouter) return { ok: false, message: "L'épingle n'a pas été retenue par cet appareil." };
        return { ok: true, message: ajouter ? `« ${c.nom} » est épinglé sur cet appareil.` : `« ${c.nom} » n'est plus épinglé.`, verification: `Relu depuis l'appareil : ${src.epingles().length} élément${src.epingles().length > 1 ? "s" : ""} épinglé${src.epingles().length > 1 ? "s" : ""}.` };
      };
      const actions: Action[] = [epingle
        ? { id: "desepingler", nom: "Retirer l'épingle", aide: "ne plus garder cet élément à portée", roles: ["proprietaire"],
            effet: { quoi: `« ${c.nom} » sort de vos éléments épinglés`, ou: "liste d'épingles, sur cet appareil", reversible: true }, executer: agir(false) }
        : { id: "epingler", nom: "Épingler", aide: "garder cet élément à portée sur cet appareil", roles: ["proprietaire"],
            effet: { quoi: `« ${c.nom} » est ajouté à vos éléments épinglés`, ou: "liste d'épingles, sur cet appareil", reversible: true }, executer: agir(true) }];

      return {
        domaine: "syst", id: c.id,
        surtitre: croisement ? "Élément SYST'AIME" : "Garde-fou SYST'AIME",
        titre: c.nom,
        sous: etat.titre,
        faits, relations, sources, actions,
        limites: [
          "Version publique : ni chemins, ni empreintes, ni détails de sécurité (ils sont réservés à l'administration).",
          "Un état « testé » ou « présent » ne dit pas que la fonction est validée : seule une personne la valide.",
          "Un test relié n'est pas une couverture de lignes.",
        ],
        version: { libelle: `Manifeste public ${m.version}, ${m.cases.length} cases`, source: "manifeste" },
      };
    },
  };
}

/**
 * Les sections de la landing, telles que le Bureau les montre : dans l'ordre de la page, chacune reliée à sa place
 * dans les contenus (un chemin dans contenus.origine.json) et à son élément dans la page (pour l'aperçu en direct).
 */
export interface Section { cle: string; nom: string; groupe: string; chemin: string[] }
export const SECTIONS: Section[] = [
  { cle: "hi-origine", nom: "01 · L’origine", groupe: "Histoire", chemin: ["histoire", "origine"] },
  { cle: "hi-indiennes", nom: "02 · Les indiennes", groupe: "Histoire", chemin: ["histoire", "indiennes"] },
  { cle: "or-forme", nom: "Rencontre 1 · La forme", groupe: "Rencontres avec l’Orbe", chemin: ["rencontres", "structure"] },
  { cle: "hi-mulhouse", nom: "03 · Mulhouse, 1746", groupe: "Histoire", chemin: ["histoire", "mulhouse"] },
  { cle: "or-lignes", nom: "Rencontre 2 · Les lignes", groupe: "Rencontres avec l’Orbe", chemin: ["rencontres", "trace"] },
  { cle: "hi-brodeuses", nom: "04 · Les brodeuses", groupe: "Histoire", chemin: ["histoire", "brodeuses"] },
  { cle: "or-finesse", nom: "Rencontre 3 · La finesse", groupe: "Rencontres avec l’Orbe", chemin: ["rencontres", "echelle"] },
  { cle: "hi-sources", nom: "Sources de l’histoire", groupe: "Histoire", chemin: ["histoire", "sources"] },
  { cle: "ed-fils", nom: "05 · Aujourd’hui (le nuancier)", groupe: "Aujourd’hui", chemin: ["fils"] },
  { cle: "or-couleurs", nom: "Rencontre 4 · Les couleurs", groupe: "Rencontres avec l’Orbe", chemin: ["rencontres", "palette"] },
  { cle: "ed-rosace", nom: "06 · Créez maintenant", groupe: "Aujourd’hui", chemin: ["rosace"] },
  { cle: "or-plein", nom: "Rencontre 5 · Le plein", groupe: "Rencontres avec l’Orbe", chemin: ["rencontres", "densite"] },
  { cle: "ed-cadeau", nom: "07 · Le cadeau", groupe: "Le cadeau", chemin: ["cadeau"] },
  { cle: "cd-appareils", nom: "L’atelier sur trois écrans", groupe: "Le cadeau", chemin: ["appareils"] },
];
export const sectionDe = (cle: string) => SECTIONS.find(s => s.cle === cle);

/** Les noms des champs, pour des inspecteurs lisibles (les autres gardent leur nom technique). */
export const LIBELLES: Record<string, string> = {
  alt: "Description de l’image (texte alternatif)", provenance: "Provenance (musée, auteur, autorisation)",
  kicker: "Surtitre", titre: "Titre", sous: "Sous-titre", corps: "Texte", geste: "Consigne de la loupe", aparte: "Mention en marge",
  media: "Grand fond", rouge: "Étoffe rouge", bleu: "Étoffe bleue", nom: "Nom", texte: "Texte", liens: "Liens", libelle: "Libellé", url: "Adresse (https)",
  question: "Question de l’Orbe", reaction: "Réaction de l’Orbe", chapeau: "Chapeau", etapes: "Étapes", titreAvant: "Titre avant le premier choix",
  titreApres: "Titre après le premier choix", legende: "Légende", titreFini: "Titre, rosace complète", orbeFini: "L’Orbe, rosace complète",
  texteFini: "Texte, rosace complète", titreEnCours: "Titre, rosace en cours", orbeEnCours: "L’Orbe, rosace en cours ({n} = choix restants)",
  boutonReste: "Bouton, choix restants ({n})", titreVide: "Titre, aucun choix", orbeVide: "L’Orbe, aucun choix", boutonVide: "Bouton, aucun choix",
  usages: "Usages", note: "Note de conservation", ipad: "Écran de tablette", ordinateur: "Écran d’ordinateur", iphone: "Écran de téléphone",
};
export const libelle = (cle: string) => LIBELLES[cle] ?? cle;

/** Lire et écrire une valeur à un chemin, sans muter l'objet d'origine. */
export function lire(o: unknown, chemin: (string | number)[]): unknown {
  return chemin.reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Record<string | number, unknown>)[k] : undefined), o);
}
export function ecrire<T>(o: T, chemin: (string | number)[], valeur: unknown): T {
  if (!chemin.length) return valeur as T;
  const [k, ...reste] = chemin;
  const copie = (Array.isArray(o) ? [...o] : { ...(o as object) }) as Record<string | number, unknown>;
  copie[k] = ecrire(copie[k], reste, valeur);
  return copie as T;
}

/**
 * La convergence : le registre des accès directs (« Explorer les prototypes »).
 * Chaque accès dit honnêtement où il en est :
 *  - public : déjà en ligne pour tout le monde sur lemondeaime.com ;
 *  - teste : construit et vérifié par des tests automatisés, sur cette version candidate privée (pas encore public) ;
 *  - prototype : expérimental, peut changer ou casser ;
 *  - externe : un projet séparé, déployé à part, PAS intégré ici (lien sortant) ;
 *  - non-raccorde : présenté, mais son moteur n'est pas relié.
 * Aucune case n'annonce un service qui n'existe pas.
 */
export type Statut = "public" | "teste" | "prototype" | "externe" | "non-raccorde";
export const NOMS_STATUTS: Record<Statut, string> = {
  public: "Public", teste: "Testé · non public", prototype: "Prototype", externe: "Projet séparé", "non-raccorde": "Non raccordé",
};
export const AIDE_STATUTS: Record<Statut, string> = {
  public: "Déjà en ligne pour tout le monde sur lemondeaime.com.",
  teste: "Fonctionne et vérifié par des tests automatisés ; visible seulement dans cette version privée.",
  prototype: "Expérimental : il peut changer ou s’arrêter.",
  externe: "Un projet déployé à part ; il s’ouvre dans un nouvel onglet et n’est pas intégré à .0NE.",
  "non-raccorde": "Son rôle est décrit ; son moteur n’est pas encore relié.",
};

export interface Acces { id: string; nom: string; phrase: string; chemin?: string; statut: Statut; preuve?: string; groupe: "parcours" | "disques" | "ateliers" | "essais" | "ailleurs" }

import { ATLAS_URL } from "../lib/destinations";
const S = import.meta.env.BASE_URL;   // /studio/
export const ACCES: Acces[] = [
  { id: "film", groupe: "parcours", nom: "Découvrir AIME — l’ouverture LUMIERE", phrase: "Le clip de « La Fleur du Ciel », sans texte, puis la Première rencontre. « Passer » est toujours là.", chemin: S + "one/lumiere", statut: "teste", preuve: "e2e Chromium · WebKit · Firefox" },
  { id: "vivre", groupe: "parcours", nom: "Vivre LUMIERE — La Fleur du Ciel", phrase: "Le chapitre complet (4 min 13) : lecture, pause, scènes, reprise. L’impact reste à 03:18.255.", chemin: S + "one/lumiere/vivre", statut: "prototype", preuve: "moteur de montage : 14 tests unitaires" },
  { id: "rencontre", groupe: "parcours", nom: "Première rencontre", phrase: "Régler l’interface pour soi : confort visuel, son, interaction, besoins.", chemin: S + "one/premiere-rencontre", statut: "teste", preuve: "e2e .0NE 24/24" },
  { id: "accueil", groupe: "parcours", nom: "Accueil AIME — le Disque ou le Cube", phrase: "Après la Première rencontre : choisir .0NE (le Disque) ou ATLAS (le Cube, site séparé).", chemin: S + "accueil", statut: "teste", preuve: "e2e parcours_aime 44/44 (Chromium, WebKit, téléphone)" },
  { id: "univers", groupe: "parcours", nom: ".0NE — le Disque universel", phrase: "Un seul Disque : un univers est un contexte. Galerie, Bureau, Broderie au centre.", chemin: S + "one/univers", statut: "prototype", preuve: "parcours de démonstration testé (ordinateur, téléphone)" },
  { id: "galerie-disque", groupe: "disques", nom: "Galerie — les rosaces au centre", phrase: "Parcourir, filtrer (deuxième couronne), agrandir, broder.", chemin: S + "one/univers?u=galerie", statut: "prototype" },
  { id: "bureau-disque", groupe: "disques", nom: "Bureau — vos ouvrages au centre", phrase: "Vos vrais ouvrages ; Ouvrir les déploie dans Broderie, le retour garde le contexte.", chemin: S + "one/univers?u=bureau", statut: "prototype" },
  { id: "mosaique", groupe: "essais", nom: "L’ancienne mosaïque (présentations)", phrase: "La version précédente, avec ses fenêtres de présentation : gardée pour comparer.", chemin: S + "one/mosaique", statut: "prototype" },

  { id: "terminal", groupe: "disques", nom: "Disque Terminal", phrase: "La ligne de commande devenue navigation : fichiers, Git, audio, sur un vrai dossier.", chemin: S + "one/terminal", statut: "teste", preuve: "e2e 26/26" },
  { id: "orbe", groupe: "disques", nom: "L’Orbe relationnelle", phrase: "Le Disque Terminal qui répond : contexte, question, action, preuve.", chemin: S + "one/terminal-orbe", statut: "teste", preuve: "e2e 25/25 · 9 tests unitaires" },
  { id: "tambour", groupe: "disques", nom: "Le Tambour vivant", phrase: "Le Disque de broderie : de la caméra au point.", chemin: S + "tambour", statut: "teste", preuve: "e2e cadre/tambour 64/64" },

  { id: "broderie", groupe: "ateliers", nom: "Atelier Broderie (POINT ZÉRO)", phrase: "Créer, suivre et broder ses ouvrages. Le Bureau de vos projets est dedans.", chemin: S + "atelier", statut: "public", preuve: "en ligne ; ici avec les nouveautés des branches privées" },
  { id: "carte", groupe: "ateliers", nom: "La Carte vivante", phrase: "Une carte, plusieurs formes, une seule adresse.", chemin: S + "essai-carte", statut: "teste", preuve: "e2e carte/disque 23/23" },
  { id: "galerie", groupe: "ateliers", nom: "Galerie des Vivants", phrase: "Exposer une copie de ses créations. Elle demande un serveur et une base : sur cet aperçu, elle peut s’afficher vide.", chemin: S + "galerie", statut: "teste", preuve: "e2e galerie (avec serveur de test)" },
  { id: "bureau-edito", groupe: "ateliers", nom: "Bureau éditorial (administration)", phrase: "Réservé à l’adresse d’administration ; il demande un serveur et une base : sur cet aperçu, il s’annonce indisponible.", chemin: S + "bureau", statut: "prototype" },

  { id: "traversee", groupe: "essais", nom: "La traversée", phrase: "Le Point traverse la page (une scène).", chemin: S + "essai-traversee", statut: "prototype" },
  { id: "aime", groupe: "essais", nom: "Le socle AIME, Jour et Nuit", phrase: "Couleurs, typographie et composants du design system.", chemin: S + "essai-aime", statut: "prototype" },
  { id: "image", groupe: "essais", nom: "Le bloc Image", phrase: "Une image pilotée par le même Point.", chemin: S + "essai-image", statut: "prototype" },
  { id: "ripple-film", groupe: "essais", nom: "RIPPLE — la géométrie (démonstration)", phrase: "Dans le film, l’onde devient le cadran Ripple : même contrat géométrique que le futur Disque Ripple. Le moteur causal complet n’est pas intégré.", chemin: S + "one/lumiere/vivre?controle", statut: "prototype" },

  { id: "ripplecircle", groupe: "ailleurs", nom: "RIPPLECIRCLE — cadran vivant (démonstration)", phrase: "Le prototype d’origine, encore lié à la démonstration mariage.", chemin: "https://ripplecircle.vercel.app/", statut: "externe" },
  { id: "openaime", groupe: "ailleurs", nom: "OpenAIME", phrase: "Projet séparé, non intégré à cette version.", chemin: "https://openaime.vercel.app/", statut: "externe" },
  { id: "reseau", groupe: "ailleurs", nom: "Réseau (démonstration)", phrase: "Les pages Réseau du site AIME ; le moteur relationnel complet n’est pas intégré à .0NE.", chemin: "/reseau", statut: "public" },
  { id: "atlas", groupe: "ailleurs", nom: "ATLAS — Atlas de pique de cœur", phrase: "La grille universelle : la chronologie, les projets, l’éditeur, les modules. Application indépendante, rien n’est copié dans .0NE.", chemin: ATLAS_URL, statut: "externe" },
  { id: "site", groupe: "ailleurs", nom: "Le site AIME actuel", phrase: "Les pages publiques aujourd’hui en ligne (BurO, Musique, AIME Wedding…).", chemin: "/buro", statut: "public" },
];

export const GROUPES: { id: Acces["groupe"]; nom: string }[] = [
  { id: "parcours", nom: "Le parcours" }, { id: "disques", nom: "Les Disques" }, { id: "ateliers", nom: "Les ateliers" },
  { id: "essais", nom: "Les essais" }, { id: "ailleurs", nom: "Ailleurs et à venir" },
];

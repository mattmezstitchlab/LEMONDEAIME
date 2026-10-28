import {writeStoredJSON} from "./storageSafety";
import type { Tool } from "./stitch";

/**
 * Le guide de l'atelier.
 *
 * Deux choses vivent ici, et elles partagent la même mécanique : un parcours
 * pas à pas (une étape à la fois, un pictogramme animé, un mémo court) et un
 * champ de saisie qui répond à une question en montrant où se passe la réponse.
 *
 * **Ce n'est pas un agent distant.** L'atelier fonctionne hors ligne, sans
 * compte ni clé d'API : un modèle de langage appelé sur le réseau répondrait
 * hors connexion par un silence, et devinerait sur une interface qu'il ne voit
 * pas. À la place, la connaissance est écrite ici, depuis le source, entrée par
 * entrée. Elle est exhaustive sur ce logiciel — chaque outil, chaque panneau,
 * chaque format d'export, chaque limite assumée — et elle ne déborde pas : une
 * question hors sujet reçoit « je ne sais pas » suivi de ce que le guide sait
 * expliquer, jamais une réponse inventée.
 *
 * Tout ce qui est affirmé dans `KNOWLEDGE` est vérifiable dans `src/`. Quand
 * une limite existe (teintes approchées, métrage estimé, STUN public, iOS qui
 * n'affiche pas l'aperçu PDF), elle est écrite au lieu d'être lissée.
 */

/** Zones de l'interface déjà repérées par un attribut `data-guide`. */
export type Zone = "workspace" | "tools" | "floss" | "project" | "export" | "canvas";

export type CoachTarget = { kind: "tool"; tool: Tool } | { kind: "zone"; zone: Zone };

export const toolTarget = (tool: Tool): CoachTarget => ({ kind: "tool", tool });
export const zoneTarget = (zone: Zone): CoachTarget => ({ kind: "zone", zone });

/** Panneaux que le guide peut demander d'ouvrir. */
export type CoachPanel = "project" | "export" | "library" | "share" | "palette";

/**
 * Le geste qui valide une étape.
 *
 * Un guide qui avance au chronomètre redevient la vidéo qu'on a supprimée : il
 * montre sans faire faire. Chaque étape attend donc un geste réel — l'outil est
 * pris, une case est posée, un fil est choisi, un panneau est ouvert — tout en
 * gardant « Suivant » et « Passer » sous la main, pour ne jamais bloquer.
 */
export type Gesture = "any" | "tool" | "stitch" | "color" | "panel";

export interface CoachStep {
  id: string;
  workspace: "create" | "stitch";
  title: string;
  /** Une ou deux phrases : ce qu'il faut retenir, pas un mode d'emploi. */
  memo: string;
  target: CoachTarget;
  gesture: Gesture;
  /** Outil attendu quand le geste est « tool ». */
  expect?: Tool;
  /** Panneau attendu quand le geste est « panel ». */
  expectPanel?: CoachPanel;
}

/* ------------------------------------------------------------------ */
/* Parcours                                                            */
/* ------------------------------------------------------------------ */

const CREATE: CoachStep[] = [
  {
    id: "c-workspace",
    workspace: "create",
    title: "Deux gestes, un seul projet",
    memo: "Créer dessine le patron ; Broder le suit sans l'abîmer. Le sélecteur est en haut de l'écran. Ce guide commence côté création.",
    target: zoneTarget("workspace"),
    gesture: "any",
  },
  {
    id: "c-cross",
    workspace: "create",
    title: "Prendre le point de croix",
    memo: "Le pictogramme qui pulse est l'outil à prendre : X, le point de croix. Une case = un point complet, deux diagonales. Touchez-le.",
    target: toolTarget("cross"),
    gesture: "tool",
    expect: "cross",
  },
  {
    id: "c-first",
    workspace: "create",
    title: "Poser un premier point",
    memo: "Touchez une case, ou glissez : chaque case traversée devient un point réel. L'annulation revient en arrière geste par geste, pas pixel par pixel.",
    target: toolTarget("cross"),
    gesture: "stitch",
  },
  {
    id: "c-fractions",
    workspace: "create",
    title: "Les fractions et les formes",
    memo: "Le groupe « plus » s'ouvre tout seul quand le guide y pointe un outil. Trois-quarts, petite croix, perle, lignes et ellipses : ce qui sert aux contours et aux détails.",
    target: toolTarget("threeQuarter"),
    gesture: "tool",
    expect: "threeQuarter",
  },
  {
    id: "c-floss",
    workspace: "create",
    title: "Changer de fil",
    memo: "Le rail des fils reste contre le patron. Chaque fil garde son code DMC, son symbole et son avancement. Touchez une autre couleur.",
    target: zoneTarget("floss"),
    gesture: "color",
  },
  {
    id: "c-project",
    workspace: "create",
    title: "La toile avant de couper",
    memo: "Le panneau Projet règle le compte de la toile, les fils traversés, les marges, les unités, la symétrie et les mélanges. Un lin 28 brodé sur 2 fils donne 14 points par pouce, comme une aïda 14. Ouvrez-le.",
    target: zoneTarget("project"),
    gesture: "panel",
    expectPanel: "project",
  },
  {
    id: "c-export",
    workspace: "create",
    title: "Vérifier avant d'imprimer",
    memo: "L'export propose le PDF paginé, le SVG, le PNG, le CSV, le JSON, l'OXS et les correspondances multi-marques. Une règle de 10 cm est imprimée en couverture : mesurez-la avant d'imprimer toutes les pages.",
    target: zoneTarget("export"),
    gesture: "panel",
    expectPanel: "export",
  },
];

const STITCH: CoachStep[] = [
  {
    id: "s-workspace",
    workspace: "stitch",
    title: "Passer en mode Broder",
    memo: "En mode Broder, les outils de création disparaissent : on suit le patron, on ne le modifie plus. Le sélecteur est en haut de l'écran.",
    target: zoneTarget("workspace"),
    gesture: "any",
  },
  {
    id: "s-color",
    workspace: "stitch",
    title: "Choisir le fil à broder",
    memo: "Prenez une couleur dans le rail : l'atelier peut n'afficher qu'elle, pour ne plus se tromper de case. Choisissez un fil.",
    target: zoneTarget("floss"),
    gesture: "color",
  },
  {
    id: "s-mark",
    workspace: "stitch",
    title: "Surligner l'avancement",
    memo: "L'outil M coche les cases brodées. Il ne touche jamais au dessin : ce qui est marqué peut être démarqué.",
    target: toolTarget("mark"),
    gesture: "tool",
    expect: "mark",
  },
  {
    id: "s-done",
    workspace: "stitch",
    title: "Broder une case",
    memo: "Cochez une case réellement brodée. L'avancement, le métrage restant et l'estimation de fin se recalculent à partir de votre vitesse, pas d'une moyenne théorique.",
    target: toolTarget("mark"),
    gesture: "stitch",
  },
  {
    id: "s-block",
    workspace: "stitch",
    title: "Avancer par blocs",
    memo: "Bloc 10 × 10 ou ligne entière : de quoi suivre un patron sans perdre sa place, ni compter les cases une à une.",
    target: toolTarget("block"),
    gesture: "tool",
    expect: "block",
  },
  {
    id: "s-park",
    workspace: "stitch",
    title: "Garer un fil",
    memo: "Le parking pose un fil dans le coin d'une case et l'y laisse : on le reprend plus tard sans couper ni rentrer.",
    target: toolTarget("park"),
    gesture: "tool",
    expect: "park",
  },
  {
    id: "s-unpick",
    workspace: "stitch",
    title: "Signaler une erreur",
    memo: "« À défaire » marque la case sans effacer le patron. La liste des erreurs reste visible jusqu'à réparation.",
    target: toolTarget("unpick"),
    gesture: "tool",
    expect: "unpick",
  },
  {
    id: "s-journal",
    workspace: "stitch",
    title: "Le journal de bord",
    memo: "Le panneau Projet donne le temps passé, la vitesse réelle, l'estimation de fin et le calendrier des treize dernières semaines.",
    target: zoneTarget("project"),
    gesture: "panel",
    expectPanel: "project",
  },
];

export const TRACKS: Record<"create" | "stitch", CoachStep[]> = { create: CREATE, stitch: STITCH };

/* ------------------------------------------------------------------ */
/* Connaissance                                                        */
/* ------------------------------------------------------------------ */

export interface KnowledgeEntry {
  id: string;
  /** La question telle qu'elle s'affiche quand on la propose. */
  ask: string;
  /** Mots et locutions reconnus, en minuscules et sans accent. */
  keys: string[];
  answer: string;
  /** Ce qu'il faut retenir, en une phrase. */
  memo: string;
  target: CoachTarget;
  /** Entrées voisines, proposées en fin de réponse. */
  also?: string[];
}

export const KNOWLEDGE: KnowledgeEntry[] = [
  /* ---- Outils de création ---- */
  {
    id: "cross",
    ask: "À quoi sert le point de croix ?",
    keys: ["croix", "point de croix", "cross", "x"],
    answer: "Une case, un point complet : deux diagonales qui se croisent. C'est l'outil X, le premier du dock en mode Créer. Tout ce que l'atelier compte — métrage, écheveaux, avancement — part de ces cases.",
    memo: "X : une case = un point de croix complet.",
    target: toolTarget("cross"),
    also: ["half", "consumption"],
  },
  {
    id: "half",
    ask: "Comment poser un demi-point ?",
    keys: ["demi", "demi-point", "half", "diagonale"],
    answer: "L'outil D pose une seule diagonale. Le sens est choisi automatiquement pour que les demi-points d'une même zone se suivent dans le même sens ; le réglage « Sens des demi-points », dans le panneau Projet, permet d'imposer le sens avant ou arrière.",
    memo: "D : une diagonale, sens automatique ou imposé.",
    target: toolTarget("half"),
    also: ["quarter", "threeQuarter"],
  },
  {
    id: "quarter",
    ask: "Que fait le quart de point ?",
    keys: ["quart", "quarter", "fraction"],
    answer: "L'outil Q ne couvre qu'un coin de la case : quatre positions possibles, et c'est l'endroit touché qui décide. Les quarts sont comptés à part dans les totaux et imprimés comme tels.",
    memo: "Q : un coin de case, posé là où vous touchez.",
    target: toolTarget("quarter"),
    also: ["threeQuarter", "petite"],
  },
  {
    id: "threeQuarter",
    ask: "Et le trois-quarts de point ?",
    keys: ["trois quarts", "trois-quarts", "3/4", "threequarter"],
    answer: "L'outil 1 pose un demi-point et un quart ensemble, dans le bon sens. C'est la combinaison la plus courante pour arrondir un contour. Il est dans le groupe « plus » du dock : le guide l'ouvre quand il y pointe.",
    memo: "1 : demi-point + quart, posés d'un geste.",
    target: toolTarget("threeQuarter"),
    also: ["half", "quarter"],
  },
  {
    id: "petite",
    ask: "À quoi sert la petite croix ?",
    keys: ["petite", "petite croix", "petites croix"],
    answer: "L'outil 2 pose une croix réduite sur un quart de case, là où une croix complète serait trop grande : pupilles, points de lumière, détails d'un visage. Elles sont comptées séparément, et imprimées à part dans la table des ornements.",
    memo: "2 : une croix au quart de la case, pour les détails.",
    target: toolTarget("petite"),
    also: ["bead", "ornaments"],
  },
  {
    id: "back",
    ask: "Comment tracer un point arrière ?",
    keys: ["arriere", "point arriere", "back", "contour", "contours"],
    answer: "L'outil R se trace de trou en trou, en glissant : chaque segment est enregistré avec ses coordonnées exactes, qui peuvent tomber entre deux cases. Les points arrière sont comptés en centimètres, pas en cases, et imprimés sur les pages de grille.",
    memo: "R : tracé libre, compté en centimètres.",
    target: toolTarget("back"),
    also: ["long", "knot"],
  },
  {
    id: "long",
    ask: "Qu'est-ce qu'un point lancé ?",
    keys: ["lance", "point lance", "long"],
    answer: "L'outil L tend un fil sur plusieurs cases sans le répéter à chaque case : c'est le point lancé. Sa longueur s'ajoute à la consommation de fil, et il est suivi séparément des points arrière.",
    memo: "L : un fil tendu sur plusieurs cases, compté en longueur.",
    target: toolTarget("long"),
    also: ["back", "consumption"],
  },
  {
    id: "knot",
    ask: "Où se pose un nœud français ?",
    keys: ["noeud", "nœud", "noeud francais", "knot", "french"],
    answer: "L'outil K pose un nœud exactement là où vous touchez, y compris entre deux cases. Les nœuds sont comptés à part, suivis séparément dans le journal de broderie, et imprimés avec renvois dans la table des ornements.",
    memo: "K : un nœud là où vous touchez, compté à part.",
    target: toolTarget("knot"),
    also: ["ornaments", "details"],
  },
  {
    id: "bead",
    ask: "Comment poser une perle ?",
    keys: ["perle", "perles", "bead", "miyuki", "delica"],
    answer: "L'outil 3 pose une perle au centre d'une case. La référence du fabricant se choisit dans la fiche du fil : 1 288 perles Miyuki Delica 11/0 sont proposées au plus proche en CIEDE2000, références arrêtées exclues. Les perles sont comptées à part et imprimées dans une colonne de la légende.",
    memo: "3 : une perle au centre de la case, référence choisie dans la fiche du fil.",
    target: toolTarget("bead"),
    also: ["miyuki", "deltae"],
  },
  {
    id: "fill",
    ask: "Comment remplir une zone ?",
    keys: ["remplir", "remplissage", "fill", "pot", "zone"],
    answer: "L'outil G pose la couleur active sur toute la zone contiguë de même nature, comme un pot de peinture. Avec la symétrie active, le remplissage est reflété — chaque axe tient son propre état d'avancement.",
    memo: "G : toute la zone contiguë d'un geste.",
    target: toolTarget("fill"),
    also: ["symmetry", "erase"],
  },
  {
    id: "erase",
    ask: "Comment effacer ?",
    keys: ["effacer", "gomme", "erase", "supprimer", "retirer"],
    answer: "L'outil E retire ce qui est sous le trait. La gomme est reflétée par la symétrie, puisqu'elle retire du fil : ce qui est effacé d'un côté l'est de l'autre.",
    memo: "E : retire ce qui est sous le trait, symétrie comprise.",
    target: toolTarget("erase"),
    also: ["symmetry", "undo"],
  },
  {
    id: "pick",
    ask: "À quoi sert la pipette ?",
    keys: ["pipette", "pick", "prelever", "échantillon"],
    answer: "L'outil I reprend la couleur posée sous le pointeur et en fait le fil actif. Utile pour retrouver un code sans parcourir le rail.",
    memo: "I : le fil sous le pointeur devient le fil actif.",
    target: toolTarget("pick"),
    also: ["floss"],
  },
  {
    id: "select",
    ask: "Que peut-on faire d'une sélection ?",
    keys: ["selection", "sélection", "copier", "coller", "pivoter", "retourner", "lasso", "deplacer", "move"],
    answer: "La sélection rectangulaire (S), le lasso (7) et le déplacement (8) permettent de copier, couper, coller, déplacer, pivoter et retourner une zone. Un 4 × 1 pivoté devient un 1 × 4, case par case. Le presse-papier reste interne au projet.",
    memo: "S, 7, 8 : copier, déplacer, pivoter, retourner une zone.",
    target: toolTarget("select"),
    also: ["shapes", "undo"],
  },
  {
    id: "shapes",
    ask: "Existe-t-il des formes toutes faites ?",
    keys: ["forme", "formes", "ligne", "rectangle", "ellipse", "cercle", "droite"],
    answer: "Ligne de croix (4), rectangle (5) et ellipse (6) se tracent à la volée et se posent au relâchement. Avec la symétrie, le reflet se fait une fois, au relâchement — pas échantillon par échantillon.",
    memo: "4, 5, 6 : tracées à la volée, posées au relâchement.",
    target: toolTarget("line"),
    also: ["symmetry", "text"],
  },
  {
    id: "text",
    ask: "Peut-on écrire du texte sur la grille ?",
    keys: ["texte", "ecrire", "écrire", "lettre", "alphabet", "mot", "chiffre"],
    answer: "Oui, un alphabet compté en 5 × 7 : chaque lettre est dessinée en cases, pas en pixels, donc elle se brode réellement. Le texte se pose depuis le panneau Projet, avec une échelle.",
    memo: "Alphabet compté 5 × 7, posé depuis le panneau Projet.",
    target: zoneTarget("project"),
    also: ["shapes"],
  },
  {
    id: "hand",
    ask: "Comment se déplacer dans la grille ?",
    keys: ["deplacer la vue", "main", "hand", "zoom", "naviguer", "molette"],
    answer: "L'outil V déplace la vue sans rien poser. Les flèches parcourent la grille, + et − zooment, et le réglage « Dessiner au stylet uniquement » réserve le doigt au déplacement : le stylet pose le fil, le doigt ne pose plus rien.",
    memo: "V : la vue, sans poser de fil. Stylet seul = le doigt ne dessine plus.",
    target: toolTarget("hand"),
    also: ["accessibility", "shortcuts"],
  },

  /* ---- Outils de broderie ---- */
  {
    id: "mark",
    ask: "Comment marquer ce qui est brodé ?",
    keys: ["marquer", "surligner", "avancement", "cocher", "fait", "brodé", "brode", "mark"],
    answer: "En mode Broder, l'outil M coche les cases terminées. Il ne modifie jamais le dessin : l'avancement est une couche à part, qu'on peut démarquer. C'est cette couche qui alimente le métrage restant et l'estimation de fin.",
    memo: "M : coche l'avancement sans toucher au patron.",
    target: toolTarget("mark"),
    also: ["block", "sessions"],
  },
  {
    id: "block",
    ask: "Comment suivre un bloc ou une ligne ?",
    keys: ["bloc", "blocs", "10", "ligne", "row", "suivi", "block"],
    answer: "L'outil B coche un bloc de 10 × 10 d'un geste, l'outil H une ligne entière. De quoi avancer sans compter les cases, en gardant la place exacte où vous en êtes.",
    memo: "B : un bloc 10 × 10. H : une ligne entière.",
    target: toolTarget("block"),
    also: ["mark", "row"],
  },
  {
    id: "row",
    ask: "Existe-t-il un suivi ligne par ligne ?",
    keys: ["ligne par ligne", "rangee", "rangée", "row", "ligne"],
    answer: "Oui, l'outil H en mode Broder : il suit la ligne courante et la coche. Combiné au bloc 10 × 10, c'est la façon la plus sûre de ne pas perdre sa place sur un grand patron.",
    memo: "H : la ligne courante, cochée d'un geste.",
    target: toolTarget("row"),
    also: ["block", "mark"],
  },
  {
    id: "park",
    ask: "À quoi sert le parking de fil ?",
    keys: ["parking", "garer", "parquer", "park", "coin"],
    answer: "L'outil P gare un fil dans le coin d'une case : le fil attend là, sans couper ni rentrer, et l'atelier se souvient de l'emplacement. Utile quand plusieurs couleurs se croisent dans une même zone.",
    memo: "P : le fil attend dans un coin de case, l'atelier s'en souvient.",
    target: toolTarget("park"),
    also: ["mark", "mistakes"],
  },
  {
    id: "mistakes",
    ask: "Comment signaler une erreur à défaire ?",
    keys: ["erreur", "erreurs", "defaire", "défaire", "unpick", "demont", "rate"],
    answer: "L'outil U marque une case à défaire sans effacer le patron : la marque reste visible jusqu'à réparation, et les erreurs sont comptées séparément de l'avancement. Rien n'est perdu, rien n'est oublié.",
    memo: "U : marque à défaire, sans effacer le dessin.",
    target: toolTarget("unpick"),
    also: ["mark", "details"],
  },
  {
    id: "details",
    ask: "Comment cocher un contour ou un ornement ?",
    keys: ["contour", "ornement", "ornements", "details", "détails", "cocher"],
    answer: "L'outil J coche les éléments suivis séparément : points arrière, points lancés, nœuds, petites croix, perles. Ces ornements ont leur propre table dans le PDF, avec renvois numérotés.",
    memo: "J : coche arrières, lancés, nœuds, petites croix et perles.",
    target: toolTarget("details"),
    also: ["ornaments", "mark"],
  },
  {
    id: "note",
    ask: "Peut-on annoter la grille ?",
    keys: ["note", "notes", "annotation", "annotations", "ecrire sur la grille", "commentaire"],
    answer: "L'outil 9 épingle une note sur la grille. Les annotations sont imprimées avec renvois numérotés, et elles ne sont pas reflétées par la symétrie : une annotation décrit ce que vous voyez, elle ne pose pas de fil.",
    memo: "9 : une note épinglée, imprimée avec renvois.",
    target: toolTarget("note"),
    also: ["symmetry", "exportpdf"],
  },
  {
    id: "ornaments",
    ask: "Que contient la table des ornements ?",
    keys: ["ornements", "table des ornements", "speciaux", "spéciaux"],
    answer: "Le PDF publie une table des contours et ornements : points arrière, points lancés, nœuds, petites croix et perles, avec leurs positions. Elle n'est pas imprimée quand le motif n'en contient aucun — pas de page vide.",
    memo: "Arrières, lancés, nœuds, petites croix, perles : une table à part dans le PDF.",
    target: zoneTarget("export"),
    also: ["exportpdf", "details"],
  },

  /* ---- Couleur, fils, toile ---- */
  {
    id: "floss",
    ask: "Où sont les fils et leurs codes ?",
    keys: ["fil", "fils", "rail", "palette", "dmc", "code", "codes", "couleur", "couleurs", "mouliné", "mouline"],
    answer: "Le rail des fils reste contre le patron, en bas. Chaque entrée garde son code DMC, son nom, son symbole, son avancement et sa fiche : besoins, écheveaux entiers, mètres partiels, lot de teinture, références de perle et mélanges. Les 489 références du Mouliné Spécial art. 117 sont connues.",
    memo: "489 références DMC, chacune avec sa fiche et son avancement.",
    target: zoneTarget("floss"),
    also: ["blends", "stock", "deltae"],
  },
  {
    id: "blends",
    ask: "Comment faire un mélange de deux fils ?",
    keys: ["melange", "mélange", "melanges", "deux fils", "2 fils", "brins", "mix"],
    answer: "Dans le panneau Projet, choisissez deux codes et le nombre de brins de chacun. L'atelier enregistre le mélange sous un code composé — par exemple mix:321/1+Blanc/2 — et le traite comme une couleur à part entière : symbole propre, consommation propre, ligne propre dans la légende. La limite est de 6 brins au total.",
    memo: "Deux codes + les brins : un mélange devient une couleur à part entière.",
    target: zoneTarget("project"),
    also: ["floss", "consumption"],
  },
  {
    id: "substitute",
    ask: "Comment remplacer un fil qu'on n'a pas ?",
    keys: ["remplacer", "substituer", "substitution", "equivalent", "équivalent", "introuvable", "rupture"],
    answer: "La fiche d'un fil propose ses trois substitutions les plus proches, par écart perceptuel croissant, avec le ΔE00 et un libellé : identique à l'œil, très proche, proche, teinte approchée, teinte différente. Les mélanges enregistrés sont exclus des propositions — on ne remplace pas une recette par une recette.",
    memo: "Trois propositions classées par écart perçu, jamais une recette à la place d'une recette.",
    target: zoneTarget("floss"),
    also: ["deltae", "brands"],
  },
  {
    id: "deltae",
    ask: "Que veut dire ΔE00, ou delta E ?",
    keys: ["delta", "deltae", "e00", "de00", "ecart", "écart", "ciede", "ciede2000", "difference de couleur"],
    answer: "ΔE00 mesure l'écart entre deux couleurs tel que l'œil le perçoit, selon la formule CIEDE2000. Moins de 1 : identique à l'œil. Moins de 3 : très proche. Moins de 6 : proche. Moins de 12 : teinte approchée. Au-delà : teinte différente, à choisir à la main. C'est la même échelle pour les fils et pour les perles.",
    memo: "1 identique, 3 très proche, 6 proche, 12 approchée, au-delà différente.",
    target: zoneTarget("floss"),
    also: ["substitute", "miyuki", "honesty"],
  },
  {
    id: "miyuki",
    ask: "D'où viennent les couleurs des perles ?",
    keys: ["miyuki", "delica", "perle", "perles", "mesure", "mesurée"],
    answer: "1 288 références Miyuki Delica 11/0, mesurées sur les photos produit officielles : la valeur est la moyenne sRGB d'une image 400 × 400, pas un relevé spectrophotométrique. Le code est le bon, la teinte est approchée — l'écart médian va de 6 à 12 ΔE00 selon les familles. Les métallisées, galvano, AB et doublées argent ne peuvent pas être rendues par un aplat. Miyuki ne publie pas de noms de couleur.",
    memo: "La bonne perle, une teinte approchée : moyenne d'une photo, pas un relevé.",
    target: zoneTarget("floss"),
    also: ["bead", "deltae", "honesty"],
  },
  {
    id: "brands",
    ask: "Peut-on broder avec une autre marque ?",
    keys: ["marque", "marques", "autre marque", "perler", "hama", "artkal", "mard", "nabbi", "diamant", "diamond", "correspondance", "correspondances", "equivalence", "équivalence"],
    answer: "Le motif reste en DMC — c'est sa langue. L'export calcule pour chacun de vos fils les références les plus proches d'une autre marque : diamant DMC (154), Perler Midi (103), Hama Midi (92), Artkal S (199), MARD 291, Nabbi (30). La table s'affiche, se télécharge en CSV et s'imprime dans le PDF. Quand la marque numérote comme DMC, l'appariement est signalé « même code » au lieu d'être présenté comme une approximation. Une table de 103 couleurs ne rend pas 489 nuances : au-delà de 12 ΔE, choisissez à la main.",
    memo: "Le motif ne change pas de langue : une table de correspondance, avec ses écarts.",
    target: zoneTarget("export"),
    also: ["deltae", "licences", "substitute"],
  },
  {
    id: "licences",
    ask: "Quelle est la licence des données couleur ?",
    keys: ["licence", "licences", "attribution", "credit", "crédit", "cc by", "mit", "droits des données"],
    answer: "Elles ne sont pas toutes les mêmes, et l'atelier affiche celle de la table réellement employée. Les tables mesurées ou recoupées par MakeBead (DMC, Miyuki, diamant, MARD) sont en CC BY 4.0 ; les tables de perles à repasser Perler, Hama, Artkal et Nabbi viennent de maxcleme/beadcolors sous MIT. Le code est MIT. Ces mentions figurent dans l'interface, dans chaque export et dans le fichier LICENSE.",
    memo: "CC BY 4.0 pour les mesures MakeBead, MIT pour Perler, Hama, Artkal et Nabbi.",
    target: zoneTarget("project"),
    also: ["brands", "provenance", "honesty"],
  },
  {
    id: "fabric",
    ask: "Comment régler la toile et la taille finie ?",
    keys: ["toile", "aida", "aïda", "lin", "linen", "evenweave", "compte", "count", "taille finie", "pouce", "cm", "unites", "unités", "marge", "marges"],
    answer: "Le compte de la toile et le nombre de fils traversés déterminent la taille finie : un lin 28 brodé sur 2 fils correspond à 14 points par pouce, exactement comme une aïda 14. Les marges et les unités (cm ou pouces) se règlent dans le panneau Projet, avant de couper la toile.",
    memo: "Lin 28 sur 2 fils = aïda 14. Marges et unités avant de couper.",
    target: zoneTarget("project"),
    also: ["consumption", "exportpdf"],
  },
  {
    id: "consumption",
    ask: "Comment est calculé le métrage de fil ?",
    keys: ["metrage", "métrage", "consommation", "echeveau", "écheveau", "echeveaux", "longueur de fil", "combien de fil", "skein"],
    answer: "Le calcul part du compte de la toile, du nombre de brins, et d'une longueur par type de point — croix, demi, quart, arrière, lancé, nœud — avec une marge de gaspillage. Un écheveau DMC fait 8 m par brin, soit 48 m à six brins. C'est un ordre de grandeur pour préparer l'achat, jamais une mesure de votre tension : une main serrée consomme autrement.",
    memo: "Estimation à partir de la toile et des brins, pas une mesure de votre tension.",
    target: zoneTarget("floss"),
    also: ["fabric", "stock", "honesty"],
  },
  {
    id: "stock",
    ask: "Comment suivre mon stock et ma liste de courses ?",
    keys: ["stock", "inventaire", "courses", "liste de courses", "acheter", "lot", "bain", "teinture"],
    answer: "La fiche d'un fil déclare ce que vous avez : écheveaux entiers, mètres partiels, lot de teinture. La liste de courses en déduit ce qui manque pour le motif. Le lot compte vraiment : deux bains d'une même référence peuvent différer visiblement, et l'atelier les conserve séparément.",
    memo: "Écheveaux entiers, mètres partiels et lot : la liste de courses en découle.",
    target: zoneTarget("project"),
    also: ["floss", "consumption"],
  },

  /* ---- Projet, import, export ---- */
  {
    id: "importpdf",
    ask: "Peut-on importer un patron PDF du commerce ?",
    keys: ["import", "importer", "pdf", "patron", "grille du commerce", "symboles", "calibrer"],
    answer: "Oui. Le PDF est lu en vectoriel : symboles, légende par lignes, axes, ordre des pages. Vous calibrez les quatre coins et les dimensions, puis vous vérifiez les groupes détectés contre la légende d'origine — l'atelier ne devine pas en silence. Si la page n'est qu'une image, un secours par blocs calés et tableau magnétique de recollement existe. Un patron acheté reste soumis aux droits de sa créatrice : l'import ne transfère aucun droit de redistribution.",
    memo: "Lecture vectorielle, calibration par vous, droits de la créatrice inchangés.",
    target: zoneTarget("project"),
    also: ["importphoto", "provenance", "symbols"],
  },
  {
    id: "importphoto",
    ask: "Comment transformer une photo en patron ?",
    keys: ["photo", "image", "convertir", "conversion", "generer", "générer", "illustration", "prompt"],
    answer: "Une photo passe par une conversion : réduction à la taille voulue, trame de Floyd–Steinberg, puis quantification vers les 489 références DMC. Le nombre de couleurs se règle avant de convertir — moins de couleurs, plus de fil disponible. Une illustration peut aussi être générée depuis un texte, et c'est la seule requête réseau sortante de l'atelier.",
    memo: "Réduction, trame, quantification DMC : le nombre de couleurs se règle avant.",
    target: zoneTarget("project"),
    also: ["floss", "offline"],
  },
  {
    id: "exportpdf",
    ask: "Que contient le PDF exporté ?",
    keys: ["pdf", "export", "exporter", "imprimer", "impression", "pages", "paginé", "a4", "letter"],
    answer: "Une couverture avec les spécifications, une règle de 10 cm à mesurer pour vérifier l'échelle, la légende des fils avec symboles et consommation, la table des ornements s'il y en a, les correspondances multi-marques si vous les avez demandées, l'index des pages, puis la grille paginée en blocs de 40 cases avec bandes grisées de chevauchement pour caler les feuilles avant collage. Imprimez à 100 %, sans ajustement à la page : c'est à ça que sert la règle.",
    memo: "Paginé en blocs de 40 cases, avec règle d'échelle à mesurer.",
    target: zoneTarget("export"),
    also: ["scale", "formats", "ornaments"],
  },
  {
    id: "scale",
    ask: "Comment être sûr de l'échelle à l'impression ?",
    keys: ["échelle", "echelle", "regle", "règle", "10 cm", "calibrage", "calibration", "ajuster"],
    answer: "Le PDF imprime une règle de 10 cm en couverture. Mesurez-la : si elle ne fait pas exactement 10 cm, l'imprimante redimensionne — réglez l'échelle sur 100 % et désactivez l'ajustement à la page. Le logiciel ne peut pas connaître le réglage de votre imprimante ; il donne de quoi le contrôler. La taille de case annoncée est celle réellement calculée pour votre motif.",
    memo: "Mesurez la règle imprimée : 10 cm, sinon échelle 100 % sans ajustement.",
    target: zoneTarget("export"),
    also: ["exportpdf", "honesty"],
  },
  {
    id: "formats",
    ask: "Quels formats d'export existent ?",
    keys: ["format", "formats", "svg", "png", "csv", "json", "oxs", "sauvegarde", "exporter"],
    answer: "PDF paginé (A4 ou Letter, couleur ou noir et blanc), SVG vectoriel, PNG, CSV des totaux, JSON du projet complet, et OXS pour un autre logiciel. Le JSON est le seul format fidèle : il conserve l'avancement, les calques, le journal, le stock et les mélanges. OXS transporte un dessin, pas un chantier — le contrat exact est écrit dans docs/OXS-EXTENSION.md.",
    memo: "JSON pour tout garder, OXS pour montrer un dessin à un autre logiciel.",
    target: zoneTarget("export"),
    also: ["exportpdf", "oxs", "library"],
  },
  {
    id: "oxs",
    ask: "Que perd-on en exportant en OXS ?",
    keys: ["oxs", "perdre", "perdu", "aller-retour", "roundtrip", "échange"],
    answer: "Le cœur portable passe : dimensions, palette, croix, demi-points, points arrière et lancés, symboles. Une extension ajoute quarts, petites croix, perles, nœuds et références de perle. Ce qui ne passe pas : avancement, calques (le motif est fusionné), journal, stock, erreurs, stationnement, annotations, et la recette des mélanges — un mélange revient comme le fil plein le plus proche. Le JSON reste la sauvegarde.",
    memo: "OXS transporte un dessin ; le JSON transporte le chantier.",
    target: zoneTarget("export"),
    also: ["formats", "blends"],
  },
  {
    id: "layers",
    ask: "Comment fonctionnent les calques ?",
    keys: ["calque", "calques", "layer", "layers", "masquer", "visible"],
    answer: "Chaque calque garde un instantané du motif. Ce qui est masqué n'est ni affiché, ni exporté, ni imprimé : l'export et le PDF composent les calques visibles avant de travailler. Les correspondances multi-marques sont calculées sur le motif fusionné, pour ne pas donner de référence à un fil qui n'apparaît pas.",
    memo: "Masqué = absent de l'écran, de l'export et du PDF.",
    target: zoneTarget("project"),
    also: ["formats", "brands"],
  },
  {
    id: "symbols",
    ask: "Peut-on changer les symboles ?",
    keys: ["symbole", "symboles", "glyph", "glyphes", "504"],
    answer: "504 symboles vectoriels, structurellement distincts, dessinés à l'identique sur l'écran, en PDF et en SVG. Vous pouvez réaffecter le symbole d'un fil : la légende, la grille, l'OXS et le SVG suivent, parce qu'une seule définition sert aux trois rendus. Au-delà de 90 000 cases, le SVG omet les symboles et le dit dans la légende.",
    memo: "Une seule définition, trois rendus identiques ; réaffectable fil par fil.",
    target: zoneTarget("floss"),
    also: ["formats", "exportpdf"],
  },
  {
    id: "library",
    ask: "Où sont mes projets et mes versions ?",
    keys: ["bibliothèque", "bibliotheque", "versions", "projets", "sauvegarder", "sauvegarde", "archive"],
    answer: "La bibliothèque garde des versions localement, dans le navigateur. Le fichier JSON exporté reste la vraie sauvegarde : effacer les données du navigateur supprime les projets. Un ancien fichier sans table de codes fiable est refusé plutôt que deviné, et son contenu brut est mis de côté.",
    memo: "Versions locales, sauvegarde réelle = le JSON exporté.",
    target: zoneTarget("project"),
    also: ["formats", "offline"],
  },
  {
    id: "share",
    ask: "Comment montrer mon écran en direct ?",
    keys: ["partage", "partager", "direct", "live", "lecture partagée", "webrtc", "distance", "atelier partagé"],
    answer: "La lecture partagée envoie le motif en pair à pair, chiffré par le canal de données. L'invitation s'échange par copier-coller d'un code, sans serveur d'application ; un serveur STUN public (Google) aide seulement les deux appareils à trouver le chemin. L'autre écran suit en lecture seule : il ne peut pas modifier votre projet.",
    memo: "Pair à pair chiffré, invitation par copier-coller, lecture seule en face.",
    target: zoneTarget("project"),
    also: ["offline", "library"],
  },
  {
    id: "sessions",
    ask: "Comment sont comptées mes sessions ?",
    keys: ["session", "sessions", "journal", "temps", "vitesse", "eta", "estimation", "calendrier", "série", "serie"],
    answer: "Le temps est compté quand l'atelier est visible, en mode Broder. Le journal donne la vitesse réelle en cases par minute, l'estimation de fin qui en découle, les séries de jours, et le calendrier d'activité des treize dernières semaines. Les intensités du calendrier sont relatives à votre meilleure journée affichée, pas à une vitesse absolue : un mois pâle peut être un mois régulier à vingt cases.",
    memo: "Votre vitesse réelle, pas une moyenne théorique ; calendrier relatif à votre meilleur jour.",
    target: zoneTarget("project"),
    also: ["mark", "honesty"],
  },
  {
    id: "provenance",
    ask: "Que devient l'origine d'un motif importé ?",
    keys: ["provenance", "origine", "auteur", "droits", "licence du motif", "personnel"],
    answer: "Chaque motif garde sa provenance : original, image, PDF importé, OXS ou démonstration, avec l'auteur, la licence et l'usage personnel par défaut. Elle est imprimée en couverture du PDF. Un patron reçu d'ailleurs n'est jamais présenté comme une création de l'atelier, et l'import ne transfère aucun droit.",
    memo: "Origine, auteur, licence et usage personnel voyagent avec le motif.",
    target: zoneTarget("project"),
    also: ["importpdf", "licences"],
  },

  /* ---- Atelier ---- */
  {
    id: "symmetry",
    ask: "Comment activer la symétrie ?",
    keys: ["symetrie", "symétrie", "miroir", "mirror", "axes", "reflet"],
    answer: "Dans le panneau Projet : miroir horizontal, vertical, ou les deux. La symétrie reflète ce qui pose du fil — croix, fractions, perles, gomme, remplissage, nœuds, points arrière, et les formes au relâchement. Elle ne reflète pas ce qui suit l'avancement : surlignage, blocs, lignes, parking, erreurs, notes, sélection, déplacement. Refléter ces marques ferait mentir le suivi.",
    memo: "Elle reflète ce qui pose du fil, pas ce qui suit l'avancement.",
    target: zoneTarget("project"),
    also: ["shapes", "fill"],
  },
  {
    id: "undo",
    ask: "Jusqu'où remonte l'annulation ?",
    keys: ["annuler", "annulation", "undo", "retablir", "rétablir", "redo", "historique"],
    answer: "L'annulation se fait par trait de stylet : un geste, une entrée, quelle que soit sa longueur. Cmd ou Ctrl+Z annule, Maj+Z rétablit. La profondeur d'historique tient compte de la mémoire disponible — sur un très grand motif, elle se réduit plutôt que de saturer l'appareil.",
    memo: "Un geste = une annulation, profondeur adaptée à la mémoire.",
    target: zoneTarget("tools"),
    also: ["shortcuts", "performance"],
  },
  {
    id: "shortcuts",
    ask: "Quels sont les raccourcis clavier ?",
    keys: ["raccourci", "raccourcis", "clavier", "touches", "shortcut"],
    answer: "V déplacer · X croix · D demi-point · Q quart · R arrière · K nœud · L lancé · I pipette · G remplissage · E gomme · M surligner · S sélection · B bloc · H ligne · P parking · U à défaire · J ornements, et les chiffres 1 à 9 pour les outils du groupe « plus » : trois-quarts, petite croix, perle, ligne, rectangle, ellipse, lasso, déplacement, note. Flèches pour parcourir, Entrée pour utiliser l'outil, + et − pour zoomer.",
    memo: "Une lettre par outil, chiffres 1 à 9 pour le groupe « plus ».",
    target: zoneTarget("tools"),
    also: ["hand", "accessibility"],
  },
  {
    id: "accessibility",
    ask: "Quels réglages de confort existent ?",
    keys: ["accessibilité", "accessibilite", "confort", "contraste", "grand texte", "texte", "stylet", "animations", "reduire", "lecteur d'écran", "voix"],
    answer: "Grille à contraste élevé, texte plus grand, dessin au stylet uniquement (le doigt ne pose plus de fil), écran gardé éveillé en brodant, fil actif seul affiché. L'atelier annonce la case courante aux lecteurs d'écran, garde des cibles tactiles d'au moins 44 px, piège le focus dans les panneaux et le rend à son point de départ, et respecte « réduire les animations » du système — le pulse de ce guide compris.",
    memo: "Contraste, grand texte, stylet seul, annonce de case, mouvements réduits respectés.",
    target: zoneTarget("project"),
    also: ["hand", "guide"],
  },
  {
    id: "offline",
    ask: "L'atelier fonctionne-t-il hors ligne ?",
    keys: ["hors ligne", "offline", "réseau", "reseau", "internet", "donnees", "données", "confidentialité", "confidentialite", "compte", "abonnement", "analytique", "publicité"],
    answer: "Oui. Il n'y a pas de compte, pas d'abonnement, pas d'analytique, pas de publicité : les projets, le stock et les versions restent dans le navigateur, et un service worker sert l'application sans connexion. La seule requête sortante est la génération d'illustration depuis un texte, si vous l'utilisez. Contrepartie à connaître : effacer les données du navigateur supprime les projets, d'où l'export JSON.",
    memo: "Tout est local ; une seule requête sortante, la génération d'image.",
    target: zoneTarget("project"),
    also: ["library", "importphoto", "share"],
  },
  {
    id: "performance",
    ask: "Pourquoi ça ralentit sur un grand motif ?",
    keys: ["ralentir", "lent", "performance", "lag", "grand motif", "1000", "mémoire", "memoire"],
    answer: "Pendant un trait, le rendu recompose les calques à chaque image : le brouillon mute en place, une composition mémorisée afficherait l'image d'avant. C'est le coût d'un dessin juste. Au repos tout est mémorisé, les instantanés de calques sont mis en cache, et l'annulation ne clone plus le motif à chaque échantillon. Sur un 1 000 × 1 000, un 300 × 300 reste plus agréable — et un motif plus grand se dessine par zones.",
    memo: "Le coût est pendant le trait ; au repos, tout est mémorisé.",
    target: zoneTarget("canvas"),
    also: ["undo", "layers"],
  },
  {
    id: "honesty",
    ask: "Qu'est-ce que l'atelier refuse de promettre ?",
    keys: ["honnête", "honnete", "limite", "limites", "fidélité", "fidelite", "approximation", "garantie", "promesse"],
    answer: "Quatre choses, écrites au lieu d'être lissées. Les teintes à l'écran ne valent pas une carte physique du fabricant : la référence reste le carton. Les valeurs de perles viennent d'une photo, pas d'un spectrophotomètre. Le métrage est une estimation, pas la mesure de votre tension. Et une table de 103 couleurs ne rend pas 489 nuances — au-delà de 12 ΔE, c'est à choisir à la main. L'atelier refuse aussi d'inventer une valeur DMC manquante.",
    memo: "Écran ≠ carte physique, photo ≠ relevé, estimation ≠ mesure, 103 ≠ 489.",
    target: zoneTarget("floss"),
    also: ["deltae", "miyuki", "consumption", "scale"],
  },
  {
    id: "guide",
    ask: "Comment retrouver ou arrêter ce guide ?",
    keys: ["guide", "aide", "coach", "visite", "recommencer", "arreter", "arrêter", "rejouer", "question", "assistant"],
    answer: "Le guide démarre seul à la première ouverture de l'atelier, puis reste accessible depuis le bouton boussole de la barre du haut, ou depuis ce champ de saisie : posez une question en français, la réponse s'affiche avec un mémo et le pictogramme concerné pulse. « Passer » saute une étape, « Terminer » ferme le guide — il ne se relancera pas tout seul, mais le bouton reste. Ce guide répond depuis une base écrite dans l'atelier, hors ligne : hors de ce logiciel, il dit qu'il ne sait pas.",
    memo: "Boussole en haut pour rejouer ; ce champ pour questionner ; « Terminer » pour fermer.",
    target: zoneTarget("tools"),
    also: ["shortcuts", "accessibility"],
  },
];

/** Quelques entrées proposées quand la question ne trouve pas de réponse. */
export const STARTERS = ["honesty", "brands", "exportpdf", "symmetry", "shortcuts"] as const;

/* ------------------------------------------------------------------ */
/* Recherche                                                           */
/* ------------------------------------------------------------------ */

export interface AnswerHit {
  entry: KnowledgeEntry;
  score: number;
}

/** Minuscules, sans accent, sans ponctuation : « À défaire » et « a defaire » se ressemblent. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function entryById(id: string): KnowledgeEntry | undefined {
  return KNOWLEDGE.find((e) => e.id === id);
}

/**
 * Réponse à une question en français courant.
 *
 * Le score distingue trois niveaux : une locution entière trouvée dans la
 * question (le plus fiable), un mot exact, puis une racine de plus de quatre
 * lettres. Sans aucun point, aucune entrée n'est renvoyée : mieux vaut dire
 * « je ne sais pas » que d'afficher un outil qui n'a rien à voir — un guide qui
 * répond à côté apprend à ne plus lui faire confiance.
 */
/**
 * Score minimal pour répondre.
 *
 * Un mot isolé et générique ne suffit pas : « quel temps fera-t-il demain »
 * contient « temps », qui est bien le temps passé à broder, et le guide
 * partirait expliquer le journal de bord. Il faut une locution entière, deux
 * mots reconnus, ou un mot reconnu **et** repris par la question telle que la
 * base la formule. Autrement dit : assez de signal pour ne pas répondre à côté.
 */
const MIN_SCORE = 2.5;

export function answerQuery(query: string, limit = 3): AnswerHit[] {
  const text = normalize(query);
  if (!text) return [];
  const words = new Set(text.split(" "));
  const hits: AnswerHit[] = [];
  for (const entry of KNOWLEDGE) {
    let score = 0;
    for (const key of entry.keys) {
      const n = normalize(key);
      if (!n) continue;
      if (n.includes(" ")) {
        if (text.includes(n)) score += 3;
      } else if (words.has(n)) {
        score += 2;
      } else if (n.length > 4 && text.includes(n)) {
        score += 1;
      }
    }
    const ask = normalize(entry.ask);
    if (ask && text.includes(ask)) score += 4;
    /* La question formulée dans la base départage deux entrées à égalité :
       « garer un fil » touche le parking, pas la fiche des fils, même si le mot
       « fil » est dans les deux. Sans ça, un mot générique suffit à répondre à
       côté — exactement ce qu'un guide ne doit pas faire. */
    if (score > 0 && ask) {
      const askWords = new Set(ask.split(" ").filter((w) => w.length > 1));
      for (const w of words) if (askWords.has(w)) score += 0.5;
    }
    if (score >= MIN_SCORE) hits.push({ entry, score });
  }
  return hits
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, Math.max(1, limit));
}

/* ------------------------------------------------------------------ */
/* Progression                                                         */
/* ------------------------------------------------------------------ */

export interface CoachProgress {
  /** Piste suivie : le geste en cours, pas une préférence définitive. */
  track: "create" | "stitch";
  /** Étape courante, ou null si le guide est terminé. */
  stepId: string | null;
  /** Étapes validées par un geste réel. */
  done: string[];
  /** Le guide a déjà été vu au moins une fois : il ne se relance plus seul. */
  seen: boolean;
  /** L'utilisateur l'a fermé : ne plus le proposer automatiquement. */
  dismissed: boolean;
}

/** Clé de stockage de la progression. Exportée pour que les tests la vérifient. */
export const COACH_STORAGE_KEY = "point-zero:coach";
const KEY = COACH_STORAGE_KEY;

export const EMPTY_PROGRESS: CoachProgress = { track: "create", stepId: null, done: [], seen: false, dismissed: false };

function asProgress(value: unknown): CoachProgress | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<CoachProgress>;
  const track = raw.track === "stitch" ? "stitch" : raw.track === "create" ? "create" : null;
  if (!track) return null;
  const known = new Set(TRACKS[track].map((s) => s.id));
  const stepId = typeof raw.stepId === "string" && known.has(raw.stepId) ? raw.stepId : null;
  const done = Array.isArray(raw.done) ? raw.done.filter((d): d is string => typeof d === "string" && known.has(d)) : [];
  return { track, stepId, done, seen: raw.seen === true, dismissed: raw.dismissed === true };
}

/**
 * Progression enregistrée.
 *
 * Un contenu illisible, ou écrit par une version antérieure dont les étapes ont
 * changé, retombe sur l'état initial : un guide ne doit jamais planter
 * l'atelier, ni reprendre une étape qui n'existe plus.
 */
export function loadCoach(storage: Pick<Storage, "getItem"> | null = safeLocal()): CoachProgress {
  if (!storage) return { ...EMPTY_PROGRESS };
  try {
    return asProgress(JSON.parse(storage.getItem(KEY) ?? "null")) ?? { ...EMPTY_PROGRESS };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveCoach(progress: CoachProgress, storage: Pick<Storage, "setItem"> | null = safeLocal()): void {
  if (!storage) return;
  try {
    if(storage===safeLocal())writeStoredJSON(KEY,JSON.stringify(progress),asProgress);
    else storage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* Navigation privée ou quota saturé : le guide continue sans se souvenir. */
  }
}

function safeLocal(): Storage | null {
  try {
    const probe = "point-zero:probe";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * L'étape à montrer pour la piste en cours.
 *
 * La piste suit le geste : on ne guide pas « Broder » pendant qu'on crée. Un
 * identifiant qui n'appartient pas à la piste — projet repris après un
 * changement d'atelier, étapes modifiées entre deux versions — retombe sur la
 * première étape non validée. `null` signifie « parcours terminé » : le champ de
 * questions reste, le pas à pas s'arrête.
 */
export function resolveStep(progress: CoachProgress, track: "create" | "stitch"): CoachStep | null {
  const steps = TRACKS[track];
  const found = steps.find((s) => s.id === progress.stepId);
  if (found) return found;
  if (progress.stepId === null && progress.seen) return null;
  return steps.find((s) => !progress.done.includes(s.id)) ?? null;
}

export function stepIndex(track: "create" | "stitch", stepId: string | null): number {
  return Math.max(0, TRACKS[track].findIndex((s) => s.id === stepId));
}

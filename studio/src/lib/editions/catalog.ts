/**
 * Point Zéro · Éditions — les patrons du catalogue (24 premiers, puis les 8 oiseaux botaniques).
 * Les dimensions et plafonds de couleurs sont ceux annoncés dans la boutique ;
 * chaque dessin (voir drawings/) doit les respecter, ce que vérifient les tests.
 */
export type Collection = "Félins" | "Oiseaux" | "Céleste" | "Objets & Maison" | "Monogrammes" | "Signature" | "Oiseaux botaniques";
export type Level = "Débutant" | "Intermédiaire" | "Expert";
export interface EditionProduct {
  id: string;
  title: string;
  collection: Collection;
  level: Level;
  width: number;
  height: number;
  maxColors: number;
  price: number;
  description: string;
}

const definitions: { collection: Collection; level: Level; base: number; items: [string, string][] }[] = [
  { collection: "Félins", level: "Intermédiaire", base: 690, items: [
    ["Le chat à la fenêtre", "Un chat de dos, assis sur le rebord, regarde la nuit tomber derrière une fenêtre en arche."],
    ["Chat noir, nuit claire", "Un chat noir endormi dans le creux d’un croissant de lune, entouré d’étoiles."],
    ["Le félin de velours", "Portrait de face d’un chat tigré aux yeux verts, tout en nuances de fauve."],
    ["Deux chats, un dimanche", "Deux chats, un roux et un gris, partagent un coussin rayé près d’un bouquet."],
  ] },
  { collection: "Oiseaux", level: "Intermédiaire", base: 790, items: [
    ["Le rouge-gorge d'hiver", "Un rouge-gorge sur une branche enneigée, entre baies de houx et flocons."],
    ["L'hirondelle libre", "Une hirondelle en plein vol, ailes déployées, au-dessus de deux nuages."],
    ["La mésange du jardin", "Une mésange bleue posée sur une branche de cerisier en fleurs."],
    ["Les oiseaux du matin", "Trois oiseaux sur un fil, devant un grand soleil levant."],
  ] },
  { collection: "Céleste", level: "Débutant", base: 590, items: [
    ["Lune de minuit", "Un croissant de lune doré et quelques étoiles, pour un premier ouvrage."],
    ["Solstice", "Un soleil géométrique aux rayons alternés, chaud et lumineux."],
    ["Constellation intime", "Une constellation reliée point à point dans un médaillon de nuit."],
    ["Le cercle des étoiles", "Les phases de la lune en arc, couronnées d’un cercle d’étoiles."],
  ] },
  { collection: "Objets & Maison", level: "Intermédiaire", base: 790, items: [
    ["La machine à écrire", "Une machine à écrire ancienne, sa feuille glissée et ses touches rondes."],
    ["L'atelier du dimanche", "Ciseaux, bobines et pelote à épingles : la table de couture du dimanche."],
    ["La théière en porcelaine", "Une théière bleu et blanc et sa tasse, motifs de faïence."],
    ["Fenêtre sur la campagne", "Une fenêtre ouverte sur les collines, les champs et un ciel clair."],
  ] },
  { collection: "Monogrammes", level: "Débutant", base: 590, items: [
    ["L'initiale botanique", "Une grande capitale enlacée de feuillages, à personnaliser."],
    ["L'alphabet atelier", "Un abécédaire complet dans un cadre à frise, façon marquoir."],
    ["Les deux initiales", "Deux initiales réunies par une esperluette dans une couronne de feuilles."],
    ["La date précieuse", "Une date à broder dans une couronne fleurie, avec deux cœurs."],
  ] },
  { collection: "Signature", level: "Expert", base: 990, items: [
    ["Rond noir", "Un disque noir dense, travaillé en reflets de gris : l’exercice du plein."],
    ["Architecture du silence", "Une perspective d’arches en tons de pierre et de lumière."],
    ["Le fil invisible", "Un seul fil rouge qui serpente, se noue et se dénoue sur la toile."],
    ["La géométrie des jours", "Une grille de jours, chaque case un motif géométrique différent."],
  ] },
];

export const EDITIONS: EditionProduct[] = definitions.flatMap((group, g) => group.items.map(([title, description], i) => ({
  id: "pz-" + (g + 1) + "-" + (i + 1),
  title,
  collection: group.collection,
  level: i === 3 ? "Expert" : group.level,
  width: 90 + i * 20,
  height: 100 + i * 12,
  maxColors: 12 + i * 6,
  price: group.base + i * 100,
  description,
})));

/* Oiseaux botaniques : des oiseaux dont le plumage est fait de fleurs, 150 × 150 points, jusqu'à 60 fils (drawings/botaniques.ts). */
const BOTANIQUES: [string, string][] = [
  ["Le rouge-gorge fleuri", "Un rouge-gorge à la poitrine de pivoines orangées, le dos semé de fleurs crème, sur une branche en bourgeons."],
  ["La mésange aux fleurs des champs", "Une mésange bleue : calotte de myosotis, poitrine de boutons d’or, aile aux plumes rayées."],
  ["Le chardonneret en fête", "Un chardonneret au masque rouge, aux joues blanches fleuries et à l’aile noire barrée d’or."],
  ["Le martin-pêcheur", "Un martin-pêcheur au dos de turquoises et de bleuets, au ventre de fleurs orangées."],
  ["Le moineau des jardins", "Un moineau tout en bruns et en lin, semé de fleurettes de lavande."],
  ["Le bouvreuil en hiver", "Un bouvreuil à la poitrine de roses framboise, au dos gris perle et à la calotte noire."],
  ["L’hirondelle au printemps", "Une hirondelle posée, dos marine semé de myosotis, gorge rouge et longue queue fourchue."],
  ["La sittelle des bois", "Une sittelle au dos bleu ardoise fleuri, au ventre pêche et au trait noir sur l’œil."],
];
EDITIONS.push(...BOTANIQUES.map(([title, description], i): EditionProduct => ({
  id: "pz-7-" + (i + 1), title, collection: "Oiseaux botaniques", level: "Expert", width: 150, height: 150, maxColors: 60, price: 1190, description,
})));

export const COLLECTIONS: Collection[] = [...definitions.map(d => d.collection), "Oiseaux botaniques"];

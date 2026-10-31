/**
 * La carte d'exemple de la démonstration : un atelier FICTIF, aucune donnée personnelle réelle.
 * Médias : captures de l'atelier Point Zéro et une reconstitution générée (annoncée comme telle) déjà présentes dans le studio.
 */
import type { Carte } from "./carte";

const IMG = import.meta.env.BASE_URL + "images/";
export const CARTE_EXEMPLE: Carte = {
  id: "exemple-atelier-garance",
  fictive: true,
  metier: "brodeuse",
  identite: { nom: "Atelier Garance", activite: "Broderie au point de croix · patrons sur mesure", initiales: "AG" },
  chiffres: [{ valeur: "12", libelle: "Œuvres" }, { valeur: "4", libelle: "Prestations" }, { valeur: "3", libelle: "Médias" }],
  medias: [
    { genre: "image", src: IMG + "histoire/reconstitution-ouvrages.webp", alt: "Des ouvrages brodés ouverts, des écheveaux et des ciseaux", credit: "Reconstitution générée, pas une photographie" },
    { genre: "image", src: IMG + "ecrans/atelier-ipad-patron.webp", alt: "Une rosace en lecture Patron sur une tablette, symboles et grille", credit: "Capture de l’atelier Point Zéro" },
    { genre: "image", src: IMG + "ecrans/atelier-ordinateur.webp", alt: "L’atelier Point Zéro sur ordinateur : une rosace dans son cadre", credit: "Capture de l’atelier Point Zéro" },
  ],
  description: { titre: "Une présentation, pas une autre page.", texte: "Patrons dessinés à la main à partir de vos photographies, initiation au point de croix, réparation d’ouvrages anciens. Chaque patron est livré avec ses fils DMC et son guide." },
  localisation: { ville: "Lille", zone: "Hauts-de-France · ateliers en visio" },
  prestations: [
    { nom: "Patron sur mesure", detail: "depuis votre photo, fils DMC compris" },
    { nom: "Initiation", detail: "deux heures, matériel fourni" },
    { nom: "Réparation", detail: "ouvrages anciens, sur devis" },
    { nom: "Encadrement", detail: "tambour ou cadre bois" },
  ],
  tarifs: [{ libelle: "Patron sur mesure", prix: "à partir de 45 €" }, { libelle: "Initiation", prix: "60 €" }, { libelle: "Réparation", prix: "sur devis" }],
  galerie: [
    { src: IMG + "histoire/met-palampore-2010-337.webp", alt: "Palampore aux rouges de garance (The Met, 2010.337, domaine public)" },
    { src: IMG + "histoire/reconstitution-pigments.webp", alt: "Reconstitution générée : poudres de garance et d’indigo" },
    { src: IMG + "histoire/met-reserve-bleue-40-128.webp", alt: "Panneau à réserve bleue (The Met, 40.128, domaine public)" },
    { src: IMG + "ecrans/atelier-iphone-fils.webp", alt: "Les nuances DMC d’un motif, sur téléphone (capture de l’atelier)" },
    { src: IMG + "histoire/reconstitution-atelier.webp", alt: "Reconstitution générée : un atelier d’impression à la planche" },
  ],
  contact: [{ canal: "Message", valeur: "par la carte, sans adresse visible" }, { canal: "Téléphone", valeur: "06 00 00 00 00 (fictif)" }],
  disponibilites: [
    { jour: "Mardi", creneaux: ["10 h", "14 h"] },
    { jour: "Jeudi", creneaux: ["9 h 30", "16 h"] },
    { jour: "Samedi", creneaux: ["11 h"] },
  ],
  actions: ["contacter", "devis", "reserver", "enregistrer", "partager", "modifier"],
  /* le téléphone est réservé aux clients ; les tarifs restent publics */
  visibilite: { contact: "clients", disponibilites: "public" },
};

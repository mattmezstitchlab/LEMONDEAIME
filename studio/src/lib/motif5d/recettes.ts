import { lireCode, type Recette } from "./code";

/**
 * Les douze recettes de démonstration : le mur « Découvrir », les exemples du test et la référence des tests automatiques.
 * Chacune des 20 réponses y apparaît exactement 3 fois. Les noms sont provisoires : on les renomme ici, sans toucher au code.
 */
export const RECETTES: { nom: string; code: string }[] = [
  { nom: "Carreau rose", code: "5D-11111.g12.v0.1" },
  { nom: "Losange des champs", code: "5D-22224.g58.v0.1" },
  { nom: "Ruban de fête", code: "5D-33333.g14.v0.1" },
  { nom: "Jardin de faïence", code: "5D-44442.g1.v0.1" },
  { nom: "Givre", code: "5D-12342.g21.v0.1" },
  { nom: "Lune de lavande", code: "5D-23411.g19.v0.1" },
  { nom: "Galon de lin", code: "5D-34124.g29.v0.1" },
  { nom: "Carreaux de cuisine", code: "5D-41233.g15.v0.1" },
  { nom: "Kaléidoscope", code: "5D-13133.g59.v0.1" },
  { nom: "Ondes", code: "5D-24242.g28.v0.1" },
  { nom: "Bordure lilas", code: "5D-31311.g17.v0.1" },
  { nom: "Tomettes", code: "5D-42424.g9.v0.1" },
];
export const recetteDe = (code: string): Recette => lireCode(code)!;
/** Le nom d'une recette connue (sinon rien : l'ouvrage prend le nom de sa signature). */
export const nomRecette = (code: string) => RECETTES.find(r => r.code === code)?.nom;

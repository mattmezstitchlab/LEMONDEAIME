/* L'atelier Point Zéro, vu depuis l'accueil : un seul endroit dit s'il est ouvert au public.
   Tant que le site Point Zéro est protégé (accès privé), « Importer mon patron PDF » reste affiché comme indisponible : aucun lien, aucun faux départ.
   Quand le site sera public ET que son point d'entrée d'import existera (livraison A2 : ?importer=pdf), on renseignera `url` et on passera `disponible` à true.
   Rien d'autre à changer : la page lit ce fichier. */
export const POINTZERO = {
  disponible: false as boolean,
  url: '' as string,
};

/** L'adresse d'import, ou null si l'atelier n'est pas (encore) ouvert : jamais une adresse inventée. */
export function importerPdfHref(): string | null {
  if (!POINTZERO.disponible || !POINTZERO.url) return null;
  return POINTZERO.url.replace(/\/+$/, '') + '/?importer=pdf';
}

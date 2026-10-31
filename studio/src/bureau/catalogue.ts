/**
 * Les images déjà présentes dans le site, avec leurs droits (voir public/images/histoire/CREDITS.md).
 * Elles s'ajoutent, dans la médiathèque du Bureau, aux médias envoyés dans le stockage (dossier « contenus/ »).
 * Choisir une image apporte toujours sa licence, sa nature (reconstitution ou non), sa provenance et une légende honnête.
 */
import type { Licence } from "../components/edition/contenus";

export interface MediaBureau { src: string; titre: string; alt: string; legende: string; licence: Licence; reconstitution: boolean; provenance: string; origine: "site" | "envoi"; genre?: "image" | "video" }

const MET = (num: string, page: string) => `The Metropolitan Museum of Art, ${num}, domaine public (Open Access) — ${page}`;
export const CATALOGUE_SITE: MediaBureau[] = [
  { origine: "site", src: "images/histoire/met-palampore-2010-337.webp", titre: "Palampore (The Met, 2010.337)", licence: "domaine-public", reconstitution: false,
    provenance: MET("2010.337", "metmuseum.org/art/collection/search/75909"),
    alt: "Palampore de la côte de Coromandel : un grand arbre fleuri, rouges de garance et bleus, rendu en broderie",
    legende: "Palampore, côte de Coromandel (Inde), premier quart du XVIIIᵉ siècle. The Metropolitan Museum of Art, 2010.337, domaine public. Rendu en broderie par le studio." },
  { origine: "site", src: "images/histoire/met-reserve-bleue-40-128.webp", titre: "Réserve bleue (The Met, 40.128)", licence: "domaine-public", reconstitution: false,
    provenance: MET("40.128", "metmuseum.org/art/collection/search/13797"),
    alt: "Panneau à réserve bleue : oiseaux et feuillages en bleus d’indigo, rendu en broderie",
    legende: "Panneau de rideau à réserve bleue, vers 1725–1775. The Met, 40.128, domaine public. Rendu en broderie par le studio." },
  ...([
    ["pigments", "Pigments, racines, étoffe", "poudres de garance et d’indigo, racines, feuilles et une étoffe imprimée"],
    ["atelier", "Atelier d’impression", "un artisan imprime une étoffe à la planche de bois"],
    ["ouvrages", "Ouvrages et écheveaux", "des ouvrages anciens ouverts sur des motifs brodés, des écheveaux et des ciseaux"],
    ["port", "Port et étoffes", "un port, des balles d’étoffes et des navires"],
  ] as const).map(([f, titre, quoi]): MediaBureau => ({ origine: "site", src: `images/histoire/reconstitution-${f}.webp`, titre: titre + " (reconstitution)", licence: "reconstitution", reconstitution: true,
    provenance: "Image générée, fournie par Matt (maquette artistique)", alt: `Reconstitution : ${quoi}, rendu en broderie`,
    legende: `Reconstitution générée (${titre.toLowerCase()}), rendue en broderie par la conversion du studio. Pas une photographie d’époque.` })),
  ...([
    ["atelier-ordinateur", "L’atelier sur ordinateur"], ["atelier-ipad-patron", "L’atelier sur tablette"], ["atelier-iphone-fils", "L’atelier sur téléphone"],
  ] as const).map(([f, titre]): MediaBureau => ({ origine: "site", src: `images/ecrans/${f}.webp`, titre, licence: "capture", reconstitution: false,
    provenance: "Capture de l’atelier Point Zéro", alt: titre, legende: `${titre} : capture de l’atelier actuel.` })),
];

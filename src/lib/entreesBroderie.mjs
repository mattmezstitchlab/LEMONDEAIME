/* La carte Broderie (Brode Way) : cinq entrées directes dans l'atelier du Studio (/studio/atelier).
   Chacune appelle une commande qui existe déjà ; « ?ouvrir= » est lu une fois par l'atelier (studio/src/lib/ouvrir.ts) puis retiré de l'adresse.
   Aucune nouvelle page entre la carte et l'atelier. Le texte dit ce qui se passe, y compris quand il n'y a rien à reprendre. */
export const ATELIER = '/studio/atelier';
export const ENTREES_BRODERIE = [
  { id: 'ouvrages', nom: 'Mes ouvrages', sub: 'Rouvrir un ouvrage rangé sur cet appareil.', href: ATELIER + '?ouvrir=ouvrages' },
  { id: 'reprendre', nom: 'Reprendre un ouvrage', sub: 'L’atelier s’ouvre sur le dernier ouvrage de cet appareil, tel que vous l’avez laissé.', href: ATELIER + '?ouvrir=reprendre' },
  { id: 'creer', nom: 'Créer un motif', sub: 'Composer une rosace en cinq gestes, puis la broder ; le Disque est au centre.', href: ATELIER + '?ouvrir=composer' },
  { id: 'importer', nom: 'Importer un patron', sub: 'Une image, un patron PDF ou un projet : le Disque s’ouvre sur Importer.', href: ATELIER + '?ouvrir=importer' },
  { id: 'fils', nom: 'Explorer les fils et couleurs', sub: 'Les fils du motif et le nuancier DMC par familles, dans le Disque.', href: ATELIER + '?ouvrir=fils' },
];
/* la carte Broderie : le projet « Brode Way » (ou tout projet de catégorie Broderie dont le lien est l'atelier) */
export const estBroderie = (p) => !!p && (p.slug === 'brode-way' || (p.categorie === 'Broderie' && p.lien === ATELIER));

/* « Reprendre un ouvrage » : l'atelier restaure le dernier ouvrage de cet appareil (clé du Studio, lecture seule ; rien n'est écrit ni copié).
   Un ouvrage « existe » s'il a au moins un point posé ; un canevas vide n'est pas un ouvrage à reprendre. */
export const CLE_OUVRAGE = 'point-zero:motif:v1';
export function ouvrageARepris(stockage) {
  try {
    const brut = stockage && stockage.getItem(CLE_OUVRAGE);
    if (!brut) return null;
    const o = JSON.parse(brut);
    const posés = (a) => Array.isArray(a) && a.some(v => typeof v === 'number' && v >= 0);
    const nombre = ['cross', 'fwd', 'bwd', 'q0', 'q1', 'q2', 'q3'].some(k => posés(o[k]));
    if (!nombre) return null;
    return { nom: typeof o.name === 'string' && o.name.trim() ? o.name.trim() : 'votre dernier ouvrage', modifie: typeof o.updated === 'number' ? o.updated : null };
  } catch { return null; }
}

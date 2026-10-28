/* La Boutique : ce que les artisans de l'union créent, vendent ou louent (les créations de la maquette).
   Pas de prix inventés : la commande et la location arrivent avec les comptes vendeurs (A+). */
export type Univers = 'papeterie' | 'broderie' | 'decor' | 'table' | 'tenues' | 'fleurs';
export type Facon = 'Vente' | 'Location' | 'Sur mesure' | 'Patron';
export type Creation = { id: string; nom: string; par: string; fiche?: string; univers: Univers; facon: Facon; photo: string; alt: string; contenir?: boolean };
const M = (s: string) => '/media/boutique/' + s + '.jpg';
export const UNIVERS: [Univers, string][] = [['papeterie', 'Papeterie'], ['broderie', 'Broderie'], ['decor', 'Décor'], ['table', 'La table'], ['tenues', 'Tenues et bijoux'], ['fleurs', 'Fleurs']];
export const FACONS: [Facon, string][] = [['Vente', 'Acheter'], ['Location', 'Louer'], ['Sur mesure', 'Sur mesure'], ['Patron', 'Patron à broder']];
export const CREATIONS: Creation[] = [
  { id: 'faire-part-affiche', nom: 'Faire-part affiche', par: 'L’artisan', fiche: 'l-artisan', univers: 'papeterie', facon: 'Vente', photo: M('faire-part-affiche'), alt: 'Un faire-part façon affiche de concert en noir et rouge' },
  { id: 'papeterie-complete', nom: 'Papeterie complète', par: 'L’artisan', fiche: 'l-artisan', univers: 'papeterie', facon: 'Vente', photo: M('papeterie-complete'), alt: 'Des cartes de papeterie disposées en cercle' },
  { id: 'date-precieuse', nom: 'La date précieuse', par: 'Point Zéro', fiche: 'la-brodeuse', univers: 'broderie', facon: 'Patron', photo: M('date-precieuse'), alt: 'Patron de broderie : une date dans une couronne de fleurs', contenir: true },
  { id: 'deux-initiales', nom: 'Les deux initiales', par: 'Point Zéro', fiche: 'la-brodeuse', univers: 'broderie', facon: 'Patron', photo: M('deux-initiales'), alt: 'Patron de broderie : deux initiales dans une couronne', contenir: true },
  { id: 'mesange', nom: 'La mésange du jardin', par: 'Point Zéro', fiche: 'la-brodeuse', univers: 'broderie', facon: 'Patron', photo: M('mesange'), alt: 'Patron de broderie : une mésange sur une branche fleurie', contenir: true },
  { id: 'theiere', nom: 'La théière en porcelaine', par: 'Point Zéro', fiche: 'la-brodeuse', univers: 'broderie', facon: 'Patron', photo: M('theiere'), alt: 'Patron de broderie : une théière et sa tasse', contenir: true },
  { id: 'arche-fleurs', nom: 'Arche de fleurs séchées', par: 'Le scénographe', fiche: 'le-scenographe', univers: 'decor', facon: 'Location', photo: M('arche-fleurs'), alt: 'Une arche de fleurs séchées dans un champ' },
  { id: 'guirlandes', nom: 'Guirlandes lumineuses', par: 'Le régisseur', fiche: 'le-regisseur', univers: 'decor', facon: 'Location', photo: M('guirlandes'), alt: 'Une cour éclairée de guirlandes au crépuscule' },
  { id: 'chaise-paille', nom: 'Chaise en paille tressée', par: 'Le scénographe', fiche: 'le-scenographe', univers: 'decor', facon: 'Location', photo: M('chaise-paille'), alt: 'Une chaise en bois à l’assise de paille' },
  { id: 'fontaine-champagne', nom: 'Fontaine à champagne', par: 'La mixologue', fiche: 'la-mixologue', univers: 'table', facon: 'Location', photo: M('fontaine-champagne'), alt: 'Une pyramide de coupes de champagne dans une salle de bal' },
  { id: 'nappe-lin', nom: 'Nappe en lin lavé', par: 'La créatrice', fiche: 'la-creatrice', univers: 'table', facon: 'Vente', photo: M('nappe-lin'), alt: 'Une nappe en lin froissé sur une table en bois' },
  { id: 'vaisselle-gres', nom: 'Vaisselle en grès blanc', par: 'L’artisan', fiche: 'l-artisan', univers: 'table', facon: 'Location', photo: M('vaisselle-gres'), alt: 'Une assiette et un bol en grès blanc sur du lin' },
  { id: 'verres-dores', nom: 'Verres à liseré doré', par: 'La mixologue', fiche: 'la-mixologue', univers: 'table', facon: 'Location', photo: M('verres-dores'), alt: 'Cinq verres à pied à la lueur d’une bougie' },
  { id: 'robe-sur-mesure', nom: 'Robe sur mesure', par: 'La créatrice', fiche: 'la-creatrice', univers: 'tenues', facon: 'Sur mesure', photo: M('robe-sur-mesure'), alt: 'Une robe de mariée suspendue dans une pièce claire' },
  { id: 'alliances', nom: 'Alliances en or', par: 'Un artisan joaillier', univers: 'tenues', facon: 'Sur mesure', photo: M('alliances'), alt: 'Deux alliances dorées posées sur une pierre' },
  { id: 'bouquet', nom: 'Bouquet de mariée', par: 'La fleuriste', fiche: 'la-fleuriste', univers: 'fleurs', facon: 'Sur mesure', photo: M('bouquet'), alt: 'Un bouquet de pivoines et de roses blanches' },
];

/* Ma sélection : gardée sur l'appareil (elle se partagera avec l'union quand les comptes vendeurs seront ouverts) */
const CLE = 'aime-selection';
export function lireSelection(): string[] { try { const v = JSON.parse(localStorage.getItem(CLE) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; } }
export function ecrireSelection(ids: string[]) { try { localStorage.setItem(CLE, JSON.stringify(ids)); } catch { /* stockage indisponible */ } }

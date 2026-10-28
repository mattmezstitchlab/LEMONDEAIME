import type { Media } from '../charte/Charte';
/* Les grands visuels du site. Les mêmes emplacements que l'Admin du canevas : on pourra les remplacer (image, vidéo, son). */
export const MEDIAS: Record<string, Media> = {
  'aime-hero': { src: '/media/phare.jpg', alt: 'Un couple au pied d’un phare face à la mer agitée au coucher du soleil', accroche: 'Point Zéro', legende: 'Tout commence quelque part', pos: 'center 55%' },
  'aime-manifeste': { src: '/media/sculpture.jpg', alt: 'Sculpture abstraite en métal, faite de blocs imbriqués, éclairée par un faisceau chaud sur fond sombre', accroche: 'Manifeste', legende: 'Des pièces qui s’emboîtent' },
  'aime-fondateur': { src: '/media/fondateur.jpg', alt: 'Matthieu Lecointre à son bureau, devant un écran et des croquis d’interfaces, un saxophone et son chien près de lui', accroche: 'Le fondateur', legende: 'Matthieu Lecointre, à l’atelier', pos: 'center 30%' },
  'monde-hero': { src: '/media/sous-la-mer.jpg', alt: 'Une cérémonie sous un dôme vitré entouré de poissons', accroche: 'Le Monde AIME', legende: 'Chaque studio, un monde', pos: 'center 45%' },
  'pz-hero': { src: '/media/grille-roses.jpg', alt: 'Une grille de broderie aux roses, case par case', accroche: 'L’étape 0', legende: 'On part du centre' },
  'buro-hero': { src: '/media/fondateur.jpg', alt: 'Un bureau en bois, un écran d’interface sombre et dorée, des croquis et une lampe', accroche: 'Votre espace', legende: 'Tout ce que vous commencez, rangé ici', pos: '78% 40%' },
  'union': { src: '/media/union.jpg', alt: 'Un couple danse devant un motel, de nuit' },
  'broderie': { src: '/media/broderie.jpg', alt: 'Une brodeuse tient une tablette avec une grille et un tambour brodé de roses' },
  'scene': { src: '/media/scene.jpg', alt: 'Les mariés s’embrassent au milieu d’une piste de danse éclairée en rose' },
  'facade': { src: '/media/facade.jpg', alt: 'Une limousine blanche devant une chapelle de mariage illuminée à Las Vegas' },
};

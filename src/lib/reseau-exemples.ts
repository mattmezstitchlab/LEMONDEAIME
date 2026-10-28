/* Le Réseau : les domaines (le filtre universel) et les profils d'exemple, les mêmes visages que l'Annuaire d'AIME Wedding.
   Chaque profil a son module : les briques de la Grille 44 qu'il voit, qu'il fait et qu'il partage. */
export type Domaine = { id: string; label: string; texte: string };
export const DOMAINES: Domaine[] = [
  { id: 'mariage', label: 'Mariage', texte: 'Tout ce qui fait une union : la cérémonie, la table, la musique, l’image, la scène.' },
  { id: 'broderie', label: 'Broderie', texte: 'Grilles, fils, ouvrages, SAL et patrons.' },
  { id: 'evenement', label: 'Événement', texte: 'Fêtes, salons, concerts, rencontres.' },
  { id: 'formation', label: 'Formation', texte: 'Transmettre : ateliers, cours, accompagnement.' },
  { id: 'numerique', label: 'Numérique', texte: 'Sites, présentations, habillage, outils.' },
  { id: 'commerce', label: 'Commerce', texte: 'Boutiques, créateurs, vente en ligne.' },
];
export const domaine = (id: string) => DOMAINES.find(d => d.id === id);

export type Exemple = {
  slug: string; nom: string; domaine: string; famille: string; elle: boolean; photo: string; alt: string;
  texte: string; voit: string[]; fait: string[]; partage: string[]; avec: string[]; union: string | null;
};
const P = (s: string) => '/media/reseau/' + s + '.jpg';
export const EXEMPLES: Exemple[] = [
  { slug: 'la-fleuriste', nom: 'La fleuriste', domaine: 'mariage', famille: 'La scène', elle: true, photo: P('fleuriste'), alt: 'Une fleuriste tient un bouquet de fleurs séchées',
    texte: 'Elle arrive avant tout le monde et repart quand la salle s’éteint. Bouquet, arches, centres de table : elle donne sa couleur à la journée.',
    voit: ['intention', 'palette', 'lieu'], fait: ['devis', 'taches', 'calendrier'], partage: ['galerie', 'programme'], avec: ['le-scenographe', 'le-regisseur'], union: 'le bouquet et les arches' },
  { slug: 'le-chef', nom: 'Le chef', domaine: 'mariage', famille: 'La table', elle: false, photo: P('chef'), alt: 'Un chef en veste blanche',
    texte: 'Il compose le repas avec les mariés, puis le sert à chaque invité, en tenant compte de ce que chacun peut manger.',
    voit: ['personnes', 'questions', 'placement'], fait: ['devis', 'fiche', 'taches'], partage: ['programme', 'suivi'], avec: ['la-patissiere', 'la-mixologue', 'le-regisseur'], union: 'le dîner' },
  { slug: 'la-patissiere', nom: 'La pâtissière', domaine: 'mariage', famille: 'La table', elle: true, photo: P('patissiere'), alt: 'Une pâtissière en veste blanche',
    texte: 'Le gâteau, le dessert, la pièce montée : elle part des couleurs de l’union et du nombre d’invités.',
    voit: ['personnes', 'palette', 'calendrier'], fait: ['devis', 'modele', 'taches'], partage: ['galerie', 'fiche'], avec: ['le-chef', 'la-fleuriste'], union: 'la pièce montée' },
  { slug: 'la-mixologue', nom: 'La mixologue', domaine: 'mariage', famille: 'La table', elle: true, photo: P('mixologue'), alt: 'Une mixologue tient un shaker',
    texte: 'Elle invente le cocktail de l’union et le fait choisir aux invités avant le jour J.',
    voit: ['personnes', 'programme', 'lieu'], fait: ['sondage', 'devis', 'fiche'], partage: ['programme', 'galerie'], avec: ['le-chef', 'le-dj'], union: 'le cocktail signature' },
  { slug: 'le-dj', nom: 'Le DJ', domaine: 'mariage', famille: 'La musique', elle: false, photo: P('dj'), alt: 'Un DJ devant ses platines',
    texte: 'Il tient la soirée. Les invités lui envoient leurs morceaux à l’avance, il construit la playlist avec eux.',
    voit: ['programme', 'personnes', 'lieu'], fait: ['sondage', 'devis', 'calendrier'], partage: ['programme', 'media'], avec: ['le-technicien', 'le-saxophoniste'], union: 'la soirée' },
  { slug: 'le-saxophoniste', nom: 'Le saxophoniste', domaine: 'mariage', famille: 'La musique', elle: false, photo: P('saxophoniste'), alt: 'Un musicien tient un saxophone',
    texte: 'Il joue à la cérémonie, au vin d’honneur ou avec le DJ. Il a besoin du déroulé exact et des morceaux choisis.',
    voit: ['programme', 'lieu', 'calendrier'], fait: ['devis', 'media', 'rappels'], partage: ['programme', 'livreor'], avec: ['le-dj', 'la-violoncelliste', 'l-officiant'], union: 'l’entrée des mariés' },
  { slug: 'la-violoncelliste', nom: 'La violoncelliste', domaine: 'mariage', famille: 'La musique', elle: true, photo: P('violoncelliste'), alt: 'Une musicienne tient un violoncelle',
    texte: 'Elle accompagne la cérémonie : l’entrée, les signatures, la sortie. Chaque morceau a son moment.',
    voit: ['programme', 'lieu', 'intention'], fait: ['devis', 'calendrier', 'media'], partage: ['programme'], avec: ['l-officiant', 'le-saxophoniste'], union: 'la cérémonie' },
  { slug: 'le-technicien', nom: 'Le technicien', domaine: 'mariage', famille: 'La musique', elle: false, photo: P('technicien'), alt: 'Un technicien son devant sa console',
    texte: 'Le son et la lumière, du premier discours à la dernière danse. Il connaît le lieu mieux que personne.',
    voit: ['lieu', 'programme', 'roles'], fait: ['taches', 'suivi', 'calendrier'], partage: ['suivi', 'messages'], avec: ['le-dj', 'le-regisseur'], union: 'le son et la lumière' },
  { slug: 'la-photographe', nom: 'La photographe', domaine: 'mariage', famille: 'L’image', elle: true, photo: P('photographe'), alt: 'Une photographe tient son appareil',
    texte: 'Elle suit la journée sans se faire voir, puis rend les images aux mariés et aux invités.',
    voit: ['personnes', 'programme', 'lieu'], fait: ['galerie', 'devis', 'calendrier'], partage: ['galerie', 'capsule'], avec: ['l-officiant', 'la-fleuriste'], union: 'les images de la journée' },
  { slug: 'l-officiant', nom: 'L’officiant', domaine: 'mariage', famille: 'La cérémonie', elle: false, photo: P('officiant'), alt: 'Un officiant en costume sombre',
    texte: 'Il écrit la cérémonie avec les mariés, à partir de leur histoire, puis la conduit.',
    voit: ['intention', 'personnes', 'programme'], fait: ['document', 'calendrier', 'questions'], partage: ['programme', 'livreor'], avec: ['la-violoncelliste', 'l-hotesse'], union: 'la cérémonie laïque' },
  { slug: 'l-hotesse', nom: 'L’hôtesse', domaine: 'mariage', famille: 'La cérémonie', elle: true, photo: P('hotesse'), alt: 'Une hôtesse tient un carnet',
    texte: 'Elle accueille chaque invité, le place et l’oriente. Elle sait qui est arrivé et qui manque.',
    voit: ['personnes', 'placement', 'invitation'], fait: ['suivi', 'messages'], partage: ['placement', 'itineraire'], avec: ['l-officiant', 'le-regisseur'], union: null },
  { slug: 'le-scenographe', nom: 'Le scénographe', domaine: 'mariage', famille: 'La scène', elle: false, photo: P('scenographe'), alt: 'Un scénographe devant ses planches de matières',
    texte: 'Il dessine les lieux : matières, lumière, circulation. Les mariés voient l’ensemble avant qu’il existe.',
    voit: ['intention', 'palette', 'lieu'], fait: ['modele', 'devis', 'taches'], partage: ['presentation', 'galerie'], avec: ['la-fleuriste', 'le-regisseur'], union: null },
  { slug: 'le-regisseur', nom: 'Le régisseur', domaine: 'mariage', famille: 'La scène', elle: false, photo: P('regisseur'), alt: 'Un régisseur devant une structure d’éclairage',
    texte: 'Il tient le déroulé : qui fait quoi, quand, où. Le jour J, tout passe par lui.',
    voit: ['programme', 'roles', 'lieu'], fait: ['taches', 'suivi', 'rappels'], partage: ['programme', 'messages'], avec: ['le-technicien', 'le-scenographe', 'l-hotesse'], union: null },
  { slug: 'l-artisan', nom: 'L’artisan', domaine: 'mariage', famille: 'La scène', elle: false, photo: P('artisan'), alt: 'Un artisan imprimeur dans son atelier',
    texte: 'Faire-part, menus, plan de table : il imprime tout ce qui se tient dans la main.',
    voit: ['palette', 'invitation', 'personnes'], fait: ['modele', 'devis', 'facture'], partage: ['invitation', 'boutique'], avec: ['la-creatrice', 'l-hotesse'], union: null },
  { slug: 'la-creatrice', nom: 'La créatrice', domaine: 'mariage', famille: 'La scène', elle: true, photo: P('creatrice'), alt: 'Une créatrice dans son atelier de couture',
    texte: 'Robe, costume, retouches : elle travaille sur mesure, essayage après essayage.',
    voit: ['intention', 'palette', 'calendrier'], fait: ['atelier', 'devis', 'rappels'], partage: ['galerie'], avec: ['l-artisan', 'la-photographe'], union: null },
  { slug: 'la-brodeuse', nom: 'La brodeuse', domaine: 'broderie', famille: 'Point de croix', elle: true, photo: '/media/broderie.jpg', alt: 'Une brodeuse tient une tablette avec une grille et un tambour brodé de roses',
    texte: 'Elle part d’une image, en fait une grille, la brode point par point, puis la partage ou la vend en patron.',
    voit: ['import', 'palette', 'grille'], fait: ['atelier', 'journal', 'modele'], partage: ['boutique', 'galerie', 'formation'], avec: [], union: null },
];
export const exemple = (slug: string) => EXEMPLES.find(e => e.slug === slug);
/* l'union d'exemple de l'Annuaire AIME Wedding */
export const UNION_EXEMPLE = 'Camille & Gabriel';

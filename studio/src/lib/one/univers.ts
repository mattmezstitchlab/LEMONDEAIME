/**
 * .0NE — le registre de présentation des univers. La mosaïque le lit ; on n'écrit aucune case à la main.
 * Statuts honnêtes : « Disponible » seulement si le moteur est raccordé et ouvrable ici ; « Expérimental » pour un essai privé
 * réel ; « En préparation » pour le reste (rien ne s'ouvre). Aucun compteur, aucun produit, aucune fonction fictive.
 * Un univers ajouté ici (ou enregistré à l'exécution) reçoit sa case sans autre code.
 */
import { verifierUnivers, type Univers } from "./contrat";
import { PROTOTYPES } from "../site";

const B = (chemin: string) => ({ type: "route" as const, chemin });
const AUCUNE = { type: "aucune" as const };

export const UNIVERS: Univers[] = [
  { id: "broderie", nom: "Broderie", phrase: "Créez, suivez et brodez vos ouvrages.", ordre: 1, statut: "disponible", publication: "publie", teinte: "#a14878",
    description: "POINT ZÉRO, le premier atelier complet : du tableau à la dernière croix, en fils DMC.", icone: "aiguille", centre: "ouvrage",
    visuel: { src: "images/ecrans/atelier-ordinateur.webp", alt: "L’atelier Point Zéro sur un ordinateur : une rosace au point de croix et ses outils", credit: "Capture de l’atelier Point Zéro.", licence: "capture-du-studio" },
    familles: [{ id: "points", nom: "Points", icone: "points" }, { id: "fils", nom: "Fils", icone: "fils" }, { id: "broder", nom: "Broder", icone: "aiguille" }, { id: "loupe", nom: "Loupe", icone: "loupe" },
      { id: "affichage", nom: "Affichage", icone: "oeil" }, { id: "importer", nom: "Importer", icone: "import" }, { id: "exporter", nom: "Exporter", icone: "export" }],
    ouverture: B("atelier"), modules: ["bureau", "indicateurs", "guide", "galerie", "tambour"] },
  { id: "bureau", nom: "Bureau", phrase: "Retrouvez et organisez vos projets.", ordre: 2, statut: "experimental", publication: "publie", teinte: "#2457ac",
    description: "Vos ouvrages au centre du Disque, les dossiers et les actions dans la couronne. Essai privé : la sauvegarde reste sur cet appareil.", icone: "dossier", centre: "dossiers",
    familles: [{ id: "ouvrir", nom: "Ouvrir", icone: "dossier" }, { id: "nouveau", nom: "Nouveau", icone: "nouveau" }, { id: "chercher", nom: "Rechercher", icone: "chercher" }, { id: "ranger", nom: "Organiser", icone: "ranger" }, { id: "partager", nom: "Partager", icone: "partager" }],
    ouverture: B("atelier"), modules: ["bureau"] },
  { id: "carte-vivante", nom: "Carte vivante", phrase: "Une carte, plusieurs formes, une seule adresse.", ordre: 3, statut: "experimental", publication: "publie", teinte: "#7562ce",
    description: "Ronde, carrée, verticale ou page : la même carte, pilotée par le Disque. Exemple fictif, aucune demande envoyée.", icone: "carte", centre: "carte",
    familles: [{ id: "forme", nom: "Forme", icone: "formats" }, { id: "medias", nom: "Médias", icone: "galerie" }, { id: "informations", nom: "Informations", icone: "infos" }, { id: "regarder", nom: "Regarder en tant que", icone: "personnes" }],
    ouverture: B("essai-carte"), modules: ["carte-vivante"] },
  { id: "galerie", nom: "Galerie des Vivants", phrase: "Exposez une copie de vos créations.", ordre: 4, statut: "experimental", publication: "publie", teinte: "#0d766b",
    description: "Une galerie commune, modérée : chacun y expose une copie de son ouvrage. Essai privé.", icone: "galerie", centre: "oeuvre",
    familles: [{ id: "voir", nom: "Voir", icone: "oeil" }, { id: "exposer", nom: "Exposer", icone: "partager" }, { id: "signaler", nom: "Signaler", icone: "autorisations" }],
    ouverture: B("galerie"), modules: ["galerie"] },
  { id: "terminal", nom: "Disque Terminal", phrase: "La ligne de commande, devenue une navigation.", ordre: 5, statut: "experimental", publication: "publie", teinte: "#334155",
    description: "Naviguer, gérer ses fichiers, Git, chercher, l’audio : sur un vrai dossier (l’espace d’essai de ce navigateur, ou un dossier de l’ordinateur). La commande réelle se montre à la demande. Envoyer et récupérer (Git) demandent un pont local, pas encore disponible.", icone: "terminal", centre: "contexte",
    familles: [{ id: "naviguer", nom: "Naviguer", icone: "visite" }, { id: "fichiers", nom: "Fichiers", icone: "document" }, { id: "git", nom: "Git", icone: "git" }, { id: "chercher", nom: "Chercher", icone: "chercher" },
      { id: "audio", nom: "Audio", icone: "son" }, { id: "historique", nom: "Historique", icone: "historique" }, { id: "executer", nom: "Exécuter", icone: "executer" }, { id: "reglages", nom: "Réglages", icone: "reglages" }],
    ouverture: B("one/terminal"), modules: ["indicateurs"] },
  { id: "mariage", nom: "Mariage", phrase: "Organisez le grand jour, du plan à la musique.", ordre: 10, statut: "preparation", publication: "publie", teinte: "#a56c20",
    description: "Programme, couple, moments : le Disque de l’union. Le site AIME Wedding existe déjà, hors de .0NE ; son moteur n’est pas encore raccordé ici.", icone: "anneaux", centre: "programme",
    familles: [{ id: "temps", nom: "Temps", icone: "horloge" }, { id: "invites", nom: "Invités", icone: "personnes" }, { id: "prestataires", nom: "Prestataires", icone: "reseau" }, { id: "musique", nom: "Musique", icone: "note" }, { id: "documents", nom: "Documents", icone: "document" }],
    ouverture: AUCUNE, modules: [], ailleurs: { nom: "Le site AIME Wedding", chemin: "/aime-wedding" } },
  { id: "spectacle", nom: "Spectacle", phrase: "Préparez les cues, les scènes et la régie.", ordre: 11, statut: "preparation", publication: "publie", teinte: "#2b2b8f",
    description: "Une scène, une séquence ou une conduite au centre ; artistes, lumière, son et régie autour.", icone: "lumiere", centre: "scene",
    familles: [{ id: "artistes", nom: "Artistes", icone: "personnes" }, { id: "lumiere", nom: "Lumière", icone: "lumiere" }, { id: "son", nom: "Son", icone: "son" }, { id: "regie", nom: "Régie", icone: "regie" }, { id: "temps", nom: "Temps", icone: "horloge" }, { id: "documents", nom: "Documents", icone: "document" }],
    ouverture: AUCUNE, modules: [] },
  { id: "culture", nom: "Culture", phrase: "Explorez des œuvres et leur histoire.", ordre: 12, statut: "preparation", publication: "publie", teinte: "#8a5a2b",
    description: "Une œuvre, une exposition ou un récit au centre ; collections, artistes et agenda autour.", icone: "livre", centre: "oeuvre",
    visuel: { src: "images/histoire/met-palampore-2010-337.webp", alt: "Un palampore de la côte de Coromandel : un grand arbre fleuri, rouges de garance et bleus", credit: "The Metropolitan Museum of Art, 2010.337, domaine public.", licence: "domaine-public" },
    familles: [{ id: "collections", nom: "Collections", icone: "galerie" }, { id: "artistes", nom: "Artistes", icone: "personnes" }, { id: "medias", nom: "Médias", icone: "lecture" }, { id: "agenda", nom: "Agenda", icone: "agenda" }, { id: "visite", nom: "Visite", icone: "visite" }],
    ouverture: AUCUNE, modules: [] },
  { id: "art", nom: "Art", phrase: "Créez et présentez vos collections.", ordre: 13, statut: "preparation", publication: "publie", teinte: "#c2410c",
    description: "Une création visuelle au centre ; outils, matières, couleurs et formats autour.", icone: "palette", centre: "creation",
    familles: [{ id: "outils", nom: "Outils", icone: "outils" }, { id: "matieres", nom: "Matières", icone: "matiere" }, { id: "couleurs", nom: "Couleurs", icone: "palette" }, { id: "formats", nom: "Formats", icone: "formats" }, { id: "galerie", nom: "Galerie", icone: "galerie" }],
    ouverture: AUCUNE, modules: [] },
  { id: "reseau", nom: "Réseau", phrase: "Rencontrez, échangez, collaborez.", ordre: 14, statut: "preparation", publication: "publie", teinte: "#0f766e",
    description: "Une personne ou un groupe au centre ; relations et actions autorisées autour. L’annuaire du site existe hors de .0NE.", icone: "reseau", centre: "personne",
    familles: [{ id: "portraits", nom: "Portraits", icone: "personnes" }, { id: "relations", nom: "Relations", icone: "reseau" }, { id: "actions", nom: "Actions", icone: "partager" }],
    ouverture: AUCUNE, modules: ["carte-vivante"], ailleurs: { nom: "Le réseau du site AIME", chemin: "/reseau" } },
  { id: "photo-video", nom: "Photo et vidéo", phrase: "Importez, cadrez et revivez vos images.", ordre: 15, statut: "preparation", publication: "publie", teinte: "#1d4ed8",
    description: "Un média réel au centre ; cadrage, couleur, lecture et export selon les capacités réellement disponibles. Le bloc Image existe en essai.", icone: "lecture", centre: "media",
    familles: [{ id: "cadrage", nom: "Cadrage", icone: "cadrage" }, { id: "couleur", nom: "Couleur", icone: "palette" }, { id: "lecture", nom: "Lecture", icone: "lecture" }, { id: "exporter", nom: "Exporter", icone: "export" }],
    ouverture: AUCUNE, modules: [] },
  { id: "boutique", nom: "Boutique", phrase: "Présentez et choisissez des créations.", ordre: 16, statut: "preparation", publication: "publie", teinte: "#be185d",
    description: "Un produit au centre ; catégories, couleurs, variantes et panier autour. La boutique du site existe hors de .0NE.", icone: "sac", centre: "produit",
    familles: [{ id: "categories", nom: "Catégories", icone: "categories" }, { id: "couleurs", nom: "Couleurs", icone: "palette" }, { id: "variantes", nom: "Variantes", icone: "formats" }, { id: "panier", nom: "Panier", icone: "panier" }],
    ouverture: AUCUNE, modules: [], ailleurs: { nom: "La boutique du site AIME", chemin: "/boutique" } },
  { id: "temps", nom: "Temps", phrase: "Visualisez, planifiez, suivez.", ordre: 17, statut: "preparation", publication: "publie", teinte: "#4338ca",
    description: "Un cadran ou un événement au centre ; moments, jalons et participants autour.", icone: "horloge", centre: "cadran",
    familles: [{ id: "moments", nom: "Moments", icone: "horloge" }, { id: "jalons", nom: "Jalons", icone: "jalons" }, { id: "participants", nom: "Participants", icone: "personnes" }, { id: "actions", nom: "Actions", icone: "raccourcis" }],
    ouverture: AUCUNE, modules: [] },
  { id: "musique", nom: "Musique", phrase: "Composez la journée en musique.", ordre: 18, statut: "preparation", publication: "publie", teinte: "#6d28d9",
    description: "Des morceaux et des moments au centre. La page « La journée en musique » existe hors de .0NE.", icone: "note", centre: "media",
    familles: [{ id: "morceaux", nom: "Morceaux", icone: "note" }, { id: "moments", nom: "Moments", icone: "horloge" }, { id: "ecouter", nom: "Écouter", icone: "son" }],
    ouverture: AUCUNE, modules: [], ailleurs: { nom: "La journée en musique", chemin: "/musique" } },
  { id: "connecteurs", nom: "Connecteurs", phrase: "Reliez vos services, avec vos autorisations.", ordre: 19, statut: "preparation", publication: "publie", teinte: "#334155",
    description: "La configuration d’un service au centre ; services, favoris, autorisations et raccourcis autour. Rien n’est connecté tant qu’un connecteur réel n’existe pas.", icone: "prise", centre: "service",
    familles: [{ id: "services", nom: "Services", icone: "prise" }, { id: "favoris", nom: "Favoris", icone: "favoris" }, { id: "autorisations", nom: "Autorisations", icone: "autorisations" }, { id: "raccourcis", nom: "Raccourcis", icone: "raccourcis" }],
    ouverture: AUCUNE, modules: [] },
];
/* lemondeaime.com : la Galerie des Vivants et la Carte vivante (essai) ne sont pas publiques ;
   leurs cases n'apparaissent que sur les aperçus privés (VITE_PROTOTYPES=1) */
export const UNIVERS_PRIVES = new Set(["galerie", "carte-vivante"]);
if (!PROTOTYPES) for (const u of UNIVERS) if (UNIVERS_PRIVES.has(u.id)) u.publication = "brouillon";

/* les univers enregistrés pendant la visite (un module qui se déclare ; l'univers de démonstration) */
const ajoutes: Univers[] = [];
const abonnes = new Set<() => void>();
/** Enregistrer un univers : il doit respecter le contrat ; sinon il est refusé (et la raison renvoyée). */
export function enregistrerUnivers(u: Univers): string[] {
  const e = verifierUnivers(u); if (e.length) return e;
  if ([...UNIVERS, ...ajoutes].some(x => x.id === u.id)) return ["identifiant déjà pris"];
  ajoutes.push(u); abonnes.forEach(f => f()); return [];
}
export function tousLesUnivers(): Univers[] { return [...UNIVERS, ...ajoutes]; }
export function suivreUnivers(f: () => void): () => void { abonnes.add(f); return () => { abonnes.delete(f); }; }

/** l'univers fictif de démonstration (preuve du registre) : expérimental, annoncé comme tel, sans moteur ni contenu réel */
export const UNIVERS_DEMONSTRATION: Univers = {
  id: "jardin-demo", nom: "Jardin (démonstration)", phrase: "Un univers fictif, ajouté par le registre.", ordre: 99, statut: "experimental", publication: "publie", demonstration: true, teinte: "#15803d",
  description: "Démonstration du registre : cette case est apparue sans écrire de composant. Aucun moteur derrière.", icone: "plante", centre: "cadran",
  familles: [{ id: "semer", nom: "Semer", icone: "plante" }, { id: "suivre", nom: "Suivre", icone: "jalons" }, { id: "partager", nom: "Partager", icone: "partager" }],
  ouverture: { type: "route", chemin: "one/univers" }, modules: [],
};

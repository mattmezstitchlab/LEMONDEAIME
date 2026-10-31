/* La zone d'intention de la première page : un tri local et déterministe (aucune IA, aucun appel réseau).
   Il propose un chemin et une destination ; il n'exécute rien. Chaque destination dit honnêtement son état :
   'disponible' (la page existe et fait ce que le mot promet), 'partiel' (elle existe mais ne couvre qu'une partie),
   'connexion' (elle existe, elle demande d'être connecté), 'indisponible' (rien n'existe encore pour cette demande). */

export const CHEMINS = {
  organiser: { nom: 'Organiser', sub: 'Mariage, événement, projet collectif.' },
  creer: { nom: 'Créer', sub: 'Studio, site, média, composition.' },
  projets: { nom: 'Mes projets', sub: 'BurO, dossiers, travaux personnels et partagés.' },
  decouvrir: { nom: 'Découvrir', sub: 'Le Monde, ses créateurs, ses œuvres, son réseau.' },
};

/* Où mène chaque chemin, aujourd'hui, dans le site réel. */
export const DESTINATIONS = {
  organiser: { href: '/aime-wedding', cible: 'AIME Wedding', etat: 'disponible', note: "Le site officiel de l'union : les mariés, les prestataires, les invités." },
  creer: { href: '/studio/atelier', cible: "L'atelier Brode Way", etat: 'partiel', note: "Seul l'atelier de broderie (point de croix) existe aujourd'hui. La création de sites, de médias ou de compositions n'est pas encore disponible." },
  projets: { href: '/buro', cible: 'Votre espace BurO', etat: 'connexion', note: 'Vos projets se trouvent dans votre espace. Il faut être connecté pour les voir.' },
  decouvrir: { href: '/projets', cible: "Les projets d'AIME", etat: 'disponible', note: "Les sites et studios conçus par AIME®, chacun avec sa page." },
};
const RESEAU = { href: '/reseau', cible: 'Le réseau', etat: 'disponible', note: 'Les prestataires, artistes et organisations du Monde AIME, chacun avec sa page.' };
const SITE_INDISPONIBLE = { href: null, cible: 'Création de sites', etat: 'indisponible', note: "La création de sites n'existe pas encore dans le Monde AIME. Rien n'a été lancé.", alternative: DESTINATIONS.creer };

export const ETATS = {
  disponible: 'Disponible',
  partiel: 'Partiellement disponible',
  connexion: 'Connexion nécessaire',
  indisponible: 'Pas encore disponible',
};

/* mots (préfixes de mots, accents et casse ignorés) */
const MOTS = {
  organiser: ['mariage', 'evenement', 'fete', 'reunion', 'seminaire', 'soiree', 'anniversaire', 'invite', 'planning', 'organis', 'prepar', 'programme', 'repas', 'voyage', 'sortie', 'cerem', 'coordonn', 'noce', 'fiancaille'],
  creer: ['site', 'page', 'logo', 'image', 'affiche', 'design', 'creer', 'creation', 'composition', 'studio', 'video', 'media', 'photo', 'dessin', 'maquette', 'ecrire', 'livre', 'musique', 'broder', 'patron', 'point'],
  projets: ['projet', 'dossier', 'buro', 'bureau', 'travail', 'travaux', 'document', 'contrat', 'devis', 'facture', 'reprendre', 'retrouv'],
  decouvrir: ['decouvr', 'explor', 'createur', 'oeuvre', 'reseau', 'inspir', 'exposition', 'portfolio', 'rencontr', 'artiste', 'prestataire'],
};
/* un métier ou un besoin de prestataire : on mène au réseau */
const PRESTATAIRES = ['musicien', 'chanteu', 'saxophon', 'pianiste', 'violon', 'guitariste', 'dj', 'photographe', 'videaste', 'traiteur', 'fleuriste', 'celebrant', 'officiant', 'decorat', 'animateur', 'coiffeu', 'maquilleu', 'patissier', 'lieu de reception'];
const SITE = ['site', 'page web', 'site web', 'landing'];

export function normaliser(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe');
}
export function estUrl(s) {
  return /^(https?:\/\/|www\.)\S+$/i.test(s) || /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(s);
}
const jetons = (n) => n.split(/[^a-z0-9]+/).filter(Boolean);
const contient = (n, t, liste) => liste.some((k) => (k.includes(' ') ? n.includes(k) : t.some((j) => j.startsWith(k) && (k.length > 3 || j.length <= k.length + 1))));

/* texte + fichier éventuel (nom, type) -> une proposition, ou null quand il n'y a rien à trier.
   Toujours { type, chemin, destination, pourquoi, execute:false } : la proposition n'est jamais une action faite. */
export function proposer(texte, fichier) {
  if (fichier) {
    const t = String(fichier.type || '').split('/')[0];
    if (t === 'image' || t === 'video' || t === 'audio') return fait('Fichier · média', 'creer', DESTINATIONS.creer, 'Un média se travaille dans la création. Le fichier reste sur votre appareil.');
    return fait('Fichier', 'projets', DESTINATIONS.projets, 'Un document se range dans vos projets. Le fichier reste sur votre appareil, il n\'est pas envoyé.');
  }
  const s = String(texte || '').trim();
  if (!s) return null;
  if (estUrl(s)) return fait('Adresse web', 'creer', DESTINATIONS.creer, 'Une adresse web pourrait devenir une composition, mais aucun outil ne la lit encore. Elle n\'est pas envoyée.');
  const n = normaliser(s), t = jetons(n);
  /* un besoin de prestataire passe avant le tri général */
  if (contient(n, t, PRESTATAIRES)) return fait('Phrase', 'decouvrir', RESEAU, 'Les prestataires et artistes du Monde AIME se trouvent dans le réseau.');
  let meilleur = null, max = 0, egal = false;
  for (const p of Object.keys(MOTS)) {
    const sc = MOTS[p].reduce((a, k) => a + (contient(n, t, [k]) ? 1 : 0), 0);
    if (sc > max) { meilleur = p; max = sc; egal = false; } else if (sc === max && sc > 0) egal = true;
  }
  if (!meilleur || egal) return { type: 'Phrase', chemin: null, destination: null, pourquoi: '', execute: false };
  if (meilleur === 'creer' && contient(n, t, SITE)) return fait('Phrase', 'creer', SITE_INDISPONIBLE, "Vous voulez créer un site.");
  return fait('Phrase', meilleur, DESTINATIONS[meilleur], '');
}
function fait(type, chemin, destination, pourquoi) { return { type, chemin, destination, pourquoi, execute: false }; }

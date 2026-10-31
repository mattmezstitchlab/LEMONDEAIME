/**
 * Disque Terminal — le contrat d'interface et le registre des commandes (données, sans React).
 * La ligne de commande devient une navigation radiale : la couronne porte les familles, chaque famille remplace la couronne
 * par ses actions, le centre garde le contexte (chemin, liste, sortie, progression, aperçu audio, message).
 * Chaque action dit la commande réelle qu'elle remplace (montrée à la demande, jamais imposée) et son niveau de risque.
 * Rien n'est simulé : ce qui demande un pont local (envoyer, récupérer) est annoncé comme tel.
 */
import type { EtatIndicateur } from "../point/indicateurs";

export type IdFamille = "naviguer" | "fichiers" | "git" | "chercher" | "audio" | "historique" | "executer" | "reglages";
/** ce dont l'action a besoin avant de s'exécuter (le centre le demande, sans jamais deviner) */
export type Besoin = "selection" | "dossier" | "fichier" | "audio" | "texte" | "destination" | "depot";
/** lecture : sans effet ; ecriture : modifie, annulable ; destructif : demande une confirmation ; reseau : demande un pont */
export type Risque = "lecture" | "ecriture" | "destructif" | "reseau";
/** où l'action fonctionne aujourd'hui */
export type Portee = "partout" | "pont";

export interface Famille { id: IdFamille; nom: string; aide: string; icone: string }
export interface Commande {
  id: string; famille: IdFamille; nom: string; aide: string; icone: string;
  besoins: Besoin[]; risque: Risque; annulable: boolean; portee: Portee;
  /** la commande réelle équivalente (montrée à la demande) ; a = arguments résolus */
  equivalent: (a: Record<string, string>) => string;
}

export const FAMILLES: Famille[] = [
  { id: "naviguer", nom: "Naviguer", aide: "se déplacer dans les dossiers", icone: "boussole" },
  { id: "fichiers", nom: "Fichiers", aide: "lister, copier, déplacer, renommer, supprimer, créer", icone: "fichiers" },
  { id: "git", nom: "Git", aide: "l’état du dépôt, ajouter, valider, l’historique, les branches", icone: "git" },
  { id: "chercher", nom: "Chercher", aide: "par nom, par extension, les gros fichiers, les récents, les doublons", icone: "chercher" },
  { id: "audio", nom: "Audio", aide: "écouter, voir, mesurer, convertir, ranger", icone: "audio" },
  { id: "historique", nom: "Historique", aide: "les dernières actions, les commandes, annuler, rétablir", icone: "historique" },
  { id: "executer", nom: "Exécuter", aide: "taper une commande (si vous la connaissez), répéter, voir la commande réelle", icone: "executer" },
  { id: "reglages", nom: "Réglages", aide: "le dossier de travail, la commande réelle, les confirmations, votre nom pour Git", icone: "reglages" },
];

const q = (s = "") => /[\s"'$`\\]/.test(s) ? `"${s.replace(/(["$`\\])/g, "\\$1")}"` : s;
const C = (c: Omit<Commande, "annulable" | "portee"> & Partial<Pick<Commande, "annulable" | "portee">>): Commande => ({ annulable: false, portee: "partout", ...c });

export const COMMANDES: Commande[] = [
  C({ id: "nav-parent", famille: "naviguer", nom: "Dossier parent", aide: "remonter d’un niveau", icone: "haut", besoins: [], risque: "lecture", equivalent: () => "cd .." }),
  C({ id: "nav-ouvrir", famille: "naviguer", nom: "Ouvrir le dossier", aide: "entrer dans le dossier choisi au centre", icone: "dossier", besoins: ["dossier"], risque: "lecture", equivalent: a => `cd ${q(a.cible)}` }),
  C({ id: "nav-favoris", famille: "naviguer", nom: "Favoris", aide: "vos dossiers favoris ; ajouter celui-ci", icone: "etoile", besoins: [], risque: "lecture", equivalent: () => "cd ~/favoris" }),
  C({ id: "nav-bureau", famille: "naviguer", nom: "Bureau", aide: "la racine du dossier de travail", icone: "maison", besoins: [], risque: "lecture", equivalent: () => "cd ~" }),
  C({ id: "nav-depot", famille: "naviguer", nom: "Dépôt courant", aide: "la racine du dépôt Git", icone: "git", besoins: [], risque: "lecture", equivalent: () => "cd \"$(git rev-parse --show-toplevel)\"" }),
  C({ id: "nav-retour", famille: "naviguer", nom: "Retour", aide: "le dossier précédent", icone: "retour", besoins: [], risque: "lecture", equivalent: () => "cd -" }),

  C({ id: "fic-lister", famille: "fichiers", nom: "Lister", aide: "le contenu du dossier, avec tailles et dates", icone: "liste", besoins: [], risque: "lecture", equivalent: () => "ls -la" }),
  C({ id: "fic-copier", famille: "fichiers", nom: "Copier", aide: "copier l’élément choisi vers un dossier", icone: "copier", besoins: ["selection", "destination"], risque: "ecriture", annulable: true, equivalent: a => `cp -R ${q(a.cible)} ${q(a.destination)}` }),
  C({ id: "fic-deplacer", famille: "fichiers", nom: "Déplacer", aide: "déplacer l’élément choisi vers un dossier", icone: "deplacer", besoins: ["selection", "destination"], risque: "ecriture", annulable: true, equivalent: a => `mv ${q(a.cible)} ${q(a.destination)}` }),
  C({ id: "fic-renommer", famille: "fichiers", nom: "Renommer", aide: "donner un autre nom à l’élément choisi", icone: "renommer", besoins: ["selection", "texte"], risque: "ecriture", annulable: true, equivalent: a => `mv ${q(a.cible)} ${q(a.texte)}` }),
  C({ id: "fic-supprimer", famille: "fichiers", nom: "Supprimer", aide: "mettre à la corbeille (annulable)", icone: "corbeille", besoins: ["selection"], risque: "destructif", annulable: true, equivalent: a => `mv ${q(a.cible)} .corbeille/   # au lieu de rm : annulable` }),
  C({ id: "fic-creer", famille: "fichiers", nom: "Créer un dossier", aide: "un nouveau dossier ici", icone: "plus", besoins: ["texte"], risque: "ecriture", annulable: true, equivalent: a => `mkdir ${q(a.texte)}` }),

  C({ id: "git-status", famille: "git", nom: "État", aide: "ce qui a changé depuis la dernière validation (status)", icone: "etat", besoins: ["depot"], risque: "lecture", equivalent: () => "git status" }),
  C({ id: "git-add", famille: "git", nom: "Ajouter", aide: "préparer les changements à valider (add)", icone: "plus", besoins: ["depot"], risque: "ecriture", equivalent: a => `git add ${a.cible ? q(a.cible) : "-A"}` }),
  C({ id: "git-commit", famille: "git", nom: "Valider", aide: "enregistrer les changements préparés, avec un message (commit)", icone: "valider", besoins: ["depot", "texte"], risque: "ecriture", equivalent: a => `git commit -m ${q(a.texte)}` }),
  C({ id: "git-push", famille: "git", nom: "Envoyer", aide: "publier vers le dépôt distant (push) : demande un pont local", icone: "envoyer", besoins: ["depot"], risque: "reseau", portee: "pont", equivalent: () => "git push" }),
  C({ id: "git-pull", famille: "git", nom: "Récupérer", aide: "récupérer le dépôt distant (pull) : demande un pont local", icone: "recuperer", besoins: ["depot"], risque: "reseau", portee: "pont", equivalent: () => "git pull" }),
  C({ id: "git-log", famille: "git", nom: "Historique", aide: "les dernières validations (log)", icone: "historique", besoins: ["depot"], risque: "lecture", equivalent: () => "git log --oneline -12" }),
  C({ id: "git-diff", famille: "git", nom: "Différences", aide: "ce qui a changé dans le fichier choisi (diff)", icone: "diff", besoins: ["depot", "fichier"], risque: "lecture", equivalent: a => `git diff -- ${q(a.cible)}` }),
  C({ id: "git-branche", famille: "git", nom: "Branche", aide: "les branches ; en créer une, changer", icone: "branche", besoins: ["depot"], risque: "ecriture", equivalent: a => a.texte ? `git switch -c ${q(a.texte)}` : "git branch" }),

  C({ id: "che-nom", famille: "chercher", nom: "Par nom", aide: "un mot dans le nom", icone: "chercher", besoins: ["texte"], risque: "lecture", equivalent: a => `find . -iname ${q(`*${a.texte ?? ""}*`)}` }),
  C({ id: "che-extension", famille: "chercher", nom: "Par extension", aide: "wav, mp3, md, png…", icone: "etiquette", besoins: ["texte"], risque: "lecture", equivalent: a => `find . -iname ${q(`*.${a.texte ?? ""}`)}` }),
  C({ id: "che-gros", famille: "chercher", nom: "Gros fichiers", aide: "les plus lourds d’abord", icone: "poids", besoins: [], risque: "lecture", equivalent: () => "find . -type f -exec du -h {} + | sort -rh | head -20" }),
  C({ id: "che-recents", famille: "chercher", nom: "Récents", aide: "modifiés ces sept derniers jours", icone: "horloge", besoins: [], risque: "lecture", equivalent: () => "find . -type f -mtime -7" }),
  C({ id: "che-doublons", famille: "chercher", nom: "Doublons", aide: "même contenu (empreinte SHA-256)", icone: "doublons", besoins: [], risque: "lecture", equivalent: () => "fdupes -r ." }),

  C({ id: "aud-lire", famille: "audio", nom: "Lire", aide: "écouter le fichier choisi (le son ne part jamais seul)", icone: "lire", besoins: ["audio"], risque: "lecture", equivalent: a => `ffplay -nodisp ${q(a.cible)}` }),
  C({ id: "aud-apercu", famille: "audio", nom: "Aperçu", aide: "la forme d’onde, en cercle", icone: "onde", besoins: ["audio"], risque: "lecture", equivalent: a => `ffmpeg -i ${q(a.cible)} -filter_complex showwavespic onde.png` }),
  C({ id: "aud-duree", famille: "audio", nom: "Durée", aide: "la durée exacte", icone: "horloge", besoins: ["audio"], risque: "lecture", equivalent: a => `ffprobe -show_entries format=duration ${q(a.cible)}` }),
  C({ id: "aud-meta", famille: "audio", nom: "Métadonnées", aide: "titre, artiste, album, format", icone: "etiquette", besoins: ["audio"], risque: "lecture", equivalent: a => `ffprobe -show_format ${q(a.cible)}` }),
  C({ id: "aud-convertir", famille: "audio", nom: "Convertir en WAV", aide: "une copie en WAV 16 bits, à côté (l’original reste)", icone: "convertir", besoins: ["audio"], risque: "ecriture", annulable: true, equivalent: a => `ffmpeg -i ${q(a.cible)} -c:a pcm_s16le ${q(a.cible.replace(/\.[^.]+$/, "") + ".wav")}` }),
  C({ id: "aud-ranger", famille: "audio", nom: "Ranger dans le dépôt", aide: "dans assets/audio/<album>/, puis préparé pour Git", icone: "ranger", besoins: ["audio", "texte"], risque: "ecriture", annulable: true, equivalent: a => `mkdir -p ${q(`assets/audio/${a.texte}`)} && mv ${q(a.cible)} ${q(`assets/audio/${a.texte}/`)} && git add ${q(`assets/audio/${a.texte}`)}` }),

  C({ id: "his-actions", famille: "historique", nom: "Dernières actions", aide: "ce qui a été fait, dans l’ordre", icone: "historique", besoins: [], risque: "lecture", equivalent: () => "history | tail -20" }),
  C({ id: "his-commandes", famille: "historique", nom: "Commandes", aide: "les commandes réelles équivalentes", icone: "executer", besoins: [], risque: "lecture", equivalent: () => "fc -l" }),
  C({ id: "his-annuler", famille: "historique", nom: "Annuler", aide: "défaire la dernière action annulable", icone: "annuler", besoins: [], risque: "ecriture", equivalent: () => "# annuler (aucune commande unique)" }),
  C({ id: "his-retablir", famille: "historique", nom: "Rétablir", aide: "refaire l’action annulée", icone: "retablir", besoins: [], risque: "ecriture", equivalent: () => "# rétablir" }),

  C({ id: "exe-libre", famille: "executer", nom: "Taper une commande", aide: "ls, cd, mkdir, mv, cp, rm, find, git… : les mêmes actions, au clavier", icone: "executer", besoins: ["texte"], risque: "ecriture", equivalent: a => a.texte ?? "" }),
  C({ id: "exe-repeter", famille: "executer", nom: "Répéter", aide: "refaire la dernière action", icone: "retablir", besoins: [], risque: "lecture", equivalent: () => "!!" }),
  C({ id: "exe-voir", famille: "executer", nom: "Voir la commande", aide: "montrer ou cacher la commande réelle sous chaque action", icone: "code", besoins: [], risque: "lecture", equivalent: () => "set -x" }),

  C({ id: "reg-source", famille: "reglages", nom: "Dossier de travail", aide: "l’espace d’essai de ce navigateur, ou un dossier de l’ordinateur", icone: "dossier", besoins: [], risque: "lecture", equivalent: () => "cd /chemin/choisi" }),
  C({ id: "reg-confirmer", famille: "reglages", nom: "Confirmer les suppressions", aide: "demander avant de mettre à la corbeille", icone: "bouclier", besoins: [], risque: "lecture", equivalent: () => "alias rm='rm -i'" }),
  C({ id: "reg-identite", famille: "reglages", nom: "Votre nom pour Git", aide: "l’auteur des validations", icone: "personne", besoins: ["texte"], risque: "lecture", equivalent: a => `git config user.name ${q(a.texte)}` }),
  C({ id: "reg-corbeille", famille: "reglages", nom: "Vider la corbeille", aide: "suppression définitive (confirmation demandée)", icone: "corbeille", besoins: [], risque: "destructif", equivalent: () => "rm -rf .corbeille" }),
];
export const commande = (id: string) => COMMANDES.find(c => c.id === id);

/* — Les règles des indicateurs lumineux (les petits points) —
   On réutilise l'API des indicateurs du Disque (lib/point/indicateurs) : un état sémantique attaché à une COMMANDE, direct ou hérité
   par sa famille. Couleur ET forme ET mot (jamais la couleur seule) ; pas de mouvement quand les animations sont réduites. */
export type Lumiere = "disponible" | "recommande" | "encours" | "succes" | "attention" | "erreur" | "notification";
export const LUMIERES: Record<Lumiere, { etat: EtatIndicateur; couleur: string; mot: string; mouvement: "aucun" | "pulsation" | "clignotement" }> = {
  disponible: { etat: "repos", couleur: "blanc doux", mot: "disponible", mouvement: "aucun" },
  recommande: { etat: "guide", couleur: "violet", mot: "recommandé", mouvement: "aucun" },
  encours: { etat: "encours", couleur: "bleu", mot: "en cours", mouvement: "pulsation" },
  succes: { etat: "reussite", couleur: "vert", mot: "terminé", mouvement: "aucun" },
  attention: { etat: "action", couleur: "orange", mot: "attention", mouvement: "aucun" },
  erreur: { etat: "erreur", couleur: "rouge", mot: "erreur", mouvement: "aucun" },
  notification: { etat: "info", couleur: "bleu clair", mot: "à voir", mouvement: "clignotement" },
};

/** Le centre du Disque : ce qu'il peut montrer */
export type VueCentre =
  | { genre: "liste"; titre?: string; entrees: { nom: string; chemin: string; genre: "dossier" | "fichier"; detail: string }[]; vide?: string }
  | { genre: "sortie"; titre: string; lignes: { texte: string; ton?: "ajout" | "retrait" | "neutre" | "attention" }[] }
  | { genre: "progression"; titre: string; part: number; etape: string }
  | { genre: "audio"; chemin: string; nom: string; duree?: number; cretes?: number[]; meta?: Record<string, string> }
  | { genre: "message"; ton: Lumiere; titre: string; texte?: string }
  | { genre: "saisie"; titre: string; etiquette: string; valeur: string; commande: string; aide?: string }
  | { genre: "confirmation"; titre: string; texte: string; commande: string }
  | { genre: "destination"; titre: string; commande: string };

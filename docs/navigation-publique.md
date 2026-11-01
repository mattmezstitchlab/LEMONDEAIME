# Header public — proposition séparée de la convergence

Base : convergence `68f28585d987eab84d947d375e213c7fa5588370`. Cette branche ne fusionne ni #42 ni #43 et n'intègre pas ROSACE.

## Point canonique et source unique

Le site utilisait `Tete` dans `src/charte/Charte.tsx`. `Tete` reste l'entrée des pages du site ; sa navigation publique est extraite dans `HeaderPublic`, également utilisé par le point d'entrée du Studio. `navigationPublique.ts` porte une seule liste, pour ordinateur et menu mobile :

| Entrée | Destination | Nature |
|---|---|---|
| Accueil | `/` | Accueil existant, ouverture conservée |
| Broderie | `/studio/` | Présentation existante du Studio, accès à l'atelier |
| Mariage | `/aime-wedding` | Présentation existante et union d'exemple |
| Projets à venir | `/projets-a-venir` | Présentation des limites et lien au catalogue existant |
| À propos | `/a-propos` | Présentation existante |
| Contact | `/contact` | Présentation honnête : pas encore de formulaire/adresse officielle publiée |

`/projets`, fiches projets, `/point-zero`, Réseau, musique, comptes et anciennes adresses sont conservés. `/studio` continue de rediriger vers `/studio/`, `/charte` et `/monde` continuent de mener à `/projets`. Deux réécritures de shell ajoutées à la liste existante pour les nouvelles pages : aucun changement du projet Vercel distant.

La rubrique active est calculée par famille de routes ; les espaces de compte ne sont pas présentés comme une septième rubrique. Les ancres d'une même page et les actions métier ne sont pas remplacées par six liens.

## Inventaire des navigations et fonctions conservées

- `Tete` : logo et listes publiques remplacés par le header partagé ; recherche, compte, connexion/déconnexion, option d'effacement local, préférences et confort restent dans le panneau « Compte, recherche et confort ». Aucun droit serveur modifié.
- `NavigationConvergence` sur le site : le bouton flottant était une liste globale concurrente (accueil, atelier, univers, préférences, précédent). Son montage global est supprimé. Le compte et les réglages du site restent dans les outils de Tete ; les univers restent joignables depuis les contenus existants.
- `NavigationConvergence` dans le Studio public : ne conserve que les préférences et le retour contextuel à l'expérience d'origine quand il existe. Les liens de navigation générale et le retour d'historique générique ne concurrencent plus le header. Les listes de prototypes restent conditionnées par le drapeau privé existant ; aucun prototype nouvellement publié.
- `CrossStitchHome` / `TopDock` : suppression du retour global AIME désormais présent dans le header ; conservation des ouvrages, entrée atelier, import et visite guidée. Son dock ne devient pas une deuxième navigation générale.
- `StudioDocks` : suppression du logo/retour global ; conservation du Disque, des palettes, de la loupe, des outils, de la recherche et des actions de compte et de bibliothèque. Les commandes métier ne changent pas.
- `ClipBrode` : suppression du petit retour global des deux clips ; commandes de lecture, curseur, Disque et moteur du film conservés. Seule la zone haute de disposition réserve la hauteur du header public ; aucun média, mixage, minutage ou algorithme de rendu modifié.
- `.0NE` : titres et parcours internes (univers, progression, choix de confort) conservés comme contexte, sans second landmark header ni lien Accueil global dupliqué. Aucun moteur ou commande modifié.
- `DockBas` : conservation des sections/ancres et actions contextuelles (Jour J, lecture musique, lieux du BurO). Aucun exemplaire des six liens publics ajouté en bas.
- Footer : conserve son plan détaillé et l'accès au compte ; « Contact et presse » pointe désormais vers une page réelle.

## Accessibilité et intégration

Liens natifs, liste de navigation, `aria-current`, bouton mobile avec `aria-expanded`/`aria-controls`, focus sur le premier lien, Échap et restitution du focus, fermeture à la sortie clavier ou au clic extérieur, cible tactile de 48 px minimum, lien d'évitement partagé. Le menu n'est pas une boîte de dialogue modale et ne piège pas le clavier.

CSS isolé commun, header blanc, texte noir et détail nacré. Le Studio réserve l'espace haut sans remplacer ses moteurs. Le partage du composant exige la déduplication React dans le build Studio comme dans le build site : aucune nouvelle dépendance.

## Limites de recette

Les tests locaux simulent les API et n'autorisent aucune écriture distante. La vérification Preview publique ne prouve ni connexion, ni BurO/Mariage connecté, ni upload Blob réel. L'isolation des bases et stores reste une décision séparée. Contrastes/lecteurs d'écran réels et Safari/iOS physiques ne peuvent pas être déclarés validés sur la seule base d'attributs ou d'un Chromium émulé.

# Consolidation de l’interface — proposition vers convergence

Base : `9423115b52ebc465846de3ca157a9ad1c565ed32`. Une seule branche de préparation : `integration/interface-consolidee`. Cette proposition inclut le correctif de positionnement de #47 et la reprise de #43, sans fusionner ces PR ni changer la convergence distante.

## Règle de référence

- Navigation publique : `HeaderPublic` et `navigationPublique.ts`, six entrées dans l'ordre validé.
- Compte : `PanneauPersonnel`, extrait des fonctions existantes de `Tete` (dossiers, session, recherche et confort). Un seul montage depuis le header du site/Studio ; pas de copie de compte dans le Disque.
- Disque : `Point` / `LePoint`, modes déclarés par contexte ; TambourAtelier et ClipBrode utilisent cette même référence. Aucun nouveau moteur.
- Données : session Better Auth/BurO inchangées ; bibliothèque locale `OuvragesBloc` inchangée, mais présentation hors de la couronne. Aucun fichier de données/média modifié.

## Inventaire des docks, barres et menus

| Composant / pages | Rôle avant | Décision / statut de la proposition |
|---|---|---|
| HeaderPublic, toutes pages site et Studio intégré | Six rubriques publiques, logo | Conservé, source canonique ; ajoute « Mon espace » ouvrant le panneau personnel, sans septième rubrique |
| Tete / OutilsSite, pages publiques | Deuxième panneau compte/recherche/confort, parfois sous le header | Tete ne monte plus de panneau séparé ; extraction réutilisée dans PanneauPersonnel ouvert depuis le header |
| Panneau de dossiers (bloc-dossiers) | Projets, partagés, archives, profil et nombres | Ergonomie des cartes conservée ; mêmes appels lecture BurO et session ; connexion et paramètres dans le même panneau |
| DockBas Accueil / Portfolio / SYSTEM / SYST’AIME | Sections, indicateurs de lecture, modes | Barre flottante et son faux centre radial supprimés ; ancres conservées en section locale dans le contenu |
| DockBas Mariage | Sections, Jour J, diaporama, musique | Présentation locale conventionnelle ; mode Jour J et commandes originaux conservés, aucun module métier supprimé |
| DockBas BurO | Projets, partagés, archives, profil | Commandes locales de vue conservées dans le contenu du BurO, pas de second panneau personnel dans une couronne |
| DockBas Musique / Boutique / autres | Moments, liens de page et lecteur | Sections locales et vrai lecteur conservés ; pas de dock flottant concurrent |
| Musique du site | Lecture de fichiers appareil/Deezer, précédent/pause/suivant | Conservée dans la zone locale de lecture ; source lecteur.ts inchangée |
| NavigationConvergence du site | Liens globaux concurrents | Déjà retirée par #46 ; non réintroduite |
| NavigationConvergence du Studio | Préférences / retour au contexte | Conservée comme accès contextuel de compatibilité ; pas de six rubriques ni compte, pas un moteur de Disque |
| TopDock sur CrossStitchHome | Menu ouvrages/entrée/visite, ancres sections | Retiré de cette présentation ; trois actions métier placées dans le contenu ; aucune action perdue |
| Index latéral et sommaire CrossStitchHome | Ancres pédagogiques | Conservés : ce ne sont pas des destinations globales |
| pzh-bottom sur présentation Studio | Ancres déjà dans index/sommaire et visite | Supprimé ; visite reste en action et dans le contenu |
| StudioDocks supérieur | Outils, recherche, bibliothèque, anciennes variantes | Panneau technique conservé pour importer/chercher/aide ; barre de boutons masquée quand le vrai Disque est actif ; revient si Disque replié ou mode classique choisi |
| StudioDocks inférieur | Zoom, grille, affichage, suivi, cercle outils | Masqué pendant le vrai Disque actif ; conservé comme alternative contextuelle quand le Disque est replié/classique, pour ne pas supprimer les actions d'accessibilité |
| Bureau au centre du Disque (racineBureau) | Dossiers et ouvrages reproduits dans la couronne | Présentation doublon supprimée ; bibliothèque locale accessible par bouton « Bibliothèque de l’atelier » et import, même OuvragesBloc, mêmes données |
| TambourAtelier, Point, LePoint | Vrai Disque contextuel et commandes | Conservés ; aucun calcul, commande de broderie ou donnée canonique remplacé |
| ClipBrode UPTOWN/Fleur | Lecture, Disque outils, curseur, modes | Conservé ; header/positionnement acquis maintenus, lecteur partageable de #43 repris |
| Ouverture Fleur (ancien lecteur distinct) | Son et rendu de l’introduction, boutons séparés | Repris depuis #43 : un seul ClipBrode et un seul Point ; mêmes données/audio/minutages, geste initial obligatoire |
| Démonstration scénarisée Fleur #43 | Outils illustrés suivant le temps audio, repli/rappel | Conservée et annoncée comme scénarisée ; pas de patron éditable simulé |
| ComposerRosace / boîtes PDF/import / calques / propriétés | Commandes métier et panneaux d’édition | Conservés, hors refonte ; aucun développement ROSACE ou bibliothèque de motifs dans cette passe |
| AIME SYSTEM / SYST’AIME (démonstrations documentaires) | Démonstrateurs de composants, échiquier, fiches | Conservés comme contenus explicatifs ; pas de remplacement du Disque d’atelier |
| Mariage : métamorphose, carrousels, prestataires, ApercuEspace | Démonstrations et commandes métier | Conservés intégralement ; refonte future, pas suppression |
| .0NE / Terminal / préférences | Contexte univers/outils et progression | Conservés ; header public inchangé, pas de copie du compte global |
| Bureau éditorial/admin et listes de sections | Navigation de travail réservée | Conservés : pas une navigation publique concurrente ; droits serveur inchangés |
| Footer et fils d’Ariane | Plan détaillé, retour de fiche, repère hiérarchique | Conservés, non flottants |
| Variantes privées / essais / sites autonomes | Tests de composants, flux séparés conditionnés | Pas de promotion publique ; inventoriés par composants, non supprimés comme s'ils étaient inutiles |

La consolidation n'est pas la suppression de toute barre locale : les alternatives métier gardent leur fonction, mais ne se superposent pas au Disque actif. Chaque présentation restante est explicite et son moteur de référence inchangé.

## Compatibilité de #43

#43 (`2726e7a`) part de `07bc7c1` ; GitHub signale un conflit avec la convergence. Deux fichiers conflictuels ont été réconciliés dans cette branche :

- OuvertureFleur : emploi du ClipBrode partagé de #43 plutôt que conservation de deux lecteurs parallèles. Le mécanisme de génération et le démontage du lecteur de #43 remplacent l'ancienne session ; la fermeture différée doit donc être retestée, pas déclarée préservée par simple fusion.
- ClipBrode : contrôles intégrés et nettoyage du lecteur de #43 conservés, retours globaux retirés par #46 non réintroduits ; mesure de hauteur distingue scène intégrée et page Studio sous le header.

Reprise de #47 : décalage CSS du bouton Le Disque conservé. Les méthodes d'annulation/arrêt dans données/rendu viennent de #43 ; aucune donnée de film ni audio ou archive privée modifiée. Tests de scénario, fermeture sous lenteur et commandes Loupe/Fils requis avant publication de la proposition.

## Sécurité de la recette

Les états personnels connectés sont testés avec des réponses API fictives en local. Aucun compte distant créé, aucune base ou variable modifiée, aucun email envoyé. La Preview permet une vérification publique déconnectée ; elle ne prouve pas l'isolation des ressources ni le fonctionnement d'un compte réel.

Priorité 2 ROSACE/bibliothèque de motifs et priorité 3 refonte Mariage restent explicitement hors de cette passe. Toute intégration dans la convergence distante, puis main, requiert un accord séparé ; aucune fusion automatique.

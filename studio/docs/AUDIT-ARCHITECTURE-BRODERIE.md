# Audit UX / architecture — atelier Broderie (15 octobre 2026)

Périmètre : src/App.tsx, EmbroideryInspector.tsx, WorkspacePanel.tsx, CategoryBar.tsx, MotifLibrary.tsx, FlossRail.tsx, TopBar.tsx, Dock.tsx, Sheet.tsx, StudioFrame.tsx, CompositionProperties.tsx, Canvas.tsx et les sélecteurs d'interface de src/index.css.

## Constat principal

L'atelier disposait de **trois systèmes d'action concurrents** pour les mêmes opérations :

1. Colonne gauche : CategoryBar et MotifLibrary, responsable de la navigation / sélection des contenus.
2. Colonne droite : EmbroideryInspector (« Réglages ») avec une liste secondaire de six outils, les vues de la grille et un bouton « Tous les réglages ».
3. Feuilles Sheet à droite : WorkspacePanel (« Composer », « Fils & toile », « Broder », « Réglages & aide »), déclenchées par CategoryBar et TopBar.
4. Dock flottant optionnel : la totalité des outils de dessin / suivi.
5. Menu « Plus » TopBar : raccourcis des mêmes vues, outils et catégories.

Conséquences : interaction concurrente à droite, largeurs et z-index imbriqués, actions identiques sous plusieurs noms, priorité difficile à comprendre, état de la catégorie décorrélé du panneau affiché et trop de couches mobiles.

## Matrice avant → après (modifié sur cette branche)

| Élément | Avant | Après | État |
|---|---|---|---|
| CategoryBar | Chaque catégorie, sauf Dessiner, ouvrait une Sheet | Catégorie choisit directement le contenu de gauche/droite | Effectué |
| Créer | AtelierCreate dans feuille flottante | AtelierCreate intégré à la gauche | Effectué |
| Outils rapides | Doublons Dock + Inspector + WorkspacePanel | EmbroideryToolbox unique dans la gauche, raccourcis avancés dépliables | Effectué |
| Propriétés du motif | Mélangées aux outils et aux vues dans EmbroideryInspector | Inspecteur Objet réduit aux données + CompositionProperties | Effectué |
| Dessiner | Espace gauche + Sheet Composer à droite | Contrôles Composer directement dans le panneau noir droit | Effectué |
| Fils & toile | Sheet au-dessus de l'inspecteur | Formulaire existant inséré dans la droite, sans nouvelle feuille | Effectué |
| Broder | Sheet Suivi + autre liste d'outils | Suivi / journal dans la droite, gestes uniquement à gauche | Effectué |
| Réglages | Sheet dédiée | Onglet « Réglages » dans la droite | Effectué |
| MotifLibrary | Colonne gauche | Conservée pour Dessiner, projets intacts | Effectué |
| FlossRail | Bandeau DMC inférieur | Conservé : sélection rapide de fil, sans duplicata du stock détaillé | Effectué |
| PaletteSheet | Nuancier spécialisé | Conservé comme sélecteur étendu, ouvert sur demande | Conservé volontairement |
| LibrarySheet | Gestion de fichiers / versions | Conservé comme modal de gestion de projet | Conservé volontairement |
| ExportStudio | Export avancé | Conservé comme flux spécialisé | Conservé volontairement |
| PeerShare | Partage WebRTC | Conservé comme flux spécialisé | Conservé volontairement |
| Canvas | Moteur des points et suivi | Aucun changement au modèle des points | Préservé |
| StudioFrame / DesignStudio | Éditeur multiformat distinct | Non migré dans cette passe | Non destructif |

## Règle d'affectation définitive

- **Gauche :** navigation, ajout de ressources et choix d'outil. Aucune édition de propriétés de l'objet sélectionné.
- **Centre :** toile, sélection, édition directe, drag & drop et zoom.
- **Droite :** propriétés de l'objet, dessin avancé (symétrie, lettrage, calques), stock / toile, suivi, préférences.
- **Bas :** fil DMC actif / progression palette.
- **Haut :** retour aux studios, annuler/refaire, export et commandes transversales.
- **Modale spécialisée :** uniquement quand l'activité nécessite un dialogue dédié (import, PDF, export, nuancier complet, partage).

## Doublons supprimés du chemin principal

- Grille de boutons Outils de EmbroideryInspector.
- Grille « Outils de conception » du WorkspacePanel, doublonnée par la palette d'outils de gauche.
- Grille « Marquer sans modifier le patron » du WorkspacePanel, tout en conservant le suivi et les explications.
- Dock flottant de dessin dans le rendu d'atelier : ses gestes sont réexposés à gauche.
- Sheet de création ; Sheet contextuelles Composer, Fils, Broder et Réglages.
- État categoryPanel maintenu uniquement pour ouvrir ces Sheet, devenu inutile.
- Contrôles de vues répliqués dans l'inspecteur (restent disponibles dans TopBar).

## Contraintes et limites

- Aucun changement du moteur Pattern, palette DMC, historiques, opérations sur cases, annotations ni sérialisation JSON/OXS.
- Les formulaires existants continuent à employer leurs fonctions métier.
- Les interactions tactiles, les ancres et le scroll doivent être validés sur iPad et téléphone réel.
- Les quelques panneaux modaux spécialisés restent nécessaires : ne pas chercher à absorber l'import PDF ni l'export complexe dans 260 px.
- Les réglages « Réglages & aide » sont volontairement regroupés ; prévoir plus tard un moteur centralisé de préférences pour l'ensemble des studios.
- L'audit est une revue approfondie des parcours et des fichiers pertinents, pas une preuve que chaque ligne de tout le dépôt a été exécutée.

## Grille universelle — préparation de la prochaine livraison

La « grille universelle / Métamorphose » doit être un modèle distinct du Pattern natif, pas un détournement des tableaux Int16Array des points de croix.

Objets canoniques :
- Source (image, PDF, URL publique ou fichier JSON).
- Fragment (crop, masque, dimensions, attribution/provenance, verrou).
- Composition (liste de placements, grille, contraintes, auto-layout).
- Export (SVG/PNG/HTML/JSON).

Séquence proposée :
1. Importer les fragments JSON de AIME-METAMORPHOSE dans DesignStudio (avec une étape de validation).
2. Grille auto-rétractable permettant de modifier la taille d'un fragment, sans effet sur la source.
3. Recadrage et verrouillage du fragment.
4. Masques polygonaux et cutter (opérations booléennes) dans un second lot.

Ne pas mélanger les cellules de broderie (suivi DMC) et les cases du portfolio dans le même format de données.

## Recette de validation

1. Retour Studio Design → Broderie, sans suppression de la sauvegarde.
2. Créer dans la gauche, choisir une grille vide, revenir à la bibliothèque.
3. Dessiner / Fils / Broder dans la navigation, sans ouvrir de feuille concurrente à droite.
4. Activer un outil à gauche puis dessiner sur la toile sans perdre l'outil actif.
5. Ajouter un motif depuis la bibliothèque et régler ses coordonnées / couches à droite.
6. Basculer Suivi, marquer une case, revenir Créer ; le dessin reste inchangé.
7. Choisir un fil dans le rail DMC, ouvrir le nuancier spécialisé et le refermer.
8. Réglages : modifier un paramètre, enregistrer, recharger, vérifier sa persistance.
9. Annuler/refaire, export JSON/OXS et PDF.
10. iPad/tablette : ouverture latérale des panneaux, fond de toile non déformé, scroll continu.
11. Vérifier les modes lecteur d'écran et clavier.
12. Exécuter npm run verify (TypeScript, tests, build) avant fusion.

Le merge doit attendre une CI verte et idéalement un essai visuel desktop/tablette.
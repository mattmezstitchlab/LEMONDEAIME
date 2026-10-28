# POINTZERO — Moteur universel, étape sujets autonomes V1

## Objectif

Ne pas reconstruire l'Atelier. Ajouter au moteur existant des sujets brodables autonomes, une source immuable et une recomposition déterministe dans le format POINTZERO natif.

**Limite de fond : cette version ne reconnaît pas sémantiquement des objets inconnus.** Elle sépare géométriquement des amas de points proches, y compris de plusieurs couleurs. Un futur modèle de segmentation d'instance sera nécessaire pour identifier et isoler précisément des oiseaux, des personnages, des fleurs et leurs sous-éléments sur toute image.

## Audit de l'existant

| Domaine | Module existant préservé | Limite |
|---|---|---|
| Images | AutomaticImageImport, convert, conversion.worker | Segmentation actuelle après quantification DMC |
| PDF | PdfPrep, pdfVector, pdfGlyphChart, chartRecognition | Fiabilité variable selon PDF éditable ou aplati |
| Couleurs | dmc, colorScience (CIEDE2000), quantize | DMC écran indicatifs |
| Confettis | removeConfetti réutilisé par composition | Importance sémantique non reconnue |
| Broderie | Pattern.cross, fwd, bwd, q, back, long, knots, special | Fractions et contours automatiques encore expérimentaux |
| Calques existants | Pattern.layers, snapshots de travail | Ces calques ne sont pas des sujets déplaçables |
| Export | buildPdf, JSON natif, SVG et OXS | Recette navigateur et comparaison papier à faire |
| Boutique | catalogue existant | Aucun droit commercial ni paiement ajouté |

## Nouvelle architecture

- subjectEngine : groupes géométriques de premier plan détectés par connexité/proximité ; source intacte, petits fragments conservés dans le fond.
- SubjectScene : source, fond, sujets indépendants (chacun mini-Pattern JSON), position, taille, visibilité, couleur, verrouillage, ordre.
- Pattern.subjectScene : propriété optionnelle ; les anciens projets ne sont pas migrés, modifiés ou perdus.
- recomposeSubjects : sorties native Pattern, compatible grille, calculs de fils, PDF et JSON existants.
- affectedBounds : recalcul partiel des cases de l'ancien et du nouveau rectangle d'un sujet ; lecture de sprites mise en cache (20 éléments).
- subjectLibrary : bibliothèque privée sur cet appareil. Conservation de la provenance et usage personnel, aucun achat ou publication.
- SubjectWorkspace : panneau du CompositionStudio existant, déplacement direct, duplication, fusion, séparation rectangulaire, DMC, réordre, masquage, export.
- Palettes de composition : originale, harmonisée, personnalisée, complémentaire, douce, contrastée. Correspondances approximatives vers des fils DMC existants.

### Invariants

La source est sérialisée avec le lecteur/écrivain JSON natif, avec les codes DMC. Le fond conserve les petites parties non retenues comme sujet. Les points arrière et fractionnés suivent les sujets. Le PDF et la grille consomment le même Pattern recomposé. Une disparition explicite (élément caché ou hors-grille) demande confirmation.

L'ordre des sujets règle les superpositions : contrairement aux cartes de régions de V1, il change ici les zones visibles du motif.

## Démonstration multi-sujets

La scène originale (subjectDemo) contient un oiseau, une fleur et une maisonnette sur 120 × 75 cases, plus des détails isolés.

La recette automatisée teste :
1. Un tableau de pixels RGBA obtenu depuis la scène colorée.
2. Le convertisseur DMC existant quantizePixels, sans anti-confettis destructif.
3. L'extraction de trois sujets distincts.
4. La recomposition exacte, case par case, des croix DMC.
5. Le déplacement, retour, visibilité, ordre, fusion, séparation, duplication, recoloration.
6. Le suivi des demi-points, quarts de points, points arrière et progression.
7. La recomposition locale identique à une recomposition totale.
8. La sauvegarde/réouverture JSON de tous les sujets et la génération du PDF natif.

Les labels « Oiseau / Fleur / Maisonnette » sont attribués dans la démonstration en fonction de coordonnées connues ; ils ne sont pas le résultat d'une IA de vision.

## Matrice de validation

| Demande | État |
|---|---|
| Import universel image/PDF | Connecté aux lecteurs existants, tests navigateur réels encore requis |
| Reconnaissance des objets | **Non réalisée** : groupes géométriques, sans classification sémantique |
| Extraction d'éléments | Opérationnelle pour groupes séparables et sélections rectangulaires |
| Points de croix/arrière/fractionnés | Données préexistantes extraites et recomposées ; génération artistique avancée partielle |
| Anti-confettis | Protection existante + résiduel conservé |
| Contours intelligents après déplacement | Contours associés déplacés ; recalcul de nouveaux contours aux chevauchements à développer |
| Palettes | Six choix via correspondances DMC, rendu physique à vérifier |
| Éditeur de calques sujets | Déplacement, visibilité, taille, couleur, duplication, fusion, séparation, réordre |
| Recomposition dynamique | Native et déterministe ; zones de points recalculées localement, ornements globalement |
| Bibliothèque | Locale, personnelle, réutilisable, sans synchronisation |
| Boutique | Future, non implémentée ; vérifier les droits de propriété intellectuelle |
| Source de vérité unique | Pattern natif pour rendu, statistiques et export |
| Performance | Cache des composants et rectangle invalidé ; plafonnement 250 000 cases |
| Recette réelle | Tests automatisés, navigateur et impression réels non encore validés |

## Prochaines étapes prioritaires

1. Ajouter un vrai modèle de segmentation d'instance avec masques d'objets et score de confiance vérifiable. Pour les sources ambigües : proposer une sélection manuelle, ne pas fabriquer un label.
2. Travailler sur les masques haute définition **avant** réduction DMC, afin de conserver yeux, becs, pétales, nervures et dégradés.
3. Recalculer les contours utiles sur les nouveaux contacts entre objets, avec propositions réversibles. Ajouter quarts et trois-quarts de points réellement justifiés.
4. Sélection par lasso, contrôle tactile accessible, profilage iPad, tests de réimport PDF et comparaison grille/PDF imprimé.
5. Pour commercialiser des composants, séparer droits personnels et droits de redistribution, créer des licences et un parcours de paiement distinct.

## Livraison

PR #9 en brouillon, empilée sur la PR #8. La branche main est inchangée. Un succès GitHub Actions ne signifie pas que le navigateur ou la broderie physique a été testé. L'aperçu Vercel peut rester bloqué par le quota de builds.

**Conclusion : preuve technique de sujets séparables et recomposables, pas moteur universel sémantique terminé.**

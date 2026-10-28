# POINTZERO — Composition florale et stock réel, recette V1

## Portée de cette étape

Évolution non destructive fondée sur le compositeur (#8) et les sujets autonomes (#9). Le moteur ne prétend pas reconnaître sémantiquement toutes les fleurs ou tous les objets : la fixture florale est dessinée et nommée par son code de test.

## Audit de l'existant et réutilisation

| Besoin | Socle utilisé |
|---|---|
| Sujets indépendants | SubjectScene, subjectEngine et mini-Patterns |
| Grille et points | pattern.ts : croix, demi-points, quarts, points arrière et ornements |
| DMC et couleurs | dmc.ts, colorScience.ts et CIEDE2000 |
| Quantités | computeStats, mêmes formules que l'export PDF |
| Import images et PDF | AutomaticImageImport, PdfPrep (préservés) |
| Export et enregistrement | buildPdf, toObject et fromObject (source de vérité Pattern) |

## Démonstration

Le nouveau module floralComposition contient **3 fleurs, 4 feuilles, 1 branche, 1 oiseau facultatif**, conçus comme mini-patrons natifs DMC sur une grille 150 × 95.

- Déplacement, fusion, duplication, masque, recolorisation et ordre avant/arrière par le moteur de sujets existant.
- Les croix, fractions et points arrière cachés par un élément situé devant sont occultés dans la recomposition, sans détruire le sprite derrière.
- Mode profondeur naturelle ou renforcée : contours d'appui proposés seulement sur les chevauchements détectés, plafonnés et désactivables. Pas de contour systématique entre toutes les couleurs.
- Suggestions facultatives de feuilles selon la place disponible, puis suppression individuelle ; aucune prétention à une compréhension IA botanique.
- Recalcul ciblé de la zone modifiée ; comparaison automatique recomposition locale/intégrale. Ornements recalculés globalement pour la cohérence.

## Profil et stock de fils

Le profil privé contient marque, codes favoris, style, niveau, couleur maximale, dimensions, comptage de toile et budget temps facultatif. L'inventaire DMC conserve écheveaux entiers et métrage restant (sur six brins). Un écheveau standard contient 8 m à six brins ; les quantités sont converties en mètres de brin simple pour la comparaison avec les estimations de computeStats. Aucun autre fabricant n'est remplacé par une table imaginaire.

Les variantes Original, Mes fils, Débutant, Expert, Palette réduite et Petit format (à ajuster) sont dérivées du même Pattern. Les substitutions tiennent compte du stock et de la distance de couleur, avec alerte de quantité insuffisante, perte de contraste et écart important. PDF et JSON exportent exactement le modèle présenté. La source originale et la scène éditable restent disponibles dans le projet.

La variante Petit format **ne change pas silencieusement les dimensions** : un redimensionnement à vérifier dans l'Atelier reste nécessaire. Les préférences stylistiques et le budget temps sont enregistrés ; la génération de style artistique et l'estimation personnalisée du temps restent à développer.

## Boutique future

adaptiveCatalogue prépare six variantes depuis un patron couvert par les droits appropriés. Un fichier personnel ou sans autorisation commerciale revue n'est pas publiable. Aucune publication, facturation ni transaction ne sont activées par cette PR.

## Critères validés ou partiels

| Critère | État |
|---|---|
| 3 fleurs + 4 feuilles + branche, oiseau optionnel | Codé, testé |
| Avant/arrière, canaux de points et occultation des contours | Codé, testé, recette visuelle requise |
| Profondeur facultative | Codée, proposition géométrique, validation visuelle requise |
| Ajout facultatif et retrait de feuilles | Codé, testé |
| Stock DMC, quantités et profil local | Codé, testé |
| Palettes limitées au stock | Codé, testé avec 4 fils |
| Débutant, expert, petit format, contraintes temps | Partiel : palette et alertes, géométrie et temps non automatisés |
| Boutique sur mesure | Adaptateur en mémoire, aucune vente |
| JSON et PDF fondés sur le Pattern adapté | Codé, testé ; contrôle impression à faire |
| Import image/PDF et anciens projets | Préservés, vérification navigateur à faire |
| Reconnaissance botanique universelle par IA | Non réalisée |
| Installation sur Vercel et recette iPad | Non confirmées, limite de builds antérieure |

## Prochain développement prioritaire

Intégrer la segmentation de sujets sur images haute définition **avant** la réduction DMC, avec masques et validation humaine, puis évaluer les contours et les points fractionnés sur un vrai bouquet sous différents formats. Ensuite seulement, envisager une bibliothèque synchronisée et une boutique commerciale avec licences vérifiées.

**Livraison : PR #10 en brouillon, empilée sur #9 et #8. La branche main n'est pas modifiée.**

# POINTZERO — Rapport de composition intelligente V1

## Mission et périmètre

Le projet passe d'une simple conversion d'image vers une **composition assistée déterministe**, avec conservation explicite de la source. Cette V1 ne prétend pas interpréter sémantiquement un objet. Les « cartes » représentent des régions connexes en couleurs DMC, pas des yeux, ailes ou feuilles automatiquement reconnues.

Le développement est effectué dans la branche `feat/composition-intelligente-v1` et la PR #8 en brouillon, sur la base `feat/beel-complete-dmc-import`. Aucune modification directe de `main`. Les projets déjà enregistrés ne sont pas migrés automatiquement.

## 1. Audit des fonctions réutilisées

| Module existant | Rôle actuel et intégration |
|---|---|
| `lib/convert.ts` / `conversion.worker.ts` / `quantize.ts` | Réduction progressive d'image, DMC, exécution worker + repli, anti-confettis conservé |
| `lib/dither.ts` | Dithering pour les images générées, non réécrit |
| `lib/pdfAnalysis.ts`, `pdfVector.ts`, `pdfGlyphChart.ts`, `components/PdfPrep.tsx` | Reconnaissance et mosaïque de pages PDF, calibrage manuel déjà présent ; reste le point d'entrée PDF |
| `lib/chartRecognition.ts` / `components/ImportStudio.tsx` | Recalage expert de grilles photographiées, mode manuel disponible |
| `lib/dmc.ts` / `colorScience.ts` | Références DMC et distance perceptuelle CIEDE2000 (approximations écran) |
| `lib/pattern.ts`, `stitch.ts`, `editing.ts` | Source de vérité pour croix, fractions, contours, ornements, calques, sauvegarde |
| `lib/pdf.ts`, `components/ExportStudio.tsx`, `lib/io.ts` | Export depuis le Pattern natif, sans moteur PDF alternatif |

## 2. Architecture V1

```
Image → conversion DMC existante ─┐
PDF → PdfPrep existant ────────────┼→ Pattern source
Texte → PromptStudio existant ────┘     │
                                       ▼
                               composition.ts
                               1. Régions colorées
                               2. Remapping DMC
                               3. Confetti protégé
                               4. Propositions contours
                               5. Demi-points experts
                                       │
                                       ▼
                            CompositionStudio (Atelier)
                            3 variantes · cartes · aperçu
                                       │ confirmation
                                       ▼
                            Pattern natif + source JSON
                                  │          │
                              Atelier      PDF/JSON
```

- Une composition n'est validée que par « Utiliser cette version ».
- La source d'origine est inscrite dans l'option `Pattern.composition.source` lors de la génération d'un **nouveau** projet (nouvel identifiant).
- Le détail, la palette, la difficulté, les dimensions, le comptage de toile et les états des cartes sont conservés dans `Pattern.composition`, y compris au réimport JSON.
- Aucun moteur automatique ne modifie silencieusement l'original stocké.
- Réduction dimensionnelle : avertissement et confirmation obligatoire.

## 3. Choix des points et garde-fous

- **Croix :** utilisation des cases DMC natives.
- **Points arrière :** uniquement propositions de petits groupes foncés fortement contrastés. Scores de confiance indicatifs, *non statistiques ni garantis*. Les point arrière source demeurent.
- **Points fractionnés :** réutilisation des quarts et demi-points source ; ajout potentiel de demi-points de raccord dans des cases vides en variante « Précis + Expert ». Il ne s'agit pas encore d'une proposition générale de trois-quarts de point.
- **Confettis :** appel à `removeConfetti` existant sur une copie, puis rejet des suppressions de cases et des substitutions très contrastées. Des petits détails importants peuvent encore nécessiter la vérification humaine.
- **Nuances :** compression par fréquence et couleur perceptuelle ; variantes originales/harmonisées/personnalisées. DMC ne fournit pas de RGB officiel garanti.
- **Régions :** connexité à quatre voisins, même code couleur. Ne pas prétendre avoir détecté un œil, un bec, une aile, une feuille ou une forme sémantique.
- **Cartes :** réordonnables, renommables, masquables, recolorables. L'ordre de liste n'affecte pas le rendu ni les couches physiques de couture. Les ornements sont associés géométriquement, avec avertissement de vérification.

## 4. Premier cas oiseau

Un oiseau botanique de **test original** est fabriqué dans `src/__tests__/composition.test.ts` : silhouette, aile, tête, points d'œil, bec doré, branche, feuillage et baies. Il ne reproduit pas le patron Etsy ni une création protégée.

Recette testée :
- Simple / Équilibré / Précis : palettes réellement distinctes sur le jeu de données synthétique.
- Conservation des cases de l'œil, du bec, de l'aile et des feuilles à dimensions identiques.
- Contrôle anti-disparition des croix ; la source reste immuable.
- Ordre des cartes n'altère pas le dessin.
- JSON conserve la source et les réglages ; conversion inverse testée.
- Export PDF issu du même `Pattern` que l'aperçu ; PDF effectivement généré dans le test.

**À faire :** comparaison visuelle source/résultat avec l'oiseau premium de référence, essai sur de vraies grilles (couleurs aplaties, demi-points et objets superposés), impression physique et contrôle de la qualité des points arrière.

## 5. Matrice des critères d'acceptation

| Critère demandé | État V1 |
|---|---|
| Import image | **Codé** : entrée automatique, conversion DMC existante ; navigateur réel à contrôler |
| Import PDF éditable/aplati | **Réutilisé** via PdfPrep ; fiabilité selon fichiers, recette multipage encore nécessaire |
| Génération au centre de l'Atelier | **Codé** : `CompositionStudio`, pas de retour à l'accueil |
| Régions principales reconnues/préservées | **Partiel** : composantes colorées, pas d'identification sémantique |
| Points arrière pertinents | **Partiel** : petits contours contrastés, contrôle visuel et scoring à affiner |
| 3 niveaux réellement différents | **Test automatique réussi** sur oiseau synthétique multicolore |
| Confettis sans disparition des détails | **Garde-fous codés + test** ; validation de brodeuses encore requise |
| Grille identique au PDF | **Source native commune** ; comparaison raster du PDF imprimé non réalisée |
| Paramètres après génération | **Codé** : recette conservée + réouverture JSON ; édition libre de l'Atelier possible |
| Sauvegarde et ouverture | **Test JSON réussi** |
| Non-régression | `npm run verify` (tsc, vitest, build) exécuté sur la PR ; résultat à consulter dans GitHub Actions |

## 6. Limites non résolues

1. **Reconnaissance sémantique** (yeux, bec, ailes, objets) : modèle de vision, masques/annotations et évaluation manquent.
2. **Analyse directe des dégradés avant réduction DMC** : la V1 travaille surtout sur une grille déjà quantifiée.
3. **Arrière-points d'artiste** : contour vectoriel sémantique et lissage géométrique hors périmètre de cette V1.
4. **Points fractionnés avancés** : proposition de quarts et trois-quarts spécifiques à la morphologie des objets à développer.
5. **Couches sémantiques** : les cartes actuelles sont une aide au travail, pas des sous-calques brodés complets indépendants.
6. **Impression et validation visuelle** : aucune preuve utilisateur complète sans recette sur navigateur, PDF rendu et broderie physique.
7. **Sécurité / performance** : composition automatique limitée à 250 000 cases pour éviter le gel de l'interface ; calibrage performance iPad à faire.
8. **Licences** : les PDF tiers restent soumis à leurs droits ; la conversion ne transfère pas la propriété d'un motif.

## 7. Prochaine itération

Ajouter une vraie analyse d'image structurée avant quantification, une couche sémantique assistée et validée par l'utilisateur, puis une suite de tests de référence incluant l'oiseau premium et plusieurs PDF réels. Les algorithmes doivent continuer à travailler sur des masques et des propositions réversibles, pas sur une image aplatie réécrite arbitrairement.

**Conclusion :** première V1 de composition exploitable en recette technique, **pas validation de l'intégralité de la mission**.

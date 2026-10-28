# Atelier commun et Zoom Code — recherche et prototype limité

Base #50 `009c506`, protections/ressources/contraintes conservées. Aucun remplacement de Studio, nouvelle clé de stockage ou changement production.

## Éditeurs professionnels : références et limites de l'étude

Framer documente Pages/Layers/Assets à gauche, canevas, inspecteur à droite, sélection hiérarchique et breadcrumb ; aperçu distinct de publication. Les composants/styles partagés n'impliquent pas que toutes les instances doivent perdre leurs adaptations locales. Vérifier des largeurs intermédiaires, l'ordre de lecture et non seulement des cadres nommés iPhone/iPad.
Sources : https://www.framer.com/academy/lessons/framer-interface et https://www.framer.com/academy/lessons/framer-fundamentals-interacting-with-layers . Étude documentaire, pas utilisation du logiciel ni benchmark visuel/collaboratif. Les principes Affinity déjà documentés restent complémentaires (disciplines, même document).

## Audit de la grille existante et cible

FragmentCollection v1 : cartes plates, span 1–4, cadrage, verrou, drag/drop, édition texte, exports. #50 apporte des contraintes content-first et un adaptateur Design courant. Pas d'arbre imbriqué, snapping géométrique, commandes undo, owner authentifié ou droits serveur. La mise en page export et l'éditeur restent des présentations différentes. Tokens et CSS sont partagés, pas un modèle physique de tissu.

Cible : shell d'Atelier → explorateur/versions/sources → sélection de ressource → moteur propriétaire au centre → inspecteur par type → projection/preview → export/publication séparée. Un contrat de sélection transporte id/type/version/source ; commandes typées et validées fournissent proposition/diff/commit/undo. Les moteurs peuvent refuser une conversion. Mon Espace reste le dossier/projet et les autorisations, pas un deuxième éditeur.

| Actuel | Mutualiser dans le shell | Ne pas aplatir |
|---|---|---|
| Métamorphose/fragments | explorateur, sélection, modes, contraintes | scanner statique et erreurs réseau |
| Mini-site/Academy | sections, tokens, preview/export, références | sémantique web/exercices |
| Design/UX maquette | inspecteur et ressources | coordonnées XY/SVG, calques et transformations |
| Broderie/Atelier | commandes, sélection, source et versions | points typés, densité, DMC, mémoire optimisée |
| Documents | propriétés et fichiers | calculs monétaires/règles métier |
| Design System | tokens versionnés, références | profils personnels/accessibilité et projets |
| Mon Espace | contexte du projet et ressources autorisées | identité, permissions futures et historique canonique |

Fusion proposée : enveloppe et contrats, pas déplacer/renommer tous les Studios. Aucun composant générique ne remplace leurs moteurs dans cette PR.

## Correspondance broderie / numérique

- Point compté = coordonnée discrète et geste à réaliser ; cellule web = région de layout pouvant se redimensionner. Correspondance d'identité et placement, pas égalité des dimensions.
- Croix/demi/quarts/arrières/nœuds = types de primitives dans Pattern, avec géométrie et métrique distinctes. Un rectangle SVG peut représenter une croix coloriée, il ne remplace pas ses instructions et ne devient pas bouton.
- DMC = référence de matériau ; token = rôle sémantique ou valeur de design. Ne pas modifier un fil pour satisfaire automatiquement un contraste UI. Données craft-color-codes CC BY 4.0 utilisées par le moteur ; RGB approximatifs, pas table RGB officielle DMC. Vérifier sur nuancier physique.
- Symboles = index de légende/diagramme, pas pictogrammes de navigation. Rendu partagé Canvas/PDF/SVG déjà existant dans symbols/pattern/svg.
- Calques/superpositions/masques = ordre/projections ; patron exige visibilité effective des points et conservation des fractions/contours. CSS stacking n'est pas un calcul de métrage.
- Répétitions/motifs = instances et transformations ; la recomposition géométrique doit rester distincte du responsive de texte.
- Count (points/pouce), dimensions et brins = propriétés physiques ; responsive viewport/zoom n'a pas de correspondance automatique. Une largeur CSS n'est pas une taille de toile.
- JSON natif/OXS/SVG/PDF existants ne sont pas interchangeables sans pertes. HTML peut incorporer un rendu graphique ; il ne transporte pas automatiquement instructions, droits ou comportement.

Hypothèse retenue : identité, références et commandes partageables, rendus spécialisés. Pas un schéma universel supplantant Pattern/WorldSpace.

## Prototype livré

Dans Métamorphose, volet **Recherche expérimentale — Zoom Code** : Pattern 8×8 fictif créé par createPattern existant, 12 croix initiales, mêmes références FLOSS et exports patternToSvg/toObject. Aucun magasin nouveau, aucune lecture/écriture de créations privées.

1. Sélectionner une cellule (boutons avec coordonnées accessibles).
2. Comprendre son rôle, consulter fil et position.
3. Saisir une référence DMC ou vider, prévisualiser la conséquence (nouveau Pattern dérivé), puis confirmer. Une seule cellule croix change, même id de Pattern.
4. Consulter JSON structuré de la cellule (id dérivé stable Pattern/type/index), pas code d'un site inspecté.
5. Le SVG généré est incorporé dans une page HTML responsive ; aperçu sandbox à 390/768/1200. Avant confirmation, il montre la proposition ; après, il relit la source confirmée.
6. Annuler/rétablir : snapshots en mémoire, 20 étapes de retour ; fermeture/remontage réinitialise la démonstration.
7. Exporter JSON natif réouvrable, SVG vectoriel, page HTML statique. Pas d'export machine de broderie promis. Pas d'édition de HTML/JS libre.

Le SVG est la création graphique et la page est une projection graphique web. Cette PR ne l'insère PAS dans un MiniSite persistant ni DesignDocument, ne génère pas d'interaction ou publication et ne synchronise pas une ressource du Dossier. Les primitives autres que croix restent dans les moteurs existants mais ne sont pas éditées par cette démo. Code JSON en lecture seule ; édition via propriétés validées seulement.

## Origine vérifiée du manifeste « Le temps retrouvé »

`git log -- src/components/ManifestLanding.tsx` remonte à `cf2634a` (feat(manifest): full editorial landing...). À cette révision, imports : React, Lucide, launchManifest et ManifestLanding.css ; pas fragmentGrid/compositionLayout/FragmentGridWorkspace. Son composant visuel utilise sa propre grille et feuille CSS. Le moteur compositionLayout partagé arrive plus tard. La landing n'utilisait donc PAS techniquement les règles de Métamorphose à son introduction. L'antériorité des conversations ChatGPT n'est pas déductible du Git ; aucune attribution personnelle fabriquée.

ManifestLanding.css traite hero, grille narrative et cartes à ses propres breakpoints ; grille éditoriale ≠ Pattern et ≠ collection de fragments. Landing préservée, pas de remplacement. Comparatif visuel avant/après non effectué faute de navigateur autorisé.

## Traçabilité, confidentialité et futures étapes

Pattern conserve son id et ses données ; la cellule reçoit une identité de projection, pas une nouvelle ressource canonique persistante. Le prototype ne possède pas d'owner/permissions authentifiés : il n'importe que sa fixture. #50 garde ses refus d'export des références Design privées. Pas de publication ajoutée. Les futurs tokens liés devront préciser version/fallback/custom/accès ; une suppression ou version inconnue bloque plutôt que substituer silencieusement. Restaurer du code ne restaure pas automatiquement un magasin utilisateur.

Tests : validité référence/index, mutation d'une seule cellule sans altérer source, id conservé, aller-retour JSON, SVG/HTML, projection réactive, confirmation, annulation/rétablissement, zéro sauvegarde, sandbox. Pas de rendu visuel réel : vérifier zoom 200%, orientation, clavier, grandes polices, écran étroit et UI de Métamorphose avant adoption. Aucun navigateur ou outil de capture disponible ; JSDOM n'est pas une preuve d'absence de débordement.

Suite : extraire commandes/historique réutilisables sans migration ; intégrer sélection commune ; adaptateurs vers ressources déjà gardées ; Mini-site par référence privée avec confirmation ; vrais tests navigateur puis seulement fusion des enveloppes. Prototype expérimental non destiné à remplacer l'Atelier complet.

Validation locale : 473/473 tests applicatifs (65 fichiers), 7/7 tests Node, TypeScript et build/manifeste hors ligne. Les deux nouveaux tests ciblés passent séparément (dont boucle visuel → propriétés → confirmation → annulation → rétablissement et aucune écriture). Audit npm : 0 alerte connue. Après ajout du champ SVG généré en lecture seule, TypeScript et tests ciblés repassés ; CI à vérifier sur SHA publié. La validation responsive/visuelle réelle reste explicitement non effectuée.

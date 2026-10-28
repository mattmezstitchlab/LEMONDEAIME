# Lot direction artistique — accueil AIME immersif

Base : lot sécurité `579d435`, empilé sans fusion. La route `/` conserve son identité AIME ; `/pointzero`, Atelier, Univers, Dossier, association et fiches restent accessibles.

## Direction réalisée

Six séquences : personnes reliées, intention → dossier, instruments créatifs, source → projections, relations (vision explicitement non disponible), continuité du temps. Palette lumineuse minérale/végétale, grandes typographies, visuels pleine largeur et espaces généreux. Aucune banque d'images, image générée payante, font distante ou librairie d'animation.

`public/aime-connections.svg` est une illustration originale créée pour ce lot, couverte par la licence du dépôt. Texte/visuel séparés pour la lisibilité. Dimensions déclarées et description accessible ; visuel d'ouverture prioritaire, rendus produit différés. Les rendus Design et Mini-site utilisent les fonctions réelles existantes sur des exemples fictifs, sans persistance. Le texte les identifie comme rendus, pas captures d'écran ni génération automatique. L'iframe est isolée par sandbox sans permissions.

Le parcours d'intention illustré reste une démonstration éditoriale ; le CTA ouvre le vrai Dossier Universel. Pas d'annonce d'IA, partage sécurisé ou publication automatique. La lettre fondatrice est conservée dans un volet dépliable au lieu d'allonger l'entrée principale. Pages détaillées inchangées.

## Tests et limites

Tests DOM : six séquences, titre unique, états prototype/vision, images décrites/dimensionnées, sandbox, contenu du moteur Mini-site, navigation manuelle et aucune écriture lors du rendu. Tests d'architecture existants conservés.

Pas de navigateur autorisé pour contrôler visuellement. Le code responsive n'est pas une preuve de mise en page impeccable. Recette obligatoire avant acceptation :
- 390, 430, 768, 1440 px : pas de débordement horizontal, CTA sans troncature, aperçu cohérent.
- Zoom 200 %, clavier, lecteur d'écran, contrastes, focus et volet de lettre.
- Mouvement réduit, image désactivée, connexion lente, chargement différé des rendus.
- Liens /espace, Atelier, Studios, Univers, association et dossier.
- PWA : accès après installation ; illustration distante de l'origine mise en cache seulement après chargement, pas une promesse d'image toujours disponible hors ligne.

Prochaine tranche : références/projections et démonstrateur mariage, UX des cibles techniques, puis chargement différé des Studios. Aucun backend ni service payant ajouté.

Validation locale finale : 452/452 tests applicatifs (58 fichiers), 6/6 tests serveur/PDF, TypeScript, build et contrôle hors ligne réussis. Le contrat historique « LETTRE OUVERTE » est conservé dans le volet des principes, sans suppression d'assertion. Recette visuelle non effectuée.

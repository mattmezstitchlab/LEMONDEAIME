# Socle visuel canonique — comparaison et première extraction

## Sources vérifiées

- Projet Vercel exact : **lemondeaimedesignsystem** (et non lemondeaimeedesignsystem). Dépôt `mattmezstitchlab/lemondeaimedesignsystem`, main `3634a313ddc5adabbf92b0f4cd4b58eef5b8cbb1`, production Ready `dpl_2guZyoETN9oFHK2P569Ju7CStfFX`.
- Laboratoire statique sans package.json : `index.html`, `design-system.css`, `design-system.js`, `component-lab.js`, archive intacte `index 9.html`, `DESIGN_SYSTEM.md`. Branches historiques : design-system-lab (#1), copilot/refonte-page-design-system (#2), design-system-chromatique (#3) ; les trois PR sont fusionnées dans main. Pas de package partagé, API métier ou imports React. Les sauvegardes/publications du laboratoire sont simulées en mémoire. Ses photos externes n'ont pas de licence d'exploitation démontrée. Ne pas les réutiliser.
- POINTZERO : base de cette tranche PR #46 `c194b17`, production antérieure main `ecc686f`, deux versions différentes. Aucun lien de données/composants entre les deux dépôts.

## Direction comparée

Lab : DM Sans / Manrope, #161616, #62666b, blanc/#f7f8f8, pétrole #164c70, turquoise #12b5b4 et vert d'eau #b0e4d0. Boutons noirs arrondis, gradients signature réservés aux accents. La référence du Lab est extraite de son CSS courant ; des passages de sa documentation mentionnent encore un ancien accent lime. Le CSS courant prévaut.

POINTZERO : `index.css` Tailwind (bleu iOS/sombre), préférences dans `accessibilityCore.ts`, `AimeEcosystem.css` ancien mauve/éditorial puis #45 végétal, `ManifestLanding.css` blanc/noir, AimeLanding/ArtWorld autres thèmes. StudioFrame et Design ont des contrôles sombres codés en dur. MiniSite et Academy ont chacun leurs modèles et couleurs de projet. Documents utilise des sorties Arial/noir, Design exporte du SVG, pas une interface responsive.

Le panneau Design System dans AccessibilityStudio produit un ramp d'accent et des exports JSON. `savePrefs/applyPrefs` applique thème, taille, contraste, mouvement et accent via attributs/variables `pz-*`. Il ne remplace pas les couleurs de projet, les CSS des landings ou celles des HTML exportés. Plusieurs couleurs codées en dur contournent ces variables. Il ne s'agissait donc pas d'une bibliothèque transversale complète.

## Ancienne landing versus #45

Comparer `579d435...7c60582` : anciens hero AIME typographique, signature, lettre ouverte dominante, trois époques, architecture à trois niveaux et invitation ont été remplacés par six séquences intention/produit/source/relations/temps. La lettre est conservée dans details ; la signature et les routes restent présentes. Les époques et les trois niveaux ne sont plus présentés de la même façon. Tous restent récupérables par Git, sans reset.

À conserver : nouvelle rédaction centrée sur l'intention, honnêteté prototype/vision, accès Atelier, Dossier et rendus réels. À réexaminer visuellement : identité typographique de l'ancien hero, hiérarchie AIME/Univers/POINTZERO et sobriété. Pas de restauration automatique de tout l'ancien CSS ; cela réintroduirait un thème concurrent.

## Tranche réalisée : une source, plusieurs consommateurs

`src/design/tokens.json` = source versionnée 1.0.0 avec provenance exacte du Lab. `designSystem.ts` génère variables/export CSS isolé ; pas de copie du CSS global du laboratoire. `src/design/components.css` contient primitives opt-in bouton/champ/panneau. Aucun stockage supplémentaire ni mutation de préférences.

Consommateurs actuels :
- DesignFoundation dans le Studio Design System : palette canonique, test clair/sombre non persistant, contrastes, exports JSON/CSS, distinction profil personnel/marque.
- AIME et POINTZERO : variables/scopes de marque, typographie avec replis, boutons ; première connexion, pas suppression de tout le CSS historique.
- Nouveaux Mini-sites : designVersion 1.0.0 optionnel, thèmes existants couleurs conservées, composants éditoriaux, grands hero et média pleine largeur. Les anciens sans designVersion conservent leur CSS historique. Une version inconnue est refusée par le validateur, jamais migrée silencieusement.
- Academy : reçoit les variables canoniques dans l'export, mais garde ses couleurs et choix serif/sans ; adoption des composants différée.
- Les autres Studios et Documents ne sont PAS déclarés entièrement migrés. Leurs données créatives restent intactes.

Les polices sont référencées avec fallback Arial ; aucun chargement Google Fonts ni binaire ajouté. Leur présence réelle n'est pas garantie. Auto-hébergement des fontes à licence vérifiée est une tranche à valider.

## Priorités et séparation des niveaux

Marque immuable versionnée → variante Studio → personnalisation du projet → contraintes d'accessibilité. Les choix couleur/typographie enregistrés d'un projet ne sont pas remplacés lors d'une ouverture. Les tokens ne sont pas des préférences d'utilisateur. Les préférences de confort restent dans la clé existante et conservent leur validation. Les nouveaux scopes respectent le mouvement réduit et étendent le confort texte aux landings ; pas de promesse de conformité RGAA.

Version future : publier un contrat de tokens et composants ; proposer une migration explicite en aperçu, exporter le projet avant application, ne jamais réécrire au montage. Cette première extraction est un snapshot sourcé dans POINTZERO, pas une synchronisation automatique entre dépôts. Le Lab demeure la référence visuelle historique ; la source technique utilisée par POINTZERO est ce manifeste. Un package partagé ou une distribution synchronisée entre dépôts nécessite une prochaine décision, pas un CDN mutable chargé en production.

## Représentations honnêtes

Le bandeau des rendus #45 disait « POINTZERO / Atelier ». Malgré sa légende, il pouvait passer pour la vraie interface. Il indique désormais explicitement « Rendus exportés · Design / Mini-site » et « Ce panneau n'est pas l'interface de l'Atelier ». Les contenus sont produits par les vrais renderers ; pas de capture fabriquée. Aucun visuel du Lab n'est copié.

## Routes et miniature Vercel

La production POINTZERO (`pointzero-zeta.vercel.app`) reste sur ecc686f : ancien Atelier à la racine ; le nouveau routeur AIME ne s'y trouve pas. La miniature du Dashboard représente le déploiement de production, pas la preview active et pas une garantie de capture fraîche. La preview #46 (commit c194b17) sert AIME à `/`, le manifeste POINTZERO à `/pointzero`, l'Atelier à `/atelier`, le dossier métier à `/espace` et le dossier éditorial à `/dossier`. Cette nouvelle PR a sa propre preview. Ne pas interpréter un changement de miniature comme une promotion ou un changement de route. Aucune production modifiée.

## Recette et suites

Tests de tokens, contraste, export isolé, absence d'écriture, version de projet et préservation des personnalisations. TypeScript, suite complète et build. Aucune recette visuelle réelle dans cette session : pas d'outil navigateur autorisé. Vérifier 390/768/1440 px, zoom 200%, focus, contraste, images absentes/grandes images, iframe sandbox et aperçu/export identiques. Les polices fallback doivent être acceptables.

Étapes restantes : primitives de navigation/formulaires/cartes/hero partagées, adaptation StudioFrame et Design, surfaces sombres, Documents/Print, thèmes Mini-site premium plus riches (vraies images autorisées, sections médias, variantes), cohérence complète des landings après validation visuelle du socle. Ne pas annoncer cette première tranche comme un design system intégralement déployé.

Validation de cette tranche : 461/461 tests applicatifs (60 fichiers), 6/6 tests serveur/PDF, TypeScript, build et manifeste hors ligne réussis ; après les derniers ajustements de préservation legacy et tokens Academy, 13/13 tests ciblés et TypeScript réussis. CI distante à vérifier sur le commit publié. Aucune validation visuelle réelle ni conformité complète revendiquée.

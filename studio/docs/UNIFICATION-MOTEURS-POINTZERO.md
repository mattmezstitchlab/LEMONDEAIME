# POINTZERO — architecture unifiée des moteurs (15 octobre 2026)

## Vision et principe

POINTZERO devient le site et le routeur d'un **atelier universel unique**, dans lequel les moteurs spécialisés partagent de vrais formats de données.

- **MÉTAMORPHOSE** : URL → premières observations → fragments → compositions éditables.
- **RIPPLECIRCLE** : espaces → moments / personnes → liens → propagation causale / décisions.
- **GAME** : grille colorée → nettoyage interactif → révélation → score / collection.
- **BRODERIE** : motif DMC → source de niveau jouable Game, tout en conservant le patron intact.

Ces premières intégrations utilisent les **mêmes composants et stockages de POINTZERO**, sans iframe ni seconde authentification.

## Réutilisation / absence de doublons

| Ressource canonique | Vue métier |
|---|---|
| `lib/fragmentGrid.ts` | Métamorphose et Studio Design / Grille |
| `FragmentGridWorkspace` | Les deux vues partagent le même modèle et stockage local |
| `lib/oneSpaceCore.ts` | Mon Espace, Studio Causal, nouveau cadran RippleCircle |
| `lib/confettiGame.ts` | Studio Game : moteur pur, déterministe et testable |
| `lib/gameFromPattern.ts` | Adapte en lecture seule les cellules DMC du motif courant au format visuel Game |
| `StudioFrame` | Cadran et Game reprennent le même cadre, la navigation et l'inspecteur |
| `App.tsx` / `DesignStudio.tsx` | Routeur et menu Studios uniques |

## Sécurité

L'API `api/metamorphose-scan.mjs` nécessite `POINTZERO_SCAN_ACCESS_CODE` **sur le serveur Vercel**. Le navigateur demande un code correspondant, sans enregistrer celui-ci dans le projet.

- Une seule page par demande ; HTML statique limité à 1 Mo.
- URLs HTTPS publiques seulement, résolution DNS et refus des adresses IPv4 privées/réservées, IPv6 non prise en charge.
- Aucune redirection externe suivie, pas de login ni d'exécution JS.
- Heuristiques de liens / structure uniquement ; aucune validation de conformité juridique, RGPD, sécurité ou accessibilité.
- Risque résiduel : le code secret n'est **pas une authentification d'organisation** et ne remplace pas les quotas persistants, la limitation de débit ni un pare-feu réseau. **Ne pas ouvrir publiquement le scanner commercial sans ces protections.**

L'atelier Métamorphose fonctionne **sans API ni code** pour afficher les collections de démonstration, importer ou modifier des JSON, sauvegarder localement, réorganiser les fragments et les exporter.

## Studio Game

Première version : CONFETTI 30 est jouable, sans licence commerciale et sans backend.

- 5 artistes fictifs et portraits pixellisés générés par un algorithme local.
- 30 secondes, boucle sonore Web Audio originale, compte à rebours et pause.
- Groupes de confettis adjacents, combos, score, pouvoirs WAVE / MAGNET / FOCUS.
- Zoom à la molette, pincement tactile, déplacement de caméra, révélation.
- Carte résultat PNG, record local, rejouer / niveau suivant.
- **Pont Broderie :** bouton « Jouer avec mon motif de broderie » lit uniquement le patron courant local et en construit un aperçu jouable 48×48 avec palette réduite ; aucune modification du fichier DMC.

La grille n'est **pas mathématiquement infinie** : la caméra donne une impression de continuité ; 48×48 cellules restent finies pour préserver les performances. Les chansons commerciales, portraits de célébrités et extraits iTunes ne sont pas intégrés faute de droits. Les musiques sont synthétisées localement.

## RippleCircle

Le cadran natif 2D reprend les principes de l'application source : anneaux, chronologie, nœuds, relations, effets causaux. Le nouvel écran n'importe **pas encore l'intégralité** des vues et workflows historiques du dépôt RIPPLECIRCLE : ceux-ci restent intacts et pourront être migrés progressivement. Les signaux sont enregistrés dans `oneSpaceCore` ; ils ne déclenchent **aucune notification réelle** sans consentement et infrastructure adaptée.

## Suite et recette

1. Ne pas fusionner sans CI verte et vérification des écrans sur téléphone, tablette et desktop.
2. Vérifier import/export de fragments entre Studio Design et Métamorphose.
3. Vérifier propagation des signaux dans Mon Espace / Studio Causal.
4. Vérifier gameplay 30 secondes, zoom/pan tactile, son, visuel final, patron issu de Broderie et résultat PNG.
5. Pour le scanner, configurer les secrets Vercel, tester un **site autorisé**, puis durcir sécurité réseau / quotas avant ouverture commerciale.
6. Phase 2 : portage étendu des moteurs visuels RIPPLECIRCLE, capture navigateur fiable Playwright de Métamorphose, nouvelles opérations géométriques, niveaux génératifs Game.

Aucun fichier du code existant RIPPLECIRCLE ni du dépôt AIME-METAMORPHOSE n'est modifié par cette PR. Le point de rassemblement est le dépôt POINTZERO.
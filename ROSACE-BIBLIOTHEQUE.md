# ROSACE — La Bibliothèque

État de la mission et tableau des fonctions.

## Périmètre

Cette mission est distincte des travaux de stabilisation du site LE MONDE AIME. Elle ajoute une bibliothèque de rosaces à broder (point de croix) au site existant, réutilisant le noyau patron de l'atelier Point Zéro (`studio/`) sans créer de second moteur.

Routes ajoutées :
- `/rosace` — landing et collection
- `/rosace/:id` — fiche détaillée d'une rosace

Branche de travail : `arena/6fa1efdb-lemondeaime` (jamais `main`, pas de fusion en production).

## Tableau des fonctions

| Fonction | Statut | Détail |
|---|---|---|
| Moteur 5D (Forme · Tracé · Densité · Format · Palette) | **Réelle** | `src/lib/rosace/signature.ts` — classification déterministe, 1 024 combinaisons théoriques, graine + version de générateur. |
| Génération de patron point de croix | **Réelle** | `src/lib/rosace/generateur.ts` — dessins géométriques déterministes sur grille carrée, bâtis sur `studio/src/lib/pattern.ts` (noyau Pattern de l'atelier). |
| Références DMC véritables | **Réelle** | `studio/src/lib/dmc.ts` (table `craft-color-codes`, 489 références). Toutes les palettes sont validées au chargement (`validatePalettes`). |
| Statistiques (croix, couleurs, mètres, écheveaux) | **Réelle** | `studio/src/lib/pattern.ts` `computeStats` — même modèle que l'atelier. |
| Estimation du temps | **Réale (hypothèse)** | `src/lib/rosace/stats.ts` — 45 s/croix, hypothèse d'atelier documentée, affichée comme estimation, pas comme garantie. |
| Difficulté calculée | **Réelle** | `src/lib/rosace/stats.ts` `difficulté` — critères documentés (couleurs, taille, densité, tracé), score borné. |
| Recommandation de toile | **Réelle (conditionnelle)** | `toileConseillee` — seulement justifiée à partir de 80 pts, avec raison affichée. |
| Catalogue 64 → 8 en priorité | **Réelle (8)** | Huit rosaces, une par famille éditoriale, générées par le moteur, vérifiées par tests. Les 24 puis 64 sont le parcours prévu, pas encore intégrées. |
| Moteur 5D "des centaines de variations" | **À raccorder** | Le générateur supporte nativement les variations (graine, palette, densité, taille), mais le catalogue de centaines n'est pas encore peuplé. |
| Fiche détaillée immersive | **Réelle** | `src/pages/RosaceFiche.tsx` — signature, graine, taille, croix, références DMC, quantités, toile, difficulté, aperçu de grille. |
| Cartes de bibliothèque | **Réelle** | `src/components/rosace/CarteRosace.tsx` — nom, aperçu généré, famille, palette, dimensions, couleurs, temps, difficulté, animation au survol. |
| Filtres réels (combinés) | **Réelle** | `src/components/rosace/FiltresRosace.tsx` — recherche, famille, palette, format, densité, difficulté, favoris, tri ; état conservé (sessionStorage) et cohérent à la réouverture. |
| Favoris locaux | **Réelle** | `localStorage` `rosace:favoris`, persistant. |
| Ouverture dans l'atelier (Disque) | **Réelle (transfert)** | `src/lib/rosace/transfert.ts` — écrit le patron au format natif Point Zéro v3 (`toObject`/`fromObject`) dans la clé atelier `point-zero:motif:v1`, archive l'ouvrage précédent, navigue vers `/studio/`. L'atelier retrouve la même géométrie, graine, palette, dimensions et croix. |
| Format de transfert unique | **Réelle** | Aucun second modèle de patron : bibliothèque et atelier partagent `Pattern` / `toObject` / `fromObject`. |
| Téléchargement du patron | **Réelle** | `.pointzero.json` sérialisé, importable dans l'atelier. |
| Variations reproductibles | **Réelle** | `src/lib/rosace/variations.ts` — 5 sortes (autre palette, densité, graine, aérée, grande) ; l'original n'est jamais modifié ; chaque variation a son propre identifiant. |
| Grille de points (aperçu) | **Réelle** | `src/components/rosace/GrilleRosace.tsx` — rendu canvas, toile ivoire, grilles fines, repère tous les 10 points. |
| Design : papier ivoire, textile naturel, typo noire | **Réelle** | `src/styles.rosace.css` — esthétique cabinet de création textile. |
| Accessibilité (clavier, focus, contrastes, mouvement réduit, alternatives textuelles) | **Partielle** | Focus visible, liens d'évitement, labels, `aria-*`, respects `prefers-reduced-motion`. Audit complet à prévoir. |
| Chargement progressif (plusieurs centaines) | **À raccorder** | Actuellement 8 patrons générés à la demande ; pas encore de chargement progressif / pagination pour les grandes collections. |
| Sauvegarde cloud / synchro appareils | **Non (hors périmètre)** | L'atelier ne synchronise pas entre appareils ; les copies JSON restent locales. (Conforme à l'existant Point Zéro.) |
| PR #43 / fusion du Disque | **Non touchée** | Aucun changement sur la PR #43, pas de fusion, pas de modification de production/Vercel/BDD/domaine. |

## Tests et vérification

- `npx tsc --noEmit` (site) : OK
- `npx tsc --noEmit` (studio) : OK
- `npx tsx tests/server/rosace.test.ts` : 11 / 11 OK (déterminisme, DMC valides, cohérence des stats, sérialisation round-trip, variations, transfert atelier)
- `npm test` (existants) : 13 / 13 OK
- `npm run build` (Vite) : OK

## Preview

Serveur de développement lancé sur le port 5173 (preview live). Routes : `/rosace` et `/rosace/:id`.

## PR

Une PR en brouillon doit être ouverte depuis `arena/6fa1efdb-lemondeaime`, sans fusion, vers `main`. Pas de modification de `vercel.json`, de base de données ni de domaine.

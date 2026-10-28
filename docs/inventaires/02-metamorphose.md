# Sujet n° 2 — Métamorphose : clôture

Corrections faites le 28 octobre 2026, sur les décisions validées par Matt. Les preuves sont dans `cartographie/preuves.json`. L'audit et ses résolutions se lisent dans `/systeme-nerveux` (lecture d'inspection, onglet Inventaire).

Règle suivie : ne plus ajouter, faire fonctionner ensemble. Aucun moteur métier modifié, aucune donnée existante touchée, pas de refonte graphique.

## Le constat de départ

Le nom « Métamorphose » désignait deux fonctions différentes :
- **sur le site**, l'accueil que chacun transforme pour soi ;
- **dans le Studio**, un outil qui range des fragments dans une grille.

Elles n'ont ni le même moteur, ni la même donnée.

## Problèmes confirmés et décisions

| # | Problème confirmé | Décision | État |
|---|---|---|---|
| 1 | Un même nom pour deux fonctions | « Métamorphose » reste le nom de l'accueil personnel. L'outil du Studio s'appelle « Fragments » à chacun de ses points d'entrée : en-tête, accueil du Studio, Studio Design (« Fragments · Grille »), Game, Ripple, manifeste. Moteur, route (`?studio=metamorphose`) et clé de stockage inchangés. | Résolu |
| 2 | L'analyse d'une page appelle `/api/metamorphose-scan`, qui n'est pas déployé (404 en production). Le bouton échouait sans le dire, et l'écran montrait des noms de variables serveur. | Pas de déploiement avant un audit de sécurité. L'outil affiche « Expérimental · indisponible », le bouton est désactivé, aucune requête ne part, plus aucun nom de variable n'apparaît. Fragments et compositions restent. | Résolu (l'audit reste à faire, sujet StudiO) |
| 3 | Liens du Studio écrits sans `/studio` : ouverts dans un nouvel onglet, ils menaient à « Page introuvable » | Liens et aperçu passent par `avecBase`, comme la navigation interne : l'adresse réelle est `/studio/atelier?studio=metamorphose` | Résolu |
| 4 | La date libre de la Métamorphose servait de critère au Réseau sans le dire | Gardée, et dite. Le Réseau et les fiches expliquent d'où vient la date et précisent qu'elle n'est pas la date officielle d'une union. On peut la changer, chercher sans date ou la reprendre : le choix va dans l'adresse (`?date=…`) et ne touche jamais la Métamorphose. Le panneau prévient aussi. | Résolu |
| 5 | La Métamorphose reste sur l'appareil | Choix confirmé : pas de synchronisation avec un compte ou un projet. Le lien avec une vraie union est reporté au sujet n° 3. | Décidé |
| 6 | Échap fermait le panneau sans rendre le focus au bouton | Le focus revient au bouton « Métamorphoser la page » | Résolu |

## Fichiers modifiés et dépendances

### Site

- `src/charte/Metamorphose.tsx` : une phrase sous le champ date (le Réseau la reprend ; ce n'est pas la date d'une union).
- `src/pages/LeMondeAime.tsx` : le focus revient au bouton à la fermeture.
- `src/lib/critere-date-outils.mjs` : nouveau moteur pur. Il dit quelle date chercher et d'où elle vient. Il réutilise `lireDate` (`api/_orbe-local.mjs`), sans le modifier.
- `src/lib/critereDate.ts` : le crochet du critère. Il lit la Métamorphose et l'adresse, et n'écrit que l'adresse.
- `src/charte/CritereDate.tsx` : le bandeau « Date de recherche ».
- `src/pages/Reseau.tsx` et `src/pages/FicheReseau.tsx` : affichent le bandeau. Le critère suit le lien vers une fiche.
- `src/styles.css` : `.meta-note`, `.critere-date`, dans les styles existants.

### Studio

- `AimeEcosystem.tsx`, `AimeUnifiedHome.tsx`, `DesignStudio.tsx`, `GameStudio.tsx`, `RippleCircleStudio.tsx` : libellés « Fragments ».
- `launchManifest.ts`, `aimeDomains.ts` : libellés « Fragments », et `avecBase` dans les deux premiers fichiers.
- `MetamorphoseStudio.tsx` : l'analyse fermée (`ANALYSE_OUVERTE = false`) et annoncée.
- `__tests__/aimeUnifiedHome.test.tsx` : titre de l'aperçu.

### Inchangés

- Le moteur de la Métamorphose (`src/lib/metamorphose.ts`), sa clé `aime-metamorphose` et son événement.
- Le moteur de Fragments, sa clé `pointzero:universal-fragments:v1` et `studio/api/metamorphose-scan.mjs`.
- L'API du Réseau.
- La direction artistique.

## Tests avant / après

`tests/e2e/metamorphose.py` (27 vérifications), le même fichier joué sur les deux versions :

- **Avant** (code de la PR #16) : 15 réussies, 12 en échec. Les échecs correspondent exactement aux problèmes 1, 2, 3, 4 et 6.
- **Après** : 27 sur 27.

Ce qui réussissait déjà, et qui est donc prouvé et gardé :
- l'ouverture ;
- la transformation (noms, univers, sections, ordre) ;
- la persistance après rechargement ;
- la réinitialisation ;
- la recherche par date ;
- l'absence de requête d'analyse ;
- le téléphone (panneau, Réseau).

Autres tests :
- `tests/server/metamorphose.test.mjs` (nouveau, 7 tests) : le critère de date dans tous ses cas. Il vérifie aussi par lecture du code :
  - le Réseau n'écrit pas la Métamorphose ;
  - l'analyse est fermée et absente de `api/` ;
  - aucun nom de variable n'est affiché ;
  - la clé des fragments est inchangée ;
  - les liens passent par `/studio`.
- Non-régression :
  - docks 31/31 ;
  - moments 42/42 ;
  - navigation 15/15 ;
  - système 21/21 ;
  - tests serveur 53/53 ;
  - Studio 540/540.

Limites, à dire franchement :
- Les parcours tournent sur l'aperçu local, avec des API simulées. Ils ne prouvent rien sur les vraies disponibilités en base du Réseau, qui relèvent du sujet n° 5.
- L'événement `aime:metamorphose` n'a pas de test qui l'isole : il reste « à vérifier ».

## Vérification ordinateur, téléphone, clavier

- **Ordinateur** (1440 px) :
  - panneau, Réseau, fiches ;
  - chaque lien vers Fragments, depuis l'accueil du Studio et le Studio Design.
- **Téléphone** (390 px) :
  - le panneau tient dans l'écran ;
  - le Réseau et son bandeau ne débordent pas ;
  - Fragments dit « Analyser une page · indisponible ».
- **Clavier** :
  - le bouton ouvre le panneau, le focus va au titre ;
  - Échap ferme et rend le focus ;
  - les boutons du bandeau de date sont de vrais boutons, et le champ date a son libellé.

## Dans le système nerveux

- **Nœuds** :
  - Métamorphose (accueil), Date de recherche du Réseau, Fragments (Studio) ;
  - moteur de la Métamorphose, critère de date ;
  - données `aime-metamorphose` et fragments : « vérifié » ;
  - analyse d'une page : « prévu » (non déployée) ;
  - événement `aime:metamorphose` : « à vérifier ».
- **Audit** : `deux-metamorphoses`, `analyse-sans-serveur`, `liens-sans-prefixe`, `date-partagee` (résolus) et `stockage-metamorphose` (décidé, reporté au sujet Unions).

# Sujet n° 2 — Métamorphose : inventaire (aucune modification)

État au 28 octobre 2026. Ce document prépare le sujet : rien n'a été changé. Les décisions attendent la validation de Matt.

## Le constat principal

Le nom « Métamorphose » désigne **deux fonctions différentes**, dans deux applications.

| | A. Site — « Métamorphoser la page » | B. Studio — « MÉTAMORPHOSE · Grille » |
|---|---|---|
| Ce que ça fait | Chacun transforme l'accueil pour soi : les noms à la place du titre, une date ou un lieu, un univers en tête du diaporama, les prestataires cherchés, l'ordre et la visibilité des sections. | Une source (page, HTML) devient des fragments, puis de nouvelles compositions dans une grille. |
| Interface | `src/charte/Metamorphose.tsx` (panneau) | `studio/src/components/MetamorphoseStudio.tsx` |
| Moteur | `src/lib/metamorphose.ts` : `useMeta`, `lireMeta`, `ecrireMeta`, `SECTIONS`, `DEFAUT`, `estTransformee` | Un appel serveur `/api/metamorphose-scan` + `readFragments` / `demoFragments` |
| Données | Navigateur seulement : stockage local `aime-metamorphose`, événement `aime:metamorphose`. Rien sur le serveur. | Navigateur : stockage local `pointzero:universal-fragments:v1`. Serveur : `studio/api/metamorphose-scan.mjs`. |
| Statut annoncé | En production sur l'accueil | « expérimental, scanner privé à configurer » (`studio/src/lib/aimeDomains.ts`) |

## A. Site — points d'entrée

- `src/pages/LeMondeAime.tsx` :
  - le bouton « Métamorphoser la page » (« Ma version · modifier » une fois transformée) ;
  - le bouton « Page de tous », qui remet l'accueil de tous ;
  - les boutons « Essayer leur univers » (Unions) et « Essayer cet univers » (Collections) ;
  - le registre des sections (`SECTIONS`), qui contient maintenant « Les moments ».
- Lecteurs de la même donnée hors de l'accueil :
  - `src/pages/Reseau.tsx` et `src/pages/FicheReseau.tsx` lisent `meta.date` avec `lireDate` pour chercher les prestataires libres ce jour-là.
  - La date libre de la Métamorphose (« Le 12 juin, au bord de la mer ») devient ainsi le critère de disponibilité du Réseau.
- Pas de dock dédié. Le panneau s'ouvre par-dessus l'accueil et se ferme avec Échap.

## B. Studio — points d'entrée

- `studio/src/components/AimeEcosystem.tsx` : « L'Atelier » et le bouton d'en-tête « MÉTAMORPHOSE », vers `/atelier?studio=metamorphose`.
- `studio/src/components/AimeUnifiedHome.tsx` : la carte « MÉTAMORPHOSE » et deux liens « Explorer ».
- `studio/src/components/DesignStudio.tsx` : l'outil « AIME MÉTAMORPHOSE · Grille ».
- `studio/src/components/GameStudio.tsx` et `RippleCircleStudio.tsx` : les boutons « Métamorphose ».
- `studio/src/lib/launchManifest.ts` (n° 11, « experiment ») et `studio/src/lib/entryNavigation.ts` (route `metamorphose`).

## Constats à vérifier avant toute décision

1. **L'analyse du Studio n'a pas de serveur en production.**
   - `MetamorphoseStudio` appelle `/api/metamorphose-scan`.
   - Cette fonction n'existe que dans `studio/api/`, qui n'est pas déployé : seul `api/` à la racine l'est.
   - Vérifié le 28/10 : `GET https://www.lemondeaime.com/api/metamorphose-scan` répond 404.
2. **Des liens du Studio sans le préfixe `/studio`.**
   - `/atelier?studio=metamorphose` répond par la page du site (qui n'a pas de route `/atelier`), et non par le Studio.
   - Ces liens passent peut-être par le routeur interne du Studio (`onNavigate`), sans recharger la page : **à vérifier** en parcours réel.
3. **Une donnée partagée sans contrat.** La date libre de la Métamorphose sert de date de recherche dans le Réseau. C'est utile, mais rien ne dit à la personne que sa phrase sert de critère.
4. **Le réglage reste sur l'appareil.**
   - La Métamorphose ne suit pas la personne sur un autre appareil.
   - Elle n'est pas reliée au programme d'une vraie union (Grille 200 personnalisée).
   - C'est conforme à son texte (« Personne d'autre ne voit ces changements »), mais à confirmer comme choix.
5. **Les tests.**
   - Site : aucun test dédié. Le parcours `moments.py` voit seulement l'accueil (diapo raccordée, bande des étapes).
   - Studio : `atelierUltime`, `immersiveHome`, `aimeUnifiedHome`, `storageSafety` (vitest), plus `studio/tests/server/scanner.test.mjs` et `launch.test.mjs` pour le scanner.

## Questions pour Matt (rien n'est décidé)

- **Le nom.** Les deux fonctions peuvent-elles garder le même nom ? Proposition à discuter : « Métamorphose » pour l'accueil personnel ; un autre nom (par exemple « Fragments ») pour l'outil du Studio. Ou l'inverse.
- **L'outil du Studio sans serveur.** Trois choix :
  - le marquer clairement « hors ligne » ;
  - déplacer sa fonction serveur dans `api/`, ce qui demande un audit de sécurité, car c'est un analyseur de pages ;
  - le retirer des entrées tant qu'il n'est pas configuré.
- **La date.** Garder la date de la Métamorphose comme critère du Réseau, en le disant ? Ou la séparer en un champ « date de l'union » explicite ?
- **Le lien avec une vraie union.** Faut-il, plus tard, que la Métamorphose d'une personne connectée devienne le réglage de la page de son union ? Cela touche le sujet Unions et ne se décide pas maintenant.

## Tests à écrire avant de modifier (proposition)

- Parcours accueil :
  - ouvrir, taper deux prénoms, choisir un univers, masquer et déplacer une section, fermer avec Échap ;
  - recharger : tout est gardé ;
  - « Page de tous » : tout revient ;
  - au clavier et sur téléphone.
- Réseau : une date écrite dans la Métamorphose filtre bien les prestataires libres.
- Studio :
  - ouvrir « MÉTAMORPHOSE » depuis chaque point d'entrée ;
  - l'analyse en production répond-elle ou échoue-t-elle proprement ?
- Carte : ajouter les nœuds A et B, leurs données et leurs liens, avec l'état « à vérifier » tant que ces tests ne sont pas enregistrés.

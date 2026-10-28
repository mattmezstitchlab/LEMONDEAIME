# Sujet n° 3 — Unions : inventaire (aucune modification)

État au 28 octobre 2026. Ce document prépare le sujet : rien n'a été changé. Les décisions attendent la validation de Matt.

## Le constat principal

**Il n'existe pas encore d'« union » dans la base.**

Le mot désigne au moins sept choses, dans le site et le Studio :
- des exemples ;
- un programme de référence ;
- une intention du Point Zéro ;
- un projet d'espace ;
- des brouillons locaux.

Aucune d'elles ne porte un identifiant d'union que les autres pourraient lire.

Le seul couple partagé par tous est l'union d'exemple **Camille & Gabriel**, donnée canonique de la Grille 200 (PR #14).

## Les formes d'« union », une par une

| | Où | Ce que c'est | Donnée | Statut |
|---|---|---|---|---|
| A | Accueil, section « Unions » (`src/pages/LeMondeAime.tsx`, `UNIONS`) | Trois couples d'exemple. « Essayer leur univers » applique leur univers à la Métamorphose. | Écrits dans le code. Camille & Gabriel vient de `UNION_EXEMPLE` (`src/lib/reseau-exemples.ts`). | Exemples, en production |
| B | Grille 200, `/moments` (`src/lib/programme.ts`, `programme-outils.mjs`) | Le programme de référence, celui de l'union d'exemple. `personnaliser()` sait en tirer le programme d'une vraie union. | `src/data/programme.json` (canonique) | `personnaliser()` n'est appelé par **aucune page**, seulement par `tests/server/programme.test.mjs` |
| C | Point Zéro (`src/pages/PointZero.tsx`, `api/analyse.mjs`) | « Nous nous marions » est reconnu comme domaine `union` (studio « AIME Wedding »). | Rien tant qu'on ne range pas | Le lien de suite du domaine `union` mène à `/` (l'accueil), pas à une page d'union |
| D | « Ranger dans mon espace » (`api/buro.mjs`) | Crée un projet dans « Mon espace ». | Table `spaces`, toujours `kind = 'projet'`, et `space_members` (`owner`) | Une union rangée est un projet comme les autres ; rien ne la distingue |
| E | Réseau (`src/pages/Reseau.tsx`, `CartePersonne.tsx`, `LecturesMoment.tsx`) | « Crédité dans Camille & Gabriel » sur les fiches d'exemple ; « Pas encore crédité dans une union » sur les vrais profils. | Aucune table de crédits | Le crédit n'existe que pour l'exemple |
| F | Métamorphose (sujet n° 2) | Les deux prénoms et la phrase de date, gardés sur l'appareil. | `aime-metamorphose` (local) | Décidé : pas de lien avec une union avant ce sujet |
| G | Studio : Mon Espace (`oneSpaceCore.ts`), Dossier universel (`universalDossier.ts`), Mini-site (`miniSiteCore.ts`) | Un espace « mariage », un dossier « mariage » (démo « Camille & Gabriel — mariage fictif »), un mini-site « mariage » (Camille & Gabriel par défaut). | Local : `pointzero:one-space:v1`, `aime:universal-dossier`, `pointzero:minisite:v1` | Brouillons sur l'appareil, sans lien avec `spaces` |

S'y ajoute un aperçu : `src/charte/ApercuEspace.tsx` montre un projet « Notre union » dans l'aperçu de l'espace. C'est une illustration.

## Points d'entrée vers « commencer une union »

Ce sont des accès utiles à un même moteur, pas forcément des doublons (règle du sujet n° 1) :

| Libellé | Où | Vers |
|---|---|---|
| « Créer la page de notre union » | Accueil, en-tête de la section Unions | `/point-zero?q=Nous nous marions` |
| « Commencer mon union » | `/moments`, colonne de l'union | `/point-zero?q=Nous nous marions` |
| « Point Zéro » | Mon espace, carte de création | `/point-zero` |

Deux verbes (« Créer la page », « Commencer ») mènent au même endroit. Ils promettent une page qui n'existe pas encore : le Point Zéro range un projet, il ne crée pas de page d'union.

Ce point avait été renvoyé ici par le sujet n° 1 (point 9).

## Données en base qui touchent les unions

- `spaces` : `kind`, `title`, `owner_id`, `data` (`briques`, `studio`, `intention`, `visibilite`, `archive`, `ouvrage`).
- `space_members` : `space_id`, `user_id`, `role`.
  - `api/buro.mjs` n'écrit que `owner`.
  - L'onglet « Partagés » de Mon espace lit les autres rôles.
- `invitations` : lue et nettoyée à la suppression d'un compte (`api/_auth/auth.mjs`). **Aucune fonction de ce dépôt n'en crée** : à vérifier si une autre application l'alimente.
- `live_journal`, `matiere`, `identite` : nettoyées à la suppression d'un compte. Leur lien avec une union est à vérifier.
- `visibilite` (privé → …, quatre états, bouton « Partager » de Mon espace) : **aucune page publique ne la lit** dans ce dépôt. Elle est à vérifier.

Aucune requête n'a été faite sur la base de production pour cet inventaire : ce qui précède se lit dans le code. Le nombre réel de projets « union » rangés n'est pas connu.

## Constats à vérifier avant toute décision

1. **Pas d'entité union.** Une union rangée depuis le Point Zéro est un `projet` : son nom, sa date et ses personnes ne sont pas des champs, seulement une phrase d'intention.
2. **Trois dates possibles, aucune officielle** :
   - la phrase de la Métamorphose (appareil) ;
   - les dates lues par le Point Zéro (non gardées) ;
   - le programme de référence.
   Le Réseau dit maintenant que sa date n'est pas « la date officielle d'une union » : cette date officielle n'existe nulle part.
3. **`personnaliser()` est prêt mais non branché.** La Grille 200 sait produire le programme d'une vraie union, mais aucune union ne lui fournit ses choix.
4. **Les rôles.** La maquette parle de mariés, de prestataires crédités et d'invités. La base ne connaît que `owner` et des rôles lus dans « Partagés ». Rien ne crée de membre ni d'invitation dans ce dépôt.
5. **Les brouillons du Studio.** Espace, dossier et mini-site « mariage » vivent sur l'appareil, chacun avec sa clé, sans lien entre eux ni avec `spaces`.
6. **Les tests.** Il n'en existe aucun pour une union de bout en bout. Ce qui est prouvé :
   - le programme de référence et `personnaliser()` (serveur) ;
   - les cartes d'exemple et la Grille 200 (`moments.py`) ;
   - pour le rangement d'un projet, `tests/server/buro.test.mjs` ne vérifie que le nettoyage des champs et les refus (sans base, autre site). Aucune écriture n'est testée, même simulée.

## Questions pour Matt (rien n'est décidé)

- **Qu'est-ce qu'une union, dans la base ?**
  - Un `spaces.kind = 'union'`, avec des champs propres (les deux noms, la date officielle, le lieu) ?
  - Ou un `projet` portant `domaine: 'union'` dans `data` ?
  - Le premier est plus clair. Le second ne touche pas le schéma.
- **Qui fixe la date officielle**, et où ? Les propriétaires seulement, depuis Mon espace ? Une fois fixée, le Réseau doit-il la proposer avant celle de la Métamorphose ?
- **Que deviennent les trois boutons** « Créer la page de notre union », « Commencer mon union » et « Point Zéro » ? Faut-il un seul verbe ? Et vers quoi mènent-ils tant qu'il n'y a pas de page d'union : le Point Zéro, puis Mon espace ?
- **Une page d'union publique** est-elle dans le périmètre de la cristallisation (« terminer les parcours existants ») ? Ou est-ce une nouvelle fonction, donc gelée ?
- **Les rôles** : mariés (propriétaires), prestataires crédités, invités. Faut-il les poser maintenant, ou seulement les propriétaires ?
- **La Métamorphose d'une personne connectée** : doit-elle devenir le réglage de la page de son union ? (Question reportée du sujet n° 2.)
- **Les brouillons « mariage » du Studio** : à relier à l'union, ou à laisser au sujet StudiO ?

## Tests à écrire avant de modifier (proposition)

- **Parcours.** Le chemin est : « Nous nous marions » au Point Zéro → ranger → Mon espace. On vérifie ce que la personne voit à chaque étape, et où mène chaque bouton « union ».
- **Base.** Une écriture réelle sur une branche Neon de test, jamais en production. Une union rangée est relue, avec son propriétaire, et elle n'est visible de personne d'autre.
- **Programme.** `personnaliser()` est appelé par la page d'une union de test, et la Grille 200 de référence reste intacte.
- **Carte.** On ajoute les nœuds A à G, leurs données et leurs liens, en « à vérifier » tant que ces tests ne sont pas enregistrés. `invitations` et `visibilite` sont marquées « à vérifier ».

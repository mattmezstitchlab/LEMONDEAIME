# Sujet n° 3 — Unions : première étape

Faite le 28 octobre 2026, sur les décisions validées par Matt.

**Objectif :**
- qu'une union créée existe réellement ;
- qu'elle soit enregistrée une seule fois ;
- qu'on la retrouve après rechargement.

> Une union, une source canonique, plusieurs vues.

## La source canonique : celle qui existait déjà

- **Le constat.** La base Neon est partagée avec AIMESTUDIO. Sa contrainte `spaces_kind_check` n'autorise que trois `kind` : `evenement`, `projet`, `atelier`.
  - AIMESTUDIO range déjà un mariage en `kind = 'evenement'` avec `data.modele = 'mariage'` (`api/_auth/espaces.mjs`, `api/_temps/moteur.mjs`).
  - La production contient deux mariages de cette forme.
- **La décision de Matt** : réutiliser cette forme. Pas de `kind = 'union'`, pas de nouvelle table, **aucune migration**.
- **Ce qui s'ajoute dans `data`**, seulement là :
  - `data.union = { a, b, date, lieu, programme }` ;
  - les prénoms, la date officielle au format AAAA-MM-JJ et le lieu facultatif ;
  - les choix du programme : les moments retenus et les horaires changés.

Compatibilité vérifiée avec AIMESTUDIO, en lisant son dépôt sans le modifier :
- il ne lit que `kind`, `title` et `data->>'modele'`, et n'écrit jamais `spaces.data` après la création ;
- `data.union` ne gêne donc aucun de ses lecteurs ni de ses écrivains ;
- l'index unique `spaces_origine_unique (owner_id, data->>'origine')` sert à empêcher les doublons simultanés : une union créée ici porte l'origine `lemondeaime-union`.

## Problèmes confirmés et décisions

| # | Problème | Décision | État |
|---|---|---|---|
| 1 | Aucune union en base : « Nous nous marions » devenait un `projet` sans nom, sans date, sans lieu | L'action `union` de `/api/buro` range l'union sous la forme canonique. Une seule union par personne : si elle en a déjà une (y compris un mariage d'AIMESTUDIO), elle la retrouve. | Résolu |
| 2 | Deux boutons d'entrée promettaient « la page de notre union », qui n'existe pas | Un seul libellé, « Commencer notre union », vers le Point Zéro. Puis « Ranger notre union dans mon espace », puis « Compléter notre union ». | Résolu |
| 3 | `personnaliser()` était prêt mais aucune page ne l'appelait | Les choix du programme sont enregistrés avec l'union. `/moments?union=…` en tire le programme, à ses prénoms et à sa date, sans rien de Camille & Gabriel. La Grille 200 de référence est inchangée. | Résolu |
| 4 | Permissions | Seul le propriétaire modifie l'union. Un autre compte ne la voit pas, et ne peut ni la modifier ni l'archiver. Sa visibilité ne change pas : le bouton « Partager » est masqué. | Résolu |
| 5 | Les mariages déjà en base, incomplets | Ils restent intacts et apparaissent « à compléter ». Leur propriétaire peut les compléter : titre, modèle et origine sont gardés. | Résolu |
| 6 | Invitations, crédits de prestataires, partage public | Non activés : prévus après leur propre audit | À vérifier / prévus |
| 7 | Brouillons « mariage » du StudiO (local) | Inchangés, en attente de l'audit du StudiO | Décidé |
| 8 | Métamorphose | Reste locale à l'appareil | Inchangé |

## Le parcours

1. Point Zéro, « Nous nous marions » → « Ranger notre union dans mon espace ».
2. L'union est rangée en base, une seule fois.
3. « Compléter notre union » mène à Mon espace (`/buro?union=…`).
4. On y saisit les prénoms, la date officielle et le lieu, puis on enregistre.
5. Après rechargement, on retrouve la même union.
6. « Voir notre programme » ouvre `/moments?union=…` : le programme personnel, tiré de la Grille 200 de référence.

Rien de nouveau dans l'interface, hors la fiche de l'union dans Mon espace, qui reprend les champs et les boutons existants du profil. Pas de nouvelle page, pas de refonte.

## Fichiers et dépendances

- `api/buro.mjs` : la même fonction serveur, avec deux actions de plus (`union`, `union-maj`).
  - Les lectures ajoutent `union`.
  - La visibilité d'une union ne change pas.
- `src/lib/programme-outils.mjs` : `programmeDUnion()`.
  - Il appelle `personnaliser()`, met les prénoms et nomme les témoins par leur place (« Témoin 1 »).
  - Il décale les dates à la date officielle.
  - La référence n'est pas touchée.
- `src/charte/FicheUnion.tsx` (fiche dans Mon espace) et `src/charte/ProgrammeUnion.tsx` (le programme de l'union donné aux pages des moments ; les liens gardent l'union).
- `src/pages/PointZero.tsx`, `Buro.tsx`, `Moments.tsx`, `LeMondeAime.tsx`, `src/charte/LecturesMoment.tsx`, `Support.tsx`, `src/App.tsx`, `src/lib/buro.ts`, `src/styles.css` (une ligne).
- Système nerveux :
  - `cartographie/scanner.mjs` et `outils.mjs` lisent les tests sur base réelle (`tests/base`) ;
  - `SystemeNerveux.tsx` affiche tous les parcours, plus seulement le premier.
- Inchangés :
  - le schéma ;
  - la Grille 200 et Camille & Gabriel ;
  - la Métamorphose ;
  - les brouillons du StudiO ;
  - AIMESTUDIO ;
  - la production.

## Tests avant / après

- **`tests/base/unions.mjs`**, 20 vérifications sur une **vraie base**.
  - **Avant** les corrections : 4 réussies, 16 en échec.
  - **Après** : 20 sur 20.
  - Base : la branche Neon isolée `test/unions-2026-10-28`, jamais la production.
  - Il passe par le vrai Better Auth (lien de connexion capturé, aucun e-mail envoyé) et la vraie fonction `/api/buro`. Quatre comptes de test y sont créés, puis effacés à la fin.
  - Garde-fou : il refuse de tourner sur une base sans la table `aime_base_de_test`, qui n'existe que sur cette branche.
  - Il prouve :
    - la création ;
    - l'absence de doublon, y compris pour trois envois simultanés ;
    - la relecture après rechargement ;
    - la modification par le propriétaire ;
    - le refus d'une date invalide ;
    - le refus d'accès pour un autre compte ;
    - pas de partage public ;
    - un mariage d'AIMESTUDIO retrouvé puis complété sans perte ;
    - le programme enregistré et personnalisé, la référence intacte ;
    - la contrainte de schéma intacte.
- **`tests/e2e/unions.py`**, 25 vérifications de l'interface, avec des API **simulées** : ce n'est pas une preuve d'écriture en base.
  - **Avant** les corrections : 2 réussies sur 25.
  - **Après** : 25 sur 25.
  - Ordinateur, téléphone, sans compte, membre non propriétaire.
- **`tests/server/unions.test.mjs`** (7 tests) : la date, le nettoyage, la lecture d'un mariage incomplet, le programme personnel.
- Non-régression :
  - docks 31/31 ;
  - Métamorphose 27/27 ;
  - moments 42/42 ;
  - navigation 15/15 ;
  - système 22/22 ;
  - tests serveur 60/60 ;
  - Studio 540/540.

Rejouer le test sur base réelle :
```
BASE_TEST_URL=<branche Neon de test, jamais la production> node tests/base/unions.mjs
# si le port 5432 est fermé : NEON_WS_MODULES=<dossier avec ws et https-proxy-agent> (passage par WebSocket)
```

## Dans le système nerveux

- **Vérifiés** (avec preuves), et le second parcours, « Une union, de l'intention à la base », 7 étapes sur 7 vérifiées :
  - Point Zéro, ranger notre union ;
  - fiche de l'union ;
  - programme de l'union ;
  - ranger et modifier une union ;
  - la fonction serveur de Mon espace ;
  - l'union en base ;
  - le propriétaire de l'union.
- **Prévus** : invitations à une union, crédits des prestataires, partage public.
- **Audit** :
  - résolus : `union-sans-entite`, `boutons-union`, `personnaliser-branche` ;
  - décidé : `brouillons-studio-mariage` ;
  - à vérifier : `invitations-credits-partage`.

## Limites

- La production n'a reçu aucune écriture : le code n'y sera qu'après fusion des PR.
- Les deux mariages existants y apparaîtront alors comme unions « à compléter » dans l'espace de leur propriétaire.
- La branche Neon `test/unions-2026-10-28` reste à supprimer quand Matt le décide.
- Les horaires du programme personnel restent ceux de la référence, sauf ceux que l'union a changés. Il n'existe pas encore d'écran pour choisir les moments : l'enregistrement et la lecture sont prêts, et prouvés.

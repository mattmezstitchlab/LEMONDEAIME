# Sécurité : trois risques préexistants, et la visibilité dans le Réseau

28 octobre 2026. Ce correctif part de `main` et ne dépend pas de la pile #14 à #18.

Les fusions sont suspendues jusqu'à sa revue. Aucune donnée de production n'a été touchée. Les essais avec écriture ont tous eu lieu sur la branche Neon de test isolée `test/unions-2026-10-28`, qui est conservée.

## Les constats, vérifiés

| # | Constat de la contre-expertise | Vérification | Verdict |
|---|---|---|---|
| S1 | La suppression d'un compte ne nettoie pas toutes ses données ni ses fichiers audio | Sur la base de test, avant correctif, après suppression, il restait `musiques` (2), `reseau_dates`, `reseau_questions` et les demandes reçues et envoyées. Les fichiers Vercel Blob (`musique/<compte>/…`) n'étaient jamais effacés, pas même les envois jamais rattachés. | Confirmé |
| S2 | La synchronisation du StudiO peut transférer les ouvrages d'un compte vers un autre sur un navigateur partagé | Les ouvrages de l'appareil ne savaient pas à quel compte ils appartenaient. Avant correctif, B connecté envoyait dans son compte les ouvrages de A et ceux créés sans compte (test : `['de-A', 'sans-proprio']` envoyés). Ils lui étaient aussi affichés. | Confirmé |
| S3 | `/api/analyse` permet une consommation abusive de la clé Anthropic | Il ne demandait aucun compte, et une requête sans en-tête `Origin` passait. La limite était gardée en mémoire par instance, avec une adresse falsifiable, et sans plafond global. Avant correctif, une requête sans compte appelait Claude. | Confirmé |
| S4 | Les unions privées dans le Réseau | La fiche publique d'un profil montrait tout espace marqué `public`, unions et événements compris (avant : `["Union de test privée", "Séminaire de test", …]`). | Confirmé |

## Les correctifs

**S1 : supprimer un compte efface tout ce qui est à lui.**

Dans la même transaction que l'effacement existant (`api/_auth/auth.mjs`, `effacerTraces`), on efface maintenant :
- sa musique ;
- son calendrier, les questions posées à son orbe et les demandes qu'il a reçues dans le Réseau.

Les données partagées sont traitées ainsi :
- **Une demande qu'il a envoyée** reste dans la boîte de son destinataire, mais sans son nom, son adresse ni son compte (« Compte supprimé »).
- **Un espace dont il est propriétaire et où d'autres sont membres** : la suppression reste refusée, comme avant ; rien n'est effacé.

Les fichiers passent par une file d'effacement avec reprise (`api/_auth/effacements.mjs`) :
- ses fichiers (chaque morceau, et tout le dossier `musique/<compte>/`, y compris les envois jamais rattachés) sont **inscrits dans la file `effacements_fichiers`** dans la même transaction : rien ne peut être oublié ;
- la file est vidée aussitôt après la suppression ;
- un échec y reste, avec son erreur ;
- **`/api/maintenance`**, protégé par `CRON_SECRET`, reprend la file chaque jour (tâche planifiée Vercel, `vercel.json`).

Cascades de la base déjà en place : cartes, activités, sessions, comptes liés, clés d'accès, engagements.

**S2 : le StudiO cloisonne strictement les ouvrages par compte.**
- Chaque ouvrage de l'appareil porte le compte qui l'a créé ou ramené.
- L'appareil ne montre que les ouvrages du compte connecté et ceux sans propriétaire. Il n'envoie que ceux du compte connecté.
- Il ne supprime ni ne modifie jamais l'ouvrage d'un autre compte : la sauvegarde est alors refusée.
- **Un ouvrage sans propriétaire reste local.** Le bouton « Ranger dans mon espace », dans la bibliothèque, le rattache par un geste explicite. Seule exception : un ouvrage sans propriétaire qui est déjà dans le compte connecté lui est rattaché, puisque c'est le sien.
- **À la déconnexion**, la case « Effacer les ouvrages de cet appareil » est proposée et n'est jamais cochée. Cochée, elle n'efface que les ouvrages de ce compte **déjà rangés** dans son espace, dans une version au moins aussi récente. Ils restent sur le compte. Ceux qui ne sont pas encore rangés, ceux sans propriétaire et ceux d'un autre compte restent sur l'appareil.

**S3 : `/api/analyse` est réservé aux personnes connectées.**
- Session vérifiée côté serveur (401 sans compte).
- Garde commune : même site et corps JSON. Ce n'est pas une authentification, et une requête sans `Origin` est refusée.
- Quotas partagés en base : 20 analyses par personne et par heure, et un **plafond global de 300 par heure**.
- Si les compteurs partagés sont indisponibles, rien n'est dépensé (503).
- L'ouverture CORS à d'autres sites (`ANALYSE_ALLOWED_ORIGINS`) est retirée.
- La clé n'apparaît jamais dans une réponse.
- **Le Point Zéro** n'appelle plus l'analyse sans compte. En cas de refus, de quota, de plafond ou d'indisponibilité, il garde son moteur local et dit pourquoi.

**S4 : la fiche publique du Réseau exclut tout événement** (`kind = 'evenement'` : unions, mariages, séminaires), quelle que soit sa visibilité, même renseignée par un autre écrivain.

## Tests avant / après

| Fichier | Environnement | Avant (code de `main`) | Après |
|---|---|---|---|
| `tests/base/securite.mjs` | **vraie base**, branche Neon de test, vrai Better Auth et vrai flux de suppression ; Claude et le stockage de fichiers simulés | 6/16 | **16/16** |
| `studio/src/__tests__/cloisonnement.test.ts` | vitest | 0/7 | **7/7** |
| `studio/src/__tests__/cloisonnementBibliotheque.test.ts` | vitest, IndexedDB en mémoire | 0/3 | **3/3** |
| `tests/server/securite.test.mjs` | node, sans base | échec (modules absents) | **6/6** |
| `tests/e2e/securite.py` | interface, **API simulées** | 4/11 | **11/11** |

Non-régression :
- tests serveur 28/28 ;
- StudiO 550/550 (deux attentes de `aimeSync.test.ts` adaptées à la nouvelle règle, commentées) ;
- API du StudiO 10/10 ;
- `tsc` site et StudiO ;
- build.

Les preuves datées (commit, environnement) sont dans `docs/securite/preuves.json`.

## Rejouer

```
BASE_TEST_URL=<branche Neon de test, jamais la production> node tests/base/securite.mjs
npm run build && npx vite preview --port 4610 && python3 tests/e2e/securite.py
node tests/preuves-securite.mjs
```

## Après la fusion : à faire par Matt

- **`CRON_SECRET`** : à créer dans Vercel (Production), avec 16 caractères au moins. Sans lui, `/api/maintenance` reste fermé et la reprise quotidienne ne tourne pas. La file se vide quand même à chaque suppression de compte.
- **La table `effacements_fichiers`** est créée par le code à la première suppression de compte (`create table if not exists`). C'est le seul ajout au schéma : un ajout pur, sans toucher l'existant. Retour arrière : la supprimer une fois vide.

## Limites, dites franchement

- **Demandes envoyées par un compte supprimé.** Leur texte est gardé chez le destinataire, sans identité. S'il faut aussi effacer le texte, c'est une ligne à changer : à décider.
- **Tables d'AIMESTUDIO non traitées ici.** `demandes` et `liste_attente` (par adresse), `audit` (journal de sécurité), et `live_journal` dans les espaces partagés relèvent d'AIMESTUDIO. Elles sont à trancher avec lui.
- **Les fichiers audio sont publics par leur adresse.** Le stockage Vercel Blob est public tant qu'ils ne sont pas effacés.
- **Les ouvrages laissés sur un appareil avant ce correctif** ne portent aucun compte. Ils restent visibles sur cet appareil jusqu'à ce que leur propriétaire se reconnecte (ils lui sont alors rattachés) ou les range explicitement. Ils ne partent plus jamais dans un autre compte.
- **L'interface du Point Zéro et de la déconnexion** est prouvée avec des API simulées. Le serveur, lui, est prouvé sur la base de test.
- **La reprise quotidienne** n'a pas été éprouvée sur un vrai déploiement : elle demande `CRON_SECRET` et le stockage réel.
- **Le Système nerveux** n'existe que dans la pile (#15). Les nœuds de sécurité y seront ajoutés quand la pile sera reprise sur ce correctif.

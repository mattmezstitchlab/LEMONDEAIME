# Sécurité : trois risques préexistants, et la visibilité dans le Réseau

28 octobre 2026. Ce correctif part de `main` et ne dépend pas de la pile #14 à #18. Il intègre la revue ciblée de Matt du même jour.

Les fusions sont suspendues jusqu'à sa revue. Aucune donnée de production n'a été modifiée. En production, il n'y a eu que des lectures : le schéma et des comptes agrégés, sans données personnelles. Les essais avec écriture ont tous eu lieu sur la branche Neon de test isolée `test/unions-2026-10-28`, qui est conservée.

## Les constats, vérifiés

| # | Constat de la contre-expertise | Vérification | Verdict |
|---|---|---|---|
| S1 | La suppression d'un compte ne nettoie pas toutes ses données ni ses fichiers audio | Sur la base de test, avant correctif, après suppression, il restait `musiques` (2), `reseau_dates`, `reseau_questions` et les demandes reçues et envoyées. Les fichiers Vercel Blob (`musique/<compte>/…`) n'étaient jamais effacés, pas même les envois jamais rattachés. | Confirmé |
| S2 | La synchronisation du StudiO peut transférer les ouvrages d'un compte vers un autre sur un navigateur partagé | Les ouvrages de l'appareil ne savaient pas à quel compte ils appartenaient. Avant correctif, B connecté envoyait dans son compte les ouvrages de A et ceux créés sans compte (`['de-A', 'sans-proprio']`). Ils lui étaient aussi affichés. | Confirmé |
| S3 | `/api/analyse` permet une consommation abusive de la clé Anthropic | Il ne demandait aucun compte, et une requête sans en-tête `Origin` passait. La limite était gardée en mémoire par instance, avec une adresse falsifiable, et sans plafond global. | Confirmé |
| S4 | Les unions privées dans le Réseau | La fiche publique d'un profil montrait tout espace marqué `public`, unions et événements compris. | Confirmé |

## Les correctifs

### S1 : supprimer un compte efface tout ce qui est à lui

**Ce qui est effacé**, dans la même transaction que l'effacement existant (`api/_auth/auth.mjs`) :
- sa musique ;
- son calendrier, les questions posées à son orbe et les demandes qu'il a reçues dans le Réseau ;
- son profil, ses ouvrages et ses adhésions ;
- par cascade : cartes, activités, sessions, comptes liés, clés d'accès, engagements.

Un espace dont il est propriétaire et où d'autres sont membres bloque la suppression, comme avant : rien n'est effacé.

**Les fichiers : une file d'effacement avec reprise** (`api/_auth/effacements.mjs`).
- Ses fichiers sont inscrits dans `effacements_fichiers` dans la même transaction : chaque morceau, et tout le dossier `musique/<compte>/`, y compris les envois jamais rattachés.
- La file est vidée aussitôt après la suppression. Un échec y reste, avec son erreur et son nombre d'essais.
- **Migration explicite** : `db/migrations/2026-10-28-01-effacements-fichiers.sql`, avec son retour arrière `…retour.sql`, appliqués par `db/appliquer.mjs`. Le code ne crée plus la table. Si elle manque, la suppression de compte est **refusée**, et rien n'est effacé à moitié.
- **Idempotence** :
  - une même cible n'est inscrite qu'une fois (index unique, `on conflict do nothing`) ;
  - un fichier déjà absent compte comme effacé ;
  - deux reprises simultanées ne causent aucune erreur.
- **Reprise** : `/api/maintenance` reprend la file chaque jour, par une tâche planifiée Vercel (`17 3 * * *` UTC, `vercel.json`). Il répond 401 avec un mauvais secret, et reste fermé (503) sans `CRON_SECRET`. Il rend un bilan chiffré : effacés, échecs, restants, bloqués (5 échecs ou plus, à surveiller).

**Les demandes envoyées : ce qui est vraiment retiré, et ce qui ne l'est pas.**

Il faut distinguer deux niveaux :

- **Retiré de façon certaine** : les champs d'identité de l'auteur.
  - Son compte (`de_user`), son nom (`de_nom` devient « Compte supprimé ») et son adresse (`de_email`) sont vidés.
  - Plus rien ne relie la demande à son compte, ni ne permet de lui répondre.
- **Nettoyé automatiquement, sans garantie** : le texte libre du message.
  - On en retire ce qui se reconnaît à coup sûr : adresses e-mail, téléphones, IBAN et longues suites de chiffres, liens, et son nom (son nom affiché et le début de son adresse).
  - **Ce n'est pas une anonymisation.** L'auteur peut encore être reconnu par le contenu : une adresse postale, un surnom, un nom écrit autrement ou le nom d'un proche, un numéro écrit en lettres. Il peut l'être aussi par le contexte : la date, le lieu et le nombre d'invités, qui restent.
  - Ces demandes sont donc des données **pseudonymisées**, encore personnelles, et traitées comme telles.

Le destinataire en est informé dans sa boîte. Sous la demande, une note dit que l'auteur a supprimé son compte, que le message a été nettoyé automatiquement **sans garantie**, et qu'il sera effacé à la fin de sa durée de conservation.

**Politique de conservation proposée**

| Donnée | Ce qui en reste | Pourquoi |
|---|---|---|
| Identité de l'auteur (compte, nom, adresse) | Retirée (« Compte supprimé ») | Elle ne doit plus être exposée |
| Texte libre | Gardé, **nettoyé automatiquement, identification encore possible** | Le destinataire garde le contexte de la demande |
| Date, lieu, nombre d'invités | Gardés | Utiles au destinataire, mais ils peuvent aider à reconnaître l'auteur |
| Durée | **12 mois** après la demande, puis effacée par la tâche quotidienne. Réglable avec `DEMANDES_COMPTE_SUPPRIME_MOIS`, de 1 à 120. | Limiter dans le temps ce qui reste identifiable |

À prévoir avec le sujet Réseau : une suppression à la demande du destinataire. Une option plus stricte serait aussi possible, l'effacement immédiat du texte à la suppression du compte : à décider.

### S2 : le StudiO cloisonne strictement les ouvrages par compte

Chaque ouvrage de l'appareil a un état. Rien n'est jamais effacé par le cloisonnement.

| État | Montré | Envoyé | Rattachable |
|---|---|---|---|
| `compte` (créé ou ramené par ce compte) | à ce compte seulement | à ce compte seulement | — |
| `appareil` (créé ici sans compte) | à tous sur l'appareil | jamais automatiquement | par un geste explicite (« Ranger dans mon espace »), refusé par le serveur s'il est déjà dans un autre compte |
| `autreCompte` (ancien, déjà dans un autre compte) | jamais | jamais | jamais ; il revient à son propriétaire quand celui-ci se connecte |
| **ancien** (version précédente, propriétaire inconnu) | **jamais**, tant qu'il n'est pas vérifié | jamais | non ; à la connexion, le serveur dit s'il est à ce compte (rattaché), à un autre (`autreCompte`) ou à personne (`appareil`) |

- **Sur le serveur**, un ouvrage déjà rangé dans un autre compte est refusé (409, `autre-compte`) : aucune copie d'un compte à l'autre, par aucun chemin.
- La vérification (`action: 'verifier'`) ne rend que des identifiants aléatoires : jamais un nom, un contenu ou un compte.
- **Hors d'AIME** (l'atelier seul, sans comptes), rien ne change.
- **À la déconnexion**, la case « Effacer les ouvrages de cet appareil » est proposée et n'est jamais cochée. Cochée, elle n'efface que les ouvrages de ce compte **déjà rangés** dans son espace, en version au moins aussi récente. Ils restent sur le compte.

**Limite assumée : les ouvrages locaux sans compte sur un navigateur partagé.**

Un ouvrage créé sur un appareil **sans être connecté** n'appartient à aucun compte. C'est l'état « appareil », ou un ancien ouvrage vérifié comme rangé dans aucun compte. Personne ne peut prouver à qui il est.

- **Visibilité.** Sur un navigateur partagé, il est visible par toute personne qui utilise cet appareil, connectée ou non.
- **Rattachement.** N'importe laquelle de ces personnes peut le ranger dans son propre compte, par un geste explicite (« Ranger dans mon espace »).
- **Premier qui range.** Une fois rangé dans un compte, il quitte l'état « appareil » : le serveur refuse que d'autres comptes le rangent (409), et il disparaît de leur vue.
- **Aucune perte.** Rien n'est effacé, et aucune synchronisation ne l'envoie toute seule.

C'est la situation de tout fichier gardé sur un appareil partagé sans compte, déjà vraie avant ce correctif. La protection consiste à se connecter avant de créer : un ouvrage créé connecté appartient à ce compte, n'est visible que de lui sur l'appareil, et n'est envoyé qu'à lui. L'interface le signale avec la mention « sur cet appareil seulement » et le bouton de rangement.

### S3 : `/api/analyse` est réservé aux personnes connectées

- Session vérifiée côté serveur (401 sans compte).
- Garde commune : même site et corps JSON. Ce n'est pas une authentification ; une requête sans `Origin` est refusée.
- **Quotas partagés en base**, réglables sans toucher au code :
  - `ANALYSE_QUOTA_PERSONNE` : 20 par personne et par heure par défaut ;
  - `ANALYSE_PLAFOND_HEURE` : 300 par heure pour tout le site par défaut ;
  - une valeur invalide garde le défaut.
- **Aucune dépense inutile.** Ces cas ne déclenchent aucun appel à Claude :
  - sans compte, origine refusée ou corps refusé ;
  - demande invalide (texte trop long, fichier refusé) : refusée **avant** les quotas, sans en consommer ;
  - quota de la personne ou plafond global atteint ;
  - compteurs partagés indisponibles (503).

  Une erreur de Claude donne une seule tentative, sans nouvel essai automatique. Cette tentative compte dans le quota, mais une requête refusée par l'API n'est en principe pas facturée.
- La clé n'apparaît jamais dans une réponse. L'ouverture CORS à d'autres sites est retirée.
- **Le Point Zéro** n'appelle plus l'analyse sans compte. En cas de refus, de quota, de plafond ou d'indisponibilité, il garde son moteur local et dit pourquoi.

### S4 : la fiche publique du Réseau n'affiche jamais un événement

Elle exclut tout `kind = 'evenement'` (unions, mariages, séminaires), quelle que soit sa visibilité, même renseignée par un autre écrivain.

## Tests réellement exécutés

| Fichier | Environnement | Avant | Après |
|---|---|---|---|
| `tests/base/securite.mjs` | **vraie base** : branche Neon de test, vrai Better Auth et vrai flux de suppression ; Claude et le stockage de fichiers simulés | 6/16 (code de `main`, première version du test) | **25/25** |
| `studio/src/__tests__/cloisonnement.test.ts` | vitest | 0/7 (`main`) | **7/7** |
| `studio/src/__tests__/cloisonnementBibliotheque.test.ts` | vitest, IndexedDB en mémoire | 0/3 (`main`) | **3/3** |
| `studio/src/__tests__/anciensPartages.test.ts` (navigateur partagé, ouvrages anciens) | vitest, IndexedDB et serveur simulés | 0/7 sur la première version de cette PR (B pouvait rattacher l'ancien de A) | **7/7** |
| `tests/server/securite.test.mjs` | node, sans base | modules absents | **10/10** |
| `tests/e2e/securite.py` | interface, **API simulées** | 4/11 (`main`) | **11/11** |

Ce que le test sur base réelle prouve en plus depuis la revue :
- sans migration, la suppression est refusée ;
- inscriptions et reprises idempotentes ;
- texte libre nettoyé (pas anonymisé) ;
- conservation de 12 mois appliquée ;
- demande invalide sans appel ni quota ;
- Claude en erreur : une seule tentative ;
- quotas réglés par l'environnement ;
- refus serveur d'un ouvrage d'un autre compte (409) ;
- vérification qui ne rend que des identifiants.

Non-régression :
- tests serveur 32/32 ;
- StudiO 557/557 (deux attentes de `aimeSync.test.ts` adaptées à la nouvelle règle, commentées) ;
- API du StudiO 10/10 ;
- `tsc` site et StudiO ;
- build.

Les preuves datées (commit, environnement) sont dans `docs/securite/preuves.json`. La migration et son retour arrière ont été joués sur la branche de test : retour, essai à blanc, application deux fois.

## Dépendances

**Vercel** (projet `lemondeaime`)
- Tâches planifiées : notre configuration est compatible avec le plan Hobby (une exécution par jour au plus, à l'heure près). La prévisualisation de cette PR s'est construite avec la tâche déclarée.
- **`CRON_SECRET` est absent** (vérifié par la liste des variables, sans lire leurs valeurs). À créer en Production, en « Sensitive », avec au moins 16 caractères. Vercel l'envoie seul à la tâche planifiée (`Authorization: Bearer …`).
- Déjà présents : `BLOB_READ_WRITE_TOKEN` (le stockage des fichiers), `ANTHROPIC_API_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`.
- Facultatifs : `ANALYSE_QUOTA_PERSONNE`, `ANALYSE_PLAFOND_HEURE`, `DEMANDES_COMPTE_SUPPRIME_MOIS` (sinon 20, 300 et 12).

**Neon** (base partagée avec AIMESTUDIO)
- La migration `2026-10-28-01` est un ajout pur : aucune table existante ne change.
- La table `quotas` existe déjà en production.
- État en production (lecture seule) : 1 ouvrage, aucun identifiant d'ouvrage partagé entre deux comptes.

## Procédure de déploiement (après accord de Matt)

1. **Neon** : créer une branche de sauvegarde `sauvegarde-avant-securite-<date>` depuis la production. C'est la convention déjà en place.
2. **Neon** : appliquer la migration sur la production :
   `MIGRATION_URL=<production> node db/appliquer.mjs db/migrations/2026-10-28-01-effacements-fichiers.sql` (essai à blanc), puis la même commande avec `--oui`.
   Vérifier que la table `effacements_fichiers` existe.
3. **Vercel** : créer `CRON_SECRET` (Production, Sensitive). Ne pas publier avant.
4. **GitHub** : fusionner la PR #19. Vercel déploie la production.
5. **Contrôles après déploiement** :
   - `/api/maintenance` sans secret répond 401 ;
   - `vercel crons run /api/maintenance` (ou le tableau de bord) répond 200 avec un bilan ;
   - sans compte, le Point Zéro dit « Moteur local · entrez dans AIME » ;
   - la fiche publique d'un profil n'affiche aucun événement.
6. Ensuite seulement : reporter `main` dans la #14, puis reprendre #14 → #18, chacune revérifiée.

## Retour arrière

- **Code** : dans Vercel, remettre en production le déploiement précédent (« Instant Rollback »), ou annuler la fusion par un `revert` de la PR. L'ancien code n'utilise pas la table : la laisser en place ne gêne rien.
- **Base** : `db/migrations/2026-10-28-01-effacements-fichiers.retour.sql`, **seulement avec une file vide** ; le script refuse sinon. En dernier recours, la branche de sauvegarde de l'étape 1.
- **Les données déjà effacées** par une suppression de compte ne reviennent pas avec un retour arrière. C'est le but de la suppression. Seule la branche de sauvegarde les garde, jusqu'à son effacement.
- **StudiO** : les nouveaux états des ouvrages sont de simples champs ajoutés sur l'appareil. L'ancien code les ignore, et rien n'a été effacé.

## Derniers risques et limites

- **Les demandes d'un compte supprimé ne sont pas anonymes** : seuls les champs d'identité sont retirés à coup sûr. Le texte est nettoyé sans garantie : adresse postale, surnom, nom d'un proche. La durée de 12 mois le borne. Une suppression à la demande du destinataire reste à prévoir (sujet Réseau).
- **Tables d'AIMESTUDIO non traitées ici** : `demandes` et `liste_attente` (par adresse), `audit` (journal de sécurité), `live_journal` des espaces partagés. Elles sont à trancher avec AIMESTUDIO.
- **Les fichiers audio sont publics par leur adresse** tant qu'ils ne sont pas effacés : c'est le fonctionnement du stockage public de Vercel Blob.
- **Un ancien ouvrage dont le propriétaire a supprimé son compte (ou l'ouvrage)** après qu'il a été vu dans son compte reste à l'écart (`autreCompte`) : il n'est donné à personne. Un ancien jamais rangé dans aucun compte devient « de l'appareil » : sur un navigateur partagé, n'importe qui sur cet appareil peut le voir et le ranger par un geste. C'est la situation d'avant les comptes pour un ouvrage créé sans compte.
- **La reprise quotidienne n'a pas été éprouvée sur un vrai déploiement.** Il faut `CRON_SECRET` et le vrai stockage. Le contrôle de l'étape 5 le fera.
- **Les quotas** utilisent l'adresse et le compte vérifiés côté serveur. Le plafond global protège la clé, même si de nombreux comptes étaient créés.
- **Le Système nerveux** n'existe que dans la pile (#15). Les nœuds de sécurité y seront ajoutés quand la pile sera reprise sur ce correctif.

# SYST’AIME — le manifeste

SYST’AIME est la **source de vérité commune** de LE MONDE AIME : ce que le code, les tests, les contrats et les décisions humaines établissent — et ce qu’ils n’établissent pas. Ce n’est pas une documentation : chaque affirmation est **rejouée par la machine** (`tests/systaime/valider.mjs`).

## Les fichiers

| Fichier | Rôle | Public ? |
|---|---|---|
| `docs/systaime/manifeste.interne.json` | Le manifeste complet : 64 cases, composants, dépendances, justifications d’audit | **Non.** Servi uniquement par `/api/systaime` à l’administration (`AIME_ADMIN`). Jamais dans `public/`, jamais dans le bundle. |
| `src/systaime/publique.json` | La projection expurgée (états, noms, aucun chemin) | Oui, embarquée dans la page `/systaime` |
| `tests/systaime/valider.mjs` | Le validateur (V-01 à V-19) | — |
| `tests/systaime/projeter.mjs` | Régénère la version publique | — |
| `tests/server/systaime.test.mjs` | Tests, dont 18 refus | — |
| `AGENTS.md` / `CLAUDE.md` | Consignes pour les agents (contexte, pas un verrou) | — |

## Les quatre constats, séparés

Une case n’a pas « un statut » : elle a quatre constats distincts, et son libellé affiché en est **dérivé** (jamais saisi).

1. **Existence** — le code existe (fichiers présents, empreinte Git enregistrée).
2. **Couverture** — des tests lui sont reliés (déclarés comme preuve ; ce n’est **pas** une couverture de lignes).
3. **Dernière exécution** — réussie / échouée / partielle / non rejouée, avec date, commit et commande.
4. **Validation fonctionnelle** — par une personne uniquement, avec nom, date, commit et portée. **Aucune case n’est validée à ce jour.**

Un test réussi n’est pas une validation : il ne prouve pas que toutes les règles du composant sont satisfaites.

## Fraîcheur

Le manifeste enregistre l’empreinte Git (blob) de chaque fichier et test référencé. `node tests/systaime/valider.mjs` recalcule ces empreintes : un écart rend la case **« à revérifier »** (ainsi que celles qui dépendent d’elle d’un cran par import technique). Git indisponible : **« inconnu »**, jamais « à jour ». `SYSTAIME_STRICT=1` transforme ces états en erreurs.

Limites : une empreinte différente ne dit pas si le changement compte ; seule une dépendance technique est suivie.

## Mettre à jour

Le manifeste est un fichier **édité à la main**, puis validé. Après avoir relu une case : mettre à jour les empreintes (`git hash-object <fichier>`), relancer le validateur, puis `node tests/systaime/projeter.mjs`. Ne jamais inscrire « validée » sans la personne (nom, date, commit, portée).

## Responsabilité

`responsabilite.fonctionnel` désigne Matthieu Lecointre à titre **provisoire proposé**, non approuvé (`approuve: false`). Ce n’est ni un rôle technique ni un droit d’accès : les droits réels sont la liste `AIME_ADMIN` côté serveur.

## Jeux de tokens

La page utilise `studio/src/design/aime.css` (`[data-aime]`), sans remplacer ceux du site public (`src/styles.css`). `studio/src/design/tokens.json` est un héritage non raccordé (aucun import) : conservé, non branché.

## Confidentialité

Le manifeste interne contient des détails d’audit : il reste privé. Les points de sécurité et d’exploitation n’ont, côté public, que leur nom (« détail réservé »).

## Ce que ce lot ne fait pas

Pas de base de données, pas de moteur, pas de réactivation automatique des éléments retrouvés, pas de CI à la racine, pas de crochet ni de protection de branche (voir `AGENTS.md`). Les tests Python de bout en bout et PostgreSQL ne sont pas rejoués ici.

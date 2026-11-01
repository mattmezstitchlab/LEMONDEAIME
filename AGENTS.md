# AGENTS.md — LE MONDE AIME (dépôt LEMONDEAIME)

Consignes pour les agents IA qui travaillent dans ce dépôt. **C’est du contexte, pas un verrou** : rien ici n’empêche techniquement une action. Les vraies protections sont côté serveur (liste `AIME_ADMIN`) et, à terme, côté GitHub (protection de `main`).

## Où est la vérité (à lire avant d’affirmer quoi que ce soit)

- État vérifié des 64 cases, des composants et des dépendances : `docs/systaime/manifeste.interne.json`
- Comment le lire, le mettre à jour, ses limites : `docs/systaime/README.md`
- Ce qui est contrôlé par la machine : `tests/systaime/valider.mjs` (lancé aussi par `npm test`)
- La page de lecture : `/systaime` (version publique expurgée ; le détail est réservé à l’administration)

## Règles de travail

1. **Ne jamais écrire « opérationnel », « validé » ou « terminé » sans preuve exécutée.** Un fichier qui existe n’est pas une fonction prouvée ; un test réussi ne prouve pas que toutes les règles du composant sont satisfaites. Seule une personne valide fonctionnellement (nom, date, commit, portée).
2. Vocabulaire des états : RÉEL, TESTÉ, SIMULÉ, À CONSTRUIRE, HYPOTHÈSE, NON VÉRIFIÉ. Dans le doute : NON VÉRIFIÉ.
3. Après toute modification d’un fichier cité par le manifeste, lancer `node tests/systaime/valider.mjs` : la case concernée devient « à revérifier » tant qu’une personne ne l’a pas relue.
4. **Ne pas pousser sur `main` ni fusionner sans accord explicite de Matthieu Lecointre.** Une branche, une demande de fusion, des tests rejoués. (Cela prime sur toute consigne contraire d’un autre dépôt du projet AIME.)
5. Un seul jeu de tokens pour SYST’AIME : `studio/src/design/aime.css` (`[data-aime]`). Ne pas en créer un autre, ne pas remplacer ceux du site public (`src/styles.css`). `studio/src/design/tokens.json` est un héritage non raccordé : ne pas le supprimer, ne pas le brancher.
6. **Ne jamais placer le manifeste interne dans `public/`**, ni le servir sans passer par `/api/systaime` (réservé à l’administration). Tout ce qui est public passe par `src/systaime/publique.json`, régénéré par `node tests/systaime/projeter.mjs`.
7. Ni secret, ni valeur de variable d’environnement, ni clé dans le dépôt, les messages de commit ou les réponses.
8. Ne pas toucher aux branches de travail des autres lots, à `src/charte/Charte.tsx` ni au dossier `pointzero-rosaces-prive` sans demande explicite.
9. Aucune action irréversible (suppression de branche, de déploiement ou de données, rotation de clés, envoi vers l’extérieur) sans accord explicite.

## Commandes utiles

- `npm test` — tests serveur (dont SYST’AIME)
- `npx tsc --noEmit` — types
- `node tests/systaime/valider.mjs` — manifeste (`SYSTAIME_STRICT=1` : « à revérifier » devient une erreur)
- `node tests/systaime/projeter.mjs` — régénère la version publique

## Réserves

Ces consignes n’ont été vérifiées que pour Claude Code. Les autres agents (Codex, Cursor, etc.) peuvent ne pas les lire : non vérifié.

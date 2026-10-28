# Intégration continue

## Pourquoi ce document plutôt qu'un fichier `.github/workflows/ci.yml`

Le workflow est écrit, testé dans sa logique, et prêt à l'emploi. Il n'est pas
dans le dépôt pour une raison mécanique : le jeton employé pour pousser cette
branche n'a pas la permission `workflows`, et GitHub refuse catégoriquement la
poussée d'un commit qui ajoute ou modifie un fichier sous `.github/workflows/`.

```
! [remote rejected] (refusing to allow a GitHub App to create or update
  workflow `.github/workflows/ci.yml` without `workflows` permission)
```

Plutôt que de laisser un fichier que personne ne peut pousser — ou de le pousser
en le renommant pour contourner un contrôle de sécurité, ce qui serait la pire
des réponses — il est consigné ici. **Personne ne doit contourner cette
protection** : elle existe pour qu'un jeton compromis ne puisse pas exécuter du
code arbitraire sur les runners du dépôt.

## Installation

Deux façons, au choix :

1. Donner la permission `workflows` à l'application GitHub concernée
   (réglages du dépôt ou de l'organisation, *GitHub Apps* → *Repository
   permissions* → *Workflows: Read and write*), puis placer le fichier ci-dessous
   dans `.github/workflows/ci.yml`.
2. Le placer soi-même, avec un compte qui a les droits :

```bash
mkdir -p .github/workflows
$EDITOR .github/workflows/ci.yml   # coller le contenu ci-dessous
git add .github/workflows/ci.yml
git commit -m "CI : types, tests et build à chaque push et pull request"
git push
```

## Le workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: Types, tests et build
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      # npm ci plutôt que npm install : le dépôt doit pouvoir être reconstruit
      # exactement à partir du lockfile.
      - run: npm ci

      # tsc --noEmit && vitest run && vite build — la même commande que
      # `npm run verify` en local. Les tests sont bloquants : une régression de
      # l'export PDF ou de la sérialisation fait échouer la fusion.
      - run: npm run verify

      - name: Résumé
        if: always()
        run: |
          echo "### Vérification" >> "$GITHUB_STEP_SUMMARY"
          echo "- \`tsc --noEmit\` : types stricts" >> "$GITHUB_STEP_SUMMARY"
          echo "- \`vitest run\` : export PDF, moteur, formats" >> "$GITHUB_STEP_SUMMARY"
          echo "- \`vite build\` : l'application se construit" >> "$GITHUB_STEP_SUMMARY"
```

## Ce qu'il vérifie

`npm run verify` enchaîne trois commandes, dans cet ordre, et la première qui
échoue arrête la suite :

| Étape | Commande | Ce qu'elle attrape |
| --- | --- | --- |
| Types | `tsc --noEmit` | Toute régression de typage. Le projet est en `strict` avec `noUnusedLocals` et `noUnusedParameters` : une variable morte fait échouer la fusion. |
| Tests | `vitest run` | 162 tests sur 9 fichiers, dont les 12 auto-tests du moteur (`src/lib/checks.ts`) exécutés à chaque passage : export PDF, sérialisation par codes, symétrie, formats, tables couleur, journal, guide. |
| Build | `vite build` | L'application se construit réellement, en monofichier, avec les tables de données embarquées. |

`npm ci` plutôt que `npm install` : le dépôt doit pouvoir être reconstruit
exactement à partir du lockfile, et une divergence entre `package.json` et
`package-lock.json` échoue au lieu d'être réparée en silence.

## État : jamais exécuté

⚠️ **Aucun run n'a eu lieu.** Ce workflow n'a pas été exécuté par GitHub Actions
depuis cet environnement, puisque le fichier n'a pas pu être poussé. La commande
qu'il joue (`npm run verify`) est en revanche exécutée localement à chaque
modification, et passe. Le premier run devra être regardé : la version de Node
(22), le cache npm et la durée (le build monofichier prend environ 7 s, la suite
environ 6 s, largement sous le plafond de 15 minutes).

## Ce qui n'est pas dans la CI, et pourquoi

- **Pas d'ESLint.** Le projet n'a ni configuration ni dépendance ESLint. En
  ajouter une pour la CI sans l'avoir adoptée localement produirait des centaines
  d'erreurs de style et masquerait les régressions réelles. `npm run verify` est
  la porte d'entrée, et c'est écrit dans le README pour qu'on n'attende pas un
  lint qui n'existe pas.
- **Pas de test navigateur.** Les tests tournent sous jsdom, y compris
  `atelier.test.tsx` qui monte `App` entier avec trois polyfills (`matchMedia`,
  `ResizeObserver`, environnement `act`) et suit le guide de bout en bout. Ce
  qui dépend d'un vrai moteur de rendu reste hors de portée : l'aperçu PDF dans
  un `<iframe>`, qui ne s'affiche pas sur iOS Safari, le stylet Apple Pencil, le
  Wake Lock, le tracé du canevas, et l'animation du guide — sa pulsation est une
  feuille de style, et jsdom ne calcule pas le rendu. Vérifier qu'un pictogramme
  pulse *vraiment* à l'écran demande un œil, pas un headless Chrome.
- **Pas de déploiement.** L'application est hors ligne et monofichier : le build
  est le produit. Publier `dist/index.html` est un choix d'hébergement, pas une
  étape de vérification.

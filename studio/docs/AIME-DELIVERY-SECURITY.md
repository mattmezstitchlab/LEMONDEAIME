# Lot sécurité / erreurs serveur

Base : lot P0 `a195c6e`. Aucun service externe configuré, aucun secret utilisé.

## Cause HTTP 500 reproduite

Les journaux de la preview du commit `a4dfb5c` le 15/10/2026 à 23:35 UTC indiquent `SyntaxError: Invalid or unexpected token` au chargement ESM de `/api/pointzero-launch`. `node --check api/_launch-utils.mjs` reproduit l'erreur : une ligne finale contient des caractères littéraux `\\n` hors chaîne. Correction en vrais sauts de ligne ; le helper reste un endpoint 404. Les autres modules serveur passent `node --check`.

Tests Node ajoutés à `npm run verify` : GET sans configuration retourne 200 avec services désactivés, administration refusée sans credentials, origine étrangère refusée, méthodes rejetées, inscription/scan désactivés, helper 404. Ces tests importent le vrai module : l'erreur de syntaxe initiale empêche leur exécution, même si Vite construit le client. Aucun appel à des services réels.

## Dépendances ciblées

- PDF.js 5 → 6.4.299 (mise à jour majeure ciblée nécessaire au correctif connu) : adaptation de `openPdf` à `PDFDocumentLoadingTask.destroy`, retiré de PDFDocumentProxy. Test réel jsPDF → PDF.js : pages, texte, viewport et libération. Tests métier PDF existants conservés ; rendu Canvas réel navigateur à recetter.
- Vite 7.3.2 → 7.3.7 et résolution esbuild 0.28.2 compatible.
- Vitest 3 → 4.1.11, version corrigée sans passer directement à 5. Mocks du test d'accueil typés explicitement, sans suppression d'assertion. La chaîne Tinypool vulnérable disparaît.
- Suppression de vite-plugin-singlefile et de ses transitives micromatch/braces : aucune version corrigée compatible démontrée, pas de downgrade arbitraire vers 0.9.0. La distribution web devient un bundle Vite standard. Le fichier autonome unique n'est plus produit ; aucune donnée utilisateur n'est modifiée.

`npm audit --package-lock-only` retourne **0 vulnérabilité connue** après résolution. Ce n'est pas une certification d'absence de faille. Le lockfile est régénéré par npm, pas modifié manuellement. Node requis par PDF.js : >=22.13 ou >=24 ; CI utilise le dernier Node 22, Vercel Node 24.

## Préservation hors ligne

Le plugin de build local injecte les assets JS/CSS générés dans `dist/sw.js` et calcule une révision de cache à partir de leurs noms hachés. Installation du shell critique atomique via cache.addAll : si un asset manque, ne pas activer le nouveau SW. Les assets optionnels gardent leur mode tolérant. Exclusion `/api/` conservée. Le contrôle `scripts/check-offline.mjs` vérifie les fichiers du manifeste et les imports du HTML après build.

La recette navigateur reste indispensable : première installation en ligne, fermeture/réouverture hors ligne, Atelier/PDF, mise à jour de build, retour arrière. Pas de navigateur autorisé disponible ici. Le pré-cache inclut les bundles JS/CSS émis ; il ne garantit pas la disponibilité hors ligne de contenus externes, médias non chargés ou de tous les ressources PDF supplémentaires.

## Recette finale

`npm run verify` inclut tests Node, TypeScript, tous les tests Vitest, build et contrôle du manifeste hors ligne. Vérifier ensuite le SHA exact de CI/preview. Le succès du GET en ligne doit être confirmé via une requête navigateur autorisée ; aucun accès HTTP au déploiement depuis le sandbox n'est possible. Aucun ancien déploiement n'est reconstruit ni remplacé.

Validation locale finale : 451/451 tests Vitest (57 fichiers), 6/6 tests Node, TypeScript et build réussis ; manifeste hors ligne contrôlé (16 assets). Audit npm : 0 vulnérabilité connue. Le build conserve un gros chunk initial (~530 kB gzip de JS) et signale sa taille ; aucun seuil n'a été masqué. Le découpage de l'accueil et des Studios reste une optimisation distincte.

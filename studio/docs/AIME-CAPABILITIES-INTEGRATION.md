# Réconciliation registre / passation consolidée

## Provenance

Base distante vérifiée : `c93054fd88a9194ce43d31e8aa595b3d1cf479f6` (PR #41, `chore/aime-vercel-handoff`).
Travail original récupéré localement : `008fbbfa491b546877e3e3b9390a887e0d25a02a`, repris par cherry-pick, pas recréé.
Archive originale encore présente ; SHA-256 : `aa0f8ea6a46756d5be5baea3c8dc6356d440e77ff5fd9b81af4055e4a16dc74e`.
Liste des chemins inspectée : patch, README, trois journaux, sans chemins absolus ou traversées ; aucune extraction/exécution de scripts d'archive. Le commit source contient quatre fichiers texte du registre, tests et documentation. Pas de secret ni modification des dépendances.

## Réconciliation

Aucun conflit Git et aucun changement à `oneSpaceCore.ts`, `dossierSchema.ts`, `universalDossier.ts`, `academyCore.ts` ou aux protections de #41. Le registre référence désormais le commit source consolidé. Les preuves sont des contrats locaux testés : pas une certification de fonctionnement hébergé. Le commit de cette PR et sa CI identifient la nouvelle intégration.

- `WorldSpace.id` reste l'identité ; `WorldSpace.dossier` reste l'extension versionnée.
- Formation reste calculée ; Academy reste un support indépendant lié au dossier.
- `dossierCapabilities.ts` valide le snapshot ou le magasin local sans interpréter un magasin invalide comme vide.
- `DossierCapabilityPanel` est intégré à `/espace` : confirmer une cible structurée, diagnostiquer, préparer explicitement une proposition JSON à copier. Aucun changement du dossier, aucun stockage de besoin ni ticket externe.
- Les propositions ont leur propre historique explicitement marqué : elles ne sont pas des décisions inscrites dans `UniversalMeta.history`.
- Les champs Studios/moteurs du besoin restent à cadrer humainement s'ils sont inconnus.
- Le catalogue n'accepte pas de fonction générée par une intention ; aucun chemin d'exécution publication/envoi/écriture n'est ajouté.

## Capacités : état précis

Toutes sont des prototypes locaux avec contrats testables, pas des services multi-utilisateurs :

| Capacité | Effets et limites |
|---|---|
| Structurer une intention | Heuristique locale limitée, sortie à relire |
| Préparer un dossier | WorldSpace en mémoire, aucun enregistrement implicite |
| Projeter Formation | Métadonnées training nécessaires, aucune certification |
| Préparer Academy | Support en mémoire, ne remplace ni ne répare un support existant |
| Exporter le dossier | Lecture du snapshot canonique si présent ; aucun export automatique des contenus spécialisés |

Un diagnostic immédiat signifie qu'un contrat est applicable aux entrées confirmées, pas qu'une action a été exécutée. Le panneau distingue la santé du support Academy existant de la capacité à en préparer un. Une référence cassée n'est pas réparée.

## Recette reproductible

```sh
npm ci --ignore-scripts
npx vitest run src/__tests__/capabilityRegistry.test.ts src/__tests__/dossierCapabilities.test.tsx src/__tests__/universalDossier.test.tsx
npm run verify
```

Dans `/espace` sur un dossier fictif existant :
1. Diagnostic des capacités → cible `formation` ou `academy` → confirmer ; aucune sauvegarde.
2. Saisir `publication-distante` → diagnostic développement.
3. Préparer la proposition → JSON avec l'identifiant canonique, intention, manque, risques, critères et historique ; copier avant de quitter.
4. Le test `DEMO` du registre reproduit le cycle absent → besoin → acceptation explicite → inclusion d'une capacité Academy réellement testée → exécution en mémoire → satisfaction explicitement décidée. Il ne génère pas une capacité nouvelle.

Tests ajoutés : contrats/diagnostics, prérequis réels du dossier, refus de données corrompues/futures, absence d'écritures, référence Academy invalide conservée, action inconnue refusée, objectifs vides/personnalisés, besoin/historique indépendant, panneau React en JSDOM.

Limites : pas de test navigateur réel derrière SSO, pas d'authentification de l'historique local, pas de recherche sémantique des doublons, pas de persistance des besoins. Les alertes npm préexistantes restent hors de ce lot.

## Exploitation future

L'agent peut, pendant une mission, lire source/PR/CI et données Vercel autorisées, proposer un correctif isolé, tester et publier une PR selon mandat. Il ne tourne pas en permanence : surveillance planifiée, alertes push et tâches récurrentes exigent un ordonnanceur/intégration et des droits dédiés. Les autorisations GitHub ne constituent pas des autorisations Vercel de mutation.

Les fusions, production, migrations/réparations des données, secrets, services payants et changements d'infrastructure restent soumis à validation explicite. Les coûts peuvent être consultés selon accès, pas garantis sans quotas/budgets. Les tests visuels authentifiés exigent un navigateur autorisé ; aucune protection ne doit être désactivée pour contourner cette limite.

## Résultats locaux de cette livraison

`npm run verify` réussi : TypeScript, **436 tests / 56 fichiers**, build Vite. Tests ciblés : **32 / 32**. Le build HTML atteint 4 560,16 kB, 1 397,93 kB gzip ; aucune optimisation de bundle dans ce lot. JSDOM émet encore son avertissement préexistant de navigation non implémentée sur le dossier éditorial, sans échec de test. Aucune dépendance ni infrastructure modifiée.

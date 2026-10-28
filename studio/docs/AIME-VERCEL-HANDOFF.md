# AIME × POINTZERO — Passation technique à Vercel Agent

**État de référence : 16 octobre 2026.**  
**Dépôt :** `mattmezstitchlab/POINTZERO`  
**Production :** `main` @ `ecc686fa3265e4a6d34a64e4e3fe170ff7893816` (confirmé par GitHub ; ne pas interpréter comme une autorisation de déploiement).  
**Base fonctionnelle :** PR #40 @ `32cd0c891790034d9404f89322999e00a63c3973`.  
**Consolidation :** `chore/aime-vercel-handoff` issue de la branche #40 ; voir sa PR brouillon pour le SHA précis et les contrôles actuels.  
**Interdictions sans approbation :** fusion dans `main`, déploiement production, mutation de données d'utilisateurs, activation de services payants, changement de clés, réglages de sécurité ou publication de fichiers privés.

Ce document décrit **ce que le dépôt contient réellement** et les procédures de reprise. Il ne déclare aucune fonction Vercel Agent opérationnelle sur la base d'un simple compte rendu de développement.

## 1. Architecture existante et principe non négociable

Le socle canonique est `WorldSpace` (`src/lib/oneSpaceCore.ts`) et son `WorldSpace.id`. Le magasin local reste `WorldStore.version=1`, sous la clé `pointzero:one-space:v1` (`WORLD_KEY`). Le champ facultatif **`WorldSpace.dossier`** (`UniversalMeta.version=1`) enrichit un projet déjà connu du Kernel, **sans création d'un deuxième dossier central**.

- `WorldSpace` : `id`, `kind`, `title`, `description`, `created`, `people`, `moments`, `tiles`, `signals` et `dossier?`.
- `UniversalMeta` : `intent`, `primaryUniverse`, `associatedUniverses`, `identityRef`, `objectives`, `references`, `decisions`, `actions`, `contributions`, `relations`, `history`, `training?`.
- **Formation** est une projection de `WorldSpace.dossier.training` : `projectFormation(space)`, et non une entité `FormationDossier` indépendante.
- **Academy** est un support spécialisé `SiteProject` stocké **par dossier** dans `pointzero:academy:linked:<spaceId>:v1`. Un lien `WorldSpace.dossier.references` et la `tile` `academy` portent sa référence, sans recopier tout le support dans `WorldSpace`.
- Le projet Academy historique `pointzero:academy:project:v1`, sa progression `pointzero:academy:learning:v1` et les anciens `WorldSpace` doivent continuer à fonctionner.
- `SpacePerson.role`, les consentements de notification et les `WorldSpace.signals` sont **des données locales de planification, pas des comptes authentifiés ni des permissions serveur**.

### Fichiers et contrats fondamentaux

| Fichier | Contrat et responsabilité |
|---|---|
| `src/lib/oneSpaceCore.ts` | `WorldSpace`, `WorldStore`, `safeWorld`, `readWorld`, `writeWorld`, `newSpace`, `previewImpact`, `sourcesForTile` |
| `src/lib/dossierSchema.ts` | `UniversalMeta`, `validUniversalMeta`, `TrainingContext`, `DossierReference`, `DossierChange` |
| `src/lib/universalDossier.ts` | `makeUniversalDossier`, `createUniversalDossier`, `updateUniversalField`, `addUniversalMoment`, `projectFormation`, `attachAcademyResource`, `academyReferenceHealth`, `exportUniversalJSON`, `importUniversalJSON` |
| `src/lib/academyCore.ts` | `SiteProject`, `validProject`, `academyDisplayProject`, `exportAcademyHTML` et modèle Academy d'origine |
| `src/components/AcademyStudio.tsx` | Éditeur réel, liaison dossier et modes `linked` / `custom` |
| `src/components/UniversalDossierStudio.tsx` | Parcours intention → dossier → formation → Academy → mémoire |
| `src/App.tsx`, `src/lib/entryNavigation.ts` | Routeur SPA, navigation, compatibilité des anciens liens |
| `src/components/AimeEcosystem.tsx`, `ManifestLanding.tsx` | AIME mère et accueil POINTZERO |
| `src/components/AimeDossier.tsx`, `src/lib/aimeReference.ts` | Dossier de référence *éditorial*, distinct de l'objet métier universel |
| `vercel.json` | Rewrites ciblés des routes publiques, sans intercepter les API |
| `src/__tests__/universalDossier.test.tsx` | Tests des contrats du Kernel, des dossiers, Academy, imports, historique et anciens espaces |

### Routes

- `/` : AIME mère.
- `/pointzero` : manifeste « Le temps retrouvé ».
- `/atelier` et `/atelier?studio=...` : Studios existants.
- `/espace` ou `/espace?id=<WorldSpace.id>` : véritable **Dossier Universel**, stockage local.
- `/atelier?studio=academy&dossier=<WorldSpace.id>` : Academy spécialisée liée au dossier.
- `/dossier` : dossier de référence **documentaire**, non un dossier métier.
- `/univers`, `/univers/:slug`, `/vision`, `/le-monde-aime` : pages distinctes.
- Les anciens liens `?site=le-monde-aime`, `?page=manifest`, `?studio=...` sont pris en charge par le routeur.

## 2. GitHub : état et dépendances vérifiés

| PR | Branche | SHA de tête vérifié | Base réelle | État |
|---|---|---|---|---|
| [#36](https://github.com/mattmezstitchlab/POINTZERO/pull/36) | `feat/unified-metamorphose-ripple-game` | `dd9a04b130e611899e3da8776e793bd508a6987b` | `main` | Draft, non fusionnée |
| [#37](https://github.com/mattmezstitchlab/POINTZERO/pull/37) | `feat/pointzero-manifeste-launch` | `cf201246716d2c3b8d294d9b4f26b679a9bbbb66` | #36 | Draft, non fusionnée |
| [#38](https://github.com/mattmezstitchlab/POINTZERO/pull/38) | `feat/aime-mother-architecture` | `d5278d362df4d8b2b3242baf624ef4a0063478e3` | #37 | Draft, non fusionnée |
| [#39](https://github.com/mattmezstitchlab/POINTZERO/pull/39) | `feat/aime-reference-dossier` | `a4dfb5caa38f070acfcdd2b39811dc21bc77dd47` | #38 | Draft, non fusionnée |
| [#40](https://github.com/mattmezstitchlab/POINTZERO/pull/40) | `feat/aime-universal-dossier` | `32cd0c891790034d9404f89322999e00a63c3973` | #39 | Draft, non fusionnée |

La comparaison `main...feat/aime-universal-dossier` indique **128 commits en avance, zéro en retard, 49 fichiers changés** ; `merge_base = ecc686fa...`. À la consultation, GitHub annonce les cinq PR `mergeable: true` : cela signifie absence de conflit Git détecté **à cet instant**, pas absence de conflits fonctionnels ni garantie de déploiement.

La consolidation est **empilée au-dessus de #40**. Ne pas ouvrir une PR de consolidation directement contre `main` : elle contiendrait toute la pile et rendrait la revue impossible.

## 3. Fonctions réellement en place / non en place

### Implémenté dans les branches de développement

- Landing mère AIME et manifeste POINTZERO, navigation vers Studios et Univers.
- Jeu, Métamorphose et RippleCircle comme modules distincts de la chaîne #36.
- Dossier de référence public, sourcé, avec scénarios illustratifs, #39.
- Création locale d'un dossier canonique `WorldSpace` depuis une intention.
- Analyse d'intention **déterministe/heuristique**, **pas un agent IA**.
- Projection Formation : loisirs / associative / professionnelle, valeurs manquantes et brouillons.
- Modification du titre et des champs métiers avec historique des modifications **enregistrées**.
- Académie/Academy : éditeur existant, titre et objectifs lus depuis le dossier par `academyDisplayProject` ; modes liés ou personnalisés ; support persistant localement par dossier.
- Export JSON du dossier, HTML/JSON Academy, import dossier avec confirmation explicite en cas d'identifiant existant.
- Protection consolidée des écritures sur magasin universel corrompu ; diagnostics de liens Academy manquants / invalides ; confirmation pour remplacer une référence existante ; état explicite d'objectifs vides.

### Non implémenté

- Authentification serveur, gestion de droits par organisation, véritable carte universelle sécurisée.
- Base de données partagée, transactions multi-appareils, résolution collaborative de conflits.
- Agents IA de formation, système d'exécution autonome, monitorage avec correction sûre automatique.
- ERP de formation : inscription apprenants, Qualiopi, attestations certifiées, financeurs, émargement, facturation réelle.
- Attribution juridique certifiée, causalité scientifique, reconnaissance automatique d'antériorité.
- Registre des capacités **intégré et validé dans la branche publique** — voir §6.
- Synchronisation complète avec Programme, Admin, Legal, Design et autres Studios ; seuls des composants et références existent.
- Tests visuels de bout en bout derrière l'authentification Vercel SSO : `READY` reste distinct d'une validation fonctionnelle.

## 4. Contrôles reproductibles

À la racine, avec l'environnement Node adapté à la CI et un lockfile inchangé :

```bash
git status --short
npm ci
npm run typecheck
npm test
npm run build
# ou vérification intégrale, identique au script du projet :
npm run verify
```

Le script `verify` exécute `tsc --noEmit && vitest run && vite build`. Les tests React/Vitest tournent en JSDOM. Ils valident les contrats du code ; ils **ne certifient pas** la qualité mobile, les clics en navigateur réel, les permissions ni les routes derrière SSO.

La PR #40 au commit `32cd0c8` avait **415 tests réussis sur 415 / 54 fichiers**. La consolidation a été vérifiée sur le commit [`21d1d10b19a824b360220e5cad569b5e31a3fef7`](https://github.com/mattmezstitchlab/POINTZERO/commit/21d1d10b19a824b360220e5cad569b5e31a3fef7) : **420 tests réussis sur 420 / 54 fichiers, TypeScript et build Vite réussis**, workflow GitHub Actions `38825043947` conclu `success`. Toute modification ultérieure, y compris de ce document, exige une nouvelle vérification sur le SHA résultant.

Checklist indispensable :
1. Création, schéma, IDs canoniques et projection Formation.
2. Ancien `WorldSpace` sans `dossier` : lecture, adoption volontaire sans destruction.
3. Titre canonique modifié → Formation et Academy reflètent le changement → export HTML/JSON conforme.
4. Titre/objectifs personnalisés : **aucun écrasement implicite**.
5. Objectifs canoniques vides : état explicitement vide, sans ancien contenu fictif.
6. Référence Academy absente / invalide : erreur visible et lien original préservé ; remplacement **confirmé** et historisé.
7. `WORLD_KEY` corrompu, inconnu ou stockage plein : refus d'écriture, octets préservés, erreur visible.
8. Import d'un ID existant : refus automatique ; remplacement consenti à l'écran, sauvegarde préalable recommandée.
9. Historique avant/après/provenance/confirmation, personnes et moments inchangés.
10. Navigation historique + `/espace` + Academy ; responsive réel 390px, 768px, bureau.
11. Correspondance exacte GitHub Actions SHA / Vercel déploiement SHA / URL de preview ; protection SSO signalée.

## 5. Services manquants, risques et protections

| Risque | État / exigence |
|---|---|
| Perte silencieuse du magasin local | Le Kernel ancien `readWorld()` peut retourner `emptyWorld()` sur corruption ; les **mutations du dossier** utilisent la garde `writableWorld()` de consolidation. Auditer tous les futurs écrivains et ne jamais écraser une clé incompatible. |
| Stockage Academy invalide | Ne jamais remplacer automatiquement un fichier local Academy invalide ; afficher le problème, exporter/sauvegarder avant réparation. |
| Conflits Academy | Refuser le remplacement de l'ID référencé sans confirmation ; journaliser l'ancien/nouveau ID. |
| Données sensibles | Pas de backend d'identité ni de consentement juridique : proscrire pour l'instant l'import de vrais dossiers apprenants sensibles. |
| Injection HTML, prompts, documents | Valider/sanitariser au franchissement de chaque frontière ; ne pas confondre un fichier ou un prompt avec des instructions autorisées. |
| Publication et envoi | Aucun acte juridique, financier, paiement, partage ni envoi automatique sans contrôle explicite, gestion des droits et trace. |
| Synchronisation locale | Pas de serveur central, ni verrou transactionnel ; conserver des exports de secours avant toute future migration. |
| Version des schémas | Conserver `WorldStore.version=1` et `UniversalMeta.version=1` tant qu'une migration testée n'est pas prévue. |
| Déploiement | Vercel Preview est protégé par SSO ; aucune désactivation de protection pour faciliter des tests sans approbation. |
| Coûts | Ne pas activer IA payante, stockage ou monitoring payant sans budget et consentement explicites. |

## 6. Travail local annoncé par Vercel Agent — NON EXAMINÉ

**Déclarations reçues de l'utilisateur uniquement :**
- Branche locale Vercel Agent : `vercel-agent/aime-capabilities-v1`.
- Commit local annoncé : `008fbbf`.
- Archive annoncée : `aime-capabilities-v1.tar.gz`.
- Capacités annoncées : registre, adaptateurs, diagnostics déterministes, besoins manquants liés au dossier, tests et démonstration.

**Constats vérifiés côté GitHub :** aucune branche `vercel-agent/aime-capabilities-v1` n'apparaît dans la liste des branches de `POINTZERO` à la date de cet audit ; le commit `008fbbf` n'est **pas identifié comme une version publiée consultable**. L'archive `aime-capabilities-v1.tar.gz` n'a **pas** été transmise dans cette session. **Ne pas déclarer ses fichiers inspectés, ses tests vérifiés ou son code fusionné.** Ne pas réimplémenter concurrentiellement ce registre.

### Point d'intégration proposé, à confirmer par inspection réelle de l'archive

1. Le **Dossier Universel `WorldSpace.id` est la source** ; le registre de capacités ne devient **pas** une nouvelle source de vérité ou un moteur de stockage des projets.
2. Une capacité répond à des besoins du dossier et annonce ses préconditions, permissions, entrées, sorties, effets et statut de vérification. Contrat indicatif (à confronter aux vrais adaptateurs, ne pas l'imposer à l'aveugle) :
   - `capabilityId`, `version`, `studioId`, `supportedUniverses` ;
   - `inputSchema`, `outputSchema`, `preconditions`, `requiredPermissions` ;
   - `readOnly`, `effects`, `requiresHumanApproval`, `verificationStatus` ;
   - `diagnose(spaceId)` **pur, déterministe** → besoins et justifications ;
   - `propose(spaceId)` → suggestions sans mutation ;
   - `execute(spaceId, approvedAction)` **sous contrôle** → résultat et trace de provenance.
3. Les manques doivent être des **besoins traçables** (capacité introuvable, permissions absentes, données requises ou intégration manquante), **pas** des outils annoncés comme opérationnels.
4. Les suggestions IA doivent avoir un statut distinct des décisions réellement enregistrées dans `UniversalMeta.history`.
5. Aucun adaptateur ne doit contourner `safeWorld`, `validUniversalMeta`, les conflits explicites Academy ou l'absence d'identité serveur.
6. Dans un premier temps : registre **en lecture seule**, diagnostics **sans effets**, tests sur dossier de démonstration. Les actions mutables exigent une deuxième validation d'architecture et de permissions.

### Procédure de réception du code Vercel Agent

- Demander l'archive dans un canal autorisé ou la publication sur une branche distante **distincte** sans fusion.
- Vérifier provenance, hash de l'archive, diff, taille, fichiers inclus et présence éventuelle de secrets. Inspecter la liste des chemins avant extraction et rejeter les chemins absolus, les `../` et les liens dangereux.
- Ne pas exécuter automatiquement des scripts fournis, installer des dépendances ni exposer des variables Vercel avant revue.
- Comparer le patch à `feat/aime-universal-dossier` et **à la consolidation**, lire les adaptateurs, leur logique de stockage et leurs tests ; relever collisions de noms, schémas et effets.
- Exécuter les tests sur une **branche d'intégration dédiée**. Documenter chaque adaptateur et chaque capacité comme `opérationnelle / partielle / prototype / vision`.
- Refuser toute migration implicite ou écriture sur les dossiers réels ; valider l'import/export d'une copie fictive avant une autorisation ultérieure.
- Mettre en revue une PR séparée vers la branche consolidée, sans `main`.

## 7. Protocole GitHub ↔ Vercel Agent

**GitHub = historique, preuve de code, branches, tests et approbations. Vercel = prévisualisation et environnement d'exécution selon droits accessibles.**

1. Vercel Agent vérifie **son workspace courant, son SHA, sa branche** ; s'il n'a qu'une copie locale, il le dit.
2. Chaque mission crée une branche depuis un SHA distant vérifié ; elle décrit les fichiers, les invariants et les tests avant de modifier.
3. Diagnostics d'abord, patch isolé ensuite ; aucune correction de données ni migration sans sauvegarde et autorisation.
4. PR en brouillon vers la branche de développement correspondante, et non `main` ; tests GitHub Actions `verify`.
5. Déploiement **Preview seulement** via l'intégration Git existante ; vérifier le SHA exact, le statut `READY` et le comportement d'URL dans un navigateur autorisé.
6. Les actions sensibles (fusion `main`, production, paiements, APIs externes, authentification, secrets, données privées) requièrent autorisation explicite de l'utilisateur.
7. Chaque livraison met à jour son journal : **SHA, PR, tests, URL et limites** ; si le SSO bloque le rendu visuel, le marquer `non validé`.
8. Une tâche défaillante produit un diagnostic, des étapes reproductibles, les preuves et une proposition de correctif ; **pas** la promesse d'auto-réparation universelle.

## 8. Fusion progressive envisagée — NE PAS EXÉCUTER sans validation

Ordre obligatoire : **#36 → #37 → #38 → #39 → #40 → PR de consolidation**, puis éventuellement la future PR d'intégration Vercel.

Pour chaque étape :
- Vérifier à nouveau les têtes des PR et le merge-base ; si un parent a changé, **rebaser/adapter les PR suivantes uniquement avec validation**.
- Exécuter les tests de la branche et la recette des fonctions concernées, notamment conservation des `localStorage` historiques.
- Examiner les API, routes, coûts et politiques de cache/PWA. Déployer une preview isolée sur son SHA.
- Recueillir l'accord explicite **avant** de fusionner une PR vers `main`. Ne pas confondre un merge vert avec une validation du produit.
- Une fois le parent fusionné, **retargeter** la PR fille vers le parent intégré ; ne pas fusionner toute la pile à l'aveugle.
- Ne pas activer une migration de stockage persistante en production sans sauvegarde et tests de restauration.

## 9. Retour arrière

Avant toute future diffusion, exporter les espaces `WORLD_KEY` et Academy (y compris les clés `pointzero:academy:linked:*:v1`), contrôler qu'ils sont lisibles et garder une copie **hors application**, sans leur contenu dans Git.

- **Une PR non fusionnée :** ne pas la fusionner ou revenir au commit parent ; aucun impact production.
- **Preview Vercel :** utiliser l'URL de preview du SHA précédent, sans promotion. `READY` n'est pas un environnement de stockage central.
- **Production future après autorisation seulement :** revenir à un ancien commit/deployment **après évaluation de compatibilité de données**. Un rollback de code n'annule pas forcément les modifications de schéma ni les données utilisateurs.
- **Dossier importé à tort :** restaurer explicitement le JSON sauvegardé ; ne pas supprimer automatiquement d'autres espaces.
- **Référence Academy remplacée :** l'historique conserve ancien/nouvel ID. Restaurer le précédent avec une action explicite et vérifier le support correspondant ; ne pas réécrire de support personnel.
- **Stockage corrompu :** bloquer les écritures, préserver les octets d'origine, documenter le diagnostic et faire récupérer/importer depuis une copie validée.

## 10. Priorités Vercel Agent

**P0 — réception/audit de l'archive annoncée.** Confirmer le vrai SHA, la provenance, les fichiers, l'API réelle du registre et les effets de ses adaptateurs. **Ne rien réécrire tant que le code n'est pas examiné.**

**P1 — registre en lecture seule :** associer les capacités effectivement implémentées aux besoins du dossier, identifier les lacunes, rendre un diagnostic traçable. Tester sur des données fictives.

**P2 — intégration unique du parcours :** depuis une intention, capacités pertinentes → proposition de Studio compatible → confirmation humaine → provenance. Mesurer réellement le nombre d'écrans et de ressaisies.

**P3 — backend sécurisé éventuel :** authentification, espace organisation, consentements, persistance et audit d'événements, migrations et réversibilité. Choix d'hébergement/coûts et validation d'une architecture de sécurité avant toute donnée sensible.

**P4 — extension progressive :** Programme, Admin/Legal/Documents/Design et les autres Univers comme projections, jamais comme dossiers centraux concurrents.

### Première mission recommandée à Vercel Agent

> **Faire la revue d'intégration du commit local `008fbbf` et de l'archive `aime-capabilities-v1.tar.gz` contre la branche de consolidation GitHub, sans rien déployer en production.** Restituer l'inventaire réel des capacités, les interfaces disponibles, les collisions éventuelles avec `WorldSpace.dossier`, les risques de stockage et de permission, les tests reproduits et **une PR brouillon de rapprochement** si le code est publiable et compatible. Sans archive accessible, fournir uniquement la checklist de réception et le diagnostic d'écart.

**Principe à préserver : « Un même projet. Plusieurs usages. Une seule mémoire. »**

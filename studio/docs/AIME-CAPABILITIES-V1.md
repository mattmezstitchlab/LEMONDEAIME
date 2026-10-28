# Registre technique AIME v1 — prototype local

## Référence et périmètre

Source examinée : `32cd0c891790034d9404f89322999e00a63c3973`, branche `feat/aime-universal-dossier`.
Le commit source prouve l'existence des moteurs, pas l'exécution de ces nouveaux tests à cette ancienne révision. La révision du patch/commit qui contient ce document et ses tests identifie la validation du registre. Aucune preuve de fonctionnement hébergé n'est revendiquée.

Une capacité n'est pas un Studio : contrat technique (`CAPABILITIES`), adaptateur (`ADAPTERS`) et présentation éditoriale (`aimeEditorial.ts`, inchangée) sont distincts. Plusieurs Studios peuvent réutiliser le même contrat. Les tests locaux vérifient les fonctions réelles, pas les textes d'une landing.

| Capacité | Moteur existant | Contrat et limite |
|---|---|---|
| intent.structure | understandIntent | intention française → inférence heuristique, pas une IA |
| dossier.prepare | makeUniversalDossier | intention → WorldSpace valide en mémoire, sans persistance |
| formation.project | projectFormation | dossier avec training → projection Formation, sans certification |
| academy.prepare | makeAcademyProject + academyDisplayProject | dossier → support lié en mémoire, sans sauvegarde/publication |
| dossier.export | exportUniversalJSON | dossier → JSON du WorldSpace ; contenus Academy/progression exclus |

L'export existant préfère le snapshot canonique local lorsqu'il existe. Aucun nouveau format concurrent du WorldSpace n'est introduit. Formation reste une projection ; Academy reste une ressource spécialisée liée par identifiant. La préparation seule ne crée pas la référence persistante : le parcours UI existant conserve cette responsabilité.

## Usage et garanties

`executeCapability` contrôle entrée, prérequis et sortie, et refuse une capacité inconnue. Les capacités sont du code de confiance audité ; aucune API d'enregistrement dynamique par un utilisateur ou un modèle n'est fournie.

`diagnose` accepte une intention ET une cible structurée confirmée. Il ne prétend pas extraire arbitrairement toutes les tâches d'une demande libre. Il recherche un chemin borné sur les contrats, sans exécution et sans écriture. Un résultat immédiat/composé est un avis conditionné aux artefacts fournis ; chaque exécution revérifie les valeurs. Les prérequis sont des attestations explicites du contexte appelant, pas des permissions de sécurité. Ne pas exposer directement ce contexte à un futur LLM sans validateur serveur.

Statuts : immédiat, composition, développement, à-vérifier, non-réalisable. Les questions ambiguës, preuves absentes et prérequis non confirmés restent à vérifier. Un blocage explicite produit non-réalisable. Ce prototype ne décide pas de la légalité d'une demande.

## Besoins traçables

`proposeNeed` produit une proposition immuable liée à `dossierId`, avec intention, manque, justification, Studios/moteurs, prérequis, risques, critères et historique. Les champs Studios/moteurs sont vides tant que non évalués : ils doivent être renseignés lors du cadrage humain, pas inventés. `decideNeed` impose acteur, motif et transitions explicites. Ce journal local n'est pas un audit authentifié.

`similarNeeds` retourne des candidats sur le nom de capacité normalisé et un recouvrement lexical ≥ 0,6. Aucun rapprochement/fusion automatique. Ce n'est pas une recherche sémantique et des paraphrases peuvent être manquées. Fournir seulement les besoins autorisés du même utilisateur/organisation ; ne pas exposer des intentions privées d'autres dossiers.

`exportNeeds` fournit un export séparé, lié par identifiant canonique. Pas de sauvegarde implicite ni d'import des besoins, pas de modification du schéma `WorldSpace.dossier` et pas d'écran ajouté à cette première tranche. Une intégration de persistance/UI devra être validée séparément. Le besoin ne survit donc à une session que si l'appelant conserve/exporte explicitement son résultat.

Aucun réseau, IA, création de code, ticket, PR, activation de service ou déploiement. La validation humaine démontrée est un événement explicite de l'API pure ; elle ne constitue pas encore une authentification/approbation serveur.

## Démonstration reproductible

Sur une copie de la branche isolée :

```sh
npm ci --ignore-scripts
npm run typecheck
npx vitest run src/__tests__/capabilityRegistry.test.ts
npx vitest run src/__tests__/capabilityRegistry.test.ts -t 'DEMO'
npm run verify
```

Le test DEMO :
1. Crée réellement un dossier local avec le moteur existant, conserve son id canonique.
2. Simule un catalogue AVANT validation d'Academy (capacité volontairement absente).
3. Demande un support Academy : diagnostic développement, proposition `need-001`, recherche de doublons.
4. Enregistre une acceptation humaine explicite (acteur et motif).
5. Utilise le catalogue incluant l'adaptateur Academy testé : diagnostic immédiat, exécution du moteur réel et validation du SiteProject.
6. Marque le besoin satisfait par décision explicite et exporte son historique.
7. Vérifie que le WorldSpace n'a pas été altéré.

Il s'agit d'une simulation du cycle de validation d'une capacité EXISTANTE, pas de la génération magique d'une capacité manquante. Le code du catalogue ne s'auto-modifie pas. Une nouvelle capacité réelle devra être codée, testée et revue avant inclusion dans le catalogue de confiance.

Un autre test exécute réellement la composition intention → dossier → export JSON. Les tests couvrent aussi les cinq statuts, les prérequis Formation, les entrées rejetées, l'absence de sauvegarde implicite et le refus d'une clôture sans acceptation.

## Suites avant utilisation publique

- Schémas plus détaillés et validation des exports/imports des besoins ; stockage versionné.
- UI de cadrage/confirmation et comparaison des besoins similaires.
- Attestations de preuve produites en CI, avec commit de l'implémentation et résultats, distinctes des références aux moteurs sources.
- Adaptateurs supplémentaires pour sauvegarder/lier explicitement les supports ; tests navigateur.
- Authentification et autorisations avant stockage partagé ou exécution serveur.
- Les alertes npm préexistantes ne sont pas corrigées dans ce lot ; aucune dépendance ajoutée.

# AIME — Dossier Universel · Démonstration d'orchestration

**Branche :** `feat/aime-universal-dossier` · **Statut :** prototype local, non fusionné, non publié en production.

## Audit de départ et décision

L'application avait déjà le registre canonique des espaces `oneSpaceCore.ts` avec `WorldSpace.id`, `people`, `moments`, `tiles`, `signals`, et un stockage `WORLD_KEY = pointzero:one-space:v1`. Les rôles ne sont **pas** des autorisations serveur. Le moteur Academy local `academyCore.ts` contenait déjà l'édition de sites et des exercices, mais enregistrait un projet global indépendant dans `ACADEMY_KEY`.

Décision : **le Dossier Universel est l'extension facultative `WorldSpace.dossier`**, avec une version locale et un schéma contrôlé, **pas une nouvelle table `FormationDossier` ni un registre dupliqué**. L'ancien `WorldStore.version=1` et sa clé de stockage restent compatibles.

## Données canoniques et comportement réel

| Champ / domaine | Lieu canonique | Traitement |
|---|---|---|
| Identifiant et titre | `WorldSpace.id`, `WorldSpace.title` | Un seul identifiant et titre pour le projet |
| Personnes / rôles | `WorldSpace.people` | Données locales, **sans authentification** |
| Moments / liens de programme | `WorldSpace.moments` | Réutilisables par formation ou événement |
| Ressources vers les autres Studios | `WorldSpace.tiles` et `WorldSpace.dossier.references` | Référence vers l'objet ; pas duplication de son contenu |
| Intention / Univers / objectifs | `WorldSpace.dossier` | Version 1, validée strictement |
| Formation (projection) | `WorldSpace.dossier.training` | Loisirs / association / professionnelle ; aucun statut juridique présumé |
| Historique | `WorldSpace.dossier.history` | Changements confirmés de titre, champs de dossier, créneaux, liaison Academy |
| Academy lié | `pointzero:academy:linked:<spaceId>:v1` | Support indépendant **par dossier**, référence inverse dans l'espace |
| Academy historique | `ACADEMY_KEY` | Conservé et inchangé quand un support lié est ouvert |

**Synchronisation du titre :** tant que `dossierBinding.titleMode=linked`, Academy calcule son nom et son titre visible **à chaque lecture** depuis `WorldSpace.title`; ce titre est également utilisé lors de l'export HTML/JSON de son support. L'éditeur peut désactiver explicitement le lien en personnalisant le nom/titre.

**Synchronisation des objectifs :** le mode `objectivesMode=linked` affiche les objectifs canoniques dans la section d'introduction Academy et dans son export. Un changement du texte de cette section active automatiquement `objectivesMode=custom`, sans supprimer le texte du modèle. Le mode de suivi peut être réactivé explicitement par l'utilisateur.

**Réversibilité :** un nouveau support par dossier évite d'écraser le projet Academy ancien ; chaque import d'un Dossier portant l'identifiant d'un dossier local requiert confirmation de remplacement. Les autres espaces ne sont pas touchés. L'adoption d'un ancien `WorldSpace` ajoute simplement les métadonnées facultatives à la demande.

## Interprétation de l'intention : honnêteté sur l'IA

La compréhension actuelle utilise **un analyseur local déterministe** (`understandIntent`), qui détecte quelques éléments (« saxophone », « débutants », « dix », « transmission », etc.). Elle n'effectue **aucun appel à un agent IA**, aucune génération libre d'objectifs pédagogiques personnalisés et aucune analyse réglementaire. Les champs inférés sont des **propositions** à relire.

## Démonstration reproductible (environ trois minutes à chronométrer)

1. **00:00** Ouvrir `/espace` depuis l'accueil AIME ou POINTZERO, saisir « Je suis saxophoniste et je souhaite transmettre l'improvisation à dix débutants. ».
2. **00:30** Cliquer « Comprendre mon projet », lire les propositions et « Créer le dossier local ».
3. **01:00** Consulter la projection Formation : public, dix participants proposés, objectifs, questions, contexte « loisirs » à vérifier. Modifier le titre en « Improvisation — Premier atelier ».
4. **01:30** Cliquer « Créer un support pédagogique » : ouvre le véritable `AcademyStudio` avec le titre **lié** et les objectifs **en lecture du dossier**.
5. **02:00** Adapter une section sans toucher aux objectifs liés, ou personnaliser intentionnellement la description (opt-out de synchro). Sauvegarde locale automatique.
6. **02:30** Revenir avec la flèche d'Academy : la référence du support est affichée dans le dossier et le nouveau titre demeure. Exporter le Dossier Universel en JSON. Réouvrir Academy et vérifier la restauration du support.

**À démontrer en test manuel :** bureau 1440px, tablette 768px, téléphone 390px. Les mesures réelles de durée et de ressaisie devront être chronométrées.

## Tests ajoutés

- Analyse d'intention et distinction heuristique/IA ;
- création via `newSpace` et validation complète via `safeWorld` ;
- adaptation explicite d'ancien `WorldSpace` sans effacement de personnes/moments/signaux ;
- calcul d'une projection Formation liée au titre canonique ;
- changement de titre, journal avant/après/provenance/validation ;
- ajout de moments dans la chronologie partagée ;
- liaison d'Academy et absence de duplication dans les autres espaces ;
- mode lié/personnalisé des titres **et des objectifs** ;
- export/import avec gestion de conflit d'identifiant ;
- montage réel du composant Academy lié, stockage indépendant et retour de référence ;
- montage de l'interface Dossier et navigation vers Academy ;
- conservation des routes existantes via `entryNavigation`.

## Limitations et suite minimale

1. **Persistance locale mono-appareil seulement.** Pas d'identité authentifiée, de partage à distance, de rôles serveur, de collaboration réelle ou d'édition concurrente.
2. Les historiques contiennent les modifications importantes effectuées **dans le Dossier** ; les modifications de chaque bloc du support Academy restent dans son stockage local. La versionabilité fine et les audits centraux des modifications Academy sont à développer.
3. Le modèle sait référencer personnes, décisions, contributions, relations, documents et médias, mais le premier écran n'expose pas encore tous les éditeurs correspondants. Les métiers ne sont pas encore branchés au même niveau qu'Academy.
4. La projection Formation n'émet **aucune convention, attestation ou certificat Qualiopi** et ne réalise ni inscription distante, ni émargement, ni facturation réelle.
5. Aucun moteur sémantique/agent IA n'est connecté. Les scénarios génériques sont plus sommaires que l'exemple saxophone.
6. Les capacités de stockage et d'export JSON ont des limites ; données sensibles à éviter tant qu'un serveur authentifié et chiffré n'est pas opérationnel.
7. Les tests unitaires / React en JSDOM ne constituent pas une validation complète du comportement tactile ou de la preview Vercel. Le statut READY valide le build, pas le rendu dans un navigateur sous SSO.

## Extension aux autres Univers

Ne pas dupliquer le schéma métier universel. Ajouter des **projections** autour du même `WorldSpace.id` (mariage, création, administration). Chaque Studio garde ses contenus spécialistes et revient avec un `reference.targetId`. Les champs de source restent en lecture liée par défaut, avec des personnalisations explicitement dissociées et des validations humaines pour toute action sensible.

**Aucun merge dans `main`, aucune publication de production sans validation.**

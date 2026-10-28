# AIME — cartographie et décisions de regroupement

## Référence et méthode

Base de cette tranche : PR #48, `876d0740a317a66dbb7eb83fbd686e8b710cead7`. Chaîne #36–#48 conservée, sans merge. Cartographie par contrats et moteurs du dépôt POINTZERO, pas audit des applications externes simplement citées. Sources : routes `entryNavigation.ts`, dispatcher `App.tsx`, `src/lib`, `src/components`, tests, documents de passation/livraison. Les tests valident des comportements ciblés ; aucune maturité commerciale ou conformité générale n'en découle.

## Inventaire par famille (emplacement, données, dépendances, preuve, regroupement)

| Domaine/fonction | Emplacement principal | Entrées → sorties / stockage | État, dépendances et preuves | Décision proposée |
|---|---|---|---|---|
| AIME mère, Univers, Vision | AimeEcosystem, aimeEditorial | Registre éditorial → pages ; pas donnée métier | Local/éditorial ; tests aimeArchitecture | Une porte d'entrée, pas un catalogue exhaustif en hero |
| POINTZERO manifeste/origine | ManifestLanding, launchManifest | Configuration éditoriale → présentation | Éditorial ; inscriptions serveur désactivées sans secrets ; tests launchManifest + server | Conserver /pointzero, clarifier origine/moteur ; pas deuxième marque principale |
| Association | AimeLanding, ArtWorldStudio | Présentation et créations locales | Identité distincte ; artWorld/navigation | Aucun regroupement juridique ; liens vers projets associatifs |
| Dossier Universel | universalDossier, dossierSchema | Intention → WorldSpace.dossier, historique, JSON | Prototype local ; tests universalDossier | Source canonique unique WorldSpace.id |
| OneSpace, relations, impacts | oneSpaceCore, OneSpaceStudio | Personnes/moments/signaux/tuiles → simulation | Local, rôles descriptifs ; tests oneSpaceCore | Même noyau, pas comptes/permissions serveur |
| RippleCircle | RippleCircleStudio | WorldSpace → cadran natif | Expérimental ; même magasin et garde P0 | Vue alternative du même domaine événementiel |
| Formation | projectFormation | training/moments → projection | Locale ; pas certification | Jamais nouveau dossier formation |
| Programme | programmeCore/Studio | Séances/dates/durées → HTML, CSV, ICS ; magasin programmes | Local testé programmeCore | Conserver modèle pédagogique ; rapprocher moments sans inventer durées/dates |
| Budget | budgetCore/Studio | Transactions/catégories → rapports/CSV ; magasin budget | Local, pas banque ; tests budgetCore | Domaine documents/projets, garder moteur spécialisé |
| Documents administratifs | adminCore/Studio | Lignes/tiers → brouillons HTML ; magasin admin | Totaux testés, pas facturation certifiée | Point d'entrée Documents, pas réécrire le moteur |
| Juridique | legalCore/Studio | Sources + traitements déclarés → questions/brouillons | Local, pas avis juridique ; tests legalCore | Assistant de contrôle des autres outils, pas autorité de conformité |
| PDF | pdfimport/pdfStudioCore/PDFStudio | PDF → pages raster, texte/grilles selon parcours | Local ; PDF.js/jsPDF ; nombreux tests PDF + Node | Même domaine Documents ; conserver import broderie spécialisé |
| Design / Print | designStudio/DesignStudio | éléments/photos/motifs → SVG/PNG/PDF/HTML ; magasins design | Tests designStudio/UI ; HTML maquette pas application | Composition visuelle ; Print = export, pas nouveau Studio parallèle |
| Design System / confort | designSystem, tokens.json, accessibilityCore/Studio | Tokens + profil → CSS, thèmes, contrastes, export | Source Lab 3634a31 ; tests designSystem/accessibility | Séparer marque, projet et accessibilité, adoption progressive |
| Photo | photoRecipe/PhotoStudio | image + recette → rendu local | Tests photoRecipe ; Canvas | Outil du domaine visuel, source non destructive |
| Mode | fashionStudio/FashionStudio | gabarits/motifs → concepts et fiche | Prototype, pas patronage industriel ; tests fashionStudio | Vue métier sur ressources visuelles, conserver moteur |
| Art / galerie | artWorldCore/Studio | gestes → SVG et galerie privée locale | Tests artWorld ; aucune vente | Réutiliser médias, association séparée |
| Mini-site | miniSiteCore/Studio | sections + thème + binding → HTML/JSON | Local ; tests miniSite/learning/wedding | Moteur sémantique web, pas dupliquer dans Design |
| Academy | academyCore/Studio | sections/exercices + binding → HTML/JSON/progression | Local ; tests academy/universal ; pas LMS partagé | Même primitives éditoriales que Mini-site, contenus pédagogiques conservés |
| Génération / prompt | generation, promptcraft, GenerationStudio, PromptStudio | description → prompt/image tierce/DMC/brouillon site | Pollinations ; disponibilité externe non certifiée | Entrée transversale vers moteurs, pas générateur autonome général |
| Métamorphose scanner | api/metamorphose-scan, MetamorphoseStudio | URL autorisée → titre/H1–H3/fragments | Privé désactivé sans secrets et allowlist ; tests Node simulés | Entrée d'import contrôlée, pas proxy ni copie fonctionnelle de site |
| Fragments / recomposition | fragmentGrid, compositionLayout, FragmentGridWorkspace | collection → grille et HTML responsive | Local ; tests fragments/composition | Même grammaire de composition que Mini-site, même projet conservé |
| Musique gestuelle | musicStudioCore/Audio, MusicStudio | gestes → événements/Web Audio/MIDI ; partition locale | Tests musicStudio ; audio navigateur | Domaine Musique, pas fusion des modèles audio et patron |
| SLÂME | slame/slameMidi | trajectoire sur Pattern → expression/MIDI | Tests slame/MIDI | Pont créatif vers Musique, garder l'original Pattern |
| Production/radio/master | musicLabelCore, musicRadio, musicMastering, MusicProductionStudio | titres/événements/fichiers → playlist, CSV/ICS, WAV | Métadonnées locales, audio mémoire ; tests label/WAV | Un domaine, sous-outils distincts ; distribution/licences absentes |
| Broderie | pattern/store/stitch/Canvas | points/calques/progrès → Pattern | Patron local + IndexedDB ; tests engine/stitch/format/UI | Moteur spécialisé à préserver intégralement |
| Conversion couleurs | convert/worker/dither/quantize/requant/colorScience/palettes/dmc/beads | pixels/palettes → DMC/perles | Calcul local, palettes parfois importées à la demande | Services du domaine visuel, pas nouvelles interfaces concurrentes |
| Reconnaissance de grilles | chartRecognition/pdfAnalysis/pdfVector/pdfGlyphChart/pdfColorImport | pixels/glyphes → patron corrigible | Expérimental selon source ; tests PDF/chart | Pas reconnaissance sémantique universelle |
| Sujets/composition/floral | subjectEngine/composition/floralComposition | couches/régions → Pattern recomposé | Géométrique, tests subjects/floral | Mutualiser transactions et previews, pas prétendre IA |
| Profil/stock/catalogue | brodeuseProfile/library/catalogue/adaptiveCatalogue/subjectLibrary | stock/droits déclarés → variantes et bibliothèques | Local/IndexedDB ; catalogue démo sans paiements | Ressources spécialisées, pas achats réels |
| Jeu | confettiGame/gameFromPattern/GameStudio | patron/portrait → niveau Canvas | Expérimental, tests game | Réutilisation de matière, pas domaine prioritaire supplémentaire |
| Partage patron | PeerShare | Pattern → lecture WebRTC un écrivain | STUN Google, pas TURN ni multi-auteurs | Ne pas appeler cela collaboration sécurisée des dossiers |
| Références externes | externalProjects/ExternalEmbed | URL/manifeste → lien/iframe à la demande | Registre local, tests externalProjects | Lien/aperçu seulement, pas connecteur OAuth |
| Registre technique | capabilityRegistry/dossierCapabilities | artefacts + cible → diagnostic/adaptateurs | 8 capacités locales, tests et preuves versionnées | Reste la source de capacités ; domaines = navigation seulement |
| Besoins manquants | developmentNeeds | manque → proposition/historique/export | En mémoire, similarité lexicale, pas ticket automatique | Persistance consentie ultérieure ; pas faux audit juridique |
| Stockage/récupération | storageSafety/StorageRecoveryNotice | octets existants → garde/export brut | P0 testé ; multi-clés non atomiques, conflits onglets non résolus | Aucun nouveau stockage, migrations explicites |
| Aides/qualité | coach/checks/sessionStats/useMedia | contexte/progrès → aide/stats | Local ; tests coach/sessions | Transversal, pas nouvel assistant IA |
| Exports | io/svg/pdf/oxs + exports métier | objets → fichiers | Tests formats/PDF/MIDI/WAV | Inventorier formats, pas promettre archive complète |
| PWA/offline | public/sw.js, vite.config, check-offline | bundles → cache versionné | Manifest contrôlé ; navigateur hors ligne non recetté | Garder exclusion API, tester mises à jour réelles |
| Inscriptions/admin lancement | api/pointzero-* + _launch-utils | opt-in → Redis/e-mail si configuré | Tests handlers ; services non activés | Hors domaine principal, aucune activation silencieuse |

Modules d'enveloppe : StudioFrame, Sheet, Dock, ErrorBoundary, TopBar, CategoryBar, inspectors, palette/rails, gestion sélection/édition/zoom et composants de navigation sont des interfaces de ces moteurs, pas de nouvelles capacités métier. Les fichiers de démonstration et registres éditoriaux ne constituent pas une preuve de service externe.

## Décisions de fusion proposées

**Faire maintenant (non destructif)** : regrouper la navigation en Création visuelle / Web et interfaces / Musique / Documents et démarches / Projets et événements ; afficher les limites et garder les routes historiques. Ajouter un seul accès Mon Espace/Dossier. Associer l'association par lien explicite, sans fusion d'entités.

**À valider avant fusion technique** : renderer de sections commun Mini-site/Academy ; résolution des références par WorldSpace.id ; document/print/export commun ; composition responsive commune existante. Adapter un contrat après l'autre, avec fixtures legacy et retour arrière. Les données spécialisées restent là où elles sont.

**Ne pas fusionner** : Pattern et page web, personnes décrites et comptes authentifiés, projection Formation et LMS, signaux et notifications, registre interne et preuve de droits, export et publication, iframe et synchronisation. Aucun moteur supprimé parce que son nom se ressemble à un autre.

**Inutilisation** : une fonction sans bouton ou couverture dédiée n'est pas nécessairement morte. Aucun fichier n'est supprimé dans ce lot ; une analyse statique des appels et recette utilisateur doit précéder toute suppression.

## Affinity : principe étudié, pas copie

Source officielle https://www.affinity.studio/ et /get-affinity : un environnement Vector/Pixel/Layout, même document, imports structurés et exports, fonctionnalités de base annoncées gratuites pour individus, outils IA liés à certains plans Canva. Ce sont les déclarations de l'éditeur, pas un benchmark exécuté. Force applicable à AIME : continuité du document, métiers clairement séparés, démonstrations liées aux outils réels et export explicite. Ne pas copier compositions, identité ou visuels. Aucun test visuel des transitions/logiciel Affinity n'a été exécuté ici.

## État des trois parcours essentiels

A Créateur : Design/Photo → Mini-site → exports réalisables localement. Identité authentifiée/publication serveur absentes : parcours complet non validé.
B Artiste : catalogue musical/métadonnées + visuels/documents/export existent, mais pas registre transversal versionné des œuvres/collaborations/répartitions. Parcours droit/export organisme non validé.
C Collectif : dossier/personnes/moments/références existent ; invitation, comptes, partage et révocation serveur absents. Ne pas simuler un parcours fonctionnel par de faux boutons.

## Registre des œuvres : décision préparatoire

Réutiliser les identifiants des ressources (Pattern, ArtProject, DesignDocument, MusicTrack, SiteProject) et les références du WorldSpace. Une extension future devra décrire auteurs déclarés, contributeurs et rôles, version/source, licence et justificatifs, reprise/remix/dérivé, droits inconnus, parts dont somme/assiette/période sont contrôlées, bénéficiaires et historique. Ne pas recopier les fichiers dans le dossier. Aucun droit n'est créé par un id/date/hash ; pas de preuve de dépôt, déclaration SACEM ou transmission successorale automatique. Identité/mandats et validation juridique indispensables avant rémunération. Aucun magasin concurrent ajouté ici.

## Confiance et modèle économique proposé (pas tarif adopté)

Exports personnels documentés sans verrou artificiel ; frais de services (hébergement, calcul, traitement, publication) annoncés avant action. Licences tierces séparées, aucun droit d'exploitation commercial implicite. Devis/confirmation avant paiement ; aucune facturation ni répartition réelle implémentée. Export multi-ressources/restauration reste à construire avant promesse de réversibilité complète.

## Suite priorisée et autorisations

1. Recette des domaines et noms avec utilisateurs ; fil d'Ariane et source POINTZERO sans modifier les moteurs.
2. Contrats communs et préférences design, modèles complets et capture avant/après, pas une nouvelle refonte spéculative.
3. Archive/restauration et registre des œuvres ; validation des schémas/migrations avant persistance.
4. Choisir UN connecteur (d'abord fichier/ICS, puis Drive par fichier si autorisé), identité et coffre de secrets serveur.
5. Parcours avec permissions/invitations et publication seulement après infrastructure/sécurité/budget approuvés.
6. Production uniquement sur validation explicite des PR, recette et compatibilité données.

Ce lot livre navigation/carte/contrat de connexion de préparation uniquement. Aucun connecteur opérationnel, paiement, publication, compte ou partage n'est annoncé.

## Livraison de navigation et vérifications

Ajout d'une navigation par objectif dans l'accueil, cinq groupes repliables, liens réels de 21 outils existants, limites visibles, accès Mon Espace et association. Aucune nouvelle route ou clé de stockage, aucun moteur supprimé. Les modes éditoriaux restent hors des groupes métier. Le test de conservation de la lettre cible désormais explicitement son volet, car de nouveaux volets de navigation le précèdent ; assertion conservée.

Validation locale : 466/466 tests applicatifs (62 fichiers), 7/7 tests Node, TypeScript/build et manifeste hors ligne réussis. Tests ajoutés : routes uniques et résolues par le vrai routeur, refus d'une route d'administration, navigation et absence d'écriture. Aucun navigateur autorisé disponible : responsive visuel, clavier réel et trois parcours complets non certifiés. Aucun nouveau service/dépense activé ; CI/previews existantes peuvent consommer les ressources du compte. La prochaine PR doit partir de cette branche publiée, pas d'une ancienne base.

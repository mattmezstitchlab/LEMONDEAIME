# POINTZERO .0 — Audit de lancement, inventaire vérifié et recette

**Date : 15 octobre 2026.** Mission : « Le temps retrouvé. »  
**Branche :** `feat/pointzero-manifeste-launch`, dérivée de `feat/unified-metamorphose-ripple-game` (#36).  
**Publication :** aucune fusion ni mise en production autorisée par cette PR.

## 1. Audit du code source existant

L'inventaire a été établi à partir de l'arborescence GitHub et des modules applicatifs pertinents, des composants de routeur, moteurs de données et registres de projets. Il **ne constitue pas une exécution exhaustive ligne par ligne de chaque fichier**.

| Domaine annoncé | Implémentations repérées | État public prudent | Lacune avant généralisation |
|---|---|---|---|
| Identité | `oneSpaceCore`, `OneSpaceStudio`, `externalProjects` | En préparation | Identité canonique transversale, permissions serveur et authentification |
| Administratif | `AdminStudio`, `legalCore`, `budgetCore` | En expérimentation | Facturation, paiement, flux tiers à valider |
| Web | `MiniSiteStudio`, `miniSiteCore` | En expérimentation | Publication de mini-sites complète à vérifier |
| Chronologique | `ProgrammeStudio`, `programmeCore`, `oneSpaceCore` | En expérimentation | Calendrier et horaires multi-utilisateurs |
| Créatif | `DesignStudio`, `Canvas`, `stitch`, `Pattern` / DMC, `FragmentGridWorkspace` | Disponible (atelier existant) | API partagée et supports universels plus avancés |
| Événementiel | `OneSpaceStudio`, `ProgrammeStudio`, `MiniSiteStudio` | En expérimentation | Invitations et prestataires réellement synchronisés |
| Transmission | `ArtWorldStudio`, `artWorldCore` | En expérimentation | Accord de diffusion, permissions, archivage |
| Organisation | `OneSpaceStudio`, `adminCore` | En expérimentation | Accès employeur / collaborateur serveur |
| Formation | `AcademyStudio`, `academyCore` | En expérimentation | Validation des acquis universels entre studios |
| Causalité | `oneSpaceCore`, `RippleCircleStudio` | En expérimentation | Orchestration multi-utilisateurs et notifications consenties |
| MÉTAMORPHOSE | `FragmentGridWorkspace`, `fragmentGrid`, API scan HTML privé | En expérimentation | Capture navigateur réelle et découpe avancée |
| RIPPLECIRCLE | `RippleCircleStudio` + `oneSpaceCore` | En expérimentation | Migration complète des parcours du dépôt source |
| Game | `GameStudio`, `confettiGame`, `gameFromPattern` | En expérimentation | Recette tactile, musique sous licence éventuelle, catalogue de niveaux |

Les états sont configurables mais **l'expiration d'une date ne suffit jamais à rendre un studio disponible**. Le statut et la validation manuelle de publication restent nécessaires.

## 2. Éléments existants préservés

- Aucun composant métier de broderie, PDF, Mini-site, Music, Academy, Mon Espace, Causal n'est supprimé.
- Les projets JSON/OXS, les palettes de fils, le suivi des croix, les imports/exports et le stockage local préexistants restent dans leurs formats.
- `App.tsx` ajoute une branche **manifest** et **manifest-admin**, et conserve les anciennes routes internes.
- Les utilisateurs déjà engagés dans un studio retrouvent leur espace stocké ; les nouvelles visites découvrent le manifeste.
- `?page=manifest` force l'accueil public ; `?page=atelier` ouvre le studio Design indépendamment de l'état local.
- Le menu du Studio Design dispose d'un accès explicite au manifeste.

## 3. Livré dans la PR

1. Hero « POINTZERO .0 — Le temps retrouvé. », grille interactive, CTA d'ancrage, compte à rebours facultatif.
2. Manifeste **Passé / Présent / Futur** et introduction musicale sans autoplay.
3. 13 studios présentés selon un inventaire de code, statut, ouverture et historique.
4. Grille d'ouverture 2026 → 2027 sans dates supposées.
5. Démonstration locale de réutilisation des informations : devis, facture, carte, page web et événement, **aperçus et non vrais documents émis**.
6. Espace personnel, formation, coordination et exemple MSA décrit comme **cas d'étude indépendant**.
7. Journal de création vide par défaut — uniquement entrées datées et sourcées via l'éditeur.
8. Interface mobile / tablette / desktop en styles CSS isolés, animations désactivées pour `prefers-reduced-motion`.
9. Mise à jour des métadonnées SEO, canonical, OG et aperçu SVG.
10. Service d'inscription et administration privés, avec contrôle serveur.

## 4. Backend pour une inscription réellement confirmée

Endpoint `/api/pointzero-launch` : GET de la configuration publiée, POST de demande d'inscription, demandes de désinscription et édition administrateur protégée.  
Endpoint `/api/pointzero-confirm` : validation par formulaire POST pour éviter les confirmations automatiques dues aux prévisualiseurs de mail, et désinscription.  
Stockage persistant : Upstash Redis REST, sans dépendance frontend supplémentaire.  
E-mail : Resend, lien de double consentement valable 72 h.  
Protection : Cloudflare Turnstile + rate-limit IP/anti-doublons Redis + honeypot, corps limité, en-têtes no-store.  
Administration : secret serveur, brouillon distinct de la configuration publiée, statistiques d'inscriptions confirmées agrégées **sans exposition d'adresses e-mail**.

Variables serveur Vercel nécessaires :

- `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY` et `POINTZERO_FROM_EMAIL` (expéditeur vérifié)
- `POINTZERO_PUBLIC_ORIGIN` (URL HTTPS canonique publique utilisée dans les e-mails)
- `TURNSTILE_SECRET_KEY` et `TURNSTILE_SITE_KEY`
- `POINTZERO_LAUNCH_ADMIN_SECRET` (mot de passe long et unique)
- `POINTZERO_LEGAL_ENTITY` et `POINTZERO_PRIVACY_EMAIL`
- `POINTZERO_PRIVACY_POLICY_URL` (politique de confidentialité complète validée, URL HTTPS)

**Sans ces clés, l'UI publique affiche honnêtement que les inscriptions ne sont pas disponibles et n'enregistre aucun contact.** Aucune confirmation fictive.

### Limitations juridiques / data

La note de confidentialité intégrée est une explication courte, **pas une politique RGPD complète**. Vérifier avec un juriste le responsable de traitement, la base légale, la durée effective de conservation des listes confirmées, les sous-traitants et transferts, la gestion des accès/suppression, les cookies Turnstile et la conformité du traitement avant activation réelle.

Le consentement n'est pas une preuve automatique de conformité à tous les textes applicables. Les statistiques de listes Redis doivent être auditées après suppressions et incidents de synchronisation. Aucune donnée de membre ni d'organisme MSA n'est accessible par ce formulaire.

## 5. Fonctionnalités encore hors périmètre

- Authentification réelle des membres et autorisations inter-studios sur serveur : **non implémentées**.
- Administration d'images arbitraires, banque de visuels et éditeur CMS complet : **non implémentés** ; la grille hero actuelle est une visualisation native.
- Envoi de messages marketing et segmentation avancée : **non implémentés** ; les e-mails actuels servent seulement au consentement et au retrait.
- Capture de sites HTML par navigateur, audit légal automatisé fiable et connecteurs tiers : **non implémentés ici**.
- Publication en production, changement DNS, protection Vercel, campagne de lancement : **non réalisés**.
- Image OG universellement compatible PNG : aperçu SVG disponible, rasterisation à compléter pour certains réseaux.
- Validation responsive sur appareils physiques et tests de charge : **à réaliser**.

## 6. Recette requise avant autorisation de publication

1. `npm run verify` (TypeScript, Vitest, bundle).
2. Navigateur 390 px iPhone, 768 px iPad, 1440 px bureau ; vérifier absence de débordement et CTA, claviers, VoiceOver et la réduction d'animations.
3. Depuis un profil vierge : voir le manifeste ; depuis un profil existant : retrouver son studio et son patron.
4. Ancre Manifeste / Studios / Inscription ; grille 3 × 3 interactive.
5. En admin, enregistrer un **brouillon** ; vérifier qu'il ne s'affiche pas aux visiteurs, puis vérifier la publication explicite dans un environnement de préproduction.
6. Compte à rebours : date absente, future et dépassée ; aucune ouverture automatique.
7. Demande d'inscription : captcha, consentement, lien e-mail, déduplication et vérification du nombre d'inscrits.
8. Lien de désinscription et suppression des indexes ; aucun message marketing sans consentement vérifié.
9. Test d'attaque : origine externe, anti-bot, limites de corps, tentatives répétées, endpoints administrateur sans secret et e-mails incorrects.
10. Tester le cache PWA sans réutiliser les réponses d'API privées.
11. Audit légal final / politique de confidentialité validée.
12. Validation écrite avant toute fusion et diffusion.

**La PR #37 reste en brouillon, empilée sur la PR #36.** La publication en production attend un accord explicite.

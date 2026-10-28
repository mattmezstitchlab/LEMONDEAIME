# AIME — Audit d'architecture mère et recette de navigation
**Édition :** 2026-10-15 · **Statut :** branche de travail, non publiée.

## 1. État constaté avant l'intervention

Le projet POINTZERO utilisait `App.tsx` comme routeur d'écrans applicatifs et des paramètres historiques `?studio=...`, `?page=atelier`, `?page=manifest` et `?site=le-monde-aime`. Les projets de création, motifs DMC, galeries, chronologies et dossiers se trouvaient dans des stockages locaux métiers distincts. La page POINTZERO « Le temps retrouvé » et la présentation LE MONDE AIME existaient déjà. Les Studios Métamorphose, RippleCircle et Game ont été ajoutés dans la PR #36, non fusionnée dans `main`.

**Problème architectural :** l'identité de la marque AIME, les Univers humains, l'association, les moteurs transversaux et les Studios étaient confondus dans une navigation majoritairement orientée Atelier.

## 2. Hiérarchie introduite

| Adresse publique | Fonction | Implémentation |
|---|---|---|
| `/` | AIME®, marque mère, lettre ouverte et signature vivante | `AimeEcosystem` |
| `/pointzero` | Landing POINTZERO « Le temps retrouvé » | `ManifestLanding`, réutilisée |
| `/atelier` | Atelier POINTZERO (Studio Design) | `DesignStudio`, inchangé |
| `/atelier?studio=embroidery` | Accès direct à l'outil Broderie | `App` + `entryNavigation` |
| `/atelier?studio=game` | Accès direct au Studio Game | Même routeur |
| `/le-monde-aime` | Association, identité propre et contenus existants | `AimeLanding` |
| `/univers` | Index des neuf premiers Univers documentés | Registre `aimeEditorial` |
| `/univers/:slug` | Intention propre à chaque Univers | Template `AimeEcosystem` |
| `/studios/:slug` | Fiche pédagogique et évolutive de chacun des 13 Studios | Template unique + registre |
| `/vision` | Mémoire publique, jalons sourcés, moteurs | Registre + `LaunchJournal` |

Règles Vercel ciblées dans `vercel.json` pour servir `index.html` aux routes publiques. Le service worker reçoit un nouveau nom de cache et garde les API hors cache.

**Liens de compatibilité :** `?site=le-monde-aime`, `?page=atelier`, `?page=manifest` et `?studio=...` à la racine restent compris par le nouveau routeur.

## 3. Trois concepts différents

- **Univers** : domaine humain, non assimilé à un produit logiciel. Neuf Univers documentés en première passe (création, arts, transmission, événements, mariage, inclusion, générations, ressources, accompagnement). Catalogue extensible.
- **Studios** : expériences spécialisées. Les 13 fiches s'appuient sur le catalogue existant `launchManifest` sans réécrire le backend. Chacune décrit intention, problème, mécanisme, expérience, liens, preuve technique de prototype et projet futur ; le statut d'ouverture reste indépendant de la fiche.
- **Moteurs** : logiques partagées (fragments, causalité, grille, chronologie), distinguées dans la page Vision, et non comptées comme Studios.
- **LE MONDE AIME** : association et présentation maintenues, séparées de la marque mère AIME® et des Studios.

### Signature évolutive AIME

Les variantes de l'acronyme sont définies initialement dans `aimeEditorial.ts` et peuvent maintenant être modifiées via la console privée du manifeste POINTZERO. La configuration est facultative et rétrocompatible ; les éditions sont stockées en **brouillon**, soumises à validation stricte par le client et le serveur, puis explicitement publiées. Les deux premiers mots, « Architecture Intelligente », demeurent fixes.

## 4. Contenu, provenance et confidentialité

Le fichier `src/lib/aimeEditorial.ts` contient une première édition structurée et versionnable. Les preuves pointent vers des modules du dépôt GitHub ou des PR, lorsqu'elles existent ; certaines descriptions sont **des intentions de concept**, non des fonctions validées en production.

Le journal public de `/vision` réutilise le journal publié POINTZERO uniquement. Les inscriptions privées, données personnelles, dossiers confidentiels et clés serveurs ne sont ni exposés ni importés dans le manifeste.

Une date GitHub, une mention dans un dossier ou un commit ne garantissent **pas** à eux seuls un droit exclusif, un brevet ou une protection de toutes les idées. Une politique de gestion documentaire authentifiée, des droits par rôle et des exports complets font partie des étapes futures.

## 5. Préservation des travaux

- Aucune suppression de `AimeLanding`, `ManifestLanding`, `DesignStudio`, `ArtWorldStudio`, `oneSpaceCore`, `fragmentGrid`, `GameStudio` ou des moteurs de broderie.
- Aucun nouveau schéma de données ni migration `localStorage` ; les clés métiers restent inchangées.
- Le routeur conserve la navigation Atelier existante et ajoute des pages publiques ; retour du navigateur via `popstate`.
- Le registre n'accorde **aucun accès** à un Studio non publié ; les fiches ne sont pas des écrans de contournement des protections.
- Les animations de signatures respectent `prefers-reduced-motion` et n'affectent pas le titre AIME fixe.
- Pas de configuration Vercel « production », pas de déploiement `main`, pas de changement de DNS.

## 6. Recette avant publication

1. GitHub Actions `npm run verify` : TypeScript, Vitest (navigation, dossiers, identité AIME), puis Vite build.
2. Vercel : identifier le déploiement **Preview** correspondant **exactement** au SHA de la PR #38 et vérifier `READY`.
3. Ouvrir la preview en navigateur authentifié, si autorisé par Vercel SSO ; tester les 7 familles de routes sur iPhone (390px), iPad et bureau.
4. Tester `/` → AIME → Univers → Studio → POINTZERO → Atelier ; puis historique navigateur retour/avance.
5. Tester `/le-monde-aime`, musique inclusive, galerie locale et bouton Atelier libre.
6. Tester les anciens liens `?site=le-monde-aime`, `?page=atelier`, `?studio=embroidery` et la reprise d'un patron sauvegardé.
7. Vérifier le rendu sans animation, les tailles de caractères, navigation au clavier et contraste mobile.
8. Valider textes de la marque et contenus documentaires, puis uniquement après accord explicite, décider de la fusion.

## 7. Limitations à traiter plus tard

- Un vrai CMS/versionnement éditorial serveur avec historique, sources et documents privés/publics n'est pas créé par ce registre statique ; l'édition initiale est **versionnée par Git**, tandis que les statuts POINTZERO peuvent venir du stockage serveur existant.
- Pas de connexion automatique multi-utilisateur entre Univers, Studios et moteurs.
- Les 13 fiches sont structurées et partageables, mais ne possèdent pas encore une interface d'administration pour chaque champ.
- Les métadonnées OpenGraph de toutes les routes partagent actuellement une page HTML Vite SPA. La définition de métadonnées SEO propres à chaque route demandera une génération statique/SSR complémentaire.
- Le rendu visuel réel en navigateur doit être vérifié séparément du statut Vercel `READY`.

**PR #38 empilée sur #37, elle-même empilée sur #36. Ne pas fusionner ni déployer en production avant la validation du propriétaire.**

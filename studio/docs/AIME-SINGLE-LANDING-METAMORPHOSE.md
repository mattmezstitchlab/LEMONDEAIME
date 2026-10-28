# AIME — Landing unique centrée sur MÉTAMORPHOSE

**Cible :** branche `feat/aime-single-metamorphose-landing`, base `main` @ `91b88a03c91b725bc4b0edc9e2d3be0c28936721`.  
**Livraison :** nouvelle interface de présentation principale ; aucune migration ni suppression des moteurs. Production non modifiée par cette branche.

## Décision de produit

AIME = architecture de continuité, mémoire et projets ; MÉTAMORPHOSE = entrée centrale de composition ; les autres Studios conservent leur moteur spécialisé et leurs données. Une seule landing publique principale à `/`, qui montre les vraies interfaces POINTZERO, sans répliquer cinq landings concurrentes.

Les anciennes pages `/pointzero`, `/vision`, `/univers`, `/le-monde-aime`, `/dossier`, `/espace` restent accessibles comme documentation, domaines métier, association distincte ou Dossier Universel vivant. **Aucune redirection globale destructive**.

## Fichiers

- `src/components/AimeUnifiedHome.tsx` : nouveau parcours : hero MÉTAMORPHOSE, intention, vraie interface Studio chargée à la demande, méthode, accessibilité, continuité, ressources et CTA.
- `src/components/AimeUnifiedHome.css` : grille responsive 1440/768/390, identité visuelle liée à l'écosystème public existant, focus et `prefers-reduced-motion`.
- `src/components/AimeEcosystem.tsx` : la maison mère affiche la nouvelle landing ; header réduit à Atelier, Univers et Méthode. Pages Vision/Univers et leurs composants conservés.
- `src/components/UniversalDossierStudio.tsx` : pré-remplit uniquement le champ d'intention depuis l’état temporaire de navigation vers `/espace` (anciens liens `?intention=` compatibles) ; ne crée ni ne sauvegarde de dossier sans action humaine.
- `src/__tests__/aimeUnifiedHome.test.tsx` et tests existants ajustés.

## Preuves et limites

**Interfaces réelles :** la section « Les vrais Studios » affiche dans une iframe, **après un clic volontaire**, la route effective `/atelier?studio=...` ; pas de capture inventée. La prévisualisation peut utiliser le même `localStorage` que le visiteur, car c'est l'application réelle ; elle n'est donc pas lancée automatiquement.

**Intention :** le formulaire de la landing ne persiste rien dans le stockage applicatif et transmet le texte en état de navigation plutôt que dans l’URL ; il ne contacte pas un agent IA et n'interprète pas directement les données. Le Dossier Universel conserve ses validations existantes et ses règles non destructives.

**Accessibilité :** la page décrit une direction et renvoie au Studio Accessibilité réel. Aucune conformité RGAA, WCAG ou European Accessibility Act ne doit être affirmée sans audit. Tester contraste, zoom, ordre de lecture, clavier, lecteur d'écran, écran mobile et réductions de mouvement.

**Données :** WorldSpace.id reste canonique au niveau des projets. Aucun champ de dossier, clé locale, référence de Studio ou support Academy n'est modifié par la landing.

**Association :** LE MONDE AIME conserve sa présentation et son identité distinctes de l'Atelier.

## Recette après déploiement Preview

1. `npm ci && npm run verify`, avec vérification exacte du commit GitHub et du SHA Vercel.
2. Depuis `/`, vérifier un titre H1 unique, le nouveau header et les CTA MÉTAMORPHOSE et Dossier.
3. Avant « Afficher l'interface réelle » : aucune iframe active, aucun magasin modifié.
4. Après le clic : charger réellement `/atelier?studio=metamorphose` ; changer l'onglet en Design puis mini-site, et vérifier les vrais Studios.
5. Saisir « Je veux organiser un atelier de composition florale accessible » ; vérifier que `/espace` pré-remplit le texte, sans afficher l’intention dans l’URL, **sans créer un dossier**.
6. Vérifier les historiques et les liens : `/pointzero`, `/vision`, `/univers`, `/dossier`, `/le-monde-aime`, `/espace`.
7. Contrôler 390 / 768 / 1440px, zoom 200%, focus clavier, lecteurs d'écran, mode mouvement réduit.
8. Vérifier qu'aucune publication de données, service payant ou modification de production n'a été activé sur la branche Preview.

## Priorités suivantes

- Relier effectivement l'intention, le Dossier Universel et les capacités dans le même Atelier **sans nouvelle source de vérité**.
- Harmoniser progressivement l'expérience des écrans métier (sans homogénéiser leurs formats internes).
- Ajouter des contrôles d'accessibilité vérifiables, testés par humains et outillage spécialisé.
- Faire effectuer une revue indépendante à Vercel Agent avant une quelconque fusion dans `main`.

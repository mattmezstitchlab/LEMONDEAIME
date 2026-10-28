# MÉTAMORPHOSE ULTIME — Construction incrémentale et passation Vercel Agent
**Version :** Première tranche, octobre 2026 · **Cible :** `feat/metamorphose-ultime-unified-workspace` empilée sur PR #51.  
**Périmètre :** mode composition de `MetamorphoseStudio`, pas refonte de tous les Studios.

## Historique conservé
- PR #47 : Design System canonique.
- PR #50 : Grille Universelle, contraintes de contenu, adaptateur Design → fragment et refus d'export des ressources privées par défaut.
- PR #51 : laboratoire Zoom Code broderie 8×8 ; il reste séparé du nouvel inspecteur **Zoom Code · Fragment**, qui lit uniquement la structure des fragments.
- MÉTAMORPHOSE : moteur `FragmentGridWorkspace` et `FragmentCollection.version=1`, format JSON historique conservé.
- POINTZERO : l'Atelier et la landing « Le temps retrouvé » ne sont ni remplacés ni migrés.

## Contrat d'interopérabilité (section 14)
`src/lib/atelierCompositionContract.ts` définit :
- `AtelierSelection` : moteur, ID objet, version, source éventuelle, verrouillage.
- `AtelierAdapterPort` : lecture sans mutation, rapport explicite de conversion `complete|partial|impossible`, champs conservés/perdus.
- `AtelierCapability` et `INTEGRATION_POINTS` : inventaire **indicatif** des capacités réellement branchées et non branchées ; il ne remplace pas le registre Vercel Agent.
- `FragmentPreview` : before/after, cible et effets à montrer.
- `CompositionSession` : composition présente, annulations/refontes locales plafonnées à 25 états.
- `previewFragmentSpan → confirmFragmentPreview → undoComposition / redoComposition` : commandes pures, ne recopient ni SVG Design ni documents des autres moteurs.

La source de vérité reste le moteur concerné ; `WorldSpace.id` demeure canonique **au niveau du projet**, mais la collection de fragments ne prétend pas encore être liée à un `WorldSpace` authentifié.

## Sécurité, robustesse et preuves (section 15)
- `FragmentGridWorkspace` réutilise `writeStoredJSON` et la validation `readFragments` sur `pointzero:universal-fragments:v1` ; les octets corrompus sont protégés contre leur réécriture silencieuse.
- Les références Design conservent `resourceId`, le mode de titre et `allowExport`. **Par défaut, l'export HTML d'une ressource liée privée est refusé**, sauf confirmation.
- Le panneau « Code » expose uniquement l'objet local inspecté et des métadonnées autorisées, pas du code tiers secret.
- Les prévisualisations **ne doivent pas être sauvegardées** avant confirmation.
- Annuler/rétablir agit sur la session courante ; après fermeture, seule la dernière version confirmée persiste dans le JSON. Aucun audit serveur n'est revendiqué.
- L'inspecteur mobile est repliable ; le navigateur doit encore être testé à 390, 768, 1440 px, au zoom 200 %, clavier et lecteur d'écran.
- Aucun système de droits serveur, multi-utilisateur, conflit multi-onglet, quota ou restauration transactionnelle n'est ajouté par ce patch ; ce sont des suites à tester et concevoir.

## Convergence des PR précédentes (section 16)
**Conserver sans dupliquer :**
1. `src/lib/fragmentGrid.ts` : modèle Fragment, édition, verrouillage, ordre, JSON v1.
2. `src/lib/fragmentResources.ts` : adaptateur Design courant, résolution des représentations, export privé.
3. `src/lib/compositionLayout.ts`, `src/lib/gridConstraints.ts` : responsive et contraintes de composition.
4. `src/lib/designSystem.ts` : tokens et apparence.
5. `src/components/ZoomCodePrototype.tsx` : mode Recherche broderie ; ne pas confondre avec l'inspection du fragment.
6. `src/lib/oneSpaceCore.ts` : projet canonique ; aucun second Kernel.

**À différer :** broderie/mosaïque en projections, Chromathèque globale, permissions réelles, documents et migration de tous les Studios. Ces adaptations nécessitent l'audit préalable des contrats de leurs moteurs et des effets possibles.

## Démonstration attendue
1. Dans le Studio Design existant, préparer ou ouvrir une création dans `pointzero:design-current:v1`.
2. Ouvrir MÉTAMORPHOSE → mode « Composer · Grille universelle ».
3. Cliquer « Relier ma création Design » : un fragment avec référence canonique est créé, le document Design est inchangé.
4. Cliquer le fragment, ouvrir Comprendre puis Code (ID et source visibles).
5. Dans Propriétés : « Prévisualiser +1 colonne ». Voir le changement de grille, vérifier que le JSON sauvegardé n'a pas changé.
6. « Confirmer la modification », puis « Annuler » et « Rétablir ».
7. Export HTML : refusé avec la référence Design privée ; exiger confirmation avant autorisation.
8. Fermer et rouvrir ; la dernière composition confirmée persiste et la référence Design n'a pas changé.
9. Vérifier écran large/tablette/téléphone ; puis mode « Recherche · Zoom Code broderie ».
10. Faire relire le code et les résultats par Vercel Agent.

## Commandes de validation
```bash
npm ci
npm run verify
# Equivalent : tsc --noEmit && vitest run && vite build
npm run dev
```
Les tests Vitest couvrent le contrat pur et un parcours React en JSDOM. Une CI verte et un état Vercel `READY` **ne certifient pas le rendu visuel en vrai navigateur**.

## Vercel Agent — revue indépendante
Comparer la branche de cette livraison à PR #51, puis examiner la cohérence avec ses travaux ultérieurs. Vérifier l'intégrité des sources, des droits d'export, de la source de vérité `WorldSpace`, l'absence de second registre de capacités, le flux événements local `aime:fragments-changed`/ `aime:fragment-focus`, les limites des écrans mobiles et les conflits éventuels.

**Publication :** preview non-production seulement ; ne pas fusionner la pile de PR ou promouvoir sans nouvel accord.
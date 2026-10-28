# POINTZERO — Revue de fin de chantier UX et innovations (octobre 2026)

## Architecture cible et état actuel

**Gauche — commencer :** nouveau, import photo, import PDF, générer, bibliothèque. Le générateur est désormais en panneau gauche avec production directe d'un patron dans la toile centrale.

**Centre — créer :** la toile est l'aperçu unique du résultat de génération. Les étapes intermédiaires du fournisseur restent internes ; il faut préserver les états d'attente et afficher le statut dans le panneau. Garder l'ouvrage déjà ouvert tant que le prochain n'est pas validé.

**Bas — agir :** outils récurrents dans une capsule flottante, iconographie et raccourcis normalisés.

**Droite — inspecter/sortir :** calques, motifs, propriétés, palette DMC, réglages avancés, export. Éviter les réglages permanents redondants avec ceux de la création/import.

**Haut — contexte :** niveau de maîtrise, titre et projet, partage/invitation, export. Supprimer les doubles commandes qui ont déjà leur place dans les autres zones uniquement après vérification fonctionnelle.

## Passe qualité restante

1. Tester génération (code invalide, service indisponible, réponse valide), résultat direct dans la grille, annulation et conservation du projet actuel.
2. Vérifier que génération successive ne détruit pas une sauvegarde antérieure ; historique, noms et retours depuis boutique.
3. Vérifier l'ergonomie du panneau gauche et les états d'attente sur petits écrans, y compris zoom navigateur à 200%.
4. Auditer les menus « … », modes d'interface, menus de motifs et menus de la toile ; enlever les doubles points d'accès, pas les fonctionnalités.
5. Auditer les données du motif : dimensions, comptage, matériel, palettes, métriques de fil, transformations, catégories de point, export PDF/SVG/OXS.
6. Contrôler le puzzle PDF et le calage multipages avec échantillons réels, la conversion photo et les droits sources.
7. Tester les états active/disabled/focus, lecteur d'écran, contacteur et reduced-motion.
8. Vérifier toutes les routes /, /boutique, /atelier?studio=embroidery et leur navigation arrière, y compris accès direct.
9. Effectuer npm run verify puis un test manuel en Preview ; ne pas fusionner uniquement parce que Vercel signale READY.
10. Contrôler le secret du générateur, les quotas, les téléchargements et les droits de publication avant d'ouvrir la vente.

## Innovations à explorer (non implémentées)

**A. Fil réellement disponible :** importer les stocks personnels de DMC et recalculer une variante du motif uniquement avec les fils possédés, affichant la différence de couleur, le coût manquant et les éventuelles substitutions.

**B. Anti-confettis explicable :** pour chaque petite croix isolée détectée, afficher pourquoi elle est proposée à la suppression, avec aperçu avant/après et correction non destructive.

**C. Puzzle PDF assisté :** détecter les zones de recouvrement de pages, proposer leur alignement et permettre une validation visible de chaque jointure avant extraction du motif.

**D. Brouillon → patron vendable :** valider automatiquement les éléments techniques obligatoires (grille symboles, palette, comptage, taille, marges, droits), puis bloquer la publication jusqu'à validation humaine.

**E. Suivi partagé SAL :** invitation par ouvrage avec permissions distinctes (lecture, progression, commentaires), jamais une simple URL donnant accès à toutes les données du projet.

**F. Essayage textile :** aperçu du patron sur toile Aida / lin, dans un tambour ou un cadre avec échelle physique vérifiable, distinct d'une photographie réelle.

**G. Rétrospective des fils :** tracer les modifications, les substitutions et les versions d'un patron pour revenir à un état antérieur sans perdre les annotations de broderie.

Ces axes sont des pistes produit à évaluer, pas des capacités démontrées ni des revendications de nouveauté au niveau mondial.

## Critère de lancement

Une personne peut ouvrir, générer/importer, retoucher, enregistrer, reprendre, broder et exporter un vrai patron sans changer d'application ni perdre son ouvrage.

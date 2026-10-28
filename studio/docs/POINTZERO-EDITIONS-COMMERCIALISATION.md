# POINTZERO Éditions — Publication et contrôle qualité

## État V1
- 24 idées éditoriales, six collections, fiches consultables, recherche et filtres.
- Route publique /boutique, même application et même dépôt.
- Générateur existant raccordé. Accès en Preview uniquement, protégé côté serveur par variable d'environnement chiffrée.
- Les vignettes sont des concepts graphiques et non des photographies de broderies.
- Aucun bouton de paiement ou de téléchargement commercial n'est activé.

## Pour transformer un concept en produit vendable
1. Générer ou dessiner un motif original avec provenance documentée.
2. Réviser la composition, retirer les points isolés problématiques, vérifier les contours, symboles, palette et lisibilité.
3. Réaliser un test de broderie réel ou une vérification équivalente explicitement indiquée.
4. Exporter le fichier source, le PDF couleurs, le PDF symboles, la liste DMC et les dimensions de toile.
5. Contrôler l'usage commercial des sources et contenus générés, y compris les références artistiques.
6. Remplacer la miniature conceptuelle par un aperçu issu du vrai patron. Ne pas utiliser une fausse photo brodée.
7. Valider difficulté, consommation estimée, prix et fiche produit.
8. Ajouter seulement ensuite le statut « publié ».

## Mise en vente (non développée)
- Catalogue persistant et administration avec authentification forte, pas mot de passe statique côté navigateur.
- Prestataire de paiement, prix et taxes vérifiés, webhook signé, commandes enregistrées et téléchargements éphémères.
- Factures, mentions légales, CGV, politique de remboursement et traitement des données.
- Contrôle d'accès aux fichiers payants (jamais de PDF premium en URL publique).

## Tests attendus
- npm run verify.
- Navigation directe et via l’accueil vers /boutique.
- Détails produit / recherche / filtres / clavier / mobile.
- Accès au générateur et refus en l'absence de code valide.
- Vérifier l'accès à la clé de fournisseur en Preview, puis une génération complète.
- Tester l'import d'image et la création de patron sans perte de sauvegardes.

## Architecture générale du studio
- À gauche : commencer / importer / ouvrir.
- Au centre : la toile et l'ouvrage.
- En bas : outils actifs, dock flottant.
- À droite : calques, motifs, propriétés, sortie.
- En haut : identité, niveau, invitation, actions exceptionnelles.
- Les modes, commandes répétées et palettes doivent être audités avant suppression.

Ne jamais confondre une vitrine conceptuelle avec une boutique commercialement ouverte.

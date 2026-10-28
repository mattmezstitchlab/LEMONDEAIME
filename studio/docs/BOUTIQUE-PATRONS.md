# POINT ZÉRO — Boutique de patrons PDF (prototype)

## Proposition

Au lieu de « j'achète un PDF sur Etsy, je l'importe puis le recale », la personne sélectionne un patron directement depuis la toile d'accueil. Le patron est une donnée \`Pattern\` native : cases DMC, légende, métrages, dimensions, symboles et suivi de broderie. Après déblocage, il s'ouvre dans l'atelier ; les PDF couleur et noir/blanc sont générés par \`buildPdf\` depuis cette **même source**.

## Collection pilote

Huit créations géométriques originales dessinées dans \`src/lib/catalogue.ts\` :
bouquet champêtre, chat lecteur, renard, tournesol, maison d'automne, couronne d'hiver, pause café, cœur folk.

Catégories : Fleurs, Animaux, Maison, Saisons, Cadeaux.
Les prix de 3,90 € à 5,90 € sont **indicatifs**, destinés à tester l'interface. Ils ne prouvent pas une demande ni une vente.

Aucun patron tiers ou image de vendeurs Etsy n'a été copié.

## Démo actuelle

- Barre de l'accueil → **Boutique · patrons**.
- Filtres, recherche, fiches produit, aperçu qui montre les **cases exactes** du patron.
- **Tester le déblocage gratuit** : marque uniquement une préférence dans le localStorage du navigateur. Ce n'est pas un paiement.
- Une fois débloqué : **Ouvrir directement dans l'atelier**, **PDF couleur**, **PDF symboles**.
- Le projet est sauvegardé via la bibliothèque IndexedDB si elle est disponible ; l'atelier garde également sa sauvegarde courante.
- La route et le moteur d'export PDF existants sont réutilisés, non réécrits.
- Vérification \`src/__tests__/catalogue.test.ts\` + \`npm run verify\`.

## Mise en vente réelle : bloquants à lever

1. **Paiement serveur** : un prestataire type Stripe Checkout, prix et références produits imposés par le serveur, montant non contrôlé par le navigateur.
2. **Confirmation fiable** : webhook serveur signé et idempotent ; commande associée à l'utilisateur authentifié et au produit stable. Le retour navigateur n'est pas une preuve de paiement.
3. **Droits d'accès serveur** : table \`entitlements\` en base. Vérification sur **chaque** demande de génération/téléchargement PDF ; ne pas considérer \`localStorage\` comme une preuve.
4. **Livraison sécurisée** : données du patron payant non livrées librement dans le bundle public comme c'est le cas pour cette démo ; passer à une API autorisée + URLs temporaires si nécessaire.
5. **Compte et restauration** : retrouver les achats sur plusieurs appareils ; historique, remboursement et support.
6. **Juridique / marché** : CGV de contenus numériques, consentement explicite avant exécution immédiate et renoncement au droit de rétractation si applicable, mentions légales, TVA applicable et factures, droits d'exploitation de chaque création.
7. **Qualité broderie** : revue humaine de chaque patron, palette réelle DMC, test d'impression A4, essais sur toile, photo de réalisation, fichiers optimisés pour différents niveaux.

## Précautions

- Les motifs animés des « voisines » sur la toile sont toujours une expérience **simulée** ; ils n'ont pas été promus en ventes réelles.
- Les PDF du catalogue sont de vrais PDF créés à la demande (couverture, grille, symboles et fils) mais n'ont pas été vérifiés manuellement après impression sur chaque référence.
- Aucune carte bancaire, adresse, courriel ou moyen de paiement n'est recueilli dans cette V1.
- L'accès démo n'est ni sécurisé ni transférable : **ne pas ouvrir de vraie facturation tant que la partie serveur n'est pas implémentée**.

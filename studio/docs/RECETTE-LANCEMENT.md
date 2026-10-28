# Point Zéro — décision de lancement

## État

Candidat à une recette PRIVÉE, pas à une ouverture publique. PR #58 en brouillon, aucune fusion ni promotion autorisée dans cette passe. Ne pas assimiler tests unitaires, build et déploiement Ready à une validation visuelle ou métier complète.

## Corrections de recette

- Tous les appels de `loadPattern` archivent l’ouvrage actif avant remplacement. Échec : retour false et message, aucun remplacement. Les chemins image/PDF/génération/composition restent ouverts si l’archivage échoue. Une ouverture concurrente est refusée pendant l’archivage.
- Une transaction IndexedDB interrompue (`abort`) rejette explicitement la sauvegarde au lieu de laisser la promesse en attente.
- Génération : réservée aux environnements non Production ; une fusion ou présence de secrets Production ne suffit pas à l’activer publiquement. Pour l’essai privé : une requête simultanée et délai de 10 secondes par instance serveur, erreur 429 et Retry-After. Cette protection est locale à l’instance, PAS un quota distribué ni une garantie de plafond de dépense.
- Aucun appel fournisseur réel ni coût fournisseur déclenché pendant cette passe.

## Essais automatisés

Tests des algorithmes PDF, import/export JSON/OXS, symboles, statistiques, suivi, transferts, archivage bloqué, ouvertures concurrentes, transaction interrompue, trois affichages, barre d’actions, contrôle serveur de génération. Les transports fournisseur sont simulés.

## Matrice de recette manuelle obligatoire

| Parcours | Attendu | Validation |
| --- | --- | --- |
| Créer et modifier | Croix, fraction, arrière, sélection, annuler/refaire ; pas de commande inaccessible | À faire en navigateur |
| Sauvegarder puis recharger | Nom, palette, points et progression identiques | À faire sur appareil réel |
| Exporter/réimporter JSON et OXS | Fidélité des champs supportés par chaque format | Automatisé + contrôle réel à faire |
| PDF multipage | Recomposition des cartes, raccords, symboles, palette et dimensions vérifiés avec le PDF source | À faire avec document réel |
| PDF exporté | A4 à 100 %, règle mesurée, symboles lisibles, aucune case coupée | Impression physique à faire |
| Génération | Animal, paysage, portrait, abstrait, scène multi-sujets, texte ; comparer source puis grille | Un chat essayé par le propriétaire ; reste à faire avec budget approuvé |
| Quota / réseau / clé incorrecte | Message clair, ancien projet conservé, pas de résultat de remplacement | Simulé + contrôle réel à faire |
| Petit écran | 320, 390, 768, 1024, 1440 px, paysage court, zoom 200–400 % | À faire en navigateur |
| Accessibilité | Clavier, focus visible et retour du focus, lecteur d’écran, contraste, texte agrandi | Vérification partielle ; audit réel à faire |
| iPad / stylet | Défilement, pincement, dessin, marquage sans croix accidentelle | À faire sur appareil physique |
| Hors ligne | Après premier chargement : projet, création, suivi et exports ; génération explicitement réseau | Manifeste automatisé, essai réseau coupé à faire |

## Conditions d’ouverture publique

1. Validation des parcours manuels et correction des défauts constatés.
2. Authentification et autorisations utilisateurs côté serveur pour la génération ; le code partagé actuel n’est pas un compte utilisateur.
3. Quotas atomiques distribués, limite de concurrence et protection anti-abus, budget plafonné CHEZ le fournisseur ; pas seulement un compteur mémoire.
4. Information sur l’envoi des descriptions, conditions du fournisseur et coût ; traitement des droits sur les images et patrons.
5. Décision explicite sur la sauvegarde locale et son avertissement (pas de synchronisation promise), support et récupération.
6. Approbation de fusion/publication distincte ; activation génération Production seulement après revue des points ci-dessus.

La création, l’import et le suivi peuvent être évalués indépendamment de la génération publique. Aucune promesse « tout générer parfaitement » ni conformité WCAG certifiée n’est revendiquée.

# Affichages Point Zéro et audit responsive

## Objectif et contrat
Débutant / Intermédiaire / Expert sont des niveaux de présentation, pas des autorisations ni des transformations de patron. Préférence séparée `pointzero:interface-level`, valeur initiale Intermédiaire pour préserver le comportement courant. Aucun changement de points, fils, dimensions, progression ou réglages d’accessibilité au changement de niveau.

- Débutant : outils essentiels, texte des panneaux plus lisible, autres outils accessibles explicitement ; l’outil actif reste visible.
- Intermédiaire : outils courants, symétrie et lettrage dépliés ; avancés accessibles.
- Expert : outils avancés et blocs des propriétés dépliés ; repli manuel possible (un outil actif avancé reste visible).
- Sauvegarde, export, import, puzzle PDF, génération, annulation, contraste et texte agrandi disponibles à chaque niveau. Aucun déclenchement de génération au changement de mode.

## Doublons examinés et décisions
| Zone | Décision de cette passe |
| --- | --- |
| Dessiner / Dessin, Fils / Fils, Broder / Suivi | Navigation d’activité à gauche uniquement. Inspecteur : Objet / Réglages, puis contenu de l’activité. |
| Outils avancés à gauche et raccourci « Outils de dessin » dans Plus | Raccourci d’en-tête retiré dans l’atelier ; sélecteur unique à gauche. |
| Bibliothèque / Réglages dans l’en-tête et Plus | Raccourcis de Plus réservés aux petits écrans où les icônes principales sont masquées. |
| Nouvelle grille dans Créer et Fils | Action Nouvelle retirée de Fils ; dimensions du patron déplacées vers Dessiner. Confirmation explicite avant redimensionnement (coupe / aplatissement). |
| Import avancé dans Réglages et import de Créer | Conservé ici pour compatibilité ; à réunir dans un parcours Importer lors d’une passe dédiée, ne pas supprimer le calage manuel. |
| Bibliothèque / partage dans Réglages | Encore présents : raccourcis de gestion à consolider après recette utilisateur, pas des moteurs distincts. |
| Notes dans Fils et Réglages | Même donnée conservée, pas deux stocks ; emplacement unique à décider après recette. |

## Responsive
Bande Affichage de 52 px sous l’en-tête de 58 px ; calcul des marges de toile et décalages des outils intégrés adaptés ensemble. Les panneaux et leurs champs peuvent rétrécir ; les grilles de formulaire passent en une colonne dans un panneau étroit par container query. Bouton de redimensionnement seul sur sa ligne. Cibles principales de 44 px, focus visible et réduction des animations. Panneau outils défilable pour garder accessibles les commandes Expert sur écran court.

Sur téléphone, Annuler/Rétablir restent disponibles dans Plus ; le texte explicatif du sélecteur est accessible au lecteur d’écran via aria-describedby. Panneaux latéraux existants conservés, un seul ouvert à la fois.

## Références et recette
- W3C Reflow : https://www.w3.org/WAI/WCAG22/Understanding/reflow.html — 320 pixels CSS, sans perte de commandes ; exception bidimensionnelle pour la grille, pas pour les formulaires.
- W3C Target Size : https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum — minimum AA 24 px avec exceptions ; cible produit 44 px pour les commandes principales.

Tester 320/390/768/1024/1440 px et zoom texte / navigateur 200–400 %, clavier seul, VoiceOver et stylet. Vérifier boutons visibles, ordre du focus, panneau gauche Expert défilable, sélection de niveau native au clavier, maintien de l’outil actif, sauvegarde/rechargement et exports identiques. Vérifier puzzle PDF et génération sous le bandeau, sans achat ni appels fournisseur supplémentaires.

Les tests jsdom vérifient navigation et intégrité des ouvrages, pas la géométrie CSS réelle. Cette livraison ne constitue ni une certification WCAG ni une recette sur iPad physique. Les petits libellés restants, le piégeage/restauration du focus des dialogues et la grille Canvas nécessitent un audit d’accessibilité complémentaire.

## Barre d’actions et landing immersive

- Barre inférieure nommée : Importer (image/PDF/JSON/OXS), Exporter, Loupe (zoom ×2 de la zone visible), zoom +/− et Recentrer. Pas de second moteur de loupe ni de retouche du motif : ces boutons pilotent le vrai canvas. Raccourci Exporter retiré de l’en-tête, Recentrer retiré de Plus.
- Rail DMC distinct au-dessus des actions ; marges de toile, panneaux et fiche de fil ajustées. Barre masquée pendant les flux spécialisés pour ne pas recouvrir leurs validations.
- Outils principaux agrandis, icônes et libellés, deux colonnes dans le rail vertical. Trois affichages conservés, outils de suivi adaptés au mode Broder.
- Landing : grande composition sombre, typographie éditoriale, démonstration illustrée de l’organisation du studio et section puzzle PDF. Visuel explicitement étiqueté comme illustration, pas une capture ni une réalisation sur toile. Aucun faux ouvrage final n’est montré.
- Recette additionnelle : vérifier hauteur disponible en petit paysage, accès à tous les outils par défilement, rail DMC et boutons à 320 px, import et export depuis la barre, loupe ×2 / zoom / recentrage, et absence de recouvrement des dialogues. Pas de validation visuelle navigateur revendiquée.

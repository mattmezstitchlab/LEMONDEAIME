# Première consolidation de la grille — source, contraintes, projections

## Références

Base #49 `6fb5063`, contient #47 Design System et #48 scanner/compositions. CI de base confirmée réussie ; production toujours déploiement `dpl_6btaFsMBcybvR1PrCDunCBAqsrNU`. Aucun merge ni mutation production. Inventaire global et décisions de regroupement : AIME-ECOSYSTEM-MAP.md ; stratégie de connecteurs : AIME-CONNECTIONS-STRATEGY.md. Ces travaux ne sont pas recréés.

## Audit réel de Métamorphose

- `api/metamorphose-scan.mjs` : scanner privé HTML statique titre/H1-H3/OG, pas DOM rendu, pas extraction de composants interactifs. Gate/allowlist/DNS épinglé/limites existants conservés. Aucun secret configuré par ce lot.
- `fragmentGrid.ts` : collection v1 de 120 fragments maximum ; id stable, texte/image/source, span, verrou, cadrage, notes. Import borné avec normalisation, pas un modèle universel de toutes les données. SourceUrl est une référence, pas synchronisation.
- `FragmentGridWorkspace` : éditeur de métadonnées, verrou, réorganisation drag/drop, choix de composition et largeur ; stockage JSON gardé existant. Aucun historique/undo transactionnel, pas sauvegarde cloud ni autorisations serveur.
- `compositionLayout.ts` : export HTML statique et CSS responsive, partagé avec Mini-site. Les cadres d'édition et HTML ne sont pas identiques ; l'iframe d'export utilise réellement 390/768/1200 px. Images distantes peuvent contacter leur origine ; aucun accès privé transmis.
- Défaut confirmé dans le code : lignes d'édition fixées à 124/165px, titre vw dépendant de la fenêtre et description tronquée à deux lignes. Le masquage overflow-hidden empêche de lire les contenus ; zoom et longues chaînes aggravent le problème.

## Correction de contraintes

`gridConstraints.ts` définit lignes minmax(minimum, auto), cellules content-first, min-width:0, retours de chaînes longues, typographie lisible et taille naturelle. Même contrat CSS dans l'édition et export ; bornage explicite des spans. Retrait des hauteurs fixes/troncature des descriptions ; l'image conserve un wrapper de découpe séparé pour que le zoom ne masque pas le texte. Les tokens canoniques sont installés dans le scope d'édition.

Ce mécanisme permet à la case de grandir : il n'essaie pas de réduire indéfiniment la police pour faire tenir un texte imprévisible. Tests de contrats CSS et fixtures longues ; aucun navigateur autorisé : absence de débordement réel à 200%/iPhone NON certifiée. Les cartes peuvent devenir hautes ; c'est préférable à une disparition de contenu. Images/fonds et contrastes doivent encore être recettés.

## Comparaison des canevas : ce qui se partage

| Moteur | Modèle réel | À partager | À conserver spécialisé |
|---|---|---|---|
| Fragments/Métamorphose | Collection v1 référencée | Contraintes, composition, provenance, sélection et futur historique | Import HTML et limites scanner |
| Mini-site/Academy | Sections sémantiques, données liées | Tokens, blocs, exports, formats et résolveur | Pédagogie/exercices et bindings métier |
| Design | DesignDocument, éléments XY, SVG | Ressources par id, previews, commandes, tokens | Géométrie absolue, calques/transformations et exports graphiques |
| Broderie | Pattern, typed arrays/points | Infrastructure de commandes et références | Moteurs DMC, points, historique optimisé, Canvas |
| Photo/Art/Mode | Recettes, marques et gabarits | Médias, provenance, undo testable | Rendu pixel/gestes/gabarits |
| Musique | Notes/événements/audio/catalogue | Ressources et projections, métadonnées de droits | Temps audio, mastering, formats WAV/MIDI |
| Admin/Programme/Budget | Documents/séances/centimes | Identité WorldSpace, formulaires et références | Calculs/contraintes de métier |

Ne pas transformer ces modèles en une seule table ou copier leurs données dans la grille. La grille est une présentation, WorldSpace reste le projet et les ressources gardent leur moteur propriétaire. Le nouveau résolveur est un adaptateur de lecture, pas un magasin.

## Premier mécanisme réel de propagation

`fragmentResources.ts` implémente UN adaptateur vers la clé Design courante existante. Le fragment garde `source:{version,kind,resourceId,titleMode,allowExport}`, pas le SVG. Cliquer « Relier ma création Design » crée cette référence explicite. Une sauvegarde Design émet `aime:design-changed` ; le montage/rechargement/événement storage relit aussi la source. Le titre lié et l'image sont calculés depuis le DesignDocument courant. Changer le titre dans le fragment le dissocie en custom ; cadrage/span/notes restent locaux à la présentation.

Les ids ne changent pas lors des modes. Une autre création courante, une source corrompue ou absente produit une erreur, pas substitution ou réparation. Limite : l'adaptateur lit seulement le slot courant, pas encore les brouillons/bibliothèques ni les ressources d'un WorldSpace sélectionné. Le lien n'est pas ajouté automatiquement au dossier. Aucun deuxième stockage, aucun upload.

Export HTML bloqué par défaut lorsqu'une source Design privée est liée. L'inspecteur propose une autorisation explicite et sa révocation pour les exports futurs. Ce choix est une règle locale, PAS un ACL sécurisé ou un consentement juridique ; une copie déjà exportée ne peut pas être récupérée. JSON exporte les références, pas les fichiers sources. Un import JSON remet les autorisations d’export des références à false : elles doivent être reconfirmées dans l’inspecteur. Pas de publication publique.

## Démonstration disponible

1. Dans Design, créer/modifier un document et lui donner un nom. Exporter sa copie privée si nécessaire.
2. Ouvrir Métamorphose/grille → « Relier ma création Design ». La référence est ajoutée sans copier le SVG dans le magasin.
3. Revenir au Design, modifier nom/contenu ; revenir à la grille. La vue relit la même ressource. En deux onglets, événement storage actualise la vue.
4. Changer Éditorial/Régulier/Immersif ; identité et contenus conservés. Afficher l'iframe 390/768/1200 px.
5. Exporter HTML : refus pour la ressource privée. Sélectionner la case, autoriser explicitement l'export, puis exporter. Révoquer interdit les exports futurs.
6. Les sources originales restent dans Design. Le test UI démontre modification de source, rendu actualisé, JSON inchangé et refus d'export par défaut.

Ce n'est PAS encore le démonstrateur global URL + document privé + création + WorldSpace + Mini-site + publication + undo. URL reste conditionnée au secret, import de documents non relié, sélection publique/permissions serveur absentes et retour de versions non implémenté pour fragments. Ne pas annoncer ces étapes comme terminées.

## Suite et point de reprise

- Recette comparative visuelle 390/768/1200px, zoom 200%, titres 160 caractères, descriptions 600, chaînes sans espaces, grandes images et cadrages. Tester clavier/déplacement sans glisser-déposer ; encore manquant.
- Résolveur strict par id sur bibliothèques Design puis autres moteurs ; erreurs de version/fraîcheur et choix linked/custom/revoked.
- Liaison explicite du fragment au WorldSpace.dossier.references, sans double source canonique ; import de document avec confidentialité par défaut.
- Projection des références autorisées dans Mini-site, pas de publication implicite. Archive avec manifeste et restauration avant promesse de mémoire transmissible.
- Commandes undo/redo et conflits inter-onglets testés avant migration des collections.
- Aucun nouveau nom, aucune suppression de Studio ni refonte landing dans ce lot. Les principes Affinity déjà étudiés restent des références de continuité, pas une preuve d'équivalence technique.

Validation locale finale de la tranche : 471/471 tests applicatifs (64 fichiers), 7/7 tests Node, TypeScript/build et contrôle du manifeste hors ligne réussis. Les 5 nouveaux tests ciblés réussissent aussi séparément. Audit npm : 0 vulnérabilité connue. La CI de la PR doit confirmer le SHA publié. L'avertissement de bundle initial volumineux est conservé ; pas de promesse de performance ou de rendu réel sur la seule CI.

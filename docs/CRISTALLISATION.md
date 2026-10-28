# LE MONDE AIME — Phase de cristallisation

Décidée le 28 octobre 2026. LE MONDE AIME passe d'un ensemble de réalisations à un seul produit maîtrisé.

> Ne plus ajouter. Faire fonctionner ensemble.
> Une fonction · un moteur de référence · une donnée canonique · plusieurs usages autorisés.

## Gel fonctionnel

Gelé :
- aucun nouveau studio, moteur ou concept ;
- aucune nouvelle refonte graphique ;
- aucun changement de navigation sans audit préalable (voir `/systeme-nerveux`, lecture d'inspection) ;
- aucune suppression sans identifier les dépendances ;
- aucune fusion massive de plusieurs projets ;
- aucune fonctionnalité déclarée opérationnelle sans test réel.

Autorisé : corrections, raccordements, consolidation, accessibilité, et ce qu'il faut pour terminer les parcours existants.

## Les cinq temps

1. **Examiner** : cartographier chaque page, dock, bouton, moteur, donnée et parcours ; identifier ce qui fonctionne réellement.
2. **Trier** : distinguer l'utile, les doublons, les démonstrations, l'incomplet et ce qui est devenu inutile.
3. **Rassembler** : mutualiser les moteurs, harmoniser les commandes, relier les données, sans détruire l'existant.
4. **Vérifier** : chaque parcours du début à la fin, avec les bons rôles, documents, accès et notifications.
5. **Stabiliser** : supprimer uniquement les doublons démontrés, corriger, documenter, sécuriser la production.

## L'ordre des sujets

Un sujet à la fois : son audit, ses décisions, sa petite PR, ses tests. On clôture un sujet avant d'en ouvrir un autre.

1. Docks et navigation : clos le 28 octobre 2026 (voir `docs/inventaires/01-docks-navigation.md`).
2. Métamorphose : inventaire prêt (`docs/inventaires/02-metamorphose.md`), modifications en attente de validation.
3. Unions.
4. Grille 200.
5. Réseau et cartes métiers.
6. StudiO.
7. Espace personnel.
8. Musique.
9. Documents.
10. Causalité.

## Condition de réussite

Une personne qui découvre LE MONDE AIME comprend où commencer, crée son projet, retrouve ses informations et collabore, sans connaître l'histoire du développement.

## L'instrument : le système nerveux

- `cartographie/scanner.mjs` lit le dépôt et produit `cartographie/inventaire.json` : routes, commandes et leurs points d'entrée, docks, appels d'API, fonctions serveur, tables, tests.
- `cartographie/reseau.json` décrit les nœuds et les liens, en six familles : interfaces, actions, moteurs, données, relations, événements. Il contient aussi le premier parcours et l'audit des doublons.
- `cartographie/preuves.json` garde le résultat daté de chaque test et de chaque parcours de bout en bout.
- Règle : un nœud n'est « vérifié » que s'il a au moins un test enregistré comme réussi. Sinon il est « à vérifier » ; s'il n'existe pas encore, il est « prévu ».
- La page `/systeme-nerveux` affiche une lecture publique (le fonctionnement) et une lecture d'inspection (modules, données, tests, doublons). L'inspection est servie par `/api/systeme` aux seules adresses listées dans `AIME_INSPECTION`.

Mettre la carte à jour :

```
node cartographie/scanner.mjs             # l'inventaire et la lecture publique
npm run build && npx vite preview --port 4610
python3 tests/e2e/navigation.py           # puis moments.py, systeme.py
npm run carte                             # inventaire + preuves des tests serveur
npm test                                  # la carte doit rester vraie
```

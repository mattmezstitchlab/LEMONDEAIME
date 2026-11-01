# Présenter la broderie par les usages du Disque

Base convergence : 546d47559162e38e9cdaba00f5b31110183fc693 (après #49). PR brouillon vers convergence uniquement.

## Une référence, pas une copie

La présentation `/studio/` remplace les huit chapitres à captures `ecran-*.webp` par un seul Point interactif. Elle réutilise le composant Disque déjà exporté par l’édition, lequel emploie le même Point/LePoint que l’atelier. Aucun moteur ni fichier média n’est modifié ou recréé. Les captures restent dans le dépôt, mais ne sont plus affichées ni demandées par cette présentation.

La loupe et le nuancier réutilisent respectivement Brode et FLOSS/filsParFamille. Le textile est le même palampore du Met, avec sa provenance et son statut de domaine public. Aucun nouveau motif n’est généré ou enregistré par la présentation. L’ancienne édition accessible par paramètre ne remplace plus cette narration : la page utilise les usages du Disque quel que soit `?edition`.

## Huit usages

| Intention | Démonstration / action réelle |
|---|---|
| Importer | Sélecteur image/PDF/JSON/OXS ; callback d’import existant, exécuté dans l’atelier |
| Créer | Ouvre le véritable atelier, même callback create |
| Le Point | Confort natif ; visite et ouvrages par leurs callbacks existants |
| Fils | Consultation de toutes les familles et références DMC ; aucun faux changement de couleur d’un ouvrage |
| Loupe | Vrai Brode, déplacement souris/doigt/flèches et recentrage sur la démonstration |
| Affichage | Accès aux lecteurs Fleur/UPTOWN, où les commandes sont réelles ; accès au patron actif dans l’atelier |
| Broder | Reprise de l’atelier, pas de progression fictive inscrite ici |
| Partager | Accès atelier pour exporter/partager ; pas de fausse génération PDF ni invitation automatique |

Les boutons textuels des huit intentions sont une alternative accessible, pas une autre navigation globale. Les anciens identifiants de chapitres sont conservés pour les liens, les sommaires et le footer. Import direct, reprise et avertissement sauvegarde restent accessibles.

## Vérifications

Recette ciblée : 70 assertions Chromium à 1280, 390, 320 px, une seule instance Point, huit usages activés depuis la couronne, cibles >=44 px, pas de débordement, vraie loupe et vraies familles DMC, clavier, accès à la grille. Tests unitaires des callbacks et absence d’écriture au chargement. API simulées en local, pas de credential, pas d’écriture distante.

Aucun changement de films, musique, comptes, données, variables, API, moteur métier ou ROSACE. Les exports/partages réels et comptes distants ne sont pas validés par cette démonstration. Les phases des clips et l’arrêt audio restent couverts par la recette de consolidation séparée. L’accessibilité ciblée ne vaut pas certification WCAG complète, les dimensions du navigateur ne sont pas un test sur appareils physiques.

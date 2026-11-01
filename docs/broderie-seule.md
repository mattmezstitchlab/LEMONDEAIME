# Recentrage public sur la broderie

Base : convergence e491846. Proposition indépendante vers convergence, aucune production.

- Header partagé : Accueil, Broderie (présentation Studio), Atelier. « Mon espace » conserve le panneau personnel et ses quatre dossiers.
- Accueil public dédié : lancement existant de La Fleur du Ciel, atelier, ouvrages/partages et les deux clips. Aucun film ou timing modifié, aucun moteur ajouté.
- Recherche et footer : uniquement accès broderie et compte. Préférences Studio déplacées dans le panneau du header ; retour de contexte utile conservé.
- Disque, import, palette, loupe, bibliothèque et comptes : moteurs inchangés, aucune donnée supprimée ni filtrée silencieusement dans le compte.
- Mariage, réseau, musique, boutique et anciennes présentations restent dans le dépôt et leurs routes directes restent compatibles. Elles sont retirées des points d’entrée publics canoniques, PAS rendues privées : ce travail ne constitue pas une restriction de sécurité ou une désindexation.
- Ancien accueil conservé dans Accueil.tsx ; seul le routage racine emploie AccueilBroderie. Les tests de l’ancien composant demeurent des tests d’archive et ne prouvent pas le nouvel accueil.
- Aucun changement de DB, variables, ressource, authentification, API, médias, ROSACE ou données ; aucune fusion de PR.

Recette locale API simulées, pas d'écriture distante. Les parcours de compte réels attendent toujours la preuve d’isolation Preview.

# POINTZERO — Audit de simplification UX

## Réalisé sur la PR #59
- Dock inférieur : pictogrammes seuls pour import, export, loupe et recentrage ; noms accessibles conservés.
- Colonne gauche : outils courants réduits à des pictogrammes, avec intitulés lecteurs d’écran et infobulles.
- Libellés secondaires supprimés, dimensions des commandes harmonisées.
- Formulaire de préparation renommé « Modifier la toile » ; action de redimensionnement distinguée du format initial.
- Lettrage renommé « Texte (lettres en croix) », sans suppression de sa logique.

## Décisions de conception
- Garder les réglages de tissu, comptage, brins et marge : ils influencent la taille physique et la consommation de fil.
- Garder le redimensionnement après création, car il agit sur le patron et peut couper des points ; il reste confirmé.
- Garder les métadonnées auteur, source et licence : elles suivent les exports.
- Garder le nuancier complet et le rail DMC actifs : deux usages complémentaires.
- Vérifier avant toute suppression les contrôles du menu « … » et le placement d’un accès direct à Texte.

## Reste à auditer et tester
1. Parcours desktop, mobile, iPad et lecteurs d’écran.
2. Toutes les sections des panneaux Préparer, Éditer, Suivre, Réglages et leurs éventuels doublons.
3. Ouvrir l’outil Texte en un geste, sans changer la fonction existante.
4. Cohérence des valeurs importées puis modifiées dans « Modifier la toile ».
5. États hover, focus, actif, désactivé et tooltips.
6. Exécuter npm run verify et inspecter la prévisualisation Vercel.

Principe : supprimer le bruit, pas la capacité.
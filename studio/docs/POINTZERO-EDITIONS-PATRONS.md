# Point Zéro · Éditions — les 24 patrons

Les 24 fiches de la boutique (`/boutique`) ne sont plus des symboles génériques : chacune est un **patron natif** dessiné case par case en fils DMC.

- Catalogue : `src/lib/editions/catalog.ts` (titres, collections, dimensions, plafond de couleurs, prix envisagés).
- Dessins : `src/lib/editions/drawings/*.ts`, un fichier par collection, avec le kit `src/lib/editions/kit.ts` (formes, ombrages, police 5×7 originale).
- Fabrication : `fabriquerEdition(id)` renvoie un `Pattern` ; l’aperçu de la boutique, le studio et le PDF lisent exactement les mêmes cases.
- Grandes capitales des monogrammes : `src/lib/editions/glyphs.ts`, tramées une fois depuis DejaVu Serif Bold (licence libre).

Garanties testées (`src/__tests__/editions.test.ts`) : dimensions annoncées, nombre de fils ≤ plafond, codes DMC valides, rendu déterministe, 24 dessins distincts, export PDF.

Toujours à faire avant une vente réelle : revue humaine de chaque grille, impression A4, essai brodé et photo, puis tout le volet paiement / droits décrit dans `BOUTIQUE-PATRONS.md`. En attendant, la fiche propose « Ouvrir dans le studio » pour un usage personnel ; aucun paiement n’est actif.

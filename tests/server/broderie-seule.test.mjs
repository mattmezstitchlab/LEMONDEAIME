import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const lire = p => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
test('broderie : accueil dédié, deux films et outils, sans chemins vers les autres univers', () => {
  const accueil = lire('src/pages/AccueilBroderie.tsx');
  assert.match(lire('src/App.tsx'), /'\/': \[AccueilBroderie,/);
  for (const href of ['/studio/atelier', '/studio/atelier?ouvrir=importer', '/studio/atelier?ouvrir=ouvrages']) assert.ok(accueil.includes(href));
  assert.doesNotMatch(accueil, /<OuvertureFleur/);
  assert.match(lire('src/charte/HeaderPublic.tsx'), /La Fleur du Ciel/);
  assert.doesNotMatch(accueil, /href="\/(?:aime-wedding|projets|reseau|musique|boutique|a-plus)/);
  for (const file of ['Accueil', 'AimeWedding', 'Portfolio', 'Reseau', 'Musique', 'Boutique']) assert.ok(existsSync(new URL('../../src/pages/' + file + '.tsx', import.meta.url)), file+' conservé');
});
test('broderie : recherche et pied ne proposent plus les autres univers', () => {
  const recherche = lire('src/charte/Recherche.tsx');
  assert.doesNotMatch(recherche, /href: '\/(?:aime-wedding|reseau|musique|projets|boutique|a-plus)/);
  const pied = lire('src/charte/Charte.tsx').split('export function Pied()')[1].split('export function Visuel')[0];
  assert.doesNotMatch(pied, /'\/(?:aime-wedding|reseau|projets|boutique|musique|a-plus)'/);
  assert.match(lire('src/charte/PanneauPersonnel.tsx'), /Paramètres du Studio/);
});

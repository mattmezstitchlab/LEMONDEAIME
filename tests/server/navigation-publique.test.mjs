import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const lire = p => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
// Le module canonique est pur ; compilation en mémoire pour tester aussi sur les Node sans chargement TS natif.
const js = ts.transpileModule(lire('src/charte/navigationPublique.ts'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { ENTREES_PUBLIQUES, rubriqueActive } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('header public : entrées broderie exactes, source unique et rubriques actives', () => {
  assert.deepEqual(ENTREES_PUBLIQUES.map(e => e.nom), ['Accueil', 'Broderie', 'Atelier', 'Vidéo']);
  assert.deepEqual(ENTREES_PUBLIQUES.map(e => e.href), ['/', '/studio/', '/studio/atelier', '/studio/fleur-du-ciel']);
  for (const e of ENTREES_PUBLIQUES) assert.equal(rubriqueActive(e.href), e.href);
  for (const p of ['/studio', '/studio/uptown', '/projets/brode-way', '/point-zero']) assert.equal(rubriqueActive(p), '/studio/');
  assert.equal(rubriqueActive('/a-propos/'), null);
  assert.equal(rubriqueActive('/studio/atelier'), '/studio/atelier');
  assert.equal(rubriqueActive('/aime-wedding'), null);
  assert.equal(rubriqueActive('/buro'), null, 'un espace de compte n’est pas une septième rubrique');
  assert.equal(rubriqueActive('/studio-inconnu'), null, 'pas de faux préfixe Studio');
});

test('header public : routes profondes, ancienne navigation et fonctions métier préservées', () => {
  const config = JSON.parse(lire('vercel.json'));
  const pages = config.rewrites.find(r => r.source.startsWith('/:page')).source;
  assert.ok(pages.includes('contact|projets-a-venir|projets|aime-wedding'));
  assert.ok(config.rewrites.some(r => r.source === '/studio/:chemin*'));
  assert.ok(config.redirects.some(r => r.source === '/studio' && r.destination === '/studio/'));
  assert.match(lire('src/App.tsx'), /'\/charte': '\/projets', '\/monde': '\/projets'/);
  assert.match(lire('src/charte/Charte.tsx'), /<HeaderPublic chemin=\{chemin\}/);
  assert.match(lire('studio/src/main.tsx'), /<HeaderPublic/);
  assert.doesNotMatch(lire('src/main.tsx'), /NavigationConvergence/);
  const charte = lire('src/charte/Charte.tsx') + lire('src/charte/PanneauPersonnel.tsx');
  for (const capability of ['<Recherche ', '<EntrerBloc ', 'seDeconnecter({ effacerOuvrages:', '<ReglagesLigne ', '<Musique />']) assert.ok(charte.includes(capability), capability);
  for (const command of ['<TambourAtelier', 'onImporter=', 'onComposer=']) {
    // Les commandes sont dans les composants métier, non remplacées par la navigation publique.
    const studio = lire('studio/src/components/StudioDocks.tsx') + lire('studio/src/App.tsx');
    assert.ok(studio.includes(command), command);
  }
});

test('rubriques incomplètes : pas de formulaire factice, ni URL de contact inventée', () => {
  const page = lire('src/pages/RubriquesPubliques.tsx');
  assert.ok(page.includes('Aucun message n’est envoyé depuis cette page.'));
  assert.doesNotMatch(page, /<form|mailto:|fetch\(/);
  assert.ok(page.includes('pas de date de lancement confirmée'));
});

/* La carte Broderie ouvre l'atelier : chaque entrée correspond à une commande qui existe, sans nouvelle page entre la carte et l'atelier. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATELIER, ENTREES_BRODERIE, estBroderie, ouvrageARepris, CLE_OUVRAGE } from '../../src/lib/entreesBroderie.mjs';

const lire = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const ouvrirStudio = lire('studio/src/lib/ouvrir.ts');
const valeursStudio = JSON.parse(ouvrirStudio.match(/OUVRIR = (\[[^\]]*\])/)[1].replace(/"/g, '"'));
const broderie = lire('studio/src/components/blocs/broderie.tsx');

test('les cinq entrées demandées, dans cet ordre, toutes vers l’atelier', () => {
  assert.deepEqual(ENTREES_BRODERIE.map(e => e.nom), ['Mes ouvrages', 'Reprendre un ouvrage', 'Créer un motif', 'Importer un patron', 'Explorer les fils et couleurs']);
  for (const e of ENTREES_BRODERIE) assert.ok(e.href === ATELIER || e.href.startsWith(ATELIER + '?ouvrir='), e.href);
});
test('chaque ?ouvrir= est compris par l’atelier, et « Reprendre » garde l’adresse ordinaire', () => {
  const valeurs = ENTREES_BRODERIE.map(e => e.href.split('?ouvrir=')[1]).filter(Boolean);
  assert.deepEqual(valeurs.sort(), [...valeursStudio].sort());
  assert.equal(ENTREES_BRODERIE.find(e => e.id === 'reprendre').href, '/studio/atelier');
});
test('« Fils » et « Importer » désignent de vraies commandes de l’arbre de l’atelier, « Composer une rosace » existe dans Importer', () => {
  assert.ok(/id: "fils"/.test(broderie) && /id: "importer"/.test(broderie));
  assert.ok(/id: "imp-rosace"[^\n]*Composer une rosace|Composer une rosace/.test(broderie));
});
test('la carte Broderie est le projet Brode Way ; aucune nouvelle landing ni route', () => {
  assert.ok(estBroderie({ slug: 'brode-way' }) && !estBroderie({ slug: 'aime-wedding', categorie: 'Mariage', lien: '/aime-wedding' }) && !estBroderie(null));
  const projet = lire('src/pages/Projet.tsx');
  assert.ok(projet.includes('ENTREES_BRODERIE') && /<a className="ac-chemin" href=\{e\.href\}/.test(projet), 'liens directs vers /studio/atelier');
  const app = lire('src/App.tsx'), vercel = lire('vercel.json');
  assert.ok(!/ouvrir|broderie-entree|atelier-entree/i.test(app), 'aucune nouvelle route dans le site');
  assert.ok(/\/studio\/\(\.\*\)|\/studio\//.test(vercel), 'le Studio reste servi sous /studio/');
});
test('le Studio ne touche ni aux sauvegardes ni aux modèles : lib/library et lib/store sont inchangés', async () => {
  const { execSync } = await import('node:child_process');
  const base = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
  const touches = execSync(`git diff --name-only ${base} HEAD`, { encoding: 'utf8' }).split('\n');
  for (const f of ['studio/src/lib/library.ts', 'studio/src/lib/store.ts', 'studio/src/lib/pattern.ts', 'studio/src/lib/aimeSync.ts', 'studio/src/lib/brodeuseProfile.ts', 'studio/src/lib/dmc.ts', 'studio/src/lib/tambour/disque.ts'])
    assert.ok(!touches.includes(f), f + ' ne doit pas changer dans ce lot');
  assert.ok(!touches.some(f => f.startsWith('studio/src/lib/motif5d/')), 'aucun moteur 5D modifié ou dupliqué');
});

const stock = (v) => ({ getItem: (k) => (k === CLE_OUVRAGE ? v : null) });
test('« Reprendre » : un ouvrage n’existe que s’il a un point posé ; sinon état vide explicite', () => {
  assert.equal(ouvrageARepris(stock(null)), null);
  assert.equal(ouvrageARepris(stock('pas du json')), null);
  assert.equal(ouvrageARepris(stock(JSON.stringify({ name: 'Nouveau motif', cross: [-1, -1], q0: [-1] }))), null, 'un canevas vide n’est pas un ouvrage');
  const o = ouvrageARepris(stock(JSON.stringify({ name: 'Rosace 5D-11111', cross: [-1, 0, -1] })));
  assert.equal(o.nom, 'Rosace 5D-11111', 'le fil 0 est un vrai point');
  assert.equal(ouvrageARepris(undefined), null);
  const projet = lire('src/pages/Projet.tsx');
  assert.ok(projet.includes('ouvrageARepris') && projet.includes('Aucun ouvrage sur cet appareil'), 'l’état vide est écrit dans la carte');
});
test('arrivé depuis une carte (?ouvrir=), aucune visite guidée ne s’impose dans l’atelier', () => {
  const app = lire('studio/src/App.tsx');
  assert.ok(/ouvrir === null && atelierLibre/.test(app));
});

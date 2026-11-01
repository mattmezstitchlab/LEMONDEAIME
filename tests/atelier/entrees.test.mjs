/* La carte Broderie ouvre l'atelier : chaque entrée correspond à une commande qui existe, sans nouvelle page entre la carte et l'atelier. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ATELIER, ENTREES_BRODERIE, estBroderie } from '../../src/lib/entreesBroderie.mjs';

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

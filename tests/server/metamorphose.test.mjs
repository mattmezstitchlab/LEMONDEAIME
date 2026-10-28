// Sujet n° 2 — Métamorphose : le critère de date du Réseau, et les garde-fous de Fragments (lecture du code, sans serveur).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { critereDepuis } from '../../src/lib/critere-date-outils.mjs';

const AUJ = new Date(2026, 9, 28);
const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('critère de date : sans paramètre, la date vient de la Métamorphose', () => {
  const c = critereDepuis(null, 'Le 12 juin, au bord de la mer', AUJ);
  assert.deepEqual([c.date, c.source, c.metaLisible, c.suffixe], ['2027-06-12', 'metamorphose', true, '']);
});

test('critère de date : une date choisie dans le Réseau passe avant, la phrase reste intacte', () => {
  const c = critereDepuis('2027-07-03', 'Le 12 juin', AUJ);
  assert.deepEqual([c.date, c.source, c.texteMeta, c.suffixe], ['2027-07-03', 'recherche', 'Le 12 juin', '?date=2027-07-03']);
});

test('critère de date : « aucune » efface le critère sans effacer la Métamorphose', () => {
  const c = critereDepuis('aucune', 'Le 12 juin', AUJ);
  assert.deepEqual([c.date, c.source, c.metaLisible, c.suffixe], [null, 'aucune', true, '?date=aucune']);
});

test('critère de date : une phrase sans date, ou un paramètre mal formé, n’impose rien', () => {
  assert.equal(critereDepuis(null, 'Au bord de la mer', AUJ).date, null);
  assert.equal(critereDepuis(null, '', AUJ).source, 'aucune');
  assert.equal(critereDepuis('12/06', 'Au bord de la mer', AUJ).date, null);
});

test('critère de date : le Réseau ne modifie jamais la Métamorphose', () => {
  const src = lire('src/lib/critereDate.ts');
  assert.ok(!/ecrireMeta|localStorage\.setItem/.test(src));
});

test('Fragments : l’analyse d’une page reste fermée et non déployée', () => {
  assert.equal(existsSync(new URL('../../api/metamorphose-scan.mjs', import.meta.url)), false, 'pas de fonction déployée sans audit');
  const ui = lire('studio/src/components/MetamorphoseStudio.tsx');
  assert.match(ui, /const ANALYSE_OUVERTE\s*=\s*false/);
  assert.ok(!/POINTZERO_SCAN|process\.env/.test(ui), 'aucun nom de variable serveur dans l’interface');
  assert.match(ui, /pointzero:universal-fragments:v1/, 'les fragments gardent leur clé de stockage');
});

test('Fragments : les points d’entrée du Studio passent par le préfixe /studio', () => {
  for (const f of ['studio/src/components/AimeEcosystem.tsx', 'studio/src/components/AimeUnifiedHome.tsx']) {
    const src = lire(f);
    assert.match(src, /avecBase\(/, f);
    assert.ok(!/MÉTAMORPHOSE · Grille/.test(src), f);
  }
});

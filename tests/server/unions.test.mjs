// Sujet n° 3 — Unions : ce qui se vérifie sans base (nettoyage, lecture, programme). L'écriture réelle : tests/base/unions.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dateOk, nettoyerUnion, unionLue } from '../../api/buro.mjs';
import { programmeDUnion, estReference } from '../../src/lib/programme-outils.mjs';

const REF = JSON.parse(readFileSync(new URL('../../src/data/programme.json', import.meta.url), 'utf8'));
const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('union : la date officielle est une vraie date AAAA-MM-JJ', () => {
  assert.equal(dateOk('2027-06-12'), true);
  for (const d of ['2027-02-31', '12/06/2027', '2027-6-12', '', '0999-01-01']) assert.equal(dateOk(d), false, d);
});

test('union : seuls les champs envoyés sont retenus, nettoyés ; une valeur invalide refuse tout', () => {
  assert.deepEqual(nettoyerUnion({ a: '  Lou\u0007 ', lieu: 'x'.repeat(200), autre: 'ignoré' }), { a: 'Lou', lieu: 'x'.repeat(120) });
  assert.deepEqual(nettoyerUnion({ date: '' }), { date: '' });
  assert.equal(nettoyerUnion({ date: '2027-13-01' }), null);
  assert.equal(nettoyerUnion({ programme: { moments: 'tout' } }), null);
  assert.deepEqual(nettoyerUnion({ programme: { moments: ['day-x', 'day-x', '../x'], horaires: { 'day-x': '14:30', 'day-y': '25:00' } } }), { programme: { moments: ['day-x'], horaires: { 'day-x': '14:30' } } });
});

test('union : un mariage incomplet se lit avec des champs vides ; un autre espace n’est pas une union', () => {
  assert.deepEqual(unionLue({ modele: 'mariage', origine: 'x' }), { a: '', b: '', date: '', lieu: '', programme: null });
  assert.equal(unionLue({ modele: 'seminaire' }), null);
  assert.equal(unionLue({}), null);
});

test('programme d’une union : tiré de la référence, sans rien de l’union d’exemple, à sa date', () => {
  const avant = JSON.stringify(REF);
  const p = programmeDUnion(REF, { a: 'Lou', b: 'Marius', date: '2027-07-03', lieu: 'Cinéma', programme: null });
  assert.equal(p.reference, false);
  assert.equal(estReference(p), false);
  assert.equal(p.union.nom, 'Lou & Marius');
  assert.equal(p.moments.length, REF.moments.length, 'sans choix : toute la Grille');
  assert.ok(!/Camille|Gabriel|Jeanne|Malik/.test(JSON.stringify(p.union) + JSON.stringify(p.moments.map(m => m.titre + m.description))));
  assert.ok(p.moments.filter(m => m.etape === 'day').every(m => m.debut >= '2027-07-03' && m.debut < '2027-07-05'), 'le jour J à sa date (la nuit déborde sur le lendemain)');
  assert.ok(!/démonstration/.test(p.note));
  assert.equal(JSON.stringify(REF), avant, 'la référence n’a pas bougé');
});

test('programme d’une union : ses moments choisis et ses horaires', () => {
  const ids = REF.moments.filter(m => m.etape === 'day').slice(0, 3).map(m => m.id);
  const p = programmeDUnion(REF, { a: 'A', b: 'B', date: '', lieu: '', programme: { moments: ids, horaires: { [ids[1]]: '18:45' } } });
  assert.deepEqual(p.moments.map(m => m.id).sort(), [...ids].sort());
  assert.ok(p.moments.find(m => m.id === ids[1]).debut.slice(11, 16) === '18:45');
  assert.equal(p.union.jour, REF.union.jour, 'sans date officielle, les dates restent celles de la référence');
});

test('union : aucun nouveau kind, aucune nouvelle table ; la forme canonique d’AIMESTUDIO', () => {
  const api = lire('api/buro.mjs');
  assert.match(api, /kind = 'evenement' and data->>'modele' = 'mariage'/);
  assert.ok(!/'union'\s*,\s*\$|values \('union'|create table/i.test(api));
});

test('union : à cette étape, ni invitation, ni partage public', () => {
  const api = lire('api/buro.mjs'), ui = lire('src/pages/Buro.tsx') + lire('src/charte/FicheUnion.tsx');
  assert.ok(!/invitations/.test(api));
  assert.match(api, /and not \(\$\{EST_UNION\}\)/, 'la visibilité d’une union ne change pas');
  assert.match(ui, /!sel\.union && <button/, 'le bouton Partager est masqué pour une union');
});

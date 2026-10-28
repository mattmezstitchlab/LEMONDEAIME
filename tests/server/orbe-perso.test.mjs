import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contraste, verifier, nettoyer, halo, DEFAUT, FOND } from '../../src/lib/orbe-perso.js';

test('contraste : blanc sur noir = 21, une couleur contre elle-même = 1', () => {
  assert.equal(Math.round(contraste('#ffffff', '#000000')), 21);
  assert.equal(contraste('#4f7bff', '#4f7bff'), 1);
  assert.equal(contraste('#000000', '#ffffff'), contraste('#ffffff', '#000000'));
});

test('verifier : les orbes d’origine passent, une couleur trop sombre pour le dock est refusée avec sa raison', () => {
  assert.equal(verifier(DEFAUT).ok, true);
  assert.equal(verifier({ n: 4, couleurs: ['#ffffff'], w: 4.5 }).ok, true);
  const r = verifier({ n: 6, couleurs: ['#c9b8ff', '#222222'], w: 3 });
  assert.equal(r.ok, false);
  assert.match(r.problemes[0], /Couleur 2.*trop sombre.*dock/);
  assert.ok(contraste('#222222', FOND) < 3);
});

test('verifier : bornes des arcs, de l’épaisseur et du nombre de couleurs', () => {
  assert.equal(verifier({ n: 0, couleurs: ['#ffffff'], w: 3 }).ok, false);
  assert.equal(verifier({ n: 17, couleurs: ['#ffffff'], w: 3 }).ok, false);
  assert.equal(verifier({ n: 8, couleurs: ['#ffffff'], w: 1 }).ok, false);
  assert.equal(verifier({ n: 8, couleurs: [], w: 3 }).ok, false);
  assert.equal(verifier({ n: 8, couleurs: ['#ffffff', '#fffffe', '#fffffd', '#fffffc', '#fffffb'], w: 3 }).ok, false);
  assert.equal(verifier({ n: 8, couleurs: ['rouge'], w: 3 }).ok, false);
  assert.equal(verifier(null).ok, false);
});

test('nettoyer : bornes tenues, couleurs illisibles écartées, quatre couleurs au plus, rien d’exploitable = null', () => {
  assert.deepEqual(nettoyer({ n: 99, w: 9, couleurs: ['#ABCDEF', 'x', 5, '#112233'] }), { n: 16, w: 5, couleurs: ['#abcdef', '#112233'] });
  assert.deepEqual(nettoyer({ n: 0.2, w: 0, couleurs: ['#ffffff'] }), { n: 1, w: 2, couleurs: ['#ffffff'] });
  assert.equal(nettoyer({ n: 5, w: 3, couleurs: ['#ffffff', '#eeeeee', '#dddddd', '#cccccc', '#bbbbbb'] }).couleurs.length, 4);
  assert.equal(nettoyer({ n: 5, w: 3, couleurs: ['nope'] }), null);
  assert.equal(nettoyer({ n: 'a', w: 3, couleurs: ['#ffffff'] }), null);
  assert.equal(nettoyer('texte'), null);
  assert.equal(nettoyer(null), null);
});

test('halo : la première couleur, en rgba', () => {
  assert.equal(halo({ couleurs: ['#ff9a3c'] }), 'rgba(255,154,60,.55)');
  assert.equal(halo({ couleurs: [] }), 'rgba(255,255,255,.55)');
});

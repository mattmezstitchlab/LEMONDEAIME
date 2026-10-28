import { test } from 'node:test';
import assert from 'node:assert/strict';
import buro, { nettoyerProjet } from '../../api/buro.mjs';
import { adresseOrigine } from '../../api/comptes.mjs';
const res = () => ({ statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
test('nettoyerProjet : titre requis, briques connues et sans doublon, au plus 20', () => {
  assert.equal(nettoyerProjet({ titre: '   ' }), null);
  const p = nettoyerProjet({ titre: ' Notre\u0007 union ', briques: ['intention', 'inconnue', 'intention', 'personnes'], studio: 'AIME Wedding' });
  assert.equal(p.titre, 'Notre  union');
  assert.deepEqual(p.data.briques, ['intention', 'personnes']);
  assert.equal(p.data.visibilite, 'prive');
});
test('buro : fermé sans base (503), écriture d’un autre site refusée (403)', async () => {
  const old = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  try {
    let r = res(); await buro({ method: 'GET', headers: {} }, r); assert.equal(r.statusCode, 503);
    r = res(); await buro({ method: 'POST', headers: { origin: 'https://ailleurs.example', host: 'lemondeaime.com', 'content-type': 'application/json' } }, r); assert.equal(r.statusCode, 403);
  } finally { if (old !== undefined) process.env.DATABASE_URL = old; }
});
test('comptes : /api/auth/<chemin> reconstruit depuis la réécriture Vercel', () => {
  assert.equal(adresseOrigine('/api/comptes?__chemin=sign-in/magic-link'), '/api/auth/sign-in/magic-link');
  assert.equal(adresseOrigine('/api/comptes?__chemin=../x'), null);
});

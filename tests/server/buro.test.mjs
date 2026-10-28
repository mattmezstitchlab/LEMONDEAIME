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
test('fournisseurs : rien d’ouvert sans base, Google seulement avec ses deux variables', async () => {
  const { default: f } = await import('../../api/fournisseurs.mjs');
  const { googlePret } = await import('../../api/_auth/auth.mjs');
  const r = res(); f({}, r); assert.deepEqual(JSON.parse(r.body), { comptes: false, google: false, lien: false, cle: false });
  assert.equal(googlePret({ GOOGLE_CLIENT_ID: 'x' }), false);
  assert.equal(googlePret({ GOOGLE_CLIENT_ID: 'x', GOOGLE_CLIENT_SECRET: 'y' }), true);
});
test('lien e-mail : le jeton passe dans le chemin, puis redevient la vérification Better Auth', async () => {
  const { lienPropre } = await import('../../api/_auth/auth.mjs');
  assert.equal(lienPropre('https://www.lemondeaime.com/api/auth/magic-link/verify?token=AbCdEf123456&callbackURL=%2Fpoint-zero'), 'https://www.lemondeaime.com/lien/AbCdEf123456/point-zero');
  assert.equal(lienPropre('https://x.fr/api/auth/magic-link/verify?token=AbCdEf123456&callbackURL=https%3A%2F%2Fmal.example'), 'https://x.fr/lien/AbCdEf123456/buro');
  assert.equal(lienPropre('https://x.fr/api/auth/magic-link/verify?token=AbCdEf123456&callbackURL=%2F'), 'https://x.fr/lien/AbCdEf123456/accueil');
  assert.match(adresseOrigine('/api/comptes?__lien=AbCdEf123456/accueil'), /callbackURL=%2F&/);
  const a = adresseOrigine('/api/comptes?__lien=AbCdEf123456/point-zero');
  const u = new URL(a, 'http://x');
  assert.equal(u.pathname, '/api/auth/magic-link/verify');
  assert.equal(u.searchParams.get('token'), 'AbCdEf123456');
  assert.equal(u.searchParams.get('callbackURL'), '/point-zero');
  assert.equal(u.searchParams.get('errorCallbackURL'), '/entrer?erreur=lien');
  assert.equal(adresseOrigine('/api/comptes?__lien=..%2F..'), '/api/auth/magic-link/verify');
});
test('lien e-mail coupé (sans jeton) : retour à « Entrer », pas une erreur brute', async () => {
  const { default: comptes } = await import('../../api/comptes.mjs');
  const r = res(); await comptes({ method: 'GET', url: '/api/comptes?__chemin=magic-link/verify', headers: {} }, r);
  assert.equal(r.statusCode, 302); assert.equal(r.headers.Location, '/entrer?erreur=lien');
});
test('ouvrages : un ouvrage de l’atelier est vérifié avant d’entrer dans le compte', async () => {
  const { nettoyerOuvrage, TAILLE_MAX } = await import('../../api/ouvrages.mjs');
  const bon = { id: 'abc123', nom: ' Roses\u0007 ', w: 80, h: 80, maj: 1793160000000, progression: 1.4, contenu: '{"w":80}' };
  const { ouvrage } = nettoyerOuvrage(bon);
  assert.equal(ouvrage.nom, 'Roses'); assert.equal(ouvrage.progression, 1);
  assert.ok(nettoyerOuvrage({ ...bon, id: '../x' }).raison);
  assert.ok(nettoyerOuvrage({ ...bon, w: 0 }).raison);
  assert.ok(nettoyerOuvrage({ ...bon, contenu: 'pas du json' }).raison);
  assert.ok(nettoyerOuvrage({ ...bon, contenu: '[1]' }).raison);
  assert.equal(nettoyerOuvrage({ ...bon, contenu: '"' + 'x'.repeat(TAILLE_MAX) + '"' }).code, 413);
});
test('ouvrages : fermé sans base (503), écriture d’un autre site refusée (403)', async () => {
  const { default: ouvrages } = await import('../../api/ouvrages.mjs');
  const old = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  try {
    let r = res(); await ouvrages({ method: 'GET', url: '/api/ouvrages', headers: {} }, r); assert.equal(r.statusCode, 503);
    r = res(); await ouvrages({ method: 'POST', url: '/api/ouvrages', headers: { origin: 'https://ailleurs.example', host: 'lemondeaime.com', 'content-type': 'application/json' } }, r); assert.equal(r.statusCode, 403);
  } finally { if (old !== undefined) process.env.DATABASE_URL = old; }
});

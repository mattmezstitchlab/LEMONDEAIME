import { test } from 'node:test';
import assert from 'node:assert/strict';
import buro, { nettoyerProjet, nettoyerTitre, nettoyerDescription } from '../../api/buro.mjs';
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
test('nettoyerDescription / nettoyerTitre : retours à la ligne gardés, contrôles retirés, longueurs bornées ; la révision de départ est 0', () => {
  assert.equal(nettoyerDescription('  Une\r\nDeux\u0007  '), 'Une\nDeux');
  assert.equal(nettoyerDescription('x'.repeat(5000)).length, 2000);
  assert.equal(nettoyerDescription(undefined), '');
  assert.equal(nettoyerTitre('a'.repeat(300)).length, 120);
  const p = nettoyerProjet({ titre: 'T', description: 'D' });
  assert.equal(p.data.description, 'D'); assert.equal(p.data.rev, 0); assert.equal(p.data.source, 'point-zero');
});
test('mariage : dateValide refuse les dates qui n’existent pas et les années hors bornes', async () => {
  const { dateValide } = await import('../../api/buro.mjs');
  assert.equal(dateValide('2027-06-12'), true);
  assert.equal(dateValide('2028-02-29'), true);
  assert.equal(dateValide('2027-02-29'), false);
  assert.equal(dateValide('2027-13-01'), false);
  assert.equal(dateValide('1999-12-31'), false);
  assert.equal(dateValide('2101-01-01'), false);
  assert.equal(dateValide('12/06/2027'), false);
  assert.equal(dateValide(20270612), false);
});
test('mariage : nettoyerMariage exige les deux noms à la création, ne touche que les clés envoyées ensuite', async () => {
  const { nettoyerMariage } = await import('../../api/buro.mjs');
  assert.ok(nettoyerMariage({ noms: ['Camille', ''] }, true).erreur);
  assert.ok(nettoyerMariage({}, true).erreur);
  assert.ok(nettoyerMariage({ noms: 'Camille & Gabriel' }, true).erreur);
  assert.deepEqual(nettoyerMariage({ noms: [' Camille\u0007 ', 'Gabriel'] }, true).mariage.noms, ['Camille', 'Gabriel']);
  assert.deepEqual(nettoyerMariage({ date: '2027-06-12' }, false).mariage, { date: '2027-06-12' });
  assert.deepEqual(nettoyerMariage({ date: '' }, false).mariage, { date: '' });
  assert.ok(nettoyerMariage({ date: '2027-02-30' }, false).erreur);
  assert.deepEqual(nettoyerMariage({ lieu: { nom: 'Domaine', ville: 'Aix', iban: 'x' } }, false).mariage, { lieu: { nom: 'Domaine', ville: 'Aix' } });
  assert.equal(nettoyerMariage({ noms: ['a', 'b'], iban: 'FR00', contact: 'x' }, true).mariage.iban, undefined);
  assert.equal(nettoyerMariage({ lieu: { nom: 'x'.repeat(500) } }, false).mariage.lieu.nom.length, 120);
});
test('mariage : nettoyerProjet(genre mariage) = espace « evenement », modèle mariage, titre tiré des noms, rien d’autre dans la fiche', async () => {
  const p = nettoyerProjet({ genre: 'mariage', mariage: { noms: ['Camille', 'Gabriel'], date: '2027-06-12', lieu: { nom: 'Domaine', ville: 'Aix' }, iban: 'FR00' } });
  assert.equal(p.kind, 'evenement');
  assert.equal(p.titre, 'Camille & Gabriel');
  assert.equal(p.data.modele, 'mariage');
  assert.equal(p.data.rev, 0);
  assert.equal(p.data.visibilite, 'prive');
  assert.deepEqual(Object.keys(p.data.mariage).sort(), ['date', 'lieu', 'noms']);
  assert.ok(nettoyerProjet({ genre: 'mariage', mariage: { noms: ['Seul', ''] } }).erreur);
  assert.equal(nettoyerProjet({ titre: 'Autre' }).kind, undefined);   /* un projet ordinaire reste « projet » (kind absent → 'projet' côté serveur) */
});

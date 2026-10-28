import { test } from 'node:test';
import assert from 'node:assert/strict';
import reseau, { nettoyerProfil, METIERS } from '../../api/reseau.mjs';
const res = () => ({ statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
test('nettoyerProfil : nom et métier requis, caché par défaut, site en https', () => {
  assert.ok(nettoyerProfil({ nom: ' ', metier: METIERS[0] }).raison);
  assert.ok(nettoyerProfil({ nom: 'Léa', metier: 'Astronaute' }).raison);
  const { profil } = nettoyerProfil({ nom: ' Léa\u0007  Martin ', metier: 'Studio', site: 'atelier-lea.fr', ville: 'Lille', bio: 'a\n\n\n\nb' });
  assert.equal(profil.nom, 'Léa Martin');
  assert.equal(profil.visible, false);
  assert.equal(profil.site, 'https://atelier-lea.fr/');
  assert.equal(profil.bio, 'a\n\nb');
  assert.ok(nettoyerProfil({ nom: 'x', metier: 'Studio', site: 'javascript:alert(1)' }).raison);
  assert.equal(nettoyerProfil({ nom: 'x', metier: 'Studio', visible: 'oui' }).profil.visible, false);
});
test('reseau : fermé sans base (503), écriture d’un autre site refusée (403)', async () => {
  const old = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  try {
    let r = res(); await reseau({ method: 'GET', url: '/api/reseau', headers: {} }, r); assert.equal(r.statusCode, 503);
    r = res(); await reseau({ method: 'POST', url: '/api/reseau', headers: { origin: 'https://ailleurs.example', host: 'lemondeaime.com', 'content-type': 'application/json' } }, r); assert.equal(r.statusCode, 403);
  } finally { if (old !== undefined) process.env.DATABASE_URL = old; }
});

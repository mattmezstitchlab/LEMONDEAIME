import { test } from 'node:test';
import assert from 'node:assert/strict';
import reseau, { nettoyerProfil, DOMAINES } from '../../api/reseau.mjs';
const res = () => ({ statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
test('nettoyerProfil : nom et métier requis, caché par défaut, site en https', () => {
  assert.ok(nettoyerProfil({ nom: ' ', domaine: DOMAINES[0], metier: 'Fleuriste' }).raison);
  assert.ok(nettoyerProfil({ nom: 'Léa', domaine: 'espace', metier: 'Astronaute' }).raison);
  assert.ok(nettoyerProfil({ nom: 'Léa', domaine: 'broderie', metier: '  ' }).raison);
  const { profil } = nettoyerProfil({ nom: ' Léa\u0007  Martin ', domaine: 'broderie', metier: ' Brodeuse ', site: 'atelier-lea.fr', ville: 'Lille', bio: 'a\n\n\n\nb' });
  assert.equal(profil.nom, 'Léa Martin');
  assert.equal(profil.visible, false);
  assert.equal(profil.metier, 'Brodeuse');
  assert.equal(profil.domaine, 'broderie');
  assert.equal(profil.site, 'https://atelier-lea.fr/');
  assert.equal(profil.bio, 'a\n\nb');
  assert.ok(nettoyerProfil({ nom: 'x', domaine: 'mariage', metier: 'DJ', site: 'javascript:alert(1)' }).raison);
  assert.equal(nettoyerProfil({ nom: 'x', domaine: 'mariage', metier: 'DJ', visible: 'oui' }).profil.visible, false);
});
test('reseau : fermé sans base (503), écriture d’un autre site refusée (403)', async () => {
  const old = process.env.DATABASE_URL; delete process.env.DATABASE_URL;
  try {
    let r = res(); await reseau({ method: 'GET', url: '/api/reseau', headers: {} }, r); assert.equal(r.statusCode, 503);
    r = res(); await reseau({ method: 'POST', url: '/api/reseau', headers: { origin: 'https://ailleurs.example', host: 'lemondeaime.com', 'content-type': 'application/json' } }, r); assert.equal(r.statusCode, 403);
  } finally { if (old !== undefined) process.env.DATABASE_URL = old; }
});
test('exemples du Réseau : chaque brique existe, chaque « travaille avec » mène à un exemple, chaque photo existe', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../../src/lib/reseau-exemples.ts', import.meta.url), 'utf8');
  const { IDS } = await import('../../api/_briques.mjs');
  const slugs = [...src.matchAll(/slug: '([a-z-]+)'/g)].map(m => m[1]);
  for (const m of src.matchAll(/(?:voit|fait|partage): \[([^\]]*)\]/g)) for (const id of m[1].match(/[a-z]+/g) || []) assert.ok(IDS.includes(id), 'brique inconnue : ' + id);
  for (const m of src.matchAll(/avec: \[([^\]]*)\]/g)) for (const s of m[1].match(/[a-z-]+/g) || []) assert.ok(slugs.includes(s), 'exemple inconnu : ' + s);
  for (const m of src.matchAll(/P\('([a-z]+)'\)/g)) assert.ok(fs.existsSync(new URL('../../public/media/reseau/' + m[1] + '.jpg', import.meta.url)), 'photo manquante : ' + m[1]);
  for (const m of src.matchAll(/domaine: '([a-z]+)'/g)) assert.ok(DOMAINES.includes(m[1]), 'domaine inconnu : ' + m[1]);
});

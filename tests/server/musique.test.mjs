import { test } from 'node:test';
import assert from 'node:assert/strict';
import musique, { lireLien, deDeezer, MOMENTS } from '../../api/musique.mjs';
const res = () => ({ statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });
test('lireLien : Deezer reconnu, autres plateformes gardées comme liens, http refusé', () => {
  assert.deepEqual(lireLien('https://www.deezer.com/fr/track/487484142'), { deezer: 487484142 });
  assert.equal(lireLien('https://open.spotify.com/track/abc').plateforme, 'Spotify');
  assert.equal(lireLien('https://youtu.be/xyz').plateforme, 'YouTube');
  assert.equal(lireLien('http://exemple.fr/a.mp3'), null);
  assert.equal(lireLien('javascript:alert(1)'), null);
});
test('deDeezer : jamais l’adresse de l’extrait, pochette seulement depuis Deezer', () => {
  const t = deDeezer({ id: 1, title: 'September', artist: { name: 'Earth, Wind & Fire' }, album: { cover_medium: 'https://e-cdns-images.dzcdn.net/x.jpg' }, preview: 'https://cdnt-preview.dzcdn.net/a.mp3', duration: 215 });
  assert.equal(t.lien, 'https://www.deezer.com/track/1'); assert.ok(!('preview' in t)); assert.match(t.pochette, /dzcdn/);
  assert.equal(deDeezer({ id: 2, title: 'x', album: { cover_medium: 'https://ailleurs.example/x.jpg' } }).pochette, '');
  assert.ok(MOMENTS.includes('ouverture'));
});
test('musique : extrait mal formé refusé, écriture d’un autre site refusée', async () => {
  let r = res(); await musique({ method: 'GET', url: '/api/musique?extrait=abc', headers: {} }, r); assert.equal(r.statusCode, 400);
  r = res(); await musique({ method: 'POST', url: '/api/musique', headers: { origin: 'https://ailleurs.example', host: 'lemondeaime.com', 'content-type': 'application/json' } }, r); assert.equal(r.statusCode, 403);
});

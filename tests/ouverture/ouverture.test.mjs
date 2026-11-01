/* L'ouverture « La Fleur du Ciel » : les repères annoncés existent dans les données publiées, et le composant tient ses promesses. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const RACINE = new URL('../../', import.meta.url);
const lire = (p) => readFileSync(new URL(p, RACINE));
const texte = (p) => lire(p).toString('utf8');
const clip = JSON.parse(texte('studio/public/clip/fleur-du-ciel/clip.json'));
const G = clip.grille, P = clip.parMorceau;
const morceaux = new Map();
const image = (n) => {
  const m = Math.floor(n / P);
  if (!morceaux.has(m)) morceaux.set(m, gunzipSync(lire(`studio/public/clip/fleur-du-ciel/fils-${String(m).padStart(3, '0')}.bin.gz`)));
  const d = morceaux.get(m), i = n - m * P; return d.subarray(i * G * G, (i + 1) * G * G);
};
const changes = (a, b) => { let c = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) c++; return c; };
const nues = (a) => { let c = 0; for (const v of a) if (v === 45) c++; return c; };
const sec = (t) => Math.floor(t * clip.fps);

test('les repères musicaux sont dans les données publiées, pas reconstruits', () => {
  assert.equal(clip.format, 'clip-brode');
  assert.ok(Math.abs(clip.duree - 253.01) < .02, 'la durée est celle du morceau (4 min 13)');
  const temps = clip.accents.map(([t]) => t);
  assert.ok(temps.includes(198.255), 'l’éclosion à 03:18.255');
  assert.ok(temps.includes(242.75), 'le cœur à 04:02.75');
  assert.equal(nues(image(sec(196.0))), 0, 'la toile est entièrement brodée à 196 s');
  assert.equal(changes(image(sec(196.8)), image(sec(197.0))), 0, 'l’aiguille est arrêtée : le silence, juste avant l’éclosion');
  assert.ok(changes(image(sec(198.5)), image(sec(199.0))) > 1000, 'la fleur éclôt : des milliers de points changent');
});

test('la version courte et les légendes restent dans le morceau', async () => {
  const src = texte('src/ouverture/OuvertureFleur.tsx');
  const segs = JSON.parse(src.match(/export const COURTE[^=]*= (\[\[.*\]\]);/)[1]);
  let total = 0, avant = -1;
  for (const [d, f] of segs) { assert.ok(d >= 0 && f <= clip.duree && f > d && d > avant); total += f - d; avant = f; }
  assert.ok(total > 30 && total < 60, `version courte de ${total.toFixed(0)} s`);
  assert.ok(src.includes('[196.275,') && src.includes('[198.255,') && src.includes('[242.75,'), 'légendes aux repères annoncés');
});

test('rien ne se joue ni ne se charge avant un geste ; le mp4 n’est qu’un lien de secours', () => {
  const src = texte('src/ouverture/OuvertureFleur.tsx');
  assert.ok(!/autoplay/i.test(src), 'pas d’autoplay');
  const lancer = src.indexOf('async function lancer'), fin = src.indexOf('const basculerPause');
  assert.equal([...src.matchAll(/\.play\(\)/g)].filter(m => m.index < lancer || m.index > fin).length, 0, 'aucune lecture hors de lancer()');
  const appels = [...src.matchAll(/lancer\('/g)].filter(m => m.index > fin);
  assert.ok(appels.length >= 3 && appels.every(m => /onClick=\{\(\) => $/.test(src.slice(m.index - 15, m.index))), 'lancer() n’est appelé que par un clic');
  assert.ok(!/<video/.test(src), 'aucune balise video : le film est dessiné par le moteur du Studio');
  assert.ok(src.includes("import('../../studio/src/clip/rendu')") && src.includes("import('../../studio/src/clip/donnees')"), 'le moteur de rendu du Studio, chargé à la demande');
  const mp4 = [...src.matchAll(/mp4/g)].length; assert.ok(mp4 <= 2, 'le mp4 n’apparaît que dans le lien de secours');
  assert.ok(/Passer l’introduction/.test(src) && /prefers-reduced-motion/.test(src) && /webgl2/.test(src));
});

test('la navigation reste canonique et UPTOWN est conservé', () => {
  const acc = texte('src/pages/Accueil.tsx');
  assert.ok(acc.includes('<Tete courant="/" verbes={<VerbesAccueil />} />'), 'le dock du haut canonique');
  assert.ok(acc.includes('<OuvertureFleur />') && acc.includes('id="uptown"') && acc.includes('/studio/uptown'));
  assert.ok(!/<nav/.test(texte('src/ouverture/OuvertureFleur.tsx')), 'pas de nouvelle barre de navigation');
  assert.ok(/"\/studio\/fleur-du-ciel"|\/studio\/fleur-du-ciel/.test(texte('src/ouverture/OuvertureFleur.tsx')), 'le clip complet reste accessible');
});

test('l’image de couverture est légère et le premier écran n’impose pas le film', () => {
  const taille = statSync(new URL('public/media/fleur-du-ciel-couverture.jpg', RACINE)).size;
  assert.ok(taille > 20000 && taille < 300000, `couverture de ${Math.round(taille / 1024)} Ko`);
});

// Les préférences du Point dans le compte : la validation du serveur, et sa parité avec le studio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACCENTS, MENUS, NIVEAUX, PROFILS, validerPreferences } from '../../api/_preferences.mjs';

const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const CONFORT = { version: 1, theme: 'system', vision: 'standard', fontScale: 1, lineHeight: 1.5, spacing: 0, contrast: 'normal', reduceMotion: false, enhancedFocus: false, readingGuide: false, privacyBlur: false, accent: '#7562ce' };
const ok = { profil: 'lecture', niveau: 'intermediate', menu: 'liste', confort: { ...CONFORT, fontScale: 1.25, lineHeight: 1.8, enhancedFocus: true } };

test('des préférences valides passent, et rien d’autre n’est gardé', () => {
  const r = validerPreferences({ ...ok, intrus: '<script>', confort: { ...ok.confort, autre: 1 } });
  assert.deepEqual(Object.keys(r.preferences).sort(), ['confort', 'menu', 'niveau', 'profil']);
  assert.equal('autre' in r.preferences.confort, false);
  assert.equal(validerPreferences({ ...ok, profil: null }).preferences.profil, null);   /* « Personnalisé » */
});

test('les valeurs hors bornes ou inconnues sont refusées', () => {
  for (const mauvais of [
    { ...ok, profil: 'admin' }, { ...ok, niveau: 'dieu' }, { ...ok, menu: 'cercle' },
    { ...ok, confort: { ...CONFORT, fontScale: 3 } }, { ...ok, confort: { ...CONFORT, accent: 'red' } },
    { ...ok, confort: { ...CONFORT, theme: 'rose' } }, { ...ok, confort: { ...CONFORT, reduceMotion: 'oui' } }, null, [], 'x',
  ]) assert.ok(validerPreferences(mauvais).raison, JSON.stringify(mauvais));
});

test('parité avec le studio : mêmes profils, niveaux, menus, accents', () => {
  const profils = lire('studio/src/lib/point/profils.ts'), acces = lire('studio/src/lib/accessibilityCore.ts'), modes = lire('studio/src/lib/point/modes.ts');
  for (const p of PROFILS) assert.ok(profils.includes(`id: "${p}"`), p);
  for (const n of NIVEAUX) assert.ok(profils.includes(`"${n}"`), n);
  assert.ok(modes.includes('export type ChoixPresentation = "auto" | "arc" | "liste";') && MENUS.join() === 'auto,arc,liste');
  assert.ok(acces.includes(`const colors=${JSON.stringify(ACCENTS)};`));
});

test('l’API ne prend jamais l’identité dans le corps, et refuse d’écraser une version plus récente du compte', () => {
  const api = lire('api/preferences.mjs');
  assert.ok(api.includes('personne(req)') && !/b\.(user|compte|id)\b/.test(api));
  assert.ok(api.includes("actuel !== null && actuel !== base") && api.includes('409'));
  assert.ok(lire('api/_auth/auth.mjs').includes("delete from preferences_point where user_id = $1"));
});

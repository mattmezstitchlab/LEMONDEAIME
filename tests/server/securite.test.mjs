// Sécurité : ce qui se vérifie sans base. Le reste, sur une vraie base de test : tests/base/securite.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { autorise } from '../../api/maintenance.mjs';
import { reprendre, _stockage } from '../../api/_auth/effacements.mjs';
import { choisirAEffacer } from '../../src/lib/ouvragesAppareil.ts';

const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

test('S1 : la suppression de compte couvre la musique, le Réseau, et inscrit les fichiers pour effacement', () => {
  const a = lire('api/_auth/auth.mjs');
  for (const t of ['musiques', 'reseau_dates', 'reseau_questions', 'reseau_demandes where a_user', 'profils', 'ouvrages', 'space_members']) assert.ok(a.includes(t), t);
  assert.match(a, /update reseau_demandes set de_user = '', de_nom = 'Compte supprimé', de_email = ''/);
  assert.match(a, /prefixes: \['musique\/' \+ u\.id \+ '\/'\]/);
  assert.match(a, /afterDelete: \(\) => reprendreEffacements/);
});

test('S1 : la reprise est fermée sans secret, refuse un mauvais secret, et la tâche est planifiée', () => {
  assert.equal(autorise('Bearer x', ''), false);
  assert.equal(autorise('Bearer court', 'court'), false, 'un secret trop court ne protège rien');
  const s = 'un-secret-assez-long-0123456789';
  assert.equal(autorise('Bearer ' + s, s), true);
  assert.equal(autorise('Bearer ' + s + 'x', s), false);
  assert.equal(autorise(undefined, s), false);
  assert.deepEqual(JSON.parse(lire('vercel.json')).crons, [{ path: '/api/maintenance', schedule: '17 3 * * *' }]);
});

test('S1 : la file ne perd rien quand le stockage échoue, et se vide quand il répond', async () => {
  const lignes = [{ id: 1, genre: 'url', cible: 'https://x/musique/a/1.mp3', essais: 0 }, { id: 2, genre: 'prefixe', cible: 'musique/a/', essais: 0 }];
  const db = { async query(sql, v = []) {
    if (/to_regclass/.test(sql)) return { rows: [{ t: 'effacements_fichiers' }] };
    if (/^select count/.test(sql)) return { rows: [{ n: lignes.length }] };
    if (/^select id, genre, cible/.test(sql)) return { rows: lignes.slice(0, v[0]) };
    if (/^delete from effacements_fichiers/.test(sql)) { lignes.splice(lignes.findIndex(l => l.id === v[0]), 1); return { rows: [] }; }
    if (/^update effacements_fichiers/.test(sql)) { lignes.find(l => l.id === v[0]).essais++; return { rows: [] }; }
    throw new Error('requête inattendue : ' + sql);
  } };
  let panne = true; const effaces = [];
  _stockage({ del: async u => { if (panne) throw new Error('panne'); effaces.push(...[].concat(u)); }, list: async () => { if (panne) throw new Error('panne'); return { blobs: [{ url: 'https://x/musique/a/orphelin.mp3' }], hasMore: false }; } });
  let r = await reprendre(db);
  assert.deepEqual([r.effaces, r.echecs, r.restants], [0, 2, 2]);
  assert.ok(lignes.every(l => l.essais === 1));
  panne = false;
  r = await reprendre(db);
  assert.deepEqual([r.effaces, r.echecs, r.restants], [2, 0, 0]);
  assert.deepEqual(effaces.sort(), ['https://x/musique/a/1.mp3', 'https://x/musique/a/orphelin.mp3']);
  _stockage(null);
});

test('S2 : à la déconnexion, seuls les ouvrages du compte déjà rangés (version au moins aussi récente) sont effacés', () => {
  const locaux = [{ id: 'range', updated: 5, compte: 'B' }, { id: 'plus-recent', updated: 9, compte: 'B' }, { id: 'jamais-envoye', updated: 1, compte: 'B' }, { id: 'de-A', updated: 1, compte: 'A' }, { id: 'sans', updated: 1 }];
  const r = choisirAEffacer(locaux, [{ id: 'range', maj: 5 }, { id: 'plus-recent', maj: 3 }, { id: 'de-A', maj: 9 }, { id: 'sans', maj: 9 }], 'B');
  assert.deepEqual(r, { effacer: ['range'], garder: 2 });
});

test('S3 : /api/analyse exige une session, la garde commune et les quotas partagés', () => {
  const a = lire('api/analyse.mjs');
  assert.match(a, /const moi = await personne\(req\)/);
  assert.match(a, /R\.ecriture\(req\)/);
  assert.match(a, /Q\.quota\('analyse:personne', moi\.id/);
  assert.match(a, /Q\.quota\('analyse:tous', 'tous'/);
  assert.match(a, /if \(!g\.partage\)/, 'sans compteur partagé, aucune dépense');
  assert.ok(!/ANALYSE_ALLOWED_ORIGINS|Access-Control-Allow-Origin/.test(a), 'plus d’ouverture à d’autres sites');
  const q = lire('api/_auth/quotas.cjs');
  assert.match(q, /'analyse:personne': \{ max: 20, fenetre: 3600 \}/);
  assert.match(q, /'analyse:tous': \{ max: 300, fenetre: 3600 \}/);
});

test('S4 : la lecture publique du Réseau exclut tout événement', () => {
  assert.match(lire('api/reseau.mjs'), /from spaces where owner_id = \$1 and kind <> 'evenement' and coalesce\(data->>'visibilite','prive'\) = 'public'/);
});

/* Le système nerveux : la carte doit rester vraie. Chaque point existe dans le dépôt, chaque « vérifié » a sa preuve,
   la lecture publique ne montre rien de technique, l'inspection est fermée par défaut. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scanner } from '../../cartographie/scanner.mjs';
import * as O from '../../cartographie/outils.mjs';
import { traiter, autorise } from '../../api/systeme.mjs';
import * as P from '../../src/lib/programme-outils.mjs';

const lireJson = f => JSON.parse(readFileSync(new URL('../../' + f, import.meta.url), 'utf8'));
const lire = f => { try { return readFileSync(new URL('../../' + f, import.meta.url), 'utf8'); } catch { return null; } };
const reseau = lireJson('cartographie/reseau.json');
const inventaire = lireJson('cartographie/inventaire.json');
const preuves = lireJson('cartographie/preuves.json');
const res = () => ({ statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } });

test('la carte est vraie : chaque point, chaque lien, chaque test existe dans le dépôt', () => {
  assert.deepEqual(O.valider(reseau, { lire, inventaire, preuves }), []);
  assert.deepEqual(reseau.familles.map(f => f.id), ['interfaces', 'actions', 'moteurs', 'donnees', 'relations', 'evenements']);
  for (const f of reseau.familles) assert.ok(reseau.noeuds.some(n => n.famille === f.id), 'famille vide : ' + f.id);
});

test('l’inventaire committé est celui du code (relancer node cartographie/scanner.mjs)', () => {
  assert.deepEqual(scanner(), inventaire);
  assert.ok(inventaire.commandes.length > 50 && inventaire.serveur.some(s => s.route === '/api/musique' && s.ecrit.includes('musiques')));
});

test('la lecture publique ne montre ni fichier, ni test, ni donnée technique', () => {
  const pub = lireJson('src/data/systeme-public.json');
  assert.deepEqual(pub, O.projeterPublic(reseau));
  assert.ok(O.publicPropre(pub));
  for (const n of pub.noeuds) for (const k of ['sources', 'tests', 'donnees', 'roles', 'stockage', 'note']) assert.ok(!(k in n), n.id + ' montre ' + k);
  assert.ok(!('audit' in pub) && !('depot' in pub));
  // le site n'importe jamais la carte complète, seulement sa projection publique
  for (const f of inventaire.appels.map(a => a.fichier).concat(['src/pages/SystemeNerveux.tsx'])) assert.ok(!/cartographie\/(reseau|inventaire|preuves)\.json/.test(lire(f) || ''), f);
});

test('inspection : fermée sans compte, refusée sans autorisation, jamais de secret', async () => {
  let r = res(); await traiter({ method: 'GET', headers: {} }, r, { qui: async () => null, ouvert: () => true }); assert.equal(r.statusCode, 401);
  r = res(); await traiter({ method: 'GET', headers: {} }, r, { qui: async () => ({ email: 'quelqu.un@example.org' }), ouvert: () => true }); assert.equal(r.statusCode, 403);
  r = res(); await traiter({ method: 'GET', headers: {} }, r, { ouvert: () => false }); assert.equal(r.statusCode, 503);
  r = res(); await traiter({ method: 'POST', headers: {} }, r, { ouvert: () => true }); assert.equal(r.statusCode, 405);
  assert.equal(autorise('A@Example.org', ' a@example.org , b@example.org'), true);
  assert.equal(autorise('a@example.org', ''), false);
  assert.equal(autorise('', 'a@example.org'), false);
  const avant = process.env.AIME_INSPECTION; process.env.AIME_INSPECTION = 'inspecteur@example.org';
  try {
    r = res(); await traiter({ method: 'GET', headers: {} }, r, { qui: async () => ({ email: 'Inspecteur@example.org' }), ouvert: () => true });
    assert.equal(r.statusCode, 200); assert.match(r.headers['Cache-Control'], /no-store/);
    const j = JSON.parse(r.body);
    assert.ok(j.ok && j.reseau.noeuds.length && j.entrees.length && j.preuves);
    assert.ok(!/process\.env|DATABASE_URL|_SECRET|API_KEY|_TOKEN|AIME_INSPECTION|inspecteur@/.test(r.body), 'un secret ou une adresse apparaît');
    assert.ok(j.inventaire.serveur.every(s => !('configuration' in s)));
  } finally { if (avant === undefined) delete process.env.AIME_INSPECTION; else process.env.AIME_INSPECTION = avant; }
});

test('le premier parcours va du dock du haut à une donnée, chaque étape reliée aux précédentes', () => {
  const p = reseau.parcours[0];
  assert.equal(p.etapes[0], 'dock-haut');
  assert.equal(O.noeud(reseau, p.etapes.at(-1)).famille, 'donnees');
  for (let i = 1; i < p.etapes.length; i++) {
    const e = p.etapes[i], avant = p.etapes.slice(0, i);
    assert.ok(reseau.liens.some(l => (l.vers === e && avant.includes(l.de)) || (l.de === e && avant.includes(l.vers))), 'étape isolée : ' + e);
  }
  // l'écriture en base n'a pas de test réel : elle ne peut pas être annoncée vérifiée
  assert.equal(O.noeud(reseau, 'table-musiques').etat, 'a-verifier');
  assert.equal(O.etatLien(reseau, reseau.liens.find(l => l.de === 'api-musique' && l.vers === 'table-musiques')), 'a-verifier');
  assert.equal(O.noeud(reseau, 'notifications').etat, 'prevu');
});

test('les doublons signalés sont tirés du code, et rien n’est retiré', () => {
  const studio = O.entrees(inventaire).find(e => e.cible === '/studio/atelier');
  assert.ok(studio.libelles.includes('Studio') && studio.libelles.includes('Atelier de broderie'));
  assert.ok(studio.points.filter(x => x.fichier === 'src/charte/Recherche.tsx').length === 2, 'la loupe propose deux fois le Studio');
  assert.ok(O.entrees(inventaire).find(e => e.cible === '/buro').doublonDock);
  assert.equal((lire('src/charte/Charte.tsx').match(/seDeconnecter\(\)/g) || []).length, 2, 'les deux « Déconnexion » sont bien dans le dock du haut');
  for (const a of reseau.audit) assert.ok(O.STATUTS[a.statut] && a.raison.length > 40, a.id);
});

test('causalité : décaler un moment suit les prérequis, sans rien modifier ni envoyer', () => {
  const p = lireJson('src/data/programme.json'), avant = JSON.stringify(p);
  const r = P.decaler(p, 'day-couple-entrance', 30);
  assert.equal(r.moment.avant, '22:24'); assert.equal(r.moment.apres, '22:54');
  const bal = r.decales.find(d => d.id === 'day-first-dance');
  assert.ok(bal && bal.apres >= '23:04' && bal.cause.includes('Faire entrer le couple'));
  for (const d of r.decales) assert.ok(P.moment(p, d.id).prerequis.some(q => q === r.moment.id || r.decales.some(x => x.id === q)), d.id + ' bouge sans prérequis');
  assert.ok(r.metiers.some(t => t.id === 'dj') && r.personnes.some(x => x.id === 'camille'));
  assert.ok(r.supports.some(s => s.pour === 'maries') && r.supports.some(s => s.pour === 'dj'));
  assert.equal(r.notifications.etat, 'prevu');
  assert.equal(P.decaler(p, 'day-first-dance', -15).decales.length, 0, 'avancer ne tire personne');
  assert.equal(P.decaler(p, 'day-sunrise', 60).decales.length, 0);
  assert.throws(() => P.decaler(p, 'idea-notes', 10));
  assert.equal(JSON.stringify(p), avant, 'le programme de référence ne bouge pas');
});

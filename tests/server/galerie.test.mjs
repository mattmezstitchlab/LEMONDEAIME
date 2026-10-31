// La Galerie des Vivants (G1) : l'API, avec un dépôt en mémoire fidèle aux règles de la base (même contrat que depotPg).
// Couvre la liste de tests du document « La Galerie des Vivants — audit et MVP ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traiter } from '../../api/galerie.mjs';
import { AUTORISATIONS, CHAMPS_MOTIF, nettoyerExposition, nouvelId } from '../../api/_galerie.mjs';

const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const motif = (extra = {}) => JSON.stringify({ v: 3, name: 'Privé', w: 3, h: 2, cross: [0, -1, 2, 2, -1, 0], palette: [0, 2], flossCodes: ['310', 'B5200', '321'],
  notes: 'secret', photo: 'data:image/jpeg;base64,xxx', sessions: [{ date: '2026-10-29' }], stock: { 310: 2 }, done: [1, 0, 0, 0, 0, 0], provenance: { kind: 'original', personalOnly: false }, ...extra });
const expo = (extra = {}) => ({ action: 'exposer', titre: 'Garance', pseudo: 'Lise', description: 'Un essai.', histoire: '', contenu: motif(), apercu: PNG, attestations: { auteur: true, public: true }, ...extra });

const LISE = { id: 'u-lise', email: 'lise@exemple.fr' }, MARC = { id: 'u-marc', email: 'marc@exemple.fr' }, MATT = { id: 'u-matt', email: 'matt@exemple.fr' };

function memoire() {
  const oeuvres = new Map(), votes = new Set(), signal = new Map(); let t = 0;
  const votesDe = id => [...votes].filter(v => v.startsWith(id + '|')).length;
  const ligne = (o, moi) => ({ ...o, votes: votesDe(o.id), jai_vote: votes.has(o.id + '|' + moi) });
  return {
    _oeuvres: oeuvres, _votes: votes,
    async liste({ moi = null } = {}) { return [...oeuvres.values()].filter(o => o.statut === 'visible').sort((a, b) => b.cree_le - a.cree_le).map(o => ligne(o, moi)); },
    async fiche(id, moi) { const o = oeuvres.get(id); return o ? ligne(o, moi) : null; },
    async contenu(id) { const o = oeuvres.get(id); return o && o.statut === 'visible' ? { contenu: o.contenu, titre: o.titre, pseudo: o.pseudo } : null; },
    async mesOeuvres(a) { return [...oeuvres.values()].filter(o => o.auteur === a && o.statut !== 'retiree').map(o => ligne(o, a)); },
    async exposer(auteur, o) { const id = nouvelId(); oeuvres.set(id, { ...o, id, auteur, statut: 'visible', cree_le: ++t }); return id; },
    async retirer(a, id) { const o = oeuvres.get(id); if (!o || o.auteur !== a || o.statut === 'retiree') return false; o.statut = 'retiree'; o.contenu = ''; o.apercu = ''; for (const v of [...votes]) if (v.startsWith(id + '|')) votes.delete(v); return true; },
    async voter(c, id, oui) { const o = oeuvres.get(id); if (!o || o.statut !== 'visible') return 'introuvable'; if (o.auteur === c) return 'soi'; oui ? votes.add(id + '|' + c) : votes.delete(id + '|' + c); return votesDe(id); },
    async signaler(id, e, raison, mot) { const o = oeuvres.get(id); if (!o || o.statut !== 'visible') return false; if (!signal.has(id + '|' + e)) signal.set(id + '|' + e, { oeuvre: id, raison, mot }); return true; },
    async signalements() { const par = new Map(); for (const s of signal.values()) par.set(s.oeuvre, (par.get(s.oeuvre) || 0) + 1); return [...par].map(([oeuvre, n]) => ({ oeuvre, n })); },
    async masquer(id, oui) { const o = oeuvres.get(id); if (!o || o.statut !== (oui ? 'visible' : 'masquee')) return false; o.statut = oui ? 'masquee' : 'visible'; return true; },
  };
}
function rep() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
async function appel(depot, { method = 'GET', url = '/api/galerie', qui = null, body, origin = 'https://lemondeaime.com', quota = async () => ({ ok: true }) } = {}) {
  const res = rep(), headers = { host: 'lemondeaime.com', ...(method === 'POST' ? { origin, 'content-type': 'application/json' } : {}) };
  await traiter({ method, url, headers, body }, res, { depot, moi: async () => qui, admins: 'matt@exemple.fr', quota, ip: '203.0.113.7' });
  return { code: res.statusCode, j: JSON.parse(res.body || '{}'), brut: res.body, cache: res.headers['cache-control'] };
}
const POST = (body, qui, autres = {}) => ({ method: 'POST', body, qui, ...autres });

test('rien n’est exposé tant qu’on n’expose pas ; la liste publique se lit sans compte', async () => {
  const d = memoire();
  const r = await appel(d); assert.equal(r.code, 200); assert.deepEqual(r.j.oeuvres, []);
  assert.match(r.cache, /must-revalidate/);
});

test('exposer demande un compte et les deux cases cochées (jamais précochées)', async () => {
  const d = memoire();
  assert.equal((await appel(d, POST(expo(), null))).code, 401);
  for (const att of [{}, { auteur: true }, { public: true }, { auteur: 'oui', public: true }]) {
    const r = await appel(d, POST(expo({ attestations: att }), LISE)); assert.equal(r.code, 400); assert.match(r.j.raison, /Cochez les deux cases/);
  }
  assert.equal(d._oeuvres.size, 0);
  const ok = await appel(d, POST(expo(), LISE)); assert.equal(ok.code, 200); assert.match(ok.j.id, /^[a-z0-9]{12}$/);
});

test('un import tiers (PDF, OXS, usage personnel) ne peut pas être exposé', async () => {
  const d = memoire();
  for (const prov of [{ kind: 'pdf', personalOnly: false }, { kind: 'oxs', personalOnly: false }, { kind: 'image', personalOnly: true }, { kind: 'galerie', personalOnly: true }, { kind: 'demo', personalOnly: false }]) {
    const r = await appel(d, POST(expo({ contenu: motif({ provenance: prov }) }), LISE)); assert.equal(r.code, 422, JSON.stringify(prov));
  }
  assert.equal(d._oeuvres.size, 0);
  /* une rosace du moteur 5D (création originale, marquée « usage personnel » par le moteur) peut être exposée */
  assert.equal((await appel(d, POST(expo({ contenu: motif({ provenance: { kind: 'original', personalOnly: true } }) }), LISE))).code, 200);
});

test('la copie exposée ne garde que le motif : ni notes, ni photo, ni progression, ni stock, ni séances', async () => {
  const r = nettoyerExposition(expo());
  const copie = JSON.parse(r.oeuvre.contenu);
  for (const k of Object.keys(copie)) assert.ok(CHAMPS_MOTIF.includes(k), k);
  for (const k of ['notes', 'photo', 'sessions', 'stock', 'done', 'provenance']) assert.equal(k in copie, false, k);
  assert.equal(copie.name, 'Garance');
  assert.deepEqual(r.oeuvre.fils.sort(), ['310', '321']);
  assert.ok(nettoyerExposition(expo({ contenu: motif({ w: 600, h: 1, cross: new Array(600).fill(0) }) })).raison);
  assert.ok(nettoyerExposition(expo({ contenu: motif({ cross: [-1, -1, -1, -1, -1, -1] }) })).raison, 'un motif vide');
  assert.ok(nettoyerExposition(expo({ apercu: 'data:image/svg+xml;base64,PHN2Zz4=' })).raison, 'aperçu non PNG');
});

test('la réponse publique ne contient ni e-mail ni identifiant de compte ; autorisations toutes à faux', async () => {
  const d = memoire(); const { j: { id } } = await appel(d, POST(expo(), LISE));
  for (const r of [await appel(d), await appel(d, { url: '/api/galerie?id=' + id })]) {
    assert.equal(r.brut.includes('u-lise'), false); assert.equal(r.brut.includes('lise@exemple.fr'), false);
  }
  const f = (await appel(d, { url: '/api/galerie?id=' + id })).j.oeuvre;
  assert.equal(f.pseudo, 'Lise'); assert.deepEqual(f.autorisations, AUTORISATIONS); assert.ok(Object.values(f.autorisations).every(v => v === false));
  assert.deepEqual(f.realisations, []);
});

test('voter : une voix par compte, visible par tous, annulable, jamais pour soi', async () => {
  const d = memoire(); const { j: { id } } = await appel(d, POST(expo(), LISE));
  assert.equal((await appel(d, POST({ action: 'voter', id }, null))).code, 401);
  assert.equal((await appel(d, POST({ action: 'voter', id }, LISE))).code, 403);
  assert.equal((await appel(d, POST({ action: 'voter', id }, MARC))).j.votes, 1);
  assert.equal((await appel(d, POST({ action: 'voter', id }, MARC))).j.votes, 1, 'un second vote du même compte ne compte pas');
  assert.equal((await appel(d, POST({ action: 'voter', id }, MATT))).j.votes, 2);
  assert.equal((await appel(d)).j.oeuvres[0].votes, 2, 'visible sans compte');
  assert.equal((await appel(d, POST({ action: 'voter', id, oui: false }, MARC))).j.votes, 1);
});

test('retirer : seulement son œuvre ; elle disparaît, et ses votes avec elle', async () => {
  const d = memoire(); const { j: { id } } = await appel(d, POST(expo(), LISE));
  await appel(d, POST({ action: 'voter', id }, MARC));
  assert.equal((await appel(d, POST({ action: 'retirer', id }, MARC))).code, 404);
  assert.equal((await appel(d, POST({ action: 'retirer', id }, LISE))).code, 200);
  assert.deepEqual((await appel(d)).j.oeuvres, []);
  assert.equal((await appel(d, { url: '/api/galerie?id=' + id })).code, 404);
  assert.equal((await appel(d, { url: '/api/galerie?id=' + id + '&contenu=1' })).code, 404);
  assert.equal(d._votes.size, 0);
});

test('signaler : tout le monde, une fois ; masquer et démasquer : l’administration seulement', async () => {
  const d = memoire(); const { j: { id } } = await appel(d, POST(expo(), LISE));
  assert.equal((await appel(d, POST({ action: 'signaler', id, raison: 'droits', texte: 'copie d’un livre' }, null))).code, 200);
  assert.equal((await appel(d, POST({ action: 'signaler', id, raison: 'droits' }, null, { quota: async () => ({ ok: false }) }))).code, 429);
  assert.equal((await appel(d, { url: '/api/galerie?signalements=1', qui: MARC })).code, 403);
  assert.equal((await appel(d, { url: '/api/galerie?signalements=1', qui: MATT })).j.signalements[0].n, 1);
  assert.equal((await appel(d, POST({ action: 'masquer', id }, MARC))).code, 403);
  assert.equal((await appel(d, POST({ action: 'masquer', id, motif: 'droits' }, MATT))).code, 200);
  assert.deepEqual((await appel(d)).j.oeuvres, []);
  assert.equal((await appel(d, POST({ action: 'voter', id }, MARC))).code, 404, 'on ne vote pas pour une œuvre masquée');
  assert.equal((await appel(d, POST({ action: 'demasquer', id }, MATT))).code, 200);
  assert.equal((await appel(d)).j.oeuvres.length, 1);
});

test('« Ouvrir dans le Cadre » lit une copie ; rien n’est modifié côté auteur', async () => {
  const d = memoire(); const { j: { id } } = await appel(d, POST(expo(), LISE));
  const avant = JSON.stringify([...d._oeuvres.values()]);
  const c = await appel(d, { url: `/api/galerie?id=${id}&contenu=1` });
  assert.equal(c.code, 200); assert.equal(JSON.parse(c.j.contenu).name, 'Garance');
  assert.equal(JSON.stringify([...d._oeuvres.values()]), avant);
});

test('une requête d’un autre site est refusée ; l’identité ne vient jamais du corps', async () => {
  const d = memoire();
  assert.equal((await appel(d, POST(expo(), LISE, { origin: 'https://ailleurs.example' }))).code, 403);
  const api = lire('api/galerie.mjs');
  assert.ok(!/b\.(auteur|compte|user|email)\b/.test(api));
  assert.ok(lire('api/_auth/auth.mjs').includes('delete from oeuvres_exposees where auteur = $1'));
  assert.ok(!/certifi|authentifi/i.test(lire('api/_galerie.mjs') + api), 'jamais de « certification »');
});

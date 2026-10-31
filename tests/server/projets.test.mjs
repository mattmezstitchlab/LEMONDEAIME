// Le portfolio LE MONDE AIME : validation des projets, droit d'administration, et l'API (base simulée ici ; la vraie base : tests/base/projets.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { DEFAUTS, estAdmin, imageOk, lienOk, nettoyerProjet, publics, slugDe } from '../../api/_projets.mjs';
import { traiter } from '../../api/projets.mjs';
import { graines } from '../../db/projets-graines.mjs';

const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const BASE = { titre: 'Mon projet', annee: 2026, statut: 'en-cours', categorie: 'Site', lien: '/studio/atelier', couverture: '/media/studio/fils.jpg', galerie: [], publie: true };

test('projets : l’administration est fermée sans AIME_ADMIN, et ne reconnaît que les adresses listées', () => {
  assert.equal(estAdmin('matt@exemple.fr', ''), false);
  assert.equal(estAdmin('matt@exemple.fr', undefined), false);
  assert.equal(estAdmin('', 'matt@exemple.fr'), false);
  assert.equal(estAdmin('Matt@Exemple.fr', ' autre@x.fr , matt@exemple.fr '), true);
  assert.equal(estAdmin('matt@exemple.fr.pirate', 'matt@exemple.fr'), false);
});

test('projets : un projet est validé avant tout enregistrement', () => {
  assert.equal(nettoyerProjet({ ...BASE, titre: '  ' }).erreur, 'Donnez un titre au projet.');
  assert.match(nettoyerProjet({ ...BASE, slug: 'Pas Bon' }).erreur, /minuscules/);
  assert.match(nettoyerProjet({ ...BASE, annee: 1800 }).erreur, /année/);
  assert.match(nettoyerProjet({ ...BASE, statut: 'secret' }).erreur, /état/);
  assert.match(nettoyerProjet({ ...BASE, lien: 'javascript:alert(1)' }).erreur, /lien/i);
  assert.match(nettoyerProjet({ ...BASE, lien: 'http://exemple.fr' }).erreur, /lien/i);
  assert.match(nettoyerProjet({ ...BASE, couverture: 'https://ailleurs.fr/x.jpg' }).erreur, /couverture/);
  assert.match(nettoyerProjet({ ...BASE, galerie: [{ src: '/media/../secret.jpg', alt: '' }] }).erreur, /galerie/);
  assert.match(nettoyerProjet({ ...BASE, galerie: Array.from({ length: 13 }, () => ({ src: '/media/a.jpg', alt: '' })) }).erreur, /12 images/);
  const { projet } = nettoyerProjet({ ...BASE, titre: 'Été <b>2026</b>\u0000', description: 'Un.\r\n\r\n\r\n\r\nDeux.', publie: 'oui', une: 1, inconnu: 'x' });
  assert.equal(projet.slug, 'ete-b-2026-b');
  assert.equal(projet.description, 'Un.\n\nDeux.');
  assert.equal(projet.publie, false, 'publié seulement si true');
  assert.equal(projet.une, false);
  assert.ok(!('inconnu' in projet));
  assert.equal(slugDe('AIME Wedding — Été'), 'aime-wedding-ete');
  assert.ok(imageOk('https://abc.public.blob.vercel-storage.com/projets/x/a.jpg'));
  assert.ok(!imageOk('https://abc.public.blob.vercel-storage.com/musique/x/a.jpg'), 'seulement le dossier des projets');
  assert.ok(lienOk('/aime-wedding') && lienOk('https://brodeway.fr') && !lienOk('//ailleurs.fr'));
});

test('projets : les deux projets d’origine sont valides, Brode Way à la une, et la migration les inscrit à l’identique', () => {
  assert.deepEqual(DEFAUTS.map(p => p.slug), ['brode-way', 'aime-wedding']);
  for (const p of DEFAUTS) assert.ok(nettoyerProjet(p).projet, p.slug);
  for (const p of DEFAUTS) for (const src of [p.couverture, ...p.galerie.map(g => g.src)]) assert.ok(existsSync(new URL('../../public' + src, import.meta.url)), 'image présente : ' + src);
  assert.deepEqual(publics(DEFAUTS).map(p => p.slug), ['brode-way', 'aime-wedding']);
  const m = lire('db/migrations/2026-10-28-02-projets.sql');
  assert.ok(m.includes(graines()), 'les graines de la migration = DEFAUTS (node db/projets-graines.mjs)');
  assert.match(m, /create table if not exists projets/);
  assert.match(lire('db/migrations/2026-10-28-02-projets.retour.sql'), /drop table if exists projets/);
});

/* une base simulée : une table « projets » en mémoire, et les requêtes que l'API envoie */
function base(lignes, { absente = false } = {}) {
  const t = new Map(lignes.map(p => { const { slug, publie, ordre, ...data } = p; return [slug, { slug, data, publie, ordre, maj: 'x' }]; }));
  const q = async (sql, v = []) => {
    if (absente && /projets/.test(sql)) { const e = new Error('relation "projets" does not exist'); e.code = '42P01'; throw e; }
    if (/^(begin|commit|rollback)$/.test(sql)) return { rows: [] };
    if (/^select slug, data, publie, ordre, maj from projets/.test(sql)) return { rows: [...t.values()].sort((a, b) => a.ordre - b.ordre) };
    if (/^select 1 from projets where slug/.test(sql)) return { rowCount: t.has(v[0]) ? 1 : 0, rows: [] };
    if (/^select count\(\*\)::int as n from projets/.test(sql)) return { rows: [{ n: t.size }] };
    if (/^delete from projets where slug/.test(sql)) { const n = t.delete(v[0]) ? 1 : 0; return { rowCount: n, rows: [] }; }
    if (/^update projets set data = data \|\| '\{"une":false\}'/.test(sql)) { for (const r of t.values()) if (r.slug !== v[0]) r.data = { ...r.data, une: false }; return { rows: [] }; }
    if (/^insert into projets/.test(sql)) { t.set(v[0], { slug: v[0], data: JSON.parse(v[1]), publie: v[2], ordre: v[3], maj: 'x' }); return { rows: [] }; }
    if (/^update projets p set ordre/.test(sql)) { v[0].forEach((s, k) => { if (t.has(s)) t.get(s).ordre = k + 1; }); return { rows: [] }; }
    throw new Error('requête inattendue : ' + sql);
  };
  return { t, query: q, connect: async () => ({ query: q, release() {} }) };
}
function rep() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
const MATT = { id: 'u1', email: 'matt@exemple.fr' }, AUTRE = { id: 'u2', email: 'autre@exemple.fr' };
async function appel(db, { method = 'GET', url = '/api/projets', qui = null, body, admins = 'matt@exemple.fr' } = {}) {
  const res = rep();
  const headers = { host: 'lemondeaime.com', ...(method === 'POST' ? { origin: 'https://lemondeaime.com', 'content-type': 'application/json' } : {}) };
  await traiter({ method, url, headers, body }, res, { db, moi: async () => qui, admins, envoi: async () => ({ ok: true }) });
  return { code: res.statusCode, j: JSON.parse(res.body || '{}'), cache: res.headers['cache-control'] };
}

test('projets · API : le public ne voit que les projets publiés ; sans table, les projets d’origine', async () => {
  const db = base([...DEFAUTS, { ...DEFAUTS[0], slug: 'brouillon', titre: 'Brouillon', publie: false, ordre: 3 }]);
  let r = await appel(db);
  assert.deepEqual(r.j.projets.map(p => p.slug), ['brode-way', 'aime-wedding']);
  assert.match(r.cache, /s-maxage/);
  assert.equal((await appel(db, { url: '/api/projets?slug=brouillon' })).code, 404, 'un brouillon n’est pas public');
  assert.equal((await appel(db, { url: '/api/projets?slug=brouillon', qui: AUTRE })).code, 404);
  assert.equal((await appel(db, { url: '/api/projets?slug=brouillon', qui: MATT })).code, 200, 'l’administration voit ses brouillons');
  r = await appel(base([], { absente: true }));
  assert.deepEqual(r.j.projets.map(p => p.slug), ['brode-way', 'aime-wedding']);
  r = await appel(null);
  assert.equal(r.j.projets.length, 2, 'sans base : les projets d’origine');
});

test('projets · API : seule l’administration écrit ; un autre compte, ou personne, est refusé et rien ne change', async () => {
  const db = base(DEFAUTS);
  const nouveau = { action: 'enregistrer', projet: { ...BASE, titre: 'Atelier X' } };
  assert.equal((await appel(db, { method: 'POST', body: nouveau })).code, 401);
  assert.equal((await appel(db, { method: 'POST', body: nouveau, qui: AUTRE })).code, 403);
  assert.equal((await appel(db, { method: 'POST', body: nouveau, qui: MATT, admins: '' })).code, 403, 'sans AIME_ADMIN : fermé');
  assert.equal((await appel(db, { url: '/api/projets?admin=1', qui: AUTRE })).code, 403);
  assert.equal((await appel(db, { url: '/api/projets?moi=1', qui: AUTRE })).j.admin, false);
  assert.equal((await appel(db, { url: '/api/projets?moi=1', qui: MATT })).j.admin, true);
  assert.equal(db.t.size, 2);
  /* une requête d'un autre site est refusée avant tout (garde commune) */
  const res = rep();
  await traiter({ method: 'POST', url: '/api/projets', headers: { host: 'lemondeaime.com', origin: 'https://pirate.fr', 'content-type': 'application/json' }, body: nouveau }, res, { db, moi: async () => MATT, admins: 'matt@exemple.fr', envoi: async () => ({}) });
  assert.equal(res.statusCode, 403);
  assert.equal(db.t.size, 2);
});

test('projets · API : créer, renommer, mettre à la une, ordonner, supprimer', async () => {
  const db = base(DEFAUTS);
  let r = await appel(db, { method: 'POST', qui: MATT, body: { action: 'enregistrer', projet: { ...BASE, titre: 'Atelier X', une: true, ordre: 3 } } });
  assert.equal(r.code, 200); assert.equal(r.j.slug, 'atelier-x');
  assert.equal(db.t.get('brode-way').data.une, false, 'un seul projet à la une');
  assert.equal(db.t.get('atelier-x').data.une, true);
  r = await appel(db, { method: 'POST', qui: MATT, body: { action: 'enregistrer', projet: { ...BASE, titre: 'Brode Way' } } });
  assert.equal(r.code, 409, 'une adresse déjà prise n’écrase pas un autre projet');
  assert.equal(db.t.get('brode-way').data.titre, 'Brode Way');
  r = await appel(db, { method: 'POST', qui: MATT, body: { action: 'enregistrer', ancien: 'atelier-x', projet: { ...BASE, slug: 'atelier-y', titre: 'Atelier Y' } } });
  assert.equal(r.code, 200); assert.ok(!db.t.has('atelier-x') && db.t.has('atelier-y'), 'renommer déplace le projet');
  r = await appel(db, { method: 'POST', qui: MATT, body: { action: 'enregistrer', projet: { ...BASE, titre: '' } } });
  assert.equal(r.code, 400);
  r = await appel(db, { method: 'POST', qui: MATT, body: { action: 'ordre', slugs: ['atelier-y', 'aime-wedding', 'brode-way'] } });
  assert.equal(r.code, 200);
  assert.deepEqual((await appel(db)).j.projets.map(p => p.slug), ['atelier-y', 'aime-wedding', 'brode-way']);
  assert.equal((await appel(db, { method: 'POST', qui: MATT, body: { action: 'ordre', slugs: ['a', 'a'] } })).code, 400);
  r = await appel(db, { method: 'POST', qui: MATT, body: { action: 'supprimer', slug: 'atelier-y' } });
  assert.equal(r.code, 200); assert.ok(!db.t.has('atelier-y'));
  assert.equal((await appel(db, { method: 'POST', qui: MATT, body: { action: 'supprimer', slug: 'atelier-y' } })).code, 404);
});

test('projets · API : sans la table, l’administration le dit (503) et n’écrit rien ; l’envoi d’images est réservé et fermé sans stockage', async () => {
  const r = await appel(base([], { absente: true }), { method: 'POST', qui: MATT, body: { action: 'enregistrer', projet: BASE } });
  assert.equal(r.code, 503); assert.equal(r.j.code, 'migration');
  assert.equal((await appel(base(DEFAUTS), { method: 'POST', url: '/api/projets?envoi=1', qui: AUTRE, body: {} })).code, 403);
  const avant = process.env.BLOB_READ_WRITE_TOKEN; delete process.env.BLOB_READ_WRITE_TOKEN;
  try { assert.equal((await appel(base(DEFAUTS), { method: 'POST', url: '/api/projets?envoi=1', qui: MATT, body: {} })).code, 503); }
  finally { if (avant !== undefined) process.env.BLOB_READ_WRITE_TOKEN = avant; }
});

test('projets : l’accueil est Le Monde AIME (les projets), aussi sur /projets ; AIME Wedding a sa propre adresse, l’administration est une page', () => {
  const a = lire('src/App.tsx');
  /* décision de Matt (31/10/2026) : lemondeaime.com s'ouvre sur Le Monde AIME ; ni le film ni Explorer ne sont publics */
  /* phase 01 (branche de dev, à valider par Matt) : « / » est la première page Accueil ; la décision du 31/10 (accueil = projets) est suspendue */
  assert.match(a, /'\/': \[Accueil,/, 'l’accueil est la première page');
  assert.ok(!/window\.location\.replace\(STUDIO\)/.test(a), 'l’accueil ne renvoie plus au studio');
  const red = JSON.parse(lire('vercel.json')).redirects;
  assert.ok(!red.some(r => r.source === '/'), 'le serveur ne redirige pas l’accueil');
  assert.ok(!red.some(r => /lumiere|explorer|galerie|accueil/.test(r.destination)), 'aucune adresse courte vers ce qui n’est pas public');
  assert.match(a, /'\/projets': \[Portfolio,/, 'le portfolio reste sur /projets');
  assert.match(a, /'\/aime-wedding': \[AimeWedding,/);
  assert.match(a, /'\/admin': \[Admin,/);
  assert.match(a, /\/\^\\\/projets\\\/\(\[a-z0-9-\]\{1,60\}\)\$\//);
  assert.ok(!/'\/aime-wedding': '\/'/.test(a), 'l’ancienne redirection vers l’accueil est retirée');
});

test('projets : d’autres liens à côté de « Visiter le site » (la Chronologie d’ATLAS), libellés et adresses vérifiés', async () => {
  const { nettoyerProjet: n } = await import('../../api/_projets.mjs');
  const base = { titre: 'ATLAS', annee: 2026, statut: 'en-ligne', lien: 'https://atlas.lemondeaime.com' };
  const ok = n({ ...base, liens: [{ libelle: 'La Chronologie', href: 'https://atlas.lemondeaime.com/chronologie' }] });
  assert.deepEqual(ok.projet.liens, [{ libelle: 'La Chronologie', href: 'https://atlas.lemondeaime.com/chronologie' }]);
  assert.deepEqual(n(base).projet.liens, [], 'sans autres liens : une liste vide');
  assert.ok(n({ ...base, liens: [{ libelle: 'x', href: 'javascript:alert(1)' }] }).erreur, 'une adresse dangereuse est refusée');
  assert.ok(n({ ...base, liens: [{ libelle: '', href: '/projets' }] }).erreur, 'un lien sans libellé est refusé');
  assert.ok(n({ ...base, liens: Array(4).fill({ libelle: 'a', href: '/projets' }) }).erreur, 'trois au plus');
});

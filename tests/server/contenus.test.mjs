// Le Bureau éditorial, phase 2 : l'API des contenus (dépôt en mémoire ici, même contrat que depotPg ; la vraie base : tests/base/contenus.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { traiter } from '../../api/contenus.mjs';
import { blobOk, nettoyerMedia, ORIGINE, validerPage } from '../../api/_contenus.mjs';

const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const copie = o => JSON.parse(JSON.stringify(o));

/* un dépôt en mémoire, fidèle aux règles de la base : versions jamais modifiées, une seule publiée par page */
function memoire() {
  const v = [], j = [], m = []; let n = 0;
  const archiver = page => v.forEach(x => { if (x.page === page && x.etat === 'publie') x.etat = 'archive'; });
  return { v, j, m,
    async publie(page) { const x = v.find(y => y.page === page && y.etat === 'publie'); return x ? { id: x.id, data: copie(x.data), publie_le: x.publie_le } : null; },
    async versions(page) { return v.filter(x => x.page === page).reverse().map(({ data, ...meta }) => meta); },
    async version(page, id) { const x = v.find(y => y.page === page && y.id === id); return x ? copie(x) : null; },
    async enregistrer(page, data, note, auteur) { const id = String(++n); v.push({ id, page, data: copie(data), etat: 'brouillon', note, auteur, publie_le: null, restaure_de: null }); j.push({ action: 'enregistrer', id, auteur }); return id; },
    async publier(page, id, auteur, valide) { const x = v.find(y => y.page === page && y.id === id); if (!x) return { erreur: 'introuvable' }; if (!valide(x.data)) return { erreur: 'invalide' };
      archiver(page); x.etat = 'publie'; x.publie_le = 't' + n; j.push({ action: 'publier', id, auteur }); return { id }; },
    async restaurer(page, id, auteur, valide) { const x = v.find(y => y.page === page && y.id === id); if (!x) return { erreur: 'introuvable' }; if (!valide(x.data)) return { erreur: 'invalide' };
      archiver(page); const nid = String(++n); v.push({ id: nid, page, data: copie(x.data), etat: 'publie', note: 'Restauration de la version ' + id, auteur, publie_le: 't' + n, restaure_de: id }); j.push({ action: 'restaurer', id: nid, auteur }); return { id: nid }; },
    async ajouterMedia(media, auteur) { if (m.some(x => x.url === media.url)) return { erreur: 'doublon' }; if (media.parent_id && !m.some(x => x.id === String(media.parent_id))) return { erreur: 'parent' };
      const id = String(m.length + 1); m.push({ id, ...media, auteur }); return { id }; },
    async medias() { return copie(m); },
  };
}
function rep() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || ''; } }; }
const MATT = { id: 'u1', email: 'matt@exemple.fr' }, AUTRE = { id: 'u2', email: 'autre@exemple.fr' };
async function appel(depot, { method = 'GET', url = '/api/contenus', qui = null, body, admins = 'matt@exemple.fr', origin = 'https://lemondeaime.com', envoi } = {}) {
  const res = rep();
  const headers = { host: 'lemondeaime.com', ...(method === 'POST' ? { origin, 'content-type': 'application/json' } : {}) };
  await traiter({ method, url, headers, body }, res, { depot, moi: async () => qui, admins, envoi: envoi || (async () => ({ ok: true })) });
  return { code: res.statusCode, j: JSON.parse(res.body || '{}'), cache: res.headers['cache-control'] };
}
const modifie = titre => { const c = copie(ORIGINE); c.histoire.origine.titre = titre; return c; };

test('contenus : la migration est un ajout pur, réversible, et la base porte les mêmes garde-fous que l’API', () => {
  const m = lire('db/migrations/2026-10-29-01-contenus.sql'), r = lire('db/migrations/2026-10-29-01-contenus.retour.sql');
  for (const t of ['contenus_versions', 'contenus_journal', 'medias']) { assert.match(m, new RegExp('create table if not exists ' + t)); assert.match(r, new RegExp('drop table if exists ' + t)); }
  assert.doesNotMatch(m, /\b(alter|drop|delete|update|truncate)\b/i, 'aucune table existante n’est touchée');
  assert.match(m, /unique index if not exists contenus_un_publie on contenus_versions \(page\) where etat = 'publie'/);
  assert.match(m, /not reconstitution or legende ~\* 'reconstitution'/);
});

test('contenus : sans base ni publication, le public reçoit null et garde les textes d’origine', async () => {
  let r = await appel(null); assert.equal(r.code, 200); assert.equal(r.j.contenus, null); assert.match(r.cache, /must-revalidate/); assert.doesNotMatch(r.cache, /stale-while-revalidate/, 'une publication ne doit jamais être masquée par une réponse périmée');
  r = await appel(memoire()); assert.equal(r.j.contenus, null);
  const absente = { publie: async () => { const e = new Error('relation "contenus_versions" does not exist'); e.code = '42P01'; throw e; } };
  r = await appel(absente); assert.equal(r.code, 200); assert.equal(r.j.contenus, null);
  assert.equal((await appel(absente, { url: '/api/contenus?admin=1', qui: MATT })).code, 503);
  assert.equal((await appel(null, { url: '/api/contenus?page=autre' })).code, 400, 'une page inconnue');
});

test('contenus : refus par défaut ; seule l’adresse AIME_ADMIN, vérifiée sur la session, écrit ou lit les brouillons', async () => {
  const d = memoire(), body = { action: 'enregistrer', contenus: modifie('Rouge & bleu') };
  assert.equal((await appel(d, { method: 'POST', body })).code, 401);
  assert.equal((await appel(d, { method: 'POST', body, qui: AUTRE })).code, 403);
  assert.equal((await appel(d, { method: 'POST', body, qui: MATT, admins: '' })).code, 403, 'sans AIME_ADMIN : fermé');
  assert.equal((await appel(d, { method: 'POST', body: { ...body, email: 'matt@exemple.fr' }, qui: AUTRE })).code, 403, 'jamais sur le corps');
  assert.equal((await appel(d, { method: 'POST', body, qui: MATT, origin: 'https://pirate.fr' })).code, 403, 'requête d’un autre site');
  for (const u of ['?admin=1', '?version=1', '?medias=1']) assert.equal((await appel(d, { url: '/api/contenus' + u, qui: AUTRE })).code, 403, u);
  assert.equal((await appel(d, { url: '/api/contenus?moi=1', qui: AUTRE })).j.admin, false);
  assert.equal((await appel(d, { url: '/api/contenus?moi=1', qui: MATT })).j.admin, true);
  assert.equal(d.v.length, 0, 'rien n’a été écrit');
});

test('contenus : la preuve du Bureau — modifier un titre et une image, prévisualiser, publier, puis restaurer, sans rien perdre', async () => {
  const d = memoire();
  /* 1. enregistrer : un brouillon, pas encore public */
  const c1 = modifie('Rouge & bleu');
  c1.histoire.origine.media = { ...c1.histoire.origine.media, src: 'https://abc.public.blob.vercel-storage.com/contenus/garance.webp', alt: 'Racines de garance', legende: 'Photographie de l’atelier.', licence: 'autorise', reconstitution: false, provenance: 'Atelier Point Zéro' };
  let r = await appel(d, { method: 'POST', qui: MATT, body: { action: 'enregistrer', contenus: c1, note: 'Nouveau titre' } });
  assert.equal(r.code, 200); const v1 = r.j.id;
  assert.equal((await appel(d)).j.contenus, null, 'un brouillon n’est jamais public');
  /* 2. prévisualiser */
  r = await appel(d, { url: '/api/contenus?version=' + v1, qui: MATT });
  assert.equal(r.j.contenus.histoire.origine.titre, 'Rouge & bleu'); assert.deepEqual(r.j.ecarts, []);
  assert.match(r.j.contenus.histoire.origine.media.src, /contenus\/garance\.webp$/);
  /* 3. publier */
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'publier', id: v1 } })).code, 200);
  r = await appel(d); assert.equal(r.j.contenus.histoire.origine.titre, 'Rouge & bleu'); assert.equal(r.j.version, v1);
  /* une seconde version publiée archive la première */
  const v2 = (await appel(d, { method: 'POST', qui: MATT, body: { action: 'enregistrer', contenus: modifie('Indigo & garance') } })).j.id;
  await appel(d, { method: 'POST', qui: MATT, body: { action: 'publier', id: v2 } });
  assert.equal((await appel(d)).j.contenus.histoire.origine.titre, 'Indigo & garance');
  assert.equal(d.v.filter(x => x.etat === 'publie').length, 1);
  /* 4. restaurer la version 1 : une nouvelle version publiée, copie exacte ; aucune version n'a disparu ni changé */
  r = await appel(d, { method: 'POST', qui: MATT, body: { action: 'restaurer', id: v1 } });
  assert.equal(r.code, 200);
  const pub = (await appel(d)).j; assert.equal(pub.contenus.histoire.origine.titre, 'Rouge & bleu'); assert.equal(pub.version, r.j.id);
  assert.equal(d.v.length, 3); assert.deepEqual(d.v.map(x => x.etat), ['archive', 'archive', 'publie']);
  assert.deepEqual(d.v[2].data, d.v[0].data); assert.equal(d.v[2].restaure_de, v1);
  assert.deepEqual(d.j.map(x => x.action), ['enregistrer', 'publier', 'enregistrer', 'publier', 'restaurer']);
  const h = await appel(d, { url: '/api/contenus?admin=1', qui: MATT });
  assert.equal(h.j.publie.id, r.j.id); assert.equal(h.j.versions.length, 3); assert.ok(!('data' in h.j.versions[0]), 'l’historique ne renvoie pas les contenus');
});

test('contenus : rien d’invalide n’est enregistré ni publié ; la lecture publique revalide', async () => {
  const d = memoire();
  const c = modifie('<script>x</script>'); c.inconnu = 1;
  let r = await appel(d, { method: 'POST', qui: MATT, body: { action: 'enregistrer', contenus: c } });
  assert.equal(r.code, 422); assert.ok(r.j.ecarts.some(e => e.chemin === 'histoire.origine.titre')); assert.ok(r.j.ecarts.some(e => e.chemin === 'inconnu'));
  assert.equal(d.v.length, 0);
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'enregistrer' } })).code, 400);
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'publier', id: '99' } })).code, 404);
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'publier', id: '1 or 1=1' } })).code, 400);
  /* une version abîmée dans la base (écrite à la main) n'est ni publiée, ni servie telle quelle */
  d.v.push({ id: '50', page: 'edition', data: modifie('<b>x</b>'), etat: 'brouillon', note: '', auteur: 'x', publie_le: null, restaure_de: null });
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'publier', id: '50' } })).code, 422);
  d.v[0].etat = 'publie';
  assert.equal((await appel(d)).j.contenus.histoire.origine.titre, ORIGINE.histoire.origine.titre, 'servi : le texte d’origine à la place du champ abîmé');
});

test('contenus : la médiathèque — images 8 Mo, vidéos 100 Mo, affiches et versions mobiles rattachées, licence et provenance obligatoires', async () => {
  const U = 'https://abc.public.blob.vercel-storage.com/contenus/';
  const img = { url: U + 'a.webp', mime: 'image/webp', poids: 1000, alt: 'Une fleur', legende: 'Photographie.', licence: 'autorise', provenance: 'Atelier' };
  assert.ok(nettoyerMedia(img).media);
  assert.match(nettoyerMedia({ ...img, url: 'https://ailleurs.fr/a.webp' }).erreur, /contenus/);
  assert.match(nettoyerMedia({ ...img, url: 'https://abc.public.blob.vercel-storage.com/projets/a.webp' }).erreur, /contenus/);
  assert.match(nettoyerMedia({ ...img, mime: 'image/svg+xml' }).erreur, /Format/);
  assert.match(nettoyerMedia({ ...img, poids: 9 * 1024 * 1024 }).erreur, /8 Mo/);
  assert.match(nettoyerMedia({ ...img, alt: '' }).erreur, /alternatif/);
  assert.match(nettoyerMedia({ ...img, provenance: '' }).erreur, /provenance/);
  assert.match(nettoyerMedia({ ...img, licence: 'reconstitution' }).erreur, /annoncée/);
  assert.equal(nettoyerMedia({ ...img, licence: 'reconstitution', legende: 'Reconstitution générée.' }).media.reconstitution, true);
  const video = { url: U + 'v.mp4', mime: 'video/mp4', poids: 90 * 1024 * 1024, legende: 'Atelier.', licence: 'capture' };
  assert.equal(nettoyerMedia(video).media.genre, 'video');
  assert.match(nettoyerMedia({ ...video, poids: 101 * 1024 * 1024 }).erreur, /100 Mo/);
  assert.match(nettoyerMedia({ ...img, url: U + 'aff.webp', role: 'affiche' }).erreur, /rattache/);
  const d = memoire();
  assert.equal((await appel(d, { method: 'POST', qui: AUTRE, body: { action: 'media', media: img } })).code, 403);
  const idv = (await appel(d, { method: 'POST', qui: MATT, body: { action: 'media', media: video } })).j.id;
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'media', media: { ...img, url: U + 'aff.webp', role: 'affiche', parent_id: Number(idv) } } })).code, 200);
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'media', media: { ...video, url: U + 'v-mobile.mp4', role: 'mobile', parent_id: Number(idv), poids: 8e6 } } })).code, 200);
  assert.equal((await appel(d, { method: 'POST', qui: MATT, body: { action: 'media', media: video } })).code, 409);
  const l = (await appel(d, { url: '/api/contenus?medias=1', qui: MATT })).j.medias;
  assert.deepEqual(l.map(x => [x.genre, x.role]), [['video', 'principal'], ['affiche', 'affiche'], ['video', 'mobile']]);
  assert.ok(blobOk(U + 'x/y.webp') && !blobOk(U + '../x.webp'));
});

test('contenus : l’envoi vers le stockage est réservé, fermé sans stockage, limité au dossier « contenus/ » et aux formats admis', async () => {
  assert.equal((await appel(memoire(), { method: 'POST', url: '/api/contenus?envoi=1', body: {} })).code, 401);
  assert.equal((await appel(memoire(), { method: 'POST', url: '/api/contenus?envoi=1', qui: AUTRE, body: {} })).code, 403);
  const avant = process.env.BLOB_READ_WRITE_TOKEN;
  try {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    assert.equal((await appel(memoire(), { method: 'POST', url: '/api/contenus?envoi=1', qui: MATT, body: {} })).code, 503);
    process.env.BLOB_READ_WRITE_TOKEN = 'faux-pour-le-test';
    let regle;
    const envoi = async ({ onBeforeGenerateToken }) => { regle = await onBeforeGenerateToken('contenus/garance.webp'); await assert.rejects(onBeforeGenerateToken('projets/x.webp')); await assert.rejects(onBeforeGenerateToken('contenus/../x.webp')); return { ok: true }; };
    assert.equal((await appel(memoire(), { method: 'POST', url: '/api/contenus?envoi=1', qui: MATT, body: {}, envoi })).code, 200);
    assert.deepEqual(regle.allowedContentTypes.sort(), ['image/avif', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']);
    assert.equal(regle.maximumSizeInBytes, 100 * 1024 * 1024);
  } finally { if (avant === undefined) delete process.env.BLOB_READ_WRITE_TOKEN; else process.env.BLOB_READ_WRITE_TOKEN = avant; }
});

test('contenus : la validation est la même que celle du studio (un seul module)', () => {
  assert.deepEqual(validerPage('edition', undefined), { contenus: ORIGINE, ecarts: [] });
  assert.match(lire('studio/src/components/edition/contenus.ts'), /from "\.\/validation\.mjs"/);
  assert.match(lire('api/_contenus.mjs'), /from '\.\.\/studio\/src\/components\/edition\/validation\.mjs'/);
});

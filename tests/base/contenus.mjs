/* Le Bureau éditorial (phase 2) sur une VRAIE base : la branche Neon de test isolée, jamais la production.
   La migration 2026-10-29-01 (versions, journal, médias), l'API /api/contenus avec de vrais comptes (vrai Better Auth,
   vrai lien de connexion) : seule l'administration (AIME_ADMIN) écrit ; le public ne lit que la version publiée.
   La preuve : modifier un titre et une image, prévisualiser, publier, restaurer — sans rien perdre.
   Usage : BASE_TEST_URL=<branche Neon de test, jamais committée> [NEON_WS_MODULES=…] node tests/base/contenus.mjs
   Garde-fou : refuse toute base sans la table aime_base_de_test. Les comptes, versions et médias de test sont effacés à la fin ;
   les tables restent (migration appliquée), vides de tout essai. */
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { brancher } from './connexion.mjs';

const URL_BASE = process.env.BASE_TEST_URL;
if (!URL_BASE) { console.error('BASE_TEST_URL manquant : ce test ne tourne que sur une branche Neon de test.'); process.exit(2); }
await brancher();
/* pg ne connaît pas channel_binding : on le retire, où qu'il soit (même logique que db/appliquer.mjs) */
const sansChannelBinding = u => u.replace(/([?&])channel_binding=[^&]*&?/, '$1').replace(/[?&]$/, '');
const db = new pg.Client({ connectionString: sansChannelBinding(URL_BASE), ssl: { rejectUnauthorized: true } });
await db.connect();
if (!(await db.query("select to_regclass('public.aime_base_de_test') as t")).rows[0].t) { console.error('Refus : cette base n’est pas marquée comme base de test.'); process.exit(3); }

const jeton = randomBytes(4).toString('hex');
const O = 'http://localhost:8774';
const ADMIN = 'admin-' + jeton + '@test.lemondeaime.invalid';
Object.assign(process.env, { DATABASE_URL: sansChannelBinding(URL_BASE), BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: O, AIME_ADMIN: ADMIN });
const A = await import('../../api/_auth/auth.mjs');
const contenus = (await import('../../api/contenus.mjs')).default;
const { ORIGINE } = await import('../../api/_contenus.mjs');

const resultats = [];
const ok = (c, test) => { console.log((c ? 'OK ' : 'ÉCHEC ') + test); resultats.push({ test, ok: !!c }); };
const comptes = [];
let dernier = null; A._envoyeur(async m => { dernier = m; });
async function compte(email) {
  const a = A.auth(), ip = '10.4.0.' + (1 + comptes.length);
  dernier = null;
  await a.api.signInMagicLink({ body: { email, callbackURL: '/studio/' }, headers: new Headers({ origin: O, 'x-forwarded-for': ip }) });
  const t = /\/lien\/([A-Za-z0-9_-]+)\//.exec(dernier?.text || '')?.[1];
  const r = await a.handler(new Request(O + '/api/auth/magic-link/verify?token=' + t + '&callbackURL=%2Fstudio%2F', { headers: { origin: O, 'x-forwarded-for': ip } }));
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const moi = await A.personne({ headers: { cookie } });
  if (!moi) throw new Error('session non ouverte');
  const c = { cookie, id: moi.id, email, ip }; comptes.push(c); return c;
}
function reponse() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || this.body; } }; }
async function appel({ method = 'GET', url = '/api/contenus', qui, body } = {}) {
  const res = reponse();
  const headers = { host: 'localhost:8774', ...(qui ? { cookie: qui.cookie, 'x-forwarded-for': qui.ip } : {}), ...(method === 'POST' ? { origin: O, 'content-type': 'application/json' } : {}) };
  await contenus({ method, url, headers, body }, res);
  let j = {}; try { j = JSON.parse(res.body || '{}'); } catch { /* pas du JSON */ }
  return { code: res.statusCode, j };
}
const copie = o => JSON.parse(JSON.stringify(o));
const MIG = 'db/migrations/2026-10-29-01-contenus.sql', RET = 'db/migrations/2026-10-29-01-contenus.retour.sql';
const sql = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const U = 'https://abc' + jeton + '.public.blob.vercel-storage.com/contenus/';

try {
  /* ——— la migration ——— */
  if ((await db.query("select to_regclass('public.contenus_versions') as t")).rows[0].t) {
    const n = (await db.query('select count(*)::int as n from contenus_versions')).rows[0].n;
    if (n) throw new Error('la branche de test contient déjà ' + n + ' versions : test arrêté pour ne rien écraser');
  }
  await db.query(sql(RET));
  ok(!(await db.query("select to_regclass('public.contenus_versions') as t")).rows[0].t, 'migration : le retour arrière retire les tables');
  const admin = await compte(ADMIN), autre = await compte('autre-' + jeton + '@test.lemondeaime.invalid');
  ok(admin.id && autre.id, 'base : deux comptes de test, connectés par le vrai lien de connexion');
  let r = await appel();
  ok(r.code === 200 && r.j.contenus === null, 'sans les tables : le public reçoit null (le studio garde ses textes d’origine)');
  r = await appel({ url: '/api/contenus?admin=1', qui: admin });
  ok(r.code === 503 && r.j.code === 'migration', 'sans les tables : l’administration répond qu’il faut la migration (503)');
  await db.query(sql(MIG)); await db.query(sql(MIG));
  ok(!!(await db.query("select to_regclass('public.medias') as t")).rows[0].t, 'migration appliquée deux fois sans erreur');

  /* ——— les droits, sur de vraies sessions ——— */
  const [m1, m2, m3] = await Promise.all([appel({ url: '/api/contenus?moi=1', qui: admin }), appel({ url: '/api/contenus?moi=1', qui: autre }), appel({ url: '/api/contenus?moi=1' })]);
  ok(m1.j.admin === true && m2.j.admin === false && m3.j.admin === false, 'droits : seule l’adresse de AIME_ADMIN administre');
  const c1 = copie(ORIGINE); c1.histoire.origine.titre = 'Rouge & bleu ' + jeton;
  c1.histoire.origine.media = { ...c1.histoire.origine.media, src: U + 'garance.webp', alt: 'Racines de garance', legende: 'Photographie d’essai.', licence: 'autorise', reconstitution: false, provenance: 'Essai ' + jeton };
  const ra = await appel({ method: 'POST', qui: autre, body: { action: 'enregistrer', contenus: c1 } }), rb = await appel({ method: 'POST', body: { action: 'enregistrer', contenus: c1 } });
  ok(ra.code === 403 && rb.code === 401 && (await db.query('select count(*)::int as n from contenus_versions')).rows[0].n === 0, 'droits : un autre compte (403) ou personne (401) n’écrit rien');

  /* ——— la preuve du Bureau ——— */
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', contenus: c1, note: 'Essai ' + jeton } });
  const v1 = r.j.id;
  ok(r.code === 200 && !!v1 && (await appel()).j.contenus === null, '1. enregistrer : un brouillon, qui n’est pas public');
  r = await appel({ url: '/api/contenus?version=' + v1, qui: admin });
  const r2b = await appel({ url: '/api/contenus?version=' + v1, qui: autre });
  ok(r.j.contenus?.histoire.origine.titre === c1.histoire.origine.titre && r.j.contenus.histoire.origine.media.src === U + 'garance.webp' && r2b.code === 403, '2. prévisualiser : le titre et l’image du brouillon, pour l’administration seulement');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'publier', id: v1 } });
  let pub = (await appel()).j;
  ok(r.code === 200 && pub.version === v1 && pub.contenus.histoire.origine.titre === c1.histoire.origine.titre && pub.contenus.histoire.mulhouse.titre === ORIGINE.histoire.mulhouse.titre, '3. publier : le public lit le nouveau titre et la nouvelle image ; le reste est inchangé');
  const c2 = copie(c1); c2.histoire.origine.titre = 'Indigo & garance ' + jeton;
  const v2 = (await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', contenus: c2 } })).j.id;
  await appel({ method: 'POST', qui: admin, body: { action: 'publier', id: v2 } });
  pub = (await appel()).j;
  const etats = (await db.query('select id::text as id, etat from contenus_versions order by id')).rows;
  ok(pub.contenus.histoire.origine.titre === c2.histoire.origine.titre && etats.filter(e => e.etat === 'publie').length === 1 && etats.find(e => e.id === v1).etat === 'archive', 'une seconde publication archive la première ; une seule version publiée');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'restaurer', id: v1 } });
  pub = (await appel()).j;
  const toutes = (await db.query('select id::text as id, etat, data, restaure_de::text as restaure_de from contenus_versions order by id')).rows;
  const n3 = toutes.find(x => x.id === r.j.id);
  ok(r.code === 200 && pub.version === r.j.id && pub.contenus.histoire.origine.titre === c1.histoire.origine.titre && n3.restaure_de === v1
    && JSON.stringify(n3.data) === JSON.stringify(toutes.find(x => x.id === v1).data) && toutes.length === 3, '4. restaurer : la version 1 revient, comme une nouvelle version publiée ; les trois versions sont toujours là');
  const j = (await db.query("select action from contenus_journal where page = 'edition' order by id")).rows.map(x => x.action).join();
  ok(j === 'enregistrer,publier,enregistrer,publier,restaurer', 'journal : chaque geste est inscrit, dans l’ordre');
  const h = (await appel({ url: '/api/contenus?admin=1', qui: admin })).j;
  ok(h.publie?.id === r.j.id && h.versions.length === 3 && !('data' in h.versions[0]), 'historique : la publication et les trois versions, sans leurs contenus');

  /* ——— rien d'invalide ——— */
  const mal = copie(ORIGINE); mal.histoire.origine.sous = '<img src=x onerror=alert(1)>';
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', contenus: mal } });
  ok(r.code === 422 && r.j.ecarts?.length === 1 && (await db.query('select count(*)::int as n from contenus_versions')).rows[0].n === 3, 'validation : un balisage est refusé (422), rien n’est enregistré');
  let refuse = false; try { await db.query("update contenus_versions set etat = 'publie', publie_le = now() where id = $1", [v2]); } catch { refuse = true; }
  ok(refuse, 'base : une seconde version publiée est refusée par la base elle-même (index unique)');

  /* ——— la médiathèque ——— */
  const video = { url: U + 'atelier.mp4', mime: 'video/mp4', poids: 40e6, legende: 'L’atelier.', licence: 'capture' };
  r = await appel({ method: 'POST', qui: admin, body: { action: 'media', media: video } });
  const idv = r.j.id;
  const raff = await appel({ method: 'POST', qui: admin, body: { action: 'media', media: { url: U + 'atelier-affiche.webp', mime: 'image/webp', poids: 2e5, role: 'affiche', parent_id: Number(idv), legende: 'Affiche.', licence: 'capture' } } });
  const rmob = await appel({ method: 'POST', qui: admin, body: { action: 'media', media: { ...video, url: U + 'atelier-mobile.mp4', poids: 9e6, role: 'mobile', parent_id: Number(idv) } } });
  const rrec = await appel({ method: 'POST', qui: admin, body: { action: 'media', media: { url: U + 'r.webp', mime: 'image/webp', poids: 1e5, alt: 'Une scène', legende: 'Un atelier.', licence: 'reconstitution' } } });
  const raut = await appel({ method: 'POST', qui: autre, body: { action: 'media', media: { ...video, url: U + 'x.mp4' } } });
  const l = (await appel({ url: '/api/contenus?medias=1', qui: admin })).j.medias || [];
  ok(r.code === 200 && raff.code === 200 && rmob.code === 200 && rrec.code === 422 && raut.code === 403 && l.length === 3, 'médias : une vidéo, son affiche et sa version mobile ; une reconstitution non annoncée et un autre compte sont refusés');
  let refuseRec = false; try { await db.query("insert into medias (url, genre, mime, poids, licence, reconstitution, legende, auteur) values ($1, 'image', 'image/webp', 1, 'reconstitution', true, 'Une photo.', 'x')", [U + 'force.webp']); } catch { refuseRec = true; }
  ok(refuseRec, 'base : une reconstitution non annoncée est refusée par la base elle-même');
} catch (e) {
  ok(false, 'arrêt : ' + e.message);
} finally {
  /* le ménage : les essais seulement */
  try {
    await db.query("delete from contenus_journal where auteur = any($1::text[])", [comptes.map(c => c.id)]);
    await db.query("delete from contenus_versions where auteur = any($1::text[])", [comptes.map(c => c.id)]);
    await db.query("delete from medias where url like $1", [U + '%']);
    for (const c of comptes) { await db.query('delete from session where "userId" = $1', [c.id]); await db.query('delete from account where "userId" = $1', [c.id]); await db.query('delete from "user" where id = $1', [c.id]); }
    await db.query("delete from verification where identifier like $1", ['%' + jeton + '%']).catch(() => {});
    const reste = (await db.query('select (select count(*) from contenus_versions)::int as v, (select count(*) from medias)::int as m, (select count(*) from "user" where email like $1)::int as u', ['%' + jeton + '%'])).rows[0];
    ok(reste.v === 0 && reste.m === 0 && reste.u === 0, 'ménage : versions, médias et comptes de test effacés ; les tables restent');
  } catch (e) { ok(false, 'ménage : ' + e.message); }
  await db.end(); A.oublier();
  const echecs = resultats.filter(x => !x.ok).length;
  console.log(`\n${resultats.length - echecs}/${resultats.length} ${echecs ? '— ÉCHECS : ' + echecs : 'OK'}`);
  process.exit(echecs ? 1 : 0);
}

/* Le portfolio LE MONDE AIME sur une VRAIE base : la branche Neon de test isolée, jamais la production.
   La migration 2026-10-28-02 (table « projets » et ses deux projets d'origine), l'API /api/projets avec de vrais comptes
   (vrai Better Auth, vrai lien de connexion) : seule l'administration (AIME_ADMIN) écrit ; le public ne voit que les projets publiés.
   Usage : BASE_TEST_URL=<branche Neon de test, jamais committée> [NEON_WS_MODULES=…] node tests/base/projets.mjs [--sans-preuve]
   Garde-fou : refuse toute base sans la table aime_base_de_test. Les comptes et projets de test sont effacés à la fin. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { brancher } from './connexion.mjs';

const URL_BASE = process.env.BASE_TEST_URL;
if (!URL_BASE) { console.error('BASE_TEST_URL manquant : ce test ne tourne que sur une branche Neon de test.'); process.exit(2); }
const transport = await brancher();
const db = new pg.Client({ connectionString: URL_BASE.replace(/[?&]channel_binding=[^&]*/, ''), ssl: { rejectUnauthorized: true } });
await db.connect();
if (!(await db.query("select to_regclass('public.aime_base_de_test') as t")).rows[0].t) { console.error('Refus : cette base n’est pas marquée comme base de test.'); process.exit(3); }
const branche = (await db.query('select nom from aime_base_de_test limit 1')).rows[0]?.nom || 'test';

const jeton = randomBytes(4).toString('hex');
const O = 'http://localhost:8774';
const ADMIN = 'admin-' + jeton + '@test.lemondeaime.invalid';
Object.assign(process.env, { DATABASE_URL: URL_BASE, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: O, AIME_ADMIN: ADMIN });
const A = await import('../../api/_auth/auth.mjs');
const projets = (await import('../../api/projets.mjs')).default;
const { DEFAUTS } = await import('../../api/_projets.mjs');

const resultats = [];
const ok = (c, test) => { console.log((c ? 'OK ' : 'ÉCHEC ') + test); resultats.push({ test, ok: !!c }); };
const comptes = [], slugsTest = [];
let dernier = null; A._envoyeur(async m => { dernier = m; });
async function compte(email) {
  const a = A.auth(), ip = '10.3.0.' + (1 + comptes.length);
  dernier = null;
  await a.api.signInMagicLink({ body: { email, callbackURL: '/admin' }, headers: new Headers({ origin: O, 'x-forwarded-for': ip }) });
  const t = /\/lien\/([A-Za-z0-9_-]+)\//.exec(dernier?.text || '')?.[1];
  const r = await a.handler(new Request(O + '/api/auth/magic-link/verify?token=' + t + '&callbackURL=%2Fadmin', { headers: { origin: O, 'x-forwarded-for': ip } }));
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const moi = await A.personne({ headers: { cookie } });
  if (!moi) throw new Error('session non ouverte');
  const c = { cookie, id: moi.id, email, ip }; comptes.push(c); return c;
}
function reponse() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b || this.body; } }; }
async function appel({ method = 'GET', url = '/api/projets', qui, body } = {}) {
  const res = reponse();
  const headers = { host: 'localhost:8774', ...(qui ? { cookie: qui.cookie, 'x-forwarded-for': qui.ip } : {}), ...(method === 'POST' ? { origin: O, 'content-type': 'application/json' } : {}) };
  await projets({ method, url, headers, body }, res);
  let j = {}; try { j = JSON.parse(res.body || '{}'); } catch { /* pas du JSON */ }
  return { code: res.statusCode, j };
}
const ligne = async slug => (await db.query('select slug, data, publie, ordre from projets where slug = $1', [slug])).rows[0] || null;

const MIG = 'db/migrations/2026-10-28-02-projets.sql', RET = 'db/migrations/2026-10-28-02-projets.retour.sql';
const sql = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
let avant = null;
try {
  /* ——— la migration ——— */
  avant = (await db.query("select to_regclass('public.projets') as t")).rows[0].t;
  if (avant) { const n = (await db.query('select count(*)::int as n from projets')).rows[0].n; if (n > 2) throw new Error('la table projets de la branche de test contient déjà ' + n + ' projets : test arrêté pour ne rien écraser'); }
  await db.query(sql(RET));
  ok(!(await db.query("select to_regclass('public.projets') as t")).rows[0].t, 'migration : le retour arrière retire la table');

  /* sans la table : le public voit les projets d'origine, l'administration est refusée sans rien écrire */
  const admin = await compte(ADMIN), autre = await compte('autre-' + jeton + '@test.lemondeaime.invalid');
  ok(admin.id && autre.id, 'base : deux comptes de test, connectés par le vrai lien de connexion');
  let r = await appel();
  ok(r.code === 200 && r.j.projets.map(p => p.slug).join() === 'brode-way,aime-wedding', 'sans la table : le public voit les deux projets d’origine');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', projet: { titre: 'Essai ' + jeton, annee: 2026, statut: 'bientot', publie: true } } });
  ok(r.code === 503 && r.j.code === 'migration', 'sans la table : l’administration répond qu’il faut la migration (503), rien n’est écrit');

  await db.query(sql(MIG)); await db.query(sql(MIG));
  const lignes = (await db.query('select slug, data, publie, ordre from projets order by ordre')).rows;
  ok(lignes.length === 2 && lignes.every((l, k) => l.slug === DEFAUTS[k].slug && l.data.titre === DEFAUTS[k].titre && l.publie === true), 'migration appliquée deux fois : la table et ses deux projets d’origine, sans doublon');
  r = await appel();
  ok(r.code === 200 && r.j.projets.length === 2 && r.j.projets[0].une === true && r.j.projets[0].couverture === DEFAUTS[0].couverture, 'public : les projets lus dans la table, Brode Way à la une');

  /* les droits */
  r = await appel({ url: '/api/projets?moi=1', qui: admin });
  const r2 = await appel({ url: '/api/projets?moi=1', qui: autre }), r3 = await appel({ url: '/api/projets?moi=1' });
  ok(r.j.admin === true && r2.j.admin === false && r3.j.admin === false, 'droits : seule l’adresse de AIME_ADMIN administre (vérifiée sur la vraie session)');
  const s = 'essai-' + jeton; slugsTest.push(s, s + '-b');
  const projet = { slug: s, titre: 'Essai ' + jeton, categorie: 'Essai', annee: 2026, statut: 'bientot', accroche: 'Un essai.', lien: 'https://exemple.invalid', couverture: '/media/broderie.jpg', galerie: [{ src: '/media/union.jpg', alt: 'Une union' }], publie: false };
  r = await appel({ method: 'POST', qui: autre, body: { action: 'enregistrer', projet } });
  const r4 = await appel({ method: 'POST', body: { action: 'enregistrer', projet } });
  ok(r.code === 403 && r4.code === 401 && !(await ligne(s)), 'droits : un autre compte (403) ou personne (401) ne peut rien écrire');
  r = await appel({ method: 'POST', qui: autre, body: { action: 'supprimer', slug: 'brode-way' } });
  ok(r.code === 403 && !!(await ligne('brode-way')), 'droits : un autre compte ne peut pas supprimer un projet');

  /* l'administration, de bout en bout */
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', projet } });
  const l = await ligne(s);
  ok(r.code === 200 && l && l.publie === false && l.data.galerie[0].alt === 'Une union', 'administration : un projet créé, en brouillon, écrit une fois en base');
  ok((await appel()).j.projets.every(p => p.slug !== s) && (await appel({ url: '/api/projets?slug=' + s })).code === 404, 'public : un brouillon n’apparaît nulle part');
  ok((await appel({ url: '/api/projets?slug=' + s, qui: admin })).code === 200, 'administration : elle voit son brouillon');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', ancien: s, projet: { ...projet, publie: true, une: true, ordre: 3 } } });
  const pub = await appel();
  ok(r.code === 200 && pub.j.projets.map(p => p.slug).join() === 'brode-way,aime-wedding,' + s, 'administration : publié, il apparaît au public, à sa place');
  ok(pub.j.projets.filter(p => p.une).map(p => p.slug).join() === s, 'à la une : un seul projet à la fois');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'ordre', slugs: [s, 'brode-way', 'aime-wedding'] } });
  ok(r.code === 200 && (await appel()).j.projets.map(p => p.slug).join() === s + ',brode-way,aime-wedding', 'administration : l’ordre est enregistré et relu');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', ancien: s, projet: { ...projet, slug: 'brode-way' } } });
  ok(r.code === 409 && (await ligne('brode-way')).data.titre === 'Brode Way', 'administration : une adresse déjà prise est refusée (409), Brode Way intact');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', ancien: s, projet: { ...projet, slug: s + '-b', publie: true } } });
  ok(r.code === 200 && !(await ligne(s)) && !!(await ligne(s + '-b')), 'administration : changer l’adresse déplace le projet, sans doublon');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', projet: { ...projet, slug: 'x-' + jeton, lien: 'javascript:alert(1)' } } });
  ok(r.code === 400 && !(await ligne('x-' + jeton)), 'administration : un lien dangereux est refusé, rien n’est écrit');
  r = await appel({ method: 'POST', qui: admin, body: { action: 'supprimer', slug: s + '-b' } });
  ok(r.code === 200 && !(await ligne(s + '-b')), 'administration : supprimer retire le projet');
  /* remettre la vitrine comme la migration l'a laissée */
  await appel({ method: 'POST', qui: admin, body: { action: 'enregistrer', ancien: 'brode-way', projet: { ...DEFAUTS[0] } } });
  await appel({ method: 'POST', qui: admin, body: { action: 'ordre', slugs: ['brode-way', 'aime-wedding'] } });
  const fin = (await db.query('select slug, data, publie, ordre from projets order by ordre')).rows;
  ok(fin.length === 2 && fin[0].slug === 'brode-way' && fin[0].data.une === true && fin[1].data.une === false, 'à la fin : les deux projets d’origine, comme après la migration');
} catch (e) {
  ok(false, 'parcours interrompu : ' + (e && e.message));
} finally {
  for (const s of slugsTest) await db.query('delete from projets where slug = $1', [s]).catch(() => {});
  if (!avant) await db.query(sql(RET)).catch(() => {});   /* la branche de test retrouve son état d'avant : sans la table */
  for (const c of comptes) for (const [t, col] of [['session', '"userId"'], ['account', '"userId"'], ['"user"', 'id']]) await db.query(`delete from ${t} where ${col} = $1`, [c.id]).catch(() => {});
  await db.query("delete from verification where identifier like '%@test.lemondeaime.invalid%' or value like '%@test.lemondeaime.invalid%'").catch(() => {});
  const n = (await db.query("select count(*)::int as n from \"user\" where email like '%@test.lemondeaime.invalid'")).rows[0].n;
  console.log('nettoyage : ' + (n === 0 ? 'aucun compte de test ne reste' : n + ' compte(s) de test restant(s)') + (avant ? '' : ' ; table projets retirée (état d’avant)'));
  await db.end(); A.oublier?.();
}
if (!process.argv.includes('--sans-preuve')) {
  const git = a => execFileSync('git', a, { cwd: new URL('../..', import.meta.url), encoding: 'utf8' }).trim();
  const chemin = new URL('../../docs/portfolio/preuves.json', import.meta.url);
  mkdirSync(new URL('../../docs/portfolio/', import.meta.url), { recursive: true });
  let tout = {}; try { tout = JSON.parse(readFileSync(chemin, 'utf8')); } catch { /* premier enregistrement */ }
  tout['tests/base/projets.mjs'] = { date: new Date().toISOString().slice(0, 10), commit: git(['rev-parse', '--short', 'HEAD']), code_modifie_depuis_le_commit: git(['status', '--porcelain', '--', 'src', 'api', 'tests', 'db']) !== '', environnement: 'vraie base : branche Neon de test « ' + branche + ' » (' + transport + '), vrai Better Auth ; stockage d’images non utilisé', resultats };
  writeFileSync(chemin, JSON.stringify(Object.fromEntries(Object.entries(tout).sort()), null, 1) + '\n');
}
process.exit(resultats.length && resultats.every(r => r.ok) ? 0 : 1);

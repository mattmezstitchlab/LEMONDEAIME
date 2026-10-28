/* Sujet n° 3 — Unions, sur une VRAIE base : une branche Neon de test isolée, jamais la production.
   Le parcours passe par les vrais modules : Better Auth (lien de connexion capturé, pas d'e-mail envoyé) et /api/buro.
   Source canonique : spaces.kind = 'evenement', data.modele = 'mariage' (la forme d'AIMESTUDIO), data.union = { a, b, date, lieu, programme }.
   Usage : BASE_TEST_URL=<branche Neon de test, jamais committée> node tests/base/unions.mjs [--sans-preuve]
   Garde-fou : la base doit contenir la table aime_base_de_test, créée seulement sur la branche de test. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import pg from 'pg';
import { brancher } from './connexion.mjs';

const URL_BASE = process.env.BASE_TEST_URL;
if (!URL_BASE) { console.error('BASE_TEST_URL manquant : ce test ne tourne que sur une branche Neon de test.'); process.exit(2); }
const transport = await brancher();
const garde = new pg.Client({ connectionString: URL_BASE.replace(/[?&]channel_binding=[^&]*/, ''), ssl: { rejectUnauthorized: true } });
await garde.connect();
const marque = await garde.query("select to_regclass('public.aime_base_de_test') as t");
if (!marque.rows[0].t) { console.error('Refus : cette base n’est pas marquée comme base de test.'); process.exit(3); }
const branche = (await garde.query('select nom from aime_base_de_test limit 1')).rows[0]?.nom || 'test';

const ORIGINE = 'http://localhost:8773';
Object.assign(process.env, { DATABASE_URL: URL_BASE, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: ORIGINE });
const A = await import('../../api/_auth/auth.mjs');
const { default: buro } = await import('../../api/buro.mjs');
const P = await import('../../src/lib/programme-outils.mjs');
const REF = JSON.parse(readFileSync(new URL('../../src/data/programme.json', import.meta.url), 'utf8'));
const empreinte = () => createHash('sha256').update(readFileSync(new URL('../../src/data/programme.json', import.meta.url))).digest('hex');
const empreinteAvant = empreinte();

const resultats = [];
const ok = (c, test) => { console.log((c ? 'OK ' : 'ÉCHEC ') + test); resultats.push({ test, ok: !!c }); };

/* un compte de test, connecté par le vrai lien magique (capturé au lieu d'être envoyé) */
let dernier = null;
A._envoyeur(async m => { dernier = m; });
async function compte(email) {
  dernier = null;
  const a = A.auth(), ip = '10.0.0.' + (1 + comptes.length);   /* une adresse par compte de test : la limite de débit reste celle de la production */
  await a.api.signInMagicLink({ body: { email, callbackURL: '/buro' }, headers: new Headers({ origin: ORIGINE, 'x-forwarded-for': ip }) });
  const lien = /\/lien\/([A-Za-z0-9_-]+)\//.exec(dernier?.text || '')?.[1];
  if (!lien) throw new Error('lien de connexion non capturé');
  const r = await a.handler(new Request(ORIGINE + '/api/auth/magic-link/verify?token=' + lien + '&callbackURL=%2Fburo', { headers: { origin: ORIGINE, 'x-forwarded-for': ip } }));
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const moi = await A.personne({ headers: { cookie } });
  if (!moi) throw new Error('session non ouverte');
  return { cookie, id: moi.id, email };
}
/* appeler /api/buro comme le ferait le navigateur de cette personne */
async function appel(qui, method, body) {
  const res = { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(b) { this.body = b; } };
  const headers = { host: 'localhost:8773', cookie: qui.cookie, ...(method === 'POST' ? { origin: ORIGINE, 'content-type': 'application/json' } : {}) };
  await buro({ method, headers, body }, res);
  return { code: res.statusCode, j: JSON.parse(res.body || '{}') };
}
const db = garde;
const premiere = async id => (await sesUnions(id))[0] || { title: '', data: { union: {} } };
const sesUnions = async id => (await db.query("select id::text as id, kind, title, data from spaces where owner_id = $1 and kind = 'evenement' and data->>'modele' = 'mariage'", [id])).rows;

const jeton = randomBytes(4).toString('hex');
const comptes = [];
try {
  const lou = await compte('lou-' + jeton + '@test.lemondeaime.invalid'); comptes.push(lou);
  const autre = await compte('autre-' + jeton + '@test.lemondeaime.invalid'); comptes.push(autre);
  const ancien = await compte('ancien-' + jeton + '@test.lemondeaime.invalid'); comptes.push(ancien);
  const double = await compte('double-' + jeton + '@test.lemondeaime.invalid'); comptes.push(double);
  ok(lou.id && autre.id && lou.id !== autre.id, 'base : deux comptes de test, connectés par le vrai lien de connexion');

  /* 1 · créer l'union depuis le Point Zéro */
  let r = await appel(lou, 'POST', { action: 'union', intention: 'Nous nous marions', briques: ['intention', 'personnes'], union: { a: 'Lou', b: 'Marius', date: '2027-06-12', lieu: 'Cinéma de quartier' } });
  const id = r.j.id;
  ok(r.code === 201 && r.j.ok && id && r.j.existant === false, 'union : créée et rangée dans l’espace de son propriétaire (201)');
  let lignes = await sesUnions(lou.id);
  const ligne = lignes[0];
  ok(lignes.length === 1 && ligne.kind === 'evenement' && ligne.data.modele === 'mariage' && ligne.data.union?.a === 'Lou' && ligne.data.union?.date === '2027-06-12',
    'union : écrite une fois en base, sous la forme canonique (evenement + mariage + data.union)');
  const membres = (await db.query('select user_id, role from space_members where space_id = $1', [id])).rows;
  ok(membres.length === 1 && membres[0].user_id === lou.id && membres[0].role === 'owner', 'union : son seul membre est son propriétaire');

  /* 2 · pas de doublon : ranger deux fois, ou deux envois simultanés */
  r = await appel(lou, 'POST', { action: 'union', intention: 'Nous nous marions', union: { a: 'Lou', b: 'Marius' } });
  const [x, y] = await Promise.all([appel(lou, 'POST', { action: 'union', union: {} }), appel(lou, 'POST', { action: 'union', union: {} })]);
  lignes = await sesUnions(lou.id);
  ok(r.j.id === id && r.j.existant === true && x.j.id === id && y.j.id === id && lignes.length === 1, 'union : ranger à nouveau retrouve la même union (aucun doublon)');
  const course = await Promise.all([1, 2, 3].map(() => appel(double, 'POST', { action: 'union', intention: 'Nous nous marions', union: {} })));
  ok(course.every(c => c.j.ok && c.j.id === course[0].j.id) && (await sesUnions(double.id)).length === 1, 'union : trois envois simultanés d’un nouveau compte ne créent qu’une union');

  /* 3 · relire, comme après un rechargement : une nouvelle requête, rien en mémoire */
  r = await appel(lou, 'GET');
  const u = (r.j.projets || []).find(p => p.id === id);
  ok(r.code === 200 && u && u.union && u.union.a === 'Lou' && u.union.b === 'Marius' && u.union.date === '2027-06-12' && u.union.lieu === 'Cinéma de quartier' && u.role === 'owner',
    'union : relue après rechargement, avec ses prénoms, sa date officielle et son lieu');

  /* 4 · le propriétaire modifie */
  r = await appel(lou, 'POST', { action: 'union-maj', id, union: { b: 'Marius-Jean', date: '2027-07-03', lieu: '' } });
  const apres = (await appel(lou, 'GET')).j.projets?.find(p => p.id === id) || { union: {} };
  ok(r.code === 200 && apres.union.b === 'Marius-Jean' && apres.union.date === '2027-07-03' && apres.union.lieu === '' && apres.union.a === 'Lou', 'union : le propriétaire modifie ses informations, relues telles quelles');
  r = await appel(lou, 'POST', { action: 'union-maj', id, union: { date: '31/02/2027' } });
  ok(r.code === 400 && (await premiere(lou.id)).data.union.date === '2027-07-03', 'union : une date officielle invalide est refusée, rien n’est écrit');

  /* 5 · un autre compte : ni lecture, ni modification, ni partage */
  r = await appel(autre, 'GET');
  ok(r.code === 200 && !(r.j.projets || []).some(p => p.id === id), 'permissions : un autre compte ne voit pas l’union');
  r = await appel(autre, 'POST', { action: 'union-maj', id, union: { a: 'Intrus' } });
  const r2 = await appel(autre, 'POST', { action: 'maj', id, archive: true });
  ok(r.code === 404 && r2.code === 404 && (await premiere(lou.id)).data.union.a === 'Lou' && !(await premiere(lou.id)).data.archive, 'permissions : un autre compte ne peut ni modifier ni archiver l’union (404)');
  r = await appel(lou, 'POST', { action: 'maj', id, visibilite: 'public' });
  ok((await premiere(lou.id)).data.visibilite === 'prive', 'permissions : pas de partage public d’une union à cette étape');

  /* 6 · un mariage existant, incomplet (créé par AIMESTUDIO) : intact, retrouvé, puis complété */
  const ex = await db.query("insert into spaces (kind, title, owner_id, data) values ('evenement', 'Notre mariage', $1, $2::jsonb) returning id::text as id", [ancien.id, JSON.stringify({ modele: 'mariage', origine: 'studio-' + jeton })]);
  await db.query("insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')", [ex.rows[0].id, ancien.id]);
  r = await appel(ancien, 'GET');
  const vieux = (r.j.projets || []).find(p => p.id === ex.rows[0].id);
  ok(vieux && vieux.union && vieux.union.a === '' && vieux.union.date === '' && vieux.titre === 'Notre mariage', 'existant : un mariage d’AIMESTUDIO sans prénoms apparaît comme union à compléter');
  r = await appel(ancien, 'POST', { action: 'union', intention: 'Nous nous marions', union: {} });
  ok(r.j.id === ex.rows[0].id && r.j.existant === true && (await sesUnions(ancien.id)).length === 1, 'existant : ranger depuis le Point Zéro retrouve ce mariage, sans en créer un second');
  r = await appel(ancien, 'POST', { action: 'union-maj', id: ex.rows[0].id, union: { a: 'Inès', b: 'Hugo', date: '2027-09-18' } });
  const complete = await premiere(ancien.id);
  ok(r.code === 200 && complete.title === 'Notre mariage' && complete.data.modele === 'mariage' && complete.data.origine === 'studio-' + jeton && complete.data.union.a === 'Inès',
    'existant : complété par son propriétaire, ses champs d’origine (titre, modèle, origine) intacts');

  /* 7 · le programme personnel, tiré de la Grille 200 avec personnaliser(), rattaché à la même union */
  const choix = REF.moments.filter(m => m.etape === 'day').slice(0, 12).map(m => m.id);
  r = await appel(lou, 'POST', { action: 'union-maj', id, union: { programme: { moments: choix, horaires: { [choix[0]]: '14:30' } } } });
  const relu = (await appel(lou, 'GET')).j.projets?.find(p => p.id === id) || { union: {} };
  ok(r.code === 200 && relu.union?.programme && relu.union.programme.moments.length === 12 && relu.union.programme.horaires[choix[0]] === '14:30', 'programme : les choix de l’union sont enregistrés avec elle et relus');
  const perso = P.programmeDUnion ? P.programmeDUnion(REF, relu.union) : { moments: [], union: {} };
  const texte = JSON.stringify(perso.moments.map(m => [m.titre, m.description]));
  ok(perso.reference === false && perso.union.nom === 'Lou & Marius-Jean' && perso.union.jour === '2027-07-03' && perso.moments.length === 12, 'programme : personnaliser() donne le programme de cette union (ses moments, son nom, sa date)');
  ok(perso.moments.length > 0 && !/Camille|Gabriel/.test(texte + JSON.stringify(perso.union)) && perso.moments.filter(m => m.etape === 'day').every(m => m.debut.startsWith('2027-07-0')), 'programme : rien de Camille & Gabriel dans le programme personnel ; les moments du jour tombent à sa date');
  ok(empreinte() === empreinteAvant && P.estReference(REF) && REF.union.nom === 'Camille & Gabriel', 'programme : la Grille 200 de référence (Camille & Gabriel) n’a pas changé');

  /* 8 · la base partagée n'a pas changé de règles */
  const c = (await db.query("select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'spaces_kind_check'")).rows[0]?.d || '';
  ok(/'evenement'/.test(c) && /'projet'/.test(c) && /'atelier'/.test(c) && !/'union'/.test(c), 'schéma : aucun nouveau kind, aucune migration (contrainte d’origine intacte)');
} catch (e) {
  ok(false, 'parcours interrompu : ' + (e && e.message));
} finally {
  /* nettoyer la branche de test : les comptes de test et tout ce qui leur appartient */
  for (const c of comptes) {
    await db.query('delete from spaces where owner_id = $1', [c.id]).catch(() => {});
    await db.query('delete from space_members where user_id = $1', [c.id]).catch(() => {});
    for (const t of ['session', 'account', 'passkey']) await db.query(`delete from "${t}" where "userId" = $1`, [c.id]).catch(() => {});
    await db.query('delete from "user" where id = $1', [c.id]).catch(() => {});
  }
  await db.query("delete from verification where identifier like '%@test.lemondeaime.invalid%' or value like '%@test.lemondeaime.invalid%'").catch(() => {});
  const reste = (await db.query("select count(*)::int as n from \"user\" where email like '%@test.lemondeaime.invalid'")).rows[0].n;
  console.log('nettoyage : ' + (reste === 0 ? 'aucun compte de test ne reste' : reste + ' compte(s) de test restant(s)'));
  await garde.end(); A.oublier();
}

if (!process.argv.includes('--sans-preuve')) {
  const chemin = new URL('../../cartographie/preuves.json', import.meta.url);
  const tout = JSON.parse(readFileSync(chemin, 'utf8'));
  const git = a => execFileSync('git', a, { encoding: 'utf8' }).trim();
  tout['tests/base/unions.mjs'] = { date: new Date().toISOString().slice(0, 10), commit: git(['rev-parse', '--short', 'HEAD']), code_modifie_depuis_le_commit: git(['status', '--porcelain', '--', 'src', 'api', 'tests']) !== '', environnement: 'base réelle : branche Neon de test isolée « ' + branche + ' » (jamais la production), connexion ' + transport, resultats };
  writeFileSync(chemin, JSON.stringify(Object.fromEntries(Object.entries(tout).sort()), null, 1) + '\n');
}
process.exit(resultats.every(x => x.ok) ? 0 : 1);

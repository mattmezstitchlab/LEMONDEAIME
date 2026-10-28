/* Sécurité S1, S3, S4 sur une VRAIE base : la branche Neon de test isolée, jamais la production.
   S1 · supprimer un compte efface toutes ses données (et inscrit ses fichiers pour effacement, avec reprise) ; les données partagées sont traitées.
   S3 · /api/analyse : réservé aux personnes connectées, garde commune, quotas partagés et plafond global (Claude simulé : la clé n'est jamais utilisée).
   S4 · le Réseau ne montre jamais un événement (union, mariage), même marqué « public » par un autre écrivain.
   Usage : BASE_TEST_URL=<branche Neon de test, jamais committée> [NEON_WS_MODULES=…] node tests/base/securite.mjs [--sans-preuve]
   Garde-fou : refuse toute base sans la table aime_base_de_test. Tous les comptes et lignes de test sont effacés à la fin. */
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

const O = 'http://localhost:8773';
Object.assign(process.env, { DATABASE_URL: URL_BASE, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: O, ANTHROPIC_API_KEY: 'cle-de-test-jamais-envoyee', CRON_SECRET: randomBytes(24).toString('hex') });
const A = await import('../../api/_auth/auth.mjs');
const E = await import('../../api/_auth/effacements.mjs').catch(() => null);
const Q = (await import('../../api/_auth/quotas.cjs')).default;
const analyse = (await import('../../api/analyse.mjs')).default;
const reseau = (await import('../../api/reseau.mjs')).default;
const maintenance = E ? (await import('../../api/maintenance.mjs').catch(() => null))?.default : null;

const resultats = [];
const ok = (c, test) => { console.log((c ? 'OK ' : 'ÉCHEC ') + test); resultats.push({ test, ok: !!c }); };
const jeton = randomBytes(4).toString('hex'), comptes = [];
let dernier = null; A._envoyeur(async m => { dernier = m; });
async function compte(nom) {
  const a = A.auth(), ip = '10.2.0.' + (1 + comptes.length), email = nom + '-' + jeton + '@test.lemondeaime.invalid';
  dernier = null;
  await a.api.signInMagicLink({ body: { email, callbackURL: '/buro' }, headers: new Headers({ origin: O, 'x-forwarded-for': ip }) });
  const t = /\/lien\/([A-Za-z0-9_-]+)\//.exec(dernier?.text || '')?.[1];
  const r = await a.handler(new Request(O + '/api/auth/magic-link/verify?token=' + t + '&callbackURL=%2Fburo', { headers: { origin: O, 'x-forwarded-for': ip } }));
  const cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  const moi = await A.personne({ headers: { cookie } });
  if (!moi) throw new Error('session non ouverte');
  const c = { cookie, id: moi.id, email, ip }; comptes.push(c); return c;
}
/* une requête Vercel (Node) : res.status().json() comme res.statusCode / end */
function reponse() { return { statusCode: 200, headers: {}, body: '', setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(c) { this.statusCode = c; return this; }, json(o) { this.body = JSON.stringify(o); return this; }, send(b) { this.body = b; return this; }, end(b) { this.body = b || this.body; } }; }
async function appel(h, { method = 'GET', url = '/', qui, headers = {}, body } = {}) {
  const res = reponse();
  await h({ method, url, headers: { host: 'localhost:8773', ...(qui ? { cookie: qui.cookie, 'x-forwarded-for': qui.ip } : {}), ...headers }, body }, res);
  let j = {}; try { j = JSON.parse(res.body || '{}'); } catch { /* pas du JSON */ }
  return { code: res.statusCode, j };
}
const compter = async (table, col, id) => (await db.query(`select count(*)::int as n from ${table} where ${col} = $1`, [id])).rows[0].n;

/* Claude simulé : on compte les appels, la clé de test ne quitte jamais ce processus */
const vraiFetch = globalThis.fetch; let appelsClaude = 0;
globalThis.fetch = async (url, o) => {
  if (String(url).startsWith('https://api.anthropic.com/')) { appelsClaude++; return new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'allumer_la_grille', input: { domaine: 'union', certitude: 0.9, resume: 'Un mariage.', chemin: [{ id: 'intention', raison: 'Nous nous marions' }], ecartees: [], entites: {} } }] }), { status: 200 }); }
  return vraiFetch(url, o);
};
const cles = [];
try {
  /* ——— S1 · suppression de compte ——— */
  const parti = await compte('parti'), reste = await compte('reste'), gardien = await compte('gardien');
  ok(parti.id && reste.id && gardien.id, 'base : trois comptes de test, connectés par le vrai lien de connexion');
  const fichier = 'https://exemple.public.blob.vercel-storage.com/musique/' + parti.id + '/chanson-' + jeton + '.mp3';
  await db.query("insert into musiques (user_id, source, titre, artiste, lien, moment) values ($1, 'fichier', 'Ma chanson', 'Moi', $2, 'premiere-danse'), ($1, 'lien', 'Un lien', '', 'https://exemple.org/x', 'premiere-danse'), ($3, 'lien', 'Celle de reste', '', 'https://exemple.org/y', 'premiere-danse')", [parti.id, fichier, reste.id]).catch(e => { throw new Error('insertion musiques : ' + e.message); });
  await db.query("insert into reseau_dates (user_id, jour, etat) values ($1, '2027-06-12', 'libre'), ($2, '2027-06-12', 'prise')", [parti.id, reste.id]);
  await db.query("insert into reseau_questions (user_id, question) values ($1, 'Êtes-vous libre ?')", [parti.id]);
  await db.query("insert into reseau_demandes (a_user, de_user, de_nom, de_email, message) values ($1, $2, 'Reste', 'reste@x.invalid', 'Pour parti'), ($2, $1, 'Parti Personne', 'parti@x.invalid', 'Bonjour, de la part de parti')", [parti.id, reste.id]);
  await db.query("insert into profils (user_id, nom, metier, visible) values ($1, 'Parti', 'Testeur', true)", [parti.id]);
  const sp = await db.query("insert into spaces (kind, title, owner_id, data) values ('projet', 'Projet de reste', $1, '{}') returning id::text as id", [reste.id]);
  await db.query("insert into space_members (space_id, user_id, role) values ($1, $2, 'owner'), ($1, $3, 'viewer')", [sp.rows[0].id, reste.id, parti.id]);

  /* le stockage : en panne au premier passage, puis rétabli */
  const effaces = []; let panne = true;
  E && E._stockage({
    del: async u => { if (panne) throw new Error('stockage injoignable (simulé)'); effaces.push(...[].concat(u)); },
    list: async ({ prefix }) => { if (panne) throw new Error('stockage injoignable (simulé)'); return { blobs: [{ url: 'https://exemple.public.blob.vercel-storage.com/' + prefix + 'envoi-jamais-rattache.mp3' }], hasMore: false }; },
  });
  const sup = await A.auth().handler(new Request(O + '/api/auth/delete-user', { method: 'POST', headers: { origin: O, cookie: parti.cookie, 'content-type': 'application/json', 'x-forwarded-for': parti.ip }, body: '{}' }));
  ok(sup.status === 200 && !(await db.query('select 1 from "user" where id = $1', [parti.id])).rowCount, 'S1 : le compte est supprimé par le vrai flux de suppression (200)');
  const restes = { musiques: await compter('musiques', 'user_id', parti.id), dates: await compter('reseau_dates', 'user_id', parti.id), questions: await compter('reseau_questions', 'user_id', parti.id), recues: await compter('reseau_demandes', 'a_user', parti.id), envoyees: await compter('reseau_demandes', 'de_user', parti.id), profil: await compter('profils', 'user_id', parti.id), membre: await compter('space_members', 'user_id', parti.id), sessions: await compter('session', '"userId"', parti.id) };
  console.log('  lignes restantes du compte supprimé :', JSON.stringify(restes));
  ok(Object.values(restes).every(n => n === 0), 'S1 : aucune ligne du compte ne reste (musique, Réseau, profil, adhésions, sessions)');
  const chez = (await db.query("select de_user, de_nom, de_email, message from reseau_demandes where a_user = $1", [reste.id])).rows;
  ok(chez.length === 1 && chez[0].de_user === '' && chez[0].de_nom === 'Compte supprimé' && chez[0].de_email === '' && chez[0].message.includes('Bonjour'), 'S1 : une demande envoyée reste chez son destinataire, sans le nom, l’adresse ni le compte de son auteur');
  ok((await compter('musiques', 'user_id', reste.id)) === 1 && (await compter('reseau_dates', 'user_id', reste.id)) === 1 && (await compter('spaces', 'id::text', sp.rows[0].id)) === 1, 'S1 : les données des autres comptes et l’espace partagé sont intacts');
  const file = E ? (await db.query("select genre, cible, essais, erreur from effacements_fichiers where cible like $1", ['%' + parti.id + '%']).catch(() => ({ rows: [] }))).rows : [];
  ok(file.length === 2 && file.some(f => f.genre === 'url' && f.cible === fichier) && file.some(f => f.genre === 'prefixe' && f.cible === 'musique/' + parti.id + '/') && file.every(f => f.essais === 1 && /injoignable/.test(f.erreur)), 'S1 : stockage en panne, les fichiers restent inscrits dans la file d’effacement, avec l’erreur');
  panne = false;
  const nonAutorise = maintenance ? await appel(maintenance, { headers: { authorization: 'Bearer faux-secret-de-test-xxxx' } }) : { code: 0 };
  const repris = maintenance ? await appel(maintenance, { headers: { authorization: 'Bearer ' + process.env.CRON_SECRET } }) : { code: 0, j: {} };
  const resteFile = E ? (await db.query("select count(*)::int as n from effacements_fichiers where cible like $1", ['%' + parti.id + '%']).catch(() => ({ rows: [{ n: -1 }] }))).rows[0].n : -1;
  ok(nonAutorise.code === 401 && repris.code === 200 && resteFile === 0 && effaces.includes(fichier) && effaces.some(u => u.endsWith('/musique/' + parti.id + '/envoi-jamais-rattache.mp3')), 'S1 : la reprise (tâche quotidienne protégée) efface le fichier et les envois jamais rattachés, puis vide la file');
  const avecMembre = await compte('proprio');
  const sp2 = await db.query("insert into spaces (kind, title, owner_id, data) values ('projet', 'Espace partagé', $1, '{}') returning id::text as id", [avecMembre.id]);
  await db.query("insert into space_members (space_id, user_id, role) values ($1, $2, 'owner'), ($1, $3, 'editor')", [sp2.rows[0].id, avecMembre.id, reste.id]);
  const refus = await A.auth().handler(new Request(O + '/api/auth/delete-user', { method: 'POST', headers: { origin: O, cookie: avecMembre.cookie, 'content-type': 'application/json', 'x-forwarded-for': avecMembre.ip }, body: '{}' }));
  ok(refus.status >= 400 && (await db.query('select 1 from "user" where id = $1', [avecMembre.id])).rowCount === 1 && (await compter('space_members', 'space_id::text', sp2.rows[0].id)) === 2, 'S1 : propriétaire d’un espace où d’autres sont membres : suppression refusée, rien n’est effacé');

  /* ——— S3 · /api/analyse ——— */
  const site = { origin: O, 'content-type': 'application/json' }, corps = { texte: 'Nous nous marions en juin' };
  appelsClaude = 0;
  let r = await appel(analyse, { method: 'POST', headers: site, body: corps });
  ok(r.code === 401 && r.j.code === 'compte' && appelsClaude === 0, 'S3 : sans compte, refusé (401) et rien n’est dépensé');
  r = await appel(analyse, { method: 'POST', qui: gardien, headers: { 'content-type': 'application/json' }, body: corps });
  const r2 = await appel(analyse, { method: 'POST', qui: gardien, headers: { ...site, origin: 'https://ailleurs.example' }, body: corps });
  ok(r.code === 403 && r2.code === 403 && appelsClaude === 0, 'S3 : même connecté, une requête sans origine ou d’un autre site est refusée');
  r = await appel(analyse, { method: 'POST', qui: gardien, headers: site, body: corps });
  ok(r.code === 200 && Array.isArray(r.j.chemin) && appelsClaude === 1, 'S3 : connecté, l’analyse passe (Claude simulé, un appel)');
  const remplir = async (nom, valeur, n) => {
    const q = Q.QUOTAS[nom]; if (!q) return false;
    const cle = (nom + ':' + Q.empreinte(valeur)).slice(0, 120), debut = new Date(Math.floor(Date.now() / (q.fenetre * 1000)) * q.fenetre * 1000);
    cles.push(cle); await db.query('insert into quotas (cle, fenetre, n) values ($1, $2, $3) on conflict (cle, fenetre) do update set n = $3', [cle, debut, n]); return true;
  };
  const avant = appelsClaude;
  const pq = await remplir('analyse:personne', gardien.id, 20);
  r = await appel(analyse, { method: 'POST', qui: gardien, headers: site, body: corps });
  ok(pq && r.code === 429 && r.j.code === 'quota' && appelsClaude === avant, 'S3 : au quota de la personne, refusé (429) sans appel à Claude');
  const pg2 = await remplir('analyse:tous', 'tous', 300);
  r = await appel(analyse, { method: 'POST', qui: reste, headers: site, body: corps });
  ok(pg2 && r.code === 429 && r.j.code === 'plafond' && appelsClaude === avant, 'S3 : plafond global atteint, refusé pour tous (429) sans appel à Claude');
  ok(!JSON.stringify(r.j).includes(process.env.ANTHROPIC_API_KEY), 'S3 : la clé n’apparaît jamais dans une réponse');

  /* ——— S4 · le Réseau ——— */
  await db.query("insert into profils (user_id, nom, metier, visible) values ($1, 'Gardien', 'Testeur', true)", [gardien.id]);
  const ref = (await db.query('select ref from profils where user_id = $1', [gardien.id])).rows[0].ref;
  await db.query(`insert into spaces (kind, title, owner_id, data) values
    ('evenement', 'Union de test privée', $1, '{"modele":"mariage","visibilite":"public","union":{"a":"Lou","b":"Marius"}}'),
    ('evenement', 'Séminaire de test', $1, '{"visibilite":"public"}'),
    ('projet', 'Projet public de test', $1, '{"visibilite":"public","briques":["intention"]}')`, [gardien.id]);
  r = await appel(reseau, { url: '/api/reseau?ref=' + ref });
  const titres = (r.j.projets || []).map(p => p.titre);
  console.log('  projets publics montrés :', JSON.stringify(titres));
  ok(r.code === 200 && titres.includes('Projet public de test') && !titres.includes('Union de test privée') && !titres.includes('Séminaire de test'), 'S4 : la fiche publique ne montre jamais une union ni un événement, même marqués « public »');
  r = await appel(reseau, { url: '/api/reseau' });
  ok(r.code === 200 && !JSON.stringify(r.j).includes('Union de test privée') && !JSON.stringify(r.j).includes('Lou'), 'S4 : la liste publique du Réseau ne montre aucun espace');
} catch (e) {
  ok(false, 'parcours interrompu : ' + (e && e.message));
} finally {
  globalThis.fetch = vraiFetch;
  for (const c of comptes) {
    for (const [t, col] of [['spaces', 'owner_id'], ['space_members', 'user_id'], ['musiques', 'user_id'], ['reseau_dates', 'user_id'], ['reseau_questions', 'user_id'], ['reseau_demandes', 'a_user'], ['reseau_demandes', 'de_user'], ['profils', 'user_id'], ['session', '"userId"'], ['account', '"userId"'], ['"user"', 'id']]) await db.query(`delete from ${t} where ${col} = $1`, [c.id]).catch(() => {});
  }
  await db.query("delete from reseau_demandes where de_nom = 'Compte supprimé' and message like '%de la part de parti%'").catch(() => {});
  await db.query("delete from effacements_fichiers where cible like '%exemple.public%' or cible like 'musique/%'").catch(() => {});
  for (const k of cles) await db.query('delete from quotas where cle = $1', [k]).catch(() => {});
  await db.query("delete from verification where identifier like '%@test.lemondeaime.invalid%' or value like '%@test.lemondeaime.invalid%'").catch(() => {});
  const n = (await db.query("select count(*)::int as n from \"user\" where email like '%@test.lemondeaime.invalid'")).rows[0].n;
  console.log('nettoyage : ' + (n === 0 ? 'aucun compte de test ne reste' : n + ' compte(s) de test restant(s)'));
  await db.end(); A.oublier();
}

if (!process.argv.includes('--sans-preuve')) {
  const dossier = new URL('../../docs/securite/', import.meta.url); mkdirSync(dossier, { recursive: true });
  const chemin = new URL('preuves.json', dossier);
  let tout = {}; try { tout = JSON.parse(readFileSync(chemin, 'utf8')); } catch { /* premier enregistrement */ }
  const git = a => execFileSync('git', a, { encoding: 'utf8' }).trim();
  tout['tests/base/securite.mjs'] = { date: new Date().toISOString().slice(0, 10), commit: git(['rev-parse', '--short', 'HEAD']), code_modifie_depuis_le_commit: git(['status', '--porcelain', '--', 'src', 'api', 'tests', 'studio/src']) !== '', environnement: 'base réelle : branche Neon de test isolée « ' + branche + ' » (jamais la production), connexion ' + transport + ' ; Claude et le stockage de fichiers simulés', resultats };
  writeFileSync(chemin, JSON.stringify(Object.fromEntries(Object.entries(tout).sort()), null, 1) + '\n');
}
process.exit(resultats.every(x => x.ok) ? 0 : 1);

/* Un serveur local pour éprouver le Bureau éditorial de bout en bout, dans un vrai navigateur, sur la branche Neon de TEST.
   Il sert le studio construit sous /studio/ (AIME_BASE=/studio/), les vraies fonctions /api/contenus et /api/auth (Better Auth),
   le lien de connexion (/lien/…) et la redirection /bureau, comme vercel.json. Les e-mails ne partent pas : le dernier lien
   de chaque adresse est gardé ici, et lu par le test (/__test/lien). Rien de ceci n'est déployé.
   Usage : BASE_TEST_URL=<branche Neon de test> NEON_WS_MODULES=… STUDIO_DIST=<dossier> PORT=8790 ADMIN=<adresse de test> node tests/e2e/serveur-bureau.mjs
   Garde-fou : refuse toute base sans la table aime_base_de_test. */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { brancher } from '../base/connexion.mjs';

const URL_BASE = process.env.BASE_TEST_URL, DIST = process.env.STUDIO_DIST, PORT = Number(process.env.PORT || 8790), ADMIN = process.env.ADMIN;
if (!URL_BASE || !DIST || !ADMIN) { console.error('BASE_TEST_URL, STUDIO_DIST et ADMIN sont requis.'); process.exit(2); }
await brancher();
const sansChannelBinding = u => u.replace(/([?&])channel_binding=[^&]*&?/, '$1').replace(/[?&]$/, '');
/* un pool, pas une connexion unique : la branche de test s'endort après quelques minutes et ferme ses connexions */
const db = new pg.Pool({ connectionString: sansChannelBinding(URL_BASE), ssl: { rejectUnauthorized: true }, max: 2 });
db.on('error', e => console.error('connexion de test fermée (elle se rouvrira) :', e.message));
if (!(await db.query("select to_regclass('public.aime_base_de_test') as t")).rows[0].t) { console.error('Refus : cette base n’est pas marquée comme base de test.'); process.exit(3); }

const O = 'http://localhost:' + PORT;
Object.assign(process.env, { DATABASE_URL: sansChannelBinding(URL_BASE), BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: O, AIME_ADMIN: ADMIN });
const A = await import('../../api/_auth/auth.mjs');
const contenus = (await import('../../api/contenus.mjs')).default;
const comptes = (await import('../../api/comptes.mjs')).default;
const ouvrages = (await import('../../api/ouvrages.mjs')).default;   /* le studio range ses ouvrages quand une session existe */
const preferences = (await import('../../api/preferences.mjs')).default;   /* les préférences du Point dans le compte */
const galerie = (await import('../../api/galerie.mjs')).default;   /* la Galerie des Vivants */
const liens = new Map();
A._envoyeur(async m => { const u = /https?:\/\/\S+\/lien\/[A-Za-z0-9_-]+\/[a-z0-9-]+/.exec(m.text || '')?.[0]; if (u) liens.set(String(m.to).toLowerCase(), u); });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
async function fichier(res, chemin) {
  const p = normalize(join(DIST, chemin)); if (!p.startsWith(normalize(DIST))) { res.statusCode = 403; return res.end(); }
  try { const s = await stat(p); if (s.isFile()) { res.setHeader('Content-Type', TYPES[extname(p)] || 'application/octet-stream'); return res.end(await readFile(p)); } } catch { /* l'application */ }
  res.setHeader('Content-Type', TYPES['.html']); return res.end(await readFile(join(DIST, 'index.html')));
}
async function menage() {
  const lignes = (await db.query("select id, email from \"user\" where email like '%@test.lemondeaime.invalid'")).rows, u = lignes.map(r => r.id);
  for (const l of lignes) await A.effacerTraces(db, l);   /* espaces, adhésions, ouvrages : comme une suppression de compte */
  await db.query('delete from contenus_journal where auteur = any($1::text[])', [u]);
  await db.query('delete from contenus_versions where auteur = any($1::text[])', [u]);
  /* les compteurs des parcours de test (liens de connexion, galerie) : sinon un deuxième passage dans l'heure est bloqué ; base de test seulement (garde-fou plus haut) */
  await db.query("delete from quotas where cle like 'lien:ip:%' or cle like 'galerie:%'").catch(() => {});
  for (const id of u) { await db.query('delete from session where "userId" = $1', [id]); await db.query('delete from account where "userId" = $1', [id]); await db.query('delete from "user" where id = $1', [id]); }
  return { comptes: u.length, versions: (await db.query('select count(*)::int as n from contenus_versions')).rows[0].n };
}

process.on('uncaughtException', e => console.error('erreur isolée :', e.message));   /* un serveur de test ne doit pas tomber pour une connexion fermée */
http.createServer(async (req, res) => {
  const u = new URL(req.url, O);
  try {
    if (u.pathname === '/__test/lien') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ lien: liens.get(String(u.searchParams.get('email')).toLowerCase()) || null })); }
    if (u.pathname === '/__test/menage') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(await menage())); }
    if (u.pathname === '/bureau') { res.statusCode = 307; res.setHeader('Location', '/studio/bureau'); return res.end(); }
    if (u.pathname === '/galerie') { res.statusCode = 307; res.setHeader('Location', '/studio/galerie' + u.search); return res.end(); }
    if (u.pathname === '/' || u.pathname === '/studio') { res.statusCode = 307; res.setHeader('Location', '/studio/' + u.search); return res.end(); }
    if (u.pathname.startsWith('/lien/')) { req.url = '/api/comptes?__lien=' + encodeURIComponent(u.pathname.slice(6)); return await comptes(req, res); }
    if (u.pathname.startsWith('/api/auth/')) return await comptes(req, res);
    if (u.pathname === '/api/contenus') return await contenus(req, res);
    if (u.pathname === '/api/ouvrages') return await ouvrages(req, res);
    if (u.pathname === '/api/preferences') return await preferences(req, res);
    if (u.pathname === '/api/galerie') return await galerie(req, res);
    if (u.pathname.startsWith('/studio/')) return await fichier(res, u.pathname.slice('/studio/'.length) || 'index.html');
    res.statusCode = 404; res.end('introuvable');
  } catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('erreur'); } }
}).listen(PORT, () => console.log('serveur du Bureau (base de test) sur ' + O));

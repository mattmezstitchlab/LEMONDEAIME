/* Le site complet, en local, sur une base de TEST : les fichiers construits (dist/) et les VRAIS gestionnaires du serveur
   (/api/auth, /lien, /api/buro, /api/fournisseurs, /api/projets), branchés sur BASE_TEST_URL. Seul l'envoi d'e-mail est remplacé :
   le lien de connexion est gardé en mémoire et se lit sur /__test/lien?email=… (route qui n'existe que dans ce serveur de test).
   Usage : npm run build ; BASE_TEST_URL=postgres://…?sslmode=disable PORT=8774 node tests/base/serveur-local.mjs
   Garde-fou : refuse toute base sans la table aime_base_de_test. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.BASE_TEST_URL, PORT = Number(process.env.PORT || 8774);
if (!URL_BASE) { console.error('BASE_TEST_URL manquant : ce serveur ne tourne que sur une base de test.'); process.exit(2); }
const sonde = new pg.Client({ connectionString: URL_BASE }); await sonde.connect();
if (!(await sonde.query("select to_regclass('public.aime_base_de_test') as t")).rows[0].t) { console.error('Refus : cette base n’est pas marquée comme base de test.'); process.exit(3); }
await sonde.end();
Object.assign(process.env, { DATABASE_URL: URL_BASE, BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), BETTER_AUTH_URL: 'http://localhost:' + PORT });
const A = await import('../../api/_auth/auth.mjs');
const comptes = (await import('../../api/comptes.mjs')).default, buro = (await import('../../api/buro.mjs')).default;
const fournisseurs = (await import('../../api/fournisseurs.mjs')).default, projets = (await import('../../api/projets.mjs')).default;
const liens = new Map();
A._envoyeur(async m => { const l = /https?:\/\/\S+\/lien\/\S+/.exec(m.text || ''); if (l) liens.set(String(m.to).toLowerCase(), l[0]); });

const DIST = join(process.cwd(), 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
async function statique(u, res) {
  let f = normalize(join(DIST, decodeURIComponent(u.pathname))); if (!f.startsWith(DIST)) { res.statusCode = 403; return res.end(); }
  let corps = await readFile(f).catch(() => null);
  if (!corps || u.pathname.endsWith('/')) { f = join(DIST, 'index.html'); corps = await readFile(f); }   /* le site est une application à une page : toute adresse inconnue rend l'accueil */
  res.setHeader('Content-Type', TYPES[extname(f)] || 'application/octet-stream'); res.end(corps);
}
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:' + PORT);
  try {
    if (u.pathname === '/__test/lien') { const l = liens.get(String(u.searchParams.get('email') || '').toLowerCase()); res.statusCode = l ? 200 : 404; return res.end(l || ''); }
    if (u.pathname.startsWith('/lien/')) { req.url = '/api/comptes?__lien=' + encodeURIComponent(u.pathname.slice(6)).replace(/%2F/g, '/'); return await comptes(req, res); }
    if (u.pathname.startsWith('/api/auth/')) return await comptes(req, res);
    if (u.pathname === '/api/buro') return await buro(req, res);
    if (u.pathname === '/api/fournisseurs') return await fournisseurs(req, res);
    if (u.pathname === '/api/projets') { res.status = c => { res.statusCode = c; return res; }; res.json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); }; req.query = Object.fromEntries(u.searchParams); return await projets(req, res); }
    if (u.pathname.startsWith('/api/')) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end('{"ok":false}'); }
    return await statique(u, res);
  } catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end('erreur'); } }
}).listen(PORT, () => console.log('serveur de test prêt sur http://localhost:' + PORT));

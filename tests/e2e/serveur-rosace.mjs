/** Aperçu local du build, sans API ni base : mêmes entrées SPA /studio et /projets que les rewrites existants.
 * npm run build && PORT=4173 node tests/e2e/serveur-rosace.mjs
 * Ce serveur ne configure aucun déploiement Vercel et ne teste ni comptes ni données distantes.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dist = fileURLToPath(new URL('../../dist/', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.m4a': 'audio/mp4', '.mp4': 'video/mp4', '.gz': 'application/gzip', '.wasm': 'application/wasm' };
createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url || '/', 'http://aperçu.invalid').pathname);
    if (p.startsWith('/api/')) { res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' }); res.end('API absente de cet aperçu local'); return; }
    if (p === '/studio') { res.writeHead(302, { location: '/studio/' }); res.end(); return; }
    let fichier = path.resolve(dist, '.' + (p.endsWith('/') ? p + 'index.html' : p));
    if (!fichier.startsWith(dist)) { res.writeHead(403); res.end(); return; }
    try { if (!(await stat(fichier)).isFile()) throw new Error('pas un fichier'); }
    catch {
      if (path.extname(p)) { res.writeHead(404); res.end(); return; }
      fichier = path.join(dist, p.startsWith('/studio/') ? 'studio/index.html' : 'index.html');
    }
    res.writeHead(200, { 'content-type': mime[path.extname(fichier)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(fichier));
  } catch { res.writeHead(500); res.end('Aperçu indisponible'); }
}).listen(port, '0.0.0.0', () => console.log(`Aperçu local sur le port ${port} : /projets/brode-way?experience=rosace`));

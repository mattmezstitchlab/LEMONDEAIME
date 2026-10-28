/* Applique UNE migration SQL à la base désignée par MIGRATION_URL (jamais lue ailleurs, jamais affichée).
   Usage : MIGRATION_URL=<base> node db/appliquer.mjs db/migrations/<fichier>.sql --oui
   Sans --oui : affiche seulement le fichier et l'hôte visés. À faire d'abord sur une branche Neon de test, puis sur une
   branche de sauvegarde de la production (« sauvegarde-avant-… »), enfin sur la production. */
import { readFileSync } from 'node:fs';
import pg from 'pg';
const [fichier] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const url = process.env.MIGRATION_URL;
if (!fichier || !url) { console.error('Usage : MIGRATION_URL=<base> node db/appliquer.mjs <fichier.sql> --oui'); process.exit(2); }
/* pg ne connaît pas channel_binding : on le retire, où qu'il soit dans l'adresse (« ?channel_binding=…&sslmode=… » compris) */
export const sansChannelBinding = u => u.replace(/([?&])channel_binding=[^&]*&?/, '$1').replace(/[?&]$/, '');
const sql = readFileSync(fichier, 'utf8'), hote = new URL(url).hostname.split('.')[0];
console.log('migration :', fichier, '· base :', hote);
if (!process.argv.includes('--oui')) { console.log('(rien n\'est appliqué sans --oui)'); process.exit(0); }
if (process.env.NEON_WS_MODULES) { const { brancher } = await import('../tests/base/connexion.mjs'); await brancher(); }
const c = new pg.Client({ connectionString: sansChannelBinding(url), ssl: { rejectUnauthorized: true } });
await c.connect();
try { await c.query(sql); console.log('appliquée.'); } catch (e) { console.error('ÉCHEC, rien n\'est appliqué (transaction annulée) :', e.message); process.exitCode = 1; } finally { await c.end(); }

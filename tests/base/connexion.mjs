/* La connexion des tests sur base réelle.
   Par défaut : pg, en TCP (port 5432). Quand ce port est fermé (certains environnements de travail), on passe par le
   pilote Neon sur WebSocket (port 443), à travers le proxy HTTPS de l'environnement : même base, même SQL, mêmes transactions.
   NEON_WS_MODULES : un dossier où sont installés « ws » et « https-proxy-agent » (hors du dépôt). */
import pg from 'pg';
import { createRequire } from 'node:module';
import { join } from 'node:path';

export async function brancher() {
  const dossier = process.env.NEON_WS_MODULES;
  if (!dossier) return 'TCP';
  const exiger = createRequire(join(dossier, 'package.json'));
  const WS = exiger('ws'), { HttpsProxyAgent } = exiger('https-proxy-agent');
  const { Pool, Client, neonConfig } = await import('@neondatabase/serverless');
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  neonConfig.webSocketConstructor = proxy ? class extends WS { constructor(u, p) { super(u, p, { agent: new HttpsProxyAgent(proxy) }); } } : WS;
  pg.Pool = Pool; pg.Client = Client;   /* les modules qui font « new pg.Pool » (auth) prennent la même connexion */
  return 'WebSocket Neon';
}

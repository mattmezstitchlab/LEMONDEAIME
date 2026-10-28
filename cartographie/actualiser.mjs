/* Actualise toute la carte et ses preuves, dans l'ordre : construire le site, le servir en local,
   lancer chaque parcours de bout en bout, relire le dépôt (inventaire, lecture publique), lancer les tests serveur.
   Usage : npm run carte:tout     (Playwright pour Python requis ; aucune base, aucune clé)
   La vérification déployée de l'inspection se lance à part : tests/deploiement/inspection.mjs. */
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || '4610';
const etape = (nom, cmd, args, env = {}) => {
  console.log('\n— ' + nom);
  const r = spawnSync(cmd, args, { cwd: RACINE, stdio: 'inherit', env: { ...process.env, ...env } });
  return r.status === 0;
};
const echecs = [];
if (!etape('construire', 'npm', ['run', 'build'])) process.exit(1);
const serveur = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], { cwd: RACINE, stdio: 'ignore', detached: true });
try {
  for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:' + PORT + '/')).ok) break; } catch { /* pas encore prêt */ } await new Promise(r => setTimeout(r, 500)); }
  for (const f of readdirSync(new URL('../tests/e2e/', import.meta.url)).filter(f => f.endsWith('.py') && f !== 'preuves.py').sort())
    if (!etape('parcours ' + f, 'python3', ['tests/e2e/' + f], { BASE: 'http://localhost:' + PORT })) echecs.push(f);
} finally { try { process.kill(-serveur.pid); } catch { /* déjà arrêté */ } }
if (!etape('relire le dépôt', 'node', ['cartographie/scanner.mjs'])) echecs.push('scanner');
if (!etape('tests serveur et preuves', 'node', ['cartographie/preuves-serveur.mjs'])) echecs.push('tests serveur');
console.log(echecs.length ? '\nÀ reprendre : ' + echecs.join(', ') : '\nCarte et preuves à jour.');
process.exit(echecs.length ? 1 : 0);

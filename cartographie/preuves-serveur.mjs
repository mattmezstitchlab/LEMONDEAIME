/* Lance les tests serveur et enregistre leur résultat dans cartographie/preuves.json (un fichier de test par entrée),
   pour que la carte puisse dire « réussi le …, commit … » au lieu de « devrait passer ».
   Usage : node cartographie/preuves-serveur.mjs */
import { run } from 'node:test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const fichiers = readdirSync(join(RACINE, 'tests/server')).filter(f => f.endsWith('.test.mjs')).map(f => join(RACINE, 'tests/server', f));
const par = {};
await new Promise((ok, ko) => {
  const flux = run({ files: fichiers, concurrency: 1 });
  const note = (d, reussi) => { if (d.nesting !== 0 || !d.file) return; const f = 'tests/server/' + d.file.split('/').pop(); (par[f] ||= []).push({ test: d.name, ok: reussi }); };
  flux.on('test:pass', d => note(d, true)); flux.on('test:fail', d => note(d, false));
  flux.on('end', ok); flux.on('error', ko); flux.resume();
});
const git = a => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim();
const chemin = join(RACINE, 'cartographie/preuves.json');
let tout = {}; try { tout = JSON.parse(readFileSync(chemin, 'utf8')); } catch { /* premier enregistrement */ }
const modifie = git(['status', '--porcelain', '--', 'src', 'api', 'tests']) !== '';
for (const [f, resultats] of Object.entries(par)) tout[f] = { date: new Date().toISOString().slice(0, 10), commit: git(['rev-parse', '--short', 'HEAD']), code_modifie_depuis_le_commit: modifie, environnement: 'node --test, sans base ni clé', resultats };
writeFileSync(chemin, JSON.stringify(Object.fromEntries(Object.entries(tout).sort()), null, 1) + '\n');
const n = Object.values(par).flat();
console.log('preuves serveur :', n.filter(x => x.ok).length + '/' + n.length, 'réussis');
process.exit(n.every(x => x.ok) ? 0 : 1);

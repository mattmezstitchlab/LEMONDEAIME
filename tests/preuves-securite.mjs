/* Enregistre dans docs/securite/preuves.json le résultat daté (commit, environnement) des tests de sécurité sans base :
   les tests serveur (node --test) et les tests StudiO du cloisonnement (vitest). Les tests sur base réelle et le parcours
   d'interface enregistrent eux-mêmes leur preuve (tests/base/securite.mjs, tests/e2e/securite.py).
   Usage : node tests/preuves-securite.mjs */
import { run } from 'node:test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const git = a => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim();
const entete = env => ({ date: new Date().toISOString().slice(0, 10), commit: git(['rev-parse', '--short', 'HEAD']), code_modifie_depuis_le_commit: git(['status', '--porcelain', '--', 'src', 'api', 'tests', 'studio/src']) !== '', environnement: env });
const par = {};
await new Promise((ok, ko) => {
  const flux = run({ files: ['tests/server/securite.test.mjs', 'tests/server/analyse.test.mjs'].map(f => join(RACINE, f)), concurrency: 1 });
  const note = (d, r) => { if (d.nesting !== 0 || !d.file) return; (par['tests/server/' + d.file.split('/').pop()] ||= []).push({ test: d.name, ok: r }); };
  flux.on('test:pass', d => note(d, true)); flux.on('test:fail', d => note(d, false)); flux.on('end', ok); flux.on('error', ko); flux.resume();
});
let vitest = { testResults: [] };
try { vitest = JSON.parse(execFileSync('npx', ['vitest', 'run', '--reporter=json', 'src/__tests__/cloisonnement.test.ts', 'src/__tests__/cloisonnementBibliotheque.test.ts', 'src/__tests__/aimeSync.test.ts'], { cwd: join(RACINE, 'studio'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); }
catch (e) { try { vitest = JSON.parse(e.stdout); } catch { /* rien */ } }
for (const f of vitest.testResults || []) par['studio/src/__tests__/' + f.name.split('/').pop()] = f.assertionResults.map(a => ({ test: a.title, ok: a.status === 'passed' }));
const dossier = join(RACINE, 'docs/securite'); mkdirSync(dossier, { recursive: true });
const chemin = join(dossier, 'preuves.json');
let tout = {}; try { tout = JSON.parse(readFileSync(chemin, 'utf8')); } catch { /* premier enregistrement */ }
for (const [f, resultats] of Object.entries(par)) tout[f] = { ...entete(f.startsWith('studio') ? 'vitest (StudiO), IndexedDB et serveur simulés' : 'node --test, sans base ni clé'), resultats };
writeFileSync(chemin, JSON.stringify(Object.fromEntries(Object.entries(tout).sort()), null, 1) + '\n');
const n = Object.values(par).flat();
console.log('preuves de sécurité :', n.filter(x => x.ok).length + '/' + n.length, 'réussis');
process.exit(n.length && n.every(x => x.ok) ? 0 : 1);

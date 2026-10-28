/* Vérifie, sur un déploiement réel, ce qui peut l'être sans compte : /api/systeme refuse sans session (401),
   n'accepte que la lecture (405 sinon), ne se met pas en cache, et le code public ne contient rien de l'inspection.
   Usage : BASE=https://<déploiement> [VERCEL_SHARE=<jeton de partage, jamais committé>] node tests/deploiement/inspection.mjs
   Le refus d'un compte non autorisé (403) et l'accès autorisé (200) demandent une vraie session : ils restent à faire à la main. */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = (process.env.BASE || '').replace(/\/$/, '');
if (!BASE) { console.error('BASE manquant'); process.exit(2); }
let cookie = '';
if (process.env.VERCEL_SHARE) {
  const r = await fetch(BASE + '/?_vercel_share=' + process.env.VERCEL_SHARE, { redirect: 'manual' });
  cookie = (r.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
}
const h = extra => ({ ...(cookie ? { cookie } : {}), ...extra });
const resultats = [];
const ok = (c, test) => { console.log((c ? 'OK ' : 'ÉCHEC ') + test); resultats.push({ test, ok: !!c }); };

let r = await fetch(BASE + '/api/systeme', { headers: h() });
const j = await r.json().catch(() => ({}));
ok(r.status === 401 && j.ok === false && !j.reseau, 'déploiement : sans session, /api/systeme refuse (401) sans rien montrer');
ok(/no-store/.test(r.headers.get('cache-control') || ''), 'déploiement : la réponse d’inspection n’est jamais mise en cache');
r = await fetch(BASE + '/api/systeme', { headers: h({ cookie: (cookie ? cookie + '; ' : '') + 'better-auth.session_token=faux.jeton' }) });
ok(r.status === 401, 'déploiement : une fausse session est refusée (401)');
r = await fetch(BASE + '/api/systeme', { method: 'POST', headers: h({ 'content-type': 'application/json', origin: BASE }), body: '{}' });
ok(r.status === 405, 'déploiement : /api/systeme ne fait que lire (405 pour une écriture)');
const page = await (await fetch(BASE + '/systeme-nerveux', { headers: h() })).text();
const js = /\/assets\/index-[\w-]+\.js/.exec(page)?.[0];
const code = js ? await (await fetch(BASE + js, { headers: h() })).text() : '';
const fuites = ['tests/e2e', 'tests/server', 'api/musique.mjs', 'src/charte/', 'Base · table', 'Navigateur · stockage', 'AIME_INSPECTION', 'Deux boutons « Déconnexion »'].filter(s => code.includes(s));
if (fuites.length) console.log('trouvé dans le code public :', fuites.join(', '));
ok(code.length > 10000 && fuites.length === 0, 'déploiement : le code public ne contient rien de l’inspection');

const chemin = new URL('../../cartographie/preuves.json', import.meta.url);
const tout = JSON.parse(readFileSync(chemin, 'utf8'));
const commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
tout['tests/deploiement/inspection.mjs'] = { date: new Date().toISOString().slice(0, 10), commit, environnement: 'déploiement Vercel ' + new URL(BASE).host.replace(/-[a-z0-9]+-projects\.vercel\.app$/, ''), resultats };
writeFileSync(chemin, JSON.stringify(Object.fromEntries(Object.entries(tout).sort()), null, 1) + '\n');
process.exit(resultats.every(x => x.ok) ? 0 : 1);

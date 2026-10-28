/* Le scanner du système nerveux : il lit le dépôt (jamais la base, jamais les variables d'environnement) et en tire
   l'inventaire factuel du site : routes, commandes et leurs points d'entrée, docks par page, appels d'API,
   méthodes et actions des fonctions serveur, tables touchées, stockages locaux, événements, tests.
   Usage : node cartographie/scanner.mjs   → réécrit cartographie/inventaire.json
   Le test tests/server/cartographie.test.mjs vérifie que l'inventaire committé est à jour. */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = fileURLToPath(new URL('..', import.meta.url));
const lire = f => readFileSync(join(RACINE, f), 'utf8');
function fichiers(dossier, ext) {
  const out = [];
  const marche = d => { for (const n of readdirSync(join(RACINE, d)).sort()) {
    const r = d + '/' + n; const s = statSync(join(RACINE, r));
    if (s.isDirectory()) { if (!/node_modules|dist|__tests__/.test(n)) marche(r); } else if (ext.some(e => n.endsWith(e))) out.push(r);
  } };
  marche(dossier); return out;
}
const lignes = s => s.split('\n');
const uniq = a => [...new Set(a)];

/* ——— les routes du site (src/App.tsx) ——— */
function routes() {
  const s = lire('src/App.tsx');
  const fixes = [...s.matchAll(/^\s+'(\/[^']*)': \[([^,]+),\s*'([^']*)'\]/gm)].map(m => ({ route: m[1], composant: m[2].replace(/\(\) => <(\w+) \/>/, '$1').trim(), titre: m[3] }));
  const motifs = [...s.matchAll(/\/\^\\\/(\w+)\\\/\(\[a-z0-9-\]\{1,60\}\)\$\/\.exec\(chemin\)/g)].map(m => ({ route: '/' + m[1] + '/:id', composant: m[1] === 'reseau' ? 'FicheReseau' : m[1] === 'moments' ? 'Moments' : m[1], titre: '' }));
  const anciennes = Object.keys(JSON.parse('{' + (/ANCIENNES[^=]*= \{([^}]*)\}/.exec(s)?.[1] || '').replace(/'/g, '"') + '}'));
  return { pages: [...fixes, ...motifs], anciennes, studio: '/studio/*' };
}

/* ——— les commandes : chaque lien interne écrit dans le code, avec son libellé et son point d'entrée ——— */
const DESTINATION = /'(\/(?!\/|api\/|media\/|assets\/)[a-z0-9\-/?=&#%.]*)'|"(\/(?!\/|api\/|media\/|assets\/)[a-z0-9\-/?=&#%.]*)"/gi;
function libelle(texte, cible, k = 0) {
  const ligne = texte.replace(/=>/g, '⇒');
  const t = [
    new RegExp("\\['([^'\\]]{1,60})',\\s*'" + esc(cible) + "'"), new RegExp("\\['([^'\\]]{1,60})',\\s*'[^']*',\\s*'" + esc(cible) + "'"), new RegExp("\\['" + esc(cible) + "',\\s*'([^']{1,60})'"),
    new RegExp("href=[\"'{]+" + esc(cible) + "[\"'}]+[^>]*>([^<{]{1,60})<"), new RegExp("aria-label=\"([^\"]{1,80})\"[^>]*href=[\"']" + esc(cible)),
    new RegExp("href=[\"'{]+" + esc(cible) + "[\"'}]+[^>]*aria-label=\"([^\"]{1,80})\""),
  ];
  for (const r of t) { const ms = [...ligne.matchAll(new RegExp(r.source, 'g'))]; const m = ms[Math.min(k, ms.length - 1)]; if (m && m[1].trim()) return m[1].replace(/\s+/g, ' ').trim(); }
  return null;
}
function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function composantA(texte, n) {   /* le composant React qui contient la ligne n */
  const L = lignes(texte); for (let i = n; i >= 0; i--) { const m = /^(?:export (?:default )?)?function (\w+)|^const ([A-Z]\w+) = /.exec(L[i]); if (m) return m[1] || m[2]; }
  return null;
}
function commandes() {
  const out = [];
  for (const f of fichiers('src', ['.tsx']).filter(f => !/src\/(App|lib\/router)\.tsx$/.test(f))) {   /* App déclare les routes, le routeur les sert : ce ne sont pas des commandes */
    const s = lire(f); const L = lignes(s);
    L.forEach((ligne, i) => {
      if (/^\s*(\/\/|\/\*|\*)/.test(ligne)) return;
      const vus = {};
      for (const m of ligne.matchAll(DESTINATION)) {
        const cible = m[1] || m[2]; const k = vus[cible] = (vus[cible] ?? -1) + 1;
        if (/\.(jpg|png|webp|svg|mp3)$/i.test(cible) || cible.length < 2 && cible !== '/') continue;
        const route = '/' + (cible.split(/[?#]/)[0].split('/')[1] || '');
        out.push({ cible, route, libelle: libelle(L.slice(i, i + 4).join(' '), cible, k), fichier: f, ligne: i + 1, composant: composantA(s, i) });
      }
    });
  }
  return out;
}

/* ——— les docks : quelles pages montrent le dock du haut, le dock du bas, ses lieux et ses modes ——— */
function docks() {
  return fichiers('src/pages', ['.tsx']).map(f => {
    const s = lire(f);
    const bas = (s.match(/<DockBas\b/g) || []).length;
    return { fichier: f, tete: /<Tete\b/.test(s), verbes: /verbes=\{<VerbesSite/.test(s), dockBas: bas, dockBasLieux: /<DockBas[^\n]*lieux=/.test(s), dockBasContenuPropre: (s.match(/<\/DockBas>/g) || []).length,
      modes: uniq([...s.matchAll(/modes=\{\[\{ id: '(\w+)'/g)].map(m => m[1])), pied: /<Pied\b/.test(s) };
  });
}

/* ——— les appels d'API depuis le navigateur ——— */
function appels() {
  const out = [];
  for (const f of [...fichiers('src', ['.ts', '.tsx', '.mjs'])]) {
    const s = lire(f);
    lignes(s).forEach((l, i) => { for (const m of l.matchAll(/['"`](\/api\/[a-z]+)[?'"`/]/g)) out.push({ api: m[1], fichier: f, ligne: i + 1 }); });
  }
  return out;
}

/* ——— les fonctions serveur : méthodes, actions, paramètres, tables ——— */
function serveur() {
  const tous = fichiers('api', ['.mjs', '.cjs']);
  const creees = uniq(tous.flatMap(f => [...lire(f).matchAll(/create table if not exists "?(\w+)"?/gi)].map(m => m[1])));
  const connues = uniq([...creees, 'user', 'session', 'account', 'verification', 'passkey', 'spaces', 'space_members']);
  return tous.filter(f => !/\/_/.test(f.slice(3)) || /_auth\/auth/.test(f)).map(f => {
    const s = lire(f);
    const tables = connues.filter(t => new RegExp('\\b(from|into|update|join|table if not exists)\\s+"?' + t + '"?\\b', 'i').test(s)).sort();
    const ecrit = connues.filter(t => new RegExp('\\b(into|update|delete from)\\s+"?' + t + '"?\\b', 'i').test(s)).sort();
    return {
      fichier: f, route: f.startsWith('api/_') ? null : '/api/' + f.slice(4).replace(/\.m?c?js$/, ''),
      methodes: uniq([...s.matchAll(/req\.method [!=]== '(\w+)'/g)].map(m => m[1])).sort(),
      actions: uniq([...s.matchAll(/action === '([\w-]+)'/g)].map(m => m[1])).sort(),
      parametres: uniq([...s.matchAll(/param\(url, '(\w+)'\)|searchParams\.get\('(\w+)'\)/g)].map(m => m[1] || m[2])).sort(),
      tables, ecrit, session: /personne\(req\)/.test(s), quotas: uniq([...s.matchAll(/quota\('([\w:]+)'/g)].map(m => m[1])).sort(),
      configuration: /process\.env\./.test(s),   /* la présence seulement : jamais les noms ni les valeurs */
    };
  });
}

/* ——— ce que le navigateur garde, et les événements qui circulent ——— */
function stockages() {
  return fichiers('src', ['.ts', '.tsx']).flatMap(f => [...lire(f).matchAll(/const CLE = '([\w-]+)'/g)].map(m => ({ cle: m[1], fichier: f })));
}
function evenements() {
  const out = [];
  for (const f of fichiers('src', ['.ts', '.tsx'])) {
    const s = lire(f);
    const evt = /const EVT = '([\w:-]+)'/.exec(s)?.[1];
    for (const m of s.matchAll(/new CustomEvent(?:<[^>]+>)?\(([^,)]+)/g)) { const n = m[1].trim(); out.push({ nom: n === 'EVT' && evt ? evt : n.replace(/^'|'$/g, ''), fichier: f, sens: 'emet' }); }
    for (const m of s.matchAll(/addEventListener\((EVT|'[\w:-]+')/g)) { const n = m[1] === 'EVT' ? evt : m[1].slice(1, -1); if (n && !/^(scroll|resize|keydown|click|dragover|drop|pointer\w*|touch\w*|focus\w*|mouse\w*)$/.test(n)) out.push({ nom: n, fichier: f, sens: 'ecoute' }); }
  }
  return uniq(out.map(x => JSON.stringify(x))).map(x => JSON.parse(x));
}

/* ——— les tests ——— */
function tests() {
  const serveurs = fichiers('tests/server', ['.mjs']).map(f => ({ fichier: f, tests: [...lire(f).matchAll(/^test\('((?:[^'\\]|\\.)+)'/gm)].map(m => m[1].replace(/\\'/g, "'")) }));
  const e2e = fichiers('tests/e2e', ['.py']).map(f => ({ fichier: f, tests: [...lire(f).matchAll(/\bok\((?:[^()']|'(?:[^'\\]|\\.)*'|\((?:[^()]|\([^()]*\))*\))*?,\s*'((?:[^'\\]|\\.)+)'(?:\s*%[^)]*)?\)/g)].map(m => m[1]).filter(n => !/^\(|^%/.test(n)) }));
  const studio = fichiers('studio/src', ['.test.ts', '.test.tsx']).map(f => ({ fichier: f, nombre: (lire(f).match(/^\s*(it|test)\(/gm) || []).length }));
  const deploiement = fichiers('tests/deploiement', ['.mjs']).map(f => ({ fichier: f, tests: [...lire(f).matchAll(/\bok\([^;]*?,\s*'((?:[^'\\]|\\.)+)'\)/g)].map(m => m[1]) }));
  /* sur une vraie base (branche Neon de test isolée) : mêmes conventions que les vérifications déployées */
  const base = fichiers('tests/base', ['.mjs']).map(f => ({ fichier: f, tests: [...lire(f).matchAll(/\bok\([^;]*?,\s*'((?:[^'\\]|\\.)+)'\)/g)].map(m => m[1]) })).filter(f => f.tests.length);
  return { serveur: serveurs, e2e, deploiement, base, studio };
}

export function scanner() {
  return { routes: routes(), commandes: commandes(), docks: docks(), appels: appels(), serveur: serveur(), stockages: stockages(), evenements: evenements(), tests: tests() };
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === '') {
  const inv = scanner();
  writeFileSync(join(RACINE, 'cartographie/inventaire.json'), JSON.stringify(inv, null, 1) + '\n');
  /* la lecture publique, seule à entrer dans le site : le fonctionnement, sans les entrailles */
  const { projeterPublic } = await import('./outils.mjs');
  writeFileSync(join(RACINE, 'src/data/systeme-public.json'), JSON.stringify(projeterPublic(JSON.parse(lire('cartographie/reseau.json'))), null, 1) + '\n');
  console.log('inventaire :', inv.routes.pages.length, 'routes,', inv.commandes.length, 'commandes,', inv.serveur.length, 'fonctions serveur,', inv.tests.serveur.reduce((t, x) => t + x.tests.length, 0), 'tests serveur');
}

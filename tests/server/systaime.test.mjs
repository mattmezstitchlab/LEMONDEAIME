// SYST'AIME : le manifeste, son validateur, sa version publique et l'accès au détail interne.
// Les tests négatifs sont l'essentiel : un manifeste qui ment doit être REFUSÉ.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { valider, gitParDefaut, importe } from '../systaime/valider.mjs';
import { etiquette, projeter, INTERDITS_PUBLIC } from '../../api/_systaime.mjs';
import { traiter } from '../../api/systaime.mjs';

const R = new URL('../../', import.meta.url).pathname;
const lire = f => readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const charger = () => JSON.parse(lire('docs/systaime/manifeste.interne.json'));
const refuse = (m, code, opt) => { const r = valider(m, opt); assert.ok(r.erreurs.some(x => x.startsWith(code)), 'attendu ' + code + ', obtenu : ' + JSON.stringify(r.erreurs.slice(0, 3))); };
const regle = (m, id) => m.rules.find(r => r.id === id);

test('systaime : le manifeste v0.3 est valide, avec 64 cases et des chemins qui existent', () => {
  const m = charger();
  const r = valider(m);
  assert.deepEqual(r.erreurs, []);
  assert.equal(m.rules.length, 64);
  assert.equal(m.rules.filter(x => x.kind === 'croisement').length, 36);
  assert.equal(m.rules.filter(x => x.kind === 'garde-fou').length, 28);
  assert.equal(m.rules.filter(x => x.validation_fonctionnelle.etat === 'validee').length, 0, 'aucune case n’est validée tant qu’une personne ne l’a pas fait');
  assert.equal(m.approuve_manifeste, false);
  assert.equal(m.responsabilite.fonctionnel.approuve, false);
});

test('systaime : à l’état courant du dépôt, aucune case n’est « à revérifier » (fraîcheur)', () => {
  const r = valider(charger(), { strict: process.env.SYSTAIME_STRICT === '1' });
  const autres = Object.entries(r.fraicheur).filter(([, v]) => v.etat !== 'a_jour_au_commit_valide' && v.etat !== 'sans_objet');
  assert.deepEqual(autres.map(([id, v]) => id + ' : ' + v.etat + ' ' + v.cause.join(',')), []);
});

test('systaime : les libellés affichés sont DÉRIVÉS des quatre axes (un test réussi n’est pas une validation)', () => {
  const m = charger();
  const t = m.rules.find(r => r.derniere_execution.etat === 'reussie' && r.couverture.etat === 'tests-lies');
  assert.equal(etiquette(t), 'teste-reussi');
  const v = structuredClone(t); v.validation_fonctionnelle = { etat: 'validee', par: 'X', date: '2026-11-01', commit: 'c', portee: 'rosace' };
  assert.equal(etiquette(v), 'validee');
  const p = structuredClone(t); p.couverture = { etat: 'aucun-test-relie', tests: [] };
  assert.equal(etiquette(p), 'present-sans-test');
  const f = structuredClone(t); f.fraicheur = { etat: 'a_reverifier' };
  assert.equal(etiquette(f), 'a-reverifier');
  const e = structuredClone(t); e.derniere_execution = { etat: 'echouee' };
  assert.equal(etiquette(e), 'test-echoue');
});

/* ——— refus : chaque mensonge est attrapé ——— */
test('systaime N-1 : un chemin cité qui n’existe pas est refusé', () => { const m = charger(); regle(m, 'restitution.composants').existence.fichiers[0].path = 'studio/src/lib/pdf-fantome.ts'; refuse(m, 'V-03'); });
test('systaime N-2 : une empreinte illisible est refusée', () => { const m = charger(); regle(m, 'restitution.composants').existence.fichiers[0].blob = 'abc'; refuse(m, 'V-03'); });
test('systaime N-3 : « tests liés » sans test est refusé', () => { const m = charger(); const r = regle(m, 'restitution.tests'); r.couverture.tests = []; refuse(m, 'V-04'); });
test('systaime N-4 : une exécution réussie sans date, commit ni commande est refusée', () => { const m = charger(); const r = regle(m, 'restitution.tests'); r.derniere_execution = { etat: 'reussie' }; refuse(m, 'V-05'); });
test('systaime N-5 : « opérationnel » sans test relié et exécution réussie est refusé', () => { const m = charger(); const r = regle(m, 'visuel.versions'); r.appreciation_audit.statut = 'operationnel'; refuse(m, 'V-06'); });
test('systaime N-6 : un libellé saisi à la main est refusé', () => { const m = charger(); regle(m, 'visuel.tokens').etiquette = 'Validé'; refuse(m, 'V-02'); });
test('systaime N-7 : le nombre de cases est figé (63 est refusé)', () => { const m = charger(); m.rules.pop(); refuse(m, 'V-01'); });
test('systaime N-8 : un croisement manquant est refusé', () => { const m = charger(); regle(m, 'memoire.tests').id = 'memoire.autre'; refuse(m, 'V-01'); });
test('systaime N-9 : un fichier référencé modifié depuis la validation rend la case « à revérifier »', () => {
  const m = charger(); const cible = regle(m, 'restitution.composants').existence.fichiers[0].path;
  const vrai = gitParDefaut(R);
  const git = a => (a[0] === 'hash-object' && a[2] === cible ? 'f'.repeat(40) : vrai(a));
  const r = valider(m, { git });
  assert.equal(r.fraicheur['restitution.composants'].etat, 'a_reverifier');
  assert.ok(r.avertissements.some(x => x.includes('restitution.composants')), 'signalé');
  assert.deepEqual(r.erreurs, [], 'hors mode strict, c’est un signal et non un échec');
  refuse(m, 'V-14', { git, strict: true });
});
test('systaime N-9b : un test référencé modifié rend la case « à revérifier »', () => {
  const m = charger(); const cible = regle(m, 'restitution.tests').couverture.tests[0].path; const vrai = gitParDefaut(R);
  const r = valider(m, { git: a => (a[0] === 'hash-object' && a[2] === cible ? 'e'.repeat(40) : vrai(a)) });
  assert.equal(r.fraicheur['restitution.tests'].etat, 'a_reverifier');
});
test('systaime N-9c : la cible d’une dépendance technique modifiée rend la case dépendante « à revérifier » (un cran)', () => {
  const m = charger(); const d = m.dependances.find(x => x.type === 'import_technique' && x.fichier_de === 'studio/src/lib/pdf.ts' && x.fichier_a === 'studio/src/lib/pattern.ts'); assert.ok(d);
  const vrai = gitParDefaut(R);
  const r = valider(m, { git: a => (a[0] === 'hash-object' && a[2] === d.fichier_a ? 'd'.repeat(40) : vrai(a)) });
  assert.equal(r.fraicheur['restitution.composants'].etat, 'a_reverifier', 'pdf.ts n’a pas changé, mais pattern.ts qu’il importe, si');
});
test('systaime N-10 : une validation fonctionnelle sans nom, date, commit ou portée est refusée', () => {
  for (const manque of ['par', 'date', 'commit', 'portee']) {
    const m = charger(); const v = { etat: 'validee', par: 'Matt', date: '2026-11-01', commit: 'abc', portee: 'rosace' }; delete v[manque];
    regle(m, 'restitution.tests').validation_fonctionnelle = v; refuse(m, 'V-17');
  }
});
test('systaime N-11 : la portée « tout-le-composant » sans test ciblé est refusée', () => {
  const m = charger(); regle(m, 'visuel.versions').validation_fonctionnelle = { etat: 'validee', par: 'Matt', date: '2026-11-01', commit: 'abc', portee: 'tout-le-composant' }; refuse(m, 'V-17');
});
test('systaime N-12 : confondre responsabilité fonctionnelle et droits d’accès est refusé', () => {
  let m = charger(); m.responsabilite.fonctionnel.roles = ['admin']; refuse(m, 'V-16');
  m = charger(); delete m.responsabilite.acces.roles_techniques; refuse(m, 'V-16');
  m = charger(); m.responsabilite.fonctionnel.approuve = true; refuse(m, 'V-16');
  m = charger(); m.approuve_manifeste = true; refuse(m, 'V-16');
});
test('systaime N-13 : un détail d’audit dans la version publique est refusé', () => {
  const m = charger(); regle(m, 'visuel.tokens').public.resume = 'voir studio/src/design/aime.css'; refuse(m, 'V-19');
  const s = charger(); regle(s, 'g.confidentialite').public.resume = 'la politique de confidentialité'; refuse(s, 'V-08');
});
test('systaime N-14 : une dépendance métier vers une cible inconnue est refusée', () => {
  const m = charger(); m.dependances.find(d => d.type === 'dependance_metier').a = 'fantome'; refuse(m, 'V-18');
});
test('systaime N-15 : un « import technique » sans import réel est refusé', () => {
  const m = charger(); m.dependances.find(d => d.type === 'import_technique').module_a = 'lib/inexistant-du-tout'; refuse(m, 'V-18');
});
test('systaime N-15b : une dépendance métier validée sans nom ni date est refusée', () => {
  const m = charger(); const d = m.dependances.find(x => x.type === 'dependance_metier'); d.statut = 'validee'; refuse(m, 'V-18');
});
test('systaime N-16 : sans Git, la fraîcheur est « inconnue », jamais « à jour » (et le mode strict échoue)', () => {
  const m = charger(); const git = () => { throw new Error('git absent'); };
  const r = valider(m, { git });
  const suivies = m.rules.filter(x => x.existence.fichiers.length + x.couverture.tests.length > 0).map(x => x.id);
  assert.ok(suivies.length > 30);
  assert.ok(suivies.every(id => r.fraicheur[id].etat === 'inconnu'), 'jamais « à jour » sans pouvoir comparer');
  assert.ok(m.rules.filter(x => !suivies.includes(x.id)).every(x => r.fraicheur[x.id].etat === 'sans_objet'));
  refuse(m, 'V-14', { git, strict: true });
});
test('systaime N-17 : une affirmation d’inventaire que le code dément est refusée', () => {
  let m = charger(); m.composants.find(c => c.id === 'tokens-json').verification = { type: 'importeurs', motif: 'import', max: 0 }; refuse(m, 'V-12');
  m = charger(); m.composants.find(c => c.id === 'galerie-des-vivants').verification.motif = 'texte qui n’existe pas'; refuse(m, 'V-12');
  m = charger(); delete m.composants.find(c => c.id === 'charte').verification; refuse(m, 'V-12');
  m = charger(); m.composants.find(c => c.id === 'charte').inventaire = 'magique'; refuse(m, 'V-12');
});
test('systaime N-18 : un import multi-ligne est bien relu (pdf.ts importe pattern.ts)', () => {
  assert.ok(importe("import {\n  a,\n  b,\n} from './pattern';", 'lib/pattern') === false);
  assert.ok(importe("import {\n  a,\n  b,\n} from './pattern';", 'pattern'));
  assert.ok(importe("import x from '../lib/pattern';", 'lib/pattern'));
  assert.ok(!importe("// from '../lib/pattern'", 'lib/autre'));
});

/* ——— la version publique ——— */
test('systaime : la version publique correspond exactement au manifeste, sans chemin, secret ni détail de sécurité', () => {
  const m = charger(); const pub = projeter(m);
  assert.deepEqual(JSON.parse(lire('src/systaime/publique.json')), pub, 'node tests/systaime/projeter.mjs à relancer');
  const t = JSON.stringify(pub);
  for (const re of INTERDITS_PUBLIC) assert.ok(!re.test(t), 'motif interdit dans la version publique : ' + re);
  assert.equal(pub.cases.length, 64);
  for (const c of pub.cases) assert.ok(!('chemin' in c) && !('path' in c) && !('source' in c) && !('blob' in c));
  for (const id of ['g.confidentialite', 'g.autorisations', 'g.integrite', 'g.import-securise', 'g.deploiement']) assert.equal(pub.cases.find(c => c.id === id).etat, 'reserve', id + ' : détail réservé');
  assert.ok(!('composants' in pub) && !('dependances' in pub), 'ni composants nommés ni dépendances au public');
  for (const mot of ['AIME_ADMIN', 'DATABASE_URL', 'docs/securite', 'blob', 'sha']) assert.ok(!t.includes(mot), mot);
});

test('systaime : le manifeste interne n’est ni dans public/, ni importé par le site (donc ni dans le bundle)', () => {
  const marche = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? marche(p) : [p]; });
  const pub = marche(R + 'public');
  assert.ok(!pub.some(p => /systaime|manifeste/i.test(p)), 'aucun fichier systaime dans public/');
  for (const f of marche(R + 'src').filter(p => /\.(tsx?|css)$/.test(p))) assert.ok(!/manifeste\.interne/.test(readFileSync(f, 'utf8')), f + ' ne doit pas charger le manifeste interne');
  assert.ok(existsSync(R + 'docs/systaime/manifeste.interne.json'));
});

test('systaime : vercel.json réécrit /systaime vers la page et embarque le manifeste avec la seule fonction réservée', () => {
  const v = JSON.parse(lire('vercel.json'));
  const re = v.rewrites.find(x => x.destination === '/index.html' && /systaime/.test(x.source));
  assert.ok(re, 'réécriture de /systaime');
  assert.ok(String(v.functions['api/systaime.mjs'].includeFiles).includes('docs/systaime/manifeste.interne.json'));
  assert.ok(!JSON.stringify(v.rewrites).includes('docs/systaime'), 'aucune réécriture ne sert docs/');
});

/* ——— l’accès au détail interne (auth simulée) ——— */
function reponse() { const h = {}; const r = { statusCode: 0, h, setHeader: (k, v) => { h[k.toLowerCase()] = v; }, end: s => { r.corps = s; } }; return r; }
const appel = async (methode, moi, admins = 'matt@exemple.fr') => { const res = reponse(); await traiter({ method: methode, url: '/api/systaime' }, res, { moi: async () => moi, admins, manifeste: charger }); return { code: res.statusCode, corps: JSON.parse(res.corps), h: res.h }; };

test('systaime api : sans session → 401, sans rien du manifeste', async () => {
  const r = await appel('GET', null);
  assert.equal(r.code, 401); assert.equal(r.corps.ok, false); assert.ok(!('manifeste' in r.corps));
  assert.equal(r.h['cache-control'], 'no-store');
});
test('systaime api : une personne connectée mais hors AIME_ADMIN → 403, sans rien du manifeste', async () => {
  const r = await appel('GET', { email: 'quelquun@exemple.fr' });
  assert.equal(r.code, 403); assert.ok(!('manifeste' in r.corps)); assert.ok(!JSON.stringify(r.corps).includes('studio/'));
});
test('systaime api : sans AIME_ADMIN, personne n’entre (même connecté)', async () => {
  assert.equal((await appel('GET', { email: 'matt@exemple.fr' }, '')).code, 403);
  assert.equal((await appel('GET', { email: 'matt@exemple.fr.pirate' }, 'matt@exemple.fr')).code, 403);
});
test('systaime api : l’administration reçoit le manifeste interne, jamais mis en cache', async () => {
  const r = await appel('GET', { email: 'Matt@Exemple.fr' });
  assert.equal(r.code, 200); assert.equal(r.corps.manifeste.rules.length, 64);
  assert.equal(r.h['cache-control'], 'no-store'); assert.equal(r.h['x-robots-tag'], 'noindex');
});
test('systaime api : ?sante=1 dit seulement si le fichier est embarqué, sans aucun contenu, sans session', async () => {
  const res = reponse(); await traiter({ method: 'GET', url: '/api/systaime?sante=1' }, res, { moi: async () => null, admins: '', manifeste: charger });
  assert.equal(res.statusCode, 200); assert.deepEqual(JSON.parse(res.corps), { ok: true, embarque: true });
  const r2 = reponse(); await traiter({ method: 'GET', url: '/api/systaime?sante=1' }, r2, { moi: async () => null, admins: '', manifeste: () => { throw new Error('x'); } });
  assert.deepEqual(JSON.parse(r2.corps), { ok: true, embarque: false });
});
test('systaime api : lecture seule (POST, PUT, DELETE → 405)', async () => {
  for (const m of ['POST', 'PUT', 'DELETE', 'PATCH']) assert.equal((await appel(m, { email: 'matt@exemple.fr' })).code, 405, m);
});
test('systaime api : un fichier illisible donne une erreur propre, sans fuite', async () => {
  const res = reponse(); await traiter({ method: 'GET', url: '/' }, res, { moi: async () => ({ email: 'matt@exemple.fr' }), admins: 'matt@exemple.fr', manifeste: () => { throw new Error('ENOENT /var/task/docs/x'); } });
  assert.equal(res.statusCode, 500); assert.ok(!res.corps.includes('/var/task'));
});

test('systaime : AGENTS.md est court, renvoie aux vraies sources et ne prétend pas imposer des règles', () => {
  const a = lire('AGENTS.md');
  assert.ok(a.split('\n').length <= 80, 'court');
  for (const p of ['docs/systaime/README.md', 'docs/systaime/manifeste.interne.json', 'tests/systaime/valider.mjs']) assert.ok(a.includes(p), p);
  assert.match(a, /contexte, pas (un|une) verrou|ne (le )?verrouille pas|n’est pas un verrou/i);
  assert.equal(lire('CLAUDE.md').trim(), '@AGENTS.md');
});

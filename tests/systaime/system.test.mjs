// La page /system : ce que le contenu a le droit de dire. Sans navigateur : les règles d'honnêteté se lisent dans les fichiers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const R = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const lire = p => readFileSync(join(R, p), 'utf8');
const C = JSON.parse(lire('src/system/contenu.json'));
const tout = JSON.stringify(C);
const ETATS = Object.keys(C.statuts);

test('quatre états seulement, chacun avec un signe et un sens', () => {
  assert.deepEqual(ETATS.sort(), ['aconstruire', 'demonstration', 'prototype', 'reel']);
  for (const k of ETATS) { assert.ok(C.statuts[k].glyphe.length >= 1); assert.ok(C.statuts[k].sens.length > 10); }
  assert.equal(new Set(ETATS.map(k => C.statuts[k].glyphe)).size, 4, 'un signe distinct par état');
});

test('aucun prix, aucune monnaie, aucun paiement', () => {
  assert.doesNotMatch(tout, /\d\s?(€|\$|£|EUR|USD|euros?)/i);
  assert.doesNotMatch(tout, /(€|\$|£)\s?\d/);
  assert.doesNotMatch(tout, /\b(tarif|prix|abonnement|IBAN|paiement|payer|Stripe)\b/i);
});

test('tout état cité existe ; tout « réel » a une preuve qui existe dans le dépôt', () => {
  for (const [id, s] of Object.entries(C.sections)) if (s.statut) assert.ok(ETATS.includes(s.statut), `section ${id}`);
  for (const d of C.demos) assert.ok(ETATS.includes(d.statut), `démo ${d.id}`);
  for (const k of C.capacites) {
    assert.ok(ETATS.includes(k.statut), `capacité ${k.id}`);
    assert.ok(k.reel && k.reste, `capacité ${k.id} : dit ce qui existe ET ce qui reste`);
    if (k.statut === 'reel') { assert.ok(k.preuve?.fichier, `${k.id} : « réel » exige une preuve`); }
    if (k.preuve) assert.ok(existsSync(join(R, k.preuve.fichier)), `${k.id} : preuve introuvable ${k.preuve.fichier}`);
    if (k.statut === 'aconstruire') assert.ok(!k.preuve, `${k.id} : « à construire » n'a pas de preuve`);
  }
});

test('le jumeau numérique n\'affiche « À jour » que sur comparaison vérifiable', () => {
  assert.match(C.jumeau.regle, /comparaison/);
  assert.equal(C.jumeau.etats.length, 6);
  assert.ok(C.sections.sources.statut === 'aconstruire', 'le jumeau n\'est pas construit');
});

test('les démos ne prétendent rien de ce qui manque', () => {
  const b = C.demos.find(d => d.id === 'broderie');
  assert.equal(b.statut, 'demonstration'); assert.match(b.reste, /aucun patron tiers/i);
  for (const d of C.demos.filter(x => x.statut === 'aconstruire')) assert.ok(d.reste.length > 20);
  assert.match(C.documentation.connecteurs.texte, /Aucun connecteur externe/);
});

test('l\'invitation finale est un simple lien vers LE MONDE AIME, sans formulaire', () => {
  assert.deepEqual(C.sections.invitation.lien, ['Entrer dans LE MONDE AIME', '/']);
  const page = lire('src/pages/System.tsx') + lire('src/system/DisqueDemo.tsx') + lire('src/system/DemoBroderie.tsx');
  assert.doesNotMatch(page, /<form\b|<input\b|type="email"|fetch\(|XMLHttpRequest|sendBeacon/);
});

test('la même source canonique que /systaime : un seul fichier, aucune copie', () => {
  assert.match(lire('src/system/lecture.ts'), /from "\.\.\/systaime\/publique\.json"/);
  assert.match(lire('src/pages/Systaime.tsx'), /from '\.\.\/systaime\/publique\.json'/);
  assert.equal(existsSync(join(R, 'src/system/publique.json')), false);
  const pub = JSON.parse(lire('src/systaime/publique.json'));
  assert.equal(pub.cases.length, 64);
  assert.doesNotMatch(lire('src/system/domaines.ts'), /api\/systaime/, 'la page publique ne lit jamais le détail interne');
});

test('route enregistrée, page non indexée, aucun jeton de couleur nouveau', () => {
  assert.match(lire('src/App.tsx'), /'\/system': \[System,/);
  assert.match(lire('src/pages/System.tsx'), /noindex, nofollow/);
  const css = lire('src/system/system.css');
  assert.doesNotMatch(css, /--aime-[a-z0-9-]+\s*:/, 'aucun jeton défini ici');
  const aime = lire('studio/src/design/aime.css');
  for (const m of css.matchAll(/var\((--aime-[a-z0-9-]+)/g)) assert.ok(aime.includes(m[1] + ':') || aime.includes(m[1] + ' :'), `jeton inconnu ${m[1]}`);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'aucune couleur en dur');
});

test('la démo broderie n\'exporte rien et n\'utilise aucun patron tiers', () => {
  const b = lire('src/system/DemoBroderie.tsx');
  assert.doesNotMatch(b, /download|createObjectURL|toDataURL|\.pdf|etsy/i);
  assert.match(b, /empreinteCroix/);
});

test('la landing raconte UPTOWN et mène au clip sans dupliquer le lecteur', () => {
  const a = lire('src/pages/Accueil.tsx');
  assert.match(a, /href="\/studio\/uptown"/);
  assert.doesNotMatch(a, /webgl|getContext|<video|<audio|clip-brode|\/clip\//i, 'aucun lecteur dans la landing');
  assert.match(a, /className="ac-hero"/, 'le hero existant est conservé');
});

test('une seule famille de navigation : /, /system et /systaime partagent les mêmes verbes, sans second dock', () => {
  for (const f of ['src/pages/Accueil.tsx', 'src/pages/System.tsx', 'src/pages/Systaime.tsx']) {
    /* convergence : la liste des verbes n'est plus passée page par page (prop `verbes`), elle est portée une seule fois par le dock */
    const t = lire(f); assert.match(t, /<Tete /, f); assert.doesNotMatch(t, /verbes=/, f + ' : aucune liste de verbes propre à la page');
  }
  const charte = lire('src/charte/Charte.tsx');
  assert.match(charte, /import \{ DESTINATIONS \} from '\.\.\/lib\/intention\.mjs'/, 'les verbes viennent de la donnée canonique DESTINATIONS');
  assert.match(charte, /export const ENTREES/, 'une seule liste, pour l\'ordinateur et pour le téléphone');
  assert.doesNotMatch(lire('src/pages/System.tsx'), /position:\s*fixed|className="dock/);
});

test('choisir une case ne déplace pas la page : aucun défilement dans le code de sélection', () => {
  const t = lire('src/pages/System.tsx');
  const sel = t.slice(t.indexOf('const choisirFiche'), t.indexOf('useEffect(() => { if (!vu.current)'));
  assert.doesNotMatch(sel, /scrollIntoView|scrollTo|location\.hash|\.focus\(/);
  assert.doesNotMatch(lire('src/system/DisqueDemo.tsx'), /scrollIntoView/);
});

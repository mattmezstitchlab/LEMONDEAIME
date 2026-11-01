// SYST'AIME : le validateur du manifeste. Sans dépendance. Il VÉRIFIE (fichiers, empreintes, imports, accessibilité déclarée) ; il ne décrit pas.
//   node tests/systaime/valider.mjs            → rapport ; code 1 s'il y a une erreur
//   SYSTAIME_STRICT=1 node tests/systaime/valider.mjs   → « à revérifier » et « inconnu » deviennent des erreurs
// Limites assumées : une empreinte (blob Git) différente dit « ce fichier a changé », pas « le changement compte » ;
// la fraîcheur ne remonte que d'une dépendance technique. Un test relié n'est pas une couverture de lignes.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUVERTURE, EXECUTION, EXISTENCE, ETATS_STATUT, INVENTAIRE, INTERDITS_PUBLIC, TYPES_DEPENDANCE, VALIDATION, projeter } from '../../api/_systaime.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const HEX40 = /^[0-9a-f]{40}$/;
const THEMES = ['visuel', 'interaction', 'donnees', 'relations', 'restitution', 'memoire'];
const COUCHES = ['principes', 'tokens', 'composants', 'contrats', 'tests', 'versions'];

export const gitParDefaut = racine => args => execFileSync('git', args, { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/* l'empreinte d'un fichier (arbre de travail) ou d'un dossier (arbre Git de HEAD) ; null si Git ne répond pas */
export function empreinte(racine, chemin, git) {
  try {
    const p = join(racine, chemin);
    if (!existsSync(p)) return undefined;
    return statSync(p).isDirectory() ? git(['rev-parse', 'HEAD:' + chemin.replace(/\/$/, '')]) : git(['hash-object', '--', chemin]);
  } catch { return null; }
}

function fichiersSource(racine, dossier, sortie = []) {
  for (const n of readdirSync(join(racine, dossier))) {
    if (n === 'node_modules' || n === '__tests__' || n === 'dist' || n.startsWith('.')) continue;
    const rel = dossier + '/' + n; const p = join(racine, rel);
    if (statSync(p).isDirectory()) fichiersSource(racine, rel, sortie);
    else if (/\.(tsx?|mjs|js|css|json)$/.test(n)) sortie.push(rel);
  }
  return sortie;
}
const lire = (racine, chemin) => readFileSync(join(racine, chemin), 'utf8');

/* un import technique, y compris sur plusieurs lignes : from '…/module' */
export function importe(texte, module) {
  const m = module.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('from\\s*[\'"][^\'"]*' + m + '(\\.[a-z]+)?[\'"]', 'm').test(texte) || new RegExp('import\\s*\\(?\\s*[\'"][^\'"]*' + m + '(\\.[a-z]+)?[\'"]', 'm').test(texte);
}

export function valider(m, { racine = RACINE, git = gitParDefaut(racine), strict = false } = {}) {
  const e = [], a = []; const err = (v, msg) => e.push(v + ' : ' + msg); const warn = (v, msg) => a.push(v + ' : ' + msg);
  const fraicheur = {}; const comptes = {};
  try {
    /* V-01 structure */
    if (!m || m.schema !== 'systaime-manifest') err('V-01', 'schéma inconnu');
    if (!/^\d+\.\d+\.\d+$/.test(m.version || '')) err('V-01', 'version illisible');
    if (!HEX40.test((m.source_commit && m.source_commit.sha) || '')) err('V-01', 'source_commit.sha doit être un SHA complet');
    if (JSON.stringify(m.themes) !== JSON.stringify(THEMES)) err('V-01', 'les six thèmes sont fixes');
    if (JSON.stringify(m.layers) !== JSON.stringify(COUCHES)) err('V-01', 'les six couches sont fixes');
    const regles = Array.isArray(m.rules) ? m.rules : [];
    const ids = new Set(regles.map(r => r.id));
    if (ids.size !== regles.length) err('V-01', 'identifiants en double');
    const cr = regles.filter(r => r.kind === 'croisement'), gf = regles.filter(r => r.kind === 'garde-fou');
    if (cr.length !== 36 || gf.length !== 28 || regles.length !== 64) err('V-01', `64 cases attendues (36 croisements + 28 garde-fous), trouvé ${cr.length} + ${gf.length}`);
    for (const t of THEMES) for (const c of COUCHES) if (!ids.has(t + '.' + c)) err('V-01', 'croisement manquant : ' + t + '.' + c);

    for (const r of regles) {
      const w = r.id;
      /* V-02 vocabulaire des quatre axes + appréciation d'audit */
      if (!EXISTENCE.includes(r.existence && r.existence.etat)) err('V-02', w + ' : existence illisible');
      if (!COUVERTURE.includes(r.couverture && r.couverture.etat)) err('V-02', w + ' : couverture illisible');
      if (!EXECUTION.includes(r.derniere_execution && r.derniere_execution.etat)) err('V-02', w + ' : dernière exécution illisible');
      if (!VALIDATION.includes(r.validation_fonctionnelle && r.validation_fonctionnelle.etat)) err('V-02', w + ' : validation illisible');
      if (!ETATS_STATUT.includes(r.appreciation_audit && r.appreciation_audit.statut)) err('V-02', w + ' : appréciation d’audit illisible');
      if ('etiquette' in r || 'libelle' in r) err('V-02', w + ' : le libellé affiché est dérivé, jamais saisi');
      const ex = r.existence || {}, co = r.couverture || {}, ru = r.derniere_execution || {}, va = r.validation_fonctionnelle || {};
      const fichiers = ex.fichiers || [], tests = co.tests || [];
      /* V-03 existence : vérifiée par la machine */
      if (ex.etat === 'present' || ex.etat === 'incomplet') {
        if (!fichiers.length) err('V-03', w + ' : « ' + ex.etat + ' » sans fichier');
        for (const f of fichiers) {
          const cur = empreinte(racine, f.path, git);
          if (cur === undefined) err('V-03', w + ' : chemin absent du dépôt : ' + f.path);
          if (!HEX40.test(f.blob || '')) err('V-03', w + ' : empreinte illisible pour ' + f.path);
        }
      } else if (ex.etat === 'absent' && fichiers.length) err('V-03', w + ' : « absent » avec des fichiers');
      else if (ex.etat === 'hors-depot' && !(r.canonique && r.canonique.repo && r.canonique.repo !== 'LEMONDEAIME')) err('V-03', w + ' : « hors-depot » sans dépôt externe nommé');
      /* V-04 couverture */
      if (co.etat === 'tests-lies') {
        if (!tests.length) err('V-04', w + ' : « tests-liés » sans test');
        for (const t of tests) { if (empreinte(racine, t.path, git) === undefined) err('V-04', w + ' : test absent : ' + t.path); if (!HEX40.test(t.blob || '')) err('V-04', w + ' : empreinte du test illisible : ' + t.path); }
      } else if (tests.length) err('V-04', w + ' : tests listés alors que la couverture est « aucun-test-relie »');
      /* V-05 une exécution se date, se situe et se rejoue */
      if (ru.etat === 'reussie' || ru.etat === 'echouee' || ru.etat === 'partielle') for (const k of ['date', 'commit', 'commande']) if (!ru[k]) err('V-05', w + ' : exécution sans ' + k);
      if (ru.etat === 'reussie' && co.etat !== 'tests-lies' && !ru.commande) err('V-05', w + ' : exécution réussie sans test ni commande');
      /* V-06 « opérationnel » exige existence + test relié + exécution réussie */
      if (r.appreciation_audit && r.appreciation_audit.statut === 'operationnel' && !(ex.etat === 'present' && co.etat === 'tests-lies' && ru.etat === 'reussie')) err('V-06', w + ' : « opérationnel » sans existence, test relié et exécution réussie');
      /* V-17 une validation fonctionnelle est humaine, datée, située et bornée */
      if (va.etat === 'validee') {
        for (const k of ['par', 'date', 'commit', 'portee']) if (!va[k]) err('V-17', w + ' : validation sans ' + k);
        if (va.portee === 'tout-le-composant' && co.etat !== 'tests-lies') err('V-17', w + ' : portée « tout-le-composant » sans test ciblé');
      } else if (va.par || va.date) err('V-17', w + ' : nom ou date renseignés sans validation');
      /* V-08 le public ne reçoit que ce qui est prévu pour lui */
      if (!r.public || !r.public.nom) err('V-08', w + ' : nom public manquant');
      if (r.sensible && r.public && r.public.resume) err('V-08', w + ' : point sensible avec résumé public');
      comptes[r.appreciation_audit && r.appreciation_audit.statut] = (comptes[r.appreciation_audit && r.appreciation_audit.statut] || 0) + 1;
    }

    /* V-16 responsabilité : fonctionnelle ≠ accès technique */
    const rp = m.responsabilite || {}, fo = rp.fonctionnel || {}, ac = rp.acces || {};
    if (!fo.nom || !fo.portee || !fo.statut) err('V-16', 'responsable fonctionnel incomplet');
    if (typeof fo.approuve !== 'boolean') err('V-16', 'approuve doit être vrai ou faux');
    if (fo.approuve === true && !fo.approuve_le) err('V-16', 'approuve sans date d’approbation');
    for (const k of ['roles', 'roles_techniques', 'acces', 'droits', 'permissions']) if (k in fo) err('V-16', 'la responsabilité fonctionnelle ne porte pas de droits techniques (« ' + k + ' »)');
    if (!('roles_techniques' in ac)) err('V-16', 'rôles techniques à déclarer séparément (null si inconnus)');
    if (typeof m.approuve_manifeste !== 'boolean') err('V-16', 'approuve_manifeste doit être vrai ou faux');
    if (m.approuve_manifeste === true && !fo.approuve_le) err('V-16', 'manifeste approuvé sans date d’approbation');
    const pol = m.policies || {};
    for (const k of ['no_unverified_claims', 'one_canonical_engine_per_function', 'reference_is_not_permission', 'no_automatic_write', 'evidence_required_for_operational_status']) if (pol[k] !== true) err('V-16', 'politique « ' + k + ' » absente');

    /* V-12 inventaire des composants : chaque affirmation est rejouée par la machine */
    const comps = Array.isArray(m.composants) ? m.composants : [];
    const idsC = new Set(comps.map(c => c.id));
    if (idsC.size !== comps.length) err('V-12', 'composants en double');
    let sources = null;
    const corpus = () => (sources = sources || [...fichiersSource(racine, 'src'), ...fichiersSource(racine, 'studio/src')]);
    for (const c of comps) {
      if (!INVENTAIRE.includes(c.inventaire)) err('V-12', c.id + ' : catégorie inconnue');
      if (!c.nom || !c.justification) err('V-12', c.id + ' : nom et justification obligatoires');
      for (const f of c.fichiers || []) if (!existsSync(join(racine, f))) err('V-12', c.id + ' : fichier absent : ' + f);
      if (c.inventaire !== 'a-construire' && !(c.fichiers || []).length) err('V-12', c.id + ' : un composant existant doit citer ses fichiers');
      const v = c.verification;
      if (!v) { err('V-12', c.id + ' : affirmation sans vérification machine'); continue; }
      if (v.type === 'importeurs') {
        const cibles = new Set(c.fichiers || []);
        const n = corpus().filter(f => !cibles.has(f) && lire(racine, f).includes(v.motif)).length;
        if (v.min !== undefined && n < v.min) err('V-12', c.id + ' : ' + n + ' fichier(s) contiennent « ' + v.motif + ' », ' + v.min + ' attendu(s) au moins');
        if (v.max !== undefined && n > v.max) err('V-12', c.id + ' : ' + n + ' fichier(s) contiennent « ' + v.motif + ' », ' + v.max + ' au plus');
      } else if (v.type === 'contient') {
        if (!existsSync(join(racine, v.chemin))) err('V-12', c.id + ' : ' + v.chemin + ' absent');
        else if (lire(racine, v.chemin).includes(v.motif) !== (v.present !== false)) err('V-12', c.id + ' : « ' + v.motif + ' » ' + (v.present !== false ? 'introuvable' : 'présent') + ' dans ' + v.chemin);
      } else err('V-12', c.id + ' : type de vérification inconnu');
    }

    /* V-18 dépendances typées : un import technique est RELU dans le code */
    const concepts = new Set((m.concepts_metier || []).map(x => x.id));
    const deps = Array.isArray(m.dependances) ? m.dependances : [];
    for (const d of deps) {
      const w = (d.de || '?') + ' → ' + (d.a || '?');
      if (!TYPES_DEPENDANCE.includes(d.type)) { err('V-18', w + ' : type inconnu'); continue; }
      if (d.type === 'import_technique') {
        if (!d.fichier_de || !d.module_a || !d.fichier_a) { err('V-18', w + ' : import sans fichier_de / module_a / fichier_a'); continue; }
        if (!existsSync(join(racine, d.fichier_de)) || !existsSync(join(racine, d.fichier_a))) { err('V-18', w + ' : fichier introuvable'); continue; }
        if (!importe(lire(racine, d.fichier_de), d.module_a)) err('V-18', w + ' : aucun import réel de « ' + d.module_a + ' » dans ' + d.fichier_de);
        if (!HEX40.test(d.blob_a || '')) err('V-18', w + ' : empreinte de la cible illisible');
      } else if (d.type === 'partage_de_donnees') {
        const v = d.verification || {};
        if (!v.fichier || !v.motif || !existsSync(join(racine, v.fichier))) err('V-18', w + ' : preuve de partage introuvable');
        else if (!lire(racine, v.fichier).includes(v.motif)) err('V-18', w + ' : « ' + v.motif + ' » absent de ' + v.fichier);
        if (!['forte', 'faible'].includes(d.force)) err('V-18', w + ' : force de la preuve à indiquer (forte / faible)');
      } else {
        if (!['proposee-non-validee', 'validee'].includes(d.statut) || !d.justification) err('V-18', w + ' : dépendance métier sans statut ni justification');
        if (d.statut === 'validee' && !(d.validee_par && d.validee_le)) err('V-18', w + ' : validée sans nom ni date');
        if (!concepts.has(d.a) && !idsC.has(d.a)) err('V-18', w + ' : cible inconnue (ni composant ni concept)');
      }
      if (d.type !== 'dependance_metier' || idsC.has(d.de)) { /* de peut être un composant ou un fichier */ }
      if (d.type === 'dependance_metier' && !idsC.has(d.de)) err('V-18', w + ' : origine inconnue');
    }

    /* V-14 fraîcheur : empreintes actuelles contre empreintes enregistrées, plus une dépendance technique d'écart */
    const parFichier = new Map();
    for (const d of deps) if (d.type === 'import_technique') { (parFichier.get(d.fichier_de) || parFichier.set(d.fichier_de, []).get(d.fichier_de)).push(d); }
    for (const r of regles) {
      let etat = 'a_jour_au_commit_valide'; const cause = [];
      const suivis = ((r.existence && r.existence.fichiers) || []).length + ((r.couverture && r.couverture.tests) || []).length;
      const suivre = (path, blob, qui) => {
        const cur = empreinte(racine, path, git);
        if (cur === null) { if (etat !== 'a_reverifier') etat = 'inconnu'; cause.push('Git indisponible : ' + path); }
        else if (cur === undefined || cur !== blob) { etat = 'a_reverifier'; cause.push(qui + ' modifié : ' + path); }
      };
      for (const f of (r.existence && r.existence.fichiers) || []) {
        suivre(f.path, f.blob, 'fichier');
        for (const d of parFichier.get(f.path) || []) suivre(d.fichier_a, d.blob_a, 'dépendance');
      }
      for (const t of (r.couverture && r.couverture.tests) || []) suivre(t.path, t.blob, 'test');
      if (!suivis) etat = 'sans_objet'; /* rien à suivre : ni fichier ni test dans ce dépôt */
      fraicheur[r.id] = { etat, cause };
      if (etat === 'a_reverifier') (strict ? err : warn)('V-14', r.id + ' à revérifier (' + cause.join(' ; ') + ')');
      if (etat === 'inconnu') (strict ? err : warn)('V-14', r.id + ' : fraîcheur inconnue (' + cause.join(' ; ') + ')');
      if (r.fraicheur && r.fraicheur.etat === 'a_jour_au_commit_valide' && etat === 'a_reverifier') { /* signalé ci-dessus */ }
    }

    /* V-19 la projection publique ne contient rien d'interne */
    const pub = projeter(m); const texte = JSON.stringify(pub);
    for (const re of INTERDITS_PUBLIC) if (re.test(texte)) err('V-19', 'la version publique contient un motif interdit : ' + re);
    for (const c of pub.cases) if ('chemin' in c || 'path' in c || 'source' in c) err('V-19', 'chemin dans la version publique : ' + c.id);
  } catch (x) { err('V-00', 'validateur interrompu : ' + (x && x.message)); }
  return { erreurs: e, avertissements: a, fraicheur, comptes };
}

/* en ligne de commande */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const m = JSON.parse(readFileSync(join(RACINE, 'docs/systaime/manifeste.interne.json'), 'utf8'));
  const r = valider(m, { strict: process.env.SYSTAIME_STRICT === '1' });
  const f = {}; for (const v of Object.values(r.fraicheur)) f[v.etat] = (f[v.etat] || 0) + 1;
  console.log(`SYST'AIME ${m.version} — ${m.rules.length} cases, ${(m.composants || []).length} composants, ${(m.dependances || []).length} dépendances`);
  console.log('Fraîcheur :', JSON.stringify(f));
  for (const x of r.avertissements) console.log('  ⚠', x);
  for (const x of r.erreurs) console.log('  ✗', x);
  console.log(r.erreurs.length ? `${r.erreurs.length} erreur(s)` : 'Manifeste valide.');
  process.exit(r.erreurs.length ? 1 : 0);
}

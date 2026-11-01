// SYST'AIME : la lecture commune du manifeste (api, validateur, page). Aucune entrée-sortie ici : des fonctions pures.
// Le manifeste interne (docs/systaime/manifeste.interne.json) n'est JAMAIS servi tel quel au public : seule la projection `projeter` l'est.

export const ETATS_STATUT = ['operationnel', 'partiel', 'simule', 'hypothese', 'non-verifie'];
export const EXISTENCE = ['present', 'incomplet', 'absent', 'hors-depot'];
export const COUVERTURE = ['tests-lies', 'aucun-test-relie'];
export const EXECUTION = ['reussie', 'echouee', 'partielle', 'non-rejouee'];
export const VALIDATION = ['non-validee', 'validee'];
export const FRAICHEUR = ['a_jour_au_commit_valide', 'a_reverifier', 'inconnu', 'sans_objet'];
export const INVENTAIRE = ['utilise', 'existant-inaccessible', 'prototype-non-raccorde', 'doublon-potentiel', 'abandonne', 'a-construire'];
export const TYPES_DEPENDANCE = ['import_technique', 'partage_de_donnees', 'dependance_metier'];

/* Les libellés visibles : DÉRIVÉS des quatre axes, jamais saisis. Un test réussi n'est pas une validation. */
export const LIBELLES = {
  'validee': ['Validé par une personne', 'Une personne a validé ce point (nom, date, commit et portée sont inscrits).'],
  'a-reverifier': ['À revérifier', 'Un fichier ou un test référencé a changé depuis la dernière vérification du manifeste.'],
  'test-echoue': ['Test en échec', 'Un test relié a échoué à sa dernière exécution.'],
  'teste-reussi': ['Testé, validation humaine en attente', 'Le code existe, un test relié a réussi. Cela ne prouve pas que toutes les règles du composant sont satisfaites : personne ne l’a encore validé.'],
  'teste-non-rejoue': ['Testé, non rejoué', 'Le code existe et des tests sont reliés, mais ils n’ont pas été rejoués pour ce manifeste.'],
  'present-sans-test': ['Présent, sans test relié', 'Le code existe ; aucun test ne lui est relié dans ce manifeste.'],
  'hors-depot': ['Source dans un autre dépôt', 'La source est ailleurs : elle n’est pas vérifiable depuis ce dépôt.'],
  'rien': ['Rien d’identifié dans ce dépôt', 'Aucune source n’a été identifiée pour ce point. Il n’est ni confirmé ni exclu.'],
  'reserve': ['Détail réservé', 'Le détail de ce point est réservé à l’administration.'],
};

export function etiquette(r) {
  if (r.validation_fonctionnelle && r.validation_fonctionnelle.etat === 'validee') return 'validee';
  if (r.fraicheur && r.fraicheur.etat === 'a_reverifier') return 'a-reverifier';
  const ex = r.existence && r.existence.etat;
  if (ex === 'absent') return 'rien';
  if (ex === 'hors-depot') return 'hors-depot';
  const tests = r.couverture && r.couverture.etat === 'tests-lies';
  const run = r.derniere_execution && r.derniere_execution.etat;
  if (!tests) return 'present-sans-test';
  if (run === 'echouee') return 'test-echoue';
  if (run === 'reussie') return 'teste-reussi';
  return 'teste-non-rejoue';
}

/* Sert-on les chemins ? Jamais au public. Les points de sécurité et d'exploitation n'y ont que leur nom. */
export function projeter(m) {
  const cases = m.rules.map(r => {
    const code = r.sensible ? 'reserve' : etiquette(r);
    return { id: r.id, type: r.kind === 'garde-fou' ? 'garde-fou' : 'croisement', theme: r.theme || null, couche: r.layer || null, nom: r.public.nom, resume: r.public.resume || null, etat: code };
  });
  const decompte = {};
  for (const c of cases) decompte[c.etat] = (decompte[c.etat] || 0) + 1;
  const inv = {};
  for (const c of m.composants) inv[c.inventaire] = (inv[c.inventaire] || 0) + 1;
  return {
    schema: 'systaime-public', version: m.version, themes: m.themes, couches: m.layers,
    libelles: Object.fromEntries(Object.entries(LIBELLES).map(([k, v]) => [k, { titre: v[0], texte: v[1] }])),
    cases, decompte,
    inventaire: { total: m.composants.length, par_categorie: inv },
    note: 'Version publique expurgée : ni chemins, ni défauts de sécurité, ni détails internes. Le détail est réservé à l’administration.',
  };
}

/* Mots qui ne doivent jamais apparaître dans la projection publique (utilisé par le test de fuite). */
export const INTERDITS_PUBLIC = [
  /\bsrc\//, /\bstudio\//, /\bapi\//, /\bdb\//, /\bdocs\//, /\.mjs\b/, /\.tsx?\b/, /\.sql\b/, /\.env/,
  /AIME_ADMIN/, /DATABASE_URL/, /BETTER_AUTH/, /\bsecret/i, /\bjeton\b.*(api|cl[ée])/i, /d8ac95c/, /\b[0-9a-f]{40}\b/,
  /mattmezstitchlab/, /\bpostgres/i, /\bneon\b/i, /\bvercel\b/i, /@[a-z0-9-]+\.[a-z]{2,}/i,
];

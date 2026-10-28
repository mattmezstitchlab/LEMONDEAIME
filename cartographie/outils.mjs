/* Le système nerveux, sans dessin : un modèle de nœuds et de liens, et les règles qui le gardent vrai.
   La page l'affiche ; les tests le vérifient contre le dépôt ; la fonction serveur sert la lecture d'inspection. */

export const ETATS = { verifie: 'Vérifié', 'a-verifier': 'À vérifier', prevu: 'Prévu' };
export const STATUTS = { conserver: 'Conserver', mutualiser: 'Mutualiser', deplacer: 'Déplacer', simplifier: 'Simplifier', retirer: 'Retirer' };
export const NATURES = { contient: 'contient', ouvre: 'ouvre', declenche: 'déclenche', appelle: 'appelle', lit: 'lit', ecrit: 'écrit', emet: 'émet', ecoute: 'écoute', previent: 'prévient', affiche: 'affiche', autorise: 'autorise' };

export const noeud = (r, id) => r.noeuds.find(n => n.id === id) || null;
/** L'état d'un lien : le sien s'il est précisé, sinon le moins sûr de ses deux bouts. */
export function etatLien(r, l) {
  if (l.etat) return l.etat;
  const ordre = ['prevu', 'a-verifier', 'verifie'];
  return ordre[Math.min(ordre.indexOf(noeud(r, l.de)?.etat), ordre.indexOf(noeud(r, l.vers)?.etat))] || 'a-verifier';
}
/** Ce qui arrive à un nœud, et ce qui en part. */
export function voisins(r, id) {
  return { entrants: r.liens.filter(l => l.vers === id).map(l => ({ ...l, etat: etatLien(r, l) })), sortants: r.liens.filter(l => l.de === id).map(l => ({ ...l, etat: etatLien(r, l) })) };
}
export function compter(r) {
  const c = { noeuds: r.noeuds.length, liens: r.liens.length, verifie: 0, 'a-verifier': 0, prevu: 0 };
  for (const n of r.noeuds) c[n.etat]++;
  return c;
}

/* ——— La lecture publique : le fonctionnement, jamais les entrailles ———
   Ni fichier, ni symbole, ni test, ni stockage, ni note technique, ni audit : seulement ce que fait chaque partie et son état. */
export function projeterPublic(r) {
  return {
    titre: r.titre, perimetre: r.perimetre, familles: r.familles, parcours: r.parcours,
    noeuds: r.noeuds.map(n => ({ id: n.id, famille: n.famille, nom: n.nom, fonction: n.fonction, pages: n.pages.filter(p => !p.includes(':')), etat: n.etat })),
    liens: r.liens.map(l => ({ de: l.de, vers: l.vers, nature: l.nature, etat: etatLien(r, l) })),
  };
}
const INTERDIT_PUBLIC = /(src\/|api\/|tests\/|studio\/src|\.mjs|\.tsx?|\.json|@|process\.env|https?:\/\/|table |localStorage|neon|vercel|token|secret|password)/i;
export const publicPropre = pub => !INTERDIT_PUBLIC.test(JSON.stringify(pub));

/** preuves.json : un parcours de bout en bout par fichier, avec sa date, son commit et chaque vérification. */
export function preuvesParTest(preuves) {
  const m = new Map();
  for (const [fichier, p] of Object.entries(preuves || {})) for (const x of p.resultats || []) m.set(fichier + '#' + x.test, x.ok);
  return m;
}
export function preuveDe(preuves, t) {
  const p = preuves?.[t.fichier]; const x = p?.resultats?.find(y => y.test === t.nom);
  return x ? { ok: x.ok, date: p.date, commit: p.commit, environnement: p.environnement } : null;
}
/* ——— La validation contre le dépôt ———
   lire(fichier) → texte ou null ; inventaire : celui du scanner ; preuves : le dernier parcours de bout en bout. */
export function valider(r, { lire, inventaire, preuves }) {
  const err = [];
  const ids = new Set(r.noeuds.map(n => n.id));
  const familles = new Set(r.familles.map(f => f.id));
  const routes = new Set([...inventaire.routes.pages.map(p => p.route), '/systeme-nerveux', '/studio/*', '*']);
  const testsConnus = new Set([...inventaire.tests.serveur, ...inventaire.tests.e2e].flatMap(f => f.tests.map(t => f.fichier + '#' + t)));
  const prouve = preuvesParTest(preuves);
  if (ids.size !== r.noeuds.length) err.push('identifiant de nœud en double');
  for (const n of r.noeuds) {
    const ici = 'nœud ' + n.id;
    if (!familles.has(n.famille)) err.push(ici + ' : famille inconnue ' + n.famille);
    if (!ETATS[n.etat]) err.push(ici + ' : état inconnu ' + n.etat);
    if (!n.fonction || n.fonction.length < 20) err.push(ici + ' : fonction trop vague');
    for (const p of n.pages) if (!routes.has(p)) err.push(ici + ' : page inconnue ' + p);
    for (const s of n.sources) {
      const t = lire(s.fichier);
      if (t === null) err.push(ici + ' : fichier absent ' + s.fichier);
      else if (!t.includes(s.symbole)) err.push(ici + ' : « ' + s.symbole + ' » introuvable dans ' + s.fichier);
    }
    for (const d of [...n.donnees.lit, ...n.donnees.ecrit]) if (noeud(r, d)?.famille !== 'donnees') err.push(ici + ' : donnée inconnue ' + d);
    for (const x of n.roles) if (noeud(r, x)?.famille !== 'relations') err.push(ici + ' : rôle inconnu ' + x);
    for (const t of n.tests) {
      const cle = t.fichier + '#' + t.nom;
      if (!testsConnus.has(cle)) err.push(ici + ' : test introuvable ' + cle);
      if (prouve.has(cle) && !prouve.get(cle)) err.push(ici + ' : test en échec au dernier enregistrement ' + cle);
    }
    if (n.etat === 'verifie' && !n.tests.length) err.push(ici + ' : « vérifié » sans aucun test');
    if (n.etat === 'verifie' && !n.tests.some(t => prouve.get(t.fichier + '#' + t.nom))) err.push(ici + ' : « vérifié » sans preuve enregistrée d’un test réussi');
    if (n.etat === 'prevu' && n.tests.length) err.push(ici + ' : « prévu » mais déjà testé ? changer son état');
  }
  for (const l of r.liens) {
    if (!ids.has(l.de) || !ids.has(l.vers)) err.push('lien ' + l.de + ' → ' + l.vers + ' : bout inconnu');
    if (!NATURES[l.nature]) err.push('lien ' + l.de + ' → ' + l.vers + ' : nature inconnue ' + l.nature);
    if (l.etat === 'verifie' && etatLien(r, { ...l, etat: undefined }) !== 'verifie') err.push('lien ' + l.de + ' → ' + l.vers + ' : plus sûr que ses bouts');
  }
  for (const p of r.parcours) for (const e of p.etapes) if (!ids.has(e)) err.push('parcours ' + p.id + ' : étape inconnue ' + e);
  for (const a of r.audit) {
    if (!STATUTS[a.statut]) err.push('audit ' + a.id + ' : statut inconnu');
    if (!ids.has(a.moteur)) err.push('audit ' + a.id + ' : moteur inconnu');
    for (const pt of a.points || []) { const t = lire(pt.fichier); if (t === null || !t.includes(pt.texte)) err.push('audit ' + a.id + ' : « ' + pt.texte + ' » introuvable dans ' + pt.fichier); }
  }
  return err;
}

/* ——— L'audit des doublons, tiré de l'inventaire ———
   Pour chaque destination : tous ses points d'entrée dans les docks et le pied, avec leurs libellés. */
const DOCKS = ['src/charte/Charte.tsx', 'src/charte/Recherche.tsx'];
export function entrees(inventaire) {
  const par = new Map();
  for (const c of inventaire.commandes) {
    const cle = c.cible.split('#')[0].replace(/\?$/, '');
    if (!par.has(cle)) par.set(cle, []);
    par.get(cle).push(c);
  }
  return [...par.entries()].map(([cible, cs]) => {
    const docks = cs.filter(c => DOCKS.includes(c.fichier));
    const libelles = [...new Set(cs.map(c => c.libelle).filter(Boolean))];
    return { cible, total: cs.length, docks: docks.length, libelles, points: cs.map(c => ({ fichier: c.fichier, ligne: c.ligne, composant: c.composant, libelle: c.libelle })),
      doublonDock: docks.length > 1, libellesDifferents: libelles.length > 1 };
  }).sort((a, b) => b.docks - a.docks || b.total - a.total || a.cible.localeCompare(b.cible));
}

/* Le programme : les 200 moments de l'union d'exemple, et toutes les façons de les lire.
   Une seule source (src/data/programme.json) ; chaque vue (accueil, page des moments, les cinq lectures, /musique)
   passe par ces fonctions. Rien n'est recopié à la main : les chiffres affichés sont comptés ici. Fonctions pures. */

const caches = new WeakMap();
function cache(p) {
  let c = caches.get(p);
  if (!c) {
    c = { parId: new Map(p.moments.map(m => [m.id, m])), lieux: new Map(p.lieux.map(l => [l.id, l.nom])) };
    caches.set(p, c);
  }
  return c;
}

/** Un moment par son identifiant canonique. */
export const moment = (p, id) => cache(p).parId.get(id) || null;
/** « 22:36 » : l'heure telle qu'elle est écrite dans le programme (heure locale de l'union, sans conversion). */
export const heure = m => m.debut.slice(11, 16);
/** « 22 h 36 » */
export const heureLisible = m => heure(m).replace(':', ' h ');
export const nomLieu = (p, id) => cache(p).lieux.get(id) || '';
export const nomEtape = (p, id) => p.etapes.find(e => e.id === id)?.nom || '';
export const nomMetier = (p, id) => p.metiers[id]?.nom || id;

/** Les dix étapes, chacune avec ses moments, comptés. */
export function etapes(p) {
  return p.etapes.map(e => {
    const ms = p.moments.filter(m => m.etape === e.id);
    return { ...e, n: ms.length, premier: ms[0]?.n || 0, dernier: ms[ms.length - 1]?.n || 0, moments: ms };
  });
}

/** Tout ce qui se compte, compté sur les données. */
export function compter(p) {
  const principaux = new Set(p.moments.flatMap(m => m.metiers));
  const tous = new Set(p.moments.flatMap(m => [...m.metiers, ...m.possibles]));
  const familles = new Set([...tous].map(id => p.metiers[id]?.famille).filter(Boolean));
  return {
    moments: p.moments.length,
    etapes: p.etapes.length,
    metiers: tous.size,
    metiersPrincipaux: principaux.size,
    familles: familles.size,
    voix: p.voix.length,
    jourJ: p.moments.filter(m => m.etape === 'day').length,
    lieux: new Set(p.moments.map(m => m.lieu)).size,
  };
}

/** Les moments autour d'un moment, dans l'ordre du programme. */
export function autour(p, id, k = 3) {
  const m = moment(p, id);
  if (!m) return [];
  return p.moments.slice(Math.max(0, m.n - 1 - k), m.n + k);
}
export const avant = (p, id) => { const m = moment(p, id); return m && m.n > 1 ? p.moments[m.n - 2] : null; };
export const apres = (p, id) => { const m = moment(p, id); return m && m.n < p.moments.length ? p.moments[m.n] : null; };

/** Les métiers d'un moment : ceux qui le tiennent (avec la carte d'exemple du Réseau quand il y en a une) et ceux qui pourraient. */
export function metiersDe(p, m) {
  const principaux = m.metiers.map(id => ({ id, nom: nomMetier(p, id), famille: p.metiers[id]?.famille || '', responsable: m.responsables.includes(id), reseau: p.reseau[id] || [] }));
  const possibles = m.possibles.map(id => ({ id, nom: nomMetier(p, id), famille: p.metiers[id]?.famille || '' }));
  return { principaux, possibles };
}

const deLaFamille = (p, f) => p.voix.find(v => v.familles.includes(f));
/** La voix (le fil DMC) d'un métier. */
export const voixDuMetier = (p, id) => deLaFamille(p, p.metiers[id]?.famille) || null;

/** Les personnes de l'union : quand un moment les concerne (responsables, ou nommées dans la description). */
export function concerne(p, m, personneId) {
  const pers = p.union.personnes.find(x => x.id === personneId);
  if (!pers) return false;
  const groupe = pers.role === 'Témoin' ? 'temoins' : 'couple';
  return m.responsables.includes(groupe) || m.description.includes(pers.nom);
}

/** Les voix d'un moment : les mariés d'abord s'ils sont concernés, puis les fils des métiers qui le tiennent. */
export function voixDe(p, m) {
  const ids = [];
  if (p.union.personnes.some(x => x.role !== 'Témoin' && concerne(p, m, x.id))) ids.push('maries');
  for (const id of m.metiers) { const v = voixDuMetier(p, id); if (v && !ids.includes(v.id)) ids.push(v.id); }
  return ids.map(id => p.voix.find(v => v.id === id));
}

/* un petit générateur déterministe : le même moment donne toujours le même patron */
function graine(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function hasard(g) { let a = g; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Le patron du moment : une grille carrée symétrique, brodée avec les seules voix du moment.
    Renvoie { taille, voix, points } ; points[y * taille + x] = indice dans voix, ou -1 pour la toile. */
export function patron(p, m, taille = 16) {
  const voix = voixDe(p, m);
  const r = hasard(graine(m.id));
  const points = new Array(taille * taille).fill(-1);
  const c = (taille - 1) / 2;
  const moitie = Math.ceil(taille / 2);
  for (let y = 0; y < taille; y++) for (let x = 0; x < moitie; x++) {
    const d = Math.hypot(x - c, y - c) / (taille / 2);
    const plein = r() < 0.92 - d * 0.75;
    const v = plein && voix.length ? Math.min(voix.length - 1, Math.floor(d * voix.length * 0.999 + r() * 0.6) % voix.length) : -1;
    points[y * taille + x] = v;
    points[y * taille + (taille - 1 - x)] = v;
  }
  return { taille, voix, points };
}

/** Qui fait vivre ce moment : les personnes de l'union concernées, puis les métiers qui le tiennent. */
export function personnesDe(p, m) {
  const gens = p.union.personnes.filter(x => concerne(p, m, x.id)).map(x => ({ id: x.id, nom: x.nom, role: x.role, type: 'personne' }));
  const metiers = m.metiers.map(id => ({ id, nom: nomMetier(p, id), role: m.responsables.includes(id) ? 'Responsable du moment' : 'Prestataire', type: 'metier', reseau: p.reseau[id] || [] }));
  return [...gens, ...metiers];
}

/** Les moments d'une personne de l'union, ou d'un métier. */
export function momentsDe(p, qui) {
  if (p.union.personnes.some(x => x.id === qui)) return p.moments.filter(m => concerne(p, m, qui));
  return p.moments.filter(m => m.metiers.includes(qui));
}

/** Les moments du programme qui appartiennent à un moment de /musique (préparatifs, cérémonie…). */
export const parMusique = (p, cle) => p.moments.filter(m => m.musique === cle);
/** « 14:00 → 15:48 » : l'étendue d'un moment de /musique dans le programme. */
export function plageMusique(p, cle) {
  const ms = parMusique(p, cle);
  return ms.length ? heure(ms[0]) + ' → ' + heure(ms[ms.length - 1]) : '';
}

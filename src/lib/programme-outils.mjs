/* Le programme : les 200 moments de l'union d'exemple, et toutes les façons de les lire.
   Une seule source (src/data/programme.json) ; chaque vue (accueil, page des moments, les cinq lectures, /musique)
   passe par ces fonctions. Rien n'est recopié à la main : les chiffres affichés sont comptés ici. Fonctions pures. */

const caches = new WeakMap();
function cache(p) {
  let c = caches.get(p);
  if (!c) {
    c = { parId: new Map(p.moments.map(m => [m.id, m])), rang: new Map(p.moments.map((m, i) => [m.id, i])), lieux: new Map(p.lieux.map(l => [l.id, l.nom])) };
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
/* la position dans CE programme (une union personnalisée garde les numéros de la Grille 200, mais pas tous les moments) */
const rang = (p, id) => cache(p).rang.get(id) ?? -1;
export function autour(p, id, k = 3) {
  const i = rang(p, id);
  return i < 0 ? [] : p.moments.slice(Math.max(0, i - k), i + k + 1);
}
export const avant = (p, id) => { const i = rang(p, id); return i > 0 ? p.moments[i - 1] : null; };
export const apres = (p, id) => { const i = rang(p, id); return i >= 0 && i < p.moments.length - 1 ? p.moments[i + 1] : null; };

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

/* ——— Chercher ——— */
const plat = t => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/** Les moments qui répondent à une recherche : titre, description, lieu, étape, métiers, personnes. Tous les mots doivent se trouver. */
export function chercher(p, q) {
  const mots = plat(q || '').split(/[^a-z0-9]+/).filter(x => x.length > 1);
  if (!mots.length) return p.moments;
  return p.moments.filter(m => {
    const t = plat([m.titre, m.description, nomLieu(p, m.lieu), nomEtape(p, m.etape), ...m.metiers.map(id => nomMetier(p, id)),
      ...p.union.personnes.filter(x => concerne(p, m, x.id)).map(x => x.nom)].join(' '));
    return mots.every(w => t.includes(w));
  });
}

/* ——— La Grille 200 de référence et le programme d'une union ———
   La référence ne change jamais. Une union choisit ses moments (et peut changer leurs horaires) : on obtient
   un programme de la même forme, que toutes les vues savent lire. */
/** Le programme d'une union à partir de la référence : seuls les moments retenus, dans l'ordre de la Grille, horaires éventuellement changés. */
export function personnaliser(ref, { union, moments, horaires = {} }) {
  const garde = new Set(moments);
  const ms = ref.moments.filter(m => garde.has(m.id)).map(m => {
    const h = horaires[m.id];
    if (!h || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h)) return m;
    const [y, mo, d] = m.debut.slice(0, 10).split('-').map(Number), [hh, mi] = h.split(':').map(Number), dec = m.debut.slice(19);
    const iso = t => { const x = new Date(t); const z = n => String(n).padStart(2, '0'); return x.getUTCFullYear() + '-' + z(x.getUTCMonth() + 1) + '-' + z(x.getUTCDate()) + 'T' + z(x.getUTCHours()) + ':' + z(x.getUTCMinutes()) + ':00' + dec; };
    const t0 = Date.UTC(y, mo - 1, d, hh, mi);
    return { ...m, debut: iso(t0), fin: iso(t0 + m.duree * 60000), horaireChange: true };
  });
  // un horaire changé peut déplacer un moment dans sa journée : on garde l'ordre des étapes, puis celui des heures
  const ordre = new Map(ref.etapes.map((e, i) => [e.id, i]));
  ms.sort((a, b) => ordre.get(a.etape) - ordre.get(b.etape) || (a.etape === 'day' ? a.debut.localeCompare(b.debut) : 0) || a.n - b.n);
  return { ...ref, reference: false, union: union ? { ...ref.union, ...union } : ref.union, moments: ms };
}
export const estReference = p => p.reference !== false;

/** Le programme d'une union enregistrée (data.union : a, b, date, lieu, programme), tiré de la référence avec personnaliser().
    Rien de l'union d'exemple ne passe : ses prénoms deviennent ceux de l'union, ses dates suivent la date officielle.
    La référence n'est jamais modifiée. */
export function programmeDUnion(ref, u) {
  const a = (u && u.a) || 'Partenaire 1', b = (u && u.b) || 'Partenaire 2';
  const [ea, eb] = ref.union.personnes.filter(x => x.role !== 'Témoin');
  const temoins = ref.union.personnes.filter(x => x.role === 'Témoin').map((x, i) => ({ ...x, nom: 'Témoin ' + (i + 1) }));   /* pas encore connus : nommés par leur place */
  const choix = u && u.programme && Array.isArray(u.programme.moments) ? u.programme.moments : ref.moments.map(m => m.id);
  const p = personnaliser(ref, {
    union: { nom: a + ' & ' + b, jour: (u && u.date) || ref.union.jour, lieu: (u && u.lieu) || '', univers: '', personnes: [{ ...ea, nom: a }, { ...eb, nom: b }, ...temoins] },
    moments: choix, horaires: (u && u.programme && u.programme.horaires) || {},
  });
  const noms = [[ea.nom, a], [eb.nom, b], ...ref.union.personnes.filter(x => x.role === 'Témoin').map((x, i) => [x.nom, temoins[i].nom])];
  const remplacer = t => noms.reduce((s, [de, vers]) => s.split(de).join(vers), t);
  const ecart = u && u.date ? Math.round((Date.UTC(...u.date.split('-').map((x, i) => i === 1 ? x - 1 : +x)) - Date.UTC(...ref.union.jour.split('-').map((x, i) => i === 1 ? x - 1 : +x))) / 86400000) : 0;
  const decaler = iso => {
    if (!ecart) return iso;
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number), x = new Date(Date.UTC(y, m - 1, d + ecart)), z = n => String(n).padStart(2, '0');
    return x.getUTCFullYear() + '-' + z(x.getUTCMonth() + 1) + '-' + z(x.getUTCDate()) + iso.slice(10);
  };
  return { ...p, note: 'Votre programme, tiré de la Grille 200 de référence : les moments choisis, à votre date. Les horaires restent ceux de la référence, sauf ceux que vous avez changés.', moments: p.moments.map(m => ({ ...m, titre: remplacer(m.titre), description: remplacer(m.description), debut: decaler(m.debut), fin: decaler(m.fin) })) };
}

/* ——— Le support imprimable ———
   Un même programme, imprimé pour un public : chacun ne reçoit que ses moments et que les champs qui lui sont autorisés. */
export const CHAMPS = {
  tous: ['n', 'id', 'heure', 'titre', 'lieu', 'responsables'],
  maries: ['n', 'id', 'heure', 'titre', 'lieu', 'description', 'personnes'],
  prestataire: ['n', 'id', 'heure', 'titre', 'lieu', 'responsables', 'metiers', 'consignes'],
};
export const CONTENUS = { jour: ['day'], autour: ['eve', 'day', 'next-day'], tout: null };
/* les coulisses : ce que les mariés n'ont pas besoin de lire (sauf si le moment les concerne) */
export const COULISSES = ['security', 'venue-manager', 'day-coordinator', 'admin', 'digital', 'sound-light', 'accessibility', 'planner'];
export const pourLesMaries = (p, m) => p.union.personnes.some(x => x.role !== 'Témoin' && concerne(p, m, x.id)) || m.metiers.some(t => !COULISSES.includes(t));
/** Pour qui : 'tous' (l'équipe), 'maries', ou l'identifiant d'un métier. Contenu : 'jour', 'autour' (veille → lendemain) ou 'tout'. */
export function construireSupport(p, { pour = 'tous', contenu = 'jour' } = {}) {
  const metier = pour !== 'tous' && pour !== 'maries' ? pour : null;
  if (metier && !p.metiers[metier]) throw new Error('Métier inconnu : ' + pour);
  const champs = CHAMPS[metier ? 'prestataire' : pour];
  const etapesGardees = contenu in CONTENUS ? CONTENUS[contenu] : CONTENUS.jour;
  const retenus = p.moments.filter(m => (!etapesGardees || etapesGardees.includes(m.etape))
    && (!metier || m.metiers.includes(metier))
    && (pour !== 'maries' || pourLesMaries(p, m)));
  const ligne = m => {
    const tout = {
      n: m.n, id: m.id, heure: m.etape === 'day' ? heure(m) : p.etapes.find(e => e.id === m.etape).repere, titre: m.titre, lieu: nomLieu(p, m.lieu),
      description: m.description, responsables: m.responsables.map(r => r === 'couple' ? 'Les mariés' : r === 'temoins' ? 'Les témoins' : nomMetier(p, r)),
      metiers: m.metiers.map(id => nomMetier(p, id)), personnes: p.union.personnes.filter(x => concerne(p, m, x.id)).map(x => x.nom),
      consignes: m.consignes && metier ? [...m.consignes.taches, ...m.consignes.repli.map(t => 'Plan B : ' + t)] : undefined,
    };
    const o = {}; for (const k of champs) if (tout[k] !== undefined) o[k] = tout[k];
    return o;
  };
  const sections = etapes(p).map(e => ({ id: e.id, nom: e.nom, repere: e.id === 'day' ? '06:00 → 06:00' : e.repere, moments: e.moments.filter(m => retenus.includes(m)).map(ligne) })).filter(s => s.moments.length);
  return {
    titre: p.union.nom, lieu: p.union.lieu, jour: p.union.jour, reference: estReference(p),
    pour: metier ? nomMetier(p, metier) : pour === 'maries' ? 'Les mariés' : 'Toute l’équipe', champs, sections,
    total: sections.reduce((t, s) => t + s.moments.length, 0),
  };
}

/* ——— Causalité (simulation pédagogique) ———
   Décaler un moment du Jour J : on suit les prérequis du programme. Un moment qui dépend d'un moment décalé
   et qui commencerait avant sa fin est repoussé d'autant, et ainsi de suite. Rien n'est enregistré ni envoyé. */
function decalerIso(iso, minutes) {
  const t = Date.parse(iso) + minutes * 60000, dec = iso.slice(19), off = /([+-])(\d{2}):(\d{2})/.exec(dec);
  const o = off ? (off[1] === '-' ? -1 : 1) * (Number(off[2]) * 60 + Number(off[3])) : 0;
  const x = new Date(t + o * 60000), z = n => String(n).padStart(2, '0');
  return x.getUTCFullYear() + '-' + z(x.getUTCMonth() + 1) + '-' + z(x.getUTCDate()) + 'T' + z(x.getUTCHours()) + ':' + z(x.getUTCMinutes()) + ':00' + dec;
}
export function decaler(p, id, minutes) {
  const m = moment(p, id);
  if (!m || m.etape !== 'day') throw new Error('Seuls les moments du Jour J se décalent ici.');
  const nouveaux = new Map([[m.id, { debut: decalerIso(m.debut, minutes), fin: decalerIso(m.fin, minutes) }]]);
  const decales = [];
  if (minutes > 0) for (const x of p.moments.slice(rang(p, id) + 1)) {
    const causes = x.prerequis.filter(q => nouveaux.has(q));
    if (!causes.length) continue;
    const limite = causes.map(q => nouveaux.get(q).fin).sort().pop();
    if (x.debut >= limite) continue;
    const delta = Math.round((Date.parse(limite) - Date.parse(x.debut)) / 60000);
    nouveaux.set(x.id, { debut: decalerIso(x.debut, delta), fin: decalerIso(x.fin, delta) });
    decales.push({ id: x.id, titre: x.titre, avant: heure(x), apres: nouveaux.get(x.id).debut.slice(11, 16), minutes: delta, cause: causes.map(q => moment(p, q).titre) });
  }
  const touches = [m, ...decales.map(d => moment(p, d.id))];
  const metiers = uniqueParOrdre(touches.flatMap(x => x.metiers)).map(t => ({ id: t, nom: nomMetier(p, t) }));
  const personnes = p.union.personnes.filter(pe => touches.some(x => concerne(p, x, pe.id)));
  const supports = [{ pour: 'tous', nom: 'Toute l’équipe' }, ...(touches.some(x => pourLesMaries(p, x)) ? [{ pour: 'maries', nom: 'Les mariés' }] : []), ...metiers.map(t => ({ pour: t.id, nom: t.nom }))];
  return {
    moment: { id: m.id, titre: m.titre, avant: heure(m), apres: nouveaux.get(m.id).debut.slice(11, 16), minutes },
    decales, metiers, personnes: personnes.map(x => ({ id: x.id, nom: x.nom, role: x.role })), supports,
    notifications: { etat: 'prevu', destinataires: metiers.length + personnes.length },
  };
}
function uniqueParOrdre(a) { return [...new Set(a)]; }

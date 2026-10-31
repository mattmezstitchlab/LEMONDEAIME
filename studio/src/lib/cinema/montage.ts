/**
 * Le moteur de montage de LUMIERE (et du futur Disque CINÉMA) : une timeline à pistes, non destructive, extensible.
 *
 * Cinq temps, jamais confondus :
 *  - tempsMorceau : la position dans le WAV original (absolue, ex. l'impact de « La Fleur du Ciel » = 198,255 s) ;
 *  - tempsExtrait : la position dans un clip de musique (tempsMorceau − clip.debut) ;
 *  - tempsFilm    : la position globale dans le film ;
 *  - tempsPlan    : la position dans un plan (0 = son début) ;
 *  - tempsNarratif: l'horloge du récit d'une scène procédurale (ce que lit le moteur de rendu).
 *
 * Les repères musicaux sont IMMUABLES : ils appartiennent au morceau. Un plan peut s'y verrouiller (« à mon instant tPlan,
 * le repère X doit sonner ») ; `verifier` mesure l'écart (en ms) et refuse toute dérive. Insérer un plan décale tout ce qui
 * suit, musique comprise : l'alignement image–musique est conservé. Remplacer un plan (par une vidéo Manus, par exemple)
 * garde sa place et sa durée, aligne le média sur le repère, et conserve l'ancienne source dans l'historique.
 */

export type Droits = "proprietaire" | "licence" | "libre" | "a-verifier";
export interface Provenance { auteur: string; outil?: string; droits: Droits; note?: string }

export interface Repere { temps: number; nature: string; verrouille: boolean; source: "mesure" | "compose"; note?: string }
export interface Morceau { id: string; titre: string; fichier: string; duree: number; tempo?: number; reperes: Record<string, Repere>; provenance: Provenance }

export interface ClipMusique {
  id: string; morceau: string;
  /** le passage du morceau joué (tempsMorceau) */
  debut: number; fin: number;
  /** où il commence dans le film (tempsFilm) */
  position: number;
  fondus?: { entree?: number; sortie?: number };
}

export type Source =
  | { genre: "procedural"; scene: string; /** points (tempsPlan, tempsNarratif), interpolés linéairement */ narratif: [number, number][] }
  | { genre: "video"; url: string; duree: number; /** le temps du média où se trouve l'événement qui doit tomber sur le repère */ synchroMedia?: number }
  | { genre: "image"; url: string }
  | { genre: "texte"; texte: string };

export type Piste = "video" | "effets" | "textes";
export interface Transition { genre: "coupe" | "fondu" | "fondu-blanc" | "fondu-noir"; duree: number }

export interface Plan {
  id: string; titre: string; chapitre: string; piste: Piste;
  source: Source; duree: number;
  /** où le média commence dans la source (vidéo) : calculé par `remplacer` pour tenir les repères */
  media?: { debut: number };
  /** les plans d'une piste se suivent dans l'ordre du tableau ; `decalage` laisse un silence d'image avant */
  decalage?: number;
  entree?: Transition; sortie?: Transition;
  statut: "provisoire" | "valide" | "a-remplacer";
  provenance: Provenance;
  /** les points verrouillés : à l'instant tPlan, le repère « morceau:repere » doit sonner */
  synchro?: { repere: string; tPlan: number }[];
  historique?: { source: Source; duree: number; media?: { debut: number }; remplaceLe: string; raison: string }[];
}

export interface Chapitre { id: string; titre: string; morceau?: string }
export interface Montage {
  id: string; titre: string; version: "animatique" | "chapitre" | "court-metrage" | "long-metrage";
  description: string;
  morceaux: Record<string, Morceau>;
  chapitres: Chapitre[];
  musique: ClipMusique[];
  plans: Plan[];
}

/* ——— résolution : où est chaque plan dans le film ——— */
export interface PlanPlace extends Plan { debutFilm: number; finFilm: number }
export function placer(m: Montage): PlanPlace[] {
  const curseur: Record<Piste, number> = { video: 0, effets: 0, textes: 0 };
  return m.plans.map(p => { const d = curseur[p.piste] + (p.decalage ?? 0); curseur[p.piste] = d + p.duree; return { ...p, debutFilm: d, finFilm: d + p.duree }; });
}
export const dureeMontage = (m: Montage) => Math.max(0, ...placer(m).map(p => p.finFilm), ...m.musique.map(c => c.position + (c.fin - c.debut)));

/* ——— conversions de temps ——— */
const morceauDe = (ref: string) => { const [morceau, repere] = ref.split(":"); return { morceau, repere }; };
/** le tempsFilm où sonne un tempsMorceau (le premier clip qui le contient) ; null si ce passage n'est pas joué */
export function filmDuMorceau(m: Montage, morceau: string, tempsMorceau: number): number | null {
  /* intervalle semi-ouvert [debut, fin) : un repère posé pile sur une coupure appartient au clip qui COMMENCE là */
  const c = m.musique.find(c => c.morceau === morceau && tempsMorceau >= c.debut - 1e-9 && tempsMorceau < c.fin - 1e-9)
    ?? m.musique.find(c => c.morceau === morceau && Math.abs(tempsMorceau - c.fin) <= 1e-9);
  return c ? c.position + (tempsMorceau - c.debut) : null;
}
export function filmDuRepere(m: Montage, ref: string): number | null {
  const { morceau, repere } = morceauDe(ref); const r = m.morceaux[morceau]?.reperes[repere];
  return r ? filmDuMorceau(m, morceau, r.temps) : null;
}
/** ce qui sonne à un instant du film : pour chaque clip actif, le tempsMorceau et le tempsExtrait */
export function musiqueA(m: Montage, tempsFilm: number) {
  return m.musique.filter(c => tempsFilm >= c.position && tempsFilm < c.position + (c.fin - c.debut))
    .map(c => ({ clip: c, tempsExtrait: tempsFilm - c.position, tempsMorceau: c.debut + (tempsFilm - c.position) }));
}
/** interpolation linéaire d'une table de points (x croissant) */
export function interpoler(points: [number, number][], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-9, x1 - x0);
  }
  return points[points.length - 1][1];
}
/** les plans visibles à un instant, avec leur tempsPlan (et le tempsNarratif ou le temps média) */
export function plansA(m: Montage, tempsFilm: number, places = placer(m)) {
  return places.filter(p => tempsFilm >= p.debutFilm && tempsFilm < p.finFilm + (tempsFilm >= dureeMontage(m) - 1e-9 ? 1e-6 : 0)).map(p => {
    const tPlan = tempsFilm - p.debutFilm;
    return { plan: p, tPlan, tNarratif: p.source.genre === "procedural" ? interpoler(p.source.narratif, tPlan) : undefined,
      tMedia: p.source.genre === "video" ? (p.media?.debut ?? 0) + tPlan : undefined };
  });
}

/* ——— vérification : repères verrouillés, chevauchements, trous, droits ——— */
export interface Rapport {
  synchro: { plan: string; repere: string; attendu: number | null; obtenu: number; ecartMs: number | null; ok: boolean }[];
  trous: { piste: Piste; de: number; a: number }[];
  droits: { quoi: string; droits: Droits }[];
  avertissements: string[];
  ok: boolean;
  publiable: boolean;
}
export function verifier(m: Montage, toleranceMs = 0.5): Rapport {
  const places = placer(m), avertissements: string[] = [];
  const synchro = places.flatMap(p => (p.synchro ?? []).map(s => {
    const attendu = filmDuRepere(m, s.repere), obtenu = p.debutFilm + s.tPlan;
    const ecartMs = attendu === null ? null : Math.round((obtenu - attendu) * 1e6) / 1e3;
    return { plan: p.id, repere: s.repere, attendu, obtenu, ecartMs, ok: ecartMs !== null && Math.abs(ecartMs) <= toleranceMs };
  }));
  const trous: Rapport["trous"] = [];
  const video = places.filter(p => p.piste === "video");
  for (let i = 1; i < video.length; i++) if (video[i].debutFilm - video[i - 1].finFilm > 1e-6) trous.push({ piste: "video", de: video[i - 1].finFilm, a: video[i].debutFilm });
  for (const p of places) if (p.source.genre === "video") {
    const debut = p.media?.debut ?? 0;
    if (debut < 0 || debut + p.duree > p.source.duree + 1e-6) avertissements.push(`« ${p.titre} » : le média (${p.source.duree.toFixed(2)} s) ne couvre pas tout le plan (${p.duree.toFixed(2)} s à partir de ${debut.toFixed(2)} s).`);
  }
  for (const c of m.musique) { const mo = m.morceaux[c.morceau]; if (!mo) avertissements.push(`clip ${c.id} : morceau inconnu`); else if (c.debut < 0 || c.fin > mo.duree + 1e-6) avertissements.push(`clip ${c.id} : hors du morceau`); }
  const droits = [...Object.values(m.morceaux).map(mo => ({ quoi: `musique « ${mo.titre} »`, droits: mo.provenance.droits })), ...places.map(p => ({ quoi: `plan « ${p.titre} »`, droits: p.provenance.droits }))];
  const ok = synchro.every(s => s.ok) && avertissements.length === 0;
  return { synchro, trous, droits, avertissements, ok, publiable: ok && droits.every(d => d.droits !== "a-verifier") };
}

/* ——— éditions non destructives ——— */
/** Décaler la musique de `delta` à partir de l'instant `t0` du film. Un clip qui traverse t0 est scindé : ce qui joue avant
    reste ; ce qui suit repart en t0 + delta (delta > 0 : un silence s'ouvre ; delta < 0 : le passage [t0 + delta, t0) est retiré). */
export function decalerMusique(musique: Montage["musique"], t0: number, delta: number): Montage["musique"] {
  return musique.flatMap(c => {
    const fin = c.position + (c.fin - c.debut);
    if (c.position >= t0 - 1e-9) return [{ ...c, position: c.position + delta }];
    if (fin <= t0 + 1e-9) return [c];
    const k = c.debut + (t0 - c.position);                                        // le temps du morceau à la coupure
    const avant = delta >= 0 ? { ...c, fin: k } : { ...c, fin: c.debut + Math.max(0, t0 + delta - c.position) };
    const apres = { ...c, id: c.id + "+", debut: k, position: t0 + delta };
    return [...(avant.fin - avant.debut > 1e-9 ? [avant] : []), apres];
  });
}
/** Insérer un plan sur une piste, avant `avantId` (ou à la fin) : tout ce qui suit dans le film — les plans de toutes les
    pistes ET la musique — se décale de sa durée. L'alignement image–musique des repères verrouillés est conservé. */
export function inserer(m: Montage, plan: Plan, avantId: string | null): Montage {
  const places = placer(m);
  const avant = avantId ? places.find(p => p.id === avantId) : null;
  const t0 = avant ? avant.debutFilm : dureeMontage(m);
  const plans = [...m.plans]; const i = avantId ? plans.findIndex(p => p.id === avantId) : plans.length;
  plans.splice(i < 0 ? plans.length : i, 0, plan);
  /* les autres pistes : un plan qui commence à t0 ou après reçoit un décalage supplémentaire (seulement le premier de chaque piste) */
  const decales = new Set<Piste>([plan.piste]);
  const suite = plans.map(p => {
    if (decales.has(p.piste)) return p;
    const pp = places.find(x => x.id === p.id);
    if (pp && pp.debutFilm >= t0 - 1e-9) { decales.add(p.piste); return { ...p, decalage: (p.decalage ?? 0) + plan.duree }; }
    return p;
  });
  /* ajouté à la fin : il commence après tout (image et musique), pas seulement après le dernier plan de sa piste */
  if (!avant) { const finPiste = Math.max(0, ...places.filter(p => p.piste === plan.piste).map(p => p.finFilm));
    suite[suite.indexOf(plan)] = { ...plan, decalage: (plan.decalage ?? 0) + Math.max(0, t0 - finPiste) }; }
  return { ...m, plans: suite, musique: decalerMusique(m.musique, t0, plan.duree) };
}

/** Remplacer la source d'un plan (ex. une vidéo Manus) : même place, même durée ; le média est aligné pour que son instant
    `synchroMedia` tombe sur le premier point verrouillé du plan. L'ancienne source reste dans l'historique. */
export function remplacer(m: Montage, planId: string, source: Source, raison: string, quand = new Date().toISOString()): Montage {
  return { ...m, plans: m.plans.map(p => {
    if (p.id !== planId) return p;
    const s0 = p.synchro?.[0];
    const media = source.genre === "video" ? { debut: source.synchroMedia !== undefined && s0 ? source.synchroMedia - s0.tPlan : 0 } : undefined;
    return { ...p, source, media, statut: "provisoire" as const, historique: [...(p.historique ?? []), { source: p.source, duree: p.duree, media: p.media, remplaceLe: quand, raison }] };
  }) };
}

/** Changer la durée d'un plan : refusé s'il porte un point verrouillé qui en sortirait, ou si un plan suivant est verrouillé
    (allonger ou raccourcir avant un repère déplacerait l'image par rapport à la musique) — sauf si la musique suit (`avecMusique`). */
export function redimensionner(m: Montage, planId: string, duree: number, avecMusique = false): { montage: Montage } | { refus: string } {
  const places = placer(m), p = places.find(x => x.id === planId); if (!p) return { refus: "plan inconnu" };
  if ((p.synchro ?? []).some(s => s.tPlan > duree)) return { refus: "un point verrouillé sortirait du plan" };
  const delta = duree - p.duree;
  const suivantsVerrouilles = places.some(x => x.piste === p.piste && x.debutFilm >= p.finFilm - 1e-9 && (x.synchro?.length ?? 0) > 0);
  if (suivantsVerrouilles && !avecMusique) return { refus: "un plan suivant est verrouillé sur la musique : déplacer l'image décalerait l'impact" };
  const plans = m.plans.map(x => x.id === planId ? { ...x, duree } : x);
  const musique = avecMusique ? decalerMusique(m.musique, p.finFilm, delta) : m.musique;
  return { montage: { ...m, plans, musique } };
}

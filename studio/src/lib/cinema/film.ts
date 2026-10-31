/**
 * Un film comme DONNÉES (et non une timeline codée en dur) : la base du futur Disque CINÉMA.
 *
 * Chaque plan porte son minutage (en temps du morceau), sa description de mise en scène, sa fabrication, ses points de
 * synchro, et plusieurs VERSIONS (prévisualisation, génération, tournage, substitution…) dont une seule est active.
 * Remplacer un plan = ajouter une version et l'activer : rien n'est écrasé, les durées et les repères ne bougent pas.
 *
 * `versMontage` traduit le film (ou une partie) en Montage pour le moteur existant (lib/cinema/montage.ts), qui garde
 * la vérification des repères verrouillés à la milliseconde. Le Bureau éditera ces données ; le moteur ne change pas.
 */
import { verifier, type Montage, type Morceau, type Plan, type Provenance, type Source } from "./montage";

export type Fabrication = "manus" | "moteur" | "hybride" | "tournage";
export type NatureVersion = "previz" | "generation" | "tournage" | "substitution" | "rendu" | "attente";
export type StatutVersion = "a-faire" | "en-cours" | "provisoire" | "valide";

export interface VersionPlan {
  id: string; nature: NatureVersion; statut: StatutVersion;
  /** null = pas encore de média (un tournage à faire, une génération à lancer) */
  source: Source | null;
  provenance: Provenance;
  /** pour une génération : le prompt exact, les références jointes, le modèle, la date (registre des droits) */
  generation?: { outil: string; modele?: string; prompt: string; references?: string[]; date?: string };
  note?: string;
}

export interface PlanFilm {
  id: string; titre: string; mouvement: string;
  /** en secondes du morceau : [debut, fin[ */
  debut: number; fin: number;
  registre: string; image: string; camera: string; lumiere: string; transition: string;
  fabrication: Fabrication;
  /** les repères du morceau qui doivent tomber dans ce plan (« morceau:repere ») */
  synchro?: string[];
  versions: VersionPlan[];
  active: string;
}

export interface Film {
  id: string; titre: string; sousTitre?: string; morceau: string;
  format: { largeur: number; hauteur: number; images: number; extraction: string[] };
  mouvements: { id: string; titre: string; debut: number; fin: number }[];
  /** les planches de référence (cohérence d'une génération à l'autre) */
  references?: { id: string; titre: string }[];
  plans: PlanFilm[];
}

const EPS = 1e-6;

/** Vérifier la cohérence du film : plans contigus et couvrants, versions actives existantes, repères dans leur plan. */
export function verifierFilm(f: Film, m: Morceau) {
  const erreurs: string[] = [];
  const plans = [...f.plans].sort((a, b) => a.debut - b.debut);
  if (Math.abs(plans[0]?.debut ?? 1) > EPS) erreurs.push("le film ne commence pas à 0");
  for (let i = 1; i < plans.length; i++) if (Math.abs(plans[i].debut - plans[i - 1].fin) > EPS) erreurs.push(`${plans[i - 1].id} → ${plans[i].id} : ${(plans[i].debut - plans[i - 1].fin).toFixed(3)} s d'écart`);
  if (Math.abs((plans.at(-1)?.fin ?? 0) - m.duree) > EPS) erreurs.push(`le film ne finit pas avec le morceau (${plans.at(-1)?.fin} ≠ ${m.duree})`);
  for (const p of plans) {
    if (!(p.fin > p.debut)) erreurs.push(`${p.id} : durée nulle ou négative`);
    if (!p.versions.some(v => v.id === p.active)) erreurs.push(`${p.id} : version active « ${p.active} » introuvable`);
    for (const ref of p.synchro ?? []) {
      const r = m.reperes[ref.split(":")[1]];
      if (!r) erreurs.push(`${p.id} : repère inconnu ${ref}`);
      else if (r.temps < p.debut - EPS || r.temps >= p.fin - EPS) erreurs.push(`${p.id} : le repère ${ref} (${r.temps} s) est hors du plan [${p.debut}, ${p.fin}[`);
    }
  }
  /* chaque repère verrouillé du morceau doit être porté par un plan */
  for (const [k, r] of Object.entries(m.reperes)) if (r.verrouille && !plans.some(p => (p.synchro ?? []).includes(`${m.id}:${k}`))) erreurs.push(`repère verrouillé ${k} (${r.temps} s) sans plan`);
  return { ok: erreurs.length === 0, erreurs };
}

const PROVISOIRE: Provenance = { auteur: "AIME", droits: "proprietaire", note: "plan en attente de son média" };

/** Traduire le film (ou l'intervalle [debut, fin[ du morceau) en Montage : les plans actifs, découpés à l'intervalle. */
export function versMontage(f: Film, m: Morceau, opts: { debut?: number; fin?: number; id?: string; titre?: string; repli?: (p: PlanFilm) => Source } = {}): Montage {
  const d0 = opts.debut ?? 0, d1 = opts.fin ?? m.duree;
  const plans: Plan[] = [];
  for (const p of [...f.plans].sort((a, b) => a.debut - b.debut)) {
    const a = Math.max(p.debut, d0), b = Math.min(p.fin, d1); if (b - a <= EPS) continue;
    const v = p.versions.find(x => x.id === p.active)!;
    let source: Source = v.source ?? opts.repli?.(p) ?? { genre: "texte", texte: p.titre };
    /* un plan procédural découpé : son temps narratif suit la coupe (le récit EST le temps du morceau) */
    if (source.genre === "procedural") source = { ...source, narratif: [[0, a], [b - a, b]] };
    plans.push({
      id: p.id, titre: p.titre, chapitre: f.id, piste: "video", source, duree: +(b - a).toFixed(6),
      statut: v.statut === "valide" ? "valide" : v.statut === "provisoire" ? "provisoire" : "a-remplacer",
      provenance: v.provenance ?? PROVISOIRE,
      synchro: (p.synchro ?? []).map(ref => ({ repere: ref, tPlan: +(m.reperes[ref.split(":")[1]].temps - a).toFixed(6) })).filter(s => s.tPlan >= -EPS && s.tPlan < b - a),
    });
  }
  return {
    id: opts.id ?? f.id, titre: opts.titre ?? f.titre, version: "chapitre",
    description: `${f.titre} · ${plans.length} plans · morceau ${d0}–${d1} s`,
    morceaux: { [m.id]: m }, chapitres: [{ id: f.id, titre: f.titre, morceau: m.id }],
    musique: [{ id: "m1", morceau: m.id, debut: d0, fin: d1, position: 0, fondus: d1 >= m.duree ? { sortie: 1.5 } : undefined }],
    plans,
  };
}

/** Le film et sa traduction vérifiés ensemble : la cohérence des données, puis les repères au moteur de montage. */
export function controlerFilm(f: Film, m: Morceau) {
  const donnees = verifierFilm(f, m), montage = verifier(versMontage(f, m));
  return { donnees, montage, ok: donnees.ok && montage.ok };
}

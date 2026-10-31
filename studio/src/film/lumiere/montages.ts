/**
 * LUMIERE — les versions du même projet, décrites dans le moteur de montage (lib/cinema/montage).
 *  1. l'animatique de 44 s (03:04.25 → 03:48.25), conservée telle quelle ;
 *  2. le chapitre complet « La Fleur du Ciel » (4 min 13), même moteur, même repère ;
 *  3. le projet de court métrage (30 min) : une proposition d'ordre des morceaux, SANS contenu fabriqué ;
 *  4. la version longue (~1 h) : l'architecture l'accepte (chapitres en nombre libre) ; rien n'est produit.
 *
 * Repère canonique : l'impact de « La Fleur du Ciel » est à 03:18.255 du WAV original. Toutes les versions s'y verrouillent.
 */
import type { Montage, Morceau, Plan, Provenance } from "../../lib/cinema/montage";
import { versMontage, type Film } from "../../lib/cinema/film";
import filmFleur from "./donnees/fleur-du-ciel.film.json";

const MUSIQUE_MATT: Provenance = { auteur: "Matt (Matthieu Lecointre)", droits: "a-verifier",
  note: "Œuvre originale déclarée par Matt. Avant toute diffusion publique : vérifier composition, enregistrement et collaborateurs éventuels." };
const RENDU: Provenance = { auteur: "Rendu procédural AIME (WebGL)", outil: "LUMIERE · rendu.ts", droits: "proprietaire", note: "Plan provisoire, remplaçable." };

/** Les repères mesurés dans le WAV original (analyse du signal, 48 kHz ; voir docs/one/lumiere-naissance-du-point.md). */
export const FLEUR_DU_CIEL: Morceau = {
  id: "fleur-du-ciel", titre: "La Fleur du Ciel", fichier: "12-La Fleur Du Ciel.wav", duree: 253.0, tempo: 120, provenance: MUSIQUE_MATT,
  reperes: {
    lumiere: { temps: 8.25, nature: "entrée de la brillance (592 → 1 103 Hz)", verrouille: false, source: "mesure" },
    section2: { temps: 72.25, nature: "section (énergie −19 → −16 dB)", verrouille: false, source: "mesure" },
    section3: { temps: 112.25, nature: "section", verrouille: false, source: "mesure" },
    section4: { temps: 160.25, nature: "section", verrouille: false, source: "mesure" },
    sombre: { temps: 186.25, nature: "section sombre, le grave entre", verrouille: false, source: "mesure" },
    goutte: { temps: 194.25, nature: "mesure −2", verrouille: false, source: "mesure" },
    creux: { temps: 196.275, nature: "le creux : < −30 dBFS jusqu'à 196,750", verrouille: true, source: "mesure" },
    chute: { temps: 196.775, nature: "les aigus sans grave", verrouille: true, source: "mesure" },
    impact: { temps: 198.255, nature: "L'IMPACT : le grave +53 dB en 20 ms, sur le temps", verrouille: true, source: "compose", note: "Composé par Matt pour cet effet ; repère canonique, immuable." },
    detente: { temps: 226.25, nature: "la musique se détend (2 160 → 830 Hz)", verrouille: true, source: "mesure" },
    perle: { temps: 242.75, nature: "après le quasi-silence (03:56–03:58), le grave revient (+12 dB), sur le temps", verrouille: true, source: "mesure" },
    fin: { temps: 253.0, nature: "fin du morceau", verrouille: false, source: "mesure" },
  },
};

const proc = (id: string, titre: string, chapitre: string, duree: number, narratif: [number, number][], extra: Partial<Plan> = {}): Plan =>
  ({ id, titre, chapitre, piste: "video", source: { genre: "procedural", scene: "lumiere", narratif }, duree, statut: "provisoire", provenance: RENDU, ...extra });
/** un plan dont le récit avance au même pas que le film, de n0 à n0 + duree */
const lineaire = (n0: number, duree: number): [number, number][] => [[0, n0], [duree, n0 + duree]];

/* 1. L'animatique : 44 s, temps narratif = temps du film (rien ne change par rapport à la version validée) */
export const ANIMATIQUE: Montage = {
  id: "lumiere-animatique", titre: "La naissance du Point — animatique", version: "animatique",
  description: "44 s · 03:04.25 → 03:48.25 · l'introduction facultative du site.",
  morceaux: { [FLEUR_DU_CIEL.id]: FLEUR_DU_CIEL },
  chapitres: [{ id: "naissance", titre: "La naissance du Point", morceau: FLEUR_DU_CIEL.id }],
  musique: [{ id: "m1", morceau: FLEUR_DU_CIEL.id, debut: 184.25, fin: 228.25, position: 0, fondus: { entree: 2, sortie: 2 } }],
  plans: [
    proc("a-infini", "I — L’infini", "naissance", 4, lineaire(0, 4)),
    proc("a-traversee", "II — La traversée", "naissance", 6, lineaire(4, 6)),
    proc("a-suspension", "III — La suspension", "naissance", 4.005, lineaire(10, 4.005), { synchro: [{ repere: "fleur-du-ciel:creux", tPlan: 2.025 }, { repere: "fleur-du-ciel:chute", tPlan: 2.525 }] }),
    proc("a-impact", "IV — L’impact", "naissance", 3.995, lineaire(14.005, 3.995), { synchro: [{ repere: "fleur-du-ciel:impact", tPlan: 0 }] }),
    proc("a-ripple", "V — RIPPLE", "naissance", 12, lineaire(18, 12)),
    proc("a-atlas", "VI — ATLAS et .0NE", "naissance", 14, lineaire(30, 14), { synchro: [{ repere: "fleur-du-ciel:detente", tPlan: 12 }] }),
  ],
};

/* 2. Le chapitre complet : les 4 min 13. De 03:14.25 à 03:46.25, le récit est IDENTIQUE à l'animatique (même repère,
      même image) ; avant, il s'étire sur les sections mesurées ; après, le blanc vient lentement avec la fin de la musique. */
export const CHAPITRE_FLEUR: Montage = {
  id: "lumiere-fleur-du-ciel", titre: "La Fleur du Ciel — chapitre complet", version: "chapitre",
  description: "4 min 13 · le morceau entier · l'impact à 03:18.255.",
  morceaux: { [FLEUR_DU_CIEL.id]: FLEUR_DU_CIEL },
  chapitres: [{ id: "fleur", titre: "La Fleur du Ciel", morceau: FLEUR_DU_CIEL.id }],
  musique: [{ id: "m1", morceau: FLEUR_DU_CIEL.id, debut: 0, fin: 253.0, position: 0, fondus: { sortie: 1.5 } }],
  plans: [
    proc("c-avant", "Avant la lumière", "fleur", 8.25, [[0, 0], [8.25, 1.9]]),
    proc("c-infini", "L’infini", "fleur", 64, [[0, 1.9], [0.6, 2.0], [64, 4.0]], { synchro: [{ repere: "fleur-du-ciel:lumiere", tPlan: 0 }] }),
    proc("c-traversee", "La traversée", "fleur", 88, [[0, 4.0], [88, 8.0]], { synchro: [{ repere: "fleur-du-ciel:section2", tPlan: 0 }] }),
    proc("c-nuages", "Les nuages s’ouvrent", "fleur", 34, [[0, 8.0], [34, 10.0]], { synchro: [{ repere: "fleur-du-ciel:section4", tPlan: 0 }] }),
    proc("c-suspension", "La suspension", "fleur", 4.005, lineaire(10, 4.005), { synchro: [{ repere: "fleur-du-ciel:goutte", tPlan: 0 }, { repere: "fleur-du-ciel:creux", tPlan: 2.025 }, { repere: "fleur-du-ciel:chute", tPlan: 2.525 }] }),
    proc("c-impact", "L’impact", "fleur", 3.995, lineaire(14.005, 3.995), { synchro: [{ repere: "fleur-du-ciel:impact", tPlan: 0 }] }),
    proc("c-ripple", "RIPPLE", "fleur", 12, lineaire(18, 12)),
    proc("c-atlas", "ATLAS et .0NE", "fleur", 12, lineaire(30, 12)),
    proc("c-retour", "Le retour à la lumière", "fleur", 26.75, [[0, 42], [3, 43.2], [26.75, 44]], { synchro: [{ repere: "fleur-du-ciel:detente", tPlan: 0 }] }),
  ],
};

/* 3. Le court métrage : une PROPOSITION d'ordre (≈ 30 min) — aucun plan n'est produit ; chaque chapitre attend ses images. */
const m = (id: string, titre: string, fichier: string, duree: number): Morceau => ({ id, titre, fichier, duree, reperes: {}, provenance: MUSIQUE_MATT });
const ALBUM: Morceau[] = [
  m("prelude", "Prélude — Le Souffle des Étoiles", "1-Prélude - Le Souffle des Étoiles.wav", 254.84),
  m("flamme", "D’une Flamme à une Étoile", "2-D'une Flamme à une Étoile.wav", 97.4),
  m("souffle", "Le Souffle", "3-Le Souffle.wav", 117.0),
  m("reconciliation", "Réconciliation", "8-Réconciliation.wav", 102.96),
  m("calin", "Câlin du ciel", "5-Câlin du ciel.wav", 159.64),
  m("semences", "Les Semences de Pardon", "4-Les Semences de Pardon.wav", 219.88),
  FLEUR_DU_CIEL,
  m("over-the-sky", "Over the Sky", "9-Over the Sky.wav", 194.24),
  m("ehyeh", "Ehyeh", "13-Ehyeh.wav", 179.12),
  m("amen-lux", "Amen Lux", "15-Amen Lux.wav", 142.08),
  m("silence", "Silence, ça fleurit", "14a-Silence, ça fleurit.wav", 79.96),
];
export const COURT_METRAGE: Montage = (() => {
  let position = 0;
  const musique = ALBUM.map((mo, i) => { const c = { id: `m${i + 1}`, morceau: mo.id, debut: 0, fin: mo.duree, position }; position += mo.duree; return c; });
  /* seul le chapitre « La Fleur du Ciel » a déjà ses images : les plans du chapitre complet, posés à sa place */
  const avant = ALBUM.slice(0, ALBUM.indexOf(FLEUR_DU_CIEL)).reduce((s, mo) => s + mo.duree, 0);
  return {
    id: "lumiere-court-metrage", titre: "LUMIERE — court métrage (projet)", version: "court-metrage",
    description: "Proposition d'ordre, ≈ 30 min (11 morceaux) ; à valider. Un seul chapitre a ses images.",
    morceaux: Object.fromEntries(ALBUM.map(mo => [mo.id, mo])),
    chapitres: ALBUM.map(mo => ({ id: mo.id, titre: mo.titre, morceau: mo.id })),
    musique,
    plans: CHAPITRE_FLEUR.plans.map((p, i) => i === 0 ? { ...p, decalage: avant } : p),
  };
})();

/* 2 bis. LE CLIP : « La Fleur du Ciel » en entier, le voyage (galaxie → ciel → nuit → goutte → arc-en-ciel → Terre → herbe → le Disque).
   C'est l'introduction du site. Le temps du récit EST le temps du morceau ; chaque plan commence sur un repère mesuré. */
const voy = (id: string, titre: string, debut: number, fin: number, extra: Partial<Plan> = {}): Plan =>
  ({ id, titre, chapitre: "clip", piste: "video", source: { genre: "procedural", scene: "voyage", narratif: [[0, debut], [fin - debut, fin]] }, duree: +(fin - debut).toFixed(3), statut: "provisoire", provenance: RENDU, ...extra });
export const CLIP_FLEUR: Montage = {
  id: "lumiere-clip", titre: "La Fleur du Ciel — le clip", version: "chapitre",
  description: "4 min 13 · le morceau entier · de la galaxie au Disque posé dans l'herbe · l'impact à 03:18.255.",
  morceaux: { [FLEUR_DU_CIEL.id]: FLEUR_DU_CIEL },
  chapitres: [{ id: "clip", titre: "La Fleur du Ciel", morceau: FLEUR_DU_CIEL.id }],
  musique: [{ id: "m1", morceau: FLEUR_DU_CIEL.id, debut: 0, fin: 253.0, position: 0, fondus: { sortie: 1.5 } }],
  plans: [
    voy("v-noir", "L’obscurité", 0, 8.25),
    voy("v-galaxie", "La galaxie", 8.25, 72.25, { synchro: [{ repere: "fleur-du-ciel:lumiere", tPlan: 0 }] }),
    voy("v-ciel", "Au-dessus des nuages", 72.25, 112.25, { synchro: [{ repere: "fleur-du-ciel:section2", tPlan: 0 }] }),
    voy("v-crepuscule", "La nuit tombe", 112.25, 160.25, { synchro: [{ repere: "fleur-du-ciel:section3", tPlan: 0 }] }),
    voy("v-nuages", "Dans les nuages de la nuit", 160.25, 186.25, { synchro: [{ repere: "fleur-du-ciel:section4", tPlan: 0 }] }),
    voy("v-eau", "L’eau de la nuit", 186.25, 194.25, { synchro: [{ repere: "fleur-du-ciel:sombre", tPlan: 0 }] }),
    voy("v-goutte", "La goutte", 194.25, 198.255, { synchro: [{ repere: "fleur-du-ciel:goutte", tPlan: 0 }, { repere: "fleur-du-ciel:creux", tPlan: 2.025 }, { repere: "fleur-du-ciel:chute", tPlan: 2.525 }] }),
    voy("v-arc", "L’arc-en-ciel", 198.255, 206.25, { synchro: [{ repere: "fleur-du-ciel:impact", tPlan: 0 }] }),
    voy("v-terre", "La Terre vue du ciel", 206.25, 226.25),
    voy("v-herbe", "Le Disque dans l’herbe", 226.25, 242.75, { synchro: [{ repere: "fleur-du-ciel:detente", tPlan: 0 }] }),
    voy("v-perle", "La Perle s’allume", 242.75, 253, { synchro: [{ repere: "fleur-du-ciel:perle", tPlan: 0 }] }),
  ],
};

/** Le film du séquencier (31 plans), lu depuis ses DONNÉES : la base du Disque CINÉMA. Chaque plan joue sa version active. */
export const FILM_FLEUR_DONNEES = filmFleur as unknown as Film;
export const FILM_FLEUR = versMontage(FILM_FLEUR_DONNEES, FLEUR_DU_CIEL, { id: "lumiere-film", titre: "La Fleur du Ciel — le film (séquencier, prévisualisation)" });
/** La séquence qui fonde le film : 03:14.25 → 03:26.25 (approche, suspension, contact, première onde). */
export const PREVIZ_IMPACT = versMontage(FILM_FLEUR_DONNEES, FLEUR_DU_CIEL, { debut: 194.25, fin: 206.25, id: "lumiere-previz-impact", titre: "Prévisualisation 03:14 → 03:26" });

export const VERSIONS = [CLIP_FLEUR, ANIMATIQUE, CHAPITRE_FLEUR, COURT_METRAGE, FILM_FLEUR, PREVIZ_IMPACT] as const;

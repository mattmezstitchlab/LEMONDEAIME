/**
 * LUMIERE — « La naissance du Point » : la partition du film.
 * La musique fixe le rythme : chaque transition est posée sur un repère MESURÉ dans le WAV original
 * (12-La Fleur Du Ciel.wav, 48 kHz, analyse du signal ; aucune écoute humaine). Le temps du film t = temps musical − 184,25 s.
 *
 * Extrait : 03:04.25 → 03:48.25 (44 s, 22 mesures à 120 BPM), copie exacte des échantillons, jamais dans le dépôt.
 */
import { DISQUE_CENTRAL, type Onde } from "../../lib/onde/contrat";

export const EXTRAIT = { morceau: "La Fleur du Ciel", fichier: "12-La Fleur Du Ciel.wav", debut: 184.25, fin: 228.25, tempo: 120 } as const;
export const DUREE = EXTRAIT.fin - EXTRAIT.debut;   // 44 s
export const IMAGES_PAR_SECONDE = 24;
const T = (musique: number) => +(musique - EXTRAIT.debut).toFixed(3);

/** Les repères mesurés (temps musical en s → temps du film). */
export const REPERES = {
  debut: { musique: 184.25, t: 0, quoi: "Début de l'extrait (fin d'une section ; fondu d'entrée du son sur 2 s)" },
  lumiere: { musique: 186.25, t: T(186.25), quoi: "Une section sombre commence (centroïde 1 290 → 770 Hz) : la lumière apparaît" },
  traversee: { musique: 188.25, t: T(188.25), quoi: "Mesure −5 : la perle commence sa descente" },
  goutte: { musique: 194.25, t: T(194.25), quoi: "Mesure −2 : la perle devient goutte au-dessus de l'eau calme" },
  suspension: { musique: 196.275, t: T(196.275), quoi: "Le creux : le son tombe sous −30 dBFS (min −46,7) jusqu'à 03:16.750 ; le grave est coupé. Le temps s'arrête." },
  chute: { musique: 196.775, t: T(196.775), quoi: "Entrée des aigus sans grave (centroïde 2 000 → 3 850 Hz) : la goutte se détache et tombe" },
  attaque: { musique: 198.24, t: T(198.24), quoi: "Début de l'attaque : le grave remonte de −65 dB" },
  contact: { musique: 198.255, t: T(198.255), quoi: "Le contact : le grave atteint son pic −6 dB (+53 dB en 20 ms) sur un temps fort à 120 BPM" },
  ripple: { musique: 202.25, t: T(202.25), quoi: "Mesure +2 : l'onde se pose en géométrie Ripple" },
  atlas: { musique: 214.25, t: T(214.25), quoi: "Mesure +8 : la grille apparaît" },
  disque: { musique: 222.25, t: T(222.25), quoi: "Mesure +12 : le Disque se forme au centre" },
  repli: { musique: 226.25, t: T(226.25), quoi: "Mesure +14 : la musique se détend (centroïde 2 160 → 830 Hz) : le Disque se replie en Point ; la lumière devient blanche" },
  fin: { musique: 228.25, t: DUREE, quoi: "Fin de l'extrait (fondu de sortie du son sur 2 s) ; la Première rencontre" },
} as const;

/** pulsations : la grille à 120 BPM, ancrée sur le contact (mesuré à ±10 ms sur chaque temps de 03:18 à 03:46) */
export const pulsation = (t: number) => { const p = 60 / EXTRAIT.tempo, x = (t - REPERES.contact.t) / p; return { temps: Math.floor(x), phase: x - Math.floor(x) }; };

export const TABLEAUX = [
  { id: "infini", nom: "I — L’infini", debut: 0, fin: REPERES.traversee.t, texte: "Un cosmos profond, presque noir. Une très petite lumière nacrée apparaît dans l’immensité ; l’image respire." },
  { id: "traversee", nom: "II — La traversée", debut: REPERES.traversee.t, fin: REPERES.goutte.t, texte: "La lumière devient une perle. Elle descend à travers les nuages ; les étoiles disparaissent ; la brume l’enveloppe et révèle les particules en suspension." },
  { id: "suspension", nom: "III — La suspension", debut: REPERES.goutte.t, fin: REPERES.contact.t, texte: "La perle devient une goutte d’eau au cœur nacré, suspendue au-dessus d’une eau parfaitement calme. La musique se tait presque : le temps s’arrête. Puis la goutte tombe." },
  { id: "impact", nom: "IV — L’impact", debut: REPERES.contact.t, fin: REPERES.ripple.t, texte: "La goutte rencontre l’eau sur l’attaque de la musique. Un premier cercle apparaît, puis d’autres, sur les temps." },
  { id: "ripple", nom: "V — RIPPLE", debut: REPERES.ripple.t, fin: REPERES.atlas.t, texte: "La caméra s’élève : les cercles deviennent la géométrie du Disque Ripple — anneaux, repères angulaires, positions sur un cercle." },
  { id: "atlas", nom: "VI — ATLAS et .0NE", debut: REPERES.atlas.t, fin: DUREE, texte: "Les cercles révèlent une grille ; des carrés de lumière émergent sous la surface. Au centre, le Disque apparaît, puis se replie en un seul Point nacré. La lumière devient blanche." },
] as const;
export const tableauA = (t: number) => TABLEAUX.find(x => t >= x.debut && t < x.fin) ?? TABLEAUX[TABLEAUX.length - 1];

/** L'onde du film : DÉCORATIVE (elle ne transmet rien), rythmée par l'attaque mesurée. Les cercles naissent sur les temps. */
export const ONDE_FILM: Onde = {
  centre: { x: 0.5, y: 0.5 }, rayon: 0.004, nombre: 7, espacement: 0.035, amplitude: 1, vitesse: 0.16, attenuation: 0.16, phase: 0,
  couleur: "#f4f1ff",
  declencheur: { genre: "decoratif", raison: "film LUMIERE : la goutte rencontre l’eau", synchro: { source: "attaque musicale mesurée à 03:18.255", instant: REPERES.contact.musique } },
  progression: { debut: REPERES.contact.t, duree: 26, cadence: 60 / EXTRAIT.tempo * 2 },   // un front toutes les 2 pulsations (1 s)
};

/* ——— l'état de la scène à l'instant t (tout est une fonction pure du temps : rendu exact image par image) ——— */
const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lisse = (a: number, b: number, t: number) => { const x = cl((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const R = REPERES;

export interface Scene {
  t: number;
  etoiles: number; nuages: number; defilement: number; brume: number;
  /** la perle : position (fractions de l'écran, y vers le bas), rayon (fraction de la hauteur), éclat */
  perle: { x: number; y: number; r: number; eclat: number; visible: number };
  /** 0 = perle, 1 = goutte */
  goutte: number;
  /** l'eau : visibilité, hauteur de l'horizon (fraction), inclinaison de la caméra (0 = rasante, 1 = verticale) */
  eau: number; horizon: number; plongee: number;
  /** temps écoulé depuis le contact (négatif avant) */
  depuisContact: number;
  /** 0..1 : les fronts rejoignent les anneaux Ripple ; repères angulaires ; positions polaires */
  ripple: number; reperes: number; positions: number;
  grille: number; carres: number; disque: number; repli: number; blanc: number;
  /** le gel : 1 pendant le creux (le temps s'arrête) */
  gel: number;
  son: number;
  /** le voyage du clip complet (absent dans l'animatique) */
  voyage?: Voyage;
}
export interface Voyage {
  galaxie: number; avance: number; ciel: number; crepuscule: number; nuit: number; mer: number;
  arc: number; traverse: number; terre: number; altitude: number; plongeeSol: number; avanceSol: number;
  /** le Disque posé dans l'herbe : visibilité, rayon (fraction de la hauteur), la goutte qui tombe (0..1), l'activation de la Perle (0..1) */
  disqueSol: number; rDisque: number; goutteDisque: number; activation: number;
}

export function scene(t: number): Scene {
  const descente = lisse(R.traversee.t, R.goutte.t + 0.6, t);
  /* la chute : de l'entrée des aigus au contact, accélérée (la gravité) */
  const chute = cl((t - R.chute.t) / (R.contact.t - R.chute.t)), yChute = chute * chute;
  const yPerle = t < R.goutte.t ? 0.47 + 0.03 * descente : 0.5;   /* l'étoile naît AU CENTRE ; la descente se lit dans les nuages qui défilent */
  const ySusp = 0.5, yEau = 0.62;   // la goutte au-dessus de l'eau (l'horizon à 0.42 ; le point de contact à 0.62)
  const y = t < R.goutte.t ? yPerle : t < R.chute.t ? ySusp : t < R.contact.t ? ySusp + (yEau - ySusp) * yChute : yEau;
  /* une respiration très lente de la perle (illustrative) ; suspendue pendant le gel */
  const gel = t >= R.suspension.t && t < R.chute.t ? 1 : 0;
  const souffle = gel ? 0 : Math.sin(t * 1.3) * 0.004 * (1 - lisse(R.goutte.t, R.chute.t, t));
  const apparition = lisse(R.lumiere.t - 0.3, R.lumiere.t + 1.6, t);
  const rPerle = (0.0035 + 0.01 * lisse(R.lumiere.t + 1, R.goutte.t, t) + 0.012 * lisse(R.goutte.t - 1, R.goutte.t + 1.5, t)) * (1 + souffle * 20);
  const apresContact = t >= R.contact.t;
  return {
    t,
    etoiles: (1 - lisse(R.traversee.t + 1, R.goutte.t - 1, t)) * lisse(0, 1.2, t),
    nuages: lisse(R.traversee.t - 0.5, R.traversee.t + 2, t) * (1 - lisse(R.goutte.t - 1.2, R.goutte.t + 0.6, t)),
    defilement: descente,
    brume: lisse(R.traversee.t + 2, R.goutte.t, t) * (1 - lisse(R.ripple.t, R.ripple.t + 4, t)),
    perle: { x: 0.5, y: y + souffle, r: rPerle, eclat: 1 + (gel ? 0.25 : 0) + (t >= R.chute.t && !apresContact ? 0.4 * chute : 0), visible: apresContact ? 0 : apparition },
    goutte: lisse(R.goutte.t, R.goutte.t + 1.6, t),
    eau: lisse(R.goutte.t - 1, R.goutte.t + 1, t),
    horizon: 0.42,
    plongee: lisse(R.ripple.t - 1, R.ripple.t + 5, t),
    depuisContact: t - R.contact.t,
    ripple: lisse(R.ripple.t + 2, R.ripple.t + 8, t),
    reperes: lisse(R.ripple.t + 5, R.ripple.t + 9, t),
    positions: lisse(R.ripple.t + 8, R.atlas.t, t),
    grille: lisse(R.atlas.t, R.atlas.t + 4, t),
    carres: lisse(R.atlas.t + 2, R.disque.t, t),
    disque: lisse(R.disque.t, R.disque.t + 2.5, t),
    repli: lisse(R.repli.t, R.repli.t + 1.2, t),
    blanc: lisse(R.repli.t + 1.0, R.fin.t - 0.15, t),
    gel,
    son: lisse(0, 2, t) * (1 - lisse(DUREE - 2, DUREE, t)),
  };
}

/** le rayon du Disque central (fraction du rayon du cadran) quand il se replie en Point */
export const RAYON_DISQUE = DISQUE_CENTRAL;

/** la timeline lisible (secondes, images à 24 i/s, temps musical) */
export const timeline = () => Object.entries(REPERES).map(([id, r]) => ({ id, t: r.t, image: Math.round(r.t * IMAGES_PAR_SECONDE), musique: `${Math.floor(r.musique / 60).toString().padStart(2, "0")}:${(r.musique % 60).toFixed(3).padStart(6, "0")}`, quoi: r.quoi }));

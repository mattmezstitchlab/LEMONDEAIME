/**
 * LUMIERE — l'atterrissage (P20 → P24) : 03:14.25 → 03:26.25 du morceau. La séquence qui fonde le film.
 *
 *  P20 03:14.25  l'approche : vue verticale, la goutte de lumière descend au-dessus du Disque posé dans l'herbe (aube bleue)
 *  P21 03:16.275 le creux : le temps s'arrête — macro de la goutte suspendue, le monde inversé dans sa lentille
 *  P22 03:16.775 les aigus : la chute, droit vers la perle éteinte
 *  P23 03:18.255 LE CONTACT (repère canonique, verrouillé) : la goutte rejoint la perle, qui s'allume ; la première onde
 *                RIPPLE part du centre, allume les anneaux du cadran puis les points de la couronne, un par temps
 *  P24 03:22.25  ras de l'herbe : l'onde traverse la prairie, chaque goutte de rosée s'allume à son passage
 *
 * Le temps du récit EST le temps du morceau. L'onde est celle du contrat RIPPLE (lib/onde/contrat.ts) : décorative,
 * rythmée par l'attaque mesurée à 198,255 s, elle ne transmet rien.
 */
import { fronts, type Onde } from "../../lib/onde/contrat";
import type { Scene, Voyage } from "./partition";

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const l = (a: number, b: number, t: number) => { const x = cl((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const exp = (a: number, b: number, u: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * cl(u));

/** les repères mesurés dans le WAV original (secondes du morceau) */
export const REPERES_ATTERRISSAGE = { approche: 194.25, creux: 196.275, chute: 196.775, contact: 198.255, rosee: 202.25, fin: 206.25 } as const;
const R = REPERES_ATTERRISSAGE;
/** L'image du contact : à 24 i/s, l'image n° 4758 commence à 198,250 s et contient l'attaque (198,255 s). C'est elle qui
    montre la goutte sur la perle — 5 ms avant la mi-montée de la basse, la plus proche possible (l'image suivante serait
    37 ms en retard). Le repère musical, lui, reste 198,255 s. */
export const IMAGE_CONTACT = Math.floor(R.contact * 24) / 24;
export const TEMPS = 0.5;   // 120 BPM

/** Altitude de la caméra verticale après le contact : le Disque occupe alors ~53 % de la hauteur de l'image. */
const ALT = 0.34;

/** L'onde de l'activation : un front par mesure (2 temps), du centre de la perle vers la prairie. Rayons en unités « sol »
    (le rayon du Disque vaut 0,05625 sol, quelle que soit l'altitude). Décorative : rythmée par l'attaque, elle ne transmet rien. */
export const ONDE_ACTIVATION: Onde = {
  centre: { x: 0.5, y: 0.5 }, rayon: 0.002, nombre: 4, espacement: 0.006, amplitude: 1, vitesse: 0.042, attenuation: 0.32, phase: 0,
  couleur: "#c9b8ff",
  declencheur: { genre: "decoratif", raison: "LUMIERE — l'activation de la perle du Disque", synchro: { source: "La Fleur du Ciel (WAV original)", instant: R.contact } },
  progression: { debut: 0, duree: 8, cadence: 2 * TEMPS * 2 },
};
export const RAYON_DISQUE_SOL = 0.3 * 0.3 / 1.6;

export interface Atterrissage {
  /** 1 nuit · 2 aube · 3 lever du soleil (0 = non utilisé) */
  heure: number;
  /** 1 pendant le creux : le plan macro */
  macro: number;
  /** le centre de l'onde au sol (unités sol) */
  centreSol: [number, number];
  /** les fronts au sol : [rayon, intensité] × 2 */
  ondeSol: [number, number, number, number];
  /** la goutte vue d'en haut est ronde (perle() garde la matière de la goutte) */
  rond: number;
  /** les fronts de l'onde (unités sol) pour le calque */
  fronts: { rayon: number; intensite: number }[];
  /** la goutte vue d'en haut (rayon, fraction de la hauteur ; 0 = absente), dessinée par le calque, au-dessus du Disque */
  goutteHaut: number;
  /** le temps (pour les particules et la respiration de la nacre) */
  temps: number;
}

export function sceneAtterrissage(t: number): Scene {
  const macro = t >= R.creux && t < R.chute ? 1 : 0;
  /* P24 au ras de l'herbe est réservé à la génération ; la prévisualisation monte à la verticale pendant que l'onde s'étend */
  /* la caméra verticale descend un peu pendant l'approche, puis se fige au contact */
  const altitude = t >= R.rosee ? exp(ALT, 0.62, (t - R.rosee) / (R.fin - R.rosee)) : t < R.approche ? exp(3, 0.46, (t - 186.25) / (R.approche - 186.25)) : t < R.creux ? exp(0.46, 0.37, (t - R.approche) / (R.creux - R.approche)) : exp(0.37, ALT, (t - R.chute) / (IMAGE_CONTACT - R.chute));
  /* la goutte vue d'en haut : elle s'éloigne de la caméra (rapetisse), lentement puis en tombant (la gravité) */
  const chute = cl((t - R.chute) / (IMAGE_CONTACT - R.chute));
  const rGoutte = t < R.creux ? 0.07 - 0.02 * l(R.approche, R.creux, t) : 0.05 - 0.043 * chute * chute;
  const age = t - IMAGE_CONTACT;
  const fs = age >= 0 ? fronts(ONDE_ACTIVATION, age).map(f => ({ rayon: f.rayon, intensite: f.intensite })) : [];
  /* au ras de l'herbe, l'onde vient du Disque, au loin devant la caméra, vers nous */
  const centreSol: [number, number] = [0, 0];
  const a = fs[0], b = fs[1];
  const v: Voyage & { att: Atterrissage } = {
    galaxie: 0, avance: 0, ciel: 0, crepuscule: 0, nuit: 0, mer: 0, arc: 0, traverse: 0,
    terre: 1, altitude, plongeeSol: 1, avanceSol: 0,
    disqueSol: macro ? 0 : 1, rDisque: 0.3 * (0.3 / altitude), goutteDisque: 0,
    activation: age >= 0 ? cl((age + 1 / 24) / (9 * TEMPS)) : 0,
    att: {
      heure: 1.6 + 0.4 * l(186.25, R.approche, t) + 0.35 * l(R.contact, R.fin, t), macro, centreSol, rond: 1,   /* l'Orbe reste ronde : c'est le point du site AIME, pas une goutte géométrique */
      ondeSol: [a?.rayon ?? 0, a?.intensite ?? 0, b?.rayon ?? 0, b?.intensite ?? 0],
      fronts: fs,
      temps: t,
      goutteHaut: !macro && t >= R.approche && t < IMAGE_CONTACT ? rGoutte : 0,
    },
  };
  return {
    t: -100, etoiles: 0, nuages: 0, defilement: 0, brume: 0,
    perle: { x: 0.5, y: 0.47, r: 0.2, eclat: 1, visible: macro },
    goutte: 1, eau: 0, horizon: 0.42, plongee: 0, depuisContact: -1,
    ripple: 0, reperes: 0, positions: 0, grille: 0, carres: 0, disque: 0, repli: 0, blanc: 0,
    gel: macro, son: 1, voyage: v,
  };
}

/** P17, plan de substitution (non destructif) : le Disque déjà préparé, seul dans la prairie de nuit, sa perle éteinte.
    Il tient la place du tournage des mains du fondateur, qui le remplacera sans changer la durée ni les repères. */
export function sceneDisquePrepare(t: number): Scene {
  const s = sceneAtterrissage(R.fin + 10);
  const v = s.voyage as Voyage & { att: Atterrissage };
  const alt = exp(0.52, 0.46, (t - 168.25) / 12);
  Object.assign(v, { altitude: alt, rDisque: 0.3 * (0.3 / alt), activation: 0 });
  Object.assign(v.att, { heure: 1.15, fronts: [], ondeSol: [0, 0, 0, 0], goutteHaut: 0 });
  return s;
}

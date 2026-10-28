import type { Toile } from "../kit";
import { architectureDuSilence, filInvisible, geometrieDesJours, rondNoir } from "./signature";
import { chatALaFenetre, chatNoirNuitClaire, deuxChatsUnDimanche, felinDeVelours } from "./felins";
import { hirondelleLibre, mesangeDuJardin, oiseauxDuMatin, rougeGorgeHiver } from "./oiseaux";
import { atelierDuDimanche, fenetreSurLaCampagne, machineAEcrire, theiereEnPorcelaine } from "./maison";
import { alphabetAtelier, datePrecieuse, deuxInitiales, initialeBotanique } from "./monogrammes";
import { cercleDesEtoiles, constellationIntime, luneDeMinuit, solstice } from "./celeste";

export type Drawing = (t: Toile) => void;

/** Identifiant catalogue → dessin. */
export const DRAWINGS: Record<string, Drawing> = {
  "pz-1-1": chatALaFenetre,
  "pz-1-2": chatNoirNuitClaire,
  "pz-1-3": felinDeVelours,
  "pz-1-4": deuxChatsUnDimanche,
  "pz-2-1": rougeGorgeHiver,
  "pz-2-2": hirondelleLibre,
  "pz-2-3": mesangeDuJardin,
  "pz-2-4": oiseauxDuMatin,
  "pz-3-1": luneDeMinuit,
  "pz-3-2": solstice,
  "pz-3-3": constellationIntime,
  "pz-3-4": cercleDesEtoiles,
  "pz-4-1": machineAEcrire,
  "pz-4-2": atelierDuDimanche,
  "pz-4-3": theiereEnPorcelaine,
  "pz-4-4": fenetreSurLaCampagne,
  "pz-5-1": initialeBotanique,
  "pz-5-2": alphabetAtelier,
  "pz-5-3": deuxInitiales,
  "pz-5-4": datePrecieuse,
  "pz-6-1": rondNoir,
  "pz-6-2": architectureDuSilence,
  "pz-6-3": filInvisible,
  "pz-6-4": geometrieDesJours,
};

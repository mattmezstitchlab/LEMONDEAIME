/**
 * La création du visiteur : UNE recette 5D, nourrie par les cinq rencontres avec l'Orbe.
 * Les dimensions sont celles du moteur (structure, tracé, densité, échelle, palette), quatre réponses chacune, dans n'importe quel ordre.
 * Tant qu'une dimension n'est pas choisie, l'aperçu emploie un choix PROVISOIRE, toujours signalé comme tel, jamais confondu avec une réponse.
 * La graine est tirée une fois, au premier choix : la même recette redonne le même motif, ici comme dans l'atelier.
 * Gardée sur cet appareil (stockage du navigateur), pour reprendre la visite ; jamais envoyée ailleurs.
 */
import { useSyncExternalStore } from "react";
import { CLES, DIMENSIONS, MAX_GRAINE, VERSION, codeDe, lireCode, type Choix, type Signature } from "../../lib/motif5d/code";
import { formatParDefaut } from "../../lib/motif5d/generer";

export const PROVISOIRE: Signature = { structure: 0, trace: 2, densite: 1, echelle: 1, palette: 1 };
export interface Etape { cle: keyof Signature; k: Choix; t: number }
export interface CreationVisite { choix: Partial<Signature>; graine: number; historique: Etape[] }
export const CREATION_CLE = "pointzero:creation-visite:v1";
/** le cadeau ouvert dans l'atelier : pour ne pas l'ajouter deux fois au retour arrière */
export const OFFERTE_CLE = "pointzero:rosace-offerte:v1";

const vide = (): CreationVisite => ({ choix: {}, graine: 0, historique: [] });
function lire(): CreationVisite {
  try {
    const v = JSON.parse(localStorage.getItem(CREATION_CLE) ?? "null");
    if (!v || typeof v !== "object") return vide();
    const choix: Partial<Signature> = {};
    for (const k of CLES) if ([0, 1, 2, 3].includes(v.choix?.[k])) choix[k] = v.choix[k];
    const graine = Number.isInteger(v.graine) && v.graine > 0 && v.graine <= MAX_GRAINE ? v.graine : 0;
    const historique = Array.isArray(v.historique) ? v.historique.filter((e: Etape) => CLES.includes(e?.cle) && [0, 1, 2, 3].includes(e?.k)).slice(-40) : [];
    return { choix, graine, historique };
  } catch { return vide(); }
}
let etat: CreationVisite = typeof window === "undefined" ? vide() : lire();
const abonnes = new Set<() => void>();
let enregistrable = true;
function publier(n: CreationVisite) {
  etat = n;
  try { localStorage.setItem(CREATION_CLE, JSON.stringify(n)); enregistrable = true; } catch { enregistrable = false; /* le navigateur refuse : la création vit pour cette visite */ }
  for (const f of abonnes) f();
}
const nouvelleGraine = () => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return (a[0] % MAX_GRAINE) + 1; } catch { return (Date.now() % MAX_GRAINE) + 1; } };

export const creation = {
  lire: () => etat,
  /** un choix explicite de la personne (jamais le défilement) */
  choisir(cle: keyof Signature, k: Choix) {
    publier({ choix: { ...etat.choix, [cle]: k }, graine: etat.graine || nouvelleGraine(), historique: [...etat.historique, { cle, k, t: Date.now() }].slice(-40) });
  },
  /** une recette entière (une recette nommée) : les cinq choix d'un coup */
  recette(s: Signature, graine?: number) {
    publier({ choix: { ...s }, graine: graine ?? (etat.graine || nouvelleGraine()), historique: [...etat.historique, ...CLES.map(cle => ({ cle, k: s[cle], t: Date.now() }))].slice(-40) });
  },
  /** la même recette, une autre graine */
  varier() { publier({ ...etat, graine: (etat.graine % MAX_GRAINE) + 1 || nouvelleGraine() }); },
  /** compléter ce qui manque avec les choix provisoires : un geste explicite (« Choisir pour moi ») */
  completer() { const manquent = CLES.filter(c => etat.choix[c] === undefined); if (!manquent.length) return;
    publier({ choix: { ...PROVISOIRE, ...etat.choix }, graine: etat.graine || nouvelleGraine(), historique: [...etat.historique, ...manquent.map(cle => ({ cle, k: PROVISOIRE[cle], t: Date.now() }))].slice(-40) }); },
  oublier() { publier(vide()); },
  pourTests(v: CreationVisite) { publier(v); },
  enregistrable: () => enregistrable,
};
const abonner = (f: () => void) => { abonnes.add(f); return () => abonnes.delete(f); };
export const useCreation = () => useSyncExternalStore(abonner, () => etat, () => etat);

/** La signature de l'aperçu : les réponses, complétées par les choix provisoires. */
export const signatureDe = (c: CreationVisite): Signature => ({ ...PROVISOIRE, ...c.choix });
export const nbChoix = (c: CreationVisite) => CLES.filter(k => c.choix[k] !== undefined).length;
export const complete = (c: CreationVisite) => nbChoix(c) === 5;
/** La graine de l'aperçu : celle du visiteur, ou une graine d'attente avant le premier choix. */
export const graineDe = (c: CreationVisite) => c.graine || 59;
export const codeDeCreation = (c: CreationVisite) => codeDe({ signature: signatureDe(c), graine: graineDe(c), version: VERSION });
/** La taille réelle de l'ouvrage, la même que le compositeur de l'atelier (même recette, même motif). */
export const formatDe = (s: Signature) => formatParDefaut(s);
export const reponseDe = (cle: keyof Signature, k: Choix) => DIMENSIONS.find(d => d.cle === cle)!.reponses[k];
export const dimensionDe = (cle: keyof Signature) => DIMENSIONS.find(d => d.cle === cle)!;
export { lireCode };

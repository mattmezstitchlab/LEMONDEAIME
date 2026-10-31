/**
 * Les profils du Point (décision de Matt, 29 octobre) : Débutante, Experte, Lecture confortable, Création géométrique, Personnalisé.
 * Un profil réunit trois réglages qui existaient séparément : le niveau d'affichage du studio (lib/interfaceLevel),
 * le confort de lecture (lib/accessibilityCore) et la présentation du menu du Point (lib/point/modes).
 * Étape 1 : tout reste sur cet appareil (localStorage). La synchronisation avec le compte viendra ensuite, sans jamais écraser sans confirmation.
 * « Personnalisé » n'est pas un réglage : c'est le nom de ce que l'on a quand les réglages ne correspondent à aucun profil.
 * Le Point reste portable (aucune dépendance au studio) : le niveau d'affichage est lu et écrit sous la même clé que le studio
 * (CLE_NIVEAU = INTERFACE_LEVEL_KEY, vérifié par les tests), et le studio est prévenu par un événement.
 */
import { DEFAULT_ACCESS, readPrefs, savePrefs, type Preferences } from "../accessibilityCore";
import { ecrirePresentation, lirePresentation, type ChoixPresentation } from "./modes";

export type IdProfil = "debutante" | "experte" | "lecture" | "geometrique";
export type Niveau = "beginner" | "intermediate" | "expert";
export const CLE_NIVEAU = "pointzero:interface-level";
export function lireNiveau(): Niveau {
  try { const v = localStorage.getItem(CLE_NIVEAU); if (v === "beginner" || v === "expert") return v; } catch { /* rien */ }
  return "intermediate";
}
export interface Profil { id: IdProfil; nom: string; aide: string; niveau: Niveau; confort: Preferences; menu: ChoixPresentation }

export const PROFILS_POINT: Profil[] = [
  { id: "debutante", nom: "Débutante", aide: "Les gestes essentiels d’abord, texte un peu plus grand. Tous les outils restent accessibles à la demande.",
    niveau: "beginner", confort: { ...DEFAULT_ACCESS, fontScale: 1.1 }, menu: "auto" },
  { id: "experte", nom: "Experte", aide: "Tous les outils et réglages avancés dépliés, sans aide superflue.",
    niveau: "expert", confort: { ...DEFAULT_ACCESS }, menu: "auto" },
  { id: "lecture", nom: "Lecture confortable", aide: "Texte à 125 %, interligne large, focus renforcé, menu du Point écrit en entier.",
    niveau: "intermediate", confort: { ...DEFAULT_ACCESS, fontScale: 1.25, lineHeight: 1.8, enhancedFocus: true }, menu: "liste" },
  { id: "geometrique", nom: "Création géométrique", aide: "Tous les outils de dessin dépliés, pour les rosaces, frises et pavages ; le compositeur de rosaces reste au centre.",
    niveau: "expert", confort: { ...DEFAULT_ACCESS }, menu: "auto" },
];

export const PROFIL_CLE = "pointzero:profil:v1";
/** prévenir le studio qu'un niveau a changé ailleurs (le Confort) : il met à jour son affichage sans recharger */
export const EVENEMENT_NIVEAU = "pz:niveau";

const memesReglages = (a: Preferences, b: Preferences) => (Object.keys(DEFAULT_ACCESS) as (keyof Preferences)[]).every(k => a[k] === b[k]);

/** le profil qui correspond aux réglages en cours, ou null (« Personnalisé ») */
export function profilActuel(etat = { confort: readPrefs(), niveau: lireNiveau(), menu: lirePresentation() }): IdProfil | null {
  let dernier: string | null = null; try { dernier = localStorage.getItem(PROFIL_CLE); } catch { /* rien */ }
  const ok = (p: Profil) => p.niveau === etat.niveau && p.menu === etat.menu && memesReglages(p.confort, etat.confort);
  /* deux profils peuvent avoir les mêmes réglages (Experte, Création géométrique) : le dernier choisi l'emporte */
  const choisi = PROFILS_POINT.find(p => p.id === dernier && ok(p));
  return (choisi ?? PROFILS_POINT.find(ok))?.id ?? null;
}

/** applique un profil sur cet appareil ; renvoie false si le stockage est indisponible (le profil vaut alors pour la session) */
export function appliquerProfil(id: IdProfil): boolean {
  const p = PROFILS_POINT.find(x => x.id === id); if (!p) return false;
  let ok = true;
  try { savePrefs({ ...p.confort }); } catch { ok = false; }
  try { localStorage.setItem(CLE_NIVEAU, p.niveau); localStorage.setItem(PROFIL_CLE, p.id); } catch { ok = false; }
  if (!ecrirePresentation(p.menu)) ok = false;
  window.dispatchEvent(new CustomEvent(EVENEMENT_NIVEAU, { detail: p.niveau }));
  return ok;
}

export const nomProfil = (id: IdProfil | null) => PROFILS_POINT.find(p => p.id === id)?.nom ?? "Personnalisé";

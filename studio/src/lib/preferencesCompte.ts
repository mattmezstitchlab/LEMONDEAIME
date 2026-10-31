/**
 * Les préférences du Point dans le compte AIME (étape 2 des profils ; décision de Matt : locales d'abord, puis le compte,
 * jamais d'écrasement sans confirmation).
 * L'appareil reste la source de travail. Le compte en garde une copie, datée (maj).
 *  - Rien n'est envoyé tant que la personne n'a pas choisi « Enregistrer sur mon compte » une première fois sur cet appareil.
 *  - Ensuite, chaque changement part tout seul, mais seulement si le compte n'a pas bougé depuis (base = maj connu) ;
 *    sinon le serveur répond 409 et l'on demande : utiliser celles du compte, ou garder celles de l'appareil.
 *  - Utiliser celles du compte ne se fait que sur un geste explicite.
 * Hors d'AIME, ou sans compte, rien ne change : tout reste sur l'appareil.
 */
import { readPrefs, savePrefs, type Preferences } from "./accessibilityCore";
import { ecrirePresentation, lirePresentation, type ChoixPresentation } from "./point/modes";
import { CLE_NIVEAU, EVENEMENT_NIVEAU, lireNiveau, nomProfil, profilActuel, PROFIL_CLE, type IdProfil, type Niveau } from "./point/profils";

export interface PreferencesPoint { profil: IdProfil | null; niveau: Niveau; menu: ChoixPresentation; confort: Preferences }
export const LIEN_CLE = "pointzero:preferences-compte:v1";   // { compte, maj } : la version du compte que cet appareil connaît
const API = "/api/preferences";

export function instantane(): PreferencesPoint {
  return { profil: profilActuel(), niveau: lireNiveau(), menu: lirePresentation(), confort: readPrefs() };
}
const cle = (p: PreferencesPoint) => JSON.stringify([p.profil, p.niveau, p.menu, Object.entries(p.confort).sort()]);
export const memes = (a: PreferencesPoint, b: PreferencesPoint) => cle(a) === cle(b);
export const resume = (p: PreferencesPoint) => `${nomProfil(p.profil)} · texte à ${Math.round(p.confort.fontScale * 100)} %`;

export function lien(compte: string): number | null {
  try { const l = JSON.parse(localStorage.getItem(LIEN_CLE) ?? "null"); return l && l.compte === compte && typeof l.maj === "number" ? l.maj : null; } catch { return null; }
}
function lier(compte: string, maj: number) { try { localStorage.setItem(LIEN_CLE, JSON.stringify({ compte, maj })); } catch { /* reste pour la session */ } }

/** applique sur cet appareil des préférences venues du compte (seulement après un geste explicite) */
export function appliquer(p: PreferencesPoint) {
  savePrefs({ ...p.confort });
  try { localStorage.setItem(CLE_NIVEAU, p.niveau); if (p.profil) localStorage.setItem(PROFIL_CLE, p.profil); else localStorage.removeItem(PROFIL_CLE); } catch { /* rien */ }
  ecrirePresentation(p.menu);
  window.dispatchEvent(new CustomEvent(EVENEMENT_NIVEAU, { detail: p.niveau }));
}

export type Etat =
  | { etat: "indisponible"; raison: string }
  | { etat: "absent" }                                   // le compte n'a rien : proposer d'enregistrer
  | { etat: "a-jour"; maj: number }                      // identiques
  | { etat: "different"; compte: PreferencesPoint; maj: number };   // demander

export async function lireEtat(compte: string): Promise<Etat> {
  try {
    const r = await fetch(API, { credentials: "same-origin" }), j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) return { etat: "indisponible", raison: j.raison || "Votre compte ne répond pas : vos préférences restent sur cet appareil." };
    if (!j.preferences) return { etat: "absent" };
    if (memes(j.preferences, instantane())) { lier(compte, j.maj); return { etat: "a-jour", maj: j.maj }; }
    return { etat: "different", compte: j.preferences, maj: j.maj };
  } catch { return { etat: "indisponible", raison: "Votre compte ne répond pas : vos préférences restent sur cet appareil." }; }
}

/** enregistre les préférences de l'appareil dans le compte ; base = la version du compte acceptée en connaissance de cause */
export async function enregistrer(compte: string, base: number | null): Promise<Etat> {
  try {
    const r = await fetch(API, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferences: instantane(), base }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 409 && j.preferences) return { etat: "different", compte: j.preferences, maj: j.maj };
    if (!r.ok || !j.ok) return { etat: "indisponible", raison: j.raison || "L’enregistrement a échoué : vos préférences restent sur cet appareil." };
    lier(compte, j.maj); return { etat: "a-jour", maj: j.maj };
  } catch { return { etat: "indisponible", raison: "L’enregistrement a échoué : vos préférences restent sur cet appareil." }; }
}

/** utiliser celles du compte (geste explicite) */
export function utiliserCompte(compte: string, p: PreferencesPoint, maj: number) { appliquer(p); lier(compte, maj); }

/** une fois l'appareil lié au compte, chaque changement part tout seul (2 s après le dernier), sans jamais écraser une version plus récente */
export function suivreChangements(compte: string, surEtat: (e: Etat) => void): () => void {
  let attente: ReturnType<typeof setTimeout> | null = null;
  const changer = () => {
    const base = lien(compte); if (base === null) return;          // pas encore lié : rien ne part
    if (attente) clearTimeout(attente);
    attente = setTimeout(() => { void enregistrer(compte, base).then(surEtat); }, 2000);
  };
  window.addEventListener("pz:accessibility", changer); window.addEventListener(EVENEMENT_NIVEAU, changer);
  return () => { if (attente) clearTimeout(attente); window.removeEventListener("pz:accessibility", changer); window.removeEventListener(EVENEMENT_NIVEAU, changer); };
}

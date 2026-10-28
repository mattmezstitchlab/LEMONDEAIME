/**
 * Visibilité d'un projet (charte UniO) : quatre niveaux, chacun lisible par la forme
 * de son orbe et par son mot, jamais par la couleur seule.
 * Pour l'instant mémorisée sur cet appareil : le partage en ligne viendra avec les comptes.
 */
export type Visibility = "prive" | "restreint" | "lien" | "public";
export const VISIBILITY_KEY = "pointzero:visibilite";
export const VISIBILITY: Record<Visibility, { label: string; who: string; ring: "epais" | "satellite" | "ouvert" | "aucun" }> = {
  prive: { label: "Privé", who: "Vous seule", ring: "epais" },
  restreint: { label: "Restreint", who: "Les personnes invitées", ring: "satellite" },
  lien: { label: "Par lien", who: "Toute personne qui a le lien", ring: "ouvert" },
  public: { label: "Public", who: "Visible dans Le Monde AIME", ring: "aucun" },
};
export const VISIBILITY_ORDER: Visibility[] = ["prive", "restreint", "lien", "public"];

export function readVisibilities(): Record<string, Visibility> {
  try {
    const raw = JSON.parse(localStorage.getItem(VISIBILITY_KEY) ?? "{}") as Record<string, string>;
    return Object.fromEntries(Object.entries(raw).filter(([, v]) => (VISIBILITY_ORDER as string[]).includes(v))) as Record<string, Visibility>;
  } catch { return {}; }
}
export function visibilityOf(id: string | undefined): Visibility {
  return (id && readVisibilities()[id]) || "prive";
}
/** Renvoie false si l'appareil refuse l'écriture (navigation privée, quota). */
export function writeVisibility(id: string, value: Visibility): boolean {
  try {
    const all = readVisibilities(); all[id] = value;
    localStorage.setItem(VISIBILITY_KEY, JSON.stringify(all));
    return true;
  } catch { return false; }
}

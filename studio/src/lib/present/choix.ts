/** Les choix de la personne sur le Présent : épingler, ignorer. Sur cet appareil seulement ; toujours protégés si le stockage manque. */
import type { Choix } from "./recommander";

export const CLE_PRESENT = "aime:one:present:v1";
const ID = /^[A-Za-z0-9._-]{1,80}$/;

export function lireChoix(): Choix {
  try {
    const b = JSON.parse(localStorage.getItem(CLE_PRESENT) ?? "null");
    if (!b || typeof b !== "object") return {};
    const ignores: Record<string, number> = {};
    for (const [k, v] of Object.entries(b.ignores ?? {})) if (ID.test(k) && typeof v === "number") ignores[k] = v;
    return { epingle: typeof b.epingle === "string" && ID.test(b.epingle) ? b.epingle : undefined, ignores };
  } catch { return {}; }
}
export function ecrireChoix(c: Choix): boolean {
  try { localStorage.setItem(CLE_PRESENT, JSON.stringify(c)); return true; } catch { return false; }
}
export const epingler = (c: Choix, id: string): Choix => ({ ...c, epingle: c.epingle === id ? undefined : id });
export const ignorer = (c: Choix, id: string, maintenant: number): Choix => ({ epingle: c.epingle === id ? undefined : c.epingle, ignores: { ...(c.ignores ?? {}), [id]: maintenant } });

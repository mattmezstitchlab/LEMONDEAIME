/* La lecture de la source canonique pour la page /system : la MÊME version publique du manifeste que lit /systaime
   (src/systaime/publique.json, projetée du manifeste par tests/systaime/projeter.mjs). Aucune copie, aucune seconde vérité. */
import PUBLIQUE from "../systaime/publique.json";
import type { CaseSyst, ManifestePublic } from "../../studio/src/lib/fiche/syst";

export const MANIFESTE_PUBLIC = PUBLIQUE as unknown as ManifestePublic & { themes: string[]; couches: string[] };
export const CASES: CaseSyst[] = MANIFESTE_PUBLIC.cases;
export const VERSION_MANIFESTE: string = MANIFESTE_PUBLIC.version;

/** un signe par état : la couleur ne porte jamais seule le sens (mêmes signes que /systaime) */
export const GLYPHE: Record<string, string> = { validee: "V", "a-reverifier": "R", "test-echoue": "!", "teste-reussi": "T", "teste-non-rejoue": "t", "present-sans-test": "P", "hors-depot": "H", rien: "∅", reserve: "◌" };
export const ORDRE = ["validee", "teste-reussi", "teste-non-rejoue", "present-sans-test", "a-reverifier", "test-echoue", "hors-depot", "rien", "reserve"];

/** l'échiquier : 6 × 6 croisements dans le coin, les 28 garde-fous en L autour = 8 × 8 (même placement que /systaime) */
export function placer(cases: CaseSyst[], themes: string[], couches: string[]): (CaseSyst | null)[][] {
  const g: (CaseSyst | null)[][] = Array.from({ length: 8 }, () => Array<CaseSyst | null>(8).fill(null));
  themes.forEach((t, i) => couches.forEach((c, j) => { g[i][j] = cases.find(x => x.theme === t && x.couche === c) ?? null; }));
  cases.filter(x => x.type === "garde-fou").forEach((x, k) => { if (k < 12) g[Math.floor(k / 2)][6 + (k % 2)] = x; else { const n = k - 12; g[6 + Math.floor(n / 8)][n % 8] = x; } });
  return g;
}

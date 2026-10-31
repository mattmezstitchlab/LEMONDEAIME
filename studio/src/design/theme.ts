/**
 * Le thème AIME de la personne : Nuit, Jour, ou Auto (le réglage du système). Un réglage de confort, gardé dans ce navigateur.
 * « Auto » est résolu ici (et suit les changements du système), pour que les tokens n'existent qu'une fois (design/aime.css).
 */
import { useEffect, useState } from "react";

export type ChoixTheme = "auto" | "nuit" | "jour";
export type Theme = "nuit" | "jour";
const CLE = "aime:theme";

export function lireChoix(): ChoixTheme {
  try { const v = localStorage.getItem(CLE); return v === "nuit" || v === "jour" ? v : "auto"; } catch { return "auto"; }
}
const systeme = (): Theme => typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches ? "jour" : "nuit";

/** Le choix, et le thème effectivement appliqué (data-aime). */
export function useTheme(): { choix: ChoixTheme; theme: Theme; choisir: (c: ChoixTheme) => void } {
  const [choix, setChoix] = useState<ChoixTheme>(lireChoix);
  const [sys, setSys] = useState<Theme>(systeme);
  useEffect(() => {
    const m = window.matchMedia?.("(prefers-color-scheme: light)"); if (!m) return;
    const f = () => setSys(systeme()); m.addEventListener?.("change", f); return () => m.removeEventListener?.("change", f);
  }, []);
  const choisir = (c: ChoixTheme) => { setChoix(c); try { if (c === "auto") localStorage.removeItem(CLE); else localStorage.setItem(CLE, c); } catch { /* rien */ } };
  return { choix, theme: choix === "auto" ? sys : choix, choisir };
}

export const CHOIX_THEMES: { id: ChoixTheme; nom: string }[] = [{ id: "auto", nom: "Auto" }, { id: "jour", nom: "Jour" }, { id: "nuit", nom: "Nuit" }];

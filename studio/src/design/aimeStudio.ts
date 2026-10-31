/**
 * Le studio sur le socle AIME, Jour et Nuit (validé par Matt le 29 octobre, 16 h 24).
 * Le thème suit le réglage « Thème » du Confort du Point (Comme l'appareil / Clair / Sombre), déjà posé par
 * lib/accessibilityCore sur <html data-pz-theme> : Clair → Jour, Sombre → Nuit. Aucun code du Point n'est modifié.
 * Pour essayer sans toucher au Confort : ?aime=jour ou ?aime=nuit (retenu sur l'appareil), ?aime=off pour revenir au Confort.
 * Voir design/aime-studio.css.
 */
import "./aime-studio.css";

const CLE = "aime:studio";
function forcage(): "jour" | "nuit" | null {
  try {
    const q = new URLSearchParams(window.location.search).get("aime");
    if (q === "off") localStorage.removeItem(CLE);
    else if (q === "jour" || q === "nuit") localStorage.setItem(CLE, q);
    const v = localStorage.getItem(CLE);
    return v === "jour" || v === "nuit" ? v : null;
  } catch { return null; }
}

export function appliquerApercuAime() {
  const racine = document.documentElement, force = forcage();
  const suivre = () => { racine.dataset.aimeStudio = force ?? (racine.dataset.pzTheme === "dark" ? "nuit" : "jour"); };
  suivre();
  if (!force && typeof MutationObserver !== "undefined") new MutationObserver(suivre).observe(racine, { attributes: true, attributeFilter: ["data-pz-theme"] });
}

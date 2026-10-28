import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ToolIcon } from "./ToolIcons";
import { GESTES } from "./OrbeGuide";
import type { Tool } from "../lib/stitch";

/**
 * Réplique du studio pour l'accueil : la grille entre les deux docks (charte UniO), avec les mêmes libellés que StudioDocks.
 * Le Point s'y promène d'un outil à l'autre, comme dans la vraie visite ; la légende dit ce que fait l'outil.
 * Rien n'est lu ni écrit. Le défilement s'arrête d'un clic (Pause) et ne démarre pas quand l'appareil demande moins d'animations.
 */
export interface Arret { k: string; nom: string; dit: string; dock: "haut" | "bas";
  /** ce qui se déplie pendant l'arrêt : la grille des points, le nuancier, la loupe */
  bloc?: "outils" | "nuancier" | "loupe";
  /** le geste que Le Point brode sur la case */
  geste?: keyof typeof GESTES }
export const ARRETS: Arret[] = [
  { k: "orbe", dock: "haut", nom: "Le menu", dit: "L’accueil, les réglages et l’affichage : débutante, confirmée ou experte." },
  { k: "dessiner", dock: "haut", nom: "Dessiner", dit: "Déplie, sous le dock, la grille de tous les points et outils ; choisir la replie.", bloc: "outils" },
  { k: "cross", dock: "haut", nom: "La croix", dit: "Le Point imite le geste : deux diagonales dans une case.", bloc: "outils", geste: "cross" },
  { k: "back", dock: "haut", nom: "Le point arrière", dit: "D’un coin de case à l’autre, le long de la grille.", bloc: "outils", geste: "back" },
  { k: "broder", dock: "haut", nom: "Broder", dit: "Suivre le patron : marquer une case, un bloc, une ligne ; garer un fil." },
  { k: "fils", dock: "haut", nom: "Fils", dit: "Le nuancier DMC se déplie dans le dock. Les pixels qui scintillent montrent où chaque fil est brodé.", bloc: "nuancier" },
  { k: "partager", dock: "haut", nom: "Partager", dit: "Inviter à regarder en direct, choisir qui voit, exporter en PDF." },
  { k: "historique", dock: "haut", nom: "Annuler, rétablir", dit: "Chaque geste se reprend." },
  { k: "chercher", dock: "haut", nom: "Chercher", dit: "Un fil, un outil, une fonction : quelques lettres suffisent." },
  { k: "profil", dock: "haut", nom: "Mes ouvrages", dit: "Tous vos ouvrages, rangés dans le dock : rouvrir, déposer, inviter." },
  { k: "cercle", dock: "bas", nom: "Le cercle", dit: "Il suit l’avancement et change le dock : Repères, Fils, Progression." },
  { k: "lectures", dock: "bas", nom: "Trois lectures", dit: "Réaliste, À plat ou Patron : la même grille, trois regards." },
  { k: "symboles", dock: "bas", nom: "Symboles", dit: "Les symboles par-dessus les couleurs, comme sur papier." },
  { k: "zoom", dock: "bas", nom: "La loupe", dit: "Un dock se déplie : la grille agrandie là où vous survolez.", bloc: "loupe" },
  { k: "tout-voir", dock: "bas", nom: "Tout voir", dit: "Le patron entier revient à l’écran." },
];
const DUREE = 2600;
const POINTS_DEMO: [Tool, string][] = [["cross", "Croix"], ["half", "Demi-point"], ["quarter", "Quart"], ["threeQuarter", "Trois quarts"], ["petite", "Petite croix"], ["back", "Point arrière"], ["long", "Point lancé"], ["knot", "Nœud"], ["bead", "Perle"], ["hand", "Main"], ["erase", "Gomme"], ["fill", "Remplir"]];
/* des teintes de roses et de feuilles ; chacune avec sa petite carte de pixels (déterministe) */
const FILS_DEMO = ["#BC4365", "#E48E9F", "#F5B9C4", "#8C1D3F", "#5F7A3A", "#7E9A52", "#A9BF7E", "#3E5228", "#F3D7DC", "#D4687F", "#2E3B1E", "#C9D9A6"];
function carte(n: number) { const pts: [number, number][] = []; let g = n * 9301 + 49297; for (let k = 0; k < 18; k++) { g = (g * 9301 + 49297) % 233280; const a = g / 233280; g = (g * 9301 + 49297) % 233280; const b = g / 233280; const r = 3 + a * 6, t = b * 6.28; pts.push([Math.round(10 + Math.cos(t) * r), Math.round(10 + Math.sin(t) * r * .9)]); } return pts; }

export default function StudioDemo({ projectName = "Roses anciennes" }: { projectName?: string }) {
  const reduit = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [i, setI] = useState(0);
  const [lecture, setLecture] = useState(!reduit);
  const cadre = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const a = ARRETS[i];

  useEffect(() => {
    if (!lecture) return;
    const t = window.setTimeout(() => setI(n => (n + 1) % ARRETS.length), DUREE);
    return () => window.clearTimeout(t);
  }, [lecture, i]);

  /* l'orbe se pose au bord de l'outil, côté écran */
  useLayoutEffect(() => {
    const placer = () => {
      const c = cadre.current, el = c?.querySelector<HTMLElement>(`[data-k="${a.k}"]`);
      if (!c || !el) return;
      const bc = c.getBoundingClientRect(), be = el.getBoundingClientRect();
      if (!be.width) return;
      setPos({ x: be.left - bc.left + be.width / 2, y: a.dock === "haut" ? be.bottom - bc.top + 10 : be.top - bc.top - 10 });
    };
    placer();
    window.addEventListener("resize", placer);
    return () => window.removeEventListener("resize", placer);
  }, [a]);

  const k = (cle: string) => ({ "data-k": cle, "data-point": cle === a.k ? "1" : undefined });
  return <div className="sdemo-zone">
    <div className="sdemo" ref={cadre} aria-hidden="true">
      <img className="sdemo-grid" src={import.meta.env.BASE_URL + "images/grille-roses.png"} alt="" width="680" height="680" loading="lazy" />
      <div className="sdemo-head">
        <div className="sdemo-top">
          <span className="sdemo-sq" {...k("orbe")}><i className="sdemo-nacre" /></span>
          <i className="sdemo-sep" />
          <span className="sdemo-brand">Point Zéro</span>
          <i className="sdemo-sep" />
          <span {...k("dessiner")}>Dessiner <small>10</small></span>
          <span {...k("broder")}>Broder <small>10</small></span>
          <span {...k("fils")}>Fils <small>2</small></span>
          <span {...k("partager")}>Partager <small>6</small></span>
          <i className="sdemo-sep" />
          <span className="sdemo-ic" {...k("historique")}>↶ ↷</span>
          <i className="sdemo-sep" />
          <span className="sdemo-ic sdemo-loupe" {...k("chercher")}>⌕</span>
          <span className="sdemo-ic sdemo-moi" {...k("profil")}>◯</span>
        </div>
        <p className="sdemo-crumbs">Point Zéro › {projectName}</p>
      </div>
      <div className="sdemo-bottom">
        <span className="sdemo-cercle" {...k("cercle")}><i className="sdemo-nacre" /></span>
        <span className="sdemo-place">{projectName}</span>
        <i className="sdemo-sep" />
        <span className="sdemo-seg" {...k("lectures")}><b>Réaliste</b><em>À plat</em><em>Patron</em></span>
        <span {...k("symboles")}>Symboles</span>
        <i className="sdemo-sep" />
        <span className="sdemo-seg" {...k("zoom")}><em>⌕</em><em>−</em><em>+</em></span>
        <span className="sdemo-light" {...k("tout-voir")}>Tout voir</span>
      </div>
      {a.bloc === "outils" && <div className="sdemo-bloc sdemo-outils">
        <p>Les points</p>
        <div className="sdemo-cases">{POINTS_DEMO.map(([t, nom]) => <span key={t} className={"sdemo-case" + (t === "cross" ? " sdemo-case-on" : "")} {...k(t)}>
          <ToolIcon tool={t} /><small>{nom}</small>
          {a.geste && a.k === t && <svg key={a.k} className="og-geste sdemo-geste" width="64" height="64" viewBox="0 0 56 56"><path className="og-geste-fil" d={GESTES[a.geste]} pathLength={100} /><circle className="og-geste-aiguille" r="6" style={{ offsetPath: `path("${GESTES[a.geste]}")` }} /></svg>}
        </span>)}</div>
      </div>}
      {a.bloc === "nuancier" && <div className="sdemo-bloc sdemo-nuancier">
        <p>Nuancier DMC · dans le motif</p>
        <div className="sdemo-pastilles">{FILS_DEMO.map((hex, n) => <span key={hex} style={{ background: hex }}>
          <svg viewBox="0 0 20 20" className="sdemo-pixels">{carte(n).map(([x, y], m) => <rect key={m} x={x} y={y} width="1.4" height="1.4" className={"dg-scintille dg-scintille-" + (m % 3)} fill={n % 4 === 2 || n === 8 || n === 11 ? "#0b0b0c" : "#fff"} />)}</svg>
        </span>)}</div>
      </div>}
      {a.bloc === "loupe" && <div className="sdemo-loupe-vue"><span style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/grille-roses.png)` }} /><small>Loupe · 15 × 15 cases</small></div>}
      {pos && <span className="sdemo-point" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }} />}
    </div>
    <div className="sdemo-legende">
      <p aria-live={lecture ? "off" : "polite"}><b>Le Point</b> · {a.dock === "haut" ? "dock du haut" : "dock du bas"} · <strong>{a.nom}</strong> — {a.dit}</p>
      <div className="sdemo-ctl" role="group" aria-label="Commander la démonstration">
        <button type="button" aria-label="Outil précédent" onClick={() => { setLecture(false); setI(n => (n - 1 + ARRETS.length) % ARRETS.length); }}>‹</button>
        <button type="button" aria-pressed={!lecture} onClick={() => setLecture(v => !v)}>{lecture ? "Pause" : "Lecture"}</button>
        <button type="button" aria-label="Outil suivant" onClick={() => { setLecture(false); setI(n => (n + 1) % ARRETS.length); }}>›</button>
      </div>
    </div>
  </div>;
}

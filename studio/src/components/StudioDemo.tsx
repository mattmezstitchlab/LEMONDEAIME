import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Réplique du studio pour l'accueil : la grille entre les deux docks (charte UniO), avec les mêmes libellés que StudioDocks.
 * Le Point s'y promène d'un outil à l'autre, comme dans la vraie visite ; la légende dit ce que fait l'outil.
 * Rien n'est lu ni écrit. Le défilement s'arrête d'un clic (Pause) et ne démarre pas quand l'appareil demande moins d'animations.
 */
export interface Arret { k: string; nom: string; dit: string; dock: "haut" | "bas" }
export const ARRETS: Arret[] = [
  { k: "orbe", dock: "haut", nom: "Le menu", dit: "BurO, accueil, réglages et affichage : débutante, confirmée ou experte." },
  { k: "dessiner", dock: "haut", nom: "Dessiner", dit: "Composer le patron case par case : croix, fractions, points arrière, formes." },
  { k: "broder", dock: "haut", nom: "Broder", dit: "Suivre le patron : marquer une case, un bloc, une ligne ; garer un fil." },
  { k: "fils", dock: "haut", nom: "Fils", dit: "Le fil actif et tout le nuancier DMC, cherché en français." },
  { k: "partager", dock: "haut", nom: "Partager", dit: "Inviter à regarder en direct, choisir qui voit, exporter en PDF." },
  { k: "historique", dock: "haut", nom: "Annuler, rétablir", dit: "Chaque geste se reprend." },
  { k: "chercher", dock: "haut", nom: "Chercher", dit: "Un fil, un outil, une fonction : quelques lettres suffisent." },
  { k: "profil", dock: "haut", nom: "Mes ouvrages", dit: "Rouvrir un ouvrage, déposer un fichier, inviter." },
  { k: "cercle", dock: "bas", nom: "Le cercle", dit: "Il suit l’avancement et change le dock : Repères, Fils, Progression." },
  { k: "lectures", dock: "bas", nom: "Trois lectures", dit: "Réaliste, À plat ou Patron : la même grille, trois regards." },
  { k: "symboles", dock: "bas", nom: "Symboles", dit: "Les symboles par-dessus les couleurs, comme sur papier." },
  { k: "zoom", dock: "bas", nom: "Zoomer", dit: "La loupe, moins et plus, au plus près de la croix." },
  { k: "tout-voir", dock: "bas", nom: "Tout voir", dit: "Le patron entier revient à l’écran." },
];
const DUREE = 2600;

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

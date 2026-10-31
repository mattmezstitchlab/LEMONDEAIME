import { useEffect, useState } from "react";
import Point from "./Point";
import { commandesDuBloc, eviterObstacles, placePointDuBloc } from "../../lib/point/registre";

/**
 * Le Point d'un bloc : posé sur le bord du bloc sélectionné (ici, le Cadre de l'ouvrage), il ouvre le menu de ce type de bloc.
 * C'est le même Point (même noyau, même Confort, mêmes présentations) ; seules les commandes viennent du registre.
 * Le bloc garde ses poignées : le Point se pose à côté, jamais dessus.
 */
/* ce que le Point du bloc ne doit jamais couvrir : les actions du centre de la grille vide */
const OBSTACLES = ".pz-point-zero > *";
export default function PointDuBloc<C>({ type, nom, contexte, selecteur = ".cadre", obstacles = OBSTACLES, part, etiquette, centre }: { type: string; nom: string; contexte: C; selecteur?: string; obstacles?: string; part?: number; etiquette?: string; centre?: Parameters<typeof Point>[0]["centre"] }) {
  const [pos, setPos] = useState<{ left: number; top: number; bord: string } | null>(null);
  useEffect(() => {
    let el: HTMLElement | null = null, obs: MutationObserver | null = null, raf = 0;
    const lire = () => {
      el = el && document.contains(el) ? el : document.querySelector<HTMLElement>(selecteur);
      if (!el) { setPos(null); return; }
      const cs = getComputedStyle(el), v = (k: string) => parseFloat(cs.getPropertyValue(k)) || 0;
      const b = { x: v("--fx0"), y: v("--fy0"), w: v("--fw"), h: v("--fh") };
      const haut = document.querySelector(".pzs-top")?.getBoundingClientRect().bottom ?? 72;
      const ecran = { w: window.innerWidth, h: window.innerHeight };
      const p = eviterObstacles(placePointDuBloc(b, ecran, haut + 8), [...document.querySelectorAll(obstacles)].map(o => o.getBoundingClientRect()), ecran, haut + 8);
      setPos(v => v && v.left === p.left && v.top === p.top && v.bord === p.bord ? v : p);
      /* les panneaux du bas (Confort, Loupe) s'ouvrent au-dessus du Point du bloc, pour ne jamais le couvrir */
      document.documentElement.style.setProperty("--pz-bas-libre", Math.round(window.innerHeight - p.top + 8) + "px");
    };
    const programmer = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(lire); };
    lire();
    const brancher = () => { el = document.querySelector<HTMLElement>(selecteur); if (el) { obs?.disconnect(); obs = new MutationObserver(programmer); obs.observe(el, { attributes: true, attributeFilter: ["style"] }); } };
    brancher();
    const minuteur = window.setInterval(() => { if (!el || !document.contains(el)) brancher(); programmer(); }, 800); /* les obstacles vont et viennent (la grille vide, le texte agrandi) */
    window.addEventListener("resize", programmer);
    return () => { obs?.disconnect(); cancelAnimationFrame(raf); window.clearInterval(minuteur); window.removeEventListener("resize", programmer); document.documentElement.style.removeProperty("--pz-bas-libre"); };
  }, [selecteur, obstacles]);
  const modes = commandesDuBloc(type, contexte);
  if (!pos) return null;
  return <div className="lp-bloc" data-bord={pos.bord} style={{ left: pos.left, top: pos.top }}>
    <Point centre={centre} contexte={"bloc-" + type} memoire={"bloc-" + type} ancrage="autour" guide="point-du-bloc" part={part} etiquette={`outils du bloc ${nom}` + (etiquette ? ", " + etiquette : "")} modes={modes} />
  </div>;
}

/**
 * .0NE — le Disque posé dans une page : LA MÊME pièce que l'atelier (la géométrie de lib/tambour/disque, la couronne,
 * le même Point en présentation « tambour »), avec un contenu réel au centre. Aucun second Disque : seules la place
 * (un carré dans la page au lieu de l'écran) et le contenu du centre changent.
 * La taille des commandes (.0NE) et la taille du texte (Confort) entrent dans la géométrie : tout reste dans la couronne.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Point from "../point/Point";
import { anneauSvg, geometrieDisque, type Disque } from "../../lib/tambour/disque";
import { EVENEMENT_ONE } from "../../lib/one/preferences";
import type { ModePoint } from "../../lib/point/modes";
import "../TambourAtelier.css";
import "./DisqueOne.css";

const lireVar = (k: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(k)) || 1;

export default function DisqueOne({ contexte, modes, centre, etiquette, max = 560, bois = true }: {
  contexte: string; modes: ModePoint[]; centre: ReactNode; etiquette: string;
  /** le côté maximal du disque, en px */
  max?: number; bois?: boolean;
}) {
  const hote = useRef<HTMLDivElement>(null);
  const [cote, setCote] = useState(0), [reglages, setReglages] = useState(0);
  /* le cartouche : le nom et l'aide de la commande visée (au survol, au focus, au toucher), comme dans l'atelier */
  const [vise, setVise] = useState("");
  const viser = (e: React.SyntheticEvent) => { const b = (e.target as Element).closest?.("[role=menuitem]") as HTMLElement | null; if (b) setVise((b.querySelector(".lp-mot")?.textContent?.replace("›", "").trim() || b.getAttribute("aria-label")?.split(",")[0] || "") + (b.title ? " — " + b.title : "")); };
  useLayoutEffect(() => {
    const el = hote.current; if (!el) return;
    const mesurer = () => setCote(Math.round(Math.min(max, el.clientWidth)));
    mesurer();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(mesurer) : null; ro?.observe(el);
    return () => ro?.disconnect();
  }, [max]);
  /* un réglage change (texte, commandes) : la géométrie se recalcule */
  useEffect(() => {
    const f = () => setReglages(n => n + 1);
    window.addEventListener("pz:accessibility", f); window.addEventListener(EVENEMENT_ONE, f);
    return () => { window.removeEventListener("pz:accessibility", f); window.removeEventListener(EVENEMENT_ONE, f); };
  }, []);
  let g: Disque | null = null;
  if (cote > 0) { void reglages; g = geometrieDisque(cote, cote, 0, { texte: lireVar("--pz-user-font-scale"), cible: lireVar("--one-cible"), bas: 0, cote: 0, toileMin: 96, court: true }); }
  const c = g ? g.Ro + 2 : 0;
  return <div className="one-disque-hote" style={{ maxWidth: max }}><div ref={hote} className="one-disque" role="group" aria-label={etiquette} style={{ height: cote || undefined }} onPointerOver={viser} onFocus={viser} onPointerLeave={() => setVise("")}>
    {g && <div className={"pzt pzt-pose pzt-ouvert pzt-etiq-" + g.etiquettes} data-etiquettes={g.etiquettes}
      style={{ ["--pzt-x" as string]: g.cx + "px", ["--pzt-y" as string]: g.cy + "px", ["--pzt-r" as string]: g.r + "px", ["--pzt-rb" as string]: g.rb + "px", ["--pzt-ri" as string]: g.ri + "px", ["--pzt-ro" as string]: g.Ro + "px",
        ["--pzt-bl" as string]: g.env.l + "px", ["--pzt-bh" as string]: g.env.h + "px", ["--pzt-bd" as string]: g.env.rond + "px" }}>
      {bois && <div className="pzt-bois" aria-hidden="true" style={{ left: g.cx - g.rb, top: g.cy - g.rb, width: 2 * g.rb, height: 2 * g.rb }} />}
      <svg className="pzt-anneau" width={2 * c} height={2 * c} aria-hidden="true">
        <defs><linearGradient id={"one-corps-" + contexte} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#262626" /><stop offset=".55" stopColor="#141414" /><stop offset="1" stopColor="#0c0c0c" /></linearGradient></defs>
        <path className="pzt-couronne-zone" d={anneauSvg(c, g.ri, g.Ro)} fillRule="evenodd" fill={`url(#one-corps-${contexte})`} />
        <circle cx={c} cy={c} r={g.Ro - 1.5} className="pzt-rebord" /><circle cx={c} cy={c} r={g.ri + 1.5} className="pzt-rebord-int" />
        <circle cx={c} cy={c} r={g.rho} className="pzt-sillon" />
      </svg>
      <div className="one-centre" style={{ left: g.cx - g.r, top: g.cy - g.r, width: 2 * g.r, height: 2 * g.r }}>{centre}</div>
      <div className="pzt-point"><Point scene tambour={{ rayon: g.rho, cote: 2 * c, parPage: Math.max(3, g.capacite - 2) }} contexte={contexte} etiquette={etiquette} modes={modes} /></div>
    </div>}
  </div><p className="one-disque-cartouche" aria-hidden="true">{vise || "\u00a0"}</p></div>;
}

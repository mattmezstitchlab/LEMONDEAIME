import { useEffect, useMemo, useRef, useState } from "react";
import { ToolIcon } from "./ToolIcons";
import SymbolIcon from "./SymbolIcon";
import StitchMagnifier, { type StitchFocus } from "./StitchMagnifier";
import { BASE_FLOSS, contrastOn, filCorrespond, FLOSS } from "../lib/dmc";
import { assignedSymbol, computeStats, type Pattern } from "../lib/pattern";
import type { Tool } from "../lib/stitch";

/**
 * Ce qui se déplie dans les docks, rangé en grille, au lieu de longues rangées ou de panneaux à droite :
 * les points et les outils (Dessiner, Broder), le nuancier DMC (Fils) et la loupe (dock du bas).
 * Choisir un point, un outil ou un fil replie le dock : on revient à la grille de broderie.
 */
export interface Groupe { titre: string; outils: [Tool, string][] }
export const GROUPES_DESSIN: Groupe[] = [
  { titre: "Les points", outils: [["cross", "Croix"], ["half", "Demi-point"], ["quarter", "Quart"], ["threeQuarter", "Trois quarts"], ["petite", "Petite croix"], ["back", "Point arrière"], ["long", "Point lancé"], ["knot", "Nœud"], ["bead", "Perle"]] },
  { titre: "Les outils", outils: [["hand", "Main"], ["erase", "Gomme"], ["fill", "Remplir"], ["pick", "Pipette"], ["select", "Sélection"], ["lasso", "Lasso"], ["move", "Déplacer"]] },
  { titre: "Les formes", outils: [["line", "Ligne"], ["rect", "Rectangle"], ["ellipse", "Ellipse"]] },
];
export const GROUPES_BRODER: Groupe[] = [
  { titre: "Marquer ce qui est brodé", outils: [["mark", "Marquer"], ["block", "Bloc 10 × 10"], ["row", "Ligne"], ["details", "Détails"]] },
  { titre: "Les fils", outils: [["pick", "Pipette"], ["park", "Parking"], ["unpick", "À défaire"]] },
  { titre: "Se déplacer, noter", outils: [["hand", "Main"], ["note", "Note"]] },
];

export function GrilleOutils({ groupes, outil, onOutil, filtre, desactive, plus }: {
  groupes: Groupe[]; outil: Tool; onOutil: (t: Tool) => void;
  /** affichage débutante : les outils gardés */
  filtre?: (t: Tool) => boolean;
  desactive?: (t: Tool) => boolean;
  /** des fonctions en plus, en bas de la grille */
  plus?: [string, () => void][];
}) {
  return <div className="dg-grilles">
    {groupes.map(g => { const liste = g.outils.filter(([id]) => !filtre || filtre(id)); if (!liste.length) return null;
      return <section key={g.titre} className="dg-groupe" aria-label={g.titre}>
        <p className="dg-titre">{g.titre}</p>
        <ul className="dg-grille">
          {liste.map(([id, nom]) => <li key={id}><button type="button" className="dg-case" aria-pressed={outil === id} disabled={desactive?.(id)} onClick={() => onOutil(id)}>
            <ToolIcon tool={id} /><span>{nom}</span>
          </button></li>)}
        </ul>
      </section>; })}
    {plus && plus.length > 0 && <section className="dg-groupe" aria-label="Aussi">
      <p className="dg-titre">Aussi</p>
      <ul className="dg-grille dg-grille-mots">{plus.map(([nom, faire]) => <li key={nom}><button type="button" className="dg-case dg-mot" onClick={faire}>{nom}</button></li>)}</ul>
    </section>}
  </div>;
}

/** Le nuancier DMC dans le dock : recherche en français, filtre « dans le motif », une grille de pastilles. */
export function Nuancier({ pattern, couleur, onCouleur }: { pattern: Pattern; couleur: number; onCouleur: (idx: number) => void }) {
  const [q, setQ] = useState("");
  const [motif, setMotif] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => { champ.current?.focus(); }, []);
  const usage = useMemo(() => { const m = new Map<number, number>(); for (const r of computeStats(pattern).rows) m.set(r.idx, r.cross + r.half + r.quarter + r.knots); return m; }, [pattern]);
  const liste = useMemo(() => FLOSS.map((f, idx) => ({ f, idx })).filter(({ f, idx }) => (!motif || usage.has(idx)) && filCorrespond(f, q)), [q, motif, usage]);
  const actif = FLOSS[couleur];
  return <div className="dg-nuancier">
    <div className="dg-nuancier-tete">
      <span className="dg-actif"><i style={{ background: actif?.hex }} aria-hidden="true" /><span><b>DMC {actif?.code}</b><small>{actif?.name}</small></span></span>
      <label className="sr-only" htmlFor="dg-cherche-fil">Chercher un fil DMC</label>
      <input id="dg-cherche-fil" ref={champ} className="pzs-champ dg-champ" type="search" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} placeholder="Code ou couleur : 310, rouge, vert foncé…" />
      <div className="dg-filtre" role="group" aria-label="Fils montrés">
        <button type="button" aria-pressed={!motif} onClick={() => setMotif(false)}>Tous · {BASE_FLOSS.length}</button>
        <button type="button" aria-pressed={motif} onClick={() => setMotif(true)}>Dans le motif · {usage.size}</button>
      </div>
    </div>
    <p className="pzs-note" role="status">{q.trim() || motif ? liste.length + " fil" + (liste.length > 1 ? "s" : "") : "Touchez une pastille : le fil devient actif et le dock se replie."}</p>
    {liste.length === 0 ? <p className="dg-vide">Aucun fil trouvé : essayez un code (310) ou une couleur (rouge, bleu clair).</p>
      : <ul className="dg-pastilles">
        {liste.map(({ f, idx }) => { const pos = pattern.palette.includes(idx) ? assignedSymbol(pattern, idx) : -1, n = usage.get(idx);
          return <li key={f.code}><button type="button" className="dg-pastille" aria-pressed={idx === couleur} title={`DMC ${f.code} · ${f.name}`}
            aria-label={`DMC ${f.code}, ${f.name}${n ? `, ${n} points dans le motif` : ""}`} onClick={() => onCouleur(idx)}>
            <span className="dg-teinte" style={{ background: f.hex }}>{pos >= 0 && <SymbolIcon sym={pos} size={13} color={contrastOn(f.hex)} />}{n ? <i aria-hidden="true" /> : null}</span>
            <span className="dg-code">{f.code}</span>
          </button></li>; })}
      </ul>}
  </div>;
}

/** Le mode loupe : la grille agrandie là où l'on survole ou touche, dans le dock du bas. */
export const SURVOL = "pointzero:survol";
export function Loupe({ pattern }: { pattern: Pattern }) {
  const [focus, setFocus] = useState<StitchFocus>({ x: Math.floor(pattern.w / 2), y: Math.floor(pattern.h / 2) });
  useEffect(() => {
    const suivre = (e: Event) => { const d = (e as CustomEvent<StitchFocus>).detail; if (d) setFocus({ x: d.x, y: d.y }); };
    window.addEventListener(SURVOL, suivre);
    return () => window.removeEventListener(SURVOL, suivre);
  }, []);
  return <div className="dg-loupe" role="region" aria-label="Loupe : la grille agrandie sous le pointeur">
    <StitchMagnifier pattern={pattern} focus={focus} rayon={7} className="dg-loupe-vue" />
    <p className="dg-loupe-aide">Survolez la grille, ou touchez-la : la loupe suit. Elle ne modifie rien.</p>
  </div>;
}

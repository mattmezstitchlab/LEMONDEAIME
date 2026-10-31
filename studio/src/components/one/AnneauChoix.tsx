/**
 * L'ANNEAU CHOISIT, LE CENTRE AFFICHE. Le même geste que la bague du temps, pour tout : des choix sobres disposés sur un cercle
 * à l'intérieur du Disque (des mots courts, pas de cases), un point discret quand un choix porte des éléments, et au centre
 * le contenu du choix courant. Un seul niveau à la fois ; Retour (bouton, Échap) et Origine (la couronne) toujours accessibles.
 *
 * Accessibilité : un groupe de boutons radio (flèches pour passer d'un choix à l'autre, Entrée ou Espace pour choisir),
 * cibles d'au moins 40 px, libellé complet pour les lecteurs d'écran ; trop de choix : des pages (‹ ›), jamais 200 libellés minuscules.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./AnneauChoix.css";

export interface Choix { cle: string; libelle: string; complet?: string; compte?: number }
const PAGE = 12;

export default function AnneauChoix({ choix, actif, choisir, taille, niveau, retour, children }: {
  choix: Choix[]; actif: string | null; choisir: (cle: string) => void; taille: number;
  /** ce que l'anneau propose, pour les lecteurs d'écran : « les types de fichiers », « les lectures »… */
  niveau: string;
  retour?: { libelle: string; faire: () => void };
  children: ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(choix.length / PAGE));
  const ia = Math.max(0, choix.findIndex(c => c.cle === actif));
  const [page, setPage] = useState(Math.floor(ia / PAGE));
  useEffect(() => { setPage(Math.floor(ia / PAGE)); }, [ia, choix.length]);
  const vus = choix.slice(page * PAGE, page * PAGE + PAGE);
  const items: (Choix & { nav?: -1 | 1 })[] = pages > 1 ? [...vus, ...(page > 0 ? [{ cle: "‹", libelle: "‹", complet: "page précédente", nav: -1 as const }] : []), ...(page < pages - 1 ? [{ cle: "›", libelle: "›", complet: "page suivante", nav: 1 as const }] : [])] : vus;
  const n = items.length, c = taille / 2, R = taille * 0.415, rp = taille * 0.345;
  const pos = (i: number, r: number) => { const a = (i * 360 / n - 90) * Math.PI / 180; return { left: c + r * Math.cos(a), top: c + r * Math.sin(a) }; };
  const groupe = useRef<HTMLDivElement>(null);
  const clavier = (e: React.KeyboardEvent) => {
    const boutons = [...(groupe.current?.querySelectorAll<HTMLButtonElement>(".ac-choix") ?? [])], i = boutons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") boutons[(i + 1) % boutons.length]?.focus();
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") boutons[(i - 1 + boutons.length) % boutons.length]?.focus();
    else if (e.key === "Home") boutons[0]?.focus(); else if (e.key === "End") boutons[boutons.length - 1]?.focus();
    else if ((e.key === "Escape" || e.key === "Backspace") && retour) retour.faire();
    else return;
    e.preventDefault(); e.stopPropagation();
  };
  return <div className={"ac" + (taille < 260 ? " ac-petit" : "")} style={{ width: taille, height: taille }} onKeyDown={e => { if ((e.key === "Escape" || e.key === "Backspace") && retour && !(e.target as HTMLElement).closest("input,textarea")) { e.preventDefault(); e.stopPropagation(); retour.faire(); } }}>
    <svg className="ac-fond" width={taille} height={taille} aria-hidden="true">
      <circle className="bt-cercle" cx={c} cy={c} r={R + 16} /><circle className="bt-sillon" cx={c} cy={c} r={rp} />
    </svg>
    <div ref={groupe} className="ac-groupe" role="radiogroup" aria-label={niveau} onKeyDown={clavier}>
      {items.map((x, i) => { const on = !x.nav && x.cle === actif, p = pos(i, R), q = pos(i, rp);
        return <span key={x.cle}>
          <button type="button" role="radio" aria-checked={on} className={"ac-choix" + (on ? " ac-on" : "") + (x.nav ? " ac-nav" : "")} style={p}
            tabIndex={on || (!actif && i === 0) ? 0 : -1} aria-label={x.complet ?? x.libelle} title={x.complet}
            onClick={() => x.nav ? setPage(page + x.nav) : choisir(x.cle)}>{x.libelle}</button>
          {!!x.compte && <i className={"ac-point" + (on ? " ac-on" : "")} style={q} aria-hidden="true" />}
        </span>; })}
    </div>
    <div className="ac-centre">{children}</div>
  </div>;
}

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/**
 * Le dock du haut, à la charte du studio (UniO) : l'orbe dans son carré, la marque, les verbes, puis ce qui vit à droite.
 * L'orbe ouvre le même bloc que dans l'atelier : un menu en grandes lignes et, en bas, un mini dock sombre.
 * Utilisé par l'accueil ; l'atelier garde StudioDocks, qui porte en plus ses outils et sa recherche.
 */
export interface EntreeMenu { label: string; faire: () => void }
interface Props {
  /** le nom du dock pour les lecteurs d'écran */
  label: string;
  menu: EntreeMenu[];
  /** le mini dock sombre en bas du bloc (facultatif) */
  mini?: ReactNode;
  miniLabel?: string;
  marque?: ReactNode;
  /** les verbes du dock */
  children: ReactNode;
  /** à droite : la loupe, le profil, « Entrer »… */
  droite?: ReactNode;
  crumbs?: string[];
  /** Échap quand le bloc est fermé : remonter d'un niveau ; renvoie vrai si c'est fait */
  onEchap?: () => boolean;
  idBloc?: string;
}

export default function TopDock({ label, menu, mini, miniLabel = "Affichage", marque = <span className="pzs-tool pzs-marque">Point Zéro</span>, children, droite, crumbs, onEchap, idBloc = "pzs-bloc-menu" }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const orbe = useRef<HTMLButtonElement>(null);
  const bloc = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ouvert) bloc.current?.querySelector<HTMLElement>("a, button")?.focus(); }, [ouvert]);
  const fermer = (rendre = true) => { setOuvert(false); if (rendre) orbe.current?.focus(); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    if (ouvert) { e.preventDefault(); fermer(); return; }
    if (onEchap?.()) e.preventDefault();
  };
  return <section className="pzs-head" aria-label={"En-tête : " + label}>
    {ouvert && <div className="pzs-voile" aria-hidden="true" onClick={() => fermer(false)} />}
    <nav className={"pzs-top" + (ouvert ? " pzs-ouvert" : "")} aria-label={label} onKeyDown={onKey}>
      <div className="pzs-ligne">
        <button ref={orbe} type="button" className="pzs-orbe" data-guide="orbe" aria-label="Menu Point Zéro" aria-expanded={ouvert} aria-controls={idBloc} onClick={() => setOuvert(v => !v)}>
          <span className="pzs-orb" aria-hidden="true" />
        </button>
        <span className="pzs-sep" aria-hidden="true" />
        {marque}
        <span className="pzs-sep pzs-sep-marque" aria-hidden="true" />
        <div className="pzs-row" data-guide="outils">{children}</div>
        {droite && <><span className="pzs-sep" aria-hidden="true" />{droite}</>}
      </div>
      {ouvert && <div id={idBloc} className="pzs-bloc" ref={bloc}>
        <div className="pzs-bloc-corps">
          <ul className="pzs-bloc-menu">
            {menu.map(m => <li key={m.label}><button type="button" onClick={() => { fermer(false); m.faire(); }}>{m.label}</button></li>)}
          </ul>
        </div>
        {mini && <div className="pzs-mini" role="group" aria-label={miniLabel}>{mini}</div>}
      </div>}
    </nav>
    {!ouvert && crumbs && crumbs.length > 0 && <p className="pzs-crumbs">{crumbs.map((c, i) => <span key={i}>{i > 0 && <span aria-hidden="true"> › </span>}{i === crumbs.length - 1 ? <strong>{c}</strong> : c}</span>)}</p>}
  </section>;
}

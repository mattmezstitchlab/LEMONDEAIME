import { useEffect, useId, useRef, useState } from 'react';
import { ENTREES_PUBLIQUES, rubriqueActive } from './navigationPublique';
import './header-public.css';

// Extraction de la navigation de Tete : un seul rendu public pour les deux bundles.
export default function HeaderPublic({ chemin = window.location.pathname }: { chemin?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const bouton = useRef<HTMLButtonElement>(null), nav = useRef<HTMLElement>(null);
  const actif = rubriqueActive(chemin);
  useEffect(() => { setOuvert(false); }, [chemin]);
  useEffect(() => {
    if (!ouvert) return;
    nav.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const resize = () => { if (window.innerWidth > 1050) setOuvert(false); };
    const outside = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node) && !bouton.current?.contains(e.target as Node)) setOuvert(false);
    };
    window.addEventListener('resize', resize); window.addEventListener('pointerdown', outside);
    return () => { window.removeEventListener('resize', resize); window.removeEventListener('pointerdown', outside); };
  }, [ouvert]);
  const fermer = () => { setOuvert(false); bouton.current?.focus(); };
  return <header className="aime-header-public" data-header-public="" onKeyDown={e => {
    if (e.key === 'Escape' && ouvert) { e.preventDefault(); fermer(); }
  }}>
    <a className="aime-header-evitement" href="#contenu" onClick={e => {
      const cible = document.querySelector<HTMLElement>('main, [role="application"], .pz-atelier');
      if (cible) { e.preventDefault(); cible.setAttribute('tabindex', '-1'); cible.focus({ preventScroll: true }); cible.scrollIntoView({ block: 'start' }); }
    }}>Aller au contenu principal</a>
    <div className="aime-header-ligne">
      <a className="aime-header-logo" href="/" aria-label="AIME, accueil"><span className="aime-header-nacre" aria-hidden="true" />AIME<sup aria-hidden="true">®</sup></a>
      <button ref={bouton} type="button" className="aime-header-menu" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert(v => !v)}>{ouvert ? 'Fermer le menu' : 'Menu principal'}<span aria-hidden="true">{ouvert ? ' ×' : ' ☰'}</span></button>
      <nav ref={nav} id={id} className={'aime-header-liens' + (ouvert ? ' est-ouvert' : '')} aria-label="Navigation principale" onBlur={e => {
        if (ouvert && !e.currentTarget.contains(e.relatedTarget as Node) && e.relatedTarget !== bouton.current) setOuvert(false);
      }}>
        <ul>{ENTREES_PUBLIQUES.map(e => <li key={e.href}><a href={e.href} aria-current={actif === e.href ? 'page' : undefined} onClick={() => setOuvert(false)}>{e.nom}</a></li>)}</ul>
      </nav>
    </div>
  </header>;
}

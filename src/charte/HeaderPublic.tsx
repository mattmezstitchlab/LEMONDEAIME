import { createPortal } from 'react-dom';
import { lazy, Suspense } from 'react';
const PanneauPersonnel = lazy(() => import('./PanneauPersonnel'));
import { useEffect, useId, useRef, useState } from 'react';
import { ENTREES_PUBLIQUES, rubriqueActive } from './navigationPublique';
import './header-public.css';

// Extraction de la navigation de Tete : un seul rendu public pour les deux bundles.
export default function HeaderPublic({ chemin = window.location.pathname }: { chemin?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [personnel, setPersonnel] = useState(false);
  const compte = useRef<HTMLButtonElement>(null), panneau = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!personnel) return;
    const avant = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const root = document.getElementById('root'); const inertAvant = root?.inert ?? false; if(root)root.inert=true;
    const escape = (e: KeyboardEvent) => {if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setPersonnel(false);requestAnimationFrame(()=>compte.current?.focus());}};
    window.addEventListener('keydown',escape,true);
    requestAnimationFrame(() => panneau.current?.focus());
    return () => { document.body.style.overflow = avant; if(root)root.inert=inertAvant; window.removeEventListener('keydown',escape,true); };
  }, [personnel]);
  const fermerPersonnel = () => { setPersonnel(false); requestAnimationFrame(() => compte.current?.focus()); };
  const id = useId();
  const bouton = useRef<HTMLButtonElement>(null), nav = useRef<HTMLElement>(null);
  const actif = rubriqueActive(chemin);
  useEffect(() => { setOuvert(false); setPersonnel(false); }, [chemin]);
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
      <button ref={bouton} type="button" className="aime-header-menu" aria-label={ouvert ? "Fermer le menu" : "Menu principal"} aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert(v => !v)}>{ouvert ? 'Fermer' : 'Menu'}<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={ouvert ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'} /></svg></button>
      <nav ref={nav} id={id} className={'aime-header-liens' + (ouvert ? ' est-ouvert' : '')} aria-label="Navigation principale" onBlur={e => {
        if (ouvert && !e.currentTarget.contains(e.relatedTarget as Node) && e.relatedTarget !== bouton.current) setOuvert(false);
      }}>
        <ul>{ENTREES_PUBLIQUES.map(e => <li key={e.href}><a href={e.href} aria-current={actif === e.href ? 'page' : undefined} onClick={() => setOuvert(false)}>{e.nom}</a></li>)}</ul>
      </nav>
      <button ref={compte} type="button" className="aime-header-compte" aria-expanded={personnel} aria-controls="aime-personnel" onClick={() => {setOuvert(false); setPersonnel(true);}}>Mon espace</button>
    </div>
    {personnel && createPortal(<div className="aime-personnel-voile" onClick={e => {if(e.target===e.currentTarget)fermerPersonnel();}}><div ref={panneau} id="aime-personnel" className="aime-personnel" role="dialog" aria-modal="true" aria-label="Mon espace personnel" tabIndex={-1} onClickCapture={e => { if ((e.target as Element).closest('a[href]')) setPersonnel(false); }} onKeyDown={e => {
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();fermerPersonnel();}
      if(e.key==='Tab') { const els=[...e.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select')].filter(el=>el.getClientRects().length); const first=els[0],last=els[els.length-1]; if(e.shiftKey&&(document.activeElement===first||document.activeElement===e.currentTarget)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();} }
    }}><button className="aime-personnel-fermer" onClick={fermerPersonnel} type="button">Fermer mon espace</button><h2>Mon espace</h2><Suspense fallback={<p role="status">Ouverture de votre espace…</p>}><PanneauPersonnel /></Suspense></div></div>, document.body)}
  </header>;
}

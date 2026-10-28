import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Lien } from '../lib/router';
import { useSession, seDeconnecter } from '../lib/session';

export function Orbe({ taille = 30 }: { taille?: number }) {
  return <span className="orbe" aria-hidden="true" style={{ width: taille, height: taille }} />;
}
export function Marque() {
  return <span className="marque">AIME<sup aria-hidden="true">®</sup></span>;
}

/* Le dock du haut : AIME® (menu), les verbes de la page, la loupe. À droite : A+ et le « + » (Entrer, puis Point Zéro). */
export function Tete({ verbes, courant }: { verbes?: ReactNode; courant?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const session = useSession();
  const bouton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  useEffect(() => { if (ouvert) menu.current?.querySelector('a')?.focus(); }, [ouvert]);
  const fermer = () => { setOuvert(false); bouton.current?.focus(); };
  /* le menu AIME® : la marque mère, ses studios, puis Le Monde AIME qui les rassemble */
  const items: [string | null, string][] = [['/', 'AIME'], [null, 'AIME Wedding'], [null, 'Brode Way'], ['/monde', 'Le Monde AIME']];
  return (
    <header className="tete">
      <span aria-hidden="true" />
      <nav className="dock-haut" aria-label="Dock du haut">
        <div className="rangee">
          <button ref={bouton} className="outil" type="button" aria-expanded={ouvert} aria-controls="menu-aime" onClick={() => setOuvert(o => !o)} style={{ paddingLeft: 8 }}>
            <Orbe /><Marque />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" style={{ transform: ouvert ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {verbes ? <><span className="separateur" aria-hidden="true" />{verbes}</> : null}
        </div>
        <span className="separateur" aria-hidden="true" />
        <Lien className="outil loupe" href="/monde#projets" aria-label="Rechercher dans tous les projets d’AIME" title="Rechercher">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
        </Lien>
        {ouvert && <>
          <div aria-hidden="true" onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <ul id="menu-aime" ref={menu} className="menu-aime" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); fermer(); } }}>
            {items.map(([h, l]) => <li key={l}>{h
              ? <Lien href={h} aria-current={courant === h ? 'page' : undefined} onClick={() => setOuvert(false)} style={{ fontWeight: courant === h ? 700 : 500 }}>{l}</Lien>
              : <span aria-disabled="true" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 46, padding: '0 12px', fontSize: 17, color: '#55555A' }}>{l}<span className="bientot">Bientôt</span></span>}</li>)}
            {session && <li style={{ borderTop: '1px solid #ECECE8', marginTop: 6, paddingTop: 6 }}><button type="button" onClick={() => { setOuvert(false); seDeconnecter(); }}>Déconnexion</button></li>}
          </ul>
        </>}
      </nav>
      <div className="droite">
        <Lien className="aplus" href="/a-plus" aria-current={courant === '/a-plus' ? 'page' : undefined}>A+</Lien>
        <Lien className={'plus' + (session ? ' seul' : '')} href={session ? '/point-zero' : '/entrer'} aria-label={session ? 'Point Zéro : commencer quelque chose' : 'Entrer dans AIME'} title={session ? 'Point Zéro' : 'Entrer'} aria-current={courant === '/point-zero' || courant === '/entrer' ? 'page' : undefined}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          {!session && <span>Entrer</span>}
        </Lien>
      </div>
    </header>
  );
}
export function Verbe({ href, children, actif }: { href: string; children: ReactNode; actif?: boolean }) {
  return <Lien className="outil" href={href} aria-current={actif ? 'page' : undefined}>{children}</Lien>;
}

/* Le dock du bas : les lieux de la page, le lieu visible en blanc. */
export function DockBas({ lieux, label = 'Sections de la page' }: { lieux: [string, string][]; label?: string }) {
  const [courant, setCourant] = useState<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      let c: string | null = null; const ligne = window.innerHeight * 0.4;
      lieux.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= ligne) c = id; });
      setCourant(c);
    }); };
    window.addEventListener('scroll', f, { passive: true }); f();
    return () => { window.removeEventListener('scroll', f); cancelAnimationFrame(raf); };
  }, [lieux]);
  return (
    <nav className="dock-bas" aria-label={label}>
      <div>
        <Lien href="/" aria-label="AIME, accueil" className="lieu" style={{ width: 50, padding: 0, justifyContent: 'center', background: '#0B0B0C', border: 0 }}><Orbe taille={24} /></Lien>
        {lieux.map(([id, l]) => <a key={id} className="lieu" href={'#' + id} aria-current={courant === id ? 'true' : 'false'}>{l}</a>)}
      </div>
    </nav>
  );
}

export function BoutonBuro({ courant }: { courant?: boolean }) {
  return (
    <Lien className="buro-bouton" href="/buro" aria-label="Votre espace AIME" title="Votre espace" aria-current={courant ? 'page' : undefined}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.2h8.5A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /></svg>
    </Lien>
  );
}

export function Pied() {
  const col = (titre: string, liens: [string, string | null][]) => (
    <div><h2>{titre}</h2><ul>{liens.map(([l, h]) => <li key={l}>{h ? <Lien href={h} target={h.startsWith('http') ? '_blank' : undefined} rel={h.startsWith('http') ? 'noopener' : undefined}>{l}</Lien> : <>{l}<span className="bientot">Bientôt</span></>}</li>)}</ul></div>
  );
  return (
    <footer className="pied">
      <Lien href="/" aria-label="AIME, accueil" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 48, textDecoration: 'none' }}><Orbe taille={28} /><span className="marque" style={{ fontSize: 22 }}>AIME<sup aria-hidden="true">®</sup></span></Lien>
      <nav aria-label="Plan du site">
        {col('AIME', [['Manifeste', '/#manifeste'], ['Fondateur', '/#fondateur'], ['Vision', '/#vision']])}
        {col('Le Monde AIME', [['Tous les projets', '/monde'], ['Réseau', '/reseau'], ['Point Zéro', '/point-zero'], ['AIME Wedding', null], ['Brode Way', null]])}
        {col('Votre espace', [['Entrer', '/entrer'], ['Mon espace', '/buro'], ['Mon profil', '/buro?lieu=profil'], ['A+', '/a-plus']])}
        {col('La maison', [['La Charte AIME', '/charte'], ['Contact et presse', null], ['Mentions légales', null]])}
      </nav>
      <div className="bas"><p style={{ margin: 0 }}>AIME® est la marque mère. LE MONDE AIME est une association.</p><p style={{ margin: 0 }}>© 2026 AIME®</p></div>
    </footer>
  );
}

/* Un grand visuel : image, ou vidéo avec un bouton pour le son. */
export type Media = { src: string; alt: string; accroche?: string; legende?: string; pos?: string; video?: boolean; son?: boolean };
export function Visuel({ m, hauteur = 'clamp(22rem, 50vw, 46rem)' }: { m: Media; hauteur?: string }) {
  const [son, setSon] = useState(false);
  const v = useRef<HTMLVideoElement>(null);
  const reduit = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <figure className="visuel" style={{ height: hauteur }}>
      {m.video
        ? <video ref={v} src={m.src} autoPlay={!reduit} muted={!son} loop playsInline aria-label={m.alt} style={{ objectPosition: m.pos }} />
        : <img src={m.src} alt={m.alt} loading="lazy" style={{ objectPosition: m.pos }} />}
      {(m.accroche || m.legende || (m.video && m.son)) && (
        <figcaption>
          <span>{m.accroche && <span className="accroche">{m.accroche}</span>}{m.legende && <span className="legende">{m.legende}</span>}</span>
          {m.video && m.son && <button className="son" type="button" aria-pressed={son} onClick={() => { setSon(s => !s); v.current?.play(); }}>{son ? 'Couper le son' : 'Activer le son'}</button>}
        </figcaption>
      )}
    </figure>
  );
}

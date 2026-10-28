import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Lien } from '../lib/router';
import { useSession, seDeconnecter, type Personne } from '../lib/session';
import { Recherche } from './Recherche';
import { arcs, earcon, ecrirePrefs, estPerso, profilCourant, profils, useConfort, type Prefs, type Profil } from '../lib/confort';

export function Orbe({ taille = 30 }: { taille?: number }) {
  return <span className="orbe" aria-hidden="true" style={{ width: taille, height: taille }} />;
}
export function Marque() {
  return <span className="marque">AIME<sup aria-hidden="true">®</sup></span>;
}

/* Le dock du haut : AIME® (le menu), les verbes de la page, la loupe, et le rond du profil (votre espace). */
export function Tete({ verbes, courant }: { verbes?: ReactNode; courant?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [cherche, setCherche] = useState(false);
  const loupe = useRef<HTMLButtonElement>(null);
  const session = useSession();
  const bouton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  useEffect(() => { if (ouvert) menu.current?.querySelector('a')?.focus(); }, [ouvert]);
  const fermer = () => { setOuvert(false); bouton.current?.focus(); };
  /* le menu AIME® : la marque. Studio et Boutique sont dans le dock ; l'espace, derrière le rond du profil. */
  const items: [string, string][] = [['/', 'Le Monde AIME'], ['/a-propos', 'À propos d’AIME']];
  const actif = (h: string) => courant === h;
  return (
    <header className="tete">
      <nav className="dock-haut" aria-label="Dock du haut">
        <div className="rangee">
          <button ref={bouton} className="outil" type="button" aria-expanded={ouvert} aria-controls="menu-aime" onClick={() => { setCherche(false); setOuvert(o => !o); }} style={{ paddingLeft: 8 }}>
            <Orbe /><Marque />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" style={{ transform: ouvert ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
          </button>
          {verbes ? <><span className="separateur" aria-hidden="true" />{verbes}</> : null}
        </div>
        <span className="separateur" aria-hidden="true" />
        <button ref={loupe} type="button" className="outil loupe" aria-expanded={cherche} aria-label={cherche ? 'Fermer la recherche' : 'Chercher dans tout AIME, et le plan du site'} title="Chercher" onClick={() => { setOuvert(false); setCherche(c => !c); }}>
          {cherche
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            : <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>}
        </button>
        <Lien className="outil profil" href={session ? '/buro' : '/entrer'} aria-current={courant === '/buro' || courant === '/entrer' ? 'page' : undefined}
          aria-label={session ? 'Votre espace' + (session.name ? ', ' + session.name : '') : 'Entrer dans AIME'} title={session ? 'Votre espace' : 'Entrer'}>
          <Avatar p={session} />
        </Lien>
        {cherche && <>
          <div aria-hidden="true" onClick={() => setCherche(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <Recherche fermer={() => { setCherche(false); loupe.current?.focus(); }} />
        </>}
        {ouvert && <>
          <div aria-hidden="true" onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
          <ul id="menu-aime" ref={menu} className="menu-aime" onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); fermer(); } }}>
            {items.map(([h, l]) => <li key={l}>
              <Lien href={h} aria-current={actif(h) ? 'page' : undefined} onClick={() => setOuvert(false)} style={{ fontWeight: actif(h) ? 700 : 500 }}>{l}</Lien>
            </li>)}
            {session && <li style={{ borderTop: '1px solid #ECECE8', marginTop: 6, paddingTop: 6 }}><button type="button" onClick={() => { setOuvert(false); seDeconnecter(); }}>Déconnexion</button></li>}
          </ul>
        </>}
      </nav>
    </header>
  );
}
/* le rond du profil : la photo, sinon les initiales, sinon une silhouette (pas encore entré) */
function Avatar({ p }: { p: Personne | null | undefined }) {
  if (p && p.image) return <img src={p.image} alt="" className="avatar" />;
  const ini = p ? ((p.name || p.email || '').trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '·') : '';
  return <span className="avatar" aria-hidden="true">{p ? ini : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="9" r="3.6" /><path d="M5 19.5c1.4-3.2 4-4.7 7-4.7s5.6 1.5 7 4.7" /></svg>}</span>;
}
/* Le dock du haut de tout le site : les rubriques du Monde AIME (des mots, pas de pictos). */
export function VerbesSite({ actif }: { actif?: 'unions' | 'prestataires' | 'studio' | 'boutique' }) {
  return <>
    <Verbe href="/#unions" actif={actif === 'unions'}>Unions</Verbe>
    <Verbe href="/reseau?domaine=mariage" actif={actif === 'prestataires'}>Prestataires</Verbe>
    <Verbe href="/studio/" actif={actif === 'studio'}>Studio</Verbe>
    <Verbe href="/boutique" actif={actif === 'boutique'}>Boutique</Verbe>
  </>;
}
export function Verbe({ href, children, actif }: { href: string; children: ReactNode; actif?: boolean }) {
  return <Lien className="outil" href={href} aria-current={actif ? 'page' : undefined}>{children}</Lien>;
}

/* Le dock du bas : l'orbe, puis les lieux de la page (le lieu visible en blanc). Il reste toujours en bas de l'écran.
   L'orbe montre où l'on est (un arc par lieu) et ce qu'on a lu (l'anneau) ; un clic ouvre le choix d'orbes de Mon confort. */
export function DockBas({ lieux = [], label = 'Sections de la page', children }: { lieux?: [string, string][]; label?: string; children?: ReactNode }) {
  const [courant, setCourant] = useState<string | null>(null);
  const [lu, setLu] = useState(0);
  const [choix, setChoix] = useState(false);
  const [reglages, setReglages] = useState(false);
  const [annonce, setAnnonce] = useState('');
  const prefs = useConfort();
  const orbe = useRef<HTMLButtonElement>(null);
  const iris = useId().replace(/:/g, '');
  const avant = useRef<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      let c: string | null = null; const ligne = window.innerHeight * 0.4;
      lieux.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= ligne) c = id; });
      const d = document.documentElement, max = Math.max(1, d.scrollHeight - window.innerHeight);
      setLu(Math.min(1, Math.max(0, window.scrollY / max)));
      if (c !== avant.current) { if (avant.current !== null && c) earcon('nav'); avant.current = c; }
      setCourant(c);
    }); };
    window.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', f); f();
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('resize', f); cancelAnimationFrame(raf); };
  }, [lieux]);
  const ouvert = useRef(false);
  useEffect(() => { const o = choix || reglages; if (ouvert.current && !o) orbe.current?.focus(); ouvert.current = o; if (reglages) document.getElementById('confort-titre')?.focus(); }, [choix, reglages]);
  const cp = profilCourant(prefs), perso = estPerso(prefs);
  const teinte = cp ? cp.couleurs[0] : '#FFFFFF';
  const circ = 2 * Math.PI * 11;
  const segments = lieux.length
    ? lieux.map(([id], k) => { const on = id === courant; return { d: arc(k, lieux.length), w: on ? 4 : 2, o: on ? 1 : 0.32, c: on ? teinte : '#FFFFFF' }; })
    : arcs(cp ? cp.n : 12, cp ? cp.couleurs : ['#FFFFFF'], 18, 10).map(a => ({ d: a.d, w: 2, o: 0.5, c: a.c }));
  const nomLieu = lieux.find(([id]) => id === courant)?.[1];
  const choisir = (p: Profil) => { ecrirePrefs({ ...p.prefs }); setAnnonce(p.msg); if (p.prefs.sons === 'on') earcon('ok', true); };
  const regler = <K extends keyof Prefs>(k: K, v: Prefs[K], msg: string) => { ecrirePrefs({ ...prefs, [k]: v }); setAnnonce(msg); earcon('ok', k === 'sons' && v === 'on'); };
  const echap = (e: React.KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setChoix(false); setReglages(false); } };
  return (
    <nav className="dock-bas" aria-label={label} onKeyDown={echap}>
      <div>
        <button ref={orbe} type="button" className="orbe-dock" aria-pressed={choix} onClick={() => { setReglages(false); setChoix(c => !c); }}
          title={choix ? 'Revenir à la navigation' : 'Choisir mon orbe'}
          aria-label={choix ? 'Revenir à la navigation' : 'Choisir mon orbe' + (perso ? ', réglages personnalisés actifs' : '') + '. ' + (nomLieu ? 'Vous êtes dans la section ' + nomLieu + ', ' : '') + Math.round(lu * 100) + ' % de la page lue'}>
          <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
            {segments.map((g, k) => <path key={k} d={g.d} fill="none" stroke={g.c} strokeWidth={g.w} strokeOpacity={g.o} strokeLinecap="round" />)}
            <circle cx="22" cy="22" r="11" fill="none" stroke="#FFFFFF" strokeOpacity={perso ? 0.85 : 0.18} strokeWidth="2" strokeDasharray={perso ? '2 3' : undefined} />
            <circle cx="22" cy="22" r="11" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray={(circ * lu).toFixed(1) + ' ' + circ.toFixed(1)} transform="rotate(-90 22 22)" />
            <circle cx="22" cy="22" r="5.5" fill={'url(#' + iris + ')'} />
            <defs><Iris id={iris} /></defs>
          </svg>
        </button>
        {!choix && (children || lieux.map(([id, l]) => <a key={id} className="lieu" href={'#' + id} aria-current={courant === id ? 'true' : 'false'}>{l}</a>))}
        {choix && <div role="group" aria-label="Choisir mon orbe" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {profils().map(p => { const on = cp?.id === p.id;
            return <button key={p.id} type="button" className="orbe-choix" aria-pressed={on} aria-label={'Orbe ' + p.nom + ' : ' + p.indice} title={'Orbe ' + p.nom + ' : ' + p.indice} onClick={() => choisir(p)}>
              <OrbeDessin p={p} taille={40} iris={iris} />
            </button>; })}
          <span aria-hidden="true" style={{ flex: 'none', width: 1, height: 30, margin: '0 2px', background: '#3A3A38' }} />
          <button type="button" className="orbe-choix" aria-label="Réglages fins de Mon confort" title="Réglages fins" style={{ border: '1px solid #3A3A38', color: '#fff' }} onClick={() => { setChoix(false); setReglages(true); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
          </button>
        </div>}
      </div>
      <p className="sr-only" aria-live="polite">{annonce}</p>
      {reglages && <MonConfort prefs={prefs} cp={cp} iris={iris} annonce={annonce} regler={regler} fermer={() => setReglages(false)}
        retablir={() => { ecrirePrefs(null); setAnnonce('Réglages de l’appareil rétablis.'); }} />}
    </nav>
  );
}
function arc(i: number, n: number) {
  const gap = 14, span = 360 / n, a0 = -90 + i * span + gap / 2, a1 = a0 + span - gap, r = 18;
  const pt = (a: number) => { const t = a * Math.PI / 180; return (22 + r * Math.cos(t)).toFixed(2) + ' ' + (22 + r * Math.sin(t)).toFixed(2); };
  return 'M ' + pt(a0) + ' A ' + r + ' ' + r + ' 0 0 1 ' + pt(a1);
}
function Iris({ id }: { id: string }) {
  return <radialGradient id={id} cx="35%" cy="32%" r="75%"><stop offset="0%" stopColor="#ffffff" /><stop offset="35%" stopColor="#d9e8ff" /><stop offset="60%" stopColor="#c9b8ff" /><stop offset="80%" stopColor="#ffd6ec" /><stop offset="100%" stopColor="#b9f0e4" /></radialGradient>;
}
/* une orbe dessinée : ses arcs (nombre, couleurs, épaisseur) et l'iris nacré au centre */
export function OrbeDessin({ p, taille = 40, iris }: { p: Profil; taille?: number; iris?: string }) {
  const propre = useId().replace(/:/g, ''), id = iris || propre;
  return <svg width={taille} height={taille} viewBox="0 0 44 44" aria-hidden="true" style={{ filter: 'drop-shadow(0 0 4px ' + p.halo + ')' }}>
    {arcs(p.n, p.couleurs).map((a, k) => <path key={k} d={a.d} fill="none" stroke={a.c} strokeWidth={p.w} strokeLinecap="round" />)}
    <circle cx="22" cy="22" r="7" fill={'url(#' + id + ')'} />
    {!iris && <defs><Iris id={id} /></defs>}
  </svg>;
}
const REGLAGES: { k: keyof Prefs; label: string; indice: string; opts: [Prefs[keyof Prefs], string][]; msg: (l: string) => string }[] = [
  { k: 'taille', label: 'Taille du texte', indice: 'Agrandit toute la page', opts: [[100, '100 %'], [115, '115 %'], [130, '130 %']], msg: l => 'Texte à ' + l + '.' },
  { k: 'espace', label: 'Espacement', indice: 'Plus d’air entre les lignes et les lettres', opts: [['normal', 'Normal'], ['aere', 'Aéré']], msg: l => 'Espacement ' + l.toLowerCase() + '.' },
  { k: 'contraste', label: 'Contraste', indice: 'Textes et contours plus nets', opts: [['standard', 'Standard'], ['renforce', 'Renforcé']], msg: l => 'Contraste ' + l.toLowerCase() + '.' },
  { k: 'mouvement', label: 'Mouvement', indice: 'Coupe le diaporama et les animations', opts: [['normal', 'Normal'], ['reduit', 'Réduit']], msg: l => 'Mouvement ' + l.toLowerCase() + '.' },
  { k: 'sons', label: 'Sons et vibrations', indice: 'Un retour de l’orbe en changeant de section', opts: [['off', 'Coupés'], ['on', 'Activés']], msg: l => 'Sons et vibrations ' + l.toLowerCase() + '.' },
];
function MonConfort({ prefs, cp, iris, annonce, regler, fermer, retablir }: { prefs: Prefs; cp: Profil | null; iris: string; annonce: string; regler: <K extends keyof Prefs>(k: K, v: Prefs[K], msg: string) => void; fermer: () => void; retablir: () => void }) {
  return (
    <section id="mon-confort" className="confort" role="dialog" aria-modal="false" aria-labelledby="confort-titre">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 18 }}>
        <span aria-hidden="true" style={{ flex: 'none', width: 64, height: 64, borderRadius: 14, background: '#0B0B0C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {cp ? <OrbeDessin p={cp} taille={54} iris={iris} /> : <OrbeDessin p={{ ...profils()[0], couleurs: ['#FFFFFF'], halo: 'rgba(255,255,255,.4)' }} taille={54} iris={iris} />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="confort-titre" tabIndex={-1} style={{ margin: 0, fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', outline: 'none' }}>Mon confort</h2>
          <p style={{ margin: '4px 0 0', fontSize: 15, lineHeight: 1.45, color: '#3A3A3F' }}>Orbe {cp ? cp.nom : 'personnalisée'}. Réglé une fois, appliqué sur chaque page. Ces réglages restent sur cet appareil et ne sont visibles par personne d’autre.</p>
        </div>
        <button type="button" className="opt" aria-label="Fermer Mon confort" onClick={fermer} style={{ flex: 'none', width: 44, minWidth: 44, padding: 0, justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      {REGLAGES.map(s => <div key={s.k} role="group" aria-labelledby={'reglage-' + s.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px 16px', flexWrap: 'wrap', padding: '14px 0', borderTop: '1px solid #E6E6E2' }}>
        <div style={{ minWidth: 0 }}><span id={'reglage-' + s.k} style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>{s.label}</span><span style={{ fontSize: 13, color: '#55555A' }}>{s.indice}</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {s.opts.map(([v, l]) => <button key={l} type="button" className="opt" aria-pressed={prefs[s.k] === v} onClick={() => regler(s.k, v as never, s.msg(l))}>{l}</button>)}
        </div>
      </div>)}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '14px 0', borderTop: '1px solid #E6E6E2' }}>
        <span style={{ width: '100%', fontSize: 13, color: '#55555A' }}>Bientôt</span>
        {['Lecture facile', 'Langue des signes', 'Langue'].map(x => <span key={x} style={{ padding: '8px 12px', borderRadius: 999, border: '1px dashed #A8A8A3', fontSize: 14 }}>{x}</span>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingTop: 14, borderTop: '1px solid #E6E6E2' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#3A3A3F' }}>{annonce}</p>
        <button type="button" className="opt" style={{ fontWeight: 600, border: '1px solid #0B0B0C' }} onClick={retablir}>Revenir aux réglages de l’appareil</button>
      </div>
    </section>
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
        {col('Le Monde AIME', [['Les unions', '/#unions'], ['Prestataires', '/reseau?domaine=mariage'], ['Invités', '/#invites'], ['Collections', '/#collections']])}
        {col('Créer', [['Studio', '/studio/'], ['Broderie', '/studio/atelier'], ['Point Zéro', '/point-zero'], ['Boutique', '/boutique']])}
        {col('Votre espace', [['Entrer', '/entrer'], ['Mon espace', '/buro'], ['Mon profil', '/buro?lieu=profil'], ['A+', '/a-plus']])}
        {col('La maison', [['À propos d’AIME', '/a-propos'], ['Le fondateur', '/reseau/matthieu-lecointre'], ['Contact et presse', null], ['Mentions légales', null]])}
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

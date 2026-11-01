import { useId, useRef, useState, type ReactNode } from 'react';
import { Lien, useChemin } from '../lib/router';
import { ajouter as ajouterPistes, basculer as basculerLecture, precedent, suivant, useLecteur } from '../lib/lecteur';
import HeaderPublic from './HeaderPublic';
import { arcs,  type Prefs, type Profil } from '../lib/confort';

export function Orbe({ taille = 30 }: { taille?: number }) {
  return <span className="orbe" aria-hidden="true" style={{ width: taille, height: taille }} />;
}
export function Marque() {
  return <span className="marque">AIME<sup aria-hidden="true">®</sup></span>;
}

/* Tete reste le point canonique des pages du site. Le header extrait est partagé avec le Studio.
   Recherche, compte, déconnexion et confort ne disparaissent pas : ils restent des outils contextuels. */
export function Tete({ courant: _courant }: { courant?: string }) {
  const chemin = useChemin();
  return <HeaderPublic chemin={chemin} />;
}
/* Le dock du bas : toujours en bas de l'écran. Le cercle progresse avec la lecture et montre où l'on est (un arc par lieu).
   Un clic sur le cercle ouvre les modes du dock, chacun avec son halo : Navigation (les lieux de la page), Musique (vos morceaux),
   et ceux que la page apporte (Jour J sur l'accueil…). Le dock se transforme, sans rien ouvrir par-dessus la page. */
export type ModeDock = { id: string; nom: string; halo: string; progres?: number; rendu: () => ReactNode };
export function DockBas({ lieux = [], label = 'Sections de la page', children, modes = [] }: { lieux?: [string, string][]; label?: string; children?: ReactNode; modes?: ModeDock[] }) {
  const musique = useLecteur();
  const [mode, setMode] = useState('sections');
  const contenu = modes.find(m => m.id === mode);
  if (!lieux.length && !children && !modes.length && !musique.pistes.length) return null;
  return <section className="aime-sections-locales" aria-label={label}>
    <nav aria-label={label}>{lieux.map(([id, nom]) => <a key={id} href={'#' + id}>{nom}</a>)}{children}</nav>
    {(modes.length > 0 || musique.pistes.length > 0) && <div className="aime-actions-locales">
      <button type="button" onClick={() => setMode('sections')} aria-pressed={mode === 'sections'}>Sections</button>
      {modes.map(m => <button type="button" key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.nom}</button>)}
      <button type="button" onClick={() => setMode('musique')} aria-pressed={mode === 'musique'}>Musique</button>
    </div>}
    {contenu && <div>{contenu.rendu()}</div>}{mode === 'musique' && <div className="aime-lecture-locale"><Musique /></div>}
  </section>;
}
/* Le mode Musique : vos morceaux, choisis sur l'appareil (rien n'est envoyé), lus sans quitter la page */
function Musique() {
  const e = useLecteur();
  const choix = useRef<HTMLInputElement>(null);
  const p = e.pistes[e.i];
  return <>
    <input ref={choix} type="file" accept="audio/*" multiple className="sr-only" aria-label="Choisir des morceaux sur cet appareil" onChange={ev => { if (ev.target.files) ajouterPistes(ev.target.files); ev.target.value = ''; }} />
    {p ? <>
      <button type="button" className="lieu carre-sombre" aria-label="Morceau précédent" onClick={precedent}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 6h2v12H7zM19 6v12L10 12z" /></svg></button>
      <button type="button" className="lieu carre-sombre" aria-label={e.joue ? 'Pause' : 'Lecture'} onClick={basculerLecture}>{e.joue ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5l11 7-11 7z" /></svg>}</button>
      <button type="button" className="lieu carre-sombre" aria-label="Morceau suivant" onClick={suivant}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15 6h2v12h-2zM5 6v12l9-6z" /></svg></button>
      <span className="lieu piste-dock" aria-live="polite">
        {p.pochette && <img src={p.pochette} alt="" width={34} height={34} />}
        <span><b>{p.nom}</b>{p.artiste && <span> · {p.artiste}</span>}<span style={{ opacity: .6 }}> · {e.i + 1}/{e.pistes.length}</span></span>
      </span>
      {p.deezer && <a className="lieu" href={p.lien || 'https://www.deezer.com/track/' + p.deezer} target="_blank" rel="noopener">Extrait 30 s · Deezer<span className="sr-only"> (ouvre Deezer)</span></a>}
      <Lien className="lieu" href="/musique">La journée en musique</Lien>
    </> : <><Lien className="lieu" href="/musique">La journée en musique</Lien><button type="button" className="lieu" onClick={() => choix.current?.click()}>Écouter un fichier de cet appareil</button></>}
  </>;
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
/* Mon confort, sur une ligne du dock : un picto par réglage, une case cochée quand il est actif.
   La taille du texte passe de 100 à 115 puis 130 %. Chaque réglage s'annonce aux lecteurs d'écran. */
const Coche = ({ on }: { on: boolean }) => <span className={'coche' + (on ? ' on' : '')} aria-hidden="true">{on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}</span>;
const PICTOS: Record<keyof Prefs, ReactNode> = {
  taille: <span className="picto-aa" aria-hidden="true">Aa</span>,
  espace: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M4 5h16M4 12h16M4 19h10" /><path d="M21 9v6M19.5 10.5 21 9l1.5 1.5M19.5 13.5 21 15l1.5-1.5" strokeWidth="1.4" /></svg>,
  contraste: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" /></svg>,
  mouvement: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M3 12c2.5-4 5-4 7.5 0s5 4 7.5 0" /><path d="M20 6v12" strokeWidth="2.4" /></svg>,
  sons: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>,
};
export function ReglagesLigne({ prefs, regler, retour, retablir }: { prefs: Prefs; regler: <K extends keyof Prefs>(k: K, v: Prefs[K], msg: string) => void; retour: () => void; retablir: () => void }) {
  return <>
    <button type="button" className="orbe-choix" aria-label="Revenir aux orbes" title="Revenir aux orbes" style={{ color: '#fff' }} onClick={retour}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
    </button>
    <span className="separateur sombre" aria-hidden="true" />
    {REGLAGES.map(s => {
      const i = s.opts.findIndex(o => o[0] === prefs[s.k]), on = i > 0, [v, l] = s.opts[(i + 1) % s.opts.length];
      const etat = s.opts[Math.max(0, i)][1];
      return <button key={s.k} type="button" className="reglage" aria-pressed={s.k === 'taille' ? undefined : on}
        aria-label={s.label + ' : ' + etat.toLowerCase() + (s.k === 'taille' ? ', passer à ' + l : '') + '. ' + s.indice} title={s.label + ' · ' + etat}
        onClick={() => regler(s.k, v as never, s.msg(l))}>
        {PICTOS[s.k]}{s.k === 'taille' ? <span className="reglage-val" aria-hidden="true">{etat}</span> : <Coche on={on} />}
      </button>;
    })}
    <span className="separateur sombre" aria-hidden="true" />
    <button type="button" className="lieu" onClick={retablir}>Comme mon appareil</button>
  </>;
}

export function Pied() {
  const col = (titre: string, liens: [string, string | null][]) => (
    <div><h2>{titre}</h2><ul>{liens.map(([l, h]) => <li key={l}>{h ? <Lien href={h} target={h.startsWith('http') ? '_blank' : undefined} rel={h.startsWith('http') ? 'noopener' : undefined}>{l}</Lien> : <>{l}<span className="bientot">Bientôt</span></>}</li>)}</ul></div>
  );
  return (
    <footer className="pied">
      <Lien href="/" aria-label="AIME, accueil" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 48, textDecoration: 'none' }}><Orbe taille={28} /><span className="marque" style={{ fontSize: 22 }}>AIME<sup aria-hidden="true">®</sup></span></Lien>
      <nav aria-label="Plan du site">
        {col('Le studio', [['Le studio', '/studio/'], ['L’atelier', '/studio/atelier']])}
        {col('Votre espace', [['Entrer', '/entrer'], ['Mon espace', '/buro'], ['Mon profil', '/buro?lieu=profil']])}
        {col('La maison', [['À propos d’AIME', '/a-propos'], ['Les projets d’AIME', '/projets'], ['Le fondateur', '/reseau/matthieu-lecointre'], ['Contact et presse', '/contact'], ['Mentions légales', null]])}
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

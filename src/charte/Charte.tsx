import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Lien, profondeur, revenir, useChemin } from '../lib/router';
import { lireBuro } from '../lib/buro';
import { ajouter as ajouterPistes, basculer as basculerLecture, precedent, suivant, useLecteur } from '../lib/lecteur';
import { useSession, seDeconnecter, type Personne } from '../lib/session';
import { Recherche, GROUPES } from './Recherche';
import { EntrerBloc } from './EntrerBloc';
import { arcs, earcon, ecrirePrefs, profilCourant, profils, useConfort, type Prefs, type Profil } from '../lib/confort';

export function Orbe({ taille = 30 }: { taille?: number }) {
  return <span className="orbe" aria-hidden="true" style={{ width: taille, height: taille }} />;
}
export function Marque() {
  return <span className="marque">AIME<sup aria-hidden="true">®</sup></span>;
}

/* Le dock du haut, en un seul bloc. À gauche : la flèche retour, l'orbe dans son carré, AIME®. Au centre : les verbes du site.
   À droite : la loupe et le rond du profil. L'orbe, la loupe et le profil ouvrent le même bloc vers le bas :
   le contenu au-dessus, un mini dock en bas (les orbes, les filtres de recherche, les accès de l'espace). */
type ModeHaut = 'aime' | 'recherche' | 'espace' | null;
export function Tete({ verbes, courant }: { verbes?: ReactNode; courant?: string }) {
  const [mode, setMode] = useState<ModeHaut>(null);
  const [reglages, setReglages] = useState(false);
  const [groupe, setGroupe] = useState<string | null>(null);
  const [effacerOuvrages, setEffacerOuvrages] = useState(false);   /* jamais coché par défaut */
  const [annonce, setAnnonce] = useState('');
  const [comptes, setComptes] = useState<Record<string, number> | null>(null);
  const session = useSession();
  const prefs = useConfort();
  const chemin = useChemin();
  const iris = useId().replace(/:/g, '');
  const boutons = useRef<Partial<Record<'aime' | 'recherche' | 'espace', HTMLButtonElement | null>>>({});
  const bloc = useRef<HTMLDivElement>(null);
  const cp = profilCourant(prefs);
  const retour = chemin !== '/' || profondeur() > 0;
  useEffect(() => { setMode(null); }, [chemin]);
  useEffect(() => { if (mode && mode !== 'recherche') bloc.current?.querySelector<HTMLElement>('input, a, button')?.focus(); }, [mode]);
  useEffect(() => { if (mode === 'espace' && session) lireBuro().then(r => {
    const ps = r.ok ? r.projets || [] : [];
    setComptes({ projets: ps.filter(p => p.role === 'owner' && !p.archive).length, partages: ps.filter(p => p.role !== 'owner' && !p.archive).length, archives: ps.filter(p => p.archive).length });
  }); }, [mode, session]);
  const ouvrir = (m: Exclude<ModeHaut, null>) => { setReglages(false); setMode(x => x === m ? null : m); };
  const fermer = () => { const m = mode; setMode(null); setReglages(false); if (m) boutons.current[m]?.focus(); };
  const choisir = (p: Profil) => { ecrirePrefs({ ...p.prefs }); setAnnonce(p.msg); if (p.prefs.sons === 'on') earcon('ok', true); };
  const regler = <K extends keyof Prefs>(k: K, v: Prefs[K], msg: string) => { ecrirePrefs({ ...prefs, [k]: v }); setAnnonce(msg); earcon('ok', k === 'sons' && v === 'on'); };
  const DOSSIERS: [string, string, string][] = [['projets', 'Projets', '#C9B8FF'], ['partages', 'Partagés avec moi', '#D9E8FF'], ['archives', 'Archives', '#E4E4E1'], ['profil', 'Profil', '#FFD6EC']];
  return (
    <header className="tete">
      {mode && <div aria-hidden="true" className="tete-voile" onClick={fermer} />}
      <nav className={'dock-haut' + (mode ? ' ouvert' : '')} aria-label="Dock du haut" onKeyDown={e => { if (e.key === 'Escape' && mode) { e.preventDefault(); fermer(); } }}>
        <div className="dock-ligne">
          {retour && <button type="button" className="outil carre" aria-label="Revenir là où vous étiez" title="Retour" onClick={revenir}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          </button>}
          <button ref={el => { boutons.current.aime = el; }} type="button" className="carre-orbe" aria-expanded={mode === 'aime'} aria-controls="bloc-dock"
            aria-label={'Menu AIME et Mon confort, orbe ' + (cp ? cp.nom : 'personnalisée')} title="Menu et Mon confort" onClick={() => ouvrir('aime')}>
            <Orbe taille={30} />
          </button>
          <span className="separateur" aria-hidden="true" />
          <Lien href="/" className="outil" aria-label="AIME, accueil" aria-current={courant === '/' ? 'page' : undefined} style={{ padding: '0 10px' }}><Marque /></Lien>
          <div className="rangee">{verbes ? <><span className="separateur" aria-hidden="true" />{verbes}</> : null}</div>
          <span className="separateur" aria-hidden="true" />
          <button ref={el => { boutons.current.recherche = el; }} type="button" className="outil loupe" aria-expanded={mode === 'recherche'} aria-controls="bloc-dock" aria-label={mode === 'recherche' ? 'Fermer la recherche' : 'Chercher dans tout AIME, et le plan du site'} title="Chercher" onClick={() => ouvrir('recherche')}>
            {mode === 'recherche'
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              : <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>}
          </button>
          <button ref={el => { boutons.current.espace = el; }} type="button" className="outil profil" aria-expanded={mode === 'espace'} aria-controls="bloc-dock" aria-current={courant === '/buro' || courant === '/entrer' ? 'page' : undefined}
            aria-label={session ? 'Votre espace' + (session.name ? ', ' + session.name : '') : 'Votre espace : entrer dans AIME'} title="Votre espace" onClick={() => ouvrir('espace')}>
            <Avatar p={session} />
          </button>
        </div>
        <p className="sr-only" aria-live="polite">{annonce}</p>
        {mode && <div id="bloc-dock" ref={bloc} className="dock-bloc">
          <div className="dock-bloc-corps">
            {mode === 'aime' && <>
              <ul className="bloc-menu">
                {([['/', 'Accueil'], ['/a-propos', 'À propos d’AIME']] as [string, string][]).map(([h, l]) => <li key={h}><Lien href={h} aria-current={courant === h ? 'page' : undefined} onClick={() => setMode(null)}>{l}</Lien></li>)}
                {session && <li><button type="button" onClick={() => { setMode(null); seDeconnecter(); }}>Déconnexion</button></li>}
              </ul>
              <p className="bloc-note">{reglages
                ? <>Mon confort, en bas : touchez un picto pour l’activer. Réglé une fois, appliqué partout, gardé sur cet appareil. <b>{annonce}</b></>
                : <>Votre orbe : <b>{cp ? cp.nom : 'personnalisée'}</b>{cp ? ' · ' + cp.indice : ''}. Choisissez-en une autre en bas, ou réglez chaque détail avec <b>Mon confort</b>.</>}</p>
            </>}
            {mode === 'recherche' && <Recherche fermer={fermer} groupe={groupe} />}
            {mode === 'espace' && (session
              ? <>
                <p className="bloc-note" style={{ marginTop: 0 }}>Bonjour{session.name ? ' ' + session.name.split(' ')[0] : ''}. Votre espace, sans quitter la page.</p>
                <ul className="bloc-dossiers">
                  {DOSSIERS.map(([id, nom, teinte]) => <li key={id}><Lien href={'/buro?lieu=' + id} onClick={() => setMode(null)}>
                    <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.2h8.5A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" fill={teinte} stroke="#0B0B0C" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                    <b>{nom}</b><span>{id === 'profil' ? 'Ma page du Réseau' : comptes ? comptes[id] + ' projet' + (comptes[id] > 1 ? 's' : '') : '…'}</span>
                  </Lien></li>)}
                </ul>
              </>
              : <>
                <p className="bloc-note" style={{ marginTop: 0 }}>Entrez dans AIME, sans quitter la page : vos projets, vos ouvrages et votre profil vous suivent sur tous vos appareils.</p>
                <EntrerBloc compact retour={/^\/[a-z0-9-]{1,40}$/.test(chemin) || chemin === '/' ? chemin : '/buro'} />
              </>)}
          </div>
          <div className="mini-dock" role="group" aria-label={mode === 'aime' ? (reglages ? 'Mon confort' : 'Choisir mon orbe') : mode === 'recherche' ? 'Chercher dans' : 'Votre espace'}>
            {mode === 'aime' && (reglages
              ? <ReglagesLigne prefs={prefs} regler={regler} retour={() => setReglages(false)} retablir={() => { ecrirePrefs(null); setAnnonce('Réglages de l’appareil rétablis.'); }} />
              : <>
                {profils().map(p => { const on = cp?.id === p.id;
                  return <button key={p.id} type="button" className="orbe-choix" aria-pressed={on} aria-label={'Orbe ' + p.nom + ' : ' + p.indice} title={'Orbe ' + p.nom + ' : ' + p.indice} onClick={() => choisir(p)}><OrbeDessin p={p} taille={40} iris={iris} /></button>; })}
                <span className="separateur sombre" aria-hidden="true" />
                <button type="button" className="orbe-choix" aria-label="Mon confort : régler chaque détail" title="Mon confort" style={{ color: '#fff' }} onClick={() => setReglages(true)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></svg>
                </button>
              </>)}
            {mode === 'recherche' && [null, ...GROUPES].map(g => <button key={g || 'tout'} type="button" className="lieu" aria-current={groupe === g ? 'true' : 'false'} onClick={() => setGroupe(g)}>{g || 'Tout'}</button>)}
            {mode === 'espace' && (session
              ? <><Lien className="lieu" href="/buro" onClick={() => setMode(null)}>Ouvrir mon espace</Lien><Lien className="lieu" href="/point-zero" onClick={() => setMode(null)}>Point Zéro</Lien><Lien className="lieu" href="/a-plus" onClick={() => setMode(null)}>A+</Lien><label className="lieu lieu-case" title="Vos ouvrages déjà rangés dans votre espace AIME restent sur votre compte ; ceux qui n’y sont pas encore restent sur l’appareil."><input type="checkbox" checked={effacerOuvrages} onChange={e => setEffacerOuvrages(e.target.checked)} aria-describedby="effacer-ouvrages-note" /> Effacer les ouvrages de cet appareil<span id="effacer-ouvrages-note" className="sr-only">Vos ouvrages déjà rangés dans votre espace AIME restent sur votre compte ; ceux qui n’y sont pas encore restent sur l’appareil.</span></label><button type="button" className="lieu" onClick={async () => { const e = effacerOuvrages; setEffacerOuvrages(false); setMode(null); const b = await seDeconnecter({ effacerOuvrages: e }); if (b) setAnnonce(b.effaces + ' ouvrage' + (b.effaces > 1 ? 's' : '') + ' effacé' + (b.effaces > 1 ? 's' : '') + ' de cet appareil' + (b.gardes ? ', ' + b.gardes + ' gardé' + (b.gardes > 1 ? 's' : '') + ' (pas encore rangé' + (b.gardes > 1 ? 's' : '') + ' dans votre espace)' : '') + '.'); }}>Déconnexion</button></>
              : <><Lien className="lieu" href="/a-propos" onClick={() => setMode(null)}>Pourquoi un compte ?</Lien><Lien className="lieu" href="/a-plus" onClick={() => setMode(null)}>A+ pour les pros</Lien></>)}
          </div>
        </div>}
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
    <Verbe href="/aime-wedding#unions" actif={actif === 'unions'}>Unions</Verbe>
    <Verbe href="/reseau?domaine=mariage" actif={actif === 'prestataires'}>Prestataires</Verbe>
    <Verbe href="/studio/atelier" actif={actif === 'studio'}>Studio</Verbe>
    <Verbe href="/boutique" actif={actif === 'boutique'}>Boutique</Verbe>
  </>;
}
/* Le dock du haut de LE MONDE AIME (le portfolio) : les projets, le fondateur, à propos. */
export function VerbesProjets({ actif }: { actif?: 'projets' | 'fondateur' | 'apropos' }) {
  return <>
    <Verbe href="/projets#projets" actif={actif === 'projets'}>Projets</Verbe>
    <Verbe href="/projets#fondateur" actif={actif === 'fondateur'}>Fondateur</Verbe>
    <Verbe href="/a-propos" actif={actif === 'apropos'}>À propos</Verbe>
  </>;
}
export function Verbe({ href, children, actif }: { href: string; children: ReactNode; actif?: boolean }) {
  return <Lien className="outil" href={href} aria-current={actif ? 'page' : undefined}>{children}</Lien>;
}

/* Le dock du bas : toujours en bas de l'écran. Le cercle progresse avec la lecture et montre où l'on est (un arc par lieu).
   Un clic sur le cercle ouvre les modes du dock, chacun avec son halo : Navigation (les lieux de la page), Musique (vos morceaux),
   et ceux que la page apporte (Jour J sur l'accueil…). Le dock se transforme, sans rien ouvrir par-dessus la page. */
export type ModeDock = { id: string; nom: string; halo: string; progres?: number; rendu: () => ReactNode };
export function DockBas({ lieux = [], label = 'Sections de la page', children, modes = [] }: { lieux?: [string, string][]; label?: string; children?: ReactNode; modes?: ModeDock[] }) {
  const [courant, setCourant] = useState<string | null>(null);
  const [lu, setLu] = useState(0);
  const [haut, setHaut] = useState(false);
  const [menu, setMenu] = useState(false);
  const [modeId, setModeId] = useState('nav');
  const prefs = useConfort();
  const musique = useLecteur();
  const cercle = useRef<HTMLButtonElement>(null);
  const iris = useId().replace(/:/g, '');
  const avant = useRef<string | null>(null);
  useEffect(() => {
    let raf = 0;
    const f = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      let c: string | null = null; const ligne = window.innerHeight * 0.4;
      lieux.forEach(([id]) => { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= ligne) c = id; });
      const d = document.documentElement, max = Math.max(1, d.scrollHeight - window.innerHeight);
      setLu(Math.min(1, Math.max(0, window.scrollY / max)));
      setHaut(window.scrollY > window.innerHeight * 0.8);
      if (c !== avant.current) { if (avant.current !== null && c) earcon('nav'); avant.current = c; }
      setCourant(c);
    }); };
    window.addEventListener('scroll', f, { passive: true }); window.addEventListener('resize', f); f();
    return () => { window.removeEventListener('scroll', f); window.removeEventListener('resize', f); cancelAnimationFrame(raf); };
  }, [lieux]);
  const tous: ModeDock[] = [
    { id: 'nav', nom: 'Navigation', halo: '#FFFFFF', rendu: () => children || lieux.map(([id, l]) => <a key={id} className="lieu" href={'#' + id} aria-current={courant === id ? 'true' : 'false'}>{l}</a>) },
    ...modes,
    { id: 'musique', nom: 'Musique', halo: '#A46BFF', progres: musique.duree ? musique.temps / musique.duree : 0, rendu: () => <Musique /> },
  ];
  const m = tous.find(x => x.id === modeId) || tous[0];
  const cp = profilCourant(prefs);
  const teinte = m.id === 'nav' ? (cp ? cp.couleurs[0] : '#FFFFFF') : m.halo;
  const progres = m.progres ?? lu;
  const circ = 2 * Math.PI * 11;
  const segments = m.id === 'nav' && lieux.length
    ? lieux.map(([id], k) => { const on = id === courant; return { d: arc(k, lieux.length), w: on ? 4 : 2, o: on ? 1 : 0.32, c: on ? teinte : '#FFFFFF' }; })
    : arcs(12, [teinte], 18, 10).map(a => ({ d: a.d, w: 2, o: 0.55, c: a.c }));
  const nomLieu = lieux.find(([id]) => id === courant)?.[1];
  const rang = useRef<HTMLDivElement>(null);
  useEffect(() => { rang.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
  const choisirMode = (id: string) => { setModeId(id); setMenu(false); earcon('ok'); requestAnimationFrame(() => cercle.current?.focus()); };
  return (
    <nav className="dock-bas" aria-label={label} onKeyDown={e => { if (e.key === 'Escape' && menu) { e.preventDefault(); setMenu(false); cercle.current?.focus(); } }}>
      <div ref={rang}>
        <button ref={cercle} type="button" className="orbe-dock" aria-expanded={menu} onClick={() => setMenu(o => !o)}
          title={menu ? 'Revenir au dock' : 'Changer le dock'}
          aria-label={(menu ? 'Revenir au dock ' : 'Changer le dock, mode ') + m.nom + '. ' + (m.id === 'nav' ? (nomLieu ? 'Vous êtes dans la section ' + nomLieu + ', ' : '') + Math.round(lu * 100) + ' % de la page lue' : Math.round(progres * 100) + ' %')}>
          <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
            {segments.map((g, k) => <path key={k} d={g.d} fill="none" stroke={g.c} strokeWidth={g.w} strokeOpacity={g.o} strokeLinecap="round" />)}
            <circle cx="22" cy="22" r="11" fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth="2" />
            <circle cx="22" cy="22" r="11" fill="none" stroke={m.id === 'nav' ? '#FFFFFF' : m.halo} strokeWidth="2" strokeDasharray={(circ * progres).toFixed(1) + ' ' + circ.toFixed(1)} transform="rotate(-90 22 22)" />
            <circle cx="22" cy="22" r="5.5" fill={'url(#' + iris + ')'} />
            <defs><Iris id={iris} /></defs>
          </svg>
        </button>
        {menu
          ? <div role="group" aria-label="Les modes du dock" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {tous.map(x => <button key={x.id} type="button" className="halo-mode" aria-pressed={x.id === m.id} onClick={() => choisirMode(x.id)}>
              <span aria-hidden="true" className="halo" style={{ boxShadow: '0 0 0 2px ' + x.halo + ', 0 0 14px 2px ' + x.halo }} />{x.nom}
            </button>)}
          </div>
          : m.rendu()}
        {haut && !menu && <button type="button" className="lieu remonter" aria-label="Remonter en haut de la page" title="Remonter" onClick={() => { window.scrollTo({ top: 0, behavior: prefs.mouvement === 'reduit' ? 'auto' : 'smooth' }); cercle.current?.focus(); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" /></svg>
        </button>}
      </div>
    </nav>
  );
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
function ReglagesLigne({ prefs, regler, retour, retablir }: { prefs: Prefs; regler: <K extends keyof Prefs>(k: K, v: Prefs[K], msg: string) => void; retour: () => void; retablir: () => void }) {
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
        {col('Le studio', [['Le studio', '/studio/'], ['L’atelier', '/studio/atelier'], ['Les patrons', '/studio/boutique']])}
        {col('Votre espace', [['Entrer', '/entrer'], ['Mon espace', '/buro'], ['Mon profil', '/buro?lieu=profil']])}
        {col('La maison', [['À propos d’AIME', '/a-propos'], ['Les projets d’AIME', '/projets'], ['Le fondateur', '/reseau/matthieu-lecointre'], ['Contact et presse', null], ['Mentions légales', null]])}
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

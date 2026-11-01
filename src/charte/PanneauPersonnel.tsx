import { useEffect, useId, useRef, useState } from 'react';
import { Lien, profondeur, revenir, useChemin } from '../lib/router';
import { lireBuro } from '../lib/buro';
import { useSession, seDeconnecter, type Personne } from '../lib/session';
import { Recherche, GROUPES } from './Recherche';
import { EntrerBloc } from './EntrerBloc';
import { Orbe, OrbeDessin, ReglagesLigne } from './Charte';
import { earcon, ecrirePrefs, profilCourant, profils, useConfort, type Prefs, type Profil } from '../lib/confort';
import './panneau-personnel.css';
import { DOSSIERS_PERSONNELS } from './dossiersPersonnels';
type ModeHaut = 'aime' | 'recherche' | 'espace' | null;
export default function PanneauPersonnel({ courant }: { courant?: string }) {
  const [mode, setMode] = useState<ModeHaut>('espace');
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
  useEffect(() => { setMode('espace'); }, [chemin]);
  useEffect(() => { if (mode && mode !== 'recherche') bloc.current?.querySelector<HTMLElement>('input, a, button')?.focus(); }, [mode]);
  useEffect(() => { if (mode === 'espace' && session) lireBuro().then(r => {
    const ps = r.ok ? r.projets || [] : [];
    setComptes({ projets: ps.filter(p => p.role === 'owner' && !p.archive).length, partages: ps.filter(p => p.role !== 'owner' && !p.archive).length, archives: ps.filter(p => p.archive).length });
  }); }, [mode, session]);
  const ouvrir = (m: Exclude<ModeHaut, null>) => { setReglages(false); setMode(x => x === m ? null : m); };
  const fermer = () => { const m = mode; setMode(null); setReglages(false); if (m) boutons.current[m]?.focus(); };
  const choisir = (p: Profil) => { ecrirePrefs({ ...p.prefs }); setAnnonce(p.msg); if (p.prefs.sons === 'on') earcon('ok', true); };
  const regler = <K extends keyof Prefs>(k: K, v: Prefs[K], msg: string) => { ecrirePrefs({ ...prefs, [k]: v }); setAnnonce(msg); earcon('ok', k === 'sons' && v === 'on'); };

  return (
    <div className="tete">
      {mode && <div aria-hidden="true" className="tete-voile" onClick={fermer} />}
      <nav className={'dock-haut' + (mode ? ' ouvert' : '')} aria-label="Compte, recherche et confort" onKeyDown={e => { if (e.key === 'Escape' && mode) { e.preventDefault(); fermer(); } }}>
        <div className="dock-ligne">
          {retour && <button type="button" className="outil carre" aria-label="Revenir là où vous étiez" title="Retour" onClick={revenir}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
          </button>}
          <button ref={el => { boutons.current.aime = el; }} type="button" className="carre-orbe" aria-expanded={mode === 'aime'} aria-controls="bloc-dock"
            aria-label={'Paramètres et confort, orbe ' + (cp ? cp.nom : 'personnalisée')} title="Menu et Mon confort" onClick={() => ouvrir('aime')}>
            <Orbe taille={30} />
          </button>
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
                {([['/buro', 'Mon espace'], ['/studio/one/premiere-rencontre?modifier', 'Paramètres du Studio']] as [string, string][]).map(([h, l]) => <li key={h}><Lien href={h} aria-current={courant === h ? 'page' : undefined} onClick={() => setMode(null)}>{l}</Lien></li>)}
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
                  {DOSSIERS_PERSONNELS.map(({id, nom, teinte}) => <li key={id}><Lien href={'/buro?lieu=' + id} onClick={() => setMode(null)}>
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
              ? <><Lien className="lieu" href="/buro" onClick={() => setMode(null)}>Ouvrir mon espace</Lien><label className="lieu lieu-case" title="Vos ouvrages déjà rangés dans votre espace AIME restent sur votre compte ; ceux qui n’y sont pas encore restent sur l’appareil."><input type="checkbox" checked={effacerOuvrages} onChange={e => setEffacerOuvrages(e.target.checked)} aria-describedby="effacer-ouvrages-note" /> Effacer les ouvrages de cet appareil<span id="effacer-ouvrages-note" className="sr-only">Vos ouvrages déjà rangés dans votre espace AIME restent sur votre compte ; ceux qui n’y sont pas encore restent sur l’appareil.</span></label><button type="button" className="lieu" onClick={async () => { const e = effacerOuvrages; setEffacerOuvrages(false); setMode(null); const b = await seDeconnecter({ effacerOuvrages: e }); if (b) setAnnonce(b.effaces + ' ouvrage' + (b.effaces > 1 ? 's' : '') + ' effacé' + (b.effaces > 1 ? 's' : '') + ' de cet appareil' + (b.gardes ? ', ' + b.gardes + ' gardé' + (b.gardes > 1 ? 's' : '') + ' (pas encore rangé' + (b.gardes > 1 ? 's' : '') + ' dans votre espace)' : '') + '.'); }}>Déconnexion</button></>
              : <><Lien className="lieu" href="/studio/" onClick={() => setMode(null)}>Découvrir la broderie</Lien></>)}
          </div>
        </div>}
      </nav>
    </div>
  );
}
/* le rond du profil : la photo, sinon les initiales, sinon une silhouette (pas encore entré) */
function Avatar({ p }: { p: Personne | null | undefined }) {
  if (p && p.image) return <img src={p.image} alt="" className="avatar" />;
  const ini = p ? ((p.name || p.email || '').trim().split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '·') : '';
  return <span className="avatar" aria-hidden="true">{p ? ini : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="9" r="3.6" /><path d="M5 19.5c1.4-3.2 4-4.7 7-4.7s5.6 1.5 7 4.7" /></svg>}</span>;
}

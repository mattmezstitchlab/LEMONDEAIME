/* L'ouverture emploie le lecteur partagé du Studio : une toile, les données et la musique originales,
   et le même Point que /studio/fleur-du-ciel. Aucun média n'est chargé avant un geste. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ControleClip, IntegrationClip } from '../../studio/src/clip/ClipBrode';
import { Orbe } from '../charte/Charte';
import './ouverture.css';

const ClipFleur = lazy(() => import('../../studio/src/clip/ClipBrode').then(m => ({ default: m.ClipFleurIntroduction })));
const DONNEES = '/studio/clip/fleur-du-ciel/';
export const COUVERTURE = '/media/fleur-du-ciel-couverture.jpg';
export const CLE_VUE = 'aime:ouverture:fleur:vue';
export const CLE_REPRISE = 'aime:ouverture:fleur:reprise';
/* Les mêmes trois passages que l'ouverture existante ; leurs repères sont ceux du morceau original. */
export const COURTE: [number, number][] = [[0, 12], [190, 208], [240, 253.013]];
export const LEGENDES: [number, string][] = [
  [0, 'Un premier point, au centre de la toile.'],
  [12, 'La fleur se brode, point par point, au rythme du morceau.'],
  [196.275, 'Le silence : l’aiguille s’arrête.'],
  [198.255, 'La fleur éclôt.'],
  [200.25, 'L’arc-en-ciel.'],
  [242.75, 'Le cœur s’illumine : la Perle.'],
];
export const legendeA = (t: number) => { let l = LEGENDES[0][1]; for (const [d, m] of LEGENDES) if (t >= d) l = m; return l; };
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const reduit = () => document.documentElement.classList.contains('calme') || document.documentElement.getAttribute('data-pz-motion') === 'reduce' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
const lire = (k: string, s = localStorage) => { try { return s.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string | null, s = localStorage) => { try { v === null ? s.removeItem(k) : s.setItem(k, v); } catch { /* rien */ } };

type Etat = 'repos' | 'chargement' | 'lecture' | 'pause' | 'fin' | 'ferme' | 'indispo';
type Lancement = { id: number; version: 'courte' | 'complete'; depuis: number };
const DUREE = 253.01333333333332;

export default function OuvertureFleur() {
  const [etat, setEtat] = useState<Etat>(() => {
    try { if (new URLSearchParams(location.search).get('ouverture') === '1') return 'repos'; } catch { /* rien */ }
    return lire(CLE_VUE) ? 'ferme' : 'repos';
  });
  const [t, setT] = useState(0), [son, setSon] = useState(true), [sansSon, setSansSon] = useState(false), [annonce, setAnnonce] = useState('');
  const [lancement, setLancement] = useState<Lancement | null>(null);
  const [reprise] = useState<number | null>(() => { const v = parseFloat(lire(CLE_REPRISE) ?? ''); return v > 5 && v < 240 ? v : null; });
  const lecteur = useRef<ControleClip>(null), suite = useRef<HTMLButtonElement>(null), generation = useRef(0), focusRaf = useRef(0);

  const refermer = useCallback((vu = true) => {
    const temps = lecteur.current?.temps() ?? 0;
    if (lancement?.version === 'complete' && temps > 5 && temps < 240) ecrire(CLE_REPRISE, String(Math.floor(temps)));
    generation.current++; lecteur.current?.pause(); setLancement(null);
    if (vu) ecrire(CLE_VUE, '1');
    setEtat('ferme'); setAnnonce('Introduction passée. Voici LE MONDE AIME.');
    focusRaf.current = requestAnimationFrame(() => {
      const e = document.getElementById('titre-entree');
      if (e) { e.setAttribute('tabindex', '-1'); e.focus({ preventScroll: true }); e.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block: 'start' }); }
    });
  }, [lancement]);
  useEffect(() => () => { generation.current++; cancelAnimationFrame(focusRaf.current); lecteur.current?.pause(); }, []);
  useEffect(() => { if (etat === 'fin') suite.current?.focus(); }, [etat]);

  const integration = useMemo<IntegrationClip | null>(() => {
    if (!lancement) return null;
    const enCours = () => generation.current === lancement.id;
    return {
      segments: lancement.version === 'courte' ? COURTE : [[lancement.depuis, DUREE]],
      onProgression: v => { if (enCours()) setT(v); },
      onLecture: (joue, silencieux) => {
        if (!enCours()) return;
        setSansSon(silencieux); setEtat(joue ? 'lecture' : 'pause');
        setAnnonce(joue ? (silencieux ? 'Lecture sans son. Vous pouvez réessayer avec le son.' : 'Lecture avec le son.') : 'En pause.');
      },
      onFin: () => {
        if (!enCours()) return;
        setEtat('fin'); setAnnonce('La fleur a éclos.'); ecrire(CLE_VUE, '1'); ecrire(CLE_REPRISE, null);
      },
      onErreur: () => { if (enCours()) { setEtat('indispo'); setAnnonce('La broderie ne peut pas être dessinée dans ce navigateur.'); } },
    };
  }, [lancement]);

  function lancer(version: 'courte' | 'complete', depuis = 0) {
    if (!webgl2()) { setEtat('indispo'); return; }
    generation.current++; setT(depuis); setSon(true); setSansSon(false);
    setLancement({ id: generation.current, version, depuis }); setEtat('chargement'); setAnnonce('La toile se prépare.');
  }
  const basculerPause = () => { if (etat === 'lecture') lecteur.current?.pause(); else if (etat === 'pause') lecteur.current?.jouer(); };
  const basculerSon = () => { const v = !son; setSon(v); lecteur.current?.son(v); setAnnonce(v ? 'Son activé.' : 'Son coupé.'); };
  const rejouer = () => { generation.current++; lecteur.current?.pause(); setLancement(null); setEtat('repos'); setT(0); setSon(true); setSansSon(false); };

  if (etat === 'ferme') return (
    <section id="ouverture" className="ouv-bande" aria-label="La Fleur du Ciel, l’ouverture">
      <Orbe taille={26} />
      <p><b>La Fleur du Ciel</b> <span>Une œuvre qui naît d’un point.</span></p>
      <button type="button" className="bouton" onClick={rejouer}>Revoir l’ouverture</button>
      <a className="bouton" href="/studio/fleur-du-ciel">Le clip complet<span className="sr-only"> (s’ouvre dans le Studio)</span></a>
      <p className="sr-only" role="status" aria-live="polite">{annonce}</p>
    </section>
  );

  const joue = etat === 'lecture' || etat === 'pause' || etat === 'fin';
  return (
    <section id="ouverture" className={'ouv' + (joue ? ' ouv-joue' : '')} aria-labelledby="titre-ouverture">
      <div className="ouv-scene">
        <img className="ouv-couverture" src={COUVERTURE} width={880} height={880} alt="" fetchPriority="high" decoding="async" hidden={joue} />
        {integration && <Suspense fallback={null}><ClipFleur ref={lecteur} integration={integration} /></Suspense>}
        <div className="ouv-voile" aria-hidden="true" />
        <div className="ouv-contenu">
          <div className="ouv-haut">
            <p className="ouv-signature"><span className="ouv-signature-point" /> LE MONDE AIME <span className="ouv-signature-sep">/</span> UNE ŒUVRE BRODÉE</p>
            {etat !== 'fin' && <button type="button" className="ouv-passer" onClick={() => refermer()}>Passer l’introduction <span aria-hidden="true">↗</span></button>}
          </div>
          <div className="ouv-texte">
            <p className="ouv-surtitle"><span>01</span> UNE FLEUR, UN PREMIER POINT</p>
            <h2 id="titre-ouverture">La Fleur <em>du Ciel.</em></h2>
            <p className="ouv-legende" aria-live="off">{joue ? legendeA(t) : 'Une œuvre qui prend vie, fil après fil.'}</p>
            {etat === 'chargement' && <p className="ouv-avis" role="status">La toile se prépare…</p>}
            {etat === 'indispo' && <p className="ouv-avis" role="status">Ce navigateur ne peut pas dessiner la broderie. <a href={DONNEES + 'la-fleur-du-ciel-brodee.mp4'}>Voir la vidéo de secours (4 min 13, 23 Mo)</a></p>}
            {sansSon && etat === 'lecture' && <p className="ouv-avis">La lecture a commencé sans son. <button type="button" onClick={() => lecteur.current?.jouer()}>Réessayer avec le son</button></p>}
            <div className="ouv-actions" role="group" aria-label="Commandes de l’ouverture">
              {etat === 'repos' && <>
                <button type="button" className="ouv-principal" onClick={() => lancer('complete')}><span className="ouv-play" aria-hidden="true">▶</span><span>Lancer avec le son<small>Le film · 4 min 13</small></span></button>
                <button type="button" className="ouv-secondaire" onClick={() => lancer('courte')}>Version courte <span>43 s</span></button>
                {reprise && <button type="button" className="ouv-secondaire" onClick={() => lancer('complete', reprise)}>Reprendre à {mmss(reprise)}</button>}
                <a className="ouv-lien" href="/studio/fleur-du-ciel">Le clip complet <span aria-hidden="true">↗</span><span className="sr-only"> (s’ouvre dans le Studio)</span></a>
              </>}
              {(etat === 'lecture' || etat === 'pause') && <>
                <button type="button" className="ouv-controle" onClick={basculerPause}><span aria-hidden="true">{etat === 'lecture' ? 'Ⅱ' : '▶'}</span> {etat === 'lecture' ? 'Pause' : 'Reprendre'}</button>
                <button type="button" className="ouv-controle" aria-pressed={!son} onClick={basculerSon}>{son ? 'Couper le son' : 'Remettre le son'}</button>
                <span className="ouv-temps" aria-hidden="true">{lancement?.version === 'courte' ? 'Version courte' : mmss(t) + ' / 4:13'}</span>
              </>}
              {etat === 'fin' && <>
                <button ref={suite} type="button" className="ouv-controle ouv-controle-clair" onClick={() => refermer()}>Entrer dans LE MONDE AIME</button>
                <button type="button" className="ouv-controle" onClick={rejouer}>Revoir</button>
              </>}
            </div>
            <p className="ouv-transparence"><span /> Gestes scénarisés <b>·</b> aucun patron éditable n’est créé</p>
          </div>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{annonce}</p>
    </section>
  );
}

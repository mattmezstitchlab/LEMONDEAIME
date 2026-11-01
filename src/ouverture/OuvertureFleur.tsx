/* L'OUVERTURE DE LE MONDE AIME : « La Fleur du Ciel », la création qui naît d'un point, s'ouvre, relie et garde son histoire.
   Aucun second film : la fleur est dessinée point par point, dans le navigateur, par le MÊME moteur que la page /studio/fleur-du-ciel
   (studio/src/clip : RenduClip, Morceaux, lireClip) et lit les MÊMES données publiées (clip.json, fils-NNN.bin.gz, la-fleur-du-ciel.m4a).
   Le mp4 (23 Mo) n'est jamais chargé ici : seul un lien le propose quand le navigateur ne peut pas dessiner la broderie.
   Premier écran : une image de couverture (rendue depuis les données, ~100 Ko). Rien ne se télécharge ni ne se joue avant un geste. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Orbe } from '../charte/Charte';
import './ouverture.css';

const DONNEES = '/studio/clip/fleur-du-ciel/';
export const COUVERTURE = '/media/fleur-du-ciel-couverture.jpg';
export const CLE_VUE = 'aime:ouverture:fleur:vue';
export const CLE_REPRISE = 'aime:ouverture:fleur:reprise';
/* la version courte (≈ 43 s) : la naissance, le silence et l'éclosion, la Perle. Les temps sont ceux du morceau (repères du clip). */
export const COURTE: [number, number][] = [[0, 12], [190, 208], [240, 253.013]];
/* les légendes disent ce que montre le clip ; seuls les repères vérifiés dans les données publiées y figurent */
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
const reduit = () => document.documentElement.getAttribute('data-pz-motion') === 'reduce' || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export function webgl2() { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } }
const lire = (k: string, s = localStorage) => { try { return s.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string | null, s = localStorage) => { try { v === null ? s.removeItem(k) : s.setItem(k, v); } catch { /* rien */ } };

type Etat = 'repos' | 'chargement' | 'lecture' | 'pause' | 'fin' | 'ferme' | 'indispo';

export default function OuvertureFleur() {
  /* première visite : l'ouverture est ouverte ; ensuite une bande discrète (?ouverture=1 la rouvre : le rejeu) */
  const [etat, setEtat] = useState<Etat>(() => {
    try { if (new URLSearchParams(location.search).get('ouverture') === '1') return 'repos'; } catch { /* rien */ }
    return lire(CLE_VUE) ? 'ferme' : 'repos';
  });
  const [t, setT] = useState(0), [son, setSon] = useState(true), [courte, setCourte] = useState(false), [annonce, setAnnonce] = useState('');
  const [reprise] = useState<number | null>(() => { const v = parseFloat(lire(CLE_REPRISE) ?? ''); return v > 5 && v < 240 ? v : null; });
  const toile = useRef<HTMLCanvasElement>(null), audio = useRef<HTMLAudioElement | null>(null), cadre = useRef<HTMLElement>(null);
  const moteur = useRef<{ stop: () => void; pause: () => void; reprendre: () => void; son: (v: boolean) => void } | null>(null);
  const suite = useRef<HTMLButtonElement>(null);

  const refermer = useCallback((vu = true) => {
    moteur.current?.stop(); moteur.current = null;
    if (vu) ecrire(CLE_VUE, '1');
    setEtat('ferme'); setAnnonce('Introduction passée. Voici LE MONDE AIME.');
    requestAnimationFrame(() => { const e = document.getElementById('titre-entree'); if (e) { e.setAttribute('tabindex', '-1'); e.focus({ preventScroll: true }); e.scrollIntoView({ behavior: reduit() ? 'auto' : 'smooth', block: 'start' }); } });
  }, []);
  useEffect(() => () => moteur.current?.stop(), []);
  useEffect(() => { if (etat === 'fin') suite.current?.focus(); }, [etat]);

  async function lancer(version: 'courte' | 'complete', depuis = 0) {
    if (!webgl2()) { setEtat('indispo'); return; }
    setEtat('chargement'); setCourte(version === 'courte');
    try {
      const [d, r] = await Promise.all([import('../../studio/src/clip/donnees'), import('../../studio/src/clip/rendu')]);
      const clip = await d.lireClip(DONNEES), morceaux = new d.Morceaux(DONNEES, clip, 4);
      const cv = toile.current!; const rendu = new r.RenduClip(cv);
      const segs: [number, number][] = version === 'courte' ? COURTE : [[depuis, clip.duree]];
      await morceaux.attendre(Math.floor(segs[0][0] * clip.fps));
      const a = new Audio(DONNEES + 'la-fleur-du-ciel.m4a'); a.preload = 'auto'; a.volume = 1; audio.current = a;
      let seg = 0, enPause = false, fini = false, silencieux = false, depart = 0, t0 = segs[0][0], raf = 0, dernier = -1, dernierT = 0, attente = false;
      const maintenant = () => (!silencieux && a.readyState > 0 ? a.currentTime : depart ? t0 + (performance.now() - depart) / 1000 : t0);
      const fondu = (v: number, ms: number) => new Promise<void>(ok => { const d0 = a.volume, n = Math.max(1, Math.round(ms / 30)); let i = 0; const h = window.setInterval(() => { i++; a.volume = Math.max(0, Math.min(1, d0 + (v - d0) * i / n)); if (i >= n) { clearInterval(h); ok(); } }, 30); });
      a.currentTime = segs[0][0];
      try { await a.play(); } catch { silencieux = true; }
      depart = performance.now(); t0 = segs[0][0];
      const accents = clip.accents, parties = d.partieEn(clip.parties, r.CODE_MODE);
      const palette = [...clip.fils.map(f => ({ rgb: f.rgb as number[], etat: 1 })), { rgb: [236, 231, 219], etat: 0 }];
      rendu.palette(palette);
      let qualite = 1, lent = 0, dernierInstant = 0;
      const tourner = () => {
        raf = requestAnimationFrame(tourner);
        if (fini) return;
        let tt = Math.min(clip.duree, maintenant());
        if (!enPause && !attente) {
          const [, fin] = segs[seg];
          if (tt >= fin - .02) {
            if (seg + 1 < segs.length) {
              attente = true; const prochain = segs[seg + 1][0];
              void (async () => { await fondu(0, 250); await morceaux.attendre(Math.floor(prochain * clip.fps)); a.currentTime = prochain; t0 = prochain; depart = performance.now(); seg++; if (!enPause) await fondu(1, 250); attente = false; })();
              return;
            }
            fini = true; a.pause(); setT(tt); setEtat('fin'); ecrire(CLE_VUE, '1'); ecrire(CLE_REPRISE, null); return;
          }
        }
        if (attente) tt = Math.min(tt, segs[seg][1]);
        if (Math.abs(tt - dernierT) > .25) { dernierT = tt; setT(tt); }
        const n = Math.min(clip.images - 1, Math.floor(tt * clip.fps));
        if (n !== dernier) { const im = morceaux.image(n); if (im) { rendu.image(im); dernier = n; } }
        const ici = performance.now(); if (dernierInstant) { const e = ici - dernierInstant; lent = lent * .9 + (e > 45 ? 1 : 0) * .1; if (lent > .5 && qualite > .5) { qualite = Math.max(.5, qualite - .15); lent = 0; } } dernierInstant = ici;
        const dpr = Math.min(window.innerWidth < 700 ? 1.25 : 1.5, window.devicePixelRatio || 1) * qualite, W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        let eclat = 0; for (const [ta, f] of accents) if (tt - ta >= 0 && tt - ta < 1) eclat = Math.max(eclat, f / 99 * Math.exp(-(tt - ta) * 6));
        rendu.dessiner({ t: tt, battue: clip.battue, brode: clip.brodeJusqua, brodeT0: 0, eclat: reduit() ? eclat * .4 : eclat, envers: false, arriere: false, grille: false, parties, vue: [clip.grille / 2, clip.grille / 2, clip.grille / Math.max(W, H)], loupe: null, tambour: null });
      };
      raf = requestAnimationFrame(tourner);
      a.addEventListener('ended', () => { if (!fini) { fini = true; setEtat('fin'); ecrire(CLE_VUE, '1'); } });
      moteur.current = {
        stop: () => { cancelAnimationFrame(raf); fini = true; if (version === 'complete') { const x = maintenant(); if (x > 5 && x < 240) ecrire(CLE_REPRISE, String(Math.floor(x))); } a.pause(); a.removeAttribute('src'); a.load(); },
        pause: () => { enPause = true; t0 = maintenant(); depart = 0; a.pause(); },
        reprendre: () => { enPause = false; depart = performance.now(); void a.play().catch(() => { silencieux = true; }); },
        son: (v: boolean) => { a.muted = !v; },
      };
      setEtat('lecture'); setAnnonce(version === 'courte' ? 'Lecture de la version courte, avec le son.' : 'Lecture du clip complet, avec le son.');
    } catch {
      moteur.current?.stop(); setEtat('indispo');
    }
  }
  const basculerPause = () => { if (etat === 'lecture') { moteur.current?.pause(); setEtat('pause'); setAnnonce('En pause.'); } else if (etat === 'pause') { moteur.current?.reprendre(); setEtat('lecture'); setAnnonce('Lecture.'); } };
  const basculerSon = () => { const v = !son; setSon(v); moteur.current?.son(v); setAnnonce(v ? 'Son activé.' : 'Son coupé.'); };
  const rejouer = () => { moteur.current?.stop(); moteur.current = null; setEtat('repos'); setT(0); };

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
    <section id="ouverture" ref={cadre} className={'ouv' + (joue ? ' ouv-joue' : '')} aria-labelledby="titre-ouverture">
      <div className="ouv-scene">
        <img className="ouv-couverture" src={COUVERTURE} width={880} height={880} alt="" fetchPriority="high" decoding="async" hidden={joue} />
        <canvas ref={toile} className="ouv-toile" role="img" aria-label="La Fleur du Ciel, brodée point par point au point de croix (animation)" hidden={!joue} />
        {etat === 'repos' && <button type="button" className="ouv-orbe" onClick={() => lancer('complete')} aria-label="Lancer La Fleur du Ciel, avec le son (4 min 13)"><Orbe taille={56} /><span>Lancer, avec le son</span></button>}
        {etat === 'chargement' && <p className="ouv-statut" role="status">La toile se prépare…</p>}
        {etat === 'indispo' && <p className="ouv-statut" role="status">Ce navigateur ne peut pas dessiner la broderie. <a href={DONNEES + 'la-fleur-du-ciel-brodee.mp4'}>Voir la vidéo (4 min 13, 23 Mo)</a></p>}
        {etat === 'fin' && <div className="ouv-fin"><p>La fleur a éclos.</p><button ref={suite} type="button" className="bouton noir" onClick={() => refermer()}>Entrer dans LE MONDE AIME</button><button type="button" className="bouton" onClick={rejouer}>Revoir</button></div>}
      </div>
      <div className="ouv-texte">
        <p className="surtitre">Une œuvre, point par point</p>
        <h2 id="titre-ouverture" className="grand-mot">La Fleur du Ciel</h2>
        <p className="ouv-legende" aria-live="off">{joue ? legendeA(t) : 'Une création qui naît d’un point, s’ouvre, relie, et garde son histoire.'}</p>
        <div className="ouv-actions" role="group" aria-label="Commandes de l’ouverture">
          {etat === 'repos' && <>
            <button type="button" className="bouton noir" onClick={() => lancer('complete')}>Lancer avec le son</button>
            <button type="button" className="bouton" onClick={() => lancer('courte')}>Version courte (43 s)</button>
            {reprise && <button type="button" className="bouton" onClick={() => lancer('complete', reprise)}>Reprendre à {mmss(reprise)}</button>}
          </>}
          {(etat === 'lecture' || etat === 'pause') && <>
            <button type="button" className="bouton" onClick={basculerPause}>{etat === 'lecture' ? 'Pause' : 'Reprendre'}</button>
            <button type="button" className="bouton" aria-pressed={!son} onClick={basculerSon}>{son ? 'Couper le son' : 'Remettre le son'}</button>
            <span className="ouv-temps" aria-hidden="true">{courte ? 'Version courte' : mmss(t) + ' / 4:13'}</span>
          </>}
          <button type="button" className="bouton ouv-passer" onClick={() => refermer()}>Passer l’introduction</button>
        </div>
        <p className="ouv-note">Rien ne se joue sans votre geste. <a href="/studio/fleur-du-ciel">Le clip complet</a> reste toujours accessible.</p>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{annonce}</p>
    </section>
  );
}

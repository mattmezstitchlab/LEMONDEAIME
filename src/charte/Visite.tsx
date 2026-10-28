import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* La visite guidée : le Point quitte le logo et montre, une phrase à la fois, comment marche AIME. Puis il revient près de AIME.
   Toujours Précédent, Suivant et Quitter ; jamais en boucle ; sans mouvement si on l'a demandé. */
type Etape = { cible: string; titre: string; texte: string };
const ETAPES: Etape[] = [
  { cible: '.dock-haut .orbe', titre: 'Bonjour, je suis le Point.', texte: 'Comme en broderie, tout part de moi. Je vous montre AIME en quelques pas.' },
  { cible: '.dock-haut', titre: 'En haut : ce qu’on fait.', texte: 'Le dock blanc porte des verbes, des mots et pas de pictos. La loupe cherche partout et montre le plan du site.' },
  { cible: '.tete .plus', titre: 'Une seule porte : le « + ».', texte: 'Avant, il vous fait entrer. Après, il ouvre le Point Zéro pour commencer quelque chose.' },
  { cible: '#champ-intention', titre: 'Tout commence ici.', texte: 'Écrivez ce que vous voulez faire, avec vos mots. AIME choisit les briques.' },
  { cible: '#studio .studio-demo', titre: 'Une info, une seule fois.', texte: 'Ce que AIME sait déjà remplit vos documents. Changez une info : elle change partout.' },
  { cible: '.dock-bas > div', titre: 'En bas : où l’on va.', texte: 'Le dock sombre montre les lieux de la page. Celui que vous lisez s’allume en blanc.' },
  { cible: '.buro-bouton', titre: 'Votre espace.', texte: 'Vos projets, ce qu’on vous partage, vos archives et votre profil, toujours au même endroit.' },
  { cible: '.dock-haut .orbe', titre: 'Je reste près de AIME.', texte: 'Pour me revoir : menu AIME®, puis « Visite guidée ». Bonne découverte.' },
];
const CLE = 'aime-visite-vue';
const lire = () => { try { return localStorage.getItem(CLE) === '1'; } catch { return true; } };
const noter = () => { try { localStorage.setItem(CLE, '1'); } catch { /* navigation privée */ } };

export function Visite() {
  const [n, setN] = useState<number | null>(null);
  const [invite, setInvite] = useState(false);
  const [r, setR] = useState<DOMRect | null>(null);
  const suivant = useRef<HTMLButtonElement>(null);
  const reduit = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const go = () => { setInvite(false); noter(); setN(0); };
    window.addEventListener('aime-visite', go);
    if (new URLSearchParams(window.location.search).get('visite') === '1') { window.history.replaceState({}, '', '/'); go(); }
    else if (!lire()) { const t = setTimeout(() => setInvite(true), reduit ? 0 : 2200); return () => { clearTimeout(t); window.removeEventListener('aime-visite', go); }; }
    return () => window.removeEventListener('aime-visite', go);
  }, [reduit]);

  const mesurer = useCallback(() => {
    if (n === null) return;
    const el = document.querySelector(ETAPES[n].cible);
    setR(el ? el.getBoundingClientRect() : null);
  }, [n]);
  useLayoutEffect(() => {
    if (n === null) return;
    const el = document.querySelector(ETAPES[n].cible);
    if (el) {
      const b = el.getBoundingClientRect();
      if (b.top < 80 || b.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: reduit ? 'auto' : 'smooth' });
    }
    mesurer();
    const t = setTimeout(mesurer, reduit ? 0 : 450);
    window.addEventListener('scroll', mesurer, { passive: true }); window.addEventListener('resize', mesurer);
    suivant.current?.focus({ preventScroll: true });
    return () => { clearTimeout(t); window.removeEventListener('scroll', mesurer); window.removeEventListener('resize', mesurer); };
  }, [n, mesurer, reduit]);

  const quitter = () => { setN(null); (document.querySelector('.dock-haut button') as HTMLElement | null)?.focus(); };
  if (invite && n === null) return (
    <div className="visite-invite" role="dialog" aria-labelledby="visite-invite-titre">
      <span className="visite-point" aria-hidden="true" style={{ position: 'static', flex: 'none' }} />
      <span><b id="visite-invite-titre" style={{ display: 'block', fontWeight: 600 }}>Je suis le Point.</b><span style={{ fontSize: 15, color: '#3A3A3F' }}>Une visite de deux minutes ?</span></span>
      <span style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="bouton noir" style={{ height: 44 }} onClick={() => { setInvite(false); noter(); setN(0); }}>Faire la visite</button>
        <button type="button" className="bouton" style={{ height: 44 }} onClick={() => { setInvite(false); noter(); }}>Plus tard</button>
      </span>
    </div>
  );
  if (n === null) return null;
  const e = ETAPES[n], vw = window.innerWidth, vh = window.innerHeight;
  const P = 34, pos = r ? { left: Math.min(vw - P - 8, Math.max(8, r.left + Math.min(r.width, 60) / 2 - P / 2)), top: Math.max(8, r.top - P / 2 - 6) } : { left: 24, top: 24 };
  const W = Math.min(380, vw - 24);
  const H = 200, bas = r ? r.bottom + 16 + H < vh - 90 : true, haut = r ? r.top - 16 - H > 12 : false;
  /* une cible très grande : la bulle se pose en bas de l'écran, au-dessus du dock */
  const bulle = r ? { left: Math.min(vw - W - 12, Math.max(12, r.left + r.width / 2 - W / 2)), top: bas ? r.bottom + 16 : haut ? r.top - 16 - H : vh - H - 100 } : { left: 12, top: 90 };
  const tr = reduit ? 'none' : 'left .7s cubic-bezier(.2,.7,.2,1), top .7s cubic-bezier(.2,.7,.2,1), width .5s, height .5s';
  return (
    <>
      {r && <div aria-hidden="true" className="visite-cadre" style={{ left: r.left - 6, top: r.top - 6, width: r.width + 12, height: r.height + 12, transition: tr }} />}
      <span aria-hidden="true" className="visite-point" style={{ left: pos.left, top: pos.top, transition: tr }} />
      <div role="dialog" aria-modal="false" aria-label="Visite guidée par le Point" className="visite-bulle" style={{ left: bulle.left, top: bulle.top, width: W, transition: reduit ? 'none' : 'left .5s, top .5s' }}
        onKeyDown={k => { if (k.key === 'Escape') { k.preventDefault(); quitter(); } }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#55555A' }}>Visite · {n + 1} / {ETAPES.length}</p>
        <div aria-live="polite"><p style={{ margin: '6px 0 4px', fontSize: 20, fontWeight: 600, letterSpacing: '-0.015em' }}>{e.titre}</p><p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: '#3A3A3F' }}>{e.texte}</p></div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          <button type="button" className="bouton" style={{ height: 44 }} disabled={n === 0} onClick={() => setN(n - 1)}>Précédent</button>
          <button ref={suivant} type="button" className="bouton noir" style={{ height: 44 }} onClick={() => n + 1 < ETAPES.length ? setN(n + 1) : quitter()}>{n + 1 < ETAPES.length ? 'Suivant' : 'Terminer'}</button>
          <button type="button" className="bouton" style={{ height: 44, marginLeft: 'auto', border: 0 }} onClick={quitter}>Quitter</button>
        </div>
      </div>
    </>
  );
}

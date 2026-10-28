import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Tete, Verbe, DockBas, BoutonBuro, Pied, Visuel, Orbe } from '../charte/Charte';
import { aller, Lien } from '../lib/router';
import { MEDIAS } from '../lib/medias';
import { Projets } from './Projets';

/* AIME : la toute première page. L'orbe quitte le logo, se pose sous le titre et devient le champ « Tout commence ici… ». */
export default function Aime() {
  const [ouvert, setOuvert] = useState(false);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setOuvert(true), reduit ? 0 : 900);
    return () => clearTimeout(t);
  }, []);
  const envoyer = (e: FormEvent) => {
    e.preventDefault();
    const v = champ.current?.value.trim();
    if (!v) { champ.current?.focus(); return; }
    try { sessionStorage.setItem('aime-intention', v); } catch { /* navigation privée : on passe le texte dans l'adresse */ }
    aller('/point-zero?q=' + encodeURIComponent(v));
  };
  const P = 'texte';
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/" verbes={<><Verbe href="/monde">Découvrir</Verbe><Verbe href="/charte">La Charte</Verbe></>} />
      <main id="contenu">
        <section aria-labelledby="titre-aime" style={{ minHeight: 'calc(100vh - 90px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '64px var(--marge) 120px' }}>
          <p className="surtitre"><span className="marque" style={{ fontSize: 'inherit' }}>AIME<sup aria-hidden="true">®</sup></span></p>
          <h1 id="titre-aime" className="signature" style={{ fontSize: 'clamp(50px, 10.4vw, 178px)' }}>{'Point Zéro\ndes vivants'}</h1>
          <form role="search" aria-label="Tout commence ici" onSubmit={envoyer} style={{ marginTop: 'clamp(32px, 4vw, 56px)', width: '100%', maxWidth: ouvert ? 640 : 68, height: 68, padding: 6, borderRadius: 34, background: '#fff', border: '1px solid #0B0B0C', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', transition: 'max-width .8s cubic-bezier(.2,.7,.2,1)' }}>
            <Orbe taille={54} />
            <label htmlFor="champ-intention" className="sr-only">Que voulez-vous faire ?</label>
            <input id="champ-intention" ref={champ} type="text" autoComplete="off" placeholder="Tout commence ici…" onFocus={() => setOuvert(true)} style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', font: 'inherit', fontSize: 'clamp(18px, 1.7vw, 22px)', outline: 'none', opacity: ouvert ? 1 : 0, transition: 'opacity .4s ease .3s' }} />
            <button type="submit" aria-label="Commencer" style={{ flex: 'none', width: 54, height: 54, borderRadius: '50%', border: 0, background: '#0B0B0C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ouvert ? 1 : 0, transition: 'opacity .4s ease .3s' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <p style={{ margin: '18px 0 0', paddingLeft: 8, fontSize: 'clamp(17px, 1.5vw, 20px)', opacity: ouvert ? 1 : 0, transition: 'opacity .4s ease .5s' }}>
            <Lien href="/monde">…mais faisons une visite d’abord</Lien>
          </p>
        </section>

        <section aria-label="Image" style={{ padding: '0 var(--marge) 120px' }}><Visuel m={MEDIAS['aime-hero']} /></section>

        <section id="manifeste" aria-labelledby="titre-manifeste" className="section">
          <p className="surtitre">Manifeste</p>
          <h2 id="titre-manifeste" className="titre" style={{ maxWidth: '16ch' }}>Tout part d’un point.</h2>
          <div className="grille-auto" style={{ marginTop: 48, maxWidth: 1200 }}>
            <p className={P}>Le point zéro, c’est l’instant où quelque chose commence : un oui, un premier point brodé, une première note. AIME® est fait pour ces instants-là.</p>
            <p className={P}>Les outils doivent s’effacer devant ce qu’on vit. Deux docks, des mots simples, un seul bouton pour entrer.</p>
            <p className={P}>Chaque studio sert un métier, tous parlent la même langue. Ce que vous créez vous appartient : vous choisissez qui le voit.</p>
          </div>
          <ul style={{ listStyle: 'none', margin: '56px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {['Des mots, pas des pictos', 'Un seul « + » pour entrer', 'Accessible à toutes et à tous'].map(t => <li key={t} style={{ padding: '10px 16px', borderRadius: 999, border: '1px solid #0B0B0C', fontSize: 16, fontWeight: 600 }}>{t}</li>)}
          </ul>
          <div style={{ marginTop: 72 }}><Visuel m={MEDIAS['aime-manifeste']} hauteur="clamp(18rem, 38vw, 34rem)" /></div>
        </section>

        <section id="fondateur" aria-labelledby="titre-fondateur" className="section blanche">
          <div style={{ maxWidth: 1320, marginBottom: 56 }}><Visuel m={MEDIAS['aime-fondateur']} hauteur="clamp(24rem, 56vw, 52rem)" /></div>
          <div className="grille-auto" style={{ maxWidth: 1320, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: '32px 64px' }}>
            <div>
              <p className="surtitre">Le fondateur</p>
              <h2 id="titre-fondateur" className="titre">Concepteur d’applications, directeur artistique</h2>
              <p style={{ margin: '14px 0 0', fontSize: 19, fontWeight: 600, color: '#3A3A3F' }}>Matthieu Lecointre</p>
            </div>
            <div style={{ display: 'grid', gap: 16 }}>
              <p className={P}>Créateur de l’écosystème AIME®, il conçoit des applications numériques et dirige leur identité visuelle depuis de nombreuses années. Sa conviction : un outil n’a de valeur que s’il reste compréhensible par la personne qui l’utilise.</p>
              <p className={P}>Depuis deux ans, il explore concrètement les modèles d’intelligence artificielle : ce qu’ils savent faire, ce qu’ils ratent, et surtout la manière de les mettre au service d’une intention humaine sans jamais leur céder la décision finale.</p>
              <p className={P}>AIME est né de cette envie simple : transmettre cette expérience à celles et ceux qui n’ont jamais osé franchir la porte du numérique.</p>
            </div>
          </div>
          <ul style={{ listStyle: 'none', margin: '64px 0 0', padding: 0, maxWidth: 1320, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 16 }}>
            {[['Applications conçues', 'Outils métiers, carnets associatifs, interfaces sobres et lisibles.'], ['Direction artistique', 'Identités visuelles, mises en page éditoriales, supports de présentation.'], ['Expérimentation IA', 'Deux années de tests sur des cas réels, documentés sans complaisance.'], ['Transmission', 'Une pédagogie patiente, en français courant, adaptée aux débutants et aux seniors.']].map(([t, d]) =>
              <li key={t} style={{ padding: '22px 22px 24px', borderRadius: 20, background: '#F6F6F4', border: '1px solid #E2E2DE' }}><h3 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 600 }}>{t}</h3><p style={{ margin: 0, fontSize: 16, lineHeight: 1.55, color: '#3A3A3F' }}>{d}</p></li>)}
          </ul>
          <figure style={{ margin: '24px 0 0', maxWidth: 1320, padding: 'clamp(28px, 4vw, 56px)', borderRadius: 24, background: '#0B0B0C', color: '#fff' }}>
            <blockquote style={{ margin: 0, fontSize: 'clamp(24px, 2.8vw, 40px)', lineHeight: 1.2, fontWeight: 600, letterSpacing: '-0.025em' }}>« Une personne qui ne connaît rien à l’intelligence artificielle peut passer de “Je ne sais pas comment faire” à “Je l’ai fait moi-même”. C’est la seule promesse que je veux tenir. »</blockquote>
            <figcaption style={{ marginTop: 22, fontSize: 13, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#BDBDB8' }}>Le fondateur d’AIME</figcaption>
          </figure>
        </section>

        <section id="vision" aria-labelledby="titre-vision" className="section">
          <p className="surtitre">Vision</p>
          <h2 id="titre-vision" className="titre" style={{ maxWidth: '18ch' }}>Un studio pour chaque façon de vivre.</h2>
          <ol style={{ listStyle: 'none', margin: '56px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px 32px' }}>
            {[['Aujourd’hui', 'Point Zéro pour commencer ; AIME Wedding pour l’union ; Brode Way pour la broderie.'], ['Demain', 'D’autres studios rejoignent Le Monde AIME. Même compte, même BurO, même Charte.'], ['Toujours', 'Vos projets restent à vous : privé, restreint, par lien ou public, c’est vous qui décidez.']].map(([t, d]) =>
              <li key={t} style={{ borderTop: '1px solid #0B0B0C', paddingTop: 18 }}><h3 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 600 }}>{t}</h3><p className={P}>{d}</p></li>)}
          </ol>
        </section>

        <section id="monde" aria-labelledby="titre-monde-aime" className="section blanche" style={{ paddingBottom: 150 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap', marginBottom: 48 }}>
            <div><p className="surtitre">Les studios</p><h2 id="titre-monde-aime" className="titre">Le Monde AIME</h2></div>
            <Lien className="bouton" href="/monde">Voir tous les projets</Lien>
          </div>
          <Projets />
        </section>
      </main>
      <DockBas lieux={[['manifeste', 'Manifeste'], ['fondateur', 'Fondateur'], ['vision', 'Vision'], ['monde', 'Projets']]} />
      <Pied />
      <BoutonBuro />
    </>
  );
}

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Tete, Verbe, DockBas, BoutonBuro, Pied, Visuel, Orbe } from '../charte/Charte';
import { aller, Lien } from '../lib/router';
import { MEDIAS } from '../lib/medias';
import { Projets } from './Projets';
import { CarteReseau } from './Reseau';
import { FONDATEUR } from '../lib/reseau-exemples';

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
      <Tete courant="/" verbes={<><Verbe href="/monde">Découvrir</Verbe><Verbe href="/reseau">Réseau</Verbe><Verbe href="/charte">La Charte</Verbe></>} />
      <main id="contenu">
        <section aria-labelledby="titre-aime" style={{ padding: '14px clamp(8px, 1.4vw, 20px) 0' }}>
          <div className="hero">
            <img src={MEDIAS['aime-hero'].src} alt={MEDIAS['aime-hero'].alt} style={{ objectPosition: MEDIAS['aime-hero'].pos }} fetchPriority="high" />
            <div className="hero-contenu">
              <h1 id="titre-aime" className="signature hero-titre">AIME</h1>
              <p className="hero-sous-titre">Architecture Intelligente de la Mémoire Ensemble</p>
          <form role="search" aria-label="Tout commence ici" onSubmit={envoyer} style={{ marginTop: 'clamp(32px, 4vw, 56px)', width: '100%', maxWidth: ouvert ? 640 : 68, height: 68, padding: 6, borderRadius: 34, background: '#fff', color: '#0B0B0C', border: '1px solid rgba(255,255,255,.8)', boxShadow: '0 18px 50px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', transition: 'max-width .8s cubic-bezier(.2,.7,.2,1)' }}>
            <Orbe taille={54} />
            <label htmlFor="champ-intention" className="sr-only">Que voulez-vous faire ?</label>
            <input id="champ-intention" ref={champ} type="text" autoComplete="off" placeholder="Tout commence ici…" onFocus={() => setOuvert(true)} style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', font: 'inherit', fontSize: 'clamp(18px, 1.7vw, 22px)', outline: 'none', opacity: ouvert ? 1 : 0, transition: 'opacity .4s ease .3s' }} />
            <button type="submit" aria-label="Commencer" style={{ flex: 'none', width: 54, height: 54, borderRadius: '50%', border: 0, background: '#0B0B0C', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: ouvert ? 1 : 0, transition: 'opacity .4s ease .3s' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </form>
          <p style={{ margin: '18px 0 0', paddingLeft: 8, fontSize: 'clamp(17px, 1.5vw, 20px)', opacity: ouvert ? 1 : 0, transition: 'opacity .4s ease .5s' }}>
            <Lien href="/monde" style={{ color: '#fff' }}>…mais faisons une visite d’abord</Lien>
          </p>
            </div>
          </div>
        </section>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '40px clamp(32px, 6vw, 96px)', alignItems: 'center', maxWidth: 1100 }}>
            <div style={{ maxWidth: 340 }}><CarteReseau c={{ href: '/reseau/' + FONDATEUR.slug, nom: FONDATEUR.nom, etiquette: FONDATEUR.famille, photo: FONDATEUR.photo, alt: FONDATEUR.alt }} /></div>
            <div>
              <p className="surtitre">Le fondateur</p>
              <h2 id="titre-fondateur" className="titre" style={{ maxWidth: '16ch' }}>{FONDATEUR.titre}</h2>
              <p className="chapeau">{FONDATEUR.texte} Son parcours, ses domaines et son module sont sur son profil, dans le Réseau.</p>
              <div style={{ marginTop: 28, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Lien className="bouton noir" href={'/reseau/' + FONDATEUR.slug}>Voir son profil</Lien>
                <Lien className="bouton" href="/reseau">Tout le Réseau</Lien>
              </div>
            </div>
          </div>
        </section>

        <section id="vision" aria-labelledby="titre-vision" className="section">
          <p className="surtitre">Vision</p>
          <h2 id="titre-vision" className="titre" style={{ maxWidth: '18ch' }}>Un studio pour chaque façon de vivre.</h2>
          <ol style={{ listStyle: 'none', margin: '56px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '40px 32px' }}>
            {[['Aujourd’hui', 'Point Zéro pour commencer ; AIME Wedding pour l’union ; Brode Way pour la broderie.'], ['Demain', 'D’autres studios rejoignent Le Monde AIME. Même compte, même espace, même Charte.'], ['Toujours', 'Vos projets restent à vous : privé, restreint, par lien ou public, c’est vous qui décidez.']].map(([t, d]) =>
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

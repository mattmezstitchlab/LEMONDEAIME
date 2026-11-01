import {Tete, DockBas, Pied, Visuel } from '../charte/Charte';
import { Lien } from '../lib/router';
import { MEDIAS } from '../lib/medias';
import { FONDATEUR } from '../lib/reseau-exemples';
import { CarteReseau } from './Reseau';

/* À propos : AIME, la marque mère ; LE MONDE AIME, l'association ; le fondateur. (Ce qui était l'ancien accueil « AIME ».) */
export default function APropos() {
  const P = 'texte';
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/a-propos" />
      <main id="contenu">
        <section aria-labelledby="titre-apropos" style={{ padding: 'clamp(48px, 7vw, 96px) var(--marge) 64px' }}>
          <p className="surtitre">À propos</p>
          <h1 id="titre-apropos" className="signature" style={{ fontSize: 'clamp(64px, 14vw, 240px)' }}>AIME</h1>
          <p className="chapeau" style={{ maxWidth: '30ch', fontWeight: 600, color: 'var(--encre)' }}>Architecture Intelligente de la Mémoire Ensemble</p>
          <div style={{ marginTop: 56 }}><Visuel m={MEDIAS['aime-hero']} hauteur="clamp(20rem, 44vw, 40rem)" /></div>
        </section>

        <section id="manifeste" aria-labelledby="titre-manifeste" className="section">
          <p className="surtitre">Manifeste</p>
          <h2 id="titre-manifeste" className="titre" style={{ maxWidth: '16ch' }}>Tout part d’un point.</h2>
          <div className="grille-auto" style={{ marginTop: 48, maxWidth: 1200 }}>
            <p className={P}>Le point zéro, c’est l’instant où quelque chose commence : un oui, un premier point brodé, une première note. AIME® est fait pour ces instants-là.</p>
            <p className={P}>Les outils doivent s’effacer devant ce qu’on vit. Des mots simples, un seul bouton pour entrer, et chaque information donnée une seule fois.</p>
            <p className={P}>Ce que vous créez vous appartient : vous choisissez qui le voit. AIME® est la marque mère ; LE MONDE AIME est une association.</p>
          </div>
        </section>

        <section id="fondateur" aria-labelledby="titre-fondateur" className="section blanche">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '40px clamp(32px, 6vw, 96px)', alignItems: 'center', maxWidth: 1100 }}>
            <div style={{ maxWidth: 340 }}><CarteReseau c={{ href: '/reseau/' + FONDATEUR.slug, nom: FONDATEUR.nom, etiquette: FONDATEUR.famille, photo: FONDATEUR.photo, alt: FONDATEUR.alt }} /></div>
            <div>
              <p className="surtitre">Le fondateur</p>
              <h2 id="titre-fondateur" className="titre" style={{ maxWidth: '16ch' }}>{FONDATEUR.titre}</h2>
              <p className="chapeau">{FONDATEUR.texte}</p>
              <div style={{ marginTop: 28 }}><Lien className="bouton noir" href={'/reseau/' + FONDATEUR.slug}>Voir son profil</Lien></div>
            </div>
          </div>
        </section>
      </main>
      <Pied />
      <DockBas />
    </>
  );
}

import { Tete, DockBas, VerbesSite, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';

export function APlus() {
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/a-plus" verbes={<VerbesSite />} />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px', maxWidth: 900 }}>
        <p className="surtitre">Pour celles et ceux qui en font leur métier</p>
        <h1 className="titre" style={{ fontSize: 'clamp(64px, 13vw, 220px)', lineHeight: .84, textTransform: 'uppercase' }}>A+</h1>
        <p className="chapeau">Aller plus loin avec AIME : une vitrine, des devis, des factures, dans chaque studio. A+ ouvre bientôt ; en attendant, tout commence au Point Zéro.</p>
        <Lien className="bouton noir" href="/point-zero" style={{ marginTop: 32 }}>Commencer au Point Zéro</Lien>
      </main>
      <Pied />
      <DockBas />
    </>
  );
}

export function Introuvable() {
  return (
    <>
      <Tete />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px' }}>
        <p className="surtitre">Page introuvable</p>
        <h1 className="titre">Cette page n’existe pas, ou plus.</h1>
        <p className="chapeau"><Lien href="/">Revenir à l’accueil</Lien> ou <Lien href="/#projets">voir les projets</Lien>.</p>
      </main>
      <Pied />
    </>
  );
}

import { Tete, Verbe, DockBas, BoutonBuro, Pied, Visuel } from '../charte/Charte';
import { Lien } from '../lib/router';
import { MEDIAS } from '../lib/medias';
import { Projets } from './Projets';

export default function Monde() {
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/monde" verbes={<><Verbe href="/monde" actif>Découvrir</Verbe><Verbe href="/charte">La Charte</Verbe></>} />
      <main id="contenu">
        <section aria-labelledby="titre-monde" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 48px' }}>
          <p className="surtitre">Les studios et projets d’AIME®</p>
          <h1 id="titre-monde" className="signature">Le Monde AIME</h1>
          <p className="chapeau">Une galerie, comme une vitrine d’atelier : chaque studio a sa page, son métier et son BurO. Tous parlent la même langue, la Charte AIME.</p>
          <div style={{ marginTop: 48 }}><Visuel m={MEDIAS['monde-hero']} /></div>
        </section>
        <section id="projets" aria-labelledby="titre-projets" style={{ padding: '24px var(--marge) 120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', borderTop: '1px solid #0B0B0C', paddingTop: 18, marginBottom: 32 }}>
            <h2 id="titre-projets" style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Projets</h2>
          </div>
          <Projets />
        </section>
        <section id="association" aria-labelledby="titre-asso" style={{ padding: '120px var(--marge) 150px', background: '#0B0B0C', color: '#fff' }}>
          <p className="surtitre" style={{ color: '#BDBDB8' }}>L’association</p>
          <h2 id="titre-asso" className="titre" style={{ maxWidth: '18ch' }}>Une maison commune pour les studios.</h2>
          <div className="grille-auto" style={{ marginTop: 48, maxWidth: 1100, fontSize: 19, lineHeight: 1.6, color: '#E4E4E0' }}>
            <p style={{ margin: 0 }}>AIME® est la marque mère. LE MONDE AIME est l’association qui réunit ses studios et ceux qui les font vivre.</p>
            <p style={{ margin: 0 }}>Un seul compte ouvre tous les studios. Le « + » vous fait entrer, le BurO garde vos projets, quel que soit le métier.</p>
          </div>
          <Lien className="bouton" href="/charte" style={{ marginTop: 40, border: 0 }}>Lire la Charte AIME</Lien>
        </section>
      </main>
      <DockBas lieux={[['projets', 'Projets'], ['association', 'L’association']]} />
      <Pied />
      <BoutonBuro />
    </>
  );
}

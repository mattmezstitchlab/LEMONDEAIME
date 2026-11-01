import { Tete, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';
import CrossStitchHome, { type StitchEntry } from '../../studio/src/components/CrossStitchHome';
import OuvertureFleur from '../ouverture/OuvertureFleur';

// Présentation publique dédiée ; l'ancien accueil et les autres modules restent dans le dépôt.
export default function AccueilBroderie() {
  const ouvrir = (entree: StitchEntry) => {
    const choix = entree === 'library' ? '?ouvrir=ouvrages' : entree === 'create' ? '?ouvrir=composer' : '?ouvrir=reprendre';
    window.location.assign('/studio/atelier' + choix);
  };
  return <>
    <a className="lien-evitement" href="#contenu">Aller au contenu</a><Tete courant="/" />
    <main id="contenu">
      <OuvertureFleur />
      <section className="rubrique-publique" aria-labelledby="broderie-titre">
        <p className="surtitre">LE MONDE AIME · Broderie</p>
        <h1 id="broderie-titre" className="titre">Tout commence par un point.</h1>
        <p className="chapeau">Importer un motif, choisir ses fils, préparer son patron et broder à son rythme. Un atelier, un Disque et vos ouvrages.</p>
        <div className="rubrique-actions"><Lien className="bouton noir" href="/studio/atelier">Ouvrir l’atelier</Lien><Lien className="bouton" href="/studio/">Découvrir la broderie</Lien><Lien className="bouton" href="/buro">Mes ouvrages et projets partagés</Lien></div>
      </section>
      <CrossStitchHome integre projectName="Vos ouvrages" onOpen={ouvrir}
        onImport={() => window.location.assign('/studio/atelier?ouvrir=importer')}
        onOuvrages={() => ouvrir('library')}
        onVisite={() => window.location.assign('/studio/')} />
      <section id="demonstrations" className="rubrique-publique" aria-labelledby="films-titre">
        <p className="surtitre">Le point en mouvement</p><h2 id="films-titre" className="titre">Deux films à explorer</h2>
        <p className="chapeau">La Fleur du Ciel et UPTOWN montrent le rendu brodé et les outils du Disque. Ce sont des démonstrations, pas des patrons éditables.</p>
        <div className="rubrique-actions"><Lien className="bouton" href="/studio/fleur-du-ciel">La Fleur du Ciel</Lien><Lien className="bouton" href="/studio/uptown">UPTOWN</Lien></div>
      </section>
    </main><Pied />
  </>;
}

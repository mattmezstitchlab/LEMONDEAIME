import { Tete, Pied } from '../charte/Charte';
import CrossStitchHome, { type StitchEntry } from '../../studio/src/components/CrossStitchHome';
import { couleurChapitre } from '../../studio/src/components/couleursChapitres';
import './accueil-broderie.css';

// Grandes entrées en aplats ; commandes détaillées et films dans le header.
export default function AccueilBroderie() {
  const ouvrir = (entree: StitchEntry) => {
    const choix = entree === 'library' ? '?ouvrir=ouvrages' : entree === 'create' ? '?ouvrir=composer' : '?ouvrir=reprendre';
    window.location.assign('/studio/atelier' + choix);
  };
  return <>
    <a className="lien-evitement" href="#contenu">Aller au contenu</a><Tete courant="/" />
    <main id="contenu">
      <section className="entree-broderie" style={{backgroundColor:couleurChapitre(0).hex,color:couleurChapitre(0).texte}} aria-labelledby="broderie-titre">
        <p className="surtitre">LE MONDE AIME · Broderie</p>
        <h1 id="broderie-titre" className="titre">Tout commence par un point.</h1>
        <p className="chapeau">Importer un motif, choisir ses fils, préparer son patron et broder à son rythme. Un atelier, un Disque et vos ouvrages.</p>
      </section>
      {[
        {titre:'Créer et broder',texte:'Ouvrez le véritable atelier et retrouvez les outils du Disque.',href:'/studio/atelier',fil:1},
        {titre:'Importer un motif',texte:'Photo, PDF ou projet : choisissez votre fichier dans l’atelier.',href:'/studio/atelier?ouvrir=importer',fil:3},
        {titre:'Mes ouvrages',texte:'Retrouvez votre bibliothèque sur cet appareil. Le compte et les projets partagés restent dans Mon espace.',href:'/studio/atelier?ouvrir=ouvrages',fil:5},
      ].map(e=>{const f=couleurChapitre(e.fil);return <section key={e.href} className="entree-broderie" data-entree-dmc={f.code} style={{backgroundColor:f.hex,color:f.texte}}><a className="entree-broderie-lien" href={e.href}><p>DMC {f.code}</p><h2>{e.titre}</h2><p>{e.texte}</p><span aria-hidden="true">→</span></a></section>;})}
      <CrossStitchHome integre projectName="Vos ouvrages" onOpen={ouvrir}
        onImport={() => window.location.assign('/studio/atelier?ouvrir=importer')}
        onOuvrages={() => ouvrir('library')}
        onVisite={() => window.location.assign('/studio/?visite=1')} />
    </main><Pied />
  </>;
}

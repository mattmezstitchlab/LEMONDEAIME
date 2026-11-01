import { Tete, Pied } from '../charte/Charte';
import { Lien } from '../lib/router';

export function ProjetsAVenir() {
  return <>
    <a className="lien-evitement" href="#contenu">Aller au contenu</a><Tete courant="/projets-a-venir" />
    <main id="contenu" className="rubrique-publique">
      <p className="surtitre">LE MONDE AIME · En préparation</p>
      <h1 className="titre">Projets à venir</h1>
      <p className="chapeau">Une maison qui se construit, sans promettre ce qui n’est pas encore disponible.</p>
      <section aria-labelledby="avenir-titre"><h2 id="avenir-titre">Ce que vous pouvez découvrir aujourd’hui</h2>
        <p>La broderie dispose déjà d’un atelier. Mariage présente un univers d’exemple ; la création d’un espace personnel demande un compte. Les autres pistes ne sont pas annoncées comme des services ouverts et n’ont pas de date de lancement confirmée.</p>
        <div className="rubrique-actions"><Lien className="bouton noir" href="/studio/">Découvrir la Broderie</Lien><Lien className="bouton" href="/aime-wedding">Découvrir Mariage</Lien><Lien className="bouton" href="/projets">Voir les projets existants</Lien></div>
      </section>
    </main><Pied />
  </>;
}

export function Contact() {
  return <>
    <a className="lien-evitement" href="#contenu">Aller au contenu</a><Tete courant="/contact" />
    <main id="contenu" className="rubrique-publique">
      <p className="surtitre">LE MONDE AIME · Faire connaissance</p><h1 className="titre">Contact</h1>
      <p className="chapeau">Parlons de ce qui relie vos idées, vos projets et vos créations.</p>
      <section aria-labelledby="contact-titre"><h2 id="contact-titre">Un point de contact en préparation</h2>
        <p>Le formulaire public et l’adresse de contact officielle ne sont pas encore publiés ici. Aucun message n’est envoyé depuis cette page. Nous préférons le dire clairement plutôt que vous proposer un formulaire sans destinataire.</p>
        <p>En attendant, découvrez qui porte LE MONDE AIME et les projets déjà présentés.</p>
        <div className="rubrique-actions"><Lien className="bouton noir" href="/a-propos">À propos d’AIME</Lien><Lien className="bouton" href="/reseau/matthieu-lecointre">Rencontrer le fondateur</Lien><Lien className="bouton" href="/projets">Les projets existants</Lien></div>
      </section>
    </main><Pied />
  </>;
}

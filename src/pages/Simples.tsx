import { Tete, Verbe, BoutonBuro, Pied, Orbe } from '../charte/Charte';
import { Lien } from '../lib/router';

const PRINCIPES: [string, string][] = [
  ['Deux docks', 'En haut, blanc : les verbes, ce qu’on fait. En bas, sombre : les lieux, où l’on va.'],
  ['Des mots, pas des pictos', 'Seuls les signes universels restent : la loupe, le « + », le chevron du menu, fermer, retour.'],
  ['Aucun doublon', 'Chaque action n’apparaît qu’une fois. Le pied de page est la seule exception.'],
  ['Le mot le plus court', '« A+ » plutôt que « Pro », « + » plutôt que « Créer ».'],
  ['Une seule porte', 'Le « + » : « Entrer » avant, le Point Zéro après. Votre espace garde tout le reste.'],
  ['Des titres légers', 'Titres en 600. Le 900 est réservé à la signature de chaque page d’accueil.'],
  ['Au-delà du WCAG 2.2 AA', 'Contrastes, clavier, lecteurs d’écran, mouvement réduit : partout, dès le premier jour.'],
];
const VISIBILITES: [string, string][] = [['Privé', 'Vous seul·e'], ['Restreint', 'Les personnes invitées'], ['Par lien', 'Qui a le lien'], ['Public', 'Visible dans Le Monde AIME']];

export function Charte() {
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/charte" verbes={<><Verbe href="/monde">Découvrir</Verbe><Verbe href="/charte" actif>La Charte</Verbe></>} />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px' }}>
        <p className="surtitre">La Charte AIME</p>
        <h1 className="titre" style={{ fontSize: 'clamp(48px, 8vw, 128px)', lineHeight: .9 }}>La Charte</h1>
        <p className="chapeau">Un seul langage pour tous les studios et projets d’AIME : deux docks, une famille d’orbes, des mots plutôt que des pictos.</p>
        <ol style={{ listStyle: 'none', margin: '72px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '40px 32px', maxWidth: 1200 }}>
          {PRINCIPES.map(([t, d], i) => <li key={t} style={{ borderTop: '1px solid #0B0B0C', paddingTop: 18 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#55555A' }}>{String(i + 1).padStart(2, '0')}</p><h2 style={{ margin: '6px 0 10px', fontSize: 24, fontWeight: 600 }}>{t}</h2><p className="texte">{d}</p></li>)}
        </ol>
        <h2 className="titre" style={{ marginTop: 120, fontSize: 'clamp(30px, 4vw, 52px)' }}>Qui peut voir ?</h2>
        <ul style={{ listStyle: 'none', margin: '32px 0 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 12, maxWidth: 1000 }}>
          {VISIBILITES.map(([t, d]) => <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: '#fff', border: '1px solid #E2E2DE' }}><Orbe taille={26} /><span><b style={{ display: 'block', fontWeight: 600 }}>{t}</b><span style={{ fontSize: 15, color: '#3A3A3F' }}>{d}</span></span></li>)}
        </ul>
      </main>
      <Pied />
      <BoutonBuro />
    </>
  );
}

export function APlus() {
  return (
    <>
      <a className="lien-evitement" href="#contenu">Aller au contenu</a>
      <Tete courant="/a-plus" />
      <main id="contenu" style={{ padding: 'clamp(64px, 10vw, 140px) var(--marge) 140px', maxWidth: 900 }}>
        <p className="surtitre">Pour celles et ceux qui en font leur métier</p>
        <h1 className="titre" style={{ fontSize: 'clamp(64px, 13vw, 220px)', lineHeight: .84, textTransform: 'uppercase' }}>A+</h1>
        <p className="chapeau">Aller plus loin avec AIME : une vitrine, des devis, des factures, dans chaque studio. A+ ouvre bientôt ; en attendant, tout commence au Point Zéro.</p>
        <Lien className="bouton noir" href="/point-zero" style={{ marginTop: 32 }}>Commencer au Point Zéro</Lien>
      </main>
      <Pied />
      <BoutonBuro />
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
        <p className="chapeau"><Lien href="/">Revenir à l’accueil</Lien> ou <Lien href="/monde">découvrir Le Monde AIME</Lien>.</p>
      </main>
      <Pied />
    </>
  );
}

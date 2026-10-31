import { useEffect } from 'react';
import { useChemin } from './lib/router';
import Portfolio from './pages/Portfolio';
import AimeWedding from './pages/AimeWedding';
import Projet from './pages/Projet';
import Admin from './pages/Admin';
import APropos from './pages/APropos';
import PointZero from './pages/PointZero';
import Buro from './pages/Buro';
import Entrer from './pages/Entrer';
import Reseau from './pages/Reseau';
import FicheReseau from './pages/FicheReseau';
import Boutique from './pages/Boutique';
import Musique from './pages/Musique';
import { APlus, Introuvable } from './pages/Simples';
import { aller } from './lib/router';

const PAGES: Record<string, [() => React.JSX.Element, string]> = {
  '/': [Portfolio, 'LE MONDE AIME — les projets d’AIME'],
  '/projets': [Portfolio, 'LE MONDE AIME — les projets d’AIME'],
  '/aime-wedding': [AimeWedding, 'AIME Wedding — le site officiel de l’union'],
  '/admin': [Admin, 'LE MONDE AIME — Administration'],
  '/a-propos': [APropos, 'À propos d’AIME'],
  '/point-zero': [PointZero, 'LE MONDE AIME — Point Zéro'],
  '/buro': [Buro, 'LE MONDE AIME — Votre espace'],
  '/reseau': [Reseau, 'LE MONDE AIME — Prestataires et réseau'],
  '/entrer': [Entrer, 'LE MONDE AIME — Entrer'],
  '/a-plus': [APlus, 'LE MONDE AIME — A+'],
  '/boutique': [Boutique, 'LE MONDE AIME — Boutique'],
  '/musique': [Musique, 'LE MONDE AIME — La journée en musique'],
};
/* « Le Monde AIME » est la page des projets : /monde y mène (et non plus à la landing Broderie) */
const ANCIENNES: Record<string, string> = { '/charte': '/projets', '/monde': '/projets' };
/* l'accueil du site : Le Monde AIME, la page des projets (décision de Matt, 31/10/2026) */
export default function App() {
  const chemin = useChemin().replace(/\/+$/, '') || '/';
  useEffect(() => { if (ANCIENNES[chemin]) aller(ANCIENNES[chemin] + window.location.search + window.location.hash); }, [chemin]);
  const fiche = /^\/reseau\/([a-z0-9-]{1,60})$/.exec(chemin);
  const projet = /^\/projets\/([a-z0-9-]{1,60})$/.exec(chemin);
  const [Page, titre] = PAGES[ANCIENNES[chemin] || chemin] || [Introuvable, 'LE MONDE AIME — Page introuvable'];
  useEffect(() => { if (!fiche && !projet) document.title = titre; }, [titre, fiche, projet]);
  if (fiche) return <FicheReseau key={fiche[1]} cle={fiche[1]} />;
  if (projet) return <Projet key={projet[1]} slug={projet[1]} />;
  return <Page />;
}

import { useEffect } from 'react';
import { useChemin } from './lib/router';
import LeMondeAime from './pages/LeMondeAime';
import APropos from './pages/APropos';
import PointZero from './pages/PointZero';
import Buro from './pages/Buro';
import Entrer from './pages/Entrer';
import Reseau from './pages/Reseau';
import FicheReseau from './pages/FicheReseau';
import Boutique from './pages/Boutique';
import { APlus, Introuvable } from './pages/Simples';
import { aller } from './lib/router';

const PAGES: Record<string, [() => React.JSX.Element, string]> = {
  '/': [LeMondeAime, 'LE MONDE AIME — le site officiel de l’union'],
  '/a-propos': [APropos, 'À propos d’AIME'],
  '/point-zero': [PointZero, 'LE MONDE AIME — Point Zéro'],
  '/buro': [Buro, 'LE MONDE AIME — Votre espace'],
  '/reseau': [Reseau, 'LE MONDE AIME — Prestataires et réseau'],
  '/entrer': [Entrer, 'LE MONDE AIME — Entrer'],
  '/a-plus': [APlus, 'LE MONDE AIME — A+'],
  '/boutique': [Boutique, 'LE MONDE AIME — Boutique'],
};
/* anciennes adresses : elles mènent toutes à l'accueil LE MONDE AIME (rien ne casse pour qui les a gardées) */
const ANCIENNES: Record<string, string> = { '/charte': '/', '/monde': '/', '/aime-wedding': '/' };
export default function App() {
  const chemin = useChemin().replace(/\/+$/, '') || '/';
  useEffect(() => { if (ANCIENNES[chemin]) aller(ANCIENNES[chemin]); }, [chemin]);
  const fiche = /^\/reseau\/([a-z0-9-]{1,60})$/.exec(chemin);
  const [Page, titre] = PAGES[ANCIENNES[chemin] || chemin] || [Introuvable, 'LE MONDE AIME — Page introuvable'];
  useEffect(() => { if (!fiche) document.title = titre; }, [titre, fiche]);
  if (fiche) return <FicheReseau key={fiche[1]} cle={fiche[1]} />;
  return <Page />;
}

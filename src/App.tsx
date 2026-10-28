import { useEffect } from 'react';
import { useChemin } from './lib/router';
import Aime from './pages/Aime';
import Monde from './pages/Monde';
import PointZero from './pages/PointZero';
import Buro from './pages/Buro';
import Entrer from './pages/Entrer';
import Reseau from './pages/Reseau';
import FicheReseau from './pages/FicheReseau';
import { APlus, Introuvable } from './pages/Simples';
import { aller } from './lib/router';

const PAGES: Record<string, [() => React.JSX.Element, string]> = {
  '/': [Aime, 'AIME — Architecture Intelligente de la Mémoire Ensemble'],
  '/monde': [Monde, 'Le Monde AIME'],
  '/point-zero': [PointZero, 'AIME — Point Zéro'],
  '/buro': [Buro, 'AIME — Votre espace'],
  '/reseau': [Reseau, 'AIME — Réseau'],
  '/entrer': [Entrer, 'AIME — Entrer'],
  '/a-plus': [APlus, 'AIME — A+'],
};
export default function App() {
  const chemin = useChemin().replace(/\/+$/, '') || '/';
  /* l'ancienne page « La Charte » vit désormais sur l'accueil */
  useEffect(() => { if (chemin === '/charte') aller('/#docks'); }, [chemin]);
  const fiche = /^\/reseau\/([a-z0-9-]{1,60})$/.exec(chemin);
  const [Page, titre] = PAGES[chemin] || [Introuvable, 'AIME — Page introuvable'];
  useEffect(() => { if (!fiche) document.title = titre; }, [titre, fiche]);
  if (fiche) return <FicheReseau key={fiche[1]} cle={fiche[1]} />;
  return <Page />;
}

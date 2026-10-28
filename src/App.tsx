import { useEffect } from 'react';
import { useChemin } from './lib/router';
import Aime from './pages/Aime';
import Monde from './pages/Monde';
import PointZero from './pages/PointZero';
import Buro from './pages/Buro';
import Entrer from './pages/Entrer';
import { Charte, APlus, Introuvable } from './pages/Simples';

const PAGES: Record<string, [() => React.JSX.Element, string]> = {
  '/': [Aime, 'AIME — Point Zéro des vivants'],
  '/monde': [Monde, 'Le Monde AIME'],
  '/point-zero': [PointZero, 'AIME — Point Zéro'],
  '/buro': [Buro, 'AIME — BurO'],
  '/entrer': [Entrer, 'AIME — Entrer'],
  '/charte': [Charte, 'AIME — La Charte AIME'],
  '/a-plus': [APlus, 'AIME — A+'],
};
export default function App() {
  const chemin = useChemin().replace(/\/+$/, '') || '/';
  const [Page, titre] = PAGES[chemin] || [Introuvable, 'AIME — Page introuvable'];
  useEffect(() => { document.title = titre; }, [titre]);
  return <Page />;
}

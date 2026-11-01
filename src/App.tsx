import { lazy, Suspense, useEffect } from 'react';
import { useChemin, useRecherche } from './lib/router';
import Portfolio from './pages/Portfolio';
import Accueil from './pages/Accueil';
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
import Systaime from './pages/Systaime';
import System from './pages/System';
import { APlus, Introuvable } from './pages/Simples';
import { aller } from './lib/router';

/* Sous /projets, la réécriture existante suffit : aucune configuration de production. */
const Rosace = lazy(() => import('./pages/Rosace'));

const PAGES: Record<string, [() => React.JSX.Element, string]> = {
  '/': [Accueil, 'LE MONDE AIME — Tout commence ici'],
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
  '/system': [System, 'AIME SYSTEM — l’intelligence qui relie ce que vous créez'],
  '/systaime': [Systaime, 'SYST’AIME — la source de vérité de LE MONDE AIME'],
};
/* « Le Monde AIME » est la page des projets : /monde y mène (et non plus à la landing Broderie) */
const ANCIENNES: Record<string, string> = { '/charte': '/projets', '/monde': '/projets' };
/* Phase 01 (branche de dev) : « / » est la première page (Accueil) ; la page des projets reste à /projets. Cela remplace, sur cette branche seulement,
   la décision du 31/10/2026 « l'accueil = la page des projets » : à valider par Matt avant toute fusion. */
export default function App() {
  const chemin = useChemin().replace(/\/+$/, '') || '/';
  const recherche = useRecherche();
  useEffect(() => { if (ANCIENNES[chemin]) aller(ANCIENNES[chemin] + window.location.search + window.location.hash); }, [chemin]);
  const fiche = /^\/reseau\/([a-z0-9-]{1,60})$/.exec(chemin);
  const estRosace = chemin === '/projets/brode-way' && new URLSearchParams(recherche).get('experience') === 'rosace';
  const projet = estRosace ? null : /^\/projets\/([a-z0-9-]{1,60})$/.exec(chemin);
  const [Page, titre] = PAGES[ANCIENNES[chemin] || chemin] || [Introuvable, 'LE MONDE AIME — Page introuvable'];
  useEffect(() => { if (estRosace) document.title = 'ROSACE — Chaque fil dessine un monde'; else if (!fiche && !projet) document.title = titre; }, [titre, fiche, projet, estRosace]);
  if (estRosace) return <Suspense fallback={<p className="pf-attente" role="status">La rosace se prépare…</p>}><Rosace /></Suspense>;
  if (fiche) return <FicheReseau key={fiche[1]} cle={fiche[1]} />;
  if (projet) return <Projet key={projet[1]} slug={projet[1]} />;
  return <Page />;
}

import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./design/pointzero.css";
import { appliquerApercuAime } from "./design/aimeStudio";
import App from "./App";
import StorageRecoveryNotice from "./components/StorageRecoveryNotice";
import AccessibilityShell from "./components/AccessibilityShell";
import { SITE_BRODERIE, PROTOTYPES } from "./lib/site";
const EssaiImage = lazy(() => import("./essais/EssaiImage"));
const Bureau = lazy(() => import("./bureau/Bureau"));
const EssaiCarte = lazy(() => import("./essais/EssaiCarte"));
const EssaiAime = lazy(() => import("./essais/EssaiAime"));
const Galerie = lazy(() => import("./galerie/Galerie"));
const Tambour = lazy(() => import("./tambour/Tambour"));
const EssaiTraversee = lazy(() => import("./essais/EssaiTraversee"));
const PremiereRencontre = lazy(() => import("./one/PremiereRencontre"));
const Mosaique = lazy(() => import("./one/Mosaique"));
const DisqueUnivers = lazy(() => import("./one/DisqueUnivers"));
const Terminal = lazy(() => import("./one/Terminal"));
const FilmLumiere = lazy(() => import("./film/lumiere/Film"));
const VivreLumiere = lazy(() => import("./film/lumiere/Vivre"));
const PlanchesLumiere = lazy(() => import("./film/lumiere/Planches"));
const Explorer = lazy(() => import("./convergence/Explorer"));
const Accueil = lazy(() => import("./accueil/Accueil"));
const ClipBrode = lazy(() => import("./clip/ClipBrode"));
const ClipFleur = lazy(() => import("./clip/ClipBrode").then(m => ({ default: () => <m.default config={m.FLEUR} /> })));
import { GardeExperience, NavigationConvergence } from "./convergence/Navigation";

/* essai privé : le bloc Image, piloté par le même Point (aucune autre application) */
const essaiImage = /\/essai-image\/?$/.test(window.location.pathname);
/* le Bureau éditorial : réservé à l'administration (vérifiée par le serveur) */
const bureau = /\/bureau\/?$/.test(window.location.pathname);
/* essai privé : la carte vivante (indépendante du studio) */
const essaiCarte = /\/essai-carte\/?$/.test(window.location.pathname);
/* essai privé : le socle visuel AIME, Jour et Nuit */
const essaiAime = /\/essai-aime\/?$/.test(window.location.pathname);
/* la Galerie des Vivants : lisible sans compte */
const galerie = /\/galerie\/?$/.test(window.location.pathname);
/* essai privé : le Tambour vivant (Caméra → Broderie) */
const tambour = /\/tambour\/?$/.test(window.location.pathname);
/* essai privé (phase E, une scène) : le Point traverse la page */
/* .0NE (branche privée one-universel) : la Première rencontre et la mosaïque des univers */
const onePremiere = /\/one\/premiere-rencontre\/?$/.test(window.location.pathname);
const oneTerminal = /\/one\/terminal\/?$/.test(window.location.pathname);
/* la preuve isolée de l'Orbe relationnelle, sur le Disque Terminal (le Terminal validé reste à /one/terminal) */
const oneTerminalOrbe = /\/one\/terminal-orbe\/?$/.test(window.location.pathname);
const oneUnivers = /\/one(\/univers)?\/?$/.test(window.location.pathname);
/* l'ancienne mosaïque (présentations), gardée pour comparaison */
const oneMosaique = /\/one\/mosaique\/?$/.test(window.location.pathname);
/* LUMIERE : la première séquence expérimentale (branche privée lumiere-film) */
const filmLumiere = /\/one\/lumiere\/?$/.test(window.location.pathname);
const vivreLumiere = /\/one\/lumiere\/vivre\/?$/.test(window.location.pathname);
/* LUMIERE : les planches de référence de la préproduction (privé) */
const planchesLumiere = /\/one\/lumiere\/planches\/?$/.test(window.location.pathname);
/* la convergence : une page pour tout ouvrir */
const explorer = /\/explorer\/?$/.test(window.location.pathname);
/* l'accueil de choix AIME : le Disque (.0NE) ou le Cube (ATLAS) */
const accueil = /\/accueil\/?$/.test(window.location.pathname);
const essaiTraversee = /\/essai-traversee\/?$/.test(window.location.pathname);
/* UPTOWN brodé : le clip de Saint-Luc dans le Disque de broderie, la démonstration des outils de Point Zéro (public) */
const clipBrode = /\/uptown\/?$/.test(window.location.pathname);
/* « La Fleur du Ciel » brodée : la fleur se brode pendant le morceau et éclôt à l'impact (public, accord de Matt) */
const clipFleur = /\/fleur-du-ciel\/?$/.test(window.location.pathname);

appliquerApercuAime();
/* le site Point Zéro (broderie seule) : seules la landing, l'atelier et le Tambour vivant existent ; toute autre adresse ramène à l'accueil */
const horsBroderie = !/^\/(atelier|tambour)?\/?$/.test(window.location.pathname.slice(import.meta.env.BASE_URL.length - 1));
const quitterBroderie = SITE_BRODERIE && horsBroderie;
if (quitterBroderie) window.location.replace(import.meta.env.BASE_URL);
/* lemondeaime.com (sans VITE_PROTOTYPES) : le film LUMIERE, la Galerie, Explorer, les essais et l'accueil du Disque et du Cube ne sont pas publics ;
   leur adresse ramène à .0NE (le Bureau éditorial reste, réservé à l'administration côté serveur) */
const prive = accueil || explorer || essaiCarte || essaiAime || galerie || filmLumiere || vivreLumiere || planchesLumiere || essaiTraversee || essaiImage;
const quitterPrive = !PROTOTYPES && !SITE_BRODERIE && prive;
if (quitterPrive) window.location.replace(import.meta.env.BASE_URL + "one/univers");
/* le titre de l'onglet dit où l'on est (sinon, celui de la landing Broderie s'affichait partout) ; une page qui connaît mieux son titre le remplace */
const TITRES: [boolean, string][] = [[explorer, "Explorer les prototypes — AIME"], [bureau, "Le Bureau — AIME"], [onePremiere, "Première rencontre — .0NE"],
  [oneTerminalOrbe, "Disque Terminal, l’orbe relationnelle — .0NE"], [oneTerminal, "Disque Terminal — .0NE"], [oneMosaique, "Tous les univers — .0NE"],
  [planchesLumiere, "LUMIERE — les planches"], [clipBrode, "UPTOWN brodé — Point Zéro"], [clipFleur, "La Fleur du Ciel — brodée"], [essaiCarte, "Essai · la carte vivante"], [essaiTraversee, "Essai · la traversée du Point"]];
const titre = TITRES.find(([v]) => v)?.[1]; if (titre) document.title = titre;

/* une adresse qui n'existe pas sur ce site : rien n'est affiché (pas même un instant), on part */
if (!quitterBroderie && !quitterPrive) createRoot(document.getElementById("root")!).render(
  <StrictMode><GardeExperience>
    {clipFleur ? <AccessibilityShell><Suspense fallback={null}><ClipFleur /></Suspense></AccessibilityShell>
      : clipBrode ? <AccessibilityShell><Suspense fallback={null}><ClipBrode /></Suspense></AccessibilityShell>
      : accueil ? <AccessibilityShell><Suspense fallback={null}><Accueil /></Suspense></AccessibilityShell>
      : explorer ? <Suspense fallback={null}><Explorer /></Suspense>
      : bureau ? <Suspense fallback={null}><Bureau /></Suspense>
      : essaiCarte ? <Suspense fallback={null}><EssaiCarte /></Suspense>
      : essaiAime ? <Suspense fallback={null}><EssaiAime /></Suspense>
      : galerie ? <Suspense fallback={null}><Galerie /></Suspense>
      : tambour ? <AccessibilityShell><Suspense fallback={null}><Tambour /></Suspense></AccessibilityShell>
      : vivreLumiere ? <AccessibilityShell><Suspense fallback={null}><VivreLumiere /></Suspense></AccessibilityShell>
      : planchesLumiere ? <Suspense fallback={null}><PlanchesLumiere /></Suspense>
      : filmLumiere ? <AccessibilityShell><Suspense fallback={null}><FilmLumiere /></Suspense></AccessibilityShell>
      : onePremiere ? <AccessibilityShell><Suspense fallback={null}><PremiereRencontre /></Suspense></AccessibilityShell>
      : oneTerminalOrbe ? <AccessibilityShell><Suspense fallback={null}><Terminal relation /></Suspense></AccessibilityShell>
      : oneTerminal ? <AccessibilityShell><Suspense fallback={null}><Terminal /></Suspense></AccessibilityShell>
      : oneUnivers ? <AccessibilityShell><Suspense fallback={null}><DisqueUnivers /></Suspense></AccessibilityShell>
      : oneMosaique ? <AccessibilityShell><Suspense fallback={null}><Mosaique /></Suspense></AccessibilityShell>
      : essaiTraversee ? <AccessibilityShell><Suspense fallback={null}><EssaiTraversee /></Suspense></AccessibilityShell>
      : essaiImage ? <AccessibilityShell><Suspense fallback={null}><EssaiImage /></Suspense></AccessibilityShell>
      : <AccessibilityShell><StorageRecoveryNotice/><App /></AccessibilityShell>}
  </GardeExperience>{!SITE_BRODERIE && !filmLumiere && !vivreLumiere && !planchesLumiere && !oneUnivers && !accueil && !clipBrode && !clipFleur && <NavigationConvergence />}</StrictMode>
);

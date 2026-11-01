import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LePoint from "./LePoint";
import PanneauConfort from "./PanneauConfort";
import { hotePortail, type ModePoint } from "../../lib/point/modes";
import { applyPrefs, readPrefs } from "../../lib/accessibilityCore";

/** L'événement qui ouvre Confort de n'importe où (lien d'évitement, raccourci d'un autre studio). */
export const OUVRIR_CONFORT = "pz:point:confort";
export const ouvrirConfort = () => window.dispatchEvent(new CustomEvent(OUVRIR_CONFORT));

/* le pictogramme de Confort, dessiné ici : le Point n'emporte aucune bibliothèque d'icônes */
const ICONE_CONFORT = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <circle cx="12" cy="4.5" r="1.8" /><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3.5 6M12 14.5l3.5 6" /></svg>;

/**
 * Le Point d'un contexte : le même composant partout. Il apporte toujours Confort (le réglage d'accès, premier)
 * et ajoute les modes que le contexte déclare (Loupe et Broderie dans l'atelier ; Guide et Espace dans le compositeur…).
 * Un seul Point est à l'écran à la fois : le contexte qui a la main le rend, les autres le taisent.
 * Le Point ne crée rien et ne déplace pas : la création reste dans FAIRE, la navigation dans ALLER.
 */
export default function Point({ cheminInitial, contexte, modes, part, teinte, etiquette, refBouton, guide, ancrage, memoire, scene, centre, tambour }: {
  /** ouvrir sur ce chemin de familles : voir LePoint */
  cheminInitial?: string[];
  /** l'anneau autour d'un tambour (présentation scène) : voir LePoint */
  tambour?: { rayon: number; cote: number; parPage: number };
  /** le raccourci du centre (mode Tambour) : voir LePoint */
  centre?: Parameters<typeof LePoint>[0]["centre"];
  /** le disque posé dans une page (landing), toujours ouvert : voir LePoint */
  scene?: boolean;
  /** retenir les habitudes (Favoris) sous cette clé, sur l'appareil */
  memoire?: string;
  ancrage?: "dessus" | "autour";
  /** le nom du contexte (« broderie », « compositeur ») : pour les tests et la lecture du code */
  contexte: string;
  modes: ModePoint[];
  part?: number; teinte?: string; etiquette?: string; guide?: string;
  refBouton?: { current: HTMLButtonElement | null };
}) {
  const [confort, setConfort] = useState(false);
  const [annonce, setAnnonce] = useState("");
  const bouton = useRef<HTMLButtonElement | null>(null);
  const hote = useRef<HTMLSpanElement | null>(null);
  const ref = refBouton ?? bouton;
  /* les réglages de Confort s'appliquent dès que le Point est là, même dans un projet sans « coquille » d'accessibilité */
  useEffect(() => {
    applyPrefs(readPrefs());
    const appliquer = (e: Event) => { const d = (e as CustomEvent).detail; if (d) applyPrefs(d); };
    window.addEventListener("pz:accessibility", appliquer);
    return () => window.removeEventListener("pz:accessibility", appliquer);
  }, []);
  useEffect(() => {
    const ouvrir = () => setConfort(true);
    window.addEventListener(OUVRIR_CONFORT, ouvrir);
    return () => window.removeEventListener(OUVRIR_CONFORT, ouvrir);
  }, []);
  const fermer = () => { setConfort(false); requestAnimationFrame(() => {
    /* En scène il n’y a pas de bouton central : rendre le focus au secteur Confort. */
    (ref.current ?? (scene ? hote.current?.querySelector<HTMLButtonElement>('[data-mode="confort"]') : null))?.focus();
  }); };
  const tous: ModePoint[] = [
    { id: "confort", nom: "Confort", aide: "taille du texte, contraste, thème, mouvement", groupe: "acces", icone: ICONE_CONFORT, actif: confort, ouvrir: () => setConfort(v => !v) },
    /* ouvrir un autre mode referme Confort : un seul panneau à la fois */
    ...modes.map(m => ({ ...m, ouvrir: () => { setConfort(false); m.ouvrir(); } })),
  ];
  return <span ref={hote} className="lp-contexte" data-contexte={contexte}>
    <LePoint cheminInitial={cheminInitial} modes={tous} tambour={tambour} centre={centre && { ...centre, ouvrir: () => { setConfort(false); centre.ouvrir(); } }} scene={scene} memoire={memoire} ancrage={ancrage} part={part} teinte={teinte} etiquette={etiquette} guide={guide} refBouton={ref} annonceExterne={annonce} />
    {confort && createPortal(<PanneauConfort onFermer={fermer} onAnnonce={setAnnonce} />, hotePortail(ref.current))}
  </span>;
}

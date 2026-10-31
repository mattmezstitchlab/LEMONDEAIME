/**
 * La navigation de retour permanente : un petit Point nacré, toujours au même endroit (en bas à droite ; à gauche si le Point de la personne est à droite).
 * Il ouvre : .0NE, les réglages de confort et « Revenir » (sur les aperçus privés, aussi Explorer et le film). Clavier : Échap referme.
 * Et la garde : si une expérience échoue (erreur, module introuvable), elle propose de revenir à .0NE — jamais d'écran vide.
 */
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { lireRetour } from "../lib/one/contextes";
import { ATLAS_URL } from "../lib/destinations";
import { PROTOTYPES } from "../lib/site";
import "./convergence.css";

const S = import.meta.env.BASE_URL;
/* sur lemondeaime.com : ce qui est public (.0NE et les préférences) ; les aperçus privés ajoutent les prototypes */
const liens = (base: string) => PROTOTYPES ? [
  { nom: "Accueil AIME — le Disque ou le Cube", chemin: base + "accueil" },
  { nom: ".0NE — tous les univers", chemin: base + "one/univers" },
  { nom: "Explorer les prototypes", chemin: base + "explorer" },
  { nom: "Le film LUMIERE", chemin: base + "one/lumiere" },
  { nom: "Mes préférences", chemin: base + "one/premiere-rencontre?modifier" },
  { nom: "ATLAS (site séparé) ↗", chemin: ATLAS_URL },
] : [
  { nom: "Le Monde AIME — les projets", chemin: "/" },
  { nom: "L’atelier de broderie", chemin: base },
  { nom: ".0NE — tous les univers", chemin: base + "one/univers" },
  { nom: "Mes préférences", chemin: base + "one/premiere-rencontre?modifier" },
];

/** `base` : l'adresse du studio (.0NE) ; le site AIME, servi à la racine, passe "/studio/". */
export function NavigationConvergence({ base = S }: { base?: string } = {}) {
  const LIENS = liens(base);
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null), panneau = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOuvert(false); bouton.current?.focus(); } };
    const dehors = (e: PointerEvent) => { if (!panneau.current?.contains(e.target as Node) && e.target !== bouton.current) setOuvert(false); };
    window.addEventListener("keydown", k, true); window.addEventListener("pointerdown", dehors);
    requestAnimationFrame(() => panneau.current?.querySelector("a")?.focus());
    return () => { window.removeEventListener("keydown", k, true); window.removeEventListener("pointerdown", dehors); };
  }, [ouvert]);
  const ici = window.location.pathname.replace(/\/+$/, "");
  /* venu du Disque (Broder, Ouvrir…) : le retour au contexte exact, en un geste */
  const retour = /\/one(\/univers)?$/.test(ici) ? null : lireRetour();
  return <nav className="cv-nav" aria-label={PROTOTYPES ? "Navigation de la version candidate" : "Navigation"}>
    {retour && !ouvert && <a className="cv-retour" href={retour.adresse}><span className="cv-orbe" aria-hidden="true" />Revenir à .0NE · {retour.nom}</a>}
    {ouvert && <div className="cv-nav-panneau" ref={panneau} id="cv-nav-panneau">
      {LIENS.map(l => <a key={l.chemin} href={l.chemin} aria-current={ici === l.chemin.replace(/\/+$/, "") ? "page" : undefined}>{l.nom}</a>)}
      {history.length > 1 && <button type="button" onClick={() => history.back()}>Revenir à la page précédente</button>}
    </div>}
    <button ref={bouton} type="button" className="cv-nav-bouton" aria-expanded={ouvert} aria-controls="cv-nav-panneau" onClick={() => setOuvert(v => !v)}>
      <span className="cv-orbe" aria-hidden="true" /><span className="cv-nav-texte">{ouvert ? "Fermer" : "Naviguer"}</span>
    </button>
  </nav>;
}

export class GardeExperience extends Component<{ children: ReactNode; nom?: string }, { erreur: string | null }> {
  state = { erreur: null as string | null };
  static getDerivedStateFromError(e: unknown) { return { erreur: e instanceof Error ? e.message : String(e) }; }
  componentDidCatch(e: unknown) { console.error("[convergence] expérience interrompue :", e); }
  render() {
    if (!this.state.erreur) return this.props.children;
    return <main className="cv-erreur" data-aime="jour" role="alert">
      <span className="cv-orbe cv-orbe-grand" aria-hidden="true" />
      <h1>Cette expérience s’est interrompue.</h1>
      <p>{this.props.nom ? `« ${this.props.nom} » ` : "Cette page "}n’a pas pu s’afficher sur cet appareil. Rien n’a été perdu : vos réglages restent sur cet appareil.</p>
      <div className="cv-actions">
        {PROTOTYPES ? <><a className="cv-bouton cv-plein" href={S + "accueil"}>Revenir à l’accueil AIME</a>
          <a className="cv-bouton" href={S + "explorer"}>Explorer les prototypes</a></>
          : <><a className="cv-bouton cv-plein" href={S + "one/univers"}>Revenir à .0NE</a>
          <a className="cv-bouton" href="/">Le Monde AIME</a></>}
        <button type="button" className="cv-bouton" onClick={() => location.reload()}>Réessayer</button>
      </div>
      <details><summary>Détail technique</summary><code>{this.state.erreur}</code></details>
    </main>;
  }
}

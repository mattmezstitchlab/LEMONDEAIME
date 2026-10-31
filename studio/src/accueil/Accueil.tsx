/**
 * L'accueil de choix AIME — après le film et la Première rencontre : deux objets, deux vraies destinations.
 *   Le Disque → le système .0NE (dans ce site).   Le Cube → le véritable ATLAS (application séparée, nouvel onglet).
 * Direction : la maquette « Voir l'invisible » (fond clair, nacre, grandes respirations). Le Cube est ici une
 * représentation légère en CSS : son vrai moteur 3D vit dans ATLAS, il n'est pas recopié.
 */
import { useEffect, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import "../design/aime.css";
import "./accueil.css";
import { DESTINATIONS } from "../lib/destinations";
import { appliquerOne, ecrireOne, lireOne, themeOne } from "../lib/one/preferences";

type ChoixTheme = "light" | "dark" | "system";
const THEMES: [ChoixTheme, string][] = [["system", "Auto"], ["light", "Jour"], ["dark", "Nuit"]];

function Cube() {
  const face = (nom: string) => <div className={"ac-face ac-face-" + nom}>{Array.from({ length: 16 }, (_, i) => <span key={i} className={"ac-tuile ac-t" + ((i * 7 + nom.length) % 5)} />)}</div>;
  return <div className="ac-cube-scene" aria-hidden="true"><div className="ac-cube">{face("avant")}{face("droite")}{face("dessus")}</div></div>;
}
function Disque() {
  return <div className="ac-disque-scene" aria-hidden="true"><div className="ac-disque"><span className="ac-anneau ac-a1" /><span className="ac-anneau ac-a2" /><span className="ac-anneau ac-a3" /></div><span className="ac-orbe" /></div>;
}

export default function Accueil() {
  const [p, setP] = useState(lireOne);
  const theme = themeOne(p), choix: ChoixTheme = p.themeChoisi || p.affichage.theme !== "system" ? p.affichage.theme as ChoixTheme : "light";
  useEffect(() => { document.title = "AIME — Voir l’invisible"; appliquerOne(p); }, [p]);
  const choisir = (v: ChoixTheme) => { const s = { ...p, themeChoisi: true, affichage: { ...p.affichage, theme: v } }; ecrireOne(s); setP(s); };
  const prenom = p.identite.prenom.trim();

  return <div className="ac" data-aime={theme}>
    <header className="ac-tete">
      <a className="ac-marque" href={DESTINATIONS.accueil} aria-label="AIME, accueil"><span className="ac-marque-orbe" aria-hidden="true" />AIME</a>
      <nav className="ac-nav" aria-label="Destinations">
        <a href={DESTINATIONS.one}>.0NE</a>
        <a href={DESTINATIONS.atlas} target="_blank" rel="noopener">ATLAS<ArrowUpRight aria-hidden="true" /><span className="sr-only"> (site séparé, nouvel onglet)</span></a>
        <a href={DESTINATIONS.film}>Le film</a>
        <a href={DESTINATIONS.explorer}>Tous les accès</a>
      </nav>
      <div className="ac-theme" role="group" aria-label="Thème">{THEMES.map(([v, nom]) => <button key={v} type="button" aria-pressed={choix === v} onClick={() => choisir(v)}>{nom}</button>)}</div>
    </header>

    <main className="ac-scene">
      <div className="ac-intro">
        <p className="ac-sur">AIME{prenom ? ` · Bienvenue, ${prenom}` : ""}</p>
        <h1 className="ac-titre">Voir l’invisible.</h1>
        <p className="ac-chapo">Un carré pour rassembler, un cercle pour agir. Choisissez par où entrer.</p>
      </div>

      <ul className="ac-portes">
        <li><a className="ac-porte" href={DESTINATIONS.one}>
          <Disque />
          <span className="ac-porte-texte">
            <span className="ac-porte-sur">Le cercle</span>
            <span className="ac-porte-nom">.0NE</span>
            <span className="ac-porte-phrase">Le Disque : choisir, agir, transformer. Vos univers au centre.</span>
            <span className="ac-bouton ac-bouton-plein">Entrer dans .0NE<ArrowRight aria-hidden="true" /></span>
          </span>
        </a></li>
        <li><a className="ac-porte" href={DESTINATIONS.atlas} target="_blank" rel="noopener">
          <Cube />
          <span className="ac-porte-texte">
            <span className="ac-porte-sur">Le carré</span>
            <span className="ac-porte-nom">ATLAS</span>
            <span className="ac-porte-phrase">La grille : les fragments, les œuvres et les recherches, et leur histoire.</span>
            <span className="ac-bouton">Ouvrir ATLAS<ArrowUpRight aria-hidden="true" /></span>
            <span className="ac-porte-note">Site séparé · s’ouvre dans un nouvel onglet</span>
          </span>
        </a></li>
      </ul>
    </main>

    <footer className="ac-pied">
      <p>{p.rencontre.terminee ? "Vos préférences sont enregistrées sur cet appareil." : "Vous n’avez pas encore réglé l’interface pour vous."}</p>
      <a href={DESTINATIONS.reglages}>{p.rencontre.terminee ? "Modifier mes préférences" : "Faire la Première rencontre"}</a>
    </footer>
  </div>;
}

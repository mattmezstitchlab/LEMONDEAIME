import { type ChangeEvent } from "react";
import UneFlorale from "./UneFlorale";
import TraineePoints from "./TraineePoints";
import "../design/aime.css";
import "./CrossStitchHome.css";
import { SITE_BRODERIE } from "../lib/site";
import UsagesDisque, { USAGES_DISQUE } from "./UsagesDisque";

export type StitchEntry = "create" | "library" | "prepare" | "stitch";
interface Props {
  projectName: string;
  onOpen: (entry: StitchEntry) => void;
  onImport: (file: File) => void;
  onShare?: () => void;
  /** Mes ouvrages : l'atelier, le bloc des ouvrages ouvert dans le dock. À défaut, onOpen("library"). */
  onOuvrages?: () => void;
  /** ouvrir l'atelier avec la visite du Point */
  onVisite?: () => void;
}

/** Sélecteur de fichier : transmet le fichier une seule fois et permet de le choisir à nouveau. */
function pick(onImport: (file: File) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImport(file);
  };
}

export const CHAPITRES = USAGES_DISQUE;

/* Tout le studio, en une liste : le nom, puis une ligne. */
const TOUT: [string, string][] = [
  ["Tous les points", "Croix, demi-point, quart, trois quarts, petite croix, point arrière, point lancé, nœud, perle."],
  ["Les outils", "Main, gomme, remplir, pipette, sélection, lasso, déplacer, ligne, rectangle, ellipse, symétrie."],
  ["Composer", "Motifs à glisser, calques, sujets déplaçables, lettres en croix, redimensionner, nettoyer."],
  ["Importer", "Photo convertie en fils DMC, puzzle PDF recomposé, projets JSON et OXS, glisser-déposer."],
  ["Les fils", "489 références DMC, recherche en français, fils mélangés, perles Miyuki Delica, remplacer au plus proche."],
  ["Le stock", "Votre stock de fils, les fils manquants, la liste de courses, les quantités estimées."],
  ["Broder", "Marquer case, bloc ou ligne ; parking des fils, notes, cases à défaire, journal des séances."],
  ["Se repérer", "Le cercle de progression, la timeline fil par fil, la loupe, symboles, tout voir."],
  ["Partager", "Inviter à regarder en direct, visibilité, PDF paginé, SVG, PNG, JSON."],
  ["Garder", SITE_BRODERIE ? "Sauvegarde automatique sur cet appareil, Mes ouvrages, le fichier du projet à télécharger, hors ligne." : "Sauvegarde automatique, bibliothèque de l’atelier, compte AIME (connexion nécessaire), hors ligne."],
  ["Confort", "Débutante, confirmée, experte ; contraste élevé, texte plus grand, stylet, clavier, lecteur d’écran."],
  ["Le Point", "La visite guidée de bout en bout, au clavier, qui imite le geste de chaque point."],
];

/** Un écran d'accueil seulement : l'ouvrir ne crée aucun patron et ne réécrit aucun projet. */
export default function CrossStitchHome({ projectName, onOpen, onImport, onShare, onOuvrages, onVisite }: Props) {
  const enter = () => (onOuvrages ? onOuvrages() : onOpen("library"));
  const visite = () => (onVisite ? onVisite() : onOpen("create"));


  const go = (id: string) => (event: { preventDefault: () => void }) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    if (el instanceof HTMLButtonElement) el.click();
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history?.replaceState?.(null, "", window.location.pathname + window.location.search);
    (el.querySelector<HTMLElement>("h2") ?? el).focus?.({ preventScroll: true });
  };

  return <div className="cross-stitch-home">
    <a className="csh-skip" href="#csh-main">Aller au contenu</a>
    <TraineePoints />

    <section className="csh-actions-contextuelles" aria-label="Actions de la présentation Broderie">
      <button type="button" onClick={enter}>Mes ouvrages de broderie</button>
      <button type="button" onClick={() => onOpen("stitch")}>Ouvrir l’atelier</button>
      <button type="button" onClick={visite}>Faire la visite avec Le Point</button>
    </section>

    <main id="csh-main">
      <UneFlorale titre="Point Zéro">
        <p className="mm-sous">Du tableau à la dernière croix.</p>
        <ol className="mm-sommaire">{CHAPITRES.map(c => <li key={c.id}><a href={"#" + c.id} onClick={go(c.id)}>{c.titre}</a><span>{c.num}</span></li>)}</ol>
        <div className="mm-actions">
          <button className="pzh-btn pzh-btn-clair" onClick={() => onOpen("create")}>Créer mon patron</button>
          <button className="pzh-btn mm-btn-point" onClick={visite}><span className="pzh-dot" aria-hidden="true" />Faire la visite avec Le Point</button>
        </div>
      </UneFlorale>

      <div id="chapitres"><UsagesDisque onOpen={onOpen} onImport={onImport} onOuvrages={enter} onVisite={visite} /></div>

      <section className="pzh-section tout" id="tout" aria-labelledby="tout-titre">
        <div className="tout-tete">
          <p className="pzh-kicker">Tout ce que fait le studio</p>
          <h2 id="tout-titre" tabIndex={-1}>Tout le studio</h2>
        </div>
        <dl className="tout-liste">{TOUT.map(([nom, ligne]) => <div key={nom}><dt>{nom}</dt><dd>{ligne}</dd></div>)}</dl>
        <p className="pzh-fine">Bientôt : les SAL à plusieurs, et les commentaires posés sur la grille.</p>
      </section>

      <section className="pzh-section" id="csh-import" aria-labelledby="csh-import-title">
        <div className="pzh-intro">
          <div>
            <p className="pzh-kicker">Partez de ce que vous aimez</p>
            <h2 id="csh-import-title" tabIndex={-1}>Importer</h2>
          </div>
          <p>Une photo, un patron, un projet à retrouver.</p>
        </div>
        <div className="pzh-import">
          <div className="pzh-ways">
            <label className="pzh-way">
              <span><strong>Une photo</strong><span>Convertie en couleurs DMC, puis ajustée avant de broder.</span></span>
              <span aria-hidden="true">→</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Importer une photo pour la convertir en patron" onChange={pick(onImport)}/>
            </label>
            <label className="pzh-way">
              <span><strong>Le puzzle PDF</strong><span>Un patron en plusieurs pages : recomposez les pages sur le plateau magnétique, contrôlez les raccords et les symboles.</span></span>
              <span aria-hidden="true">→</span>
              <input type="file" accept=".pdf,application/pdf" aria-label="Importer un patron PDF multipage" onChange={pick(onImport)}/>
            </label>
            <label className="pzh-way">
              <span><strong>Un projet existant</strong><span>Rouvrez une sauvegarde JSON ou un fichier OXS.</span></span>
              <span aria-hidden="true">→</span>
              <input type="file" accept=".json,.oxs,application/json" aria-label="Ouvrir un projet JSON ou OXS" onChange={pick(onImport)}/>
            </label>
          </div>
          <label className="pzh-drop">
            <span className="pzh-drop-plus" aria-hidden="true">+</span>
            <strong>Choisir mon fichier</strong>
            <span>PNG, JPEG, WebP, PDF, JSON ou OXS</span>
            <input type="file" aria-label="Importer une image, un PDF ou un projet" accept="image/png,image/jpeg,image/webp,.pdf,.json,.oxs" onChange={pick(onImport)}/>
          </label>
        </div>
        <p className="pzh-fine">Vérifiez les détails et les couleurs avant de broder. L’import PDF dépend du document ; un calage peut être nécessaire. Respectez les droits de l’auteur.</p>
      </section>

      <section className="pzh-section" id="commencer" aria-labelledby="pzh-resume-title">
        <div className="pzh-resume">
          <div>
            <p className="pzh-kicker">Projet actif sur cet appareil</p>
            <h2 id="pzh-resume-title" tabIndex={-1}>{projectName}</h2>
            <p>Reprenez là où vous vous êtes arrêtée, ou invitez quelqu’un à suivre votre ouvrage en lecture.</p>
          </div>
          <div className="pzh-actions">
            <button className="pzh-btn pzh-btn-primary" onClick={() => onOpen("stitch")}>Continuer à broder</button>
            <button className="pzh-btn pzh-btn-secondary" onClick={() => onOpen("library")}>Mes ouvrages</button>
            {onShare && <button className="pzh-btn pzh-btn-secondary" onClick={onShare}>Inviter à regarder</button>}
          </div>
        </div>
        <aside className="pzh-safety" aria-labelledby="csh-safety-title">
          <h3 id="csh-safety-title">Votre ouvrage mérite une vraie sauvegarde.</h3>
          <p>Le stockage du navigateur n’est pas une sauvegarde permanente : son effacement supprime les projets locaux. Dans le studio, téléchargez régulièrement votre projet JSON depuis Exporter. Les couleurs à l’écran sont indicatives et les quantités de fil estimées.</p>
        </aside>
      </section>
    </main>

    <footer className="pzh-foot">
      <p className="pzh-foot-brand"><span className="pzh-x" aria-hidden="true">×</span> Point Zéro</p>
      <nav aria-label="Plan du site Point Zéro" className="pzh-foot-cols">
        <div>
          <h2>Studio</h2>
          <ul>
            <li><button type="button" onClick={() => onOpen("create")}>Créer un patron</button></li>
            <li><button type="button" onClick={() => onOpen("prepare")}>Préparer</button></li>
            <li><button type="button" onClick={() => onOpen("stitch")}>Broder</button></li>
            <li><button type="button" onClick={() => onOpen("library")}>Mes ouvrages</button></li>
          </ul>
        </div>
        <div>
          <h2>Découvrir</h2>
          <ul>
            {CHAPITRES.map(c => <li key={c.id}><a href={"#" + c.id} onClick={go(c.id)}>{c.num}. {c.titre}</a></li>)}
            <li><a href="#tout" onClick={go("tout")}>Tout le studio</a></li>
          </ul>
        </div>
        <div>
          <h2>Aide</h2>
          <ul>
            <li><button type="button" onClick={visite}>Faire la visite avec Le Point</button></li>
            <li><a href="#csh-import" onClick={go("csh-import")}>Importer un patron</a></li>
            <li><a href="#commencer" onClick={go("commencer")}>Sauvegarder mon ouvrage</a></li>
          </ul>
        </div>
      </nav>
      <div className="pzh-dots" aria-hidden="true" />
      <p className="pzh-foot-line">Un studio AIME<sup>®</sup> · Point de croix</p>
    </footer>


  </div>;
}

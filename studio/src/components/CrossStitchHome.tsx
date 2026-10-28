import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import StudioDemo from "./StudioDemo";
import TopDock from "./TopDock";
import { ETAPES } from "./OrbeGuide";
import { BASE_FLOSS } from "../lib/dmc";
import { MOTIF_PRESETS } from "../lib/motifPresets";
import "./CrossStitchHome.css";

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

const SECTIONS = [["docks", "Les docks"], ["le-point", "Le Point"], ["fonctionnalites", "Fonctionnalités"], ["commencer", "Commencer"]] as const;
type SectionId = typeof SECTIONS[number][0];

/* Les deux docks, pièce par pièce : ce que l'on voit, ce que cela fait */
const HAUT: [string, string][] = [
  ["L’orbe", "Le menu : l’accueil, les réglages, et l’affichage débutante, confirmée ou experte."],
  ["Dessiner", "Six outils sous la main ; « Tous les points » déplie la grille complète, qui se replie au choix."],
  ["Broder", "Marquer, bloc 10 × 10, ligne ; la grille déplie parking, note, à défaire et le suivi."],
  ["Fils", "Le nuancier DMC se déplie dans le dock, cherché en français ; puis les fils et la toile."],
  ["Partager", "Inviter à regarder, la visibilité, exporter, enregistrer."],
  ["Annuler · Rétablir", "Chaque geste se reprend."],
  ["Chercher", "Un fil, un outil, une fonction : on tape, on choisit."],
  ["Mes ouvrages", "Tous les ouvrages, rangés dans le dock : rouvrir, déposer un fichier, inviter."],
];
const BAS: [string, string][] = [
  ["Le cercle", "L’anneau suit l’avancement ; un clic change le dock."],
  ["L’ouvrage", "Son nom et sa visibilité, toujours sous les yeux."],
  ["Réaliste · À plat · Patron", "Trois lectures de la même grille."],
  ["Symboles", "Par-dessus les couleurs, comme sur un patron papier."],
  ["Loupe · − · +", "La loupe déplie un dock : la grille agrandie sous le pointeur ; − et + règlent le zoom."],
  ["Tout voir", "Le patron entier revient à l’écran."],
];
const MODES: [string, string][] = [
  ["Repères", "Les lectures, les symboles, le zoom."],
  ["Fils", "Les pastilles DMC du motif, avec le stock : projet, utilisés, en stock, manquants."],
  ["Progression", "La timeline du patron, fil par fil, du plus présent au plus discret."],
];

const Bientot = () => <span className="pzh-soon">Bientôt</span>;

interface Tuile { id: string; num: string; cat: string; titre: string; texte: string; points: ReactNode[]; taille: "l" | "m" | "s" | "xl"; sombre?: boolean; ouvrir?: [string, StitchEntry] }
const TUILES: Tuile[] = [
  { id: "dessiner", num: "01", cat: "Dessiner", titre: "Tous les points du point de croix", taille: "l", ouvrir: ["Dessiner un patron", "create"],
    texte: "Chaque point a son outil, posé case par case ou en formes, avec la symétrie si l’on veut.",
    points: ["Croix", "Demi-point", "Quart", "Trois quarts", "Petite croix", "Point arrière", "Point lancé", "Nœud", "Perle", "Ligne", "Rectangle", "Ellipse", "Remplir", "Pipette", "Gomme", "Sélection", "Lasso", "Déplacer", "Symétrie sur un ou deux axes", "Sens du demi-point"] },
  { id: "composer", num: "02", cat: "Composer", titre: "Un patron qui se construit", taille: "m",
    texte: "Des motifs prêts à glisser sur la grille, des calques, des sujets que l’on déplace.",
    points: [`${MOTIF_PRESETS.length} motifs à glisser`, "Calques", "Sujets déplaçables", "Lettres en croix (A–Z, 0–9)", "Redimensionner la grille", "Nettoyer les points isolés"] },
  { id: "importer", num: "03", cat: "Importer", titre: "Partir de ce que l’on aime", taille: "s",
    texte: "Une photo devient un patron en fils DMC ; un PDF de plusieurs pages se recompose.",
    points: ["Photo → couleurs DMC", "Puzzle PDF sur plateau magnétique", "Projet JSON ou OXS", "Glisser-déposer sur la grille", "Calage manuel"] },
  { id: "fils", num: "04", cat: "Fils", titre: "Le nuancier DMC complet", taille: "s", ouvrir: ["Préparer mes fils", "prepare"],
    texte: `${BASE_FLOSS.length} références, cherchées par code ou en français : « rouge », « vert foncé », « doré ».`,
    points: ["Fil actif", "Remplacer par le plus proche", "Fils mélangés", "Perles Miyuki Delica", "Toile et brins", "Marge de fil estimée"] },
  { id: "stock", num: "05", cat: "Stock", titre: "Ce qu’il vous faut, ce que vous avez", taille: "s",
    texte: "Le stock de fils de la brodeuse, rapproché du patron avant la première croix.",
    points: ["Mon stock de fils", "Fils manquants", "Liste de courses", "Quantités estimées"] },
  { id: "broder", num: "06", cat: "Broder", titre: "Suivre le patron sans le redessiner", taille: "l", sombre: true, ouvrir: ["Passer en mode Broder", "stitch"],
    texte: "Marquer ce qui est brodé, garer un fil, noter un rappel : le dessin, lui, ne bouge pas.",
    points: ["Marquer une case", "Un bloc de 10 × 10", "Une ligne entière", "Uniquement le fil actif", "Parking des fils", "Notes sur la grille", "Cases à défaire", "Journal des séances", "Écran gardé éveillé"] },
  { id: "reperer", num: "07", cat: "Se repérer", titre: "Toujours savoir où l’on en est", taille: "m",
    texte: "Le cercle, la timeline et trois lectures pour ne jamais perdre le fil.",
    points: ["Pourcentage brodé", "Timeline fil par fil", "Réaliste · À plat · Patron", "Symboles", "Loupe et zoom", "Tout voir"] },
  { id: "partager", num: "08", cat: "Partager", titre: "Montrer l’ouvrage", taille: "m",
    texte: "Quelqu’un regarde en direct, depuis son appareil, pendant que vous brodez.",
    points: ["Inviter à regarder", "Privé · Restreint · Par lien · Public", "PDF paginé", "SVG · PNG · JSON", <>SAL à plusieurs <Bientot /></>, <>Commenter sur la grille <Bientot /></>] },
  { id: "garder", num: "09", cat: "Garder", titre: "Vos ouvrages, en sûreté", taille: "m",
    texte: "Sans compte, tout reste sur l’appareil ; avec AIME, vos ouvrages vous suivent.",
    points: ["Sauvegarde automatique", "Mes ouvrages, rangés dans le dock", "Espace AIME synchronisé", "Hors ligne après chargement", "Export JSON de sûreté"] },
  { id: "confort", num: "10", cat: "Confort", titre: "Un studio qui s’adapte à la brodeuse", taille: "xl",
    texte: "L’interface s’ajuste à votre main, à vos yeux et à votre rythme.",
    points: ["Débutante · Confirmée · Experte", "Contraste élevé", "Texte plus grand", "Stylet uniquement", "La grille au clavier", "Lecteur d’écran", "Moins d’animations respecté", "Le Point pour démarrer"] },
];

/** Un écran d'accueil seulement : l'ouvrir ne crée aucun patron et ne réécrit aucun projet. */
export default function CrossStitchHome({ projectName, onOpen, onImport, onShare, onOuvrages, onVisite }: Props) {
  const [current, setCurrent] = useState<SectionId | null>(null);
  const enter = () => (onOuvrages ? onOuvrages() : onOpen("library"));
  const visite = () => (onVisite ? onVisite() : onOpen("create"));

  // Repère : la section visible est mise en évidence dans le dock du bas.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const compute = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let found: SectionId | null = null;
      // L'import n'a pas d'entrée dans le dock : rien n'y est mis en évidence.
      const marks: [string, SectionId | null][] = [["docks", "docks"], ["le-point", "le-point"], ["fonctionnalites", "fonctionnalites"], ["csh-import", null], ["commencer", "commencer"]];
      for (const [id, key] of marks) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) found = key;
      }
      setCurrent(found);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame?.(compute) ?? 0; };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame?.(frame);
    };
  }, []);

  const go = (id: string) => (event: { preventDefault: () => void }) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history?.replaceState?.(null, "", window.location.pathname + window.location.search);
    (el.querySelector<HTMLElement>("h2") ?? el).focus?.({ preventScroll: true });
  };
  const haut = ETAPES.filter(e => e.dock === "haut"), bas = ETAPES.filter(e => e.dock === "bas");

  return <div className="cross-stitch-home">
    <a className="csh-skip" href="#csh-main">Aller au contenu</a>

    <TopDock label="Navigation point de croix" idBloc="pzh-menu"
      menu={[{ label: "Mes ouvrages", faire: () => onOpen("library") }, { label: "Ouvrir le studio", faire: () => onOpen("stitch") }, { label: "Faire la visite avec Le Point", faire: visite }]}
      droite={<button type="button" className="pzs-tool pzs-noir pzh-entrer" onClick={enter} aria-label="Entrer dans Point Zéro"><span aria-hidden="true">+</span> Entrer</button>}>
      <a className="pzs-tool" href="#docks" onClick={go("docks")}>Les docks</a>
      <a className="pzs-tool" href="#le-point" onClick={go("le-point")}>Le Point</a>
      <a className="pzs-tool" href="#fonctionnalites" onClick={go("fonctionnalites")}>Fonctionnalités</a>
      <a className="pzs-tool" href="#csh-import" onClick={go("csh-import")}>Importer</a>
    </TopDock>

    <main id="csh-main">
      <section className="pzh-hero" aria-labelledby="csh-title">
        <p className="pzh-kicker">Le studio de point de croix d’AIME</p>
        <h1 id="csh-title">Point Zéro</h1>
        <p className="pzh-lead">Deux docks, une grille, et Le Point pour vous guider.</p>
        <p className="pzh-text">Créez votre patron, préparez vos fils et suivez votre broderie, du premier motif à la dernière croix.</p>
        <div className="pzh-actions">
          <button className="pzh-btn pzh-btn-primary" onClick={() => onOpen("create")}>Créer mon patron</button>
          <button className="pzh-btn pzh-btn-secondary pzh-btn-point" onClick={visite}><span className="pzh-dot" aria-hidden="true" />Faire la visite avec Le Point</button>
          <a className="pzh-btn pzh-btn-ghost" href="#csh-import" onClick={go("csh-import")}>Importer une image ou un patron</a>
        </div>
        <p className="pzh-fine">Sans compte · Projets conservés sur cet appareil · Utilisable hors ligne après chargement</p>
      </section>

      <figure className="pzh-demo">
        <StudioDemo />
        <figcaption>Reproduction de l’interface du studio — pas une capture d’écran ni un ouvrage brodé.</figcaption>
      </figure>

      <section className="pzh-section" id="docks" aria-labelledby="pzh-docks-title">
        <div className="pzh-intro">
          <div>
            <p className="pzh-kicker">Toute la grille, rien autour</p>
            <h2 id="pzh-docks-title" tabIndex={-1}>Les docks</h2>
          </div>
          <p>La grille occupe tout l’écran. En haut, le dock pour faire : des verbes qui se déploient dans le dock lui-même. En bas, le dock pour se repérer. Rien d’autre à apprendre.</p>
        </div>
        <div className="pzh-docks">
          <article className="pzh-dock pzh-dock-haut" aria-labelledby="pzh-dock-haut">
            <p className="pzh-step">En haut · pour faire</p>
            <h3 id="pzh-dock-haut">Le dock du haut</h3>
            <div className="pzh-replica pzh-replica-haut" aria-hidden="true">
              <i className="pzh-r-sq"><b /></i><em>Point Zéro</em><s /><span data-on="1">Dessiner</span><span>Broder</span><span>Fils</span><span>Partager</span><s /><span>↶</span><span>↷</span><s /><span>⌕</span><span>◯</span>
            </div>
            <ol className="pzh-legend">{HAUT.map(([n, t]) => <li key={n}><strong>{n}</strong><span>{t}</span></li>)}</ol>
          </article>
          <article className="pzh-dock pzh-dock-bas" aria-labelledby="pzh-dock-bas">
            <p className="pzh-step">En bas · pour se repérer</p>
            <h3 id="pzh-dock-bas">Le dock du bas</h3>
            <div className="pzh-replica pzh-replica-bas" aria-hidden="true">
              <i className="pzh-r-cercle"><b /></i><em>Roses anciennes</em><s /><span data-on="1">Réaliste</span><span>À plat</span><span>Patron</span><span>Symboles</span><s /><span>−</span><span>+</span><span data-clair="1">Tout voir</span>
            </div>
            <ol className="pzh-legend">{BAS.map(([n, t]) => <li key={n}><strong>{n}</strong><span>{t}</span></li>)}</ol>
            <div className="pzh-modes">
              <p className="pzh-step">Le cercle change le dock du bas</p>
              <ul>{MODES.map(([n, t]) => <li key={n}><strong>{n}</strong><span>{t}</span></li>)}</ul>
            </div>
          </article>
        </div>
      </section>

      <section className="pzh-section pzh-dark pzh-point" id="le-point" aria-labelledby="pzh-point-title">
        <div className="pzh-point-grid">
          <div className="pzh-point-texte">
            <span className="pzh-point-orbe" aria-hidden="true" />
            <p className="pzh-kicker">L’orbe qui guide</p>
            <h2 id="pzh-point-title" tabIndex={-1}>Le Point</h2>
            <p className="pzh-point-lead">À la première ouverture de l’atelier, Le Point se pose sur chaque outil des deux docks et vous le présente. {ETAPES.length} étapes, de bout en bout, à votre rythme.</p>
            <ul className="pzh-chips">
              <li>Dès la première ouverture</li>
              <li>Outil par outil, en haut puis en bas</li>
              <li>Ouvre lui-même Dessiner et Broder</li>
              <li>Au clavier : → ← Échap</li>
              <li>Respecte « moins d’animations »</li>
              <li>Se relance depuis le menu</li>
            </ul>
            <button className="pzh-btn pzh-btn-clair" onClick={visite}><span className="pzh-dot" aria-hidden="true" />Faire la visite maintenant</button>
          </div>
          <div className="pzh-parcours" aria-label="Le parcours du Point">
            <div>
              <p className="pzh-step">Dock du haut</p>
              <ol>{haut.map((e, n) => <li key={e.titre}><span>{String(n + 1).padStart(2, "0")}</span>{e.titre}</li>)}</ol>
            </div>
            <div>
              <p className="pzh-step">Dock du bas</p>
              <ol start={haut.length + 1}>{bas.map((e, n) => <li key={e.titre}><span>{String(haut.length + n + 1).padStart(2, "0")}</span>{e.titre}</li>)}</ol>
            </div>
          </div>
        </div>
      </section>

      <section className="pzh-section" id="fonctionnalites" aria-labelledby="pzh-fonct-title">
        <div className="pzh-intro">
          <div>
            <p className="pzh-kicker">Tout ce que fait le studio</p>
            <h2 id="pzh-fonct-title" tabIndex={-1}>Fonctionnalités</h2>
          </div>
          <p>Dix familles, du dessin à la sauvegarde. Chaque fonction ci-dessous existe dans le studio aujourd’hui, sauf celles marquées « Bientôt ».</p>
        </div>
        <ul className="pzh-bento">
          {TUILES.map(t => <li key={t.id} id={"f-" + t.id} className={"pzh-tuile pzh-t-" + t.taille + (t.sombre ? " pzh-tuile-sombre" : "")}>
            <p className="pzh-tuile-tete"><span>{t.num}</span><span>{t.cat}</span></p>
            <h3>{t.titre}</h3>
            <p className="pzh-tuile-texte">{t.texte}</p>
            <ul className="pzh-puces">{t.points.map((x, n) => <li key={n}>{x}</li>)}</ul>
            {t.ouvrir && <button className="pzh-link" onClick={() => onOpen(t.ouvrir![1])}>{t.ouvrir[0]} <span aria-hidden="true">→</span></button>}
          </li>)}
        </ul>
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
            <li><a href="#docks" onClick={go("docks")}>Les docks</a></li>
            <li><a href="#le-point" onClick={go("le-point")}>Le Point</a></li>
            <li><a href="#fonctionnalites" onClick={go("fonctionnalites")}>Fonctionnalités</a></li>
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

    <nav className="pzh-bottom" aria-label="Sections de la page">
      <button type="button" className="pzh-bottom-orb" aria-label="Le Point : faire la visite du studio" title="Le Point : faire la visite" onClick={visite} />
      {SECTIONS.map(([id, label]) => <a key={id} href={"#" + id} onClick={go(id)} aria-current={current === id ? "location" : undefined} className={current === id ? "is-on" : undefined}>{label}</a>)}
    </nav>
  </div>;
}

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import StudioDemo from "./StudioDemo";
import { FLOSS } from "../lib/dmc";
import { EDITIONS, fabriquerEdition, type EditionProduct } from "../lib/editions";
import "./CrossStitchHome.css";

export type StitchEntry = "create" | "library" | "prepare" | "stitch";
interface Props {
  projectName: string;
  onOpen: (entry: StitchEntry) => void;
  onImport: (file: File) => void;
  onShare?: () => void;
  onShop?: () => void;
  /** Le BurO : le bureau de Point Zéro (Mon Espace). À défaut, la bibliothèque. */
  onBuro?: () => void;
}

/** Sélecteur de fichier : transmet le fichier une seule fois et permet de le choisir à nouveau. */
function pick(onImport: (file: File) => void) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onImport(file);
  };
}

/** Quatre patrons des Éditions, un par collection, dessinés case par case en croix. */
const SHOWCASE: EditionProduct[] = (() => {
  const seen = new Set<string>(), out: EditionProduct[] = [];
  for (const item of EDITIONS) { if (!seen.has(item.collection)) { seen.add(item.collection); out.push(item); } if (out.length === 4) break; }
  return out;
})();
function EditionPreview({ item }: { item: EditionProduct }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current, ctx = el?.getContext?.("2d");
    if (!el || !ctx) return;
    let p;
    try { p = fabriquerEdition(item.id); } catch { return; }
    const step = 5;
    el.width = p.w * step; el.height = p.h * step;
    ctx.fillStyle = "#f4f0e6"; ctx.fillRect(0, 0, el.width, el.height);
    ctx.lineCap = "round"; ctx.lineWidth = step * .34;
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const idx = p.cross[y * p.w + x]; if (idx < 0) continue;
      ctx.strokeStyle = FLOSS[idx]?.hex ?? "#555";
      const l = x * step + step * .18, t = y * step + step * .18, r = x * step + step * .82, b = y * step + step * .82;
      ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(r, b); ctx.moveTo(r, t); ctx.lineTo(l, b); ctx.stroke();
    }
  }, [item.id]);
  return <canvas ref={ref} aria-hidden="true" />;
}

const SECTIONS = [["studio", "Le studio"], ["editions", "Les éditions"], ["ensemble", "Ensemble"], ["commencer", "Commencer"]] as const;
type SectionId = typeof SECTIONS[number][0];

const Soon = () => <span className="pzh-soon">Bientôt</span>;

/** Un écran d'accueil seulement : l'ouvrir ne crée aucun patron et ne réécrit aucun projet. */
export default function CrossStitchHome({ projectName, onOpen, onImport, onShare, onShop, onBuro }: Props) {
  const [menu, setMenu] = useState(false);
  const [current, setCurrent] = useState<SectionId | null>(null);
  const enter = () => (onBuro ? onBuro() : onOpen("library"));

  // Repère : la section visible est mise en évidence dans le dock du bas.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const compute = () => {
      frame = 0;
      const line = window.innerHeight * 0.4;
      let found: SectionId | null = null;
      // L'import n'a pas d'entrée dans le dock : rien n'y est mis en évidence.
      const marks: [string, SectionId | null][] = [["studio", "studio"], ["editions", "editions"], ["ensemble", "ensemble"], ["csh-import", null], ["commencer", "commencer"]];
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

  return <div className="cross-stitch-home">
    <a className="csh-skip" href="#csh-main">Aller au contenu</a>

    <header className="pzh-head">
      <span aria-hidden="true" />
      <nav className="pzh-top" aria-label="Navigation point de croix" onKeyDown={e => { if (e.key === "Escape" && menu) { e.preventDefault(); setMenu(false); document.getElementById("pzh-brand")?.focus(); } }}>
        <div className="pzh-brandwrap">
          <button id="pzh-brand" type="button" className="pzh-tool pzh-brand" aria-expanded={menu} aria-controls="pzh-menu" onClick={() => setMenu(v => !v)}>
            <span className="pzh-x" aria-hidden="true">×</span> Point Zéro <span className="pzh-caret" aria-hidden="true">▾</span>
          </button>
          {menu && <>
            <div className="pzh-veil" aria-hidden="true" onClick={() => setMenu(false)} />
            <ul id="pzh-menu" className="pzh-menu">
              <li><button type="button" onClick={() => { setMenu(false); onOpen("library"); }}>Mes ouvrages</button></li>
              {onShop && <li><button type="button" onClick={() => { setMenu(false); onShop(); }}>Boutique de patrons</button></li>}
              <li><button type="button" onClick={() => { setMenu(false); onOpen("stitch"); }}>Ouvrir le studio</button></li>
            </ul>
          </>}
        </div>
        <span className="pzh-sep" aria-hidden="true" />
        <div className="pzh-row">
          {onShop && <button type="button" className="pzh-tool" onClick={onShop}>Éditions</button>}
          <a className="pzh-tool" href="#studio" onClick={go("studio")}>Le studio</a>
          <a className="pzh-tool" href="#ensemble" onClick={go("ensemble")}>Broder ensemble</a>
        </div>
      </nav>
      <button type="button" className="pzh-enter" onClick={enter} aria-label="Entrer dans Point Zéro"><span aria-hidden="true">+</span> Entrer</button>
    </header>

    <main id="csh-main">
      <section className="pzh-hero" aria-labelledby="csh-title">
        <p className="pzh-kicker">Le studio de point de croix d’AIME</p>
        <h1 id="csh-title">Point Zéro</h1>
        <p className="pzh-lead">Du premier motif à la dernière croix.</p>
        <p className="pzh-text">Créez votre patron, préparez vos fils et suivez votre broderie dans un seul studio.</p>
        <div className="pzh-actions">
          <button className="pzh-btn pzh-btn-primary" onClick={() => onOpen("create")}>Créer mon patron</button>
          <a className="pzh-btn pzh-btn-secondary" href="#csh-import" onClick={go("csh-import")}>Importer une image ou un patron</a>
        </div>
        <p className="pzh-fine">Sans compte · Projets conservés sur cet appareil · Utilisable hors ligne après chargement</p>
      </section>

      <figure className="pzh-demo">
        <StudioDemo/>
        <figcaption>Reproduction de l’interface du studio — pas une capture d’écran ni un ouvrage brodé.</figcaption>
      </figure>

      <section className="pzh-section" id="studio" aria-labelledby="pzh-studio-title">
        <div className="pzh-intro">
          <div>
            <p className="pzh-kicker">Un projet, trois temps</p>
            <h2 id="pzh-studio-title" tabIndex={-1}>Le studio</h2>
          </div>
          <p>Tout ce qu’il faut pour aller jusqu’au bout, dans un seul espace : le dock du haut pour faire, celui du bas pour se repérer, la grille au milieu.</p>
        </div>
        <div className="pzh-grid-3">
          <article className="pzh-card">
            <span className="pzh-step">01 · Créer</span>
            <h3>Un patron qui vous ressemble</h3>
            <p>Grille vierge, motifs à composer, dessin, points fractionnaires et points arrière. Les outils avancés restent à portée de main.</p>
            <button className="pzh-link" onClick={() => onOpen("create")}>Explorer la création <span aria-hidden="true">→</span></button>
          </article>
          <article className="pzh-card">
            <span className="pzh-step">02 · Préparer</span>
            <h3>La bonne toile, les bons fils</h3>
            <p>Palette DMC, dimensions de l’ouvrage, estimation des quantités et stock de fils. Préparez votre matériel avant la première croix.</p>
            <button className="pzh-link" onClick={() => onOpen("prepare")}>Préparer mon ouvrage <span aria-hidden="true">→</span></button>
          </article>
          <article className="pzh-card">
            <span className="pzh-step">03 · Broder</span>
            <h3>Retrouver le fil, simplement</h3>
            <p>Suivi par case, ligne ou bloc, fil actif et journal. Marquez votre avancée sans redessiner le patron.</p>
            <button className="pzh-link" onClick={() => onOpen("stitch")}>Passer en mode Broder <span aria-hidden="true">→</span></button>
          </article>
        </div>
      </section>

      <section className="pzh-section" id="editions" aria-labelledby="pzh-editions-title">
        <div className="pzh-intro">
          <div>
            <p className="pzh-kicker">Des motifs qui ont quelque chose à dire</p>
            <h2 id="pzh-editions-title" tabIndex={-1}>Les éditions</h2>
          </div>
          <div>
            <p>Des collections originales, dessinées case par case en fils DMC. Chaque patron s’ouvre dans le studio, prêt à broder ou à adapter.</p>
            {onShop && <button className="pzh-btn pzh-btn-secondary" onClick={onShop}>Voir les patrons</button>}
          </div>
        </div>
        <ul className="pzh-editions">
          {SHOWCASE.map(item => <li key={item.id} className="pzh-edition">
            <div className="pzh-edition-frame"><EditionPreview item={item} /></div>
            <span className="pzh-step">{item.collection}</span>
            <strong>{item.title}</strong>
          </li>)}
        </ul>
      </section>

      <section className="pzh-section pzh-dark" id="ensemble" aria-labelledby="pzh-ensemble-title">
        <div className="pzh-intro">
          <div>
            <p className="pzh-kicker">Le fil qui relie</p>
            <h2 id="pzh-ensemble-title" tabIndex={-1}>Broder ensemble</h2>
          </div>
          <p>Un ouvrage se partage. Montrez votre avancée, brodez le même motif à plusieurs et échangez là où se trouve la croix dont vous parlez.</p>
        </div>
        <div className="pzh-grid-3">
          <article className="pzh-card pzh-card-dark">
            <span className="pzh-orb" aria-hidden="true" />
            <h3>Inviter à regarder</h3>
            <p>Une personne suit votre ouvrage en direct, en lecture seule. Votre patron reste sur votre appareil.</p>
            {onShare && <button className="pzh-link" onClick={onShare}>Inviter à regarder <span aria-hidden="true">→</span></button>}
          </article>
          <article className="pzh-card pzh-card-dark">
            <span className="pzh-orb pzh-orb-ring" aria-hidden="true" />
            <h3>Les SAL, à plusieurs <Soon /></h3>
            <p>Un même patron, découpé en parties qui s’ouvrent à leur date. Chacune avance sur son ouvrage ; le fil commun montre les progrès de toutes.</p>
          </article>
          <article className="pzh-card pzh-card-dark">
            <span className="pzh-orb pzh-orb-sat" aria-hidden="true" />
            <h3>Commenter sur la grille <Soon /></h3>
            <p>Une petite orbe posée sur une case ouvre l’échange. Et l’orbe qui guide montre le chemin à celles qui découvrent le motif.</p>
          </article>
        </div>
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
          </ul>
        </div>
        <div>
          <h2>Éditions</h2>
          <ul>
            {onShop && <li><button type="button" onClick={onShop}>Les patrons</button></li>}
            <li><button type="button" onClick={() => onOpen("library")}>Mes ouvrages</button></li>
          </ul>
        </div>
        <div>
          <h2>Aide</h2>
          <ul>
            <li><a href="#csh-import" onClick={go("csh-import")}>Importer un patron</a></li>
            <li><a href="#commencer" onClick={go("commencer")}>Sauvegarder mon ouvrage</a></li>
          </ul>
        </div>
      </nav>
      <div className="pzh-dots" aria-hidden="true" />
      <p className="pzh-foot-line">Un studio AIME<sup>®</sup> · Point de croix</p>
    </footer>

    <nav className="pzh-bottom" aria-label="Sections de la page">
      <span className="pzh-bottom-orb" aria-hidden="true" />
      {SECTIONS.map(([id, label]) => <a key={id} href={"#" + id} onClick={go(id)} aria-current={current === id ? "location" : undefined} className={current === id ? "is-on" : undefined}>{label}</a>)}
    </nav>
  </div>;
}

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as KE, type PointerEvent as PE } from "react";
import Sceau, { ENCRE } from "./Sceau";
import { codeDe, DIMENSIONS, lireCode, MAX_GRAINE, VERSION, type Choix, type Recette, type Signature } from "../lib/motif5d/code";
import { formatParDefaut, generer } from "../lib/motif5d/generer";
import { nomRecette, RECETTES } from "../lib/motif5d/recettes";
import { cm, duree, mesures } from "../lib/cadre";
import { FLOSS } from "../lib/dmc";
import type { Pattern } from "../lib/pattern";
import Point from "./point/Point";
import { Compass, Move } from "lucide-react";
import OrbeGuide, { type Etape } from "./OrbeGuide";
import { secteurVise } from "../lib/point/modes";

/**
 * Composer une rosace : cinq gestes avec Le Point, quatre vrais motifs à chaque étape, sans formulaire.
 * Les quatre premières questions sont en rouge DMC 321 sur toile (hommage au redwork) ; la couleur arrive au cinquième geste.
 * Un geste ne change que ce qu'il annonce : les vignettes gardent les choix déjà faits.
 */
const DEFAUT: Signature = { structure: 0, trace: 2, densite: 1, echelle: 1, palette: 1 };
const GRAINE_DEPART = 1;
/** Les quatre réponses autour du Point, dans le sens des aiguilles d'une montre, depuis le haut à gauche. */
const COINS = ["nw", "ne", "se", "sw"] as const;

/** Dessine un motif dans un canvas : des cases pleines (vignettes), ou des croix (aperçu final). */
function dessiner(cv: HTMLCanvasElement | null, p: Pattern, mono: boolean, taille: number, croix: boolean) {
  const ctx = cv?.getContext?.("2d"); if (!cv || !ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const k = Math.min(taille / p.w, taille / p.h), W = Math.round(p.w * k), H = Math.round(p.h * k);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#f3f3f1"; ctx.fillRect(0, 0, W, H);
  // Totale en monochrome : le fond (le fil le plus présent) reste écru, le motif en rouge
  let fond = -1;
  if (mono && p.cross.length && p.cross.every(v => v >= 0)) { const n = new Map<number, number>(); for (const v of p.cross) n.set(v, (n.get(v) ?? 0) + 1); fond = [...n.entries()].sort((a, b) => b[1] - a[1])[0][0]; }
  for (let i = 0; i < p.cross.length; i++) {
    const v = p.cross[i]; if (v < 0) continue;
    const x = (i % p.w) * k, y = Math.floor(i / p.w) * k;
    const col = mono ? (v === fond ? "#e7dcc6" : ENCRE) : FLOSS[v].hex;
    if (croix && k >= 4) {
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, k * 0.28); ctx.lineCap = "round";
      const m = k * 0.16; ctx.beginPath(); ctx.moveTo(x + m, y + m); ctx.lineTo(x + k - m, y + k - m); ctx.moveTo(x + k - m, y + m); ctx.lineTo(x + m, y + k - m); ctx.stroke();
    } else { ctx.fillStyle = col; ctx.fillRect(x, y, Math.ceil(k), Math.ceil(k)); }
  }
}
function Motif({ pattern, mono, taille, croix = false, label }: { pattern: Pattern; mono: boolean; taille: number; croix?: boolean; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { dessiner(ref.current, pattern, mono, taille, croix); }, [pattern, mono, taille, croix]);
  return <canvas ref={ref} className="cr-motif" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** Le Guide du Point, dans le compositeur : le même composant que la visite de l'atelier, avec ses propres étapes. */
export const ETAPES_COMPOSITEUR: Etape[] = [
  { dock: "page", cible: "cr-reponses", titre: "Quatre réponses", texte: "Chaque image est une réponse à la question. Touchez-en une, ou choisissez-la aux flèches puis Entrée. Retour arrière revient à la question précédente." },
  { dock: "page", cible: "cr-centre", titre: "Le sceau se dessine", texte: "Un anneau par geste : structure, trait, densité, échelle, puis la couleur au cinquième. Avec le mode Espace, tirez le centre vers une image pour la choisir." },
  { dock: "page", cible: "cr-recettes", titre: "Les douze recettes", texte: "Pour partir d’un motif déjà composé, avec son nom et son code." },
  { dock: "bas", cible: "point-compositeur", titre: "Le même Point", texte: "Celui de l’atelier, avec les modes d’ici : Confort, ce Guide et Espace. Les flèches tournent, Entrée ouvre, Échap referme." },
];

const nouvelleGraine = () => 1 + Math.floor(Math.random() * MAX_GRAINE);

export default function ComposerRosace({ depart, lecture = false, onBroder, onFermer }: {
  /** une recette déjà choisie (lien partagé, recette du mur) : on arrive directement sur le motif */
  depart?: string | null;
  /** lien partagé : on regarde une recette, sans compte, sans rien modifier d'autre */
  lecture?: boolean;
  onBroder: (p: Pattern, code: string) => void;
  onFermer: () => void;
}) {
  const initiale = depart ? lireCode(depart) : null;
  const [etape, setEtape] = useState(initiale ? 5 : 0);
  const [choix, setChoix] = useState<Partial<Signature>>(initiale ? initiale.signature : {});
  const [graine, setGraine] = useState(initiale?.graine ?? GRAINE_DEPART);
  const [historique, setHistorique] = useState<number[]>(initiale ? [initiale.graine] : []);
  const [focus, setFocus] = useState(0);
  const [onde, setOnde] = useState(0);
  const [mur, setMur] = useState(false);
  const [annonce, setAnnonce] = useState("");
  /* le mode Espace du Point : les gestes spatiaux (tirer le centre vers une image). Un raccourci, jamais le seul chemin. */
  const [espace, setEspace] = useState(true);
  const [guide, setGuide] = useState(false);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const dialogue = useRef<HTMLDivElement>(null);
  const tire = useRef<{ x: number; y: number } | null>(null);
  const [petit, setPetit] = useState(() => typeof window !== "undefined" && window.innerWidth < 720);
  useEffect(() => { const r = () => setPetit(window.innerWidth < 720); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []);

  const dim = DIMENSIONS[Math.min(etape, 4)];
  const signature: Signature = { ...DEFAUT, ...choix } as Signature;
  // les quatre vignettes de la question en cours : les choix faits + chacune des quatre réponses
  const vignettes = useMemo(() => etape >= 5 ? [] : [0, 1, 2, 3].map(r => {
    const s = { ...DEFAUT, ...choix, [dim.cle]: r as Choix } as Signature, [w, h] = formatParDefaut(s);
    return generer({ signature: s, graine: GRAINE_DEPART, version: VERSION, w, h }).pattern;
  }), [etape, choix, dim.cle]);
  const recette: Recette | null = etape >= 5 ? { signature, graine, version: VERSION } : null;
  const final = useMemo(() => { if (!recette) return null; const [w, h] = formatParDefaut(recette.signature); const code = codeDe(recette); return generer({ ...recette, w, h, nom: nomRecette(code) }); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [etape, graine, choix.structure, choix.trace, choix.densite, choix.echelle, choix.palette]);
  const couleurs = useMemo(() => {
    if (final) return final.pattern.palette.map(i => FLOSS[i].hex);
    if (choix.palette === undefined) return [];
    const s = { ...DEFAUT, ...choix } as Signature, [w, h] = formatParDefaut(s);
    return generer({ signature: s, graine: GRAINE_DEPART, version: VERSION, w, h }).pattern.palette.map(i => FLOSS[i].hex);
  }, [final, choix]);

  useEffect(() => {
    if (etape < 5) { setAnnonce(`Question ${etape + 1} sur 5 : ${dim.question}`); requestAnimationFrame(() => boutons.current[focus]?.focus()); }
    else dialogue.current?.querySelector<HTMLButtonElement>(".cr-broder")?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etape]);
  useEffect(() => {
    /* un Échap déjà traité (anneau du Point, Confort, Guide) ne ferme pas le compositeur */
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); if (mur) setMur(false); else onFermer(); } };
    window.addEventListener("keydown", echap); return () => window.removeEventListener("keydown", echap);
  }, [mur, onFermer]);

  const choisir = (r: number) => {
    const suivant = { ...choix, [dim.cle]: r as Choix };
    setChoix(suivant); setOnde(o => o + 1); setFocus(etape < 4 ? (suivant[DIMENSIONS[etape + 1].cle] ?? 0) : 0);
    setAnnonce(`Anneau ${etape + 1} dessiné : ${dim.reponses[r][0].toLowerCase()}.`);
    if (etape === 4) setHistorique(h => h.includes(graine) ? h : [graine, ...h].slice(0, 10));
    setEtape(e => e + 1);
  };
  const revenir = (vers = etape - 1) => { if (vers < 0) return; setEtape(vers); setFocus(choix[DIMENSIONS[vers].cle] ?? 0); setMur(false); };
  const clavier = (e: KE<HTMLDivElement>) => {
    if (etape >= 5) return;
    const sens = ({ ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 } as Record<string, number>)[e.key];
    if (sens) { e.preventDefault(); const f = (focus + sens + 4) % 4; setFocus(f); boutons.current[f]?.focus(); return; }
    if (e.key === "Backspace") { e.preventDefault(); revenir(); }
  };
  // tirer Le Point vers une vignette : la vignette du quart vers lequel on tire est choisie
  const pointBas = (e: PE<HTMLDivElement>) => { if (etape < 5 && espace) { tire.current = { x: e.clientX, y: e.clientY }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } };
  const pointHaut = (e: PE<HTMLDivElement>) => {
    const t = tire.current; tire.current = null; if (!t || etape >= 5 || !espace) return;
    /* la Poignée du noyau du Point : quatre quarts en diagonale, le quart 0 en haut à gauche */
    const q = secteurVise(e.clientX - t.x, e.clientY - t.y, 4, 36, -45);
    if (q !== null) choisir(q);
  };
  const uneAutre = () => { const g = nouvelleGraine(); setGraine(g); setHistorique(h => [g, ...h.filter(x => x !== g)].slice(0, 10)); setAnnonce(`Nouvelle variante : graine ${g}.`); };
  const ouvrirRecette = (code: string) => { const r = lireCode(code); if (!r) return; setChoix(r.signature); setGraine(r.graine); setHistorique(h => [r.graine, ...h.filter(x => x !== r.graine)].slice(0, 10)); setMur(false); setEtape(5); };

  const m = final ? mesures(final.pattern) : null;
  const murCouleurs = useMemo(() => mur ? RECETTES.map(r => { const rc = lireCode(r.code)!, [w, h] = formatParDefaut(rc.signature); return generer({ ...rc, w, h }).pattern.palette.map(i => FLOSS[i].hex); }) : [], [mur]);
  const code = recette ? codeDe(recette) : "";
  const tailleVignette = petit ? (typeof window !== "undefined" && window.innerWidth < 360 ? 104 : 128) : 168, tailleSceau = etape >= 5 ? (petit ? 120 : 150) : petit ? 132 : 200;

  return <div className="cr" role="dialog" aria-modal="true" aria-labelledby="cr-titre" ref={dialogue} onKeyDown={clavier}>
    <p className="sr-only" role="status" aria-live="polite">{annonce}</p>
    <header className="cr-tete">
      {etape > 0 && etape < 5 && <button type="button" className="cr-btn cr-retour" onClick={() => revenir()} aria-label="Revenir à la question précédente">←</button>}
      <div className="cr-titres">
        <p className="cr-sur">{etape < 5 ? `Composer une rosace · ${etape + 1} / 5` : lecture ? "Une recette partagée avec vous" : "Votre motif"}</p>
        <h2 id="cr-titre">{etape < 5 ? dim.question : final?.pattern.name}</h2>
      </div>
      <button type="button" className="cr-btn cr-fermer" onClick={onFermer} aria-label="Fermer et revenir à la grille">×</button>
    </header>

    {etape < 5 && !mur && <div className={"cr-cadran" + (petit ? " cr-petit" : "")}>
      <div className="cr-reponses" data-guide="cr-reponses" role="radiogroup" aria-labelledby="cr-titre">
        {[0, 1, 2, 3].map(r => { const [nom, phrase] = dim.reponses[r];
          return <button key={r} ref={el => { boutons.current[r] = el; }} type="button" role="radio" aria-checked={choix[dim.cle] === r} tabIndex={r === focus ? 0 : -1}
            className={"cr-vignette cr-" + COINS[r]} aria-label={nom} aria-describedby={"cr-phrase-" + r} onClick={() => choisir(r)} onFocus={() => setFocus(r)}>
            <span id={"cr-phrase-" + r} className="sr-only">{phrase}</span>
            {vignettes[r] && <Motif pattern={vignettes[r]} mono={dim.cle !== "palette"} taille={tailleVignette} />}
            <span className="cr-nom">{nom}</span>
          </button>; })}
      </div>
      <div className={"cr-centre" + (espace ? " cr-espace" : "")} data-guide="cr-centre" onPointerDown={pointBas} onPointerUp={pointHaut} onPointerCancel={() => { tire.current = null; }} title={espace ? "Touchez une image, ou tirez le centre vers elle" : "Touchez une image"}>
        <Sceau signature={choix} faits={etape} couleurs={couleurs} taille={tailleSceau} onde={onde} />
        <div className="cr-anneaux" aria-label="Revenir à une réponse">{DIMENSIONS.slice(0, etape).map((d, i) => <button key={d.cle} type="button" className="cr-anneau" onClick={() => revenir(i)}>{i + 1}. {d.reponses[choix[d.cle] ?? 0][0]}</button>)}</div>
      </div>
    </div>}

    {etape === 0 && !mur && !lecture && <p className="cr-pied"><button type="button" className="cr-lien" data-guide="cr-recettes" onClick={() => setMur(true)}>Ou partir d’une des 12 recettes</button></p>}
    {mur && <section className="cr-mur" aria-label="Les douze recettes">
      <ul>{RECETTES.map((r, n) => { const rc = lireCode(r.code)!; return <li key={r.code}><button type="button" onClick={() => ouvrirRecette(r.code)}>
        <Sceau signature={rc.signature} taille={petit ? 84 : 104} couleurs={murCouleurs[n] ?? []} />
        <span className="cr-mur-nom">{r.nom}</span><small>{r.code.split(".")[0]}</small></button></li>; })}</ul>
      <button type="button" className="cr-lien" onClick={() => setMur(false)}>Revenir aux cinq questions</button>
    </section>}

    {etape >= 5 && final && m && <div className="cr-fin" data-empreinte={final.pattern.recette?.empreinte}>
      <div className="cr-apercu"><Motif pattern={final.pattern} mono={false} taille={petit ? 300 : 440} croix label={`Aperçu du motif ${final.pattern.name}`} /></div>
      <aside className="cr-infos">
        <Sceau signature={signature} couleurs={couleurs} taille={tailleSceau} code={code} graine={graine} onde={onde} />
        <p className="cr-mesures"><b>{final.pattern.w} × {final.pattern.h} points</b> · {cm(m.cmL)} × {cm(m.cmH)} sur Aida 14<br /><span className="cr-surprise">{duree(m.heures)} · {m.echeveaux} écheveau{m.echeveaux > 1 ? "x" : ""}</span> · {m.fils} fils DMC</p>
        <div className="cr-actions">
          <button type="button" className="cr-btn cr-broder" onClick={() => onBroder(final.pattern, code)}>Broder ce motif</button>
          <button type="button" className="cr-btn cr-secondaire" onClick={uneAutre}>Une autre</button>
          {!lecture && <button type="button" className="cr-btn cr-secondaire" onClick={() => { setChoix({}); setEtape(0); setFocus(0); setGraine(GRAINE_DEPART); }}>Recommencer</button>}
        </div>
        {historique.length > 1 && <div className="cr-graines" role="group" aria-label="Les variantes déjà vues">{historique.map(g => <button key={g} type="button" aria-pressed={g === graine} onClick={() => setGraine(g)}>g{g}</button>)}</div>}
        {!lecture && <p className="cr-partage">Le lien de ce motif : <code>?rosace={code}</code><br /><small>Il ne contient que la recette : rien de votre compte ni de vos ouvrages.</small></p>}
        {final.controle.ajustements.length > 0 && <p className="cr-note">{final.controle.ajustements.join(" ")}</p>}
      </aside>
    </div>}
    {/* le même Point que l'atelier : ici, Confort, Guide et Espace. Il ne crée rien : les choix restent dans les images. */}
    <div className="cr-point">
      <Point contexte="compositeur" guide="point-compositeur" etiquette={etape < 5 ? `Question ${etape + 1} sur 5` : "Votre motif"} modes={[
        { id: "guide", nom: "Guide", icone: <Compass aria-hidden="true" />, aide: "comment composer, en quatre étapes", groupe: "socle", actif: guide, ouvrir: () => setGuide(v => !v) },
        { id: "espace", nom: "Espace", icone: <Move aria-hidden="true" />, aide: espace ? "gestes spatiaux activés : tirer le centre vers une image pour la choisir" : "gestes spatiaux désactivés : on choisit en touchant les images ou aux flèches", groupe: "creation", actif: espace, annonceEnPropre: true,
          ouvrir: () => { setEspace(v => !v); setAnnonce(espace ? "Gestes spatiaux désactivés : touchez les images, ou utilisez les flèches." : "Gestes spatiaux activés : tirez le centre vers une image pour la choisir."); } },
      ]} />
    </div>
    <OrbeGuide ouverte={guide} onFermer={() => setGuide(false)} onChemin={() => {}} etapes={ETAPES_COMPOSITEUR} cle="pointzero:visite-compositeur:v1" fin="Composer" />
  </div>;
}

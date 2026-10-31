/**
 * Point Zéro — l'édition : la narration verticale qui commence sous le héros existant (la Métamorphose).
 * L'histoire du textile, et en même temps celle de la création du visiteur : cinq rencontres avec l'Orbe nourrissent une recette 5D,
 * la rosace évolue à chaque choix, et le cadeau l'ouvre dans l'atelier. Le disque est LE Point du studio (présentation « scène ») ;
 * chaque commande déclenche une vraie action.
 * Le moteur 5D n'est pas modifié : on lit le motif qu'il produit. Aucun projet n'est écrit par la page.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BookOpen, ExternalLink, Grid2x2, Palette, Scaling, Shapes, Shuffle, Spline } from "lucide-react";
import Point from "../point/Point";
import type { ModePoint } from "../../lib/point/modes";
import { DIMENSIONS, type Choix } from "../../lib/motif5d/code";
import { RECETTES, recetteDe } from "../../lib/motif5d/recettes";
import { FLOSS } from "../../lib/dmc";
import { FAMILLES, filsParFamille, familleDe, hsl } from "../../lib/famillesFils";
import { etapeDe, lisse, mouvementReduit, suivreScene } from "./defilement";
import { dessinerRosace, ETAPES_ROSACE, rosaceDe, SEUILS_ROSACE } from "./rosace";
import Histoire, { CHAPITRES_HISTOIRE } from "./Histoire";
import { Cadeau, MaRosace, Orbe, RencontreOrbe, useCommandesTrace, useRencontres } from "./Participation";
import { codeDeCreation, creation, graineDe, nbChoix, reponseDe, signatureDe, useCreation } from "./creation";
import "./Participation.css";
import Appareil from "./Appareil";
import { adresse, ContexteContenus, ORIGINE, useContenus, type Contenus } from "./contenus";
import { useContenusPublies, useSelectionBureau } from "./useContenusPublies";
import "./Edition.css";
import "./Histoire.css";

export const CHAPITRES_EDITION = [
  ...CHAPITRES_HISTOIRE,
  { id: "ed-fils", num: "05", titre: "Aujourd’hui" },
  { id: "ed-rosace", num: "06", titre: "Créez maintenant" },
  { id: "ed-cadeau", num: "07", titre: "Le cadeau" },
] as const;

interface Actions {
  /** ouvrir l'atelier : un nouveau motif, la bibliothèque, broder */
  ouvrir: (entree: "create" | "library" | "stitch") => void;
  importer: (f: File) => void;
  visite: () => void;
}

/* ——— Le disque dans la page : le même Point, posé, ajusté à la largeur disponible ——— */
export function Disque({ contexte, modes, etiquette, children, max = 1 }: { contexte: string; modes: ModePoint[]; etiquette: string; children?: ReactNode; max?: number }) {
  const hote = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = hote.current; if (!el) return;
    const ajuster = () => {
      const a = el.querySelector<HTMLElement>(".lp-anneau, .lp-liste"); if (!a) return;
      /* la place : la largeur de la cellule qui accueille le disque, et la hauteur de l'écran (le disque doit tenir entier, cartouche compris) */
      const parent = el.parentElement, cs = parent ? getComputedStyle(parent) : null;
      const dispo = parent ? parent.clientWidth - parseFloat(cs!.paddingLeft) - parseFloat(cs!.paddingRight) : window.innerWidth, haut = window.innerHeight - 170, cote = a.offsetWidth || 1;
      el.style.setProperty("--ajuste", String(Math.max(0.5, Math.min(max, (dispo - 8) / cote, window.innerWidth > 820 ? haut / cote : 9))));
      el.style.setProperty("--cote", cote + "px");
    };
    ajuster();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(ajuster) : null;
    ro?.observe(el); if (el.parentElement) ro?.observe(el.parentElement);
    const mo = new MutationObserver(ajuster); mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["style"], childList: true });
    window.addEventListener("resize", ajuster);
    return () => { ro?.disconnect(); mo.disconnect(); window.removeEventListener("resize", ajuster); };
  }, [max]);
  return <div className="ed-disque" ref={hote} aria-label={etiquette} role="group">
    {children}
    <div className="ed-disque-corps"><Point contexte={contexte} scene modes={modes} /></div>
  </div>;
}

/* ——— Un sélecteur de fichier caché, réglé sur un genre ——— */
function useFichier(importer: (f: File) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const champ = <input ref={ref} type="file" className="ed-cache" tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importer(f); }} />;
  const choisir = (accept: string) => { const el = ref.current; if (!el) return; el.accept = accept; el.click(); };
  return { champ, choisir };
}

const aller = (id: string) => {
  const el = document.getElementById(id); if (!el) return;
  el.scrollIntoView?.({ behavior: mouvementReduit() ? "auto" : "smooth", block: "start" });
  el.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
};

/* ——— 02 · Une rosace naît : le vrai moteur 5D, révélé au défilement, réglé par le disque ——— */
const ICONES_DIM: Record<string, ReactNode> = { structure: <Shapes aria-hidden="true" />, trace: <Spline aria-hidden="true" />, densite: <Grid2x2 aria-hidden="true" />, echelle: <Scaling aria-hidden="true" />, palette: <Palette aria-hidden="true" /> };
function RosaceNait() {
  const scene = useRef<HTMLElement>(null), toile = useRef<HTMLCanvasElement>(null), pRef = useRef(mouvementReduit() ? 1 : 0);
  const c = useCreation(), sig = signatureDe(c), graine = graineDe(c);
  const [etape, setEtape] = useState(0);
  const rosace = useMemo(() => rosaceDe(sig, graine), [sig.structure, sig.trace, sig.densite, sig.echelle, sig.palette, graine]); // eslint-disable-line react-hooks/exhaustive-deps
  const code = codeDeCreation(c);
  const nom = RECETTES.find(r => r.code === code)?.nom;
  const T = useContenus().rosace;

  const dessiner = useRef(() => {});
  dessiner.current = () => {
    const cv = toile.current, ctx = cv?.getContext?.("2d"); if (!cv || !ctx) return;
    const cote = cv.clientWidth || 600, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(cote * dpr)) { cv.width = Math.round(cote * dpr); cv.height = Math.round(cote * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dessinerRosace(ctx, rosace, cote, pRef.current);
  };
  useEffect(() => scene.current ? suivreScene(scene.current, p => { pRef.current = p; dessiner.current(); setEtape(e => { const n = etapeDe(p, SEUILS_ROSACE); return n === e ? e : n; }); }) : undefined, []);
  useEffect(() => { dessiner.current(); }, [rosace]);
  useEffect(() => { const r = () => dessiner.current(); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []);

  /* le disque du compositeur règle la MÊME création que les rencontres : on peut revenir sur chaque choix */
  const modes: ModePoint[] = [
    ...DIMENSIONS.map((d): ModePoint => ({
      id: d.cle, nom: d.nom, icone: ICONES_DIM[d.cle], aide: `${d.question} ${c.choix[d.cle] === undefined ? "pas encore choisi" : d.reponses[sig[d.cle]][0]}`, groupe: "metier", ouvrir: () => {},
      enfants: () => d.reponses.map(([n, phrase], k): ModePoint => ({ id: `${d.cle}-${k}`, nom: n, aide: phrase, groupe: "metier", actif: c.choix[d.cle] === k, resteOuvert: true,
        ouvrir: () => creation.choisir(d.cle, k as Choix) })),
    })),
    { id: "recettes", nom: "Recettes", icone: <BookOpen aria-hidden="true" />, aide: "partir d’une des douze rosaces nommées", groupe: "creation", ouvrir: () => {},
      enfants: () => RECETTES.map((r): ModePoint => ({ id: "recette-" + r.code.slice(3, 8), nom: r.nom, aide: r.code, groupe: "creation", actif: r.code === code, resteOuvert: true,
        ouvrir: () => { const x = recetteDe(r.code); creation.recette(x.signature, x.graine); } })) },
    { id: "variation", nom: "Variation", icone: <Shuffle aria-hidden="true" />, aide: "la même recette, une autre graine", groupe: "creation", resteOuvert: true, ouvrir: () => creation.varier() },
    { id: "studio", nom: "Dans l’atelier", icone: <ExternalLink aria-hidden="true" />, aide: "regarder cette rosace dans le compositeur de l’atelier", groupe: "creation",
      ouvrir: () => { window.location.assign(import.meta.env.BASE_URL + "atelier?rosace=" + encodeURIComponent(code)); } },
  ];
  return <section ref={scene} id="ed-rosace" className="ed-scene ed-rosace" aria-labelledby="ed-rosace-titre" data-etape={etape}>
    <div className="ed-plateau">
      <div className="ed-texte">
        <p className="ed-num">{T.kicker}</p>
        <h2 id="ed-rosace-titre" tabIndex={-1}>{nbChoix(c) ? T.titreApres : T.titreAvant}</h2>
        <ol className="ed-phrases ed-phrases-5">{ETAPES_ROSACE.map((t, k) => <li key={t} aria-current={k === etape ? "step" : undefined}>{t}</li>)}</ol>
        <p className="ed-recette"><b>{nom ?? (nbChoix(c) ? "Ma rosace" : "Aperçu")}</b> <code>{code}</code> · {rosace.fils} fils DMC · {rosace.w} × {rosace.h} points{nbChoix(c) < 5 && <> · <i>{5 - nbChoix(c)} choix encore provisoires</i></>}</p>
      </div>
      <figure className="ed-toile-rosace">
        <canvas ref={toile} role="img" aria-label={`Votre rosace, par le moteur 5D : ${DIMENSIONS.map(d => (c.choix[d.cle] === undefined ? "provisoire " : "") + d.reponses[sig[d.cle]][0].toLowerCase()).join(", ")}. ${rosace.fils} fils.`} />
        <figcaption>{T.legende}</figcaption>
        <RencontreOrbe cle="densite" variante="curseur" sombre compacte />
      </figure>
      <div className="ed-scene-disque">
        <Disque contexte="edition-rosace" modes={modes} etiquette="Le Point du compositeur : revenir sur chaque choix de votre rosace" />
      </div>
    </div>
  </section>;
}

/* ——— Rencontre 2 · Les lignes : dans le disque, le même Point ——— */
function RencontreDisque() {
  const c = useCreation(), r = useRencontres()[1], modes = useCommandesTrace(), choisi = c.choix.trace;
  return <section id={r.id} className="or-rencontre or-sombre or-disque" aria-labelledby="or-lignes-titre" data-rencontre="trace">
    <div className="or-tete">
      <Orbe taille={64} parle={choisi === undefined} />
      <div><p className="or-kicker" id="or-lignes-titre">Rencontre {r.num} sur 5 · {r.titre}</p><p className="or-question">{r.question}</p>
        <p className="or-aide-disque">Touchez un secteur du disque, ou Tab puis les flèches et Entrée.</p></div>
    </div>
    <div className="or-disque-hote"><Disque contexte="edition-lignes" modes={modes} etiquette="Le Point : quatre lignes pour votre rosace" max={1.15} /></div>
    <p className="or-reaction" role="status" aria-live="polite">{choisi !== undefined ? r.reaction(reponseDe("trace", choisi)[0]) : ""}</p>
  </section>;
}

/* ——— 04 · Le nuage de fils : le disque devient nuancier ——— */
function Echeveau({ hex }: { hex: string }) {
  const { l } = hsl(hex);
  const ombre = `hsl(0 0% ${l > 0.6 ? 0 : 100}% / .22)`;
  return <svg className="ed-echeveau" viewBox="0 0 240 120" role="img" aria-label="Écheveau simulé">
    <defs><linearGradient id="ed-brin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset=".45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".28" /></linearGradient></defs>
    {Array.from({ length: 9 }, (_, k) => <path key={k} d={`M 14 ${44 + k * 4} C 70 ${20 + k * 7}, 170 ${100 - k * 7}, 226 ${44 + k * 4}`} fill="none" stroke={hex} strokeWidth="9" strokeLinecap="round" />)}
    {Array.from({ length: 9 }, (_, k) => <path key={"r" + k} d={`M 14 ${44 + k * 4} C 70 ${20 + k * 7}, 170 ${100 - k * 7}, 226 ${44 + k * 4}`} fill="none" stroke="url(#ed-brin)" strokeWidth="9" strokeLinecap="round" />)}
    <rect x="96" y="30" width="48" height="60" rx="6" fill="#f4f2ee" stroke={ombre} />
    <text x="120" y="66" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0b0b0c">DMC</text>
  </svg>;
}
function NuageFils() {
  const scene = useRef<HTMLElement>(null), nuage = useRef<HTMLCanvasElement>(null), pRef = useRef(mouvementReduit() ? 1 : 0);
  const [fil, setFil] = useState(() => Math.max(0, FLOSS.findIndex(f => f.code === "321")));
  const [etape, setEtape] = useState(0);
  const ordre = useMemo(() => { const m = filsParFamille(); return FAMILLES.flatMap(f => m.get(f.id) ?? []); }, []);
  const dessiner = useRef(() => {});
  dessiner.current = () => {
    const cv = nuage.current, ctx = cv?.getContext?.("2d"); if (!cv || !ctx) return;
    const W = cv.clientWidth || 600, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, W);
    const c = W / 2, montre = lisse(0.02, 0.55, pRef.current), n = ordre.length;
    ordre.forEach((idx, j) => {
      if (j / n > montre) return;
      const a = (j / n) * Math.PI * 2 - Math.PI / 2, anneauN = j % 5, R = W * (0.405 + anneauN * 0.017);
      const x = c + R * Math.cos(a), y = c + R * Math.sin(a), choisi = idx === fil;
      ctx.beginPath(); ctx.arc(x, y, choisi ? W * 0.013 : W * 0.0065, 0, Math.PI * 2); ctx.fillStyle = FLOSS[idx].hex; ctx.fill();
      if (choisi) { ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke(); }
    });
  };
  useEffect(() => scene.current ? suivreScene(scene.current, p => { pRef.current = p; dessiner.current(); setEtape(e => { const k = etapeDe(p, [0, 0.3, 0.55, 0.8]); return k === e ? e : k; }); }) : undefined, []);
  useEffect(() => { dessiner.current(); }, [fil]);
  useEffect(() => { const r = () => dessiner.current(); window.addEventListener("resize", r); return () => window.removeEventListener("resize", r); }, []);
  const parFamille = filsParFamille();
  const modes: ModePoint[] = FAMILLES.map((f): ModePoint => ({
    id: "famille-" + f.id, nom: f.nom, couleur: f.hex, aide: `${parFamille.get(f.id)?.length ?? 0} nuances DMC, du plus clair au plus foncé`, groupe: "metier", ouvrir: () => {},
    enfants: () => (parFamille.get(f.id) ?? []).map((i): ModePoint => ({ id: "dmc-" + FLOSS[i].code, nom: "DMC " + FLOSS[i].code, aide: FLOSS[i].name, couleur: FLOSS[i].hex, groupe: "metier", actif: i === fil, resteOuvert: true, ouvrir: () => setFil(i) })),
  }));
  const F = FLOSS[fil], famille = FAMILLES.find(x => x.id === familleDe(F.hex));
  const T = useContenus().fils, etapes = T.etapes;
  return <section ref={scene} id="ed-fils" className="ed-scene ed-fils" aria-labelledby="ed-fils-titre" data-etape={etape}>
    <div className="ed-plateau">
      <div className="ed-texte">
        <p className="ed-num">{T.kicker}</p>
        <h2 id="ed-fils-titre" tabIndex={-1}>{T.titre}</h2>
        <p className="ed-chapeau">{T.chapeau}</p>
        <ol className="ed-phrases">{etapes.map((t, k) => <li key={t} aria-current={k === etape ? "step" : undefined}>{t}</li>)}</ol>
      </div>
      <div className="ed-scene-disque ed-nuancier">
        <Disque max={1.1} contexte="edition-fils" modes={modes} etiquette="Le Point en nuancier : familles de couleurs, puis nuances DMC"><canvas ref={nuage} className="ed-nuage" aria-hidden="true" /></Disque>
      </div>
      <aside className="ed-fiche" aria-live="polite" aria-label="Le fil choisi">
        <span className="ed-pastille" style={{ background: F.hex }} aria-hidden="true" />
        <p className="ed-fiche-code">DMC {F.code}</p>
        <p className="ed-fiche-nom">{F.name}</p>
        <p className="ed-fiche-famille">{famille?.nom}</p>
        <Echeveau hex={F.hex} />
        <dl className="ed-fiche-valeurs">
          <div><dt>Écran</dt><dd><code>{F.hex.toUpperCase()}</code> · référence numérique sRGB, indicative</dd></div>
          <div><dt>Fil réel</dt><dd>photographie calibrée à venir ; l’écheveau ci-dessus est une simulation</dd></div>
        </dl>
      </aside>
    </div>
  </section>;
}

/** L'édition en ligne : la version publiée (ou l'aperçu d'une version, pour l'administration), sinon les textes d'origine. */
export function EditionEnLigne({ actions }: { actions: Actions }) {
  const { contenus, apercu, refus, bureau } = useContenusPublies();
  useSelectionBureau(bureau);
  return <>
    {(apercu || refus) && <p className="ed-apercu" role="status">{apercu
      ? <>Aperçu de la version {apercu.id} : elle n’est pas publiée.{apercu.ecarts ? ` ${apercu.ecarts} champ(s) refusé(s) par la validation montrent le texte d’origine.` : ""}</>
      : refus}</p>}
    <Edition actions={actions} contenus={contenus} />
  </>;
}

/** L'édition. contenus : la version publiée, déjà validée (validerContenus) ; sans elle, les textes d'origine. */
export default function Edition({ actions, contenus = ORIGINE }: { actions: Actions; contenus?: Contenus }) {
  return <ContexteContenus.Provider value={contenus}><Corps actions={actions} /></ContexteContenus.Provider>;
}

function Corps({ actions }: { actions: Actions }) {
  const fichier = useFichier(actions.importer), A = useContenus().appareils;
  return <div className="ed" data-edition="c">
    <Histoire Disque={Disque} actions={{ ouvrir: actions.ouvrir, visite: actions.visite, choisirFichier: fichier.choisir, aller }}
      objet={<div className="hi-objet"><Appareil type="ipad" src={adresse(A.ipad.src)} alt={A.ipad.alt} /></div>} entre={{
      "hi-indiennes": <RencontreOrbe cle="structure" variante="cartes" />,
      "hi-mulhouse": <RencontreDisque />,
      "hi-brodeuses": <RencontreOrbe cle="echelle" variante="loupes" />,
    }} />
    <NuageFils />
    <RencontreOrbe cle="palette" variante="echeveaux" />
    <RosaceNait />
    <Cadeau aller={aller} appareils={<div className="cd-appareils">
      <Appareil type="ordinateur" src={adresse(A.ordinateur.src)} alt={A.ordinateur.alt} />
      <Appareil type="iphone" src={adresse(A.iphone.src)} alt={A.iphone.alt} className="cd-iphone" />
      <p className="cd-appareils-legende">{A.legende}</p>
    </div>} />
    <MaRosace aller={aller} guide={actions.visite} />
    {fichier.champ}
  </div>;
}

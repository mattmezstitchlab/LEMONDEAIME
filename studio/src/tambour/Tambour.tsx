/**
 * Le Tambour vivant, lot A : Caméra → Broderie (preuve de concept privée, branche tambour-vivant).
 * « Je filme une fleur, elle apparaît dans le tambour, en points de croix. » Je règle les couleurs, j'échange un fil,
 * je fige, puis « Broder ce motif » ouvre l'ouvrage dans l'atelier (avec sa photo), et il rejoint Mes ouvrages.
 * Tout reste sur l'appareil : ni l'image ni le motif ne sont envoyés. Sans caméra (refus, absence), une photo suffit.
 * L'aperçu est une simulation : les couleurs à l'écran ne sont pas celles du fil réel.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import PointDuBloc from "../components/point/PointDuBloc";
import { ouvrirConfort } from "../components/point/Point";
import "../components/blocs/tambour";
import "../components/blocs/superposition";
import type { ContexteSuperposition } from "../components/blocs/superposition";
import Calque from "./Calque";
import { getProject, listProjects } from "../lib/library";
import type { Pattern } from "../lib/pattern";
import { coinsInitiaux, type Pt } from "../lib/tambour/homographie";
import { ecrireCoins, lireCoins, resteAFaire, type AffichageSuperpose } from "../lib/tambour/superposition";
import type { ContexteTambour, VueTambour } from "../components/blocs/tambour";
import { FLOSS } from "../lib/dmc";
import { PHRASES_CAMERA, useCamera } from "../lib/tambour/camera";
import { carreCentre, ConvertisseurVivant, DerniereImage, echanger, filsParPresence, voisins, type Grille } from "../lib/tambour/vivant";
import { deposer, motifDuTambour } from "../lib/tambour/capture";
import "../design/aime.css";
import "../design/aime-composants.css";
import "./Tambour.css";

type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
const BASE = import.meta.env.BASE_URL;
const PERIODE = 300;   /* un calcul toutes les 300 ms au plus : l'aperçu n'est pas du 60 images par seconde */
const TOILE = "#f4f1ea";

const dims = (s: Source) => s instanceof HTMLVideoElement ? { w: s.videoWidth, h: s.videoHeight } : s instanceof HTMLImageElement ? { w: s.naturalWidth, h: s.naturalHeight } : { w: s.width, h: s.height };
/** le carré centré de la source, dessiné à la taille demandée */
function carre(s: Source, cote: number, dest?: HTMLCanvasElement) {
  const { w, h } = dims(s), c = dest ?? document.createElement("canvas");
  c.width = cote; c.height = cote;
  const x = c.getContext("2d", { willReadFrequently: true }); if (!x || !w || !h) return null;
  const q = carreCentre(w, h); x.imageSmoothingQuality = "high"; x.drawImage(s, q.sx, q.sy, q.cote, q.cote, 0, 0, cote, cote);
  return c;
}
/** les points de croix d'une grille : deux diagonales par case, sur une toile claire */
function dessinerPoints(g: Grille, c: HTMLCanvasElement, px: number) {
  c.width = g.w * px; c.height = g.h * px;
  const x = c.getContext("2d"); if (!x) return;
  x.fillStyle = TOILE; x.fillRect(0, 0, c.width, c.height);
  x.lineCap = "round"; x.lineWidth = px * .3; const m = px * .2;
  for (let i = 0; i < g.cross.length; i++) {
    const f = g.cross[i]; if (f < 0) continue;
    const cx = (i % g.w) * px, cy = Math.floor(i / g.w) * px;
    x.strokeStyle = FLOSS[f]?.hex ?? "#888"; x.beginPath();
    x.moveTo(cx + m, cy + m); x.lineTo(cx + px - m, cy + px - m); x.moveTo(cx + px - m, cy + m); x.lineTo(cx + m, cy + px - m); x.stroke();
  }
}

/* le thème suit l'atelier (Jour ou Nuit, d'après le Confort) */
function useTheme() {
  const lire = () => document.documentElement.getAttribute("data-aime-studio") === "nuit" ? "nuit" : "jour";
  const [t, setT] = useState(lire);
  useEffect(() => { const o = new MutationObserver(() => setT(lire())); o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-aime-studio"] }); return () => o.disconnect(); }, []);
  return t;
}

export default function Tambour() {
  const theme = useTheme();
  const { video, etat, demarrer, arreter } = useCamera();
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [vue, setVue] = useState<VueTambour>("points");
  const [couleurs, setCouleurs] = useState(8), [cote, setCote] = useState(64);
  const [echanges, setEchanges] = useState<Map<number, number>>(new Map());
  const [figee, setFigee] = useState<HTMLCanvasElement | null>(null);
  const [grille, setGrille] = useState<Grille | null>(null);
  const [annonce, setAnnonce] = useState(""), [envoi, setEnvoi] = useState(false);
  const ecran = useRef<HTMLCanvasElement>(null), cadre = useRef<HTMLDivElement>(null), fichier = useRef<HTMLInputElement>(null);
  const points = useRef<HTMLCanvasElement | null>(null), petit = useRef<HTMLCanvasElement | null>(null);
  const reglage = useRef({ couleurs, cote }); reglage.current = { couleurs, cote };
  useEffect(() => { document.title = "Le Tambour vivant · Point Zéro"; }, []);
  /* deux usages : créer depuis la caméra (lot A), ou superposer un patron à la vraie toile (lot B, « ?mode=superposer ») */
  const [mode, setMode] = useState<"creer" | "superposer">(() => { try { return new URLSearchParams(window.location.search).get("mode") === "superposer" ? "superposer" : "creer"; } catch { return "creer"; } });
  const changerMode = (m: "creer" | "superposer") => {
    setMode(m); setFigee(null);
    try { const u = new URL(window.location.href); if (m === "superposer") u.searchParams.set("mode", "superposer"); else u.searchParams.delete("mode"); window.history.replaceState(window.history.state, "", u.pathname + u.search); } catch { /* rien */ }
    dire(m === "superposer" ? "Superposer un patron : filmez votre toile, puis alignez les quatre coins du patron sur elle." : "Créer depuis la caméra : ce que vous filmez devient du point de croix.");
  };
  const [ouvrages, setOuvrages] = useState<{ id: string; nom: string }[]>([]);
  const [patron, setPatron] = useState<(Pattern & { cle: string }) | null>(null);
  const [affichage, setAffichage] = useState<AffichageSuperpose>("aplats"), [couleurActive, setCouleurActive] = useState<number | null>(null);
  const [opacite, setOpacite] = useState(50), [aFaire, setAFaire] = useState(false);
  const [coins, setCoins] = useState<Pt[]>(() => coinsInitiaux(1, 1));
  const choisirPatron = useCallback(async (id: string) => {
    const r = (await listProjects()).find(x => x.id === id); if (!r) return;
    let p: Pattern | null = null; try { p = getProject(r); } catch { p = null; }
    if (!p) { setAnnonce("Cet ouvrage n’a pas pu être ouvert."); return; }
    setPatron({ ...p, cle: id }); setCoins(lireCoins(id) ?? coinsInitiaux(p.w, p.h)); setCouleurActive(p.palette[0] ?? null);
    setAnnonce(`Patron posé : ${r.name}, ${p.w} × ${p.h} points. Glissez ses quatre coins sur ceux de votre toile.`);
  }, []);
  /* en entrant dans Superposer : Mes ouvrages (le plus récent est posé d'office) */
  useEffect(() => {
    if (mode !== "superposer") return;
    let vivant = true;
    void listProjects().then(l => { if (!vivant) return; const tries = [...l].sort((a, b) => b.updated - a.updated); setOuvrages(tries.map(r => ({ id: r.id, nom: r.name || "Sans titre" })));
      /* « ?ouvrage=<id> » (depuis l'atelier : Sur ma toile) pose cet ouvrage ; sinon le plus récent */
      let voulu: string | null = null; try { voulu = new URLSearchParams(window.location.search).get("ouvrage"); } catch { /* rien */ }
      const choix = (voulu && tries.find(r => r.id === voulu)) || tries[0];
      if (!patron && choix) void choisirPatron(choix.id); }).catch(() => setOuvrages([]));
    return () => { vivant = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  /* l'alignement est retenu pour cet ouvrage, sur cet appareil */
  useEffect(() => { if (patron) { const t = window.setTimeout(() => ecrireCoins(patron.cle, coins), 400); return () => window.clearTimeout(t); } }, [coins, patron]);

  /* la source du moment : l'image figée, sinon la caméra, sinon la photo choisie */
  const source = (): Source | null => figee ?? (etat === "active" && video.current && video.current.videoWidth ? video.current : photo);
  const sourceRef = useRef(source); sourceRef.current = source;
  const aSource = !!(figee || etat === "active" || photo);

  /* le convertisseur de la séance : un seul worker, la dernière image gagne */
  const conv = useRef<ConvertisseurVivant | null>(null);
  useEffect(() => { const c = new ConvertisseurVivant(); conv.current = c; return () => { c.fermer(); if (conv.current === c) conv.current = null; }; }, []);
  const file = useMemo(() => new DerniereImage<{ px: Uint8ClampedArray; cote: number; couleurs: number }, Grille>(
    t => (conv.current ?? (conv.current = new ConvertisseurVivant())).convertir(t.px, t.cote, t.cote, { maxColors: t.couleurs, dropWhite: false, confetti: true, pixelArt: false }), setGrille), []);
  const calculer = useCallback(() => {
    const s = sourceRef.current(); if (!s) return;
    const { cote: n, couleurs: k } = reglage.current;
    const c = carre(s, n, petit.current ?? (petit.current = document.createElement("canvas"))); if (!c) return;
    const px = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, n, n).data;
    file.soumettre({ px, cote: n, couleurs: k });
  }, [file]);
  /* en direct : quelques calculs par seconde, tant que la caméra filme et que rien n'est figé */
  useEffect(() => {
    if (etat !== "active" || figee || mode === "superposer") return;
    const t = window.setInterval(calculer, PERIODE); return () => window.clearInterval(t);
  }, [etat, figee, calculer, mode]);
  /* une image fixe (photo, image figée) ou un réglage changé : on recalcule une fois */
  useEffect(() => { if (mode === "creer") calculer(); }, [photo, figee, couleurs, cote, calculer, mode]);

  /* ce qu'on montre : la grille avec les fils échangés */
  const montree = useMemo(() => grille ? echanger(grille, echanges) : null, [grille, echanges]);
  useEffect(() => { if (!montree) return; dessinerPoints(montree, points.current ?? (points.current = document.createElement("canvas")), 8); }, [montree]);
  /* le dessin dans le tambour : la photo en continu, les points à chaque nouveau calcul */
  useEffect(() => {
    let raf = 0;
    const dessiner = () => {
      const c = ecran.current, s = sourceRef.current(); raf = requestAnimationFrame(dessiner);
      if (!c) return;
      const n = 640; if (c.width !== n) { c.width = n; c.height = n; }
      const x = c.getContext("2d"); if (!x) return;
      x.fillStyle = TOILE; x.fillRect(0, 0, n, n);
      const pts = points.current && montree ? points.current : null;
      const v = mode === "superposer" ? "photo" : vue;
      if (v === "photo" || v === "comparer") { if (s) { const { w, h } = dims(s), q = carreCentre(w, h); if (w && h) x.drawImage(s, q.sx, q.sy, q.cote, q.cote, 0, 0, n, n); } }
      if (v === "points" && pts) { x.imageSmoothingEnabled = true; x.drawImage(pts, 0, 0, n, n); }
      if (v === "comparer" && pts) { x.drawImage(pts, pts.width / 2, 0, pts.width / 2, pts.height, n / 2, 0, n / 2, n); x.fillStyle = "rgba(255,255,255,.9)"; x.fillRect(n / 2 - 1, 0, 2, n); }
    };
    dessiner(); return () => cancelAnimationFrame(raf);
  }, [vue, montree, mode]);

  /* le Cadre publie sa place : le Point du bloc s'y pose */
  useLayoutEffect(() => {
    const el = cadre.current; if (!el) return;
    const publier = () => { const r = el.getBoundingClientRect();
      el.style.setProperty("--fx0", r.left + "px"); el.style.setProperty("--fy0", r.top + "px"); el.style.setProperty("--fw", r.width + "px"); el.style.setProperty("--fh", r.height + "px"); };
    publier(); window.addEventListener("resize", publier); window.addEventListener("scroll", publier, true);
    return () => { window.removeEventListener("resize", publier); window.removeEventListener("scroll", publier, true); };
  });

  const dire = (t: string) => setAnnonce(t);
  useEffect(() => { if (etat !== "repos") dire(PHRASES_CAMERA[etat]); }, [etat]);
  const basculerCamera = () => { if (etat === "active") { arreter(); dire("Caméra fermée."); } else { setFigee(null); void demarrer(); } };
  const figer = () => {
    if (figee) { setFigee(null); dire(etat === "active" ? "Retour à l’image en direct." : "Image libérée."); return; }
    const s = source(); if (!s) { dire("Il n’y a pas encore d’image à figer."); return; }
    const { w, h } = dims(s), c = carre(s, Math.min(900, Math.min(w, h))); if (!c) return;
    setFigee(c); dire("Image figée : réglez les couleurs et les fils tranquillement.");
  };
  const capturer = async () => {
    const s = source(); if (!s) { dire("Il faut d’abord une image : ouvrez la caméra, ou choisissez une photo."); return; }
    const { w, h } = dims(s), c = figee ?? carre(s, Math.min(900, Math.min(w, h))); if (!c) return;
    setEnvoi(true); dire("Préparation de l’ouvrage…");
    try {
      const p = await motifDuTambour(c, { cote, couleurs, echanges });
      if (!deposer(p)) { setEnvoi(false); dire("Le navigateur refuse de garder l’ouvrage le temps d’ouvrir l’atelier. Essayez de libérer de la place, ou un autre navigateur."); return; }
      arreter(); window.location.href = BASE + "atelier?tambour=1";
    } catch { setEnvoi(false); dire("La conversion n’a pas abouti. Réessayez avec moins de détail."); }
  };
  const charger = async (f: File) => {
    try { const img = new Image(); img.src = URL.createObjectURL(f); await img.decode(); arreter(); setFigee(null); setPhoto(img); dire(`Photo choisie : ${f.name}.`); }
    catch { dire("Ce fichier n’a pas pu être lu comme une image."); }
  };

  const fils = useMemo(() => montree ? filsParPresence(montree).map(x => x.fil) : [], [montree]);
  const contexte: ContexteTambour = {
    camera: etat, basculerCamera, aSource,
    vue, afficher: v => { setVue(v); dire(v === "points" ? "Vue : points de croix." : v === "photo" ? "Vue : photo." : "Vue : la photo à gauche, les points à droite."); },
    couleurs, choisirCouleurs: n => { setCouleurs(n); dire(`${n} couleurs au plus.`); },
    cote, choisirCote: n => { setCote(n); dire(`${n} × ${n} points.`); },
    fils, voisins: f => voisins(f, 8),
    echanger: (de, vers) => { setEchanges(m => { const n = new Map(m); for (const [k, v] of n) if (v === de) n.set(k, vers); if (!n.has(de)) n.set(de, vers); return n; }); dire(`DMC ${FLOSS[de]?.code} remplacé par DMC ${FLOSS[vers]?.code} · ${FLOSS[vers]?.name}.`); },
    echanges: echanges.size, annulerEchanges: () => { setEchanges(new Map()); dire("Fils d’origine."); },
    fige: !!figee, figer, capturer: () => void capturer(), importer: () => fichier.current?.click(), superposer: () => changerMode("superposer"),
  };
  const reste = useMemo(() => patron ? resteAFaire(patron, affichage === "couleur" ? couleurActive : null) : 0, [patron, affichage, couleurActive]);
  const options = useMemo(() => ({ affichage, couleur: couleurActive, aFaire }), [affichage, couleurActive, aFaire]);
  const contexteSup: ContexteSuperposition = {
    camera: etat, basculerCamera, patron: patron ? { id: patron.cle, nom: patron.name || "Sans titre" } : null, ouvrages, choisirPatron: id => void choisirPatron(id),
    affichage, afficher: a => { setAffichage(a); dire(a === "aplats" ? "Patron en aplats." : a === "symboles" ? "Patron en symboles." : a === "grille" ? "La grille seule." : "Une seule couleur."); },
    palette: patron ? [...new Set(Array.from(patron.cross).filter(f => f >= 0))] : [], couleur: couleurActive,
    choisirCouleur: f => { setCouleurActive(f); setAffichage("couleur"); dire(`Seulement DMC ${FLOSS[f]?.code} · ${FLOSS[f]?.name}.`); },
    opacite, choisirOpacite: o => { setOpacite(o); dire(`Opacité ${o} %.`); },
    aFaire, basculerAFaire: () => { setAFaire(v => !v); dire(aFaire ? "Tous les points du patron." : "Seulement les points qui restent à broder."); }, reste,
    reinitialiserCoins: () => { if (patron) { setCoins(coinsInitiaux(patron.w, patron.h)); dire("Patron recentré dans le tambour."); } },
    fige: !!figee, figer, creer: () => changerMode("creer"),
  };
  const etatSup = [aSource ? (figee ? "image figée" : etat === "active" ? "caméra en direct" : "photo") : "pas encore d’image",
    patron ? `patron « ${patron.name || "Sans titre"} » ${patron.w} × ${patron.h}` : "aucun patron",
    { aplats: "aplats", symboles: "symboles", grille: "grille seule", couleur: couleurActive !== null ? `DMC ${FLOSS[couleurActive]?.code} seul` : "une couleur" }[affichage],
    `opacité ${opacite} %`, aFaire ? `${reste} points à faire` : ""].filter(Boolean).join(" · ");
  const etatTexte = mode === "superposer" ? etatSup : [aSource ? (figee ? "image figée" : etat === "active" ? "caméra en direct" : "photo") : "pas encore d’image",
    `${cote} × ${cote} points`, `${montree ? fils.length : 0} fils DMC (${couleurs} au plus)`, echanges.size ? `${echanges.size} fil${echanges.size > 1 ? "s" : ""} échangé${echanges.size > 1 ? "s" : ""}` : "",
    vue === "points" ? "vue points" : vue === "photo" ? "vue photo" : "vue comparée"].filter(Boolean).join(" · ");

  return <div className="tb" data-aime={theme}>
    <a href="#tb-confort" className="lp-evitement" onClick={e => { e.preventDefault(); ouvrirConfort(); }}>Aller au Confort</a>
    <header className="tb-tete">
      <a className="tb-marque" href={BASE + "atelier"}><span className="aime-point" aria-hidden="true" />Point Zéro</a>
      <a className="tb-retour" href={BASE + "atelier"}>L’atelier</a>
    </header>
    <main className="tb-scene">
      <div className="tb-titre">
        {mode === "superposer" ? <><p className="tb-sur">Essai privé · Superposer un patron</p>
          <h1>Votre toile, <span>le patron posé dessus.</span></h1></>
        : <><p className="tb-sur">Essai privé · Tambour vivant</p>
          <h1>Le monde, <span>en points de croix.</span></h1></>}
      </div>
      <div ref={cadre} className={"tb-tambour" + (envoi ? " tb-envoi" : "")} data-bloc="tambour">
        <canvas ref={ecran} className="tb-toile" role="img" aria-label={`Le tambour : ${etatTexte}.`} />
        <video ref={video} className="tb-video" playsInline muted aria-hidden="true" />
        {mode === "superposer" && patron && <Calque patron={patron} options={options} opacite={opacite} coins={coins} changer={setCoins} dire={dire} />}
        {!aSource && <div className="tb-invite">
          <button type="button" className="tb-ouvrir" onClick={() => void demarrer()}><Camera aria-hidden="true" /> {mode === "superposer" ? "Filmer ma toile" : "Ouvrir la caméra"}</button>
          <button type="button" className="tb-lien" onClick={() => fichier.current?.click()}>{mode === "superposer" ? "ou une photo de ma toile" : "ou choisir une photo"}</button>
        </div>}
        {etat === "active" && !figee && <span className="tb-direct" aria-hidden="true">● En direct</span>}
      </div>
      <p className="tb-etat" data-tambour="etat">{etatTexte}</p>
      <p className="tb-note">{etat === "refusee" || etat === "indisponible" ? PHRASES_CAMERA[etat]
        : mode === "superposer" ? (ouvrages.length ? "Posez le téléphone (ou figez l’image), puis glissez les quatre coins du patron sur ceux de votre toile. L’image reste sur votre appareil ; c’est une superposition à l’écran, pas une projection sur le tissu." : "Aucun ouvrage dans Mes ouvrages pour l’instant : créez ou importez un motif dans l’atelier, puis revenez.")
        : "L’image reste sur votre appareil. Les couleurs à l’écran sont une simulation : le fil réel peut différer."}</p>
    </main>
    <input ref={fichier} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" aria-label="Choisir une photo (PNG, JPEG, WebP)"
      onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void charger(f); }} />
    {mode === "superposer"
      ? <PointDuBloc<ContexteSuperposition> key="sup" type="superposition" nom="Superposition" selecteur=".tb-tambour" obstacles=".tb-etat, .tb-tete, .tb-titre" contexte={contexteSup}
          centre={{ nom: etat === "active" ? "Fermer la caméra" : "Caméra", aide: "le centre du Point ouvre ou ferme la caméra", actif: etat === "active", icone: <Camera aria-hidden="true" />, ouvrir: basculerCamera }} />
      : <PointDuBloc<ContexteTambour> key="creer" type="tambour" nom="Tambour" selecteur=".tb-tambour" obstacles=".tb-etat, .tb-tete, .tb-titre" contexte={contexte}
          centre={{ nom: etat === "active" ? "Fermer la caméra" : "Caméra", aide: "le centre du Point ouvre ou ferme la caméra", actif: etat === "active", icone: <Camera aria-hidden="true" />, ouvrir: basculerCamera }} />}
    <span className="sr-only" role="status" aria-live="polite">{annonce}</span>
  </div>;
}

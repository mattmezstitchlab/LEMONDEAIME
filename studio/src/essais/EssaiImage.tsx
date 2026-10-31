/**
 * Essai privé : un bloc Image dans un Cadre, piloté par le même Point que la broderie.
 * Pas de nouvelle application : la même page du studio, le même Point (noyau, Confort, présentations, Favoris),
 * un autre type de bloc dans le registre. L'atelier de broderie n'est pas monté, et ses outils ne sont pas dupliqués.
 * Toutes les commandes agissent vraiment sur l'image (canvas) ; rien n'est enregistré ailleurs que sur l'appareil.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PointDuBloc from "../components/point/PointDuBloc";
import { ouvrirConfort } from "../components/point/Point";
import { REGLAGES_NEUTRES, type Cadrage, type ContexteImage, type Fond, type FormatExport, type ReglagesImage } from "../components/blocs/image";
import "../components/blocs/image";
import "./EssaiImage.css";

type Source = HTMLCanvasElement | HTMLImageElement | ImageBitmap;
const dims = (s: Source) => ({ w: "naturalWidth" in s ? s.naturalWidth : s.width, h: "naturalHeight" in s ? s.naturalHeight : s.height });

/** Une image d'exemple dessinée sur place (aucun fichier à charger) : un paysage simple, assez coloré pour voir chaque réglage. */
function exemple(): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = 960; c.height = 640;
  const x = c.getContext("2d"); if (!x) return c;
  const ciel = x.createLinearGradient(0, 0, 0, 420); ciel.addColorStop(0, "#7fb6e6"); ciel.addColorStop(1, "#f6d7b0");
  x.fillStyle = ciel; x.fillRect(0, 0, 960, 640);
  x.fillStyle = "#f6b23c"; x.beginPath(); x.arc(700, 190, 70, 0, Math.PI * 2); x.fill();
  const colline = (y: number, a: number, couleur: string) => { x.fillStyle = couleur; x.beginPath(); x.moveTo(0, y);
    for (let i = 0; i <= 960; i += 40) x.lineTo(i, y - a * Math.sin(i / 150 + y)); x.lineTo(960, 640); x.lineTo(0, 640); x.fill(); };
  colline(430, 40, "#5f9f58"); colline(500, 30, "#3f7d47"); colline(580, 20, "#2e5e38");
  const fleurs = ["#e8455a", "#f3d34a", "#ffffff", "#c76bd6", "#ff8a3d"];
  for (let i = 0; i < 70; i++) { x.fillStyle = fleurs[i % fleurs.length]; x.beginPath(); x.arc((i * 997 + i * i * 31) % 960, 560 + ((i * 53) % 70), 5 + (i % 3), 0, Math.PI * 2); x.fill(); }
  return c;
}

/** Le plus grand rectangle centré au format demandé. */
export function rectCadrage(w: number, h: number, c: Cadrage) {
  if (c === "original") return { x: 0, y: 0, w, h };
  const [a, b] = c.split(":").map(Number), r = a / b;
  const cw = Math.min(w, Math.round(h * r)), ch = Math.min(h, Math.round(cw / r));
  return { x: Math.round((w - cw) / 2), y: Math.round((h - ch) / 2), w: cw, h: ch };
}
export const filtreCss = (r: ReglagesImage) =>
  `brightness(${1 + r.luminosite / 100}) contrast(${1 + r.contraste / 100}) saturate(${r.saturation / 100})${r.nb ? " grayscale(1)" : ""}${r.sepia ? " sepia(1)" : ""}`;

export default function EssaiImage() {
  const [source, setSource] = useState<Source | null>(null);
  const [nom, setNom] = useState("paysage d’exemple");
  const [choisie, setChoisie] = useState(false);
  const [cadrage, setCadrage] = useState<Cadrage>("original");
  const [reglages, setReglages] = useState<ReglagesImage>(REGLAGES_NEUTRES);
  const [echelle, setEchelle] = useState(100);
  const [vue, setVue] = useState<"ajuste" | "reel">("ajuste");
  const [tiers, setTiers] = useState(false);
  const [fond, setFond] = useState<Fond>("clair");
  const [annonce, setAnnonce] = useState("");
  const toile = useRef<HTMLCanvasElement>(null);
  const cadre = useRef<HTMLDivElement>(null);
  const fichier = useRef<HTMLInputElement>(null);
  useEffect(() => { setSource(exemple()); document.title = "Essai · bloc Image · Point Zéro"; }, []);

  const d = source ? dims(source) : { w: 960, h: 640 };
  const rc = useMemo(() => rectCadrage(d.w, d.h, cadrage), [d.w, d.h, cadrage]);
  const taille = useCallback((e: number) => ({ w: Math.max(1, Math.round(rc.w * e / 100)), h: Math.max(1, Math.round(rc.h * e / 100)) }), [rc]);
  const sortie = taille(echelle);

  /* le rendu : l'image recadrée, réglée, à sa taille de sortie */
  useEffect(() => {
    const c = toile.current; if (!c || !source) return;
    c.width = sortie.w; c.height = sortie.h;
    const x = c.getContext("2d"); if (!x) return;
    x.clearRect(0, 0, c.width, c.height);
    x.filter = filtreCss(reglages);
    x.drawImage(source as CanvasImageSource, rc.x, rc.y, rc.w, rc.h, 0, 0, sortie.w, sortie.h);
    x.filter = "none";
  }, [source, rc, sortie.w, sortie.h, reglages]);

  /* le Cadre publie sa place (comme le Cadre de la broderie) : le Point du bloc s'y pose */
  useLayoutEffect(() => {
    const el = cadre.current; if (!el) return;
    const publier = () => { const r = el.getBoundingClientRect();
      el.style.setProperty("--fx0", r.left + "px"); el.style.setProperty("--fy0", r.top + "px"); el.style.setProperty("--fw", r.width + "px"); el.style.setProperty("--fh", r.height + "px"); };
    publier(); window.addEventListener("resize", publier); window.addEventListener("scroll", publier, true);
    return () => { window.removeEventListener("resize", publier); window.removeEventListener("scroll", publier, true); };
  });

  const dire = (t: string) => setAnnonce(t);
  const exporter = (f: FormatExport) => {
    const c = toile.current; if (!c) return;
    const type = "image/" + f, fichierNom = `image-essai-${sortie.w}x${sortie.h}.${f === "jpeg" ? "jpg" : f}`;
    if (!c.toBlob) { dire("L’export n’est pas possible dans ce navigateur."); return; }
    c.toBlob(b => {
      if (!b) { dire("L’export a échoué."); return; }
      const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fichierNom; a.dataset.essaiExport = f;
      document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      dire(`Image exportée : ${fichierNom}.`);
    }, type, 0.92);
  };
  const charger = async (f: File) => {
    try {
      const img = new Image(); img.src = URL.createObjectURL(f); await img.decode();
      setSource(img); setNom(f.name); setCadrage("original"); setEchelle(100); dire(`Image importée : ${f.name}, ${img.naturalWidth} × ${img.naturalHeight} px.`);
    } catch { dire("Ce fichier n’a pas pu être lu comme une image."); }
  };

  const contexte: ContexteImage = {
    cadrage, recadrer: c => { setCadrage(c); dire(`Recadrage : ${c === "original" ? "l’image entière" : c}.`); },
    reglages, regler: r => setReglages(v => ({ ...v, ...r })), reinitialiser: () => { setReglages(REGLAGES_NEUTRES); dire("Couleurs d’origine."); },
    echelle, redimensionner: e => { setEchelle(e); const t = taille(e); dire(`Taille de sortie : ${t.w} × ${t.h} px.`); }, taille,
    vue, afficher: setVue, tiers, basculerTiers: () => setTiers(v => !v), fond, choisirFond: setFond,
    exporter, importer: () => fichier.current?.click(),
  };
  const sel = () => { if (!choisie) { setChoisie(true); dire("Image sélectionnée : son Point est posé au bord du cadre."); } };
  const etat = [`${nom}`, `${sortie.w} × ${sortie.h} px`, cadrage === "original" ? "image entière" : "recadrée " + cadrage,
    reglages.luminosite ? "luminosité " + (reglages.luminosite > 0 ? "+" : "") + reglages.luminosite : "", reglages.contraste ? "contraste " + (reglages.contraste > 0 ? "+" : "") + reglages.contraste : "",
    reglages.saturation !== 100 ? "saturation " + reglages.saturation + " %" : "", reglages.nb ? "noir et blanc" : "", reglages.sepia ? "sépia" : "",
    vue === "reel" ? "taille réelle" : "ajustée", tiers ? "grille des tiers" : "", "fond " + fond].filter(Boolean).join(" · ");

  return <div className="ei">
    <a href="#ei-confort" className="lp-evitement" onClick={e => { e.preventDefault(); ouvrirConfort(); }}>Aller au Confort</a>
    <header className="ei-tete">
      <p className="ei-marque">Point Zéro <span>· essai privé</span></p>
      <h1>Un bloc Image, le même Point</h1>
      <a className="ei-retour" href={import.meta.env.BASE_URL + "atelier"}>Retour à l’atelier</a>
    </header>
    <main className="ei-scene" onPointerDown={e => { if (e.target === e.currentTarget) setChoisie(false); }}>
      <div ref={cadre} className={"ei-cadre" + (choisie ? " ei-choisi" : "") + " ei-fond-" + fond + (vue === "reel" ? " ei-reel" : "")} data-bloc="image"
        role="button" tabIndex={0} aria-pressed={choisie} aria-label={`Bloc Image : ${etat}. ${choisie ? "Sélectionné ; son Point est au bord du cadre." : "Entrée pour le sélectionner."}`}
        onClick={sel} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sel(); } if (e.key === "Escape") setChoisie(false); }}>
        <div className="ei-vue"><canvas ref={toile} className="ei-toile" aria-hidden="true" /></div>
        {tiers && <svg className="ei-tiers" viewBox="0 0 3 3" preserveAspectRatio="none" aria-hidden="true"><path d="M1 0V3M2 0V3M0 1H3M0 2H3" /></svg>}
        {choisie && <>{["nw", "ne", "sw", "se"].map(k => <span key={k} className={"ei-poignee ei-" + k} aria-hidden="true" />)}</>}
      </div>
      <p className="ei-etat" data-essai="etat">{etat}</p>
      {!choisie && <p className="ei-consigne">Sélectionnez l’image (clic, ou Tab puis Entrée) : son Point apparaît au bord du cadre.</p>}
    </main>
    <input ref={fichier} type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" aria-label="Importer une image (PNG, JPEG, WebP)"
      onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void charger(f); }} />
    {choisie && <PointDuBloc<ContexteImage> type="image" nom={nom} selecteur=".ei-cadre" obstacles=".ei-etat, .ei-tete" contexte={contexte} />}
    <span className="sr-only" role="status" aria-live="polite">{annonce}</span>
  </div>;
}

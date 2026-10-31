/**
 * « Vivre LUMIERE » : le film en version complète (le chapitre « La Fleur du Ciel », 4 min 13), ou l'animatique.
 * Lecture, pause, scènes, navigation, reprise là où l'on s'était arrêté. La musique se lance sur le geste « Lecture ».
 * Jamais imposé : on entre dans .0NE à tout moment (« Quitter »). Le repère de l'impact (03:18.255) est marqué sur la barre.
 * Mouvement réduit : une image par scène, sans animation ; la musique et le temps continuent.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { dureeMontage, filmDuRepere, placer, verifier, type Montage } from "../../lib/cinema/montage";
import { ANIMATIQUE, CHAPITRE_FLEUR, CLIP_FLEUR, FILM_FLEUR, PREVIZ_IMPACT } from "./montages";
import { journal, Lecteur } from "./lecteur";
import { mouvementReduit, webglDisponible } from "./Film";
import "../../design/aime.css";
import "./film.css";

const BASE = import.meta.env.BASE_URL;
const AUDIO_COMPLET = { url: BASE + "lumiere-prive/fleur-du-ciel.m4a", morceau: "fleur-du-ciel", debut: 0, fin: 253 };
const VERSIONS: { id: string; nom: string; montage: Montage }[] = [
  { id: "clip", nom: "La Fleur du Ciel · le clip · 4 min 13", montage: CLIP_FLEUR },
  { id: "chapitre", nom: "Première version · 4 min 13", montage: CHAPITRE_FLEUR },
  { id: "animatique", nom: "Animatique · 44 s (archive : la goutte dans l'eau)", montage: ANIMATIQUE },
  { id: "film", nom: "Le film · séquencier de 31 plans (prévisualisation)", montage: FILM_FLEUR },
  { id: "previz", nom: "Prévisualisation · 03:14 → 03:26 (l'impact)", montage: PREVIZ_IMPACT },
];
const cleReprise = (id: string) => "lumiere:reprise:" + id;
const lire = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* navigation privée */ } };
const mmss = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

export default function Vivre() {
  const params = new URLSearchParams(window.location.search);
  const controle = params.has("controle");
  const [versionId, setVersionId] = useState(VERSIONS.some(v => v.id === params.get("version")) ? params.get("version")! : "clip");
  const version = VERSIONS.find(v => v.id === versionId)!;
  const duree = dureeMontage(version.montage);
  const places = useMemo(() => placer(version.montage).filter(p => p.piste === "video"), [version]);
  const impact = filmDuRepere(version.montage, "fleur-du-ciel:impact") ?? 0;
  const [t, setT] = useState(0), [lecture, setLecture] = useState(false), [son, setSon] = useState(true), [demarre, setDemarre] = useState(false);
  const [scenes, setScenes] = useState(false), [visible, setVisible] = useState(true), [musique, setMusique] = useState<"?" | "oui" | "non">("?");
  const reprise = useMemo(() => { const v = +(lire(cleReprise(version.montage.id)) ?? 0); return v > 3 && v < duree - 3 ? v : 0; }, [version, duree]);
  const toile = useRef<HTMLCanvasElement>(null), calque = useRef<HTMLCanvasElement>(null), video = useRef<HTMLVideoElement>(null), cadre = useRef<HTMLDivElement>(null);
  const lecteur = useRef<Lecteur | null>(null), affiche = useRef(-1), dernierGeste = useRef(Date.now());
  const reduit = mouvementReduit(), mobile = Math.min(window.innerWidth, window.innerHeight) < 600;

  useEffect(() => { document.title = "Vivre LUMIERE"; }, []);
  useEffect(() => {
    if (!toile.current || !calque.current || !webglDisponible()) return;
    const l = new Lecteur({ montage: version.montage, toile: toile.current, calque: calque.current, video: video.current, audio: AUDIO_COMPLET, mobile, imageParPlan: reduit,
      surImage: x => { if (Math.abs(x - affiche.current) >= 0.2 || x >= duree) { affiche.current = x; setT(x); } },
      surFin: () => { setLecture(false); ecrire(cleReprise(version.montage.id), null); } });
    lecteur.current = l;
    const dim = () => { const b = cadre.current!.getBoundingClientRect(); l.taille(b.width, b.height); };
    dim(); window.addEventListener("resize", dim);
    l.aller(reprise || 0); setT(reprise || 0); setDemarre(false); setLecture(false);
    void l.prechargerSon().then(b => setMusique(b ? "oui" : "non"));
    (window as unknown as { __lumiereVivre: unknown }).__lumiereVivre = { lecteur: l, journal, verifier: () => verifier(version.montage) };
    return () => { const x = l.t; if (x > 3 && x < duree - 3) ecrire(cleReprise(version.montage.id), x.toFixed(2)); window.removeEventListener("resize", dim); l.detruire(); lecteur.current = null; };
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps

  /* la reprise : la position est gardée sur cet appareil */
  useEffect(() => { if (lecture && t > 3 && t < duree - 3) ecrire(cleReprise(version.montage.id), t.toFixed(2)); }, [Math.floor(t / 5)]); // eslint-disable-line react-hooks/exhaustive-deps
  /* l'interface s'efface pendant la lecture ; un geste la ramène */
  useEffect(() => {
    const k = window.setInterval(() => setVisible(!lecture || scenes || Date.now() - dernierGeste.current < 3000), 500);
    const geste = () => { dernierGeste.current = Date.now(); setVisible(true); };
    window.addEventListener("pointermove", geste); window.addEventListener("keydown", geste); window.addEventListener("pointerdown", geste);
    return () => { window.clearInterval(k); window.removeEventListener("pointermove", geste); window.removeEventListener("keydown", geste); window.removeEventListener("pointerdown", geste); };
  }, [lecture, scenes]);

  const jouer = (depuis?: number) => {
    const l = lecteur.current; if (!l) return;
    setDemarre(true); l.jouer(depuis ?? l.t); setLecture(true);
    if (son && !l.son) void l.activerSon().then(ok => { if (!ok) setSon(false); });   /* dans le geste « Lecture » */
  };
  const pause = () => { lecteur.current?.pause(); setLecture(false); };
  const aller = (x: number) => { const l = lecteur.current; if (!l) return; l.aller(x); setT(x); };
  const basculerSon = () => { const l = lecteur.current; if (!l) return; if (son) { l.couperSon(); setSon(false); } else { setSon(true); if (l.lecture) void l.activerSon().then(ok => { if (!ok) setSon(false); }); } };
  const pleinEcran = () => { const d = document.documentElement; if (document.fullscreenElement) void document.exitFullscreen(); else void d.requestFullscreen?.().catch(() => {}); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input,select")) return;
      if (e.key === " ") { e.preventDefault(); if (lecture) pause(); else jouer(); }
      else if (e.key === "ArrowRight") aller(Math.min(duree, t + 10)); else if (e.key === "ArrowLeft") aller(Math.max(0, t - 10));
      else if (e.key === "Escape" && scenes) setScenes(false);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  const courant = places.find(p => t >= p.debutFilm && t < p.finFilm) ?? places[places.length - 1];
  const v = controle ? verifier(version.montage) : null;
  return <main className={"lf lf-vivre" + (visible ? "" : " lf-efface")} data-aime="nuit" aria-label={`Vivre LUMIERE — ${version.nom}`}>
    <div className="lf-cadre" ref={cadre}>
      <canvas ref={toile} className="lf-toile" aria-hidden="true" />
      <video ref={video} className="lf-video" hidden muted playsInline aria-hidden="true" />
      <canvas ref={calque} className="lf-calque" aria-hidden="true" />
    </div>
    <header className="lf-vivre-tete">
      <span className="lf-vivre-titre">LUMIERE</span>
      <label className="lf-version"><span className="sr-only">Version</span>
        <select value={versionId} onChange={e => { pause(); setVersionId(e.target.value); }}>{VERSIONS.map(x => <option key={x.id} value={x.id}>{x.nom}</option>)}</select></label>
      <a className="lf-coin-lien" href={BASE + "one/univers"}>Quitter · .0NE</a>
    </header>
    {!demarre && <div className="lf-depart">
      <button type="button" className="lf-grand" onClick={() => jouer(reprise || 0)} autoFocus>{reprise ? `Reprendre à ${mmss(reprise)}` : "Lecture"}</button>
      {reprise > 0 && <button type="button" className="lf-lien" onClick={() => { ecrire(cleReprise(version.montage.id), null); aller(0); jouer(0); }}>Recommencer au début</button>}
      <p className="lf-note">{musique === "non" ? "La musique n’est pas disponible sur cette version : le film se joue en silence." : "Avec la musique, au geste « Lecture »."}{reduit ? " Mouvement réduit : une image par scène." : ""}</p>
    </div>}
    <p className="sr-only" aria-live="polite">{courant ? `Scène : ${courant.titre}` : ""}</p>
    <footer className="lf-vivre-barre">
      <button type="button" className="lf-bouton" onClick={() => lecture ? pause() : jouer()} aria-label={lecture ? "Pause" : "Lecture"}>{lecture ? "Pause" : "Lecture"}</button>
      <span className="lf-temps">{mmss(t)} / {mmss(duree)}</span>
      <div className="lf-piste">
        <input type="range" min={0} max={duree} step={0.1} value={t} onChange={e => aller(+e.target.value)} aria-label="Position dans le film" aria-valuetext={`${mmss(t)}, ${courant?.titre ?? ""}`} />
        <div className="lf-marques" aria-hidden="true">{places.map(p => <i key={p.id} style={{ left: `${(p.debutFilm / duree) * 100}%` }} />)}<b style={{ left: `${(impact / duree) * 100}%` }} title="Impact · 03:18.255" /></div>
      </div>
      <button type="button" className="lf-bouton" onClick={() => setScenes(x => !x)} aria-expanded={scenes}>Scènes</button>
      {musique !== "non" && <button type="button" className="lf-bouton" onClick={basculerSon} aria-pressed={son}>{son ? "Son" : "Muet"}</button>}
      <button type="button" className="lf-bouton" onClick={pleinEcran}>Plein écran</button>
    </footer>
    {scenes && <nav className="lf-scenes" aria-label="Scènes"><ol>{places.map(p => <li key={p.id}>
      <button type="button" aria-current={courant?.id === p.id ? "true" : undefined} onClick={() => { aller(p.debutFilm); setScenes(false); if (!lecture) jouer(p.debutFilm); }}>
        <span>{mmss(p.debutFilm)}</span>{p.titre}{p.statut === "provisoire" && <small> · plan provisoire</small>}</button></li>)}</ol></nav>}
    {v && <section className="lf-controle lf-controle-vivre" aria-label="Synchronisation">
      <p className="lf-mesure">{version.montage.id} · t = {t.toFixed(3)} s · {courant?.titre} · {v.ok ? "synchronisation exacte" : "ÉCART"} · {v.synchro.map(s => `${s.repere.split(":")[1]} ${s.ecartMs} ms`).join(" · ")}</p>
    </section>}
  </main>;
}

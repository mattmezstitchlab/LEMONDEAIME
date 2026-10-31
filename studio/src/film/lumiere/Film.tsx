/**
 * LUMIERE — l'ouverture du site : le clip entier de « La Fleur du Ciel » (4 min 13). Du cinéma, pas un menu de cinéma.
 *
 * Le premier geste du visiteur est de toucher la lumière pour donner naissance à la musique :
 *  1. Le cosmos apparaît immédiatement, sans texte (c'est la première image du film, immobile dans le temps du récit).
 *  2. Si le navigateur autorise la lecture sonore automatique, le film commence avec sa musique.
 *  3. Sinon, l'Orbe nacrée, au centre, est un Play discret. RIEN N'AVANCE pendant l'attente (le récit reste à 0) :
 *     jamais un Play par-dessus une animation déjà avancée.
 *  4. Toucher la Perle : le film et sa musique partent ensemble, depuis le début, en synchronisation exacte.
 *  5. Sans geste (12 s) : la Perle se dissout dans le cosmos et l'introduction se joue en silence, depuis le début.
 *     « Activer le son » apparaît alors dans un coin : la musique rejoint le film À SA POSITION (reprise synchronisée définie).
 *  6. « Passer » reste accessible dans le coin opposé. Aucune modale, aucun texte explicatif, aucun choix de fichier.
 * L'impact reste à 03:18.255 du morceau (repère canonique). Mouvement réduit : une image fixe et l'entrée directe.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { EXTRAIT, IMAGES_PAR_SECONDE } from "./partition";
import { FILM_FLEUR, VERSIONS } from "./montages";
/** L'ouverture du site : le film du séquencier (31 plans). L'ancien clip reste lisible avec ?montage=lumiere-clip. */
const OUVERTURE = FILM_FLEUR;
import { journal, Lecteur } from "./lecteur";
import { Rendu } from "./rendu";
import { sceneVoyage } from "./voyage";
import { dureeMontage, plansA, verifier, type Montage } from "../../lib/cinema/montage";
import { lireOne } from "../../lib/one/preferences";
import "../../design/aime.css";
import "./film.css";

const PremiereRencontre = lazy(() => import("../../one/PremiereRencontre"));
const BASE = import.meta.env.BASE_URL;
export const AUDIO_EXTRAIT = { url: BASE + "lumiere-prive/fleur-du-ciel-extrait.m4a", morceau: "fleur-du-ciel", debut: EXTRAIT.debut, fin: EXTRAIT.fin };
export const AUDIO_COMPLET = { url: BASE + "lumiere-prive/fleur-du-ciel.m4a", morceau: "fleur-du-ciel", debut: 0, fin: 253 };
const DUREE = dureeMontage(OUVERTURE);
const ATTENTE_SANS_GESTE = 12000;
type Etat = "film" | "fixe" | "rencontre";
type Depart = "attente" | "play" | "chargement" | "lecture" | "silence";
const mmss = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, "0")}`;
const DESCRIPTIONS: Record<string, string> = {
  "v-noir": "Le cosmos, presque noir.", "v-galaxie": "Une étoile naît au centre ; on voyage à travers la galaxie ; elle devient une perle nacrée.",
  "v-ciel": "On entre dans le ciel : au-dessus d’une mer de nuages, sous le soleil.", "v-crepuscule": "La nuit tombe : le ciel rosit, puis les étoiles reviennent.",
  "v-nuages": "La perle descend dans les nuages de la nuit.", "v-eau": "Sous les nuages, une eau parfaitement calme.",
  "v-goutte": "La perle devient goutte ; le temps s’arrête ; elle tombe.", "v-arc": "L’impact : l’onde s’ouvre en arc-en-ciel, et on la traverse.",
  "v-terre": "Le ciel bleu ; la Terre vue d’en haut ; on descend vers le sol.", "v-herbe": "Dans l’herbe, le Disque est posé.",
  "v-perle": "Une goutte touche le centre du Disque : la Perle s’allume. Puis la lumière blanchit.",
};

export function mouvementReduit() {
  return lireOne().affichage.reduceMotion || document.documentElement.dataset.pzMotion === "reduce" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}
export function webglDisponible() { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } }
const nouveauContexte = () => { const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; return new C({ latencyHint: "playback" }); };

export default function Film() {
  const params = new URLSearchParams(window.location.search);
  const controle = params.has("controle"), capture = params.has("capture");
  /* contrôle et rendu image par image : un autre montage peut être choisi (?montage=lumiere-previz-impact) ; l'ouverture du site est le film des 31 plans */
  const MONTAGE = VERSIONS.find(v => v.id === params.get("montage")) ?? OUVERTURE;
  const depart = Math.min(dureeMontage(MONTAGE) - 0.5, Math.max(0, +(params.get("t") ?? 0) || 0));
  const [etat, setEtat] = useState<Etat>(() => capture ? "film" : (mouvementReduit() || !webglDisponible()) ? "fixe" : "film");
  const [phase, setPhase] = useState<Depart>(capture || controle || depart > 0 ? "silence" : "attente");
  const [son, setSon] = useState<"coupe" | "chargement" | "actif" | "absent">("coupe");
  const [t, setT] = useState(depart);
  const [vol, setVol] = useState(false);
  const toile = useRef<HTMLCanvasElement>(null), calque = useRef<HTMLCanvasElement>(null), video = useRef<HTMLVideoElement>(null), cadre = useRef<HTMLDivElement>(null);
  const lecteur = useRef<Lecteur | null>(null), phaseRef = useRef(phase);
  phaseRef.current = phase;
  const affiche = useRef(-1);
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 600;

  useEffect(() => { document.title = "AIME — LUMIERE"; }, []);

  useEffect(() => {
    if (etat !== "film" || !toile.current || !calque.current) return;
    const l = new Lecteur({
      montage: MONTAGE, toile: toile.current, calque: calque.current, video: video.current, audio: AUDIO_COMPLET, mobile,
      surImage: x => { if (Math.abs(x - affiche.current) >= 0.25 || x >= DUREE) { affiche.current = x; setT(x); } },
      surFin: () => { if (!controle) versRencontre(true); },
      surEchec: () => { if (!capture) setEtat("fixe"); },
    });
    lecteur.current = l;
    if (l.statique) { setEtat("fixe"); return; }
    const dim = () => { const b = cadre.current!.getBoundingClientRect(); l.taille(b.width, b.height); if (!l.lecture) l.aller(l.t); };
    dim(); window.addEventListener("resize", dim);
    (window as unknown as { __lumiere: unknown }).__lumiere = { rendre: (x: number) => { l.aller(x); return sceneVoyage(x); }, scene: sceneVoyage, DUREE, journal, lecteur: l, verifier: () => verifier(MONTAGE), montage: MONTAGE, phase: () => phaseRef.current };
    const minuteurs: number[] = [];
    let raf = 0;
    if (capture) { l.aller(depart); }
    else if (controle || depart > 0) { l.jouer(depart); void l.prechargerSon().then(b => { if (!b) setSon("absent"); }); }
    else {
      /* 1. l'attente : la première image, vivante (les étoiles scintillent), le récit immobile à 0 */
      l.aller(0);
      /* le scintillement, à 12 images par seconde : il ne doit pas disputer le processeur au décodage de la musique */
      let dernier = 0;
      const vivre = (ts: number) => { if (phaseRef.current === "attente" || phaseRef.current === "play" || phaseRef.current === "chargement") { if (ts - dernier > 83) { dernier = ts; l.respirer(); } raf = requestAnimationFrame(vivre); } };
      raf = requestAnimationFrame(vivre);
      void l.prechargerSon().then(b => { if (!b) setSon("absent"); });
      /* 2. la lecture automatique avec le son est-elle permise ? (un contexte audio qui démarre sans geste) */
      let ctx: AudioContext | null = null;
      try { ctx = nouveauContexte(); void ctx.resume().catch(() => {}); } catch { ctx = null; }
      minuteurs.push(window.setTimeout(async () => {
        if (phaseRef.current !== "attente") return;
        if (ctx && ctx.state === "running") {
          const b = await Promise.race([l.prechargerSon(), new Promise<null>(r => window.setTimeout(() => r(null), 8000))]);
          if (phaseRef.current !== "attente") return;
          if (b) { setPhase("lecture"); setSon("actif"); void l.lancerAvecSon(ctx, 0); return; }
        }
        ctx?.close().catch(() => {});
        /* 3. bloquée : la Perle devient Play */
        setPhase("play");
        /* 5. sans geste : la Perle se dissout, l'introduction se joue en silence, depuis le début */
        minuteurs.push(window.setTimeout(() => { if (phaseRef.current === "play") { setPhase("silence"); l.jouer(0); } }, ATTENTE_SANS_GESTE));
      }, 450));
    }
    return () => { minuteurs.forEach(k => window.clearTimeout(k)); cancelAnimationFrame(raf); window.removeEventListener("resize", dim); l.detruire(); lecteur.current = null; };
  }, [etat]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 4. toucher la lumière : le film et sa musique, ensemble, depuis le début (le contexte audio naît DANS le geste) */
  const toucherLaLumiere = () => {
    const l = lecteur.current; if (!l || phase !== "play") return;
    const ctx = nouveauContexte(); void ctx.resume();
    try { (navigator as Navigator & { audioSession?: { type: string } }).audioSession && ((navigator as Navigator & { audioSession: { type: string } }).audioSession.type = "playback"); } catch { /* Safari < 16.4 */ }
    setPhase("chargement");
    void l.lancerAvecSon(ctx, 0).then(ok => { setPhase("lecture"); setSon(ok ? "actif" : "absent"); });
  };
  /* la reprise synchronisée (après l'introduction silencieuse) : la musique rejoint le film à sa position */
  const basculerSon = () => {
    const l = lecteur.current; if (!l) return;
    if (son === "actif") { l.couperSon(); setSon("coupe"); return; }
    setSon("chargement"); void l.activerSon().then(ok => setSon(ok ? "actif" : "absent"));
  };

  const versRencontre = (avecVol: boolean) => {
    lecteur.current?.detruire();
    try { history.replaceState(null, "", BASE + "one/premiere-rencontre"); } catch { /* adresse inchangée */ }
    setVol(avecVol && !mouvementReduit()); setEtat("rencontre");
  };
  useEffect(() => {
    if (etat !== "rencontre" || !vol) return;
    let essais = 0, fini = false;
    const chercher = () => {
      const cible = document.querySelector<HTMLElement>(".pzt-anneau") ?? document.querySelector<HTMLElement>(".one-marque .one-orbe");
      const orbe = document.querySelector<HTMLElement>(".lf-orbe");
      if (!cible || !orbe) { if (essais++ < 120) requestAnimationFrame(chercher); else setVol(false); return; }
      const a = orbe.getBoundingClientRect(), b = cible.getBoundingClientRect();
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const anim = orbe.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(1.6)`, opacity: 1, offset: .75 }, { transform: `translate(${dx}px, ${dy}px) scale(2.4)`, opacity: 0 }],
        { duration: 1500, easing: "cubic-bezier(.5,0,.15,1)", fill: "forwards" });
      document.querySelector<HTMLElement>(".lf-voile")?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1100, delay: 250, easing: "ease", fill: "forwards" });
      anim.onfinish = () => { if (!fini) { fini = true; setVol(false); } };
    };
    requestAnimationFrame(chercher);
    return () => { fini = true; };
  }, [etat, vol]);

  useEffect(() => {
    if (etat !== "film") return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); versRencontre(false); return; }
      const l = lecteur.current; if (!controle || !l) return;
      if (e.key === " ") { e.preventDefault(); if (l.lecture) l.pause(); else l.jouer(); }
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); l.aller(l.t + (e.key === "ArrowRight" ? 1 : -1) / IMAGES_PAR_SECONDE * (e.shiftKey ? 24 : 1)); setT(l.t); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });

  if (etat === "rencontre") return <>
    <Suspense fallback={null}><PremiereRencontre /></Suspense>
    {vol && <div className="lf-voile" aria-hidden="true"><span className="lf-orbe" /></div>}
  </>;
  if (etat === "fixe") return <Fixe onEntrer={() => versRencontre(false)} />;

  const plan = plansA(MONTAGE, t)[0]?.plan;
  return <main className="lf lf-film" data-aime="nuit" aria-label="LUMIERE, la naissance du Point : le clip de « La Fleur du Ciel », 4 minutes 13, facultatif">
    <div className="lf-cadre" ref={cadre}>
      <canvas ref={toile} className="lf-toile" aria-hidden="true" />
      <video ref={video} className="lf-video" hidden muted playsInline aria-hidden="true" />
      <canvas ref={calque} className="lf-calque" aria-hidden="true" />
    </div>
    {!capture && <>
      {/* la Perle : le Play, au centre, dans l'identité de l'Orbe ; elle se fond dans la lumière une fois touchée */}
      {(phase === "play" || phase === "chargement") && <button type="button" className={"lf-perle-play" + (phase === "chargement" ? " lf-perle-naissance" : "")} onClick={toucherLaLumiere}
        aria-label="Lancer le film avec sa musique"><span className="lf-perle-coeur" aria-hidden="true" /><span className="lf-perle-triangle" aria-hidden="true" /></button>}
      {(phase === "silence" || phase === "lecture") && son !== "absent" && <button type="button" className={"lf-coin lf-coin-gauche" + (phase === "lecture" && son === "actif" ? " lf-coin-discret" : "")} onClick={basculerSon} aria-pressed={son === "actif"} disabled={son === "chargement"}>
        <span aria-hidden="true" className="lf-icone">{son === "actif" ? "◖◗" : "◖"}</span>{son === "actif" ? "Couper le son" : son === "chargement" ? "Le son arrive…" : "Activer le son"}</button>}
      <button type="button" className="lf-coin lf-coin-droite" onClick={() => versRencontre(false)}>Passer<span aria-hidden="true" className="lf-fleche">→</span></button>
      <p className="sr-only" aria-live="polite">{phase === "play" ? "Le film peut commencer avec sa musique : touchez la perle au centre de l’écran, ou appuyez sur Entrée." : plan ? `${plan.titre}. ${DESCRIPTIONS[plan.id] ?? ""}` : ""}</p>
      {controle && <Controle m={MONTAGE} t={t} aller={x => { lecteur.current?.aller(x); setT(x); }} />}
    </>}
  </main>;
}

/** Mouvement réduit, ou rendu impossible : une seule image fixe (la perle au-dessus des nuages), et l'entrée dans .0NE. */
function Fixe({ onEntrer }: { onEntrer: () => void }) {
  const [image, setImage] = useState("");
  useEffect(() => {
    if (!webglDisponible()) return;
    const a = document.createElement("canvas"), b = document.createElement("canvas");
    try { const r = new Rendu(a, b, { qualite: 5 }); r.taille(1280, 720, 1); r.rendre(96, 96, sceneVoyage); const c = document.createElement("canvas"); c.width = 1280; c.height = 720;
      const x = c.getContext("2d")!; x.drawImage(a, 0, 0); x.drawImage(b, 0, 0); setImage(c.toDataURL("image/jpeg", 0.9)); r.detruire(); } catch { /* le noir et le Point suffisent */ }
  }, []);
  return <main className="lf lf-fixe-plein" data-aime="nuit" aria-label="LUMIERE, image fixe">
    {image ? <img className="lf-fixe-image" src={image} alt="Une perle de lumière nacrée flotte au-dessus d’une mer de nuages, sous un ciel bleu." />
      : <span className="lf-point lf-point-seul" role="img" aria-label="Un point de lumière nacrée dans l’obscurité." />}
    <p className="sr-only">{Object.values(DESCRIPTIONS).join(" ")}</p>
    <button type="button" className="lf-coin lf-coin-droite" onClick={onEntrer} autoFocus>Entrer<span aria-hidden="true" className="lf-fleche">→</span></button>
  </main>;
}

/** Les contrôles de montage (?controle) : la position, le plan, et la vérification des repères verrouillés du clip. */
function Controle({ m, t, aller }: { m: Montage; t: number; aller: (t: number) => void }) {
  const v = verifier(m), p = plansA(m, t)[0]?.plan, DUREE = dureeMontage(m), debut = m.musique[0]?.debut ?? 0;
  return <section className="lf-controle" aria-label="Contrôles de montage">
    <p className="lf-mesure">t = {t.toFixed(3)} s · image {Math.round(t * IMAGES_PAR_SECONDE)} · morceau {mmss(t + debut)} · {p?.titre}
      {" · "}repères verrouillés : {v.synchro.map(s => `${s.repere.split(":")[1]} ${s.ecartMs === 0 ? "0 ms" : s.ecartMs + " ms"}`).join(", ")}</p>
    <input type="range" min={0} max={DUREE} step={1 / IMAGES_PAR_SECONDE} value={t} onChange={e => aller(+e.target.value)} aria-label="Position dans le film" />
    <div className="lf-reperes">{m.plans.map((x, i) => { const d = m.plans.slice(0, i).reduce((a, y) => a + y.duree, 0);
      return <button key={x.id} type="button" title={x.titre} onClick={() => aller(d)} style={{ left: `${(d / DUREE) * 100}%` }}>{x.titre.split(" ").slice(-1)[0]}</button>; })}</div>
  </section>;
}

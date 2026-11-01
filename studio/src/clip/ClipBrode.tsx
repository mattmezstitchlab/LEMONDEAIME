/**
 * UPTOWN brodé, la démonstration de Point Zéro (publiée le 1/11/2026, accord de Matt) : le clip de Saint-Luc, restauré puis brodé sur « Amor amour 2 »,
 * tourne dans la toile du Disque de broderie, et les vrais outils du Disque agissent sur lui.
 *  - La démonstration se joue toute seule, au rythme du morceau : le Disque montre ses outils (le bouton s'allume, le cartouche dit ce qu'il fait).
 *  - Toucher un outil reprend la main : la démonstration se met de côté (« Démonstration » la relance).
 *  - Fils : les 36 DMC du clip, illuminés ou masqués ; Affichage : réaliste, toile, symboles, à plat, la grille, l'envers ;
 *    Points : croix, demi-point, points arrière ; Broder : le clip se rebrode depuis le centre ; Loupe : le point vivant, au plus près.
 * Le clip est dessiné point par point (clip/rendu.ts) depuis les données de la broderie : exactement les fils du clip rendu.
 * Géométrie du Disque, Point, couronne et cartouche : ceux de l'atelier (lib/tambour/disque, components/point), repris sans changement.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Clapperboard, Expand, Minimize2, Shrink, Eye, FlipHorizontal2, Layers, Pause, Play, Search, Sparkles, Spline } from "lucide-react";
import Point from "../components/point/Point";
import type { ModePoint } from "../lib/point/modes";
import { anneauSvg, geometrieDisque, type Disque } from "../lib/tambour/disque";
import { lireClip, Morceaux, partieEn, type Clip } from "./donnees";
import { CODE_MODE, RenduClip, type ModeClip } from "./rendu";
import { positionCurseur, scenarioFleur, type Position } from "./scenarioFleur";
import { removeConfetti } from "../lib/quantize";
import "../components/TambourAtelier.css";
import "./clip.css";

const BASE = import.meta.env.BASE_URL;
/* publiés avec l’accord de Matt (1/11/2026) : les données du clip et « Amor amour 2 », sa musique */
/** un clip brodé : ses données, sa musique, ses mots ; la page est la même pour tous */
export interface ConfigClip { id: "uptown" | "fleur"; titre: string; donnees: string; audio: string; credit: string; aria: string; confettis: number | null; /** la toile du Disque grossit le fond */ grossi: number; /** le Disque rangé au départ (on voit tout) */ replie: boolean }
export const UPTOWN: ConfigClip = { id: "uptown", titre: "UPTOWN brodé", donnees: BASE + "clip/uptown/", audio: BASE + "clip/uptown/amor-amour-2.m4a",
  credit: "UPTOWN (Saint-Luc) · musique « Amor amour 2 », Matt", aria: "Le clip UPTOWN brodé au point de croix", confettis: 30.309, grossi: 3, replie: false };
/* publiée avec l'accord de Matt (1/11/2026, « tout est de moi ») : la musique et les données de la fleur */
export const FLEUR: ConfigClip = { id: "fleur", titre: "La Fleur du Ciel", donnees: BASE + "clip/fleur-du-ciel/", audio: BASE + "clip/fleur-du-ciel/la-fleur-du-ciel.m4a",
  credit: "« La Fleur du Ciel », musique de Matt · brodée point par point", aria: "La Fleur du Ciel brodée au point de croix", confettis: null, grossi: 1.6, replie: true };
const reduit = () => document.documentElement.classList.contains("calme") || document.documentElement.getAttribute("data-pz-motion") === "reduce" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const NOM_MODE: Record<ModeClip, string> = { tissu: "Réaliste", toile: "Toile", symboles: "Symboles", mosaique: "À plat", demi: "Demi-point" };
const AIDE_MODE: Record<ModeClip, string> = {
  tissu: "la vraie broderie : deux brins torsadés par croix, serrés",
  toile: "le travail sur l’Aida : des croix fines, la toile claire laissée nue",
  symboles: "le patron imprimé : un symbole par fil, la grille et un repère toutes les 10 cases",
  mosaique: "les couleurs DMC à plat, une case par point",
  demi: "le demi-point : seulement « / », la première moitié de chaque croix",
};
/** la surprise des confettis : le clip s'arrête sur le temps de 30,309 s (un temps fort mesuré à 30,299 s, force 81),
    montre ses points isolés (un point seul de sa couleur), les nettoie avec l'outil de l'atelier (lib/quantize), puis reprend */
const MONTRE = 2.2, NETTOIE = 1.0;
const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** une étape de la démonstration : à l'instant t, pendant d secondes, le Disque montre un outil */
interface Etape { t: number; d: number; outil: string; titre: string; texte: string; effet?: { fil?: "premier"; arriere?: boolean; envers?: boolean; loupe?: boolean; grille?: boolean } }

/** L'introduction utilise le même lecteur, sa même toile et ses mêmes commandes. */
export interface IntegrationClip {
  segments: [number, number][];
  onProgression: (t: number) => void;
  onLecture: (lecture: boolean, sansSon: boolean) => void;
  onFin: () => void;
  onErreur: () => void;
}
export interface ControleClip { pause: () => void; jouer: () => void; son: (actif: boolean) => void; temps: () => number }

const ClipBrode = forwardRef<ControleClip, { config?: ConfigClip; integration?: IntegrationClip }>(function ClipBrode({ config = UPTOWN, integration }, controle) {
  const DONNEES = config.donnees, AUDIO = config.audio, T_CONFETTIS = config.confettis ?? -1e9;
  const integre = !!integration, integrationRef = useRef(integration); integrationRef.current = integration;
  const hote = useRef<HTMLDivElement>(null), disque = useRef<HTMLDivElement>(null), curseur = useRef<HTMLDivElement>(null);
  const positions = useRef<Record<string, Position>>({});
  const reveiller = useRef<(() => void) | null>(null);
  const ticketLecture = useRef(0), segment = useRef(0), termine = useRef(false);
  const [clip, setClip] = useState<Clip | null>(null), [erreur, setErreur] = useState("");
  const morceaux = useRef<Morceaux | null>(null), rendu = useRef<RenduClip | null>(null);
  const toile = useRef<HTMLCanvasElement>(null), audio = useRef<HTMLAudioElement>(null);
  const [lecture, setLecture] = useState(false), [lance, setLance] = useState(false), [t, setT] = useState(0);
  const horloge = useRef({ depart: 0, t0: 0, sansSon: false });

  /* ce que la personne a choisi (null : on suit le clip) */
  const [mouvementReduit, setMouvementReduit] = useState(reduit);
  const [demo, setDemo] = useState(() => config.id !== "fleur" || !reduit());
  const [debutDemo, setDebutDemo] = useState(0);
  const [mode, setMode] = useState<{ code: number; t0: number; avant: number } | null>(null);
  const [etats, setEtats] = useState<number[]>([]);            // par fil : 1 montré, .4 estompé, 0 caché
  const [masquer, setMasquer] = useState(false);
  const [arriere, setArriere] = useState(false), [grille, setGrille] = useState(true), [envers, setEnvers] = useState(false), [retourne, setRetourne] = useState(false);
  const [loupe, setLoupe] = useState(() => !!window.matchMedia?.("(pointer: fine)").matches);
  const loupePos = useRef<[number, number] | null>(null);
  const [brode, setBrode] = useState<{ t0: number; d: number } | null>(null);
  const [visee, setVisee] = useState<{ nom: string; aide: string } | null>(null);
  const [infoDemo, setInfoDemo] = useState("");
  const [sousLoupe, setSousLoupe] = useState<number | null>(null);
  const filDemo = useRef<number | null>(null), [filMontre, setFilMontre] = useState<number | null>(null);
  const [replie, setReplie] = useState(config.replie), [plein, setPlein] = useState(false);

  useEffect(() => {
    const annulation = new AbortController();
    let charge: Morceaux | null = null;
    lireClip(DONNEES, annulation.signal).then(c => {
      if (annulation.signal.aborted) return;
      charge = new Morceaux(DONNEES, c); morceaux.current = charge;
      setClip(c); setEtats(c.fils.map(() => 1));
      void charge.attendre(0).then(() => reveiller.current?.()).catch(() => {});
    }).catch(e => { if (!annulation.signal.aborted) { setErreur(String(e?.message ?? e)); integrationRef.current?.onErreur(); } });
    return () => { annulation.abort(); charge?.arreter(); if (morceaux.current === charge) morceaux.current = null; };
  }, [DONNEES]);

  useEffect(() => {
    const actualiser = () => setMouvementReduit(reduit());
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const observateur = new MutationObserver(actualiser);
    observateur.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-pz-motion"] });
    media?.addEventListener?.("change", actualiser);
    return () => { observateur.disconnect(); media?.removeEventListener?.("change", actualiser); };
  }, []);
  useEffect(() => { if (mouvementReduit && config.id === "fleur") setDemo(false); }, [mouvementReduit, config.id]);

  /* Réserver la hauteur du header public ; géométrie et commandes du Disque inchangées. */
  const mesurer = useCallback((): Disque => {
    const texte = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pz-user-font-scale")) || 1;
    const r = integre ? hote.current?.getBoundingClientRect() : null;
    const l = r?.width || window.innerWidth, h = r?.height || window.innerHeight;
    const hautPublic = integre ? 0 : document.querySelector("[data-header-public]")?.getBoundingClientRect().height ?? 0;
    return geometrieDisque(l, h, hautPublic + 12, { texte, bas: integre ? 225 : 96, court: true });
  }, [integre]);
  const [g, setG] = useState(mesurer);
  useEffect(() => {
    const f = () => setG(mesurer()); f();
    window.addEventListener("resize", f);
    const obs = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(f);
    if (hote.current) obs?.observe(hote.current);
    return () => { window.removeEventListener("resize", f); obs?.disconnect(); };
  }, [mesurer]);

  /* la démonstration, écrite sur les parties mesurées du morceau */
  const etapes = useMemo<Etape[]>(() => {
    if (!clip) return [];
    const p = Object.fromEntries(clip.parties.map(([tt, m], i) => [i, { t: tt, m }]));
    /* La fleur a une courte chorégraphie propre, calculée par scenarioFleur sur le temps réel. */
    if (config.id === "fleur") return [];
    const e: Etape[] = [
      { t: 0.5, d: clip.brodeJusqua - 1, outil: "broder", titre: "Broder", texte: "le clip se brode depuis le centre : d’abord « / », puis la croix entière" },
      { t: clip.brodeJusqua, d: 8, outil: "affichage", titre: "Affichage › Toile", texte: AIDE_MODE.toile },
    ];
    for (let i = 1; i < clip.parties.length; i++) { const { t: tt, m } = p[i]; const md = m as ModeClip; e.push({ t: tt, d: 7, outil: "affichage", titre: `Affichage › ${NOM_MODE[md]}`, texte: AIDE_MODE[md] }); }
    e.push({ t: 76.4, d: 8, outil: "fils", titre: "Fils", texte: "un fil choisi s’illumine, les autres s’estompent", effet: { fil: "premier" } });
    e.push({ t: 112, d: 8, outil: "points", titre: "Points › Point arrière", texte: "les contours, au point arrière, là où deux fils s’opposent", effet: { arriere: true } });
    e.push({ t: 122.5, d: 7.5, outil: "affichage", titre: "Affichage › L’envers", texte: "le dos de la broderie (calculé, pas photographié)", effet: { envers: true } });
    e.push({ t: 154, d: 9, outil: "loupe", titre: "Loupe", texte: "le point vivant, au plus près ; au bord, son symbole du patron", effet: { loupe: true } });
    return e.sort((a, b) => a.t - b.t);
  }, [clip, config.id]);
  const etape = demo ? [...etapes].reverse().find(e => t >= e.t && t < e.t + e.d) ?? null : null;
  const effet = etape?.effet;
  const guide = config.id === "fleur" && demo && lance && !mouvementReduit ? scenarioFleur(t - debutDemo) : null;
  const guideVisible = !!guide && guide.phase !== "attente" && guide.phase !== "termine";
  const indexFilGuide = clip?.fils.findIndex(f => f.code === "3354") ?? -1;
  const rangFilGuide = clip ? clip.fils.map((f, i) => ({ i, points: f.points })).sort((a, b) => b.points - a.points).findIndex(f => f.i === indexFilGuide) : -1;
  const pageFilGuide = Math.floor((rangFilGuide + 2) / Math.max(3, g.capacite - 3));

  /* Aucune temporisation : l'ouverture et le repli suivent la position du morceau et s'immobilisent avec lui. */
  useEffect(() => {
    if (!guide) return;
    setReplie(!guide.ouvert);
  }, [guide?.phase, demo, mouvementReduit]);

  /* l'envers : le tambour se retourne (et revient) ; à mi-chemin, l'autre face */
  const enversVoulu = envers || !!effet?.envers;
  useEffect(() => {
    if (enversVoulu === retourne) return;
    if (reduit()) { setRetourne(enversVoulu); return; }
    const id = window.setTimeout(() => setRetourne(enversVoulu), 300); return () => window.clearTimeout(id);
  }, [enversVoulu, retourne]);

  /* le temps : le son mène ; sans son (refusé, absent), une horloge */
  const maintenant = useCallback(() => {
    const a = audio.current, h = horloge.current;
    if (a && !h.sansSon && a.readyState > 0) return a.currentTime;
    return h.depart ? h.t0 + (performance.now() - h.depart) / 1000 : h.t0;
  }, []);
  const jouer = useCallback(async () => {
    const ticket = ++ticketLecture.current, a = audio.current, h = horloge.current;
    let temps = maintenant(); setLance(true);
    if (clip && temps >= clip.duree - .05) { temps = 0; if (a) a.currentTime = 0; h.t0 = 0; termine.current = false; }
    try {
      if (!a) throw new Error("audio absent");
      /* Après une lecture silencieuse, le son reprend à la même image. */
      if (h.sansSon) a.currentTime = temps;
      await a.play();
      if (ticket !== ticketLecture.current) return;
      h.sansSon = false;
    } catch {
      if (ticket !== ticketLecture.current) return;
      h.sansSon = true; h.t0 = temps; h.depart = performance.now();
    }
    setLecture(true); integrationRef.current?.onLecture(true, h.sansSon);
  }, [clip, maintenant]);
  const pause = useCallback(() => {
    ticketLecture.current++;
    const h = horloge.current; h.t0 = maintenant(); h.depart = 0;
    audio.current?.pause(); setLecture(false); integrationRef.current?.onLecture(false, h.sansSon);
  }, [maintenant]);
  const aller = (v: number) => { const h = horloge.current; if (audio.current) audio.current.currentTime = v; h.t0 = v; if (h.depart) h.depart = performance.now(); setT(v); reveiller.current?.(); };
  useImperativeHandle(controle, () => ({ pause, jouer: () => { void jouer(); }, son: v => { if (audio.current) audio.current.muted = !v; }, temps: maintenant }), [pause, jouer, maintenant]);

  useEffect(() => {
    const a = audio.current; if (!a) return;
    /* Le montage de développement peut rejouer l'effet : rétablir l'URL après chaque nettoyage. */
    a.setAttribute("src", AUDIO);
    return () => { ticketLecture.current++; a.pause(); a.removeAttribute("src"); a.load(); };
  }, [AUDIO]);
  useEffect(() => {
    if (!integrationRef.current || !clip || !morceaux.current) return;
    let annule = false;
    const debut = integrationRef.current.segments[0][0];
    void morceaux.current.attendre(Math.floor(debut * clip.fps)).then(() => {
      if (annule) return;
      segment.current = 0; termine.current = false; horloge.current.t0 = debut;
      if (audio.current) audio.current.currentTime = debut;
      setT(debut); void jouer();
    }).catch(() => { if (!annule) { setErreur("Les données de la broderie ne sont pas disponibles."); integrationRef.current?.onErreur(); } });
    return () => { annule = true; };
  }, [clip, jouer]);
  useEffect(() => { integrationRef.current?.onProgression(t); }, [t]);

  /* le rendu, à chaque image de l'écran */
  /* les confettis : la surprise (une fois par passage) et l'outil, qui reste ensuite */
  const [sansConfetti, setSansConfetti] = useState(false);
  const [confettis, setConfettis] = useState<{ x: number; y: number; n: number; phase: "montre" | "nettoie" } | null>(null);
  const evRef = useRef<{ debut: number; t: number; image: Uint8Array; propre: Uint8Array; ordre: number[]; marque: Uint8Array; n: number; replie: boolean } | null>(null), confettiFait = useRef(false);
  const etatRef = useRef({ clip, mode, etats, masquer, arriere, grille, retourne, loupe, brode, effet, demo, geo: g, replie, sansConfetti, lecture, lance, mouvementReduit, debutDemo });
  etatRef.current = { clip, mode, etats, masquer, arriere, grille, retourne, loupe, brode, effet, demo, geo: g, replie, sansConfetti, lecture, lance, mouvementReduit, debutDemo };
  useEffect(() => {
    if (!clip || !toile.current) return;
    try { rendu.current = new RenduClip(toile.current); } catch (e) { setErreur("Votre navigateur ne peut pas dessiner la broderie (WebGL 2) : " + String((e as Error).message)); integrationRef.current?.onErreur(); return; }
    const instance = rendu.current;
    let raf = 0, dernier = -1, derniereImage: Uint8Array | null = null;
    /* ?qualite=0.5 : partir d'une toile moins fine (appareils modestes, essais) */
    let tAvant = 0;
    let qualite = Math.max(.3, Math.min(1, parseFloat(new URLSearchParams(location.search).get("qualite") ?? "1") || 1)), lent = 0, dernierInstant = 0;
    const boucle = () => {
      raf = 0;
      const s = etatRef.current, c = s.clip!, r = instance, cv = toile.current!;
      const ev = evRef.current;
      let tt = ev ? ev.t : Math.min(c.duree, maintenant());
      const segments = integrationRef.current?.segments;
      if (segments && s.lecture && !ev && !termine.current) {
        const [debut, fin] = segments[segment.current], prochain = segments[segment.current + 1];
        if (prochain && tt >= fin - 2) void morceaux.current?.attendre(Math.floor(prochain[0] * c.fps)).catch(() => {});
        /* Les fondus de la version courte suivent eux aussi la position réelle de l'audio. */
        if (audio.current && segments.length > 1) audio.current.volume = Math.min(segment.current ? Math.max(0, Math.min(1, (tt - debut) / .25)) : 1, prochain ? Math.max(0, Math.min(1, (fin - tt) / .25)) : 1);
        if (tt >= fin - .02) {
          if (prochain) {
            segment.current++; tt = prochain[0]; horloge.current.t0 = tt;
            if (horloge.current.sansSon) horloge.current.depart = performance.now();
            if (audio.current) audio.current.currentTime = tt;
            setT(tt);
          } else {
            tt = fin; termine.current = true; horloge.current.t0 = fin; horloge.current.depart = 0;
            audio.current?.pause(); setT(fin); setLecture(false);
            integrationRef.current?.onLecture(false, horloge.current.sansSon);
            integrationRef.current?.onProgression(fin); integrationRef.current?.onFin();
          }
        }
      }
      if (!ev && tt < T_CONFETTIS - 1 && confettiFait.current && s.demo) { confettiFait.current = false; setSansConfetti(false); }
      if (horloge.current.sansSon && horloge.current.depart && tt >= c.duree) { horloge.current.t0 = c.duree; horloge.current.depart = 0; setLecture(false); }
      setT(v => Math.abs(v - tt) > .2 ? tt : v);
      const n = Math.min(c.images - 1, Math.floor(tt * c.fps));
      if (n !== dernier && !ev) {
        let im = morceaux.current!.image(n);
        /* l'outil Confettis (Points) : chaque image est nettoyée comme dans l'atelier */
        if (im && s.sansConfetti) { const cells = Int16Array.from(im); removeConfetti(cells, c.grille, c.grille); im = Uint8Array.from(cells); }
        if (im) { r.image(im); dernier = n; derniereImage = im; }
      }
      /* les fils : illuminés (les autres estompés) ou masqués ; la démonstration peut en illuminer un */
      let et = s.etats.slice();
      const scenario = config.id === "fleur" && s.demo && s.lance && !s.mouvementReduit ? scenarioFleur(tt - s.debutDemo) : null;
      const filScenario = c.fils.findIndex(f => f.code === "3354");
      if (scenario?.couleur && filScenario >= 0) {
        /* La même mise en lumière temporaire que Fils ; aucun fil des données n'est remplacé. */
        et = et.map((_, i) => i === filScenario ? 1 : .4);
      } else if (s.effet?.fil === "premier") {
        /* le fil montré : le plus présent dans l'image à ce moment, après le fond ; choisi une fois pour l'étape */
        if (filDemo.current === null && derniereImage) { const n = new Array(c.fils.length).fill(0); for (const k of derniereImage) { const q = k & 127; if (q < n.length) n[q]++; } filDemo.current = n.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p)[1].i; setFilMontre(filDemo.current); }
        if (filDemo.current !== null) et = et.map((_, i) => i === filDemo.current ? 1 : .4);
      } else if (filDemo.current !== null) { filDemo.current = null; setFilMontre(null); }
      r.palette([...c.fils.map((f, i) => ({ rgb: f.rgb, etat: et[i] ?? 1 })), { rgb: [236, 231, 219], etat: 0 }]);   /* le dernier : la toile nue (un point pas encore brodé) */
      /* les rendus : ceux du clip (la démonstration) ; un choix de la personne part du centre, en une battue */
      const parties = partieEn(c.parties, CODE_MODE);
      const vue = s.mode ? [[0, s.mode.avant], [s.mode.t0, s.mode.code]] as [number, number][] : parties;
      /* la caméra : dans l'ouverture, elle part du centre et recule ; à la fin, elle y revient (comme le clip rendu) */
      let z = 1;
      if (!s.mode) {
        if (tt < c.brodeJusqua) z = 1 + 7 * Math.pow(1 - tt / c.brodeJusqua, 1.8);
        else if (tt > c.finDuPassage) { const u = Math.min(1, (tt - c.finDuPassage) / (c.duree - c.finDuPassage - .6)); z = 1 + 7 * u * u * (3 - 2 * u); }
      }
      /* la qualité suit l'appareil : si les images tardent, la toile se dessine en moins de pixels (jamais moins de la moitié) */
      const ici = performance.now(); if (dernierInstant) { const ecart = ici - dernierInstant; lent = lent * .9 + (ecart > 45 ? 1 : 0) * .1; if (lent > .5 && qualite > .5) { qualite = Math.max(.5, qualite - .15); lent = 0; } } dernierInstant = ici;
      /* le clip couvre tout l'écran ; la toile du Disque le montre grossi (le détail), comme un tambour posé dessus */
      const dpr = Math.min(1.5, window.devicePixelRatio || 1) * qualite, W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const cpp = c.grille / Math.max(W, H) / z, s0 = s.geo, cote = Math.min(W, H);
      const tambour: [number, number, number, number] | null = s.replie ? null : [s0.cx * dpr, s0.cy * dpr, s0.r * dpr, config.grossi];
      /* le point de la grille sous un pixel : dans le tambour (grossi) ou sur le fond */
      const place = (x: number, y: number): [number, number, number] => {
        if (tambour && Math.hypot(x - tambour[0], y - tambour[1]) < tambour[2]) { const zz = cpp / config.grossi; return [c.grille / 2 + (tambour[0] - W / 2) * cpp + (x - tambour[0]) * zz, c.grille / 2 + (tambour[1] - H / 2) * cpp + (y - tambour[1]) * zz, zz]; }
        return [c.grille / 2 + (x - W / 2) * cpp, c.grille / 2 + (y - H / 2) * cpp, cpp];
      };
      /* Le pointeur illustratif se rend aux boutons du Point réellement affichés, sans les cliquer. */
      let pointeur: Position | null = null;
      if (scenario && scenario.ouvert && hote.current) {
        const cadre = hote.current.getBoundingClientRect();
        for (const id of ["broder", "fils", "loupe", "replier", "fil-" + filScenario]) {
          const bouton = hote.current.querySelector<HTMLElement>(`[data-mode="${id}"]`);
          if (bouton) { const b = bouton.getBoundingClientRect(); positions.current[id] = { x: b.left - cadre.left + b.width / 2, y: b.top - cadre.top + b.height / 2 }; }
        }
        const centre = { x: s0.cx, y: s0.cy }, secours = (id: string) => positions.current[id] ?? centre;
        pointeur = positionCurseur(tt - s.debutDemo, {
          depart: { x: s0.cx + s0.r * .45, y: s0.cy - s0.r * .45 },
          broder: secours("broder"), fils: secours("fils"), couleur: secours("fil-" + filScenario),
          loupe: secours("loupe"), fleur: { x: cv.clientWidth / 2, y: cv.clientHeight / 2 }, replier: secours("replier"),
        });
      }
      if (curseur.current && pointeur) { curseur.current.style.left = `${pointeur.x}px`; curseur.current.style.top = `${pointeur.y}px`; }
      if (disque.current) {
        disque.current.style.opacity = String(scenario?.ouvert ? scenario.opacite : 1);
        disque.current.style.transform = `scale(${scenario?.ouvert ? scenario.echelle : 1})`;
      }
      /* la surprise : à 30,309 s (démonstration), le clip s'arrête ; les confettis battent, le mot est posé là où ils sont ; puis ils sont nettoyés */
      const franchi = tAvant < T_CONFETTIS && tt >= T_CONFETTIS && tt < T_CONFETTIS + 3;   /* on vient de passer le temps (même si l'appareil est lent) */
      const imgT = franchi ? morceaux.current!.image(Math.floor(T_CONFETTIS * c.fps)) ?? derniereImage : null;
      if (!ev && franchi && config.confettis !== null && s.demo && !s.mode && !confettiFait.current && !s.sansConfetti && imgT) {
        tt = T_CONFETTIS;
        const image = imgT.slice(), cells = Int16Array.from(image), N = c.grille;
        const nb = removeConfetti(cells, N, N), propre = Uint8Array.from(cells), marque = new Uint8Array(N * N), change: number[] = [];
        for (let i = 0; i < N * N; i++) if (propre[i] !== image[i]) { marque[i] = 255; change.push(i); }
        if (change.length) {
          /* là où ils sont le plus nombreux : des blocs de 10 × 10 points */
          const B = 10, nbB = N / B, bloc = new Array(nbB * nbB).fill(0); for (const i of change) bloc[Math.floor(i / N / B) * nbB + Math.floor((i % N) / B)]++;
          const meilleur = bloc.indexOf(Math.max(...bloc)), dans = change.filter(i => Math.floor(i / N / B) * nbB + Math.floor((i % N) / B) === meilleur);
          const gx = dans.reduce((a, i) => a + i % N, 0) / dans.length + .5, gy = dans.reduce((a, i) => a + Math.floor(i / N), 0) / dans.length + .5;
          const ordre = change.slice().sort((a, b) => Math.hypot(a % N - gx, Math.floor(a / N) - gy) - Math.hypot(b % N - gx, Math.floor(b / N) - gy));
          if (audio.current) { audio.current.pause(); audio.current.currentTime = T_CONFETTIS; } horloge.current.t0 = tt; horloge.current.depart = 0; r.image(image); derniereImage = image;
          evRef.current = { debut: performance.now(), t: tt, image, propre, ordre, marque, n: nb, replie: s.replie };
          /* le Disque se range un instant : on voit tout le clip, et le mot à sa vraie place (le fond, sans tambour) */
          const cppFond = c.grille / Math.max(W, H);
          const x = Math.max(80, Math.min(cv.clientWidth - 80, (W / 2 + (gx - N / 2) / cppFond) / dpr)), y = Math.max(40, Math.min(cv.clientHeight - 40, (H / 2 + (gy - N / 2) / cppFond) / dpr));
          setReplie(true); setConfettis({ x, y, n: nb, phase: "montre" }); r.marque(marque, 1);
        } else confettiFait.current = true;
      }
      const e2 = evRef.current;
      if (e2) {
        const el = (performance.now() - e2.debut) / 1000;
        if (el < MONTRE) r.marque(null, reduit() ? 1 : .6 + .4 * Math.sin(el * 9));
        else if (el < MONTRE + NETTOIE) {
          /* nettoyés depuis le mot, vers le bord : chaque point prend le fil de ses voisins */
          const k = Math.floor(e2.ordre.length * Math.min(1, (el - MONTRE) / NETTOIE * 1.1)), im = e2.image.slice(), m = e2.marque.slice();
          for (let j = 0; j < k; j++) { const i = e2.ordre[j]; im[i] = e2.propre[i]; m[i] = 0; }
          r.image(im); r.marque(m, 1); setConfettis(v => v && v.phase !== "nettoie" ? { ...v, phase: "nettoie" } : v);
        } else {
          r.image(e2.propre); derniereImage = e2.propre; r.marque(null, 0);
          evRef.current = null; confettiFait.current = true; setSansConfetti(true); setConfettis(null); setReplie(e2.replie);
          const a = audio.current, h = horloge.current;
          if (a && !h.sansSon) void a.play().catch(() => { h.sansSon = true; h.depart = performance.now(); }); else { h.depart = performance.now(); }
        }
      }
      tAvant = evRef.current ? T_CONFETTIS : tt;
      let eclat = 0; for (const [ta, f] of c.accents) if (tt - ta >= 0 && tt - ta < 1) eclat = Math.max(eclat, f / 99 * Math.exp(-(tt - ta) * 6));
      if (evRef.current) eclat = 0;   /* le clip est arrêté : le temps fort ne bat plus */
      /* la loupe : sous la main ; dans la démonstration, elle se promène autour du centre */
      let lp: [number, number, number, number] | null = null;
      const rayon = Math.max(56, cote * .12);
      if (scenario?.loupe && pointeur) lp = [pointeur.x * dpr, pointeur.y * dpr, rayon, 6];
      else if (s.effet?.loupe && !loupePos.current) { const a = tt * .9; lp = [W / 2 + Math.cos(a) * W * .3, H / 2 + Math.sin(a * 1.3) * H * .3, rayon, 6]; }
      else if (s.loupe && loupePos.current) lp = [loupePos.current[0] * dpr, loupePos.current[1] * dpr, rayon, 6];
      if (lp && derniereImage) {
        const q = place(lp[0], lp[1]); let cx = Math.floor(q[0]); const cy = Math.floor(q[1]);
        if (s.retourne) cx = c.grille - 1 - cx;
        const k = cx >= 0 && cy >= 0 && cx < c.grille && cy < c.grille ? derniereImage[cy * c.grille + cx] & 127 : null;
        setSousLoupe(v => v === k ? v : k);
      } else setSousLoupe(v => v === null ? v : null);
      const b = s.brode ?? { t0: 0, d: c.brodeJusqua };
      r.dessiner({ t: tt, battue: c.battue, brode: b.d, brodeT0: s.brode ? b.t0 : 0, eclat, envers: s.retourne,
        arriere: s.arriere || !!s.effet?.arriere, grille: s.grille, parties: vue, vue: [c.grille / 2, c.grille / 2, cpp], loupe: lp, tambour });
      if (s.lecture || evRef.current) planifier();
    };
    const planifier = () => { if (!raf) raf = requestAnimationFrame(boucle); };
    reveiller.current = planifier; planifier();
    return () => { if (raf) cancelAnimationFrame(raf); reveiller.current = null; instance.arreter(); if (rendu.current === instance) rendu.current = null; };
  }, [clip, maintenant, config.id, config.grossi, config.confettis, T_CONFETTIS]);
  /* Au repos, aucune boucle ne tourne ; un changement de commande, de taille ou de pointeur redessine une seule image. */
  useEffect(() => { reveiller.current?.(); }, [lecture, mode, etats, masquer, arriere, grille, retourne, loupe, brode, effet, demo, g, replie, sansConfetti, mouvementReduit, debutDemo, lance]);

  /* le plein écran de l'appareil (Échap le quitte aussi) */
  useEffect(() => { const f = () => setPlein(!!document.fullscreenElement); document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);
  /* Disque replié : Échap le redéploie */
  useEffect(() => { if (!replie) return; const f = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.fullscreenElement) setReplie(false); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [replie]);
  /* la fin du morceau : la lecture s'arrête */
  useEffect(() => {
    const a = audio.current; if (!a) return;
    const fin = () => {
      setLecture(false);
      if (integrationRef.current && !termine.current) {
        termine.current = true; integrationRef.current.onProgression(a.currentTime);
        integrationRef.current.onLecture(false, horloge.current.sansSon); integrationRef.current.onFin();
      }
    };
    a.addEventListener("ended", fin); return () => a.removeEventListener("ended", fin);
  }, []);

  /* choisir un outil reprend la main : la démonstration se met de côté */
  const main = () => { setDemo(false); setInfoDemo(""); };
  const modeCourant = (): number => {
    if (mode) return mode.code;
    const p = partieEn(clip?.parties ?? [], CODE_MODE), now = maintenant(); let m = p[0]?.[1] ?? 0; for (const [tt, c] of p) if (now >= tt) m = c; return m;
  };
  const choisirMode = (m: ModeClip | null) => { main(); if (m === null) { setMode(null); return; } setMode({ code: CODE_MODE[m], t0: maintenant(), avant: modeCourant() }); };
  const basculerFil = (i: number) => {
    main();
    setEtats(e => {
      const choisis = e.map((v, k) => (masquer ? v === 0 : v === 1 && e.some(x => x < 1)) ? k : -1).filter(k => k >= 0);
      const set = new Set(choisis); if (set.has(i)) set.delete(i); else set.add(i);
      if (!set.size) return e.map(() => 1);
      return e.map((_, k) => masquer ? (set.has(k) ? 0 : 1) : (set.has(k) ? 1 : .4));
    });
  };
  const pourcent = (() => { if (!clip) return 100; const b = brode ?? { t0: 0, d: clip.brodeJusqua }; return Math.round(100 * Math.min(1, Math.pow(Math.max(0, (t - b.t0) / b.d), 2.6))); })();

  const modes = useMemo<ModePoint[]>(() => {
    if (!clip) return [];
    const choisi = (i: number) => (guide?.couleur && i === indexFilGuide) || (masquer ? etats[i] === 0 : etats[i] === 1 && etats.some(x => x < 1));
    const fils = clip.fils.map((f, i) => ({ f, i })).sort((a, b) => b.f.points - a.f.points);
    const actuel = mode ? mode.code : -1;
    const m: ModePoint[] = [
      { id: "lecture", nom: lecture ? "Pause" : "Lecture", aide: lecture ? "mettre le clip en pause" : `lancer le clip avec sa musique : ${config.titre}`, groupe: "socle", icone: lecture ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />, actif: lecture, ouvrir: () => (lecture ? pause() : void jouer()) },
      { id: "fils", nom: "Fils", aide: `les ${clip.fils.length} fils DMC du clip : en choisir pour les illuminer ou les masquer`, groupe: "metier", icone: <Spline aria-hidden="true" />, actif: etats.some(x => x < 1), ouvrir: () => {},
        enfants: () => [
          { id: "fils-tout", nom: "Tout voir", aide: "tous les fils, comme dans le clip", groupe: "socle", resteOuvert: true, ouvrir: () => { main(); setEtats(clip.fils.map(() => 1)); } },
          { id: "fils-masquer", nom: masquer ? "Masquer" : "Illuminer", valeur: masquer ? "masque" : "lumière", aide: masquer ? "les fils choisis disparaissent : la toile nue ; toucher pour les illuminer plutôt" : "les fils choisis s’illuminent, les autres s’estompent ; toucher pour les masquer plutôt", groupe: "socle", resteOuvert: true,
            ouvrir: () => { main(); setMasquer(v => !v); setEtats(clip.fils.map(() => 1)); } },
          ...fils.map(({ f, i }): ModePoint => ({ id: "fil-" + i, nom: `DMC ${f.code}`, couleur: `rgb(${f.rgb.join(",")})`, aide: `${f.nom} · en moyenne ${Math.round(f.points / clip.images).toLocaleString("fr-FR")} points par image`, groupe: "metier", actif: choisi(i), resteOuvert: true, ouvrir: () => basculerFil(i) })),
        ] },
      { id: "affichage", nom: "Affichage", aide: "réaliste, toile, symboles, à plat ; la grille ; l’envers", groupe: "metier", icone: <Eye aria-hidden="true" />, ouvrir: () => {},
        enfants: () => [
          { id: "aff-clip", nom: "Suivre le clip", aide: "les rendus changent avec la musique, comme dans le clip", groupe: "socle", actif: !mode, resteOuvert: true, ouvrir: () => choisirMode(null) },
          ...(["tissu", "toile", "symboles", "mosaique"] as ModeClip[]).map((k): ModePoint => ({ id: "aff-" + k, nom: NOM_MODE[k], aide: AIDE_MODE[k], groupe: "metier", actif: actuel === CODE_MODE[k], resteOuvert: true, ouvrir: () => choisirMode(k) })),
          { id: "aff-grille", nom: "Grille", aide: grille ? "masquer le repère toutes les 10 cases (symboles)" : "montrer le repère toutes les 10 cases (symboles)", groupe: "socle", actif: grille, resteOuvert: true, ouvrir: () => { main(); setGrille(v => !v); } },
          { id: "aff-envers", nom: "L’envers", aide: "retourner le tambour : le dos de la broderie (calculé, pas photographié)", groupe: "metier", icone: <FlipHorizontal2 aria-hidden="true" />, actif: envers, resteOuvert: true, ouvrir: () => { main(); setEnvers(v => !v); } },
        ] },
      { id: "points", nom: "Points", aide: "croix, demi-point, points arrière", groupe: "creation", icone: <Layers aria-hidden="true" />, ouvrir: () => {},
        enfants: () => [
          { id: "pts-croix", nom: "Croix", aide: "la croix entière (réaliste)", groupe: "creation", actif: actuel === CODE_MODE.tissu, resteOuvert: true, ouvrir: () => choisirMode("tissu") },
          { id: "pts-demi", nom: "Demi-point", aide: AIDE_MODE.demi, groupe: "creation", actif: actuel === CODE_MODE.demi, resteOuvert: true, ouvrir: () => choisirMode("demi") },
          { id: "pts-confettis", nom: "Confettis", aide: sansConfetti ? "les confettis sont retirés ; toucher pour les garder" : "retirer les confettis : un point seul de sa couleur prend le fil de ses voisins (l’outil de l’atelier)", groupe: "creation", actif: sansConfetti, resteOuvert: true, ouvrir: () => { main(); setSansConfetti(v => !v); } },
          { id: "pts-arriere", nom: "Point arrière", aide: "les contours au point arrière, là où deux fils s’opposent (calculés)", groupe: "creation", actif: arriere, resteOuvert: true, ouvrir: () => { main(); setArriere(v => !v); } },
        ] },
      { id: "broder", nom: "Broder", aide: "le clip se rebrode depuis le centre, point par point", groupe: "creation", icone: <Sparkles aria-hidden="true" />, ouvrir: () => { main(); setBrode({ t0: maintenant(), d: 8 }); if (!lecture) void jouer(); } },
      { id: "loupe", nom: "Loupe", aide: "au survol, le point vivant au plus près ; au bord, son symbole du patron", groupe: "socle", icone: <Search aria-hidden="true" />, actif: loupe, ouvrir: () => { main(); setLoupe(v => !v); } },
      { id: "replier", nom: "Replier", aide: "le Disque se range : le clip brodé en entier, sur tout l’écran", groupe: "socle", icone: <Minimize2 aria-hidden="true" />, ouvrir: () => setReplie(true) },
      ...(document.fullscreenEnabled ? [{ id: "plein", nom: plein ? "Quitter" : "Plein écran", aide: plein ? "quitter le plein écran" : "le clip sur tout l’écran de l’appareil", groupe: "socle" as const, icone: plein ? <Shrink aria-hidden="true" /> : <Expand aria-hidden="true" />, actif: plein,
        ouvrir: () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); } }] : []),
      { id: "demo", nom: "Démonstration", aide: mouvementReduit && config.id === "fleur" ? "les gestes automatiques sont désactivés en mouvement réduit" : demo ? "la démonstration est en cours ; un outil choisi la met de côté" : "relancer les gestes illustrés au rythme du morceau", groupe: "socle", icone: <Clapperboard aria-hidden="true" />, actif: demo,
        ouvrir: () => { setMode(null); setEtats(clip.fils.map(() => 1)); setArriere(false); setEnvers(false); setBrode(null);
          if (config.id === "fleur") { setDebutDemo(maintenant()); setInfoDemo(mouvementReduit ? "Mouvement réduit : les gestes automatiques sont désactivés." : "Gestes scénarisés : aucun patron éditable n'est créé."); }
          setDemo(config.id !== "fleur" || !mouvementReduit); if (!lecture) void jouer(); } },
    ];
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, lecture, etats, masquer, mode, grille, envers, arriere, loupe, demo, plein, sansConfetti, t > 0, guide?.phase, guide?.couleur, guide?.chemin, indexFilGuide, mouvementReduit, config.id, config.titre]);

  /* la place des messages sous le disque (celle de l'atelier) */
  const c = g.Ro + 2;
  const fil = sousLoupe !== null && clip ? clip.fils[sousLoupe] : null;
  const cartouche = confettis ? (confettis.phase === "montre"
      ? <><b>Points › Confettis</b><span>{confettis.n.toLocaleString("fr-FR")} points seuls de leur couleur : difficiles à broder, ils dispersent le fil</span></>
      : <><b>Confettis nettoyés</b><span>chacun prend le fil de ses voisins : l’outil de l’atelier, sur le clip</span></>)
    : visee ? <><b>{visee.nom}</b>{visee.aide && <span>{visee.aide}</span>}</>
    : guideVisible && guide?.phase === "broder" ? <><b>Broder · geste scénarisé</b><span>Les points apparaissent dans les images originales.</span></>
    : guideVisible && (guide?.phase === "fils" || guide?.phase === "couleur") && indexFilGuide >= 0 && clip ? <><i className="pzt-pastille" style={{ background: `rgb(${clip.fils[indexFilGuide].rgb.join(",")})` }} aria-hidden="true" /><b>Fils › DMC {clip.fils[indexFilGuide].code}</b><span>{guide.couleur ? "Fil mis en lumière pour l’exemple ; l’œuvre reste intacte." : "Une nuance du clip, dans le vrai nuancier."}</span></>
    : guideVisible && guide?.phase === "loupe" ? <><b>Loupe · au plus près</b><span>Les véritables points du clip sont agrandis.</span></>
    : guideVisible && guide?.phase === "replier" ? <><b>Replier</b><span>Le Disque s’efface, la toile demeure.</span></>
    : infoDemo ? <span>{infoDemo}</span>
    : fil && loupePos.current ? <><i className="pzt-pastille" style={{ background: `rgb(${fil.rgb.join(",")})` }} aria-hidden="true" /><b>DMC {fil.code}</b><span> · {fil.nom}</span></>
    : etape?.effet?.fil && filMontre !== null && clip ? <><i className="pzt-pastille" style={{ background: `rgb(${clip.fils[filMontre].rgb.join(",")})` }} aria-hidden="true" /><b>Fils › DMC {clip.fils[filMontre].code}</b><span> · {clip.fils[filMontre].nom} : ses points s’illuminent, les autres s’estompent</span></>
    : etape ? <><b>{etape.titre}</b><span>{etape.texte}</span></>
    : fil ? <><i className="pzt-pastille" style={{ background: `rgb(${fil.rgb.join(",")})` }} aria-hidden="true" /><b>DMC {fil.code}</b><span> · {fil.nom}</span></>
    : pourcent < 100 ? <><b>Patron brodé à {pourcent} %</b><span>le clip se brode depuis le centre</span></>
    : <span>{g.etiquettes === "cartouche" ? "Touchez un outil : ce qu’il fait s’affiche ici." : "Survolez un outil : ce qu’il fait s’affiche ici."}</span>;
  const viser = (e: React.SyntheticEvent) => { const b = (e.target as Element).closest?.("[role=menuitem]") as HTMLElement | null; setVisee(b ? { nom: b.querySelector(".lp-mot")?.textContent?.replace("›", "").trim() || b.getAttribute("aria-label")?.split(",")[0] || "", aide: b.title } : null); };

  const surToile = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); loupePos.current = [e.clientX - r.left, e.clientY - r.top]; reveiller.current?.(); };
  const clavier = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const pas = e.shiftKey ? 40 : 10, d: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    if (e.key === " ") { e.preventDefault(); if (lecture) pause(); else void jouer(); return; }
    if (!d[e.key]) return; e.preventDefault(); main();
    const w = e.currentTarget.clientWidth, h = e.currentTarget.clientHeight, p = loupePos.current ?? [g.cx, g.cy];
    loupePos.current = [Math.max(0, Math.min(w, p[0] + d[e.key][0])), Math.max(0, Math.min(h, p[1] + d[e.key][1]))]; if (!loupe) setLoupe(true); reveiller.current?.();
  };

  if (erreur) return integre ? <div className="clip-erreur" role="status">{erreur}</div> : <main className="clip-erreur"><h1>{config.titre}</h1><p>{erreur}</p></main>;
  const Racine = integre ? "div" : "main";
  return <Racine ref={hote} className={"clip pzt pzt-ouvert pzt-etiq-" + g.etiquettes + (integre ? " clip-integre" : "") + (config.id === "fleur" ? " clip-fleur" : "")}
    data-demo={guide?.outil ?? etape?.outil} data-guide={guide?.phase} data-lecture={lecture ? "oui" : "non"} data-replie={replie ? "oui" : "non"}
    style={{ ["--pzt-x" as string]: g.cx + "px", ["--pzt-y" as string]: g.cy + "px", ["--pzt-r" as string]: g.r + "px", ["--pzt-rb" as string]: g.rb + "px", ["--pzt-ri" as string]: g.ri + "px", ["--pzt-ro" as string]: g.Ro + "px",
      ["--pzt-bl" as string]: g.env.l + "px", ["--pzt-bh" as string]: g.env.h + "px", ["--pzt-bd" as string]: g.env.rond + "px" }}
    onPointerOver={viser} onPointerOut={() => setVisee(null)} onFocus={viser}
    onPointerDownCapture={e => { if (guideVisible && (e.target as Element).closest?.(".pzt-point [role=menuitem]")) main(); }}
    onFocusCapture={e => { if (guideVisible && (e.target as Element).closest?.(".pzt-point [role=menuitem]")) main(); }}>
    {!integre && <h1 className="sr-only">{config.titre} : la démonstration des outils de Point Zéro</h1>}
    <div className={"clip-fond" + (enversVoulu ? " clip-retourne" : "")}>
      <canvas ref={toile} className={"clip-toile" + (retourne ? " clip-dos" : "")} tabIndex={0} role="img"
        aria-label={`${config.aria}, ${retourne ? "vu de l’envers" : "vu de l’endroit"}. Flèches : déplacer la loupe ; Espace : lecture ou pause.`}
        onPointerMove={e => { if (!guideVisible) surToile(e); }} onPointerDown={e => { if (guideVisible) main(); surToile(e); }}
        onPointerLeave={e => { if (e.pointerType === "mouse") { loupePos.current = null; reveiller.current?.(); } }} onKeyDown={clavier} />
    </div>
    {!lance && clip && !integre && <button type="button" className="clip-lancer" style={{ left: g.cx, top: g.cy }} onClick={() => void jouer()}>
      <Play aria-hidden="true" /><span>Lancer le clip</span><small>avec le son</small></button>}
    {!replie && <div ref={disque} className="clip-disque" style={{ transformOrigin: `${g.cx}px ${g.cy}px` }}>
      <div className="pzt-bois" aria-hidden="true" style={{ left: g.cx - g.rb, top: g.cy - g.rb, width: 2 * g.rb, height: 2 * g.rb }} />
      <svg className="pzt-anneau" width={2 * c} height={2 * c} aria-hidden="true">
        <defs><linearGradient id="clip-corps" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#262626" /><stop offset=".55" stopColor="#141414" /><stop offset="1" stopColor="#0c0c0c" /></linearGradient></defs>
        <path className="pzt-couronne-zone" d={anneauSvg(c, g.ri, g.Ro)} fillRule="evenodd" fill="url(#clip-corps)" />
        <circle cx={c} cy={c} r={g.Ro - 1.5} className="pzt-rebord" /><circle cx={c} cy={c} r={g.ri + 1.5} className="pzt-rebord-int" />
        <circle cx={c} cy={c} r={g.rho} className="pzt-sillon" />
      </svg>
      <span className="pzt-vis" aria-hidden="true" />
      {clip && <div className="pzt-point">
        <Point scene tambour={{ rayon: g.rho, cote: 2 * c, parPage: g.capacite - 3 }} contexte="clip-brode" memoire="clip-brode" modes={modes} etiquette={config.titre}
          cheminScenario={guideVisible ? (guide?.chemin === "fils" ? ["fils"] : []) : undefined}
          pageScenario={guideVisible && guide?.chemin === "fils" ? pageFilGuide : 0} />
      </div>}
    </div>}
    {guideVisible && !replie && <div ref={curseur} className="clip-pointeur-demo" aria-hidden="true"><svg viewBox="0 0 28 34" fill="none"><path d="M3 2v25l6-6 5 10 4-2-5-10h9L3 2Z" fill="white" stroke="#17131c" strokeWidth="2" strokeLinejoin="round" /></svg></div>}
    {guideVisible && <div className="clip-guide-indication" aria-hidden="true"><span /> Gestes scénarisés <i>·</i> le film reste inchangé</div>}
    {confettis && <p className={"clip-confettis clip-confettis-" + confettis.phase} style={{ left: confettis.x, top: confettis.y }} aria-hidden="true">CONFETTIS</p>}
    {replie && !confettis && <button type="button" className="clip-deplier" onClick={() => { main(); setReplie(false); }}><span className="lp-centre" aria-hidden="true" />Le Disque</button>}
    {(!integre || !replie || !!infoDemo) && <p className="pzt-cartouche clip-cartouche" aria-hidden="true" style={replie ? { top: "auto", bottom: 104 } : undefined}>{cartouche}</p>}
    {!integre && clip && <div className="clip-temps" style={replie ? { top: "auto", bottom: 44 } : { top: g.cy + g.Ro + 64 }}>
      <span>{mmss(t)}</span>
      <input type="range" min={0} max={clip.duree} step={0.1} value={t} aria-label="Avancer dans le clip" onChange={e => aller(parseFloat(e.target.value))} />
      <span>{mmss(clip.duree)}</span>
    </div>}
    {!integre && <p className="clip-credit" style={replie ? { top: "auto", bottom: 12 } : { top: g.cy + g.Ro + 96 }}>{config.credit} · {clip ? `${clip.fils.length} fils DMC` : "…"}</p>}
    <audio ref={audio} src={AUDIO} preload="auto" />
    <span className="sr-only" role="status" aria-live="polite">{guideVisible ? "Démonstration : gestes scénarisés, aucun patron éditable n’est créé." : infoDemo || (confettis ? (confettis.phase === "montre" ? `Le clip s’arrête : ${confettis.n} confettis, des points seuls de leur couleur.` : "Les confettis sont nettoyés ; le clip reprend.") : etape ? `${etape.titre} : ${etape.texte}` : "")}</span>
    {!clip && <p className="clip-chargement" style={{ left: g.cx, top: g.cy }}>La toile se prépare…</p>}
  </Racine>;
});

/** Même lecteur et même configuration que /studio/fleur-du-ciel, avec les URL du site public. */
export const ClipFleurIntroduction = forwardRef<ControleClip, { integration: IntegrationClip }>(function ClipFleurIntroduction({ integration }, ref) {
  const config = useMemo<ConfigClip>(() => ({ ...FLEUR, donnees: "/studio/clip/fleur-du-ciel/", audio: "/studio/clip/fleur-du-ciel/la-fleur-du-ciel.m4a" }), []);
  return <ClipBrode ref={ref} config={config} integration={integration} />;
});

export default ClipBrode;

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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Eye, FlipHorizontal2, Layers, Pause, Play, Search, Sparkles, Spline } from "lucide-react";
import Point from "../components/point/Point";
import type { ModePoint } from "../lib/point/modes";
import { anneauSvg, geometrieDisque, type Disque } from "../lib/tambour/disque";
import { lireClip, Morceaux, partieEn, type Clip } from "./donnees";
import { CODE_MODE, RenduClip, type ModeClip } from "./rendu";
import "../components/TambourAtelier.css";
import "./clip.css";

const BASE = import.meta.env.BASE_URL;
/* publiés avec l’accord de Matt (1/11/2026) : les données du clip et « Amor amour 2 », sa musique */
const DONNEES = BASE + "clip/uptown/", AUDIO = DONNEES + "amor-amour-2.m4a";
const reduit = () => document.documentElement.getAttribute("data-pz-motion") === "reduce" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const NOM_MODE: Record<ModeClip, string> = { tissu: "Réaliste", toile: "Toile", symboles: "Symboles", mosaique: "À plat", demi: "Demi-point" };
const AIDE_MODE: Record<ModeClip, string> = {
  tissu: "la vraie broderie : deux brins torsadés par croix, serrés",
  toile: "le travail sur l’Aida : des croix fines, la toile claire laissée nue",
  symboles: "le patron imprimé : un symbole par fil, la grille et un repère toutes les 10 cases",
  mosaique: "les couleurs DMC à plat, une case par point",
  demi: "le demi-point : seulement « / », la première moitié de chaque croix",
};
const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** une étape de la démonstration : à l'instant t, pendant d secondes, le Disque montre un outil */
interface Etape { t: number; d: number; outil: string; titre: string; texte: string; effet?: { fil?: "premier"; arriere?: boolean; envers?: boolean; loupe?: boolean; grille?: boolean } }

export default function ClipBrode() {
  const [clip, setClip] = useState<Clip | null>(null), [erreur, setErreur] = useState("");
  const morceaux = useRef<Morceaux | null>(null), rendu = useRef<RenduClip | null>(null);
  const toile = useRef<HTMLCanvasElement>(null), audio = useRef<HTMLAudioElement>(null);
  const [lecture, setLecture] = useState(false), [lance, setLance] = useState(false), [t, setT] = useState(0);
  const horloge = useRef({ depart: 0, t0: 0, sansSon: false });

  /* ce que la personne a choisi (null : on suit le clip) */
  const [demo, setDemo] = useState(true);
  const [mode, setMode] = useState<{ code: number; t0: number; avant: number } | null>(null);
  const [etats, setEtats] = useState<number[]>([]);            // par fil : 1 montré, .4 estompé, 0 caché
  const [masquer, setMasquer] = useState(false);
  const [arriere, setArriere] = useState(false), [grille, setGrille] = useState(true), [envers, setEnvers] = useState(false), [retourne, setRetourne] = useState(false);
  const [loupe, setLoupe] = useState(() => !!window.matchMedia?.("(pointer: fine)").matches);
  const loupePos = useRef<[number, number] | null>(null);
  const [brode, setBrode] = useState<{ t0: number; d: number } | null>(null);
  const [visee, setVisee] = useState<{ nom: string; aide: string } | null>(null);
  const [sousLoupe, setSousLoupe] = useState<number | null>(null);
  const filDemo = useRef<number | null>(null), [filMontre, setFilMontre] = useState<number | null>(null);

  useEffect(() => { lireClip(DONNEES).then(c => { setClip(c); setEtats(c.fils.map(() => 1)); morceaux.current = new Morceaux(DONNEES, c); void morceaux.current.attendre(0); })
    .catch(e => setErreur(String(e?.message ?? e))); }, []);

  /* le Disque : la place de la page entière (pas de barre en haut) ; les messages et la ligne du temps dessous */
  const mesurer = useCallback((): Disque => {
    const texte = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pz-user-font-scale")) || 1;
    return geometrieDisque(window.innerWidth, window.innerHeight, 12, { texte, bas: 96, court: true });
  }, []);
  const [g, setG] = useState(mesurer);
  useEffect(() => { const f = () => setG(mesurer()); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [mesurer]);

  /* la démonstration, écrite sur les parties mesurées du morceau */
  const etapes = useMemo<Etape[]>(() => {
    if (!clip) return [];
    const p = Object.fromEntries(clip.parties.map(([tt, m], i) => [i, { t: tt, m }]));
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
  }, [clip]);
  const etape = demo ? [...etapes].reverse().find(e => t >= e.t && t < e.t + e.d) ?? null : null;
  const effet = etape?.effet;

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
    const a = audio.current, h = horloge.current; setLance(true);
    if (clip && maintenant() >= clip.duree - .05) { if (a) a.currentTime = 0; h.t0 = 0; }
    try { if (!a) throw new Error(); await a.play(); h.sansSon = false; } catch { h.sansSon = true; h.depart = performance.now(); }
    setLecture(true);
  }, [clip, maintenant]);
  const pause = useCallback(() => { const h = horloge.current; h.t0 = maintenant(); h.depart = 0; audio.current?.pause(); setLecture(false); }, [maintenant]);
  const aller = (v: number) => { const h = horloge.current; if (audio.current) audio.current.currentTime = v; h.t0 = v; if (h.depart) h.depart = performance.now(); setT(v); };

  /* le rendu, à chaque image de l'écran */
  const etatRef = useRef({ clip, mode, etats, masquer, arriere, grille, retourne, loupe, brode, effet, demo });
  etatRef.current = { clip, mode, etats, masquer, arriere, grille, retourne, loupe, brode, effet, demo };
  useEffect(() => {
    if (!clip || !toile.current) return;
    try { rendu.current = new RenduClip(toile.current); } catch (e) { setErreur("Votre navigateur ne peut pas dessiner la broderie (WebGL 2) : " + String((e as Error).message)); return; }
    let raf = 0, dernier = -1, derniereImage: Uint8Array | null = null;
    let qualite = 1, lent = 0, dernierInstant = 0;
    const boucle = () => {
      raf = requestAnimationFrame(boucle);
      const s = etatRef.current, c = s.clip!, r = rendu.current!, cv = toile.current!;
      let tt = Math.min(c.duree, maintenant());
      if (horloge.current.sansSon && horloge.current.depart && tt >= c.duree) { horloge.current.t0 = c.duree; horloge.current.depart = 0; setLecture(false); }
      setT(v => Math.abs(v - tt) > .2 ? tt : v);
      const n = Math.min(c.images - 1, Math.floor(tt * c.fps));
      if (n !== dernier) { const im = morceaux.current!.image(n); if (im) { r.image(im); dernier = n; derniereImage = im; } }
      /* les fils : illuminés (les autres estompés) ou masqués ; la démonstration peut en illuminer un */
      let et = s.etats.slice();
      if (s.effet?.fil === "premier") {
        /* le fil montré : le plus présent dans l'image à ce moment, après le fond ; choisi une fois pour l'étape */
        if (filDemo.current === null && derniereImage) { const n = new Array(c.fils.length).fill(0); for (const k of derniereImage) n[k]++; filDemo.current = n.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p)[1].i; setFilMontre(filDemo.current); }
        if (filDemo.current !== null) et = et.map((_, i) => i === filDemo.current ? 1 : .4);
      } else if (filDemo.current !== null) { filDemo.current = null; setFilMontre(null); }
      r.palette(c.fils.map((f, i) => ({ rgb: f.rgb, etat: et[i] ?? 1 })));
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
      const dpr = Math.min(2, window.devicePixelRatio || 1) * qualite, cote = cv.clientWidth * dpr;
      if (cv.width !== Math.round(cote)) { cv.width = cv.height = Math.round(cote); }
      const cpp = c.grille / cote / z;
      let eclat = 0; for (const [ta, f] of c.accents) if (tt - ta >= 0 && tt - ta < 1) eclat = Math.max(eclat, f / 99 * Math.exp(-(tt - ta) * 6));
      /* la loupe : sous la main ; dans la démonstration, elle se promène autour du centre */
      let lp: [number, number, number, number] | null = null;
      const rayon = Math.max(56, cote * .17);
      if (s.effet?.loupe && !loupePos.current) { const a = tt * .9; lp = [cote / 2 + Math.cos(a) * cote * .18, cote / 2 + Math.sin(a * 1.3) * cote * .14, rayon, 6]; }
      else if (s.loupe && loupePos.current) lp = [loupePos.current[0] * dpr, loupePos.current[1] * dpr, rayon, 6];
      if (lp && derniereImage) {
        let cx = Math.floor(c.grille / 2 + (lp[0] - cote / 2) * cpp), cy = Math.floor(c.grille / 2 + (lp[1] - cote / 2) * cpp);
        if (s.retourne) cx = c.grille - 1 - cx;
        const k = cx >= 0 && cy >= 0 && cx < c.grille && cy < c.grille ? derniereImage[cy * c.grille + cx] : null;
        setSousLoupe(v => v === k ? v : k);
      } else setSousLoupe(v => v === null ? v : null);
      const b = s.brode ?? { t0: 0, d: c.brodeJusqua };
      r.dessiner({ t: tt, battue: c.battue, brode: b.d, brodeT0: s.brode ? b.t0 : 0, eclat, envers: s.retourne,
        arriere: s.arriere || !!s.effet?.arriere, grille: s.grille, parties: vue, vue: [c.grille / 2, c.grille / 2, cpp], loupe: lp });
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [clip, maintenant]);

  /* la fin du morceau : la lecture s'arrête */
  useEffect(() => { const a = audio.current; if (!a) return; const fin = () => setLecture(false); a.addEventListener("ended", fin); return () => a.removeEventListener("ended", fin); }, []);

  /* choisir un outil reprend la main : la démonstration se met de côté */
  const main = () => setDemo(false);
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
    const choisi = (i: number) => masquer ? etats[i] === 0 : etats[i] === 1 && etats.some(x => x < 1);
    const fils = clip.fils.map((f, i) => ({ f, i })).sort((a, b) => b.f.points - a.f.points);
    const actuel = mode ? mode.code : -1;
    const m: ModePoint[] = [
      { id: "lecture", nom: lecture ? "Pause" : "Lecture", aide: lecture ? "mettre le clip en pause" : "lancer le clip, avec « Amor amour 2 »", groupe: "socle", icone: lecture ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />, actif: lecture, ouvrir: () => (lecture ? pause() : void jouer()) },
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
          { id: "pts-arriere", nom: "Point arrière", aide: "les contours au point arrière, là où deux fils s’opposent (calculés)", groupe: "creation", actif: arriere, resteOuvert: true, ouvrir: () => { main(); setArriere(v => !v); } },
        ] },
      { id: "broder", nom: "Broder", aide: "le clip se rebrode depuis le centre, point par point", groupe: "creation", icone: <Sparkles aria-hidden="true" />, ouvrir: () => { main(); setBrode({ t0: maintenant(), d: 8 }); if (!lecture) void jouer(); } },
      { id: "loupe", nom: "Loupe", aide: "au survol, le point vivant au plus près ; au bord, son symbole du patron", groupe: "socle", icone: <Search aria-hidden="true" />, actif: loupe, ouvrir: () => { main(); setLoupe(v => !v); } },
      { id: "demo", nom: "Démonstration", aide: demo ? "la démonstration est en cours ; un outil choisi la met de côté" : "relancer la démonstration : le Disque montre ses outils au rythme du morceau", groupe: "socle", icone: <Clapperboard aria-hidden="true" />, actif: demo,
        ouvrir: () => { setDemo(true); setMode(null); setEtats(clip.fils.map(() => 1)); setArriere(false); setEnvers(false); setBrode(null); if (!lecture) void jouer(); } },
    ];
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip, lecture, etats, masquer, mode, grille, envers, arriere, loupe, demo, t > 0]);

  /* la place des messages sous le disque (celle de l'atelier) */
  const c = g.Ro + 2;
  const fil = sousLoupe !== null && clip ? clip.fils[sousLoupe] : null;
  const cartouche = visee ? <><b>{visee.nom}</b>{visee.aide && <span>{visee.aide}</span>}</>
    : fil && loupePos.current ? <><i className="pzt-pastille" style={{ background: `rgb(${fil.rgb.join(",")})` }} aria-hidden="true" /><b>DMC {fil.code}</b><span> · {fil.nom}</span></>
    : etape?.effet?.fil && filMontre !== null && clip ? <><i className="pzt-pastille" style={{ background: `rgb(${clip.fils[filMontre].rgb.join(",")})` }} aria-hidden="true" /><b>Fils › DMC {clip.fils[filMontre].code}</b><span> · {clip.fils[filMontre].nom} : ses points s’illuminent, les autres s’estompent</span></>
    : etape ? <><b>{etape.titre}</b><span>{etape.texte}</span></>
    : fil ? <><i className="pzt-pastille" style={{ background: `rgb(${fil.rgb.join(",")})` }} aria-hidden="true" /><b>DMC {fil.code}</b><span> · {fil.nom}</span></>
    : pourcent < 100 ? <><b>Patron brodé à {pourcent} %</b><span>le clip se brode depuis le centre</span></>
    : <span>{g.etiquettes === "cartouche" ? "Touchez un outil : ce qu’il fait s’affiche ici." : "Survolez un outil : ce qu’il fait s’affiche ici."}</span>;
  const viser = (e: React.SyntheticEvent) => { const b = (e.target as Element).closest?.("[role=menuitem]") as HTMLElement | null; setVisee(b ? { nom: b.querySelector(".lp-mot")?.textContent?.replace("›", "").trim() || b.getAttribute("aria-label")?.split(",")[0] || "", aide: b.title } : null); };

  const surToile = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); loupePos.current = [e.clientX - r.left, e.clientY - r.top]; };
  const clavier = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const pas = e.shiftKey ? 40 : 10, d: Record<string, [number, number]> = { ArrowLeft: [-pas, 0], ArrowRight: [pas, 0], ArrowUp: [0, -pas], ArrowDown: [0, pas] };
    if (e.key === " ") { e.preventDefault(); if (lecture) pause(); else void jouer(); return; }
    if (!d[e.key]) return; e.preventDefault();
    const w = e.currentTarget.clientWidth, p = loupePos.current ?? [w / 2, w / 2];
    loupePos.current = [Math.max(0, Math.min(w, p[0] + d[e.key][0])), Math.max(0, Math.min(w, p[1] + d[e.key][1]))]; if (!loupe) setLoupe(true);
  };

  if (erreur) return <main className="clip-erreur"><h1>UPTOWN brodé</h1><p>{erreur}</p></main>;
  return <main className={"clip pzt pzt-ouvert pzt-etiq-" + g.etiquettes} data-demo={etape?.outil}
    style={{ ["--pzt-x" as string]: g.cx + "px", ["--pzt-y" as string]: g.cy + "px", ["--pzt-r" as string]: g.r + "px", ["--pzt-rb" as string]: g.rb + "px", ["--pzt-ri" as string]: g.ri + "px", ["--pzt-ro" as string]: g.Ro + "px",
      ["--pzt-bl" as string]: g.env.l + "px", ["--pzt-bh" as string]: g.env.h + "px", ["--pzt-bd" as string]: g.env.rond + "px" }}
    onPointerOver={viser} onPointerOut={() => setVisee(null)} onFocus={viser}>
    <h1 className="sr-only">UPTOWN brodé : la démonstration des outils de Point Zéro</h1>
    <div className="pzt-voile" aria-hidden="true" />
    <div className="pzt-bois" aria-hidden="true" style={{ left: g.cx - g.rb, top: g.cy - g.rb, width: 2 * g.rb, height: 2 * g.rb }} />
    <div className={"clip-tambour" + (enversVoulu ? " clip-retourne" : "")} style={{ left: g.cx - g.r, top: g.cy - g.r, width: 2 * g.r, height: 2 * g.r }}>
      <canvas ref={toile} className={"clip-toile" + (retourne ? " clip-dos" : "")} tabIndex={0} role="img"
        aria-label={`Le clip UPTOWN brodé au point de croix, ${retourne ? "vu de l’envers" : "vu de l’endroit"}. Flèches : déplacer la loupe ; Espace : lecture ou pause.`}
        onPointerMove={surToile} onPointerDown={surToile} onPointerLeave={e => { if (e.pointerType === "mouse") loupePos.current = null; }} onKeyDown={clavier} />
    </div>
    {!lance && clip && <button type="button" className="clip-lancer" style={{ left: g.cx, top: g.cy }} onClick={() => void jouer()}>
      <Play aria-hidden="true" /><span>Lancer le clip</span><small>avec le son</small></button>}
    <svg className="pzt-anneau" width={2 * c} height={2 * c} aria-hidden="true">
      <defs><linearGradient id="clip-corps" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#262626" /><stop offset=".55" stopColor="#141414" /><stop offset="1" stopColor="#0c0c0c" /></linearGradient></defs>
      <path className="pzt-couronne-zone" d={anneauSvg(c, g.ri, g.Ro)} fillRule="evenodd" fill="url(#clip-corps)" />
      <circle cx={c} cy={c} r={g.Ro - 1.5} className="pzt-rebord" /><circle cx={c} cy={c} r={g.ri + 1.5} className="pzt-rebord-int" />
      <circle cx={c} cy={c} r={g.rho} className="pzt-sillon" />
    </svg>
    <span className="pzt-vis" aria-hidden="true" />
    {clip && <div className="pzt-point">
      <Point scene tambour={{ rayon: g.rho, cote: 2 * c, parPage: g.capacite - 3 }} contexte="clip-brode" memoire="clip-brode" modes={modes} etiquette="UPTOWN brodé" />
    </div>}
    <p className="pzt-cartouche clip-cartouche" aria-hidden="true">{cartouche}</p>
    {clip && <div className="clip-temps" style={{ top: g.cy + g.Ro + 64 }}>
      <span>{mmss(t)}</span>
      <input type="range" min={0} max={clip.duree} step={0.1} value={t} aria-label="Avancer dans le clip" onChange={e => aller(parseFloat(e.target.value))} />
      <span>{mmss(clip.duree)}</span>
    </div>}
    <p className="clip-credit" style={{ top: g.cy + g.Ro + 96 }}>UPTOWN (Saint-Luc) · musique « Amor amour 2 », Matt · {clip ? `${clip.fils.length} fils DMC` : "…"}</p>
    <audio ref={audio} src={AUDIO} preload="auto" />
    <span className="sr-only" role="status" aria-live="polite">{etape ? `${etape.titre} : ${etape.texte}` : ""}</span>
    {!clip && <p className="clip-chargement" style={{ left: g.cx, top: g.cy }}>La toile se prépare…</p>}
  </main>;
}

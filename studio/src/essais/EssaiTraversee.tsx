/**
 * Essai privé (phase E, première scène seulement) : « le Point traverse la page ».
 * Le héros (la une florale, inchangée) → le Point apparaît → au défilement, il se déploie en Disque et descend dans la scène
 * « 01 · L'origine » (les mêmes contenus que l'édition), où ses commandes deviennent celles de la scène.
 * - Un seul objet à l'écran : le même Point, présenté fermé (héros) puis en disque (scène). Il suit le défilement de la personne
 *   (jamais de mouvement imposé) ; mouvement réduit : il reste posé à sa place dans chaque scène, sans voyage.
 * - Sur ordinateur (pointeur fin), un curseur d'assistance facultatif accompagne la souris : un anneau décalé qui dit ce que
 *   le Point propose sous la main. Il ne remplace pas le pointeur du système et laisse passer tous les clics. Sur téléphone : rien ne suit le doigt.
 * Adresse : /essai-traversee. Rien n'est publié ; aucune restructuration de la landing.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, ExternalLink, MousePointer2, Palette, Search, Undo2 } from "lucide-react";
import UneFlorale from "../components/UneFlorale";
import Brode, { type Broderie } from "../components/edition/Brode";
import Point from "../components/point/Point";
import { Disque } from "../components/edition/Edition";
import { mouvementReduit } from "../components/edition/defilement";
import { adresse, ORIGINE } from "../components/edition/contenus";
import { Riche, TitreEt } from "../components/edition/Riche";
import { FLOSS } from "../lib/dmc";
import type { ModePoint } from "../lib/point/modes";
import "../design/aime.css";
import "../components/CrossStitchHome.css";
import "../components/edition/Edition.css";
import "../components/edition/Histoire.css";
import "./EssaiTraversee.css";

const CURSEUR_CLE = "pointzero:essai:curseur-assistance";
const pointeurFin = () => typeof window.matchMedia === "function" && window.matchMedia("(pointer: fine)").matches;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Le curseur d'assistance : un anneau qui accompagne la souris, décalé, sans jamais capter un clic ; il dit ce que le Point propose ici. */
function CurseurAssistant() {
  const anneau = useRef<HTMLDivElement>(null), [mot, setMot] = useState("");
  useEffect(() => {
    let x = -100, y = -100, cx = -100, cy = -100, raf = 0, vu = "";
    const lire = (el: Element | null) => {
      const sous = el?.closest?.(".lp-anneau, .lp-point, .tv-voyageur, .lp-panneau"), cible = el?.closest?.("[data-assistance]");
      const m = sous ? "" : cible?.getAttribute("data-assistance") ?? "";
      if (m !== vu) { vu = m; setMot(m); }
    };
    const suivre = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x = e.clientX; y = e.clientY; lire(e.target as Element | null);
      if (!raf) raf = requestAnimationFrame(pas);
    };
    /* la page défile sous la main : ce qui est sous le pointeur change, le mot aussi */
    const defiler = () => { if (x >= 0) lire(document.elementFromPoint(x, y)); };
    const pas = () => {
      raf = 0; cx += (x - cx) * .22; cy += (y - cy) * .22;
      if (anneau.current) anneau.current.style.transform = `translate(${cx + 18}px, ${cy + 18}px)`;
      if (Math.abs(x - cx) + Math.abs(y - cy) > .5) raf = requestAnimationFrame(pas);
    };
    window.addEventListener("pointermove", suivre, { passive: true }); window.addEventListener("scroll", defiler, { passive: true });
    return () => { window.removeEventListener("pointermove", suivre); window.removeEventListener("scroll", defiler); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={anneau} className={"tv-curseur" + (mot ? " tv-curseur-mot" : "")} aria-hidden="true"><span className="lp-centre" />{mot && <b>{mot}</b>}</div>;
}

export default function EssaiTraversee() {
  /* mouvement réduit, ou téléphone (§9) : rien ne voyage ; le Point est posé dans la zone de chaque scène */
  const reduit = mouvementReduit() || window.innerWidth < 820 || (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);
  const ancreUne = useRef<HTMLDivElement>(null), ancreScene = useRef<HTMLDivElement>(null), couche = useRef<HTMLDivElement>(null), scene = useRef<HTMLElement>(null);
  /* où en est le voyage : 0 dans le héros, 1 posé dans la scène (suit le défilement de la personne) */
  const [lieu, setLieu] = useState<"une" | "origine">("une");
  const [loupe, setLoupe] = useState(0), [fils, setFils] = useState<number[]>([]), [filVu, setFilVu] = useState<number | null>(null);
  /* décision de Matt (§9) : le curseur d'assistance est proposé, jamais imposé ; activation explicite, puis préférence mémorisée */
  const [curseur, setCurseur] = useState(() => { try { return localStorage.getItem(CURSEUR_CLE) === "1"; } catch { return false; } });
  const [propose, setPropose] = useState(() => { try { return localStorage.getItem(CURSEUR_CLE) === null; } catch { return true; } });
  const changerCurseur = (v = !curseur) => { setCurseur(v); setPropose(false); try { localStorage.setItem(CURSEUR_CLE, v ? "1" : "0"); } catch { /* rien */ } };
  const O = ORIGINE.histoire.origine;
  const allerScene = () => { (ancreScene.current ?? scene.current)?.scrollIntoView({ behavior: "auto", block: "center" });   /* un saut : le Point rejoint directement sa place, sans rejouer le voyage */ scene.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true }); };

  /* ce que le curseur d'assistance dit au-dessus du héros (la une reste inchangée : on annote seulement) */
  useEffect(() => { document.querySelector(".ru-fond")?.setAttribute("data-assistance", "Sous la loupe, la peinture se brode"); }, []);
  useLayoutEffect(() => {
    if (reduit) return;
    let raf = 0;
    const placer = () => {
      raf = 0;
      const a = ancreUne.current?.getBoundingClientRect(), b = ancreScene.current?.getBoundingClientRect(), el = couche.current; if (!a || !b || !el) return;
      const H = window.innerHeight;
      /* 0 quand la scène entre par le bas, 1 quand son disque est au milieu de l'écran */
      const t = Math.min(1, Math.max(0, (H - b.top) / ((H + b.height) / 2)));
      const e = t * t * (3 - 2 * t);
      const s = lerp(a.width, b.width, e), x = lerp(a.left + a.width / 2, b.left + b.width / 2, e), y = lerp(a.top + a.height / 2, b.top + b.height / 2, e);
      el.style.setProperty("--tv-x", x + "px"); el.style.setProperty("--tv-y", y + "px"); el.style.setProperty("--tv-s", s + "px"); el.style.setProperty("--tv-t", e.toFixed(3));
      setLieu(t >= .5 ? "origine" : "une");
    };
    const demander = () => { if (!raf) raf = requestAnimationFrame(placer); };
    placer();
    window.addEventListener("scroll", demander, { passive: true }); window.addEventListener("resize", demander);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", demander); window.removeEventListener("resize", demander); };
  }, [reduit]);

  const outilCurseur: ModePoint[] = pointeurFin() && !reduit ? [{ id: "curseur", nom: curseur ? "Curseur d’assistance : oui" : "Curseur d’assistance : non", icone: <MousePointer2 aria-hidden="true" />,
    aide: curseur ? "un anneau accompagne la souris et dit ce que le Point propose ; le pointeur reste le vôtre" : "faire accompagner la souris par le Point", groupe: "socle", actif: curseur, resteOuvert: true, ouvrir: () => changerCurseur() }] : [];
  /* les commandes changent avec le lieu : le même Point, d'autres gestes */
  const modesUne: ModePoint[] = [
    { id: "commencer", nom: "Commencer l’histoire", icone: <BookOpen aria-hidden="true" />, aide: "descendre vers « L’origine » : le Point vous accompagne", groupe: "creation", ouvrir: allerScene },
    { id: "atelier", nom: "Atelier", icone: <ExternalLink aria-hidden="true" />, aide: "ouvrir le studio de broderie", groupe: "creation", ouvrir: () => window.location.assign(import.meta.env.BASE_URL + "atelier") },
    ...outilCurseur,
  ];
  const modesOrigine: ModePoint[] = [
    { id: "loupe", nom: "Loupe", icone: <Search aria-hidden="true" />, aide: "poser la loupe au centre : l’image se brode, aux fils DMC", groupe: "metier", resteOuvert: true, ouvrir: () => setLoupe(n => n + 1) },
    ...(fils.length ? [{ id: "nuancier", nom: "Nuancier", icone: <Palette aria-hidden="true" />, aide: `les ${fils.length} fils DMC de cette broderie`, groupe: "metier" as const, ouvrir: () => {},
      enfants: () => fils.map((i): ModePoint => ({ id: "fil-" + FLOSS[i].code, nom: "DMC " + FLOSS[i].code, couleur: FLOSS[i].hex, aide: FLOSS[i].name, groupe: "metier", actif: filVu === i, resteOuvert: true, ouvrir: () => setFilVu(i) })) } satisfies ModePoint] : []),
    { id: "atelier", nom: "Atelier", icone: <ExternalLink aria-hidden="true" />, aide: "broder à votre tour : le studio", groupe: "creation", ouvrir: () => window.location.assign(import.meta.env.BASE_URL + "atelier") },
    { id: "haut", nom: "Revenir à la une", icone: <Undo2 aria-hidden="true" />, aide: "remonter au héros : le Point redevient un point", groupe: "socle", ouvrir: () => window.scrollTo({ top: 0, behavior: "auto" }) },
    ...outilCurseur,
  ];
  const surFils = (b: Broderie) => setFils(b.palette.slice(0, 18));

  const pointUne: ReactNode = <Point contexte="traversee-une" etiquette="Le Point : commencer l’histoire, l’atelier" modes={modesUne} />;
  const disque: ReactNode = <Disque contexte="traversee-origine" modes={modesOrigine} etiquette="Le Point déployé : la loupe, le nuancier, l’atelier" max={1} />;
  return <main className="tv" data-lieu={lieu}>
    <UneFlorale titre="Point Zéro">
      <p className="mm-sous">Du tableau à la dernière croix.</p>
      <p className="tv-note">Essai privé : une seule scène, pour éprouver le Point qui traverse la page.</p>
      <div ref={ancreUne} className="tv-ancre-une">{reduit && pointUne}</div>
      {propose && pointeurFin() && !mouvementReduit() && <div className="tv-invite" role="group" aria-label="Curseur d’assistance">
        <p><b>Un curseur d’assistance ?</b> Un anneau accompagne votre souris et dit ce que le Point propose. Votre pointeur reste le vôtre.</p>
        <button type="button" className="tv-invite-oui" onClick={() => changerCurseur(true)}>L’activer</button><button type="button" onClick={() => changerCurseur(false)}>Non merci</button></div>}
    </UneFlorale>

    <section ref={scene} id="tv-origine" className="ed-scene hi-scene hi-sombre tv-scene" aria-labelledby="tv-origine-titre">
      <div className="ed-plateau hi-plateau">
        <div data-assistance="Le Point : loupe et nuancier"><Brode src={adresse(O.media.src)} cols={84} maxFils={16} loupeDemandee={loupe} surFils={surFils} alt={O.media.alt} legende={O.media.legende} cadrage={O.media.cadrage} /></div>
        <div className="hi-texte">
          <p className="ed-num">{O.kicker}</p>
          <h2 id="tv-origine-titre" tabIndex={-1}><TitreEt t={O.titre} /></h2>
          <p className="hi-sous">{O.sous}</p>
          <p className="hi-corps"><Riche t={O.corps} /></p>
          {filVu !== null && <p className="tv-fil" role="status"><i style={{ background: FLOSS[filVu].hex }} aria-hidden="true" /><b>DMC {FLOSS[filVu].code}</b> · {FLOSS[filVu].name}</p>}
        </div>
        <div ref={ancreScene} className="hi-disque tv-ancre-scene">{reduit && disque}</div>
      </div>
    </section>
    <p className="tv-fin">Fin de la scène de démonstration. La suite (les indiennes, le nuancier, le Studio, le Bureau, la création participative) reste dans l’édition actuelle tant que ce principe n’est pas validé.</p>

    {/* le voyageur : UN Point, fermé dans le héros, déployé dans la scène */}
    {!reduit && <div ref={couche} className="tv-voyageur" data-forme={lieu === "une" ? "point" : "disque"}>
      {lieu === "une" ? <div className="tv-point">{pointUne}</div> : <div className="tv-disque">{disque}</div>}
    </div>}
    {!reduit && curseur && pointeurFin() && <CurseurAssistant />}
  </main>;
}

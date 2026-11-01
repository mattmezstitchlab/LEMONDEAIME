/**
 * Essai : le Cadre-Tambour (V2, « le disque unique »). Un seul objet, deux états.
 * - Cadre : le format, son étiquette en haut (le Cadre) et le dock du bas accroché dessous. Le Cadre reste la source canonique.
 * - Tambour : le même objet se referme en un disque d'une seule pièce, calculé depuis un seul centre (lib/tambour/disque.ts) :
 *   A, la toile (le vrai ouvrage, éditable : on y dessine, brode, gomme, comme dans le Cadre) ; B, le bois et sa vis ;
 *   C, la couronne noire des commandes, qui restent entières à l'intérieur (rond, mot, focus). Les familles s'ouvrent sur la même couronne.
 * - La caméra nacrée au centre : discrète et transparente aux gestes au repos (on dessine au centre) ; elle s'éveille quand la main
 *   revient sur la couronne. Au clavier : Broder › Sur ma toile.
 * - Morphose : le contour du Cadre devient le bois ; les commandes quittent le dock pour la couronne ; le chemin inverse au retour.
 *   Instantané quand les animations sont réduites. L'ouvrage n'est ni dupliqué ni modifié.
 * Aucune logique du Cadre ni de la grille ne change : ce composant se pose par-dessus.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { ArrowUp, Bell, Camera, ChevronsDownUp, Ellipsis, Minimize2 } from "lucide-react";
import { aVoir, decorer, MOT_ETAT, trier, type Indicateur, type Indicateurs } from "../lib/point/indicateurs";
import Point from "./point/Point";
import { commandesDuBloc } from "../lib/point/registre";
import type { ModePoint } from "../lib/point/modes";
import type { ContexteBroderie } from "./blocs/broderie";
import { anneauSvg, geometrieDisque, type Disque } from "../lib/tambour/disque";
import { prochainPoint } from "../lib/tambour/suivi";
import { cheminVers } from "../lib/ouvrir";
import type { Pattern } from "../lib/pattern";
import type { VueCadre } from "./Canvas";
import "./blocs/broderie";
import "./TambourAtelier.css";

export const CADRE_TAMBOUR_CLE = "pointzero:essai:cadre-tambour";
export const PRESENTATION_CLE = "pointzero:disque:presentation";
/** Le Tambour est le mode normal de l'atelier (décision de Matt, 1/11/2026). « 1 » : choisi ; « 0 » : refusé par la personne (réglage Studio) ; absent : le mode normal. */
export const TAMBOUR_PAR_DEFAUT = true;
export const lireCadreTambour = () => { try { const v = localStorage.getItem(CADRE_TAMBOUR_CLE); return v === "1" || (v === null && TAMBOUR_PAR_DEFAUT); } catch { return TAMBOUR_PAR_DEFAUT; } };
export const ecrireCadreTambour = (v: boolean) => { try { localStorage.setItem(CADRE_TAMBOUR_CLE, v ? "1" : "0"); } catch { /* rien */ } };

/** les commandes gardées au premier anneau quand la place manque (le reste passe dans « Plus ») ; Confort est toujours là */
export const PRIORITE = ["points", "broder", "fils", "affichage", "loupe", "retracter"];
export function premierAnneau(modes: ModePoint[], capacite: number): ModePoint[] {
  if (modes.length + 1 <= capacite) return modes;   /* + 1 : Confort, apporté par le Point */
  const garder = Math.max(2, capacite - 2), prio = [...PRIORITE.map(id => modes.find(m => m.id === id)).filter((m): m is ModePoint => !!m), ...modes.filter(m => !PRIORITE.includes(m.id))];
  const tete = prio.slice(0, garder), reste = modes.filter(m => !tete.includes(m));
  return [...modes.filter(m => tete.includes(m)), { id: "plus", nom: "Plus", icone: <Ellipsis aria-hidden="true" />, aide: reste.map(m => m.nom).join(", "), groupe: "creation", ouvrir: () => {}, enfants: () => reste }];
}

const reduit = () => document.documentElement.getAttribute("data-pz-motion") === "reduce" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
type Rect = { x: number; y: number; w: number; h: number };
function rectCadre(): Rect | null {
  const c = document.querySelector(".cadre"); if (!c) return null;
  const s = getComputedStyle(c), v = (k: string) => parseFloat(s.getPropertyValue(k));
  return Number.isFinite(v("--fx0")) && v("--fw") > 0 ? { x: v("--fx0"), y: v("--fy0"), w: v("--fw"), h: v("--fh") } : null;
}

/** le suivi de la couleur active, dans le cercle : son avancée (l'arc sur le bois, dit aussi en toutes lettres) et le prochain point */
export interface SuiviCercle { code: string; hex: string; cells: number; done: number; /** le vrai motif, la couleur active, et le dernier point coché (null : on part du centre de la toile) */ motif: Pattern; couleur: number; depuis: number | null; /** montrer le prochain point dans la toile (le Guide est actif, on brode) */ montrer: boolean }

export default function TambourAtelier({ contexte, retracter, part, etiquette, ouvrage, indicateurs, racine, suivi, centreContenu, noeudDepart }: { /** l'entrée directe (« ?ouvrir= ») : la commande de la couronne sur laquelle s'ouvrir */ noeudDepart?: string; contexte: ContexteBroderie; retracter: () => void; part?: number; etiquette?: string; ouvrage?: string; indicateurs?: Indicateurs; /** une autre racine (Navigation intégrale .0) ; sinon les commandes du bloc broderie */ racine?: ModePoint[]; suivi?: SuiviCercle;
  /** un autre contenu réel au centre (le Bureau : les ouvrages) ; il peut se déployer en plein écran */
  centreContenu?: { titre: string; element: ReactNode; plein: boolean; quitterPlein: () => void; defile?: MutableRefObject<number> } }) {
  if (centreContenu) suivi = undefined;   /* le suivi parle de l'ouvrage : il se tait quand le centre montre autre chose */
  /* les points lumineux : la liste réelle (publiée par les modules), lue ici ; le disque n'invente aucun statut */
  const [indic, setIndic] = useState<Indicateur[]>([]);
  useEffect(() => indicateurs?.abonner(l => setIndic(l.filter(i => !i.resolu))), [indicateurs]);
  /* une seule annonce par événement (et pas celles que le module annonce déjà) */
  const [annonce, setAnnonce] = useState(""), annonces = useRef(new Map<string, string>());
  useEffect(() => {
    const nouveaux = trier(indic).filter(i => i.annonce !== false && annonces.current.get(i.id) !== i.etat + i.libelle);
    for (const i of indic) annonces.current.set(i.id, i.etat + i.libelle);
    if (nouveaux[0]) setAnnonce(`${MOT_ETAT[nouveaux[0].etat]} : ${nouveaux[0].libelle}`);
  }, [indic]);
  /* trois états : le Point (dans le dock), le Disque, le contenu étendu (couronne repliée). Sur téléphone, le contenu étendu d'abord ;
     la présentation choisie est retenue sur l'appareil */
  const [replie, setReplieBrut] = useState(() => { try { const v = localStorage.getItem(PRESENTATION_CLE); if (v) return v === "etendu"; } catch { /* rien */ } return window.innerWidth < 600; });
  const setReplie = (v: boolean) => { setReplieBrut(v); try { localStorage.setItem(PRESENTATION_CLE, v ? "etendu" : "disque"); } catch { /* rien */ } };
  const mesurer = useCallback((rep: boolean): Disque => {
    const haut = Math.max(document.querySelector(".pzs-top")?.getBoundingClientRect().bottom ?? 72, document.querySelector(".pzs-crumbs")?.getBoundingClientRect().bottom ?? 0) + 8;
    /* la taille du texte du Confort (--pz-user-font-scale), et le zoom du navigateur (déjà dans la largeur de la fenêtre) */
    const texte = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pz-user-font-scale")) || 1, l = window.innerWidth, h = window.innerHeight;
    /* une seule place pour les messages, sous le disque : le cartouche et les notifications la partagent (jamais l'un sur l'autre) */
    const cible = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--one-cible")) || 1;   /* la taille des commandes (.0NE) */
    return geometrieDisque(l, h, haut, { texte, replie: rep, bas: 64, cible });
  }, []);
  const [g, setG] = useState(() => mesurer(false));
  useEffect(() => { setG(mesurer(replie)); const f = () => setG(mesurer(replie)); window.addEventListener("resize", f); return () => window.removeEventListener("resize", f); }, [replie, mesurer]);
  const hote = useRef<HTMLDivElement>(null);

  /* la morphose : départ (le Cadre, le dock), arrivée (le disque) ; puis le chemin inverse */
  const depart = useRef<{ cadre: Rect | null; dock: { x: number; y: number } | null } | null>(null);
  if (!depart.current) {
    const d = document.querySelector(".pzs-bottom")?.getBoundingClientRect();
    depart.current = { cadre: rectCadre(), dock: d && d.width ? { x: d.left + d.width / 2, y: d.top + d.height / 2 } : null };
  }
  const [phase, setPhase] = useState<"depart" | "ouvert" | "sortie">(() => (reduit() || !depart.current?.cadre ? "ouvert" : "depart"));
  useLayoutEffect(() => { if (phase !== "depart") return; let r2 = 0; const r = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setPhase("ouvert")); }); return () => { cancelAnimationFrame(r); cancelAnimationFrame(r2); }; }, [phase]);
  const fermer = useCallback(() => {
    if (reduit()) { retracter(); return; }
    depart.current!.cadre = rectCadre() ?? depart.current!.cadre; setPhase("sortie"); window.setTimeout(retracter, 380);
  }, [retracter]);

  /* la place des messages (notifications du studio) : sous le disque, celle du cartouche */
  useLayoutEffect(() => { const r = document.documentElement; r.style.setProperty("--pz-message-y", Math.round(g.cy + g.Ro + 8) + "px"); r.style.setProperty("--pz-disque-r", Math.round(g.Ro) + "px"); return () => { r.style.removeProperty("--pz-message-y"); r.style.removeProperty("--pz-disque-r"); }; }, [g.cy, g.Ro]);
  /* le Cadre et le dock du bas se replient dans le tambour tant qu'il est ouvert */
  useLayoutEffect(() => { document.documentElement.classList.add("pz-tambour-ouvert"); return () => document.documentElement.classList.remove("pz-tambour-ouvert"); }, []);
  /* Échap rétracte aussi quand le focus est sur la grille (pas dans un champ, ni dans un panneau ouvert) */
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (hote.current?.contains(t) || t.closest("input, textarea, select, [role=dialog], .pzs-bloc, .pz-panneau"))) return;
      /* d'abord remonter d'un niveau de la couronne, puis rétracter */
      const retour = hote.current?.querySelector<HTMLElement>('[data-mode="__retour"]');
      e.preventDefault(); if (retour) retour.click(); else fermer();
    };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, [fermer]);

  /* l'orbe du centre : au repos, transparente aux gestes (on dessine au centre) ; elle s'éveille quand la main revient sur la couronne */
  const [eveil, setEveil] = useState(false), minuteur = useRef(0);
  const surCouronne = (e: React.SyntheticEvent) => { if ((e.target as Element).closest?.(".pzt-couronne-zone, [role=menuitem], .lp-centre-action")) { window.clearTimeout(minuteur.current); setEveil(true); } };
  const horsCouronne = () => { window.clearTimeout(minuteur.current); minuteur.current = window.setTimeout(() => { setEveil(false); setCarte(null); }, 1400); };
  useEffect(() => () => window.clearTimeout(minuteur.current), []);
  /* le cartouche (place juste) : le mot et l'aide de la commande visée */
  const [carte, setCarte] = useState<{ nom: string; aide: string } | null>(null);
  const viser = (e: React.SyntheticEvent) => { const b = (e.target as Element).closest?.("[role=menuitem]") as HTMLElement | null; if (b) setCarte({ nom: b.querySelector(".lp-mot")?.textContent?.replace("›", "").trim() || b.getAttribute("aria-label")?.split(",")[0] || "", aide: b.title }); };

  const surMaToile = () => { window.location.href = import.meta.env.BASE_URL + "tambour?mode=superposer" + (ouvrage ? "&ouvrage=" + encodeURIComponent(ouvrage) : ""); };
  const voir = aVoir(indic);
  const modes = useMemo(() => decorer(premierAnneau([
    ...(racine ?? commandesDuBloc<ContexteBroderie>("broderie", { ...contexte, dockClassique: undefined, surMaToile })),
    { id: "replier", nom: "Replier", icone: <ChevronsDownUp aria-hidden="true" />, aide: "essai : la couronne se replie, la toile prend toute la place ; les outils reviennent à la demande", groupe: "socle", ouvrir: () => setReplie(true) },
    { id: "retracter", nom: "Rétracter", icone: <Minimize2 aria-hidden="true" />, aide: "le tambour se replie : le patron entier, le Cadre pour agrandir et déplacer, le dock dessous", groupe: "socle", ouvrir: fermer },
    /* « À voir » : plusieurs informations en attente se retrouvent ici (la même source que les points, pas une seconde) */
    ...(voir.length >= 2 ? [{ id: "a-voir", nom: `À voir (${voir.length})`, icone: <Bell aria-hidden="true" />, aide: voir.map(i => i.libelle).join(" · "), groupe: "socle" as const, ouvrir: () => {},
      enfants: () => voir.map((i): ModePoint => ({ id: "voir-" + i.id, nom: i.libelle, aide: MOT_ETAT[i.etat], groupe: "socle", indicateur: { etat: i.etat, mot: MOT_ETAT[i.etat], libelle: i.libelle, herite: false, id: i.id }, ouvrir: () => indicateurs?.consulter(i.id) })) }] : []),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], g.capacite), indic, id => indicateurs?.consulter(id)), [contexte, g.capacite, fermer, indic, racine]);

  const [chemin0] = useState(() => noeudDepart ? cheminVers(modes, noeudDepart) : undefined);
  const c = g.Ro + 2, fin = phase === "ouvert";
  /* le cartouche dit ce qui se passe : la commande visée d'abord (geste de la personne), sinon l'information la plus importante */
  /* (les informations de routine, priorité négative — la sauvegarde ordinaire — gardent leur point mais ne prennent pas le cartouche) */
  const haut = trier(indic.filter(i => (i.priorite ?? 0) >= 0 && (!i.consulte || i.etat === "action" || i.etat === "erreur" || i.etat === "encours")))[0];
  const cadre = depart.current!.cadre, dock = depart.current!.dock;
  /* le contour qui se transforme : le Cadre (rectangle) au départ, le bois (cercle) à l'arrivée */
  const rond = { left: g.cx - g.rb, top: g.cy - g.rb, width: 2 * g.rb, height: 2 * g.rb };
  const bois = fin || !cadre ? rond : { left: cadre.x, top: cadre.y, width: cadre.w, height: cadre.h };
  return <div ref={hote} className={"pzt pzt-" + phase + (eveil ? " pzt-eveil" : "") + (replie ? " pzt-replie" : "") + (voir.length >= 2 ? " pzt-attention" : "") + " pzt-etiq-" + g.etiquettes} data-etiquettes={g.etiquettes}
    style={{ ["--pzt-x" as string]: g.cx + "px", ["--pzt-y" as string]: g.cy + "px", ["--pzt-r" as string]: g.r + "px", ["--pzt-rb" as string]: g.rb + "px", ["--pzt-ri" as string]: g.ri + "px", ["--pzt-ro" as string]: g.Ro + "px",
      ["--pzt-bl" as string]: g.env.l + "px", ["--pzt-bh" as string]: g.env.h + "px", ["--pzt-bd" as string]: g.env.rond + "px",
      ["--pzt-dx" as string]: (dock ? dock.x - g.cx : 0) + "px", ["--pzt-dy" as string]: (dock ? dock.y - g.cy : 0) + "px" }}
    onKeyDown={e => { if (e.key === "Escape" && !e.defaultPrevented) { e.preventDefault(); if (centreContenu?.plein) centreContenu.quitterPlein(); else if (replie) setReplie(false); else fermer(); } }}
    onPointerOver={e => { surCouronne(e); viser(e); }} onPointerOut={horsCouronne} onFocus={e => { surCouronne(e); viser(e); }}>
    <div className="pzt-voile" aria-hidden="true" />
    <div className="pzt-bois" aria-hidden="true" style={bois} />
    {centreContenu && <CentreContenu {...centreContenu} cx={g.cx} cy={g.cy} r={g.r} />}
    {fin && suivi && <svg className="pzt-suivi" aria-hidden="true" width={2 * g.rb + 4} height={2 * g.rb + 4} style={{ left: g.cx - g.rb - 2, top: g.cy - g.rb - 2 }}>
      <circle cx={g.rb + 2} cy={g.rb + 2} r={g.rb - 4} className="pzt-suivi-piste" />
      <circle cx={g.rb + 2} cy={g.rb + 2} r={g.rb - 4} className="pzt-suivi-arc" stroke={suivi.hex} pathLength={100} strokeDasharray={`${(100 * suivi.done / suivi.cells).toFixed(2)} 100`} transform={`rotate(-90 ${g.rb + 2} ${g.rb + 2})`} />
    </svg>}
    {fin && suivi?.montrer && suivi.done < suivi.cells && <ProchainPoint motif={suivi.motif} couleur={suivi.couleur} depuis={suivi.depuis} code={suivi.code} cx={g.cx} cy={g.cy} r={g.r} rb={g.rb} />}
    {!replie && <>
      <svg className="pzt-anneau" width={2 * c} height={2 * c} aria-hidden="true">
        <defs><linearGradient id="pzt-corps" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#262626" /><stop offset=".55" stopColor="#141414" /><stop offset="1" stopColor="#0c0c0c" /></linearGradient></defs>
        <path className="pzt-couronne-zone" d={anneauSvg(c, g.ri, g.Ro)} fillRule="evenodd" fill="url(#pzt-corps)" />
        <circle cx={c} cy={c} r={g.Ro - 1.5} className="pzt-rebord" /><circle cx={c} cy={c} r={g.ri + 1.5} className="pzt-rebord-int" />
        <circle cx={c} cy={c} r={g.rho} className="pzt-sillon" />
      </svg>
      <span className="pzt-vis" aria-hidden="true" />
      <div className="pzt-point">
        <Point scene cheminInitial={chemin0} tambour={{ rayon: g.rho, cote: 2 * c, parPage: g.capacite - 3 }} contexte="tambour-atelier" memoire="bloc-broderie" part={part} etiquette={etiquette} modes={modes}
          centre={{ nom: "Sur ma toile", aide: "filmer votre vraie toile et y poser ce patron", icone: <Camera aria-hidden="true" />, ouvrir: surMaToile }} />
      </div>
      {/* le cartouche : le nom et l'aide de la commande visée (une nuance DMC : son numéro et son nom, jamais la couleur seule) */}
    </>}
    {(!replie || haut || suivi) && <p className={"pzt-cartouche" + (!carte && !haut && suivi ? " pzt-cartouche-ligne" : "")} aria-hidden="true" data-etat={!carte && haut ? haut.etat : undefined}>{carte && !replie ? <><b>{carte.nom}</b>{carte.aide && !carte.nom.includes(carte.aide) && <span>{carte.aide}</span>}</>
        : haut ? <><i className="lp-indic" data-etat={haut.etat} aria-hidden="true" /><b>{haut.libelle}</b></> : suivi ? <><i className="pzt-pastille" style={{ background: suivi.hex }} aria-hidden="true" /><b>DMC {suivi.code}</b><span> · {suivi.done >= suivi.cells ? "couleur terminée" : `${suivi.cells - suivi.done} point${suivi.cells - suivi.done > 1 ? "s" : ""} à broder sur ${suivi.cells}`}</span></>
          : <span>{g.etiquettes === "cartouche" ? "Touchez une commande : son nom s’affiche ici." : "Survolez une commande : ce qu’elle fait s’affiche ici."}</span>}</p>}
    <span className="sr-only" role="status" aria-live="polite">{annonce}</span>
    {replie && <button type="button" className="pzt-deployer" aria-label="Déployer les outils du tambour" title="Déployer les outils" onClick={() => setReplie(false)}
      style={{ left: g.cx + (g.rb - 4) * Math.SQRT1_2, top: g.cy + (g.rb - 4) * Math.SQRT1_2 }}><span className="lp-centre" /><Ellipsis aria-hidden="true" /></button>}
  </div>;
}

/**
 * Le prochain point, montré dans la toile (le geste, pas l'action) : un anneau sur la case, qui laisse passer les clics ;
 * hors du cercle, une flèche sur le bois qui indique la direction et, touchée, amène ce point au centre (la vue seulement).
 * La position suit la vue réelle de la grille (l'événement que chaque image publie), sans rien changer au moteur.
 */
function ProchainPoint({ motif, couleur, depuis, code, cx, cy, r, rb }: { motif: Pattern; couleur: number; depuis: number | null; code: string; cx: number; cy: number; r: number; rb: number }) {
  const [v, setV] = useState<VueCadre | null>(null);
  useEffect(() => {
    const f = (e: Event) => { const d = (e as CustomEvent<VueCadre>).detail; setV(o => o && o.s === d.s && o.ox === d.ox && o.oy === d.oy && o.left === d.left && o.top === d.top ? o : d); };
    window.addEventListener("pointzero:vue", f); window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "redraw" } }));
    return () => window.removeEventListener("pointzero:vue", f);
  }, []);
  /* sans point coché : la case au centre de la toile (on part de ce qu'on voit) */
  const centre = v ? Math.max(0, Math.min(motif.h - 1, Math.floor((cy - v.top - v.oy) / v.s))) * motif.w + Math.max(0, Math.min(motif.w - 1, Math.floor((cx - v.left - v.ox) / v.s))) : null;
  const prochain = useMemo(() => prochainPoint(motif, couleur, depuis ?? centre), [motif, couleur, depuis ?? centre]);
  const ecran = v && prochain && { x: v.left + v.ox + (prochain.x + .5) * v.s, y: v.top + v.oy + (prochain.y + .5) * v.s };
  const montrer = useCallback(() => {
    if (!v || !ecran) return;
    window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "ancrer", x: (cx - ecran.x) / v.s, y: (cy - ecran.y) / v.s } }));
  }, [v, ecran?.x, ecran?.y, cx, cy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { window.addEventListener("pointzero:prochain-point", montrer); return () => window.removeEventListener("pointzero:prochain-point", montrer); }, [montrer]);
  if (!v || !ecran || !prochain) return null;
  const dx = ecran.x - cx, dy = ecran.y - cy, d = Math.hypot(dx, dy), cote = Math.max(v.s + 8, 18);
  if (d <= r - v.s / 2) return <span className="pzt-prochain" aria-hidden="true" data-x={prochain.x} data-y={prochain.y} style={{ left: ecran.x, top: ecran.y, width: cote, height: cote }} />;
  const a = Math.atan2(dy, dx);
  return <button type="button" className="pzt-prochain-fleche" aria-label={`Le prochain point de DMC ${code} est hors du cercle : l’amener au centre`} title="Amener le prochain point au centre"
    onClick={montrer} style={{ left: cx + Math.cos(a) * (rb - 6), top: cy + Math.sin(a) * (rb - 6) }}><ArrowUp aria-hidden="true" style={{ transform: `rotate(${a * 180 / Math.PI + 90}deg)` }} /></button>;
}

/** Le centre du disque montre un autre contenu réel (le Bureau) : rond, dans la toile ; ou en plein écran quand c'est préférable.
 *  La position de lecture est retenue (revenir au Bureau ne fait rien perdre). */
function CentreContenu({ titre, element, plein, quitterPlein, defile, cx, cy, r }: { titre: string; element: ReactNode; plein: boolean; quitterPlein: () => void; defile?: MutableRefObject<number>; cx: number; cy: number; r: number }) {
  const zone = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => { if (zone.current && defile) zone.current.scrollTop = defile.current; }, [plein]); // eslint-disable-line react-hooks/exhaustive-deps
  /* en plein écran : le focus va au bouton de retour ; Échap revient au disque (avant tout autre usage d'Échap) */
  const retour = useRef<HTMLButtonElement>(null), quitter = useRef(quitterPlein); quitter.current = quitterPlein;
  useEffect(() => {
    if (!plein) return;
    retour.current?.focus();
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); quitter.current(); } };
    window.addEventListener("keydown", f, true); return () => window.removeEventListener("keydown", f, true);
  }, [plein]);
  return <section className={"pzt-centre" + (plein ? " pzt-centre-plein" : "")} aria-label={titre} style={plein ? undefined : { left: cx - r, top: cy - r, width: 2 * r, height: 2 * r }}>
    {plein && <header className="pzt-centre-tete"><h2>{titre}</h2><button ref={retour} type="button" onClick={quitterPlein}>Revenir au disque</button></header>}
    <div ref={zone} className="pzt-centre-defile" onScroll={e => { if (defile) defile.current = e.currentTarget.scrollTop; }}>{element}</div>
  </section>;
}

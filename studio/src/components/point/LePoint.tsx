import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as PE, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { anneau, dispositionArc, FAVORIS, hotePortail, lirePresentation, niveau, nomAccessible, ORIGINE, paginer, placePanneau, positionDe, presentationPour, RETOUR, secteurVise, SUITE, tourner, type ModePoint, type Presentation } from "../../lib/point/modes";
import { favoris, lireUsage, noterUsage, oublierUsage } from "../../lib/point/memoire";
import "./LePoint.css";

/**
 * Le Point, contrôleur universel : un bouton central permanent et un dock radial à navigation progressive.
 * - Clic, Entrée ou Espace : le premier cercle s'ouvre (les familles), le focus va sur Confort (toujours en haut, toujours premier).
 * - Choisir une famille remplace les choix du cercle par ses sous-outils ; « Retour », Échap, Retour arrière ou le centre remontent d'un niveau ;
 *   « Point Zéro » revient au premier cercle. Choisir un outil déclenche sa vraie action.
 * - Quand les choix sont des couleurs (les nuances DMC), la famille reste visible en anneau intérieur : deux anneaux concentriques, et seulement là.
 * - Poignée, facultative : tirer le Point vers un secteur ouvre ce choix du premier cercle. Jamais le seul chemin.
 * Selon le support, les mêmes niveaux s'ouvrent en anneau (ordinateur), en panneau compact (téléphone), en arc ou en liste (au choix, dans Confort) :
 * mêmes boutons, même ordre, mêmes touches, mêmes annonces.
 */
/* l'anneau grandit avec le nombre de choix ; des pastilles (couleurs, valeurs) tiennent plus serrées que des outils à pictogramme et mot */
const rayonPour = (n: number, pastilles = false) => pastilles ? Math.max(96, Math.ceil((n * 52) / (2 * Math.PI))) : Math.max(104, Math.ceil((n * 92) / (2 * Math.PI)));
const cotePour = (n: number, pastilles = false) => 2 * rayonPour(n, pastilles) + (pastilles ? 72 : 112);
const NAV = new Set([RETOUR, ORIGINE, SUITE]);
const EFFACER = "__favoris-effacer";
/* les signes du noyau : dessinés ici, le Point n'emporte aucune bibliothèque d'icônes */
const svg = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const SIGNES: Record<string, ReactNode> = {
  [RETOUR]: svg(<path d="M19 12H5M11 6l-6 6 6 6" />), [SUITE]: svg(<path d="M5 12h14M13 6l6 6-6 6" />),
  [ORIGINE]: svg(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" /></>),
  [FAVORIS]: svg(<path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />),
  [EFFACER]: svg(<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />),
};

export default function LePoint({ cheminInitial, modes, part = 0, teinte = "#FFFFFF", etiquette, guide = "cercle", annonceExterne, refBouton, ancrage = "dessus", memoire, scene = false, centre, tambour }: {
  /** ouvrir le Point sur ce chemin de familles (identifiants) : l'entrée directe de l'atelier ; un identifiant inconnu laisse le premier cercle */
  cheminInitial?: string[];
  modes: ModePoint[];
  /**
   * Facultatif (mode Tambour seulement, accord de Matt du 29/10) : au premier cercle, la sphère centrale devient un raccourci vers cette action
   * (la caméra). Elle reste un double d’une commande de l’anneau, qui seule la porte pour le clavier et le lecteur d’écran. Sans elle, rien ne change.
   */
  centre?: Pick<ModePoint, "nom" | "aide" | "ouvrir" | "actif" | "icone">;
  /**
   * Facultatif (présentation « scène » seulement, essai du Cadre-Tambour) : le rayon, en pixels, d'un tambour que l'anneau entoure.
   * Les choix se posent autour du cercle, le centre reste vide et laisse passer les gestes vers l'ouvrage. Sans lui, rien ne change.
   */
  tambour?: { rayon: number; cote: number; parPage: number };
  /**
   * Présentation « scène » (une page qui montre le Point, comme la landing) : le disque est posé dans la page, toujours ouvert,
   * sans bouton ni portail. Même noyau, mêmes niveaux, mêmes touches, mêmes annonces ; il ne prend le focus qu'après un geste.
   */
  scene?: boolean;
  /** retenir les habitudes sous cette clé (sur l'appareil, jamais dans l'ouvrage) : un accès « Favoris » apparaît au premier cercle */
  memoire?: string;
  /** dessus : l'anneau s'ouvre au-dessus du Point (dans un dock) ; autour : centré sur le Point (sur le bord d'un bloc) */
  ancrage?: "dessus" | "autour";
  /** pour rendre le focus au Point depuis l'extérieur (un panneau qui se ferme) */
  refBouton?: { current: HTMLButtonElement | null };
  /** l'Arc de remplissage : 0 à 1 (ici, l'avancement du patron) */
  part?: number;
  teinte?: string;
  /** ce que le Point dit de plus dans son nom (ex. « patron brodé à 40 % ») */
  etiquette?: string;
  guide?: string;
  /** une annonce venue d'un mode (ex. un réglage de confort) */
  annonceExterne?: string;
}) {
  /* Favoris : les derniers choix et les plus utilisés, retrouvés dans les commandes du moment ; absent tant qu'il n'y a rien */
  const [, setUsageV] = useState(0);
  const base = anneau(modes);
  const favs = memoire ? favoris(lireUsage(memoire), base) : [];
  const cheminFav = new Map<string, string[]>();
  const familleFav: ModePoint | null = favs.length ? { id: FAVORIS, nom: "Favoris", groupe: "socle", icone: SIGNES[FAVORIS], ouvrir: () => {},
    aide: "les derniers choix et les plus utilisés, retenus sur cet appareil",
    enfants: () => [...favs.map((f): ModePoint => { const id = "fav-" + f.chemin.join("~"); cheminFav.set(id, f.chemin);
      return { ...f.mode, id, enfants: undefined, aide: (f.genre === "recent" ? "récent" : `souvent, ${f.n} fois`) + " · " + [...f.familles.map(x => x.nom), f.mode.nom].join(" › ") }; }),
      { id: EFFACER, nom: "Oublier", aide: "effacer les favoris de cet appareil", groupe: "socle", icone: SIGNES[EFFACER], ouvrir: () => { if (memoire) oublierUsage(memoire); setUsageV(v => v + 1); } }] } : null;
  const racineModes = familleFav ? anneau([...modes, familleFav]) : base;
  const [ouvert, setOuvert] = useState(scene);
  /* en scène, le disque ne vole jamais le focus au chargement : seulement après un geste de la personne */
  const interagi = useRef(!scene);
  const [focus, setFocus] = useState(0);
  const [onde, setOnde] = useState(0);
  const [annonce, setAnnonce] = useState("");
  /* le chemin dans les familles : des identifiants, résolus à chaque rendu dans les modes frais (l'état change sous nos pieds) */
  const [chemin, setChemin] = useState<string[]>(cheminInitial ?? []);
  const [page, setPage] = useState(0);
  const bouton = useRef<HTMLButtonElement>(null);
  const racine = useRef<HTMLDivElement>(null);
  const anneauRef = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const tire = useRef<{ x: number; y: number; id: number } | null>(null);
  const tireTraite = useRef(false);
  const idMenu = useId();

  /* résoudre le chemin : chaque famille, puis ses enfants */
  const familles: ModePoint[] = [];
  let enfants = racineModes;
  for (const id of chemin) { const f = enfants.find(m => m.id === id); if (!f?.enfants) break; familles.push(f); enfants = f.enfants(); }
  const profondeur = familles.length, parent = familles[profondeur - 1];
  const remonter = () => { setChemin(c => c.slice(0, -1)); setPage(0); const p = familles[profondeur - 1]; setFocus(Math.max(0, (profondeur - 1 === 0 ? racineModes : familles[profondeur - 2].enfants!()).findIndex(m => m.id === p?.id) + (profondeur - 1 >= 2 ? 2 : profondeur - 1 >= 1 ? 1 : 0))); if (p) setAnnonce(`Retour : ${profondeur - 1 === 0 ? "Point Zéro" : familles[profondeur - 2].nom}.`); };
  const origine = () => { setChemin([]); setPage(0); setFocus(0); setAnnonce("Point Zéro : le premier cercle."); };
  const courant = profondeur === 0 ? racineModes : niveau(paginer(enfants, page, tambour && scene ? Math.max(3, tambour.parPage) : 16, setPage), profondeur, parent?.nom ?? "", { retour: remonter, origine });
  const n = courant.length;
  /* un niveau de couleurs (presque toutes) : un anneau serré de pastilles ; les rares autres choix s'y font ronds, à pictogramme */
  const choixNiveau = courant.filter(m => !NAV.has(m.id)), nCouleurs = choixNiveau.filter(m => !!m.couleur || !!m.valeur).length;
  const pastilles = profondeur > 0 && nCouleurs >= 3 && nCouleurs >= 0.7 * choixNiveau.length;
  const enTambour = scene && !!tambour && tambour.rayon > 0;
  const RAYON = enTambour ? tambour!.rayon : rayonPour(n, pastilles), COTE = enTambour ? tambour!.cote : cotePour(n, pastilles);
  /* l'anneau intérieur : la famille d'où viennent les nuances, quand elle est faite de couleurs elle aussi */
  const freres = profondeur >= 1 ? (profondeur === 1 ? racineModes : familles[profondeur - 2].enfants!()) : [];
  const interieur = pastilles && freres.filter(m => m.couleur).length >= 3 ? freres.filter(m => m.couleur) : [];

  const [pos, setPos] = useState({ left: 8, top: 8 });
  const [pres, setPres] = useState<Presentation>("anneau");
  const [arc, setArc] = useState<ReturnType<typeof dispositionArc> | null>(null);
  const [panneau, setPanneau] = useState({ left: 8, right: 8, bottom: 80 });
  useEffect(() => { if (annonceExterne) setAnnonce(annonceExterne); }, [annonceExterne]);
  useEffect(() => { if (ouvert && interagi.current) items.current[Math.min(focus, n - 1)]?.focus(); }, [ouvert, focus, n, chemin, page, pres]);
  useEffect(() => { if (scene) setPres(lirePresentation() === "liste" ? "liste" : "anneau"); }, [scene]);
  /* un clic ailleurs referme l'anneau, sans prendre le focus */
  useEffect(() => {
    if (!ouvert || scene) return;
    /* un toucher à côté referme le menu et s'arrête là : il ne choisit pas, par mégarde, ce qui est dessous */
    const avaler = (e: Event) => { e.stopPropagation(); e.preventDefault(); };
    const dehors = (e: PointerEvent) => { const t = e.target as Node; if (!racine.current?.contains(t) && !anneauRef.current?.contains(t)) {
      setOuvert(false); document.addEventListener("click", avaler, { capture: true, once: true }); window.setTimeout(() => document.removeEventListener("click", avaler, { capture: true }), 600); } };
    document.addEventListener("pointerdown", dehors);
    return () => document.removeEventListener("pointerdown", dehors);
  }, [ouvert]);

  const fermer = (rendre = true) => { setOuvert(false); setChemin([]); setPage(0); if (rendre) requestAnimationFrame(() => bouton.current?.focus()); };
  /* retenir un choix d'outil (pas la navigation, pas Confort, pas « Oublier ») : son chemin d'identifiants depuis le premier cercle */
  const noter = (m: ModePoint) => {
    if (!memoire || NAV.has(m.id) || m.id === EFFACER || m.groupe === "acces") return;
    const c = cheminFav.get(m.id) ?? [...familles.map(f => f.id), m.id];
    noterUsage(memoire, c); setUsageV(v => v + 1);
  };
  const choisir = (i: number) => {
    const m = courant[i]; if (!m) return;
    interagi.current = true;
    if (m.enfants) {
      const sous = m.enfants();
      setChemin(c => [...c, m.id]); setPage(0); setFocus(profondeur + 1 >= 2 ? 2 : 1); setOnde(o => o + 1);
      setAnnonce(`${m.nom} : ${sous.length} choix. Échap pour revenir.`);
      return;
    }
    if (m.resteOuvert) {
      noter(m);
      if (!m.annonceEnPropre && !NAV.has(m.id)) setAnnonce(`${m.nom} ${m.actif ? "désactivé" : "activé"}.`);
      m.ouvrir(); setOnde(o => o + 1);
      return;
    }
    noter(m);
    if (!scene) fermer(false);
    else if (m.revientAuPoint && profondeur) { setChemin([]); setPage(0); setFocus(0); }
    setOnde(o => o + 1);
    if (!m.annonceEnPropre) setAnnonce(profondeur === 0 ? `Mode ${m.nom} ${m.actif ? "désactivé" : "activé"}.` : m.actif !== undefined ? `${m.nom} ${m.actif ? "désactivé" : "activé"}.` : `${m.nom} : choisi.`);
    m.ouvrir();
  };
  /* l'anneau s'ouvre au-dessus du Point (ou autour de lui), sans jamais sortir de l'écran ; il se replace quand un niveau change de taille */
  const placer = (nb = n, cote = COTE) => {
    const r = bouton.current?.getBoundingClientRect(); if (!r) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2, w = window.innerWidth || 1024, h = window.innerHeight || 800;
    const p = presentationPour(lirePresentation(), w); setPres(p);
    if (p === "arc") setArc(dispositionArc(nb, cx, cy, w));
    setPanneau(placePanneau(r.top, h));
    const top = ancrage === "autour" ? cy - cote / 2 : r.top - cote - 10;
    setPos({ left: Math.max(8, Math.min(cx - cote / 2, w - cote - 8)), top: Math.max(8, Math.min(top, h - cote - 36)) });
  };
  useEffect(() => { if (ouvert) placer(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ouvert, n, COTE]);
  const basculer = () => { if (ouvert) fermer(); else { setChemin([]); setPage(0); setFocus(0); placer(racineModes.length, cotePour(racineModes.length)); setOuvert(true); } };

  const onClick = () => { if (tireTraite.current) { tireTraite.current = false; return; } basculer(); };
  const onPointerDown = (e: PE<HTMLButtonElement>) => { if (e.button !== 0) return; tire.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* jsdom */ } };
  const onPointerUp = (e: PE<HTMLButtonElement>) => {
    const t = tire.current; tire.current = null; if (!t || ouvert) return;
    const i = secteurVise(e.clientX - t.x, e.clientY - t.y, racineModes.length);
    if (i !== null) { tireTraite.current = true; setChemin([]); const m = racineModes[i]; if (m.enfants) { setOuvert(true); setChemin([m.id]); setFocus(1); setAnnonce(`${m.nom} : ${m.enfants().length} choix.`); } else { setOnde(o => o + 1); noter(m); if (!m.annonceEnPropre) setAnnonce(`Mode ${m.nom} ${m.actif ? "désactivé" : "activé"}.`); m.ouvrir(); } }
  };

  const onKeyMenu = (e: KeyboardEvent) => {
    /* les touches de l'anneau restent à l'anneau : le contexte (compositeur, grille) ne les reçoit pas */
    e.stopPropagation(); interagi.current = true;
    const pas = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (pas) { e.preventDefault(); setFocus(f => tourner(Math.min(f, n - 1), n, pas)); return; }
    if (e.key === "Home") { e.preventDefault(); setFocus(0); }
    else if (e.key === "End") { e.preventDefault(); setFocus(n - 1); }
    else if (e.key === "Escape" || (e.key === "Backspace" && profondeur > 0)) { if (profondeur > 0) { e.preventDefault(); remonter(); } else if (!scene) { e.preventDefault(); fermer(); } }
    else if (e.key === "Tab" && !scene) fermer(false);
  };

  const actifs = racineModes.filter(m => m.actif).map(m => m.nom);
  const nom = "Le Point : " + racineModes.map(m => m.nom).join(", ") + (actifs.length ? ". Actif : " + actifs.join(", ") : "") + (etiquette ? ". " + etiquette : "");
  const c = 2 * Math.PI * 11;
  const pt = (a: number) => { const t = a * Math.PI / 180; return (22 + 18 * Math.cos(t)).toFixed(2) + " " + (22 + 18 * Math.sin(t)).toFixed(2); };
  const arcs = Array.from({ length: 12 }, (_, k) => { const a0 = -90 + k * 30 + 5, a1 = a0 + 20; return "M " + pt(a0) + " A 18 18 0 0 1 " + pt(a1); });
  const fil = ["Point Zéro", ...familles.map(f => f.nom)].join(" › ");
  const m0 = courant[Math.min(focus, n - 1)];

  const item = (m: ModePoint, i: number, style: CSSProperties | undefined, contenu: ReactNode, classe = "") =>
    <button key={m.id} ref={el => { items.current[i] = el; }} type="button" role="menuitem" tabIndex={i === focus ? 0 : -1}
      aria-haspopup={m.enfants ? "menu" : undefined}
      className={"lp-secteur lp-" + m.groupe + classe + (m.couleur ? " lp-teinte" : "") + (NAV.has(m.id) ? " lp-nav" : "")} data-mode={m.id} aria-label={nomAccessible(m) + (m.enfants ? ", famille" : "")} title={m.aide}
      style={{ ...style, ...(m.couleur ? { ["--lp-teinte" as string]: m.couleur } : null) }} onClick={() => choisir(i)} onFocus={() => setFocus(i)} onPointerEnter={() => setFocus(i)}>
      {m.actif && !classe.includes("lp-outil") && <span className="lp-marque" aria-hidden="true" />}{contenu}
      {/* le point lumineux : l'état de cette commande (dit dans son nom accessible) ; neutre sur la couronne d'un tambour */}
      {m.indicateur && m.indicateur.etat !== "repos" ? <span className="lp-indic" data-etat={m.indicateur.etat} data-herite={m.indicateur.herite ? "1" : undefined} aria-hidden="true" />
        : scene && tambour ? <span className="lp-indic" data-etat="repos" aria-hidden="true" /> : null}
    </button>;
  /* le rond d'un choix : une couleur, une valeur, le signe de la navigation, le pictogramme, sinon l'initiale */
  const rond = (m: ModePoint) => m.couleur ? <span className="lp-pastille-couleur" aria-hidden="true" />
    : m.valeur ? <span className="lp-valeur" aria-hidden="true">{m.valeur}</span>
    : <span className="lp-signe" aria-hidden="true">{SIGNES[m.id] ?? m.icone ?? m.nom[0]}</span>;
  /* anneau de pastilles : le rond seul (le mot est dit, et affiché au centre) ; sinon le rond et son mot dessous, comme un dock */
  const contenuMot = (m: ModePoint) => pastilles ? rond(m)
    : <><span className="lp-rond">{m.actif && <span className="lp-marque" aria-hidden="true" />}{rond(m)}</span><span className="lp-mot">{m.nom}{m.enfants && <span className="lp-plus" aria-hidden="true">›</span>}</span></>;
  const propsMenu = { ref: anneauRef, id: idMenu, role: "menu", "aria-label": "Le Point · " + (parent?.nom ?? "Point Zéro"), onKeyDown: onKeyMenu, "data-niveau": profondeur };
  /* le raccourci du centre (option « centre ») : un double, hors du clavier et du lecteur d'écran */
  const centreAction = () => centre && <button type="button" tabIndex={-1} aria-hidden="true" className={"lp-centre-action" + (centre.actif ? " lp-centre-actif" : "")} onClick={() => centre.ouvrir()} title={centre.nom + " : " + centre.aide}><span className="lp-centre" />{centre.icone && <span className="lp-centre-signe">{centre.icone}</span>}</button>;
  /* ordinateur : l'anneau ; au centre, le nom du choix en cours (et, sous un niveau, le centre fait revenir) */
  const anneau_ = () => <div {...propsMenu} className={"lp-anneau" + (pastilles ? " lp-anneau-pastilles" : "") + (scene ? " lp-scene" : "") + (enTambour ? " lp-tambour" : "")} data-presentation="anneau" aria-orientation="horizontal" style={scene ? { width: COTE, height: COTE } : { width: COTE, height: COTE, left: pos.left, top: pos.top }}>
    <svg className="lp-trace" width={COTE} height={COTE} aria-hidden="true">
      <circle cx={COTE / 2} cy={COTE / 2} r={RAYON} fill="none" />
      <line x1={COTE / 2} y1={COTE / 2 - RAYON - (pastilles ? 22 : 30)} x2={COTE / 2} y2={COTE / 2 - RAYON - (pastilles ? 12 : 18)} />
    </svg>
    {interieur.length > 0 && interieur.map((f, k) => { const { x, y } = positionDe(k, interieur.length, RAYON - 58, COTE);
      return <button key={"in-" + f.id} type="button" tabIndex={-1} aria-hidden="true" className={"lp-interieur" + (f.id === parent?.id ? " lp-interieur-on" : "")}
        style={{ left: x, top: y, background: f.couleur }} title={f.nom} onClick={() => { setChemin(c => [...c.slice(0, -1), f.id]); setPage(0); setFocus(1); setAnnonce(`${f.nom} : ${f.enfants?.().length ?? 0} choix.`); }} />; })}
    {enTambour ? (profondeur === 0 && centre ? centreAction() : null) : profondeur === 0 ? (centre
        ? centreAction()
        : <span className="lp-centre" aria-hidden="true" />)
      : pastilles ? <button type="button" tabIndex={-1} aria-hidden="true" className={"lp-centre-niveau lp-centre-seul" + (interieur.length ? " lp-centre-petit" : "")} onClick={remonter} title="Revenir d’un niveau"><span className="lp-centre" /></button>
      : <button type="button" tabIndex={-1} aria-hidden="true" className="lp-centre-niveau" onClick={remonter} title="Revenir d’un niveau">
          <small>{fil}</small><span className="lp-centre" /><b>{m0 && !NAV.has(m0.id) ? m0.nom : parent?.nom}</b></button>}
    {courant.map((m, i) => { const { x, y } = positionDe(i, n, RAYON, COTE); return item(m, i, { left: x, top: y }, contenuMot(m), pastilles ? " lp-pastille-anneau" : " lp-outil"); })}
    {/* le cartouche : où l'on est et ce qu'on montre (« DMC 351 · Corail », « Luminosité +20 »), posé sous le disque, jamais sur la sphère */}
    {pastilles && m0 && !enTambour && <p className="lp-cartouche" aria-hidden="true"><small>{fil}</small><b>{m0.nom}</b>{(m0.couleur || m0.valeur) && !m0.enfants && m0.aide !== m0.nom && <i>{m0.aide}</i>}</p>}
  </div>;
  /* au choix : un quart d'arc collé au Point, pictogrammes, le mot du choix en cours affiché au-delà de sa pastille */
  const arc_ = (d: ReturnType<typeof dispositionArc>) => { const { boite: bx, points, rayon, sens } = d;
    if (points.length !== n) return panneau_();
    const W = bx.right - bx.left, H = bx.bottom - bx.top, ox = -bx.left, oy = -bx.top;
    const p0 = points[0], p1 = points[points.length - 1];
    const centre = { x: d.centre.x + ox, y: d.centre.y + oy };
    const bande = `M ${p0.x + ox} ${p0.y + oy} A ${rayon} ${rayon} 0 0 ${sens > 0 ? 1 : 0} ${p1.x + ox} ${p1.y + oy}`;
    return <div {...propsMenu} className="lp-arc" data-presentation="arc" aria-orientation="vertical" style={{ left: bx.left, top: bx.top, width: W, height: H }}>
      <svg className="lp-arc-bande" width={W} height={H} aria-hidden="true"><path d={bande} /></svg>
      {courant.map((mm, i) => item(mm, i, { left: points[i].x + ox, top: points[i].y + oy }, rond(mm), " lp-pastille"))}
      {m0 && (() => { const a = (d.angles[Math.min(focus, n - 1)] * Math.PI) / 180, r = rayon + 50; return <span className="lp-arc-mot" aria-hidden="true" style={{ left: centre.x + r * Math.cos(a), top: centre.y + r * Math.sin(a) }}>{m0.nom}</span>; })()}
    </div>; };
  /* téléphone : un panneau compact juste au-dessus du Point ; le fil du chemin en tête ; le dock (s'il est là) reste visible dessous */
  const panneau_ = () => <div {...propsMenu} className={"lp-compact" + (pastilles ? " lp-compact-pastilles" : "")} data-defile data-presentation="panneau" aria-orientation="vertical" style={panneau}>
    {profondeur > 0 && <p className="lp-compact-fil" aria-hidden="true">{fil}</p>}
    {courant.map((m, i) => item(m, i, undefined, <>{m.couleur ? <span className="lp-pastille-couleur" aria-hidden="true" /> : m.valeur ? <span className="lp-valeur" aria-hidden="true">{m.valeur}</span> : (SIGNES[m.id] ?? m.icone) && <span className="lp-compact-icone" aria-hidden="true">{SIGNES[m.id] ?? m.icone}</span>}<span>{m.nom}</span>{m.enfants && <span className="lp-plus" aria-hidden="true">›</span>}</>, " lp-case-mode"))}
  </div>;
  /* au choix (Confort) : une liste en mots, depuis le bas de l'écran */
  const liste_ = () => <div {...propsMenu} className="lp-liste" data-defile data-presentation="liste" aria-orientation="vertical">
    <p className="lp-liste-titre" aria-hidden="true">{fil}</p>
    {courant.map((m, i) => item(m, i, undefined, <><span className="lp-liste-nom">{m.couleur ? <span className="lp-pastille-couleur" aria-hidden="true" /> : m.valeur ? <span className="lp-valeur" aria-hidden="true">{m.valeur}</span> : (SIGNES[m.id] ?? m.icone) && <span className="lp-liste-icone" aria-hidden="true">{SIGNES[m.id] ?? m.icone}</span>}{m.nom}{m.enfants && <span className="lp-plus" aria-hidden="true">›</span>}</span><span className="lp-liste-aide">{m.aide}</span></>, " lp-ligne"))}
  </div>;

  if (scene) return <div className="lp lp-scene-hote" ref={racine}>
    {pres === "liste" ? liste_() : anneau_()}
    <span className="lp-annonce" role="status" aria-live="polite">{annonce}</span>
  </div>;
  return <div className="lp" ref={racine}>
    <button ref={el => { bouton.current = el; if (refBouton) refBouton.current = el; }} type="button" data-guide={guide} className="pzs-cercle lp-point" aria-haspopup="menu" aria-expanded={ouvert} aria-controls={idMenu}
      aria-label={nom} title="Le Point : confort, loupe, guide…" onClick={onClick} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { tire.current = null; }}>
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
        {arcs.map((d, k) => <path key={k} d={d} fill="none" stroke={teinte} strokeOpacity={.55} strokeWidth={2} strokeLinecap="round" />)}
        <circle cx="22" cy="22" r="11" fill="none" stroke="#fff" strokeOpacity={.18} strokeWidth="2" />
        <circle cx="22" cy="22" r="11" fill="none" stroke={teinte} strokeWidth="2" strokeDasharray={`${(c * part).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 22 22)" />
        <circle cx="22" cy="22" r="5.5" fill="url(#lp-iris)" />
        {actifs.length > 0 && <circle cx="37" cy="7" r="3.5" fill="#fff" stroke="#0b0b0c" strokeWidth="1.5" />}
        <defs><radialGradient id="lp-iris" cx="35%" cy="32%" r="75%"><stop offset="0%" stopColor="#ffffff" /><stop offset="35%" stopColor="#d9e8ff" /><stop offset="60%" stopColor="#c9b8ff" /><stop offset="80%" stopColor="#ffd6ec" /><stop offset="100%" stopColor="#b9f0e4" /></radialGradient></defs>
      </svg>
      {onde > 0 && <span key={onde} className="lp-onde" aria-hidden="true" />}
    </button>
    {ouvert && createPortal(pres === "liste" ? liste_() : pres === "panneau" ? panneau_() : pres === "arc" && arc ? arc_(arc) : anneau_(), hotePortail(bouton.current))}
    <span className="lp-annonce" role="status" aria-live="polite">{annonce}</span>
  </div>;
}

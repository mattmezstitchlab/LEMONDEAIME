import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import "./OrbeGuide.css";

/**
 * Le Point, l'orbe qui guide : à la première ouverture de l'atelier, elle se promène sur chaque outil du dock du haut puis du dock du bas
 * et les présente, un par un, de bout en bout. Elle ouvre elle-même les sous-docks (Dessiner, Broder) pour montrer leurs outils.
 * On avance au clavier (→, Entrée), on recule (←), on quitte (Échap) ; « Revoir la visite » la relance depuis le menu de l'orbe.
 * Le mouvement est coupé quand l'appareil demande moins d'animations.
 */
export const VISITE_CLE = "pointzero:visite-docks:v1";

export interface Etape {
  /** la cible : un ou plusieurs éléments [data-guide="…"] (plusieurs : l'orbe encadre l'ensemble) */
  cible: string;
  titre: string;
  texte: string;
  /** le sous-dock (ou le chemin) à ouvrir avant de montrer la cible */
  chemin?: string;
  /** où se trouve la cible : le dock du haut, celui du bas, ou la page elle-même */
  dock: "haut" | "bas" | "page";
  /** le geste que Le Point imite sur la cible : il trace le point comme l'aiguille (croix, demi-point, point arrière…) */
  geste?: keyof typeof GESTES;
}
/* Les gestes, dans un carré de 56 : l'orbe suit le tracé, le fil reste derrière elle. */
export const GESTES = {
  cross: "M10 10 L46 46 M46 10 L10 46",
  half: "M10 46 L46 10",
  quarter: "M10 46 L28 28",
  threeQuarter: "M10 46 L46 10 M10 10 L28 28",
  petite: "M10 30 L26 46 M26 30 L10 46",
  back: "M8 48 L8 28 L28 28 L28 8 L48 8",
  long: "M8 48 L48 8",
  knot: "M28 16 A12 12 0 1 1 27.9 16",
  fill: "M10 12 L46 12 L10 22 L46 22 L10 32 L46 32 L10 42 L46 42",
  mark: "M10 30 L22 42 L46 14",
  block: "M10 10 L46 10 L46 46 L10 46 Z",
  row: "M6 28 L50 28",
} as const;

export const ETAPES: Etape[] = [
  { dock: "haut", cible: "orbe", titre: "Bonjour, je suis Le Point", texte: "Je vous fais faire le tour du studio : en haut, le dock pour faire ; en bas, celui pour vous repérer, où je vis. Ce carré, ici, ouvre le menu AIME : l’accueil, les réglages et l’affichage (débutante, confirmée, experte)." },
  { dock: "page", cible: "point-zero", titre: "Le point zéro", texte: "Sur une grille vide, tout commence au centre : importez une image, un patron PDF ou un projet, ou glissez-le sur la grille." },
  { dock: "haut", cible: "dessiner", titre: "Dessiner", texte: "Pour composer votre patron case par case. Un clic déplie, sous le dock, la grille de tous les points et de tous les outils." },
  { dock: "haut", cible: "outils", chemin: "dessiner", titre: "Les outils du dessin", texte: "Le fil actif, puis les six outils les plus utilisés. « Tous les points » déplie la grille complète : points, outils, formes, motifs et calques. Choisir replie le dock ; la flèche à gauche remonte d’un niveau." },
  { dock: "haut", cible: "outil-cross", chemin: "dessiner:grille", geste: "cross", titre: "La croix", texte: "Le point de base : deux diagonales dans une case. Touchez la grille, la croix se pose au fil actif. Regardez, je la brode." },
  { dock: "haut", cible: "outil-half", chemin: "dessiner:grille", geste: "half", titre: "Le demi-point", texte: "Une seule diagonale. Son sens se règle dans « Réglages du dessin »." },
  { dock: "haut", cible: "outil-back", chemin: "dessiner:grille", geste: "back", titre: "Le point arrière", texte: "Il suit les lignes de la grille, d’un coin de case à l’autre : pour les contours et les lettres." },
  { dock: "haut", cible: "outil-fill", chemin: "dessiner:grille", geste: "fill", titre: "Remplir", texte: "Un clic remplit toute une zone de la même couleur, aller-retour, comme une rangée de croix." },
  { dock: "haut", cible: "broder", titre: "Broder", texte: "Pour suivre le patron pendant que vous brodez : la grille passe en lecture Patron et le fil actif ressort." },
  { dock: "haut", cible: "outils", chemin: "broder", titre: "Les gestes de la brodeuse", texte: "Main, Marquer, Bloc 10 × 10, Ligne. « Tous les gestes » déplie le reste : détails, pipette, parking, à défaire, note, et le suivi." },
  { dock: "haut", cible: "fils", titre: "Fils", texte: "Fils déplie le nuancier DMC dans le dock : cherchez « 310 », « rouge » ou « vert foncé », touchez une pastille, le dock se replie." },
  { dock: "haut", cible: "partager", titre: "Partager", texte: "Inviter quelqu’un à regarder en direct, choisir qui voit l’ouvrage, exporter le patron en PDF, enregistrer." },
  { dock: "haut", cible: "historique", titre: "Annuler, rétablir", texte: "Chaque geste se reprend : une croix de trop, un remplissage raté, un clic suffit." },
  { dock: "haut", cible: "chercher", titre: "Chercher", texte: "Un fil, un outil, une fonction : tapez quelques lettres, choisissez, c’est fait." },
  { dock: "haut", cible: "profil", titre: "Mes ouvrages", texte: "Tous vos ouvrages sont rangés ici : rouvrez-en un, déposez un fichier (image, PDF, patron), invitez quelqu’un à rejoindre la grille." },
  { dock: "bas", cible: "cercle", titre: "Le Point, chez lui", texte: "Mon anneau suit votre avancement. Un clic m’ouvre : Confort en haut (taille du texte, contraste, thème, mouvement), puis la Loupe, ce Guide et Broderie (Repères, Fils DMC, Progression). Au clavier : les flèches tournent, Entrée ouvre, Échap referme. Je ne crée rien : je règle le confort, j’inspecte, je guide." },
  { dock: "bas", cible: "symboles", titre: "Picto", texte: "Les symboles par-dessus les couleurs, comme sur un patron papier : utile pour les teintes proches." },
  { dock: "bas", cible: "lectures", titre: "Trois lectures de la grille", texte: "À plat : les couleurs franches. Patron : la grille à suivre, case par case. Réaliste : comme une fois brodé." },
  { dock: "bas", cible: "loupe", titre: "La loupe", texte: "Un clic, et un dock se déplie au-dessus : la grille agrandie case par case, là où vous survolez ou touchez. Elle ne modifie rien." },
  { dock: "bas", cible: "tout-voir", titre: "Tout voir", texte: "Le patron entier revient à l’écran. Pour zoomer : la molette, les touches + et −, ou deux doigts sur tablette. C’est tout : bonne broderie ! Vous me retrouverez dans le menu de l’orbe : « Revoir la visite avec Le Point »." },
];

type Boite = { x: number; y: number; w: number; h: number };
const MARGE = 12;

/* la cible est présente si au moins un de ses éléments est affiché ; sa boîte est l'union des éléments (vide sans mise en page) */
function boiteDe(cible: string): Boite | null | "absente" {
  const els = [...document.querySelectorAll<HTMLElement>(`[data-guide="${cible}"]`)].filter(el => getComputedStyle(el).display !== "none" && !el.closest("[hidden]"));
  if (!els.length) return "absente";
  const r = els.map(el => el.getBoundingClientRect()).filter(b => b.width > 0 && b.height > 0);
  if (!r.length) return null;
  const x = Math.min(...r.map(b => b.left)), y = Math.min(...r.map(b => b.top));
  return { x, y, w: Math.max(...r.map(b => b.right)) - x, h: Math.max(...r.map(b => b.bottom)) - y };
}

export function visiteVue(cle = VISITE_CLE): boolean { try { return localStorage.getItem(cle) === "vue"; } catch { return true; } }
function marquerVue(cle: string) { try { localStorage.setItem(cle, "vue"); } catch { /* l'appareil refuse : la visite reviendra */ } }
const LIEUX = { haut: "dock du haut", bas: "dock du bas", page: "la page" } as const;

interface GuideProps {
  ouverte: boolean; onFermer: () => void;
  /** ouvrir le sous-dock d'une étape (null : revenir au dock de départ) */
  onChemin: (p: string | null) => void;
  etapes?: Etape[];
  /** la clé qui retient que la visite a été vue */
  cle?: string;
  /** le libellé du dernier bouton */
  fin?: string;
}
export default function OrbeGuide({ ouverte, onFermer, onChemin, etapes = ETAPES, cle = VISITE_CLE, fin = "Commencer à broder" }: GuideProps) {
  const ETAPES_ = etapes;
  const [i, setI] = useState(0);
  const [boite, setBoite] = useState<Boite | null>(null);
  const [vue, setVue] = useState({ w: 0, h: 0 });
  const suivantRef = useRef<HTMLButtonElement>(null);
  const carteRef = useRef<HTMLDivElement>(null);
  const [hCarte, setHCarte] = useState(180);
  /* les étapes dont la cible est absente (ex. le nom de l'ouvrage, caché sur téléphone) sont sautées */
  const [sautees, setSautees] = useState<Set<number>>(new Set());

  useEffect(() => { if (ouverte) { setI(0); setSautees(new Set()); } }, [ouverte]);
  const etape = ETAPES_[i];

  /* ouvrir le sous-dock de l'étape, puis mesurer la cible une fois le dock redessiné */
  useLayoutEffect(() => {
    if (!ouverte) return;
    onChemin(etape.chemin ?? null);
    let vivant = true, essais = 0;
    const mesurer = () => {
      if (!vivant) return;
      /* sur téléphone, les docks défilent : on amène l'outil sous l'orbe */
      try { document.querySelector<HTMLElement>(`[data-guide="${etape.cible}"]`)?.scrollIntoView({ block: etape.dock === "page" ? "center" : "nearest", inline: "nearest", behavior: "instant" as ScrollBehavior }); } catch { /* jsdom */ }
      const b = boiteDe(etape.cible);
      setVue({ w: window.innerWidth, h: window.innerHeight });
      /* le dock ouvert peut avoir pris le focus (sa flèche « remonter ») : on le rend au bouton Suivant */
      if (b !== "absente") { setBoite(b); suivantRef.current?.focus({ preventScroll: true }); return; }
      if (++essais < 6) { requestAnimationFrame(mesurer); return; }
      setSautees(s => new Set(s).add(i));
      setI(n => n < ETAPES_.length - 1 ? n + 1 : n);
    };
    /* deux images d'attente : le dock se redessine (un bloc se replie, un sous-dock s'ouvre) avant qu'on mesure ; puis une vérification */
    requestAnimationFrame(() => requestAnimationFrame(mesurer));
    const verif = window.setTimeout(() => { if (vivant) { const b = boiteDe(etape.cible); if (b && b !== "absente") setBoite(b); suivantRef.current?.focus({ preventScroll: true }); } }, 320);
    const remesurer = () => { const b = boiteDe(etape.cible); if (b && b !== "absente") setBoite(b); setVue({ w: window.innerWidth, h: window.innerHeight }); };
    window.addEventListener("resize", remesurer);
    return () => { vivant = false; window.clearTimeout(verif); window.removeEventListener("resize", remesurer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte, i]);
  useEffect(() => { if (ouverte) suivantRef.current?.focus({ preventScroll: true }); }, [ouverte, i]);
  useLayoutEffect(() => { if (carteRef.current) setHCarte(carteRef.current.offsetHeight); }, [i, boite, ouverte]);

  const fermer = useCallback(() => { marquerVue(cle); onChemin(null); onFermer(); }, [cle, onChemin, onFermer]);
  const precedent = () => { let n = i - 1; while (n > 0 && sautees.has(n)) n--; setI(Math.max(0, n)); };
  const suivant = () => { if (i >= ETAPES_.length - 1) fermer(); else setI(i + 1); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); fermer(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); suivant(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); precedent(); }
  };
  if (!ouverte) return null;

  const total = ETAPES_.length - sautees.size, rang = i + 1 - [...sautees].filter(n => n < i).length;
  const W = vue.w || 1024, H = vue.h || 768;
  const largeur = Math.min(360, W - 2 * MARGE);
  /* l'orbe se pose au bord de l'outil, côté écran ; la bulle s'ouvre au-delà de l'orbe */
  const b = boite ?? { x: W / 2 - 20, y: etape.dock === "haut" ? 20 : H - 70, w: 40, h: 46 };
  /* la bulle s'ouvre du côté où il y a de la place : sous la cible si elle est dans la moitié haute de l'écran */
  const enHaut = etape.dock === "haut" || (etape.dock === "page" && b.y + b.h / 2 < H / 2);
  const cx = b.x + b.w / 2;
  const orbe = { x: cx, y: enHaut ? b.y + b.h + 22 : b.y - 22 };
  const carteX = Math.min(Math.max(MARGE, cx - largeur / 2), W - largeur - MARGE);
  const carteY = enHaut ? orbe.y + 22 : orbe.y - 22 - hCarte;
  /* pour une cible de la page, la bulle reste entre les deux docks, quand l'écran le permet */
  const entreDocks = etape.dock === "page" && H - 2 * 96 > hCarte;
  const haut = entreDocks ? 96 : MARGE, bas = entreDocks ? 96 : MARGE;

  return <div className="og-couche" onKeyDown={onKey}>
    <div className="og-cadre" aria-hidden="true" style={{ transform: `translate(${b.x - 6}px, ${b.y - 6}px)`, width: b.w + 12, height: b.h + 12 }} />
    <div className="og-orbe" aria-hidden="true" style={{ transform: `translate(${orbe.x - 15}px, ${orbe.y - 15}px)` }}><span /></div>
    {etape.geste && <svg key={i} className="og-geste" aria-hidden="true" width="84" height="84" viewBox="0 0 56 56" style={{ transform: `translate(${b.x + b.w / 2 - 42}px, ${b.y + b.h / 2 - 42}px)` }}>
      <path className="og-geste-fil" d={GESTES[etape.geste]} pathLength={100} />
      <circle className="og-geste-aiguille" r="6" style={{ offsetPath: `path("${GESTES[etape.geste]}")` }} />
    </svg>}
    <div ref={carteRef} className={"og-carte " + (enHaut ? "og-sous" : "og-sur")} role="dialog" aria-modal="false" aria-labelledby="og-titre" aria-describedby="og-texte"
      style={{ transform: `translate(${carteX}px, ${Math.max(haut, Math.min(carteY, H - hCarte - bas))}px)`, width: largeur }}>
      <p className="og-rang"><span><b className="og-nom">Le Point</b> · {LIEUX[etape.dock]}</span><span aria-label={`Étape ${rang} sur ${total}`}>{rang} / {total}</span></p>
      <h2 id="og-titre" className="og-titre">{etape.titre}</h2>
      <p id="og-texte" className="og-texte" aria-live="polite">{etape.texte}</p>
      <div className="og-barre" aria-hidden="true"><span style={{ width: `${(rang / total) * 100}%` }} /></div>
      <div className="og-boutons">
        {i < ETAPES_.length - 1 ? <button type="button" className="og-passer" onClick={fermer}>Passer la visite</button> : <span />}
        <span>
          {i > 0 && <button type="button" className="og-prec" onClick={precedent}>Précédent</button>}
          <button ref={suivantRef} type="button" className="og-suiv" onClick={suivant}>{i >= ETAPES_.length - 1 ? fin : "Suivant"}</button>
        </span>
      </div>
    </div>
  </div>;
}

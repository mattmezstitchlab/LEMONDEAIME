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
}

export const ETAPES: Etape[] = [
  { dock: "haut", cible: "orbe", titre: "Bonjour, je suis Le Point", texte: "Je vous fais faire le tour du studio : en haut, le dock pour travailler ; en bas, celui pour vous repérer. Mon carré ouvre le menu : le BurO, l’accueil, les réglages et l’affichage (débutante, confirmée, experte)." },
  { dock: "haut", cible: "dessiner", titre: "Dessiner", texte: "Pour composer votre patron case par case, ou retoucher un patron importé. Un clic déploie ses outils dans le dock." },
  { dock: "haut", cible: "outils", chemin: "dessiner", titre: "Les outils du dessin", texte: "D’abord le fil actif, puis la main pour vous déplacer, la croix, la gomme, le remplissage, la pipette et la sélection. « Plus d’outils » garde les demi-points, quarts, perles, points arrière et nœuds. La flèche à gauche remonte d’un niveau." },
  { dock: "haut", cible: "broder", titre: "Broder", texte: "Pour suivre le patron pendant que vous brodez : la grille passe en lecture Patron et le fil actif ressort." },
  { dock: "haut", cible: "outils", chemin: "broder", titre: "Les outils de la brodeuse", texte: "Marquez une case, un bloc de 10 × 10 ou une ligne entière ; garez un fil au parking, notez, défaites. « Suivi » montre où vous en êtes." },
  { dock: "haut", cible: "fils", titre: "Fils", texte: "Le fil actif et le nuancier DMC : cherchez « 310 », « rouge » ou « vert foncé ». « Fils et toile » règle le nombre de brins et la toile." },
  { dock: "haut", cible: "partager", titre: "Partager", texte: "Inviter quelqu’un à regarder en direct, choisir qui voit l’ouvrage, exporter le patron en PDF, enregistrer." },
  { dock: "haut", cible: "historique", titre: "Annuler, rétablir", texte: "Chaque geste se reprend : une croix de trop, un remplissage raté, un clic suffit." },
  { dock: "haut", cible: "chercher", titre: "Chercher", texte: "Un fil, un outil, une fonction : tapez quelques lettres, choisissez, c’est fait." },
  { dock: "haut", cible: "profil", titre: "Mes ouvrages", texte: "Rouvrez un ouvrage, déposez un fichier (image, PDF, patron), invitez quelqu’un à rejoindre la grille." },
  { dock: "bas", cible: "cercle", titre: "Le cercle", texte: "Son anneau suit votre avancement. Un clic change le dock du bas : Repères, Fils (vos pastilles DMC, avec le stock) ou Progression (la timeline du patron, fil par fil)." },
  { dock: "bas", cible: "ouvrage", titre: "L’ouvrage en cours", texte: "Son nom et sa visibilité : pour vous seule, pour vos proches, ou pour tout le monde." },
  { dock: "bas", cible: "lectures", titre: "Trois lectures de la grille", texte: "Réaliste : comme une fois brodé. À plat : les couleurs franches. Patron : la grille à suivre, case par case." },
  { dock: "bas", cible: "symboles", titre: "Symboles", texte: "Les symboles par-dessus les couleurs, comme sur un patron papier : utile pour les teintes proches." },
  { dock: "bas", cible: "zoom", titre: "Zoomer", texte: "La loupe double le zoom de la zone visible ; − et + règlent le reste. Sur tablette, pincez la grille." },
  { dock: "bas", cible: "tout-voir", titre: "Tout voir", texte: "Le patron entier revient à l’écran. C’est tout : bonne broderie ! Vous me retrouverez dans le menu de l’orbe : « Revoir la visite avec Le Point »." },
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
    requestAnimationFrame(mesurer);
    const remesurer = () => { const b = boiteDe(etape.cible); if (b && b !== "absente") setBoite(b); setVue({ w: window.innerWidth, h: window.innerHeight }); };
    window.addEventListener("resize", remesurer);
    return () => { vivant = false; window.removeEventListener("resize", remesurer); };
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

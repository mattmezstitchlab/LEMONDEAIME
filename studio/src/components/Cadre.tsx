import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as KE, type PointerEvent as PE } from "react";
import { VUE_CADRE, type VueCadre } from "./Canvas";
import { changerToile, cm, decaler, duree, etendre, FORMATS, mesures, mesuresAEchelle, nomToile, PALETTES, pointsPourCm, reechantillonner, retouche, TOILES, type Mesures, type ReglagesPhoto } from "../lib/cadre";
import { convertirPhoto } from "../lib/cadrePhoto";
import { regenerer, retoucheRecette } from "../lib/motif5d/generer";
import type { Pattern } from "../lib/pattern";

/**
 * Le Cadre posé sur la grille de points : l'étiquette au-dessus (taille réelle, temps, écheveaux),
 * le + à droite (les fonctions rares), les coins qui recomptent les points, les bords qui agrandissent la toile,
 * la poignée qui déplace le motif. La position suit la vue de la grille, image par image, sans re-rendu React.
 */
type Poignee = "nw" | "ne" | "se" | "sw" | "n" | "e" | "s" | "w";
const COINS: Poignee[] = ["nw", "ne", "se", "sw"];
const BORDS: Poignee[] = ["n", "e", "s", "w"];
const NOMS: Record<Poignee, string> = { nw: "haut gauche", ne: "haut droit", se: "bas droit", sw: "bas gauche", n: "haut", e: "droit", s: "bas", w: "gauche" };
interface Fantome { x0: number; y0: number; x1: number; y1: number; m: Mesures; mot: string }
interface Glisse { p: Poignee | "motif"; x: number; y: number; base: Pattern; m: Mesures; dx: number; dy: number; fant?: Fantome; res?: { w: number; h: number; ax: number; ay: number; cotes?: { gauche: number; haut: number; droite: number; bas: number } } }

export const ancrer = (x: number, y: number) => window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "ancrer", x, y } }));

export default function Cadre({ pattern: P, readOnly, plus, onSet, onBegin, onLive, onEnd, onNotify }: {
  pattern: Pattern; readOnly?: boolean;
  /** les fonctions rares, rangées dans le + du cadre */
  plus: [string, () => void][];
  onSet: (p: Pattern) => void; onBegin: () => void; onLive: (p: Pattern) => void; onEnd: (changed: boolean) => void;
  onNotify: (m: string) => void;
}) {
  const vue = useRef<VueCadre | null>(null);
  const racine = useRef<HTMLDivElement>(null);
  const glisse = useRef<Glisse | null>(null);
  const image = useRef<number | null>(null);
  const [menu, setMenu] = useState<"plus" | "toile" | "photo" | null>(null);
  const [occupe, setOccupe] = useState("");
  const [fant, setFant] = useState<Fantome | null>(null);
  const m = useMemo(() => mesures(P), [P]);
  const latest = useRef({ P, m }); latest.current = { P, m };

  /* -------- la position suit la grille -------- */
  const poser = useCallback(() => {
    image.current = null;
    const v = vue.current, el = racine.current; if (!v || !el) return;
    const g = glisse.current?.fant;
    const X = (c: number) => v.left + v.ox + c * v.s, Y = (c: number) => v.top + v.oy + c * v.s;
    const r = { x0: X(0), y0: Y(0), x1: X(v.pw), y1: Y(v.ph) };
    el.style.setProperty("--cx0", r.x0 + "px"); el.style.setProperty("--cy0", r.y0 + "px");
    el.style.setProperty("--cw", (r.x1 - r.x0) + "px"); el.style.setProperty("--ch", (r.y1 - r.y0) + "px");
    const f = g ? { x0: X(g.x0), y0: Y(g.y0), x1: X(g.x1), y1: Y(g.y1) } : r;
    el.style.setProperty("--fx0", f.x0 + "px"); el.style.setProperty("--fy0", f.y0 + "px");
    el.style.setProperty("--fw", (f.x1 - f.x0) + "px"); el.style.setProperty("--fh", (f.y1 - f.y0) + "px");
    el.dataset.pret = "1";
  }, []);
  useEffect(() => {
    const suivre = (e: Event) => { vue.current = (e as CustomEvent<VueCadre>).detail; if (image.current === null) image.current = requestAnimationFrame(poser); };
    window.addEventListener(VUE_CADRE, suivre);
    return () => { window.removeEventListener(VUE_CADRE, suivre); if (image.current !== null) cancelAnimationFrame(image.current); };
  }, [poser]);
  useEffect(() => { poser(); }, [fant, poser]);
  useEffect(() => { window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "redraw" } })); }, []);

  /* -------- coins, bords, déplacer -------- */
  const cellule = (cx: number, cy: number) => { const v = vue.current!; return { x: (cx - v.left - v.ox) / v.s, y: (cy - v.top - v.oy) / v.s }; };
  const calculer = (g: Glisse, x: number, y: number) => {
    const { base } = g, pw = base.w, ph = base.h, c = cellule(x, y);
    if (g.p === "motif") {
      const c0 = cellule(g.x, g.y), dx = Math.round(c.x - c0.x), dy = Math.round(c.y - c0.y);
      if (dx !== g.dx || dy !== g.dy) { g.dx = dx; g.dy = dy; onLive(decaler(base, dx, dy)); }
      return;
    }
    if (COINS.includes(g.p)) {
      const ax = g.p.includes("w") ? pw : 0, ay = g.p.includes("n") ? ph : 0;
      const f = Math.max(Math.abs(c.x - ax) / pw, Math.abs(c.y - ay) / ph);
      const w = Math.max(4, Math.min(1000, Math.round(pw * f))), h = Math.max(4, Math.min(1000, Math.round(ph * f)));
      const x0 = g.p.includes("w") ? pw - w : 0, y0 = g.p.includes("n") ? ph - h : 0;
      g.res = { w, h, ax: x0, ay: y0 };
      g.fant = { x0, y0, x1: x0 + w, y1: y0 + h, m: mesuresAEchelle(g.m, w / pw), mot: base.recette && !retoucheRecette(base) ? "Le motif sera recalculé" : base.photo && !retouche(base) ? "La photo sera recomptée" : "Points mis à l’échelle" };
    } else {
      const cotes = { gauche: 0, haut: 0, droite: 0, bas: 0 };
      if (g.p === "e") cotes.droite = Math.max(1 - pw, Math.round(c.x - pw));
      if (g.p === "w") cotes.gauche = Math.max(1 - pw, Math.round(-c.x));
      if (g.p === "s") cotes.bas = Math.max(1 - ph, Math.round(c.y - ph));
      if (g.p === "n") cotes.haut = Math.max(1 - ph, Math.round(-c.y));
      const w = pw + cotes.gauche + cotes.droite, h = ph + cotes.haut + cotes.bas;
      g.res = { w, h, ax: -cotes.gauche, ay: -cotes.haut, cotes };
      const pouce = 2.54 * (base.fabric?.over ?? 1) / base.count;
      g.fant = { x0: -cotes.gauche, y0: -cotes.haut, x1: pw + cotes.droite, y1: ph + cotes.bas, m: { ...g.m, cmL: w * pouce, cmH: h * pouce }, mot: w * h < pw * ph ? "La toile est recoupée" : "Plus de toile autour" };
    }
    setFant(g.fant);
  };
  const appliquer = async (g: Glisse) => {
    const r = g.res; if (!r) return;
    const { base } = g;
    if (r.w === base.w && r.h === base.h && !r.ax && !r.ay) return;
    if (r.cotes) { ancrer(r.ax, r.ay); onSet(etendre(base, r.cotes)); onNotify(`Toile : ${r.w} × ${r.h} points. Les points n’ont pas bougé.`); return; }
    if (base.recette && !retoucheRecette(base)) {
      const p = regenerer(base, r.w, r.h);
      if (p) { ancrer(r.ax, r.ay); onSet(p); onNotify(`${r.w} × ${r.h} points : le motif est recalculé à cette taille, depuis sa recette.`); return; }
    }
    if (base.photo && !retouche(base)) {
      setOccupe("La photo est recomptée…");
      try { const p = await convertirPhoto(base, base.photo.src, base.photo.reglages, r.w, r.h); ancrer(r.ax, r.ay); onSet(p); onNotify(`${r.w} × ${r.h} points, recomptés depuis la photo.`); }
      catch (e) { onNotify(e instanceof Error ? e.message : "Conversion impossible."); }
      finally { setOccupe(""); }
    } else {
      ancrer(r.ax, r.ay); onSet(reechantillonner(base, r.w, r.h));
      onNotify(base.photo || base.recette ? `${r.w} × ${r.h} points. Vos retouches sont gardées : les points sont mis à l’échelle.` : `${r.w} × ${r.h} points, mis à l’échelle.`);
    }
  };
  const debut = (p: Poignee | "motif") => (e: PE<HTMLElement>) => {
    if (readOnly || occupe || !vue.current || e.button > 0) return;
    e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMenu(null);
    glisse.current = { p, x: e.clientX, y: e.clientY, base: latest.current.P, m: latest.current.m, dx: 0, dy: 0 };
    if (p === "motif") onBegin();
  };
  const bouge = (e: PE<HTMLElement>) => { const g = glisse.current; if (g) calculer(g, e.clientX, e.clientY); };
  const fin = (e: PE<HTMLElement>) => {
    const g = glisse.current; if (!g) return; glisse.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setFant(null);
    if (g.p === "motif") { onEnd(!!(g.dx || g.dy)); if (g.dx || g.dy) onNotify(`Motif déplacé de ${g.dx} × ${g.dy} points.`); return; }
    void appliquer(g);
  };
  /** Au clavier : flèches sur un bord = un point de toile ; sur un coin = 10 % plus grand ou plus petit. */
  const clavier = (p: Poignee) => (e: KE<HTMLElement>) => {
    const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]; if (!d || readOnly || occupe) return;
    e.preventDefault();
    const base = latest.current.P, g: Glisse = { p, x: 0, y: 0, base, m: latest.current.m, dx: 0, dy: 0 };
    if (COINS.includes(p)) {
      const plusGrand = (p.includes("e") ? d[0] : -d[0]) + (p.includes("s") ? d[1] : -d[1]) > 0, f = plusGrand ? 1.1 : 1 / 1.1;
      const w = Math.max(4, Math.round(base.w * f)), h = Math.max(4, Math.round(base.h * f));
      g.res = { w, h, ax: p.includes("w") ? base.w - w : 0, ay: p.includes("n") ? base.h - h : 0 };
    } else {
      const cotes = { gauche: 0, haut: 0, droite: 0, bas: 0 };
      if (p === "e") cotes.droite = d[0]; if (p === "w") cotes.gauche = -d[0]; if (p === "s") cotes.bas = d[1]; if (p === "n") cotes.haut = -d[1];
      g.res = { w: base.w + cotes.gauche + cotes.droite, h: base.h + cotes.haut + cotes.bas, ax: -cotes.gauche, ay: -cotes.haut, cotes };
      if (g.res.w < 1 || g.res.h < 1) return;
    }
    void appliquer(g);
  };

  const vu = fant?.m ?? m;
  const toile = nomToile(P);
  return <div ref={racine} className={"cadre" + (fant ? " cadre-tire" : "") + (occupe ? " cadre-occupe" : "")} data-guide="cadre">
    <div className="cadre-contour" aria-hidden="true" />
    {fant && <div className="cadre-fantome" aria-hidden="true"><span>{fant.x1 - fant.x0} × {fant.y1 - fant.y0}</span></div>}
    <div className="cadre-tete" data-defile role="group" aria-label={`Le cadre : ${P.name}`}>
      {!readOnly && <button type="button" className="cadre-deplacer" aria-label="Déplacer le motif dans le cadre (glisser)" title="Glisser pour déplacer le motif dans le cadre"
        onPointerDown={debut("motif")} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={fin}
        onKeyDown={e => { const d = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[e.key]; if (!d) return; e.preventDefault(); onSet(decaler(latest.current.P, d[0], d[1])); }}>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1v14M1 8h14M8 1 6 3M8 1l2 2M8 15l-2-2M8 15l2-2M1 8l2-2M1 8l2 2M15 8l-2-2M15 8l-2 2" /></svg>
      </button>}
      <span className="cadre-nom">{P.name}</span>
      <span className="cadre-dims" aria-live="polite">{fant ? `${fant.x1 - fant.x0} × ${fant.y1 - fant.y0}` : `${P.w} × ${P.h}`} pts</span>
      <span className="cadre-cm">{cm(vu.cmL)} × {cm(vu.cmH)}</span>
      <button type="button" className="cadre-puce" aria-haspopup="menu" aria-expanded={menu === "toile"} disabled={readOnly} onClick={() => setMenu(v => v === "toile" ? null : "toile")}>{toile}</button>
      <span className="cadre-surprise" title="Estimation : environ 130 croix par heure, et les écheveaux DMC à prévoir">
        <b>{duree(vu.heures)}</b>{vu.echeveaux > 0 && <> · {vu.echeveaux} écheveau{vu.echeveaux > 1 ? "x" : ""}</>}
      </span>
      {fant && <span className="cadre-mot">{fant.mot}</span>}
      {occupe && <span className="cadre-mot" role="status">{occupe}</span>}
      <button type="button" className="cadre-plus" aria-label="Plus de fonctions" aria-haspopup="menu" aria-expanded={menu === "plus" || menu === "photo"} onClick={() => setMenu(v => v ? null : "plus")}>+</button>
    </div>
    {menu === "toile" && <div className="cadre-menu cadre-menu-toile" role="menu" aria-label="La toile">
      {TOILES.map(t => <button key={t.nom} role="menuitemradio" aria-checked={t.nom === toile} type="button" onClick={() => { onSet(changerToile(P, t.count, t.over ?? 1, t.type ?? "aida")); setMenu(null); onNotify(`${t.nom} : ${cm(P.w * 2.54 * (t.over ?? 1) / t.count)} × ${cm(P.h * 2.54 * (t.over ?? 1) / t.count)}.`); }}>{t.nom}<small>{cm(P.w * 2.54 * (t.over ?? 1) / t.count)}</small></button>)}
    </div>}
    {menu === "plus" && <div className="cadre-menu" role="menu" aria-label="Plus de fonctions">
      {P.photo && <button role="menuitem" type="button" onClick={() => setMenu("photo")}>La photo<small>lumière, contraste, palette</small></button>}
      {P.recette && retoucheRecette(P) && <button role="menuitem" type="button" onClick={() => { const p = regenerer(P, P.w, P.h); setMenu(null); if (p) { onSet(p); onNotify("Le motif d’origine est revenu. Annuler retrouve vos retouches."); } }}>Revenir à la recette<small>{P.recette.code.replace(/\.(?=[gv])/g, " · ")}</small></button>}
      {plus.map(([nom, faire]) => <button key={nom} role="menuitem" type="button" onClick={() => { setMenu(null); faire(); }}>{nom}</button>)}
    </div>}
    {menu === "photo" && P.photo && <ReglagesPhotoVue pattern={P} onSet={onSet} onFermer={() => setMenu(null)} onNotify={onNotify} />}
    {!readOnly && [...COINS, ...BORDS].map(p => <span key={p} className={"cadre-poignee cadre-" + p + (COINS.includes(p) ? " cadre-coin" : " cadre-bord")}
      role="slider" tabIndex={0} aria-orientation={p === "n" || p === "s" ? "vertical" : "horizontal"}
      aria-label={COINS.includes(p) ? `Coin ${NOMS[p]} : agrandir ou réduire le motif, les points sont recomptés` : `Bord ${NOMS[p]} : agrandir ou réduire la toile`}
      aria-valuetext={`${P.w} × ${P.h} points`} aria-valuenow={p === "n" || p === "s" ? P.h : P.w}
      onPointerDown={debut(p)} onPointerMove={bouge} onPointerUp={fin} onPointerCancel={fin} onKeyDown={clavier(p)} />)}
  </div>;
}

/** Les réglages de la photo : chaque changement repart de la photo gardée, au même format. */
function ReglagesPhotoVue({ pattern: P, onSet, onFermer, onNotify }: { pattern: Pattern; onSet: (p: Pattern) => void; onFermer: () => void; onNotify: (m: string) => void }) {
  const [r, setR] = useState<ReglagesPhoto>(P.photo!.reglages);
  const [calcul, setCalcul] = useState(false);
  const seq = useRef(0), base = useRef(P), minuterie = useRef<number | null>(null);
  const edite = retouche(P);
  const changer = (n: Partial<ReglagesPhoto>) => {
    const next = { ...r, ...n }; setR(next);
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = window.setTimeout(async () => {
      const id = ++seq.current; setCalcul(true);
      try { const p = await convertirPhoto(base.current, P.photo!.src, next, base.current.w, base.current.h); if (id === seq.current) onSet(p); }
      catch (e) { onNotify(e instanceof Error ? e.message : "Conversion impossible."); }
      finally { if (id === seq.current) setCalcul(false); }
    }, 220);
  };
  useEffect(() => () => { if (minuterie.current) clearTimeout(minuterie.current); }, []);
  const curseur = (cle: "lumiere" | "contraste" | "saturation", nom: string) => <label className="cadre-curseur">
    <span>{nom}<output>{r[cle] > 0 ? "+" : ""}{r[cle]}</output></span>
    <input type="range" min={-100} max={100} step={5} value={r[cle]} onChange={e => changer({ [cle]: +e.target.value })} onDoubleClick={() => changer({ [cle]: 0 })} />
  </label>;
  return <section className="cadre-menu cadre-photo" role="dialog" aria-label="Réglages de la photo" onKeyDown={e => { if (e.key === "Escape") onFermer(); }}>
    <header><b>La photo</b>{calcul && <span role="status">recompte…</span>}<button type="button" aria-label="Fermer les réglages de la photo" onClick={onFermer}>×</button></header>
    {edite && <p className="cadre-note">Vous avez retouché le motif : un réglage repart de la photo et remplace ces retouches (Annuler les retrouve).</p>}
    <label className="cadre-bascule"><input type="checkbox" checked={r.auto} onChange={e => changer({ auto: e.target.checked })} /><span>Auto<small>niveaux et couleurs équilibrés</small></span></label>
    {curseur("lumiere", "Lumière")}{curseur("contraste", "Contraste")}{curseur("saturation", "Saturation")}
    <label className="cadre-bascule"><input type="checkbox" checked={r.fond} onChange={e => changer({ fond: e.target.checked })} /><span>Fond en toile nue<small>le fond uni de la photo n’est pas brodé</small></span></label>
    <fieldset className="cadre-palettes"><legend>Palette</legend>
      {PALETTES.map(p => <button key={p.id} type="button" aria-pressed={r.palette === p.id} title={p.phrase} onClick={() => changer({ palette: p.id })}><i className={"cadre-nuance cadre-nuance-" + p.id} aria-hidden="true" />{p.nom}</button>)}
    </fieldset>
    <p className="cadre-note">{PALETTES.find(p => p.id === r.palette)?.phrase}</p>
    <button type="button" className="cadre-lien" onClick={() => changer({ auto: true, lumiere: 0, contraste: 0, saturation: 0, palette: "originale", fond: true })}>Revenir au réglage automatique</button>
  </section>;
}

/** Tracer son format : on tire un rectangle sur la grille de points, ou on choisit un format tout fait. */
export function TracerCadre({ count, over = 1, onTrace, onAnnuler }: { count: Pattern["count"]; over?: 1 | 2; onTrace: (w: number, h: number, nom?: string) => void; onAnnuler: () => void }) {
  const vue = useRef<VueCadre | null>(null);
  const [a, setA] = useState<{ x: number; y: number } | null>(null);
  const [b, setB] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const suivre = (e: Event) => { vue.current = (e as CustomEvent<VueCadre>).detail; };
    window.addEventListener(VUE_CADRE, suivre);
    window.dispatchEvent(new CustomEvent("pointzero:canvas", { detail: { action: "redraw" } }));
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onAnnuler(); };
    window.addEventListener("keydown", echap);
    return () => { window.removeEventListener(VUE_CADRE, suivre); window.removeEventListener("keydown", echap); };
  }, [onAnnuler]);
  /** aimanté : chaque coin du rectangle se pose sur un point de la grille */
  const aimant = (x: number, y: number) => { const v = vue.current; if (!v) return { x, y, cx: 0, cy: 0 }; const cx = Math.round((x - v.left - v.ox) / v.s), cy = Math.round((y - v.top - v.oy) / v.s); return { x: v.left + v.ox + cx * v.s, y: v.top + v.oy + cy * v.s, cx, cy }; };
  const rect = a && b ? { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) } : null;
  const s = vue.current?.s ?? 1, pw = rect ? Math.round(rect.w / s) : 0, ph = rect ? Math.round(rect.h / s) : 0, pouce = 2.54 * over / count;
  return <div className="cadre-tracer" role="application" aria-label="Tracer le format de l’ouvrage : glisser sur la grille de points. Échap pour annuler."
    onPointerDown={e => { if (e.button > 0) return; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); const p = aimant(e.clientX, e.clientY); setA(p); setB(p); }}
    onPointerMove={e => { if (a) setB(aimant(e.clientX, e.clientY)); }}
    onPointerUp={() => { if (a && b && pw >= 2 && ph >= 2) onTrace(Math.min(1000, pw), Math.min(1000, ph)); setA(null); setB(null); }}>
    <div className="cadre-tracer-aide" onPointerDown={e => e.stopPropagation()}>
      <b>Tracez votre format</b><span>Glissez sur la grille de points : chaque point est un trou de la toile.</span>
      <div className="cadre-formats" role="group" aria-label="Formats tout faits">
        {FORMATS.map(f => { const w = pointsPourCm(f.cm[0], count, over), h = pointsPourCm(f.cm[1], count, over);
          return <button key={f.id} type="button" onClick={() => onTrace(w, h, f.nom)}><i style={{ aspectRatio: `${f.cm[0]} / ${f.cm[1]}` }} aria-hidden="true" />{f.nom}<small>{f.cm[0]} × {f.cm[1]} cm</small></button>; })}
      </div>
      <button type="button" className="cadre-lien" onClick={onAnnuler}>Annuler</button>
    </div>
    {rect && <div className="cadre-trace" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}>
      <span>{pw} × {ph} pts · {cm(pw * pouce)} × {cm(ph * pouce)}</span>
    </div>}
  </div>;
}

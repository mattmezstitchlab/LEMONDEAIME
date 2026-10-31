/**
 * La une de Point Zéro : une rosace du moteur 5D, brodée (choix de Matt, 29 octobre : plus de peinture de roses).
 * La rosace naît anneau par anneau à l'ouverture ; sous la souris, un cercle au bord flou montre ce qu'il y a dessous :
 * le patron (la grille de la toile, les symboles, la couleur pâle des fils). Le moteur 5D n'est pas modifié : on lit son motif.
 * Mouvement réduit : la rosace est entière d'emblée.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { FLOSS } from "../lib/dmc";
import { drawSymbol } from "../lib/symbols";
import { RECETTES, recetteDe } from "../lib/motif5d/recettes";
import { rosaceDe, visibilite, type Rosace } from "./edition/rosace";
import "./RosaceUne.css";

/* la recette de la une (modifiable sans toucher au moteur) ; ?une=Nom pour essayer une autre recette */
const RECETTE_UNE = "Givre";
function recetteChoisie() {
  let nom = RECETTE_UNE;
  try { const q = new URLSearchParams(window.location.search).get("une"); if (q && RECETTES.some(r => r.nom === q)) nom = q; } catch { /* rien */ }
  return RECETTES.find(r => r.nom === nom) ?? RECETTES[0];
}

const lisse = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

/** une croix brodée : le point du dessous un peu plus sombre, celui du dessus avec son reflet ; une ombre portée sur la toile */
function brodee(ctx: CanvasRenderingContext2D, r: Rosace, s: number, p: number) {
  const m = s * .15, parFil = new Map<string, { bas: Path2D; haut: Path2D }>(), ombre = new Path2D();
  for (const c of r.cases) {
    const a = p >= 1 ? 1 : visibilite(c, p); if (a <= .02) continue;
    const cle = c.f + "|" + (a >= .99 ? 1 : Math.round(a * 4) / 4);
    let t = parFil.get(cle); if (!t) parFil.set(cle, (t = { bas: new Path2D(), haut: new Path2D() }));
    const X = c.x * s, Y = c.y * s;
    t.bas.moveTo(X + s - m, Y + m); t.bas.lineTo(X + m, Y + s - m);
    t.haut.moveTo(X + m, Y + m); t.haut.lineTo(X + s - m, Y + s - m);
    ombre.moveTo(X + m + .6, Y + m + 1.4); ombre.lineTo(X + s - m + .6, Y + s - m + 1.4);
    ombre.moveTo(X + s - m + .6, Y + m + 1.4); ombre.lineTo(X + m + .6, Y + s - m + 1.4);
  }
  ctx.lineCap = "round";
  ctx.lineWidth = s * .36; ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.stroke(ombre);
  for (const [cle, t] of parFil) {
    const [f, a] = cle.split("|"), hex = FLOSS[Number(f)]?.hex ?? "#888"; ctx.globalAlpha = Number(a);
    ctx.lineWidth = s * .34; ctx.strokeStyle = hex; ctx.stroke(t.bas);
    ctx.lineWidth = s * .34; ctx.strokeStyle = "rgba(0,0,0,.16)"; ctx.stroke(t.bas);
    ctx.lineWidth = s * .34; ctx.strokeStyle = hex; ctx.stroke(t.haut);
    ctx.lineWidth = s * .09; ctx.strokeStyle = "rgba(255,255,255,.34)"; ctx.stroke(t.haut);
  }
  ctx.globalAlpha = 1;
}

/** le patron, dessous : la grille (une ligne forte toutes les dix cases), la couleur pâle des fils, les symboles */
function patron(ctx: CanvasRenderingContext2D, r: Rosace, s: number) {
  ctx.fillStyle = "#f4f4f2"; ctx.fillRect(-s * 6, -s * 6, (r.w + 12) * s, (r.h + 12) * s);
  const fils = [...new Set(r.cases.map(c => c.f))], symbole = new Map(fils.map((f, k) => [f, k] as const));
  ctx.globalAlpha = .42;
  for (const c of r.cases) { ctx.fillStyle = FLOSS[c.f]?.hex ?? "#888"; ctx.fillRect(c.x * s, c.y * s, s, s); }
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.strokeStyle = "rgba(14,14,16,.2)"; ctx.lineWidth = .6;
  for (let k = -6; k <= r.w + 6; k++) { ctx.moveTo(k * s, -s * 6); ctx.lineTo(k * s, (r.h + 6) * s); }
  for (let k = -6; k <= r.h + 6; k++) { ctx.moveTo(-s * 6, k * s); ctx.lineTo((r.w + 6) * s, k * s); }
  ctx.stroke();
  ctx.beginPath(); ctx.strokeStyle = "rgba(14,14,16,.55)"; ctx.lineWidth = 1;
  for (let k = 0; k <= r.w; k += 10) { ctx.moveTo(k * s, 0); ctx.lineTo(k * s, r.h * s); }
  for (let k = 0; k <= r.h; k += 10) { ctx.moveTo(0, k * s); ctx.lineTo(r.w * s, k * s); }
  ctx.stroke();
  if (s >= 6) for (const c of r.cases) drawSymbol(ctx, symbole.get(c.f) ?? 0, c.x * s + s / 2, c.y * s + s / 2, s * .32, "#141210");
}

export default function RosaceUne({ titre, children }: { titre: string; children?: ReactNode }) {
  const toile = useRef<HTMLCanvasElement>(null), hote = useRef<HTMLDivElement>(null);
  const recette = useMemo(recetteChoisie, []);
  const rosace = useMemo(() => { const x = recetteDe(recette.code); return rosaceDe(x.signature, x.graine); }, [recette]);
  const reduit = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const cv = toile.current, el = hote.current, ctx = cv?.getContext?.("2d"); if (!cv || !el || !ctx) return;
    const dessous = document.createElement("canvas");
    let souris: { x: number; y: number } | null = null, image = 0, vivant = true, debut = 0, p = reduit ? 1 : 0, cote = 0, dpr = 1, pret = false;
    const place = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1); cote = cv.clientWidth;
      cv.width = dessous.width = Math.round(cote * dpr); cv.height = dessous.height = Math.round(cote * dpr);
      const s = cote / (rosace.w + 4), d = dessous.getContext("2d"); if (!d) return;
      d.setTransform(dpr, 0, 0, dpr, 0, 0); d.translate(s * 2, s * 2); patron(d, rosace, s); pret = true;
    };
    const dessiner = (t: number) => {
      image = 0; if (!vivant) return;
      if (!pret) place();
      if (!reduit && p < 1) { if (!debut) debut = t; p = lisse(0, 1, (t - debut) / 2600); }
      const s = cote / (rosace.w + 4);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(s * 2, s * 2);
      brodee(ctx, rosace, s, p);
      /* dessous, sous la souris : le patron, dans un cercle au bord flou */
      if (souris && p > .6) {
        const R = cote * .2, g = ctx.createRadialGradient(souris.x, souris.y, R * .3, souris.x, souris.y, R);
        g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
        const tmp = calque(); const c2 = tmp.getContext("2d");
        if (c2) {
          c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalCompositeOperation = "source-over"; c2.clearRect(0, 0, tmp.width, tmp.height); c2.drawImage(dessous, 0, 0);
          c2.setTransform(dpr, 0, 0, dpr, 0, 0); c2.globalCompositeOperation = "destination-in"; c2.fillStyle = g; c2.fillRect(0, 0, cote, cote); c2.globalCompositeOperation = "source-over";
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(tmp, 0, 0);
        }
      }
      if (p < 1) demander();
    };
    let cache: HTMLCanvasElement | null = null;
    const calque = () => { if (!cache || cache.width !== cv.width) { cache = document.createElement("canvas"); cache.width = cv.width; cache.height = cv.height; } return cache; };
    const demander = () => { if (!image) image = requestAnimationFrame(dessiner); };
    const bouge = (e: PointerEvent) => { if (e.pointerType === "touch" && !e.buttons) return; const r = cv.getBoundingClientRect(); souris = { x: e.clientX - r.left, y: e.clientY - r.top }; demander(); };
    const sort = () => { souris = null; demander(); };
    const redim = () => { pret = false; demander(); };
    el.addEventListener("pointermove", bouge); el.addEventListener("pointerdown", bouge); el.addEventListener("pointerleave", sort);
    window.addEventListener("resize", redim);
    demander();
    return () => { vivant = false; if (image) cancelAnimationFrame(image); el.removeEventListener("pointermove", bouge); el.removeEventListener("pointerdown", bouge); el.removeEventListener("pointerleave", sort); window.removeEventListener("resize", redim); };
  }, [rosace, reduit]);

  return <section className="ru" aria-labelledby="ru-titre">
    <div className="ru-texte">
      <h1 id="ru-titre">{titre}</h1>
      {children}
    </div>
    <div className="ru-scene" ref={hote}>
      <canvas ref={toile} className="ru-toile" role="img" aria-label={`Une rosace brodée aux fils DMC : « ${recette.nom} », un motif réel du moteur 5D de Point Zéro (${rosace.fils} fils, ${rosace.w} × ${rosace.h} points). Sous la souris, son patron apparaît.`} />
      <p className="ru-legende"><b>{recette.nom}</b> · {rosace.fils} fils DMC · {rosace.w} × {rosace.h} points<span> · passez la souris : le patron apparaît dessous</span></p>
    </div>
  </section>;
}

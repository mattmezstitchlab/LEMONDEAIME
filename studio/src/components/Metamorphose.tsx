import { useEffect, useRef, useState } from "react";
import { BASE_FLOSS, FLOSS, labOf, nearestFloss } from "../lib/dmc";
import { drawSymbol } from "../lib/symbols";

/**
 * La métamorphose : une peinture qui, au fil du défilement, devient pixels, puis points de croix, puis patron à symboles.
 * Les couleurs sont de vrais fils DMC (le moteur du studio), les symboles ceux des patrons exportés.
 * Sous la souris, un cercle au bord flou montre l'étape suivante : la peinture se brode là où l'on passe.
 * Moins d'animations demandées : l'image reste brodée, sans défilement piloté.
 */
export const ETAPES_META = ["La peinture", "Les pixels", "Le point de croix", "Le patron"] as const;

interface Grille { cols: number; rows: number; idx: Int16Array; palette: number[]; symbole: Map<number, number> }

/** La peinture réduite en cases, chaque case au fil DMC le plus proche ; au plus `maxFils` fils, comme un vrai patron. */
function grilleDe(img: HTMLImageElement, cols: number, maxFils = 28): Grille {
  const rows = Math.max(1, Math.round(cols * img.naturalHeight / img.naturalWidth));
  const c = document.createElement("canvas"); c.width = cols; c.height = rows;
  const x = c.getContext("2d", { willReadFrequently: true })!;
  x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, cols, rows);
  const px = x.getImageData(0, 0, cols, rows).data;
  const cache = new Map<number, number>(), idx = new Int16Array(cols * rows), compte = new Map<number, number>();
  /* le fond de la peinture reste toile libre : on ne brode que le sujet (les cases proches de la couleur des bords) */
  const bord: number[][] = [];
  for (let x = 0; x < cols; x++) for (const y of [0, rows - 1]) { const i = (y * cols + x) * 4; bord.push([px[i], px[i + 1], px[i + 2]]); }
  for (let y = 0; y < rows; y++) for (const x of [0, cols - 1]) { const i = (y * cols + x) * 4; bord.push([px[i], px[i + 1], px[i + 2]]); }
  const med = [0, 1, 2].map(k => bord.map(c => c[k]).sort((a, b) => a - b)[bord.length >> 1]);
  const lumMed = .3 * med[0] + .59 * med[1] + .11 * med[2];
  for (let i = 0; i < cols * rows; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2], cle = (r >> 3) << 10 | (g >> 3) << 5 | (b >> 3);
    const lum = .3 * r + .59 * g + .11 * b, sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (Math.hypot(r - med[0], g - med[1], b - med[2]) < 46 || (lum < lumMed + 34 && sat < 40) || (lum < 150 && sat < 42)) { idx[i] = -1; continue; }
    let f = cache.get(cle);
    if (f === undefined) { f = nearestFloss(labOf([r, g, b])); cache.set(cle, f); }
    idx[i] = f; compte.set(f, (compte.get(f) ?? 0) + 1);
  }
  const garde = [...compte.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxFils).map(e => e[0]);
  const vers = new Map<number, number>();
  for (const f of compte.keys()) vers.set(f, garde.includes(f) ? f : nearestFloss(FLOSS[f].lab, garde));
  for (let i = 0; i < idx.length; i++) if (idx[i] >= 0) idx[i] = vers.get(idx[i])!;
  const symbole = new Map<number, number>(); garde.forEach((f, n) => symbole.set(f, n));
  return { cols, rows, idx, palette: garde, symbole };
}

const lisse = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

export default function Metamorphose({ src, titre, children }: { src: string; titre: string; children?: React.ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const toile = useRef<HTMLCanvasElement>(null);
  const [etape, setEtape] = useState(0);
  const [progres, setProgres] = useState(0);
  const reduit = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = section.current, cv = toile.current, principal = cv?.getContext?.("2d");
    if (!el || !cv || !principal) return;
    /* le contexte où l'on dessine : la toile, ou le calque de la loupe le temps de dessiner l'étape suivante */
    let ctx: CanvasRenderingContext2D = principal;
    const calque = document.createElement("canvas");
    let img: HTMLImageElement | null = null, grille: Grille | null = null, souris: { x: number; y: number } | null = null, image = 0, vivant = true;
    const mini = document.createElement("canvas");
    const prog = () => { if (reduit) return .62; const r = el.getBoundingClientRect(), course = r.height - window.innerHeight; return course > 0 ? Math.min(1, Math.max(0, -r.top / course)) : 0; };

    /* une étape dessinée dans un rectangle « couverture » (comme background-size: cover) */
    /* le centre du sujet (les cases brodées), pour cadrer le téléphone dessus */
    let foyer: [number, number] | null = null;
    const centre = (): [number, number] => {
      if (foyer) return foyer; const g = grille; if (!g) return [.5, .5];
      let sx = 0, sy = 0, n = 0; for (let i = 0; i < g.idx.length; i++) if (g.idx[i] >= 0) { sx += i % g.cols; sy += Math.floor(i / g.cols); n++; }
      return foyer = n ? [(sx / n + .5) / g.cols, (sy / n + .5) / g.rows] : [.5, .5];
    };
    /* en portrait (téléphone), le tableau tient en largeur, un peu agrandi, au-dessus du texte : on voit toute la rose */
    const couvrir = (W: number, H: number) => { const nw = img!.naturalWidth, nh = img!.naturalHeight;
      if (W < H * .9) { const k = W * 1.9 / nw, w = nw * k, h = nh * k, [fx, fy] = centre(); return { x: W / 2 - w * fx, y: H * .3 - h * (fy - .5) - h / 2, w, h }; }
      const k = Math.max(W / nw, H / nh); const w = nw * k, h = nh * k; return { x: (W - w) / 2, y: (H - h) / 2, w, h }; };
    const peinture = (W: number, H: number, zoom: number) => { const r = couvrir(W, H); const w = r.w * zoom, h = r.h * zoom; ctx.fillStyle = "#121410"; ctx.fillRect(0, 0, W, H); ctx.imageSmoothingEnabled = true; ctx.drawImage(img!, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h); };
    const pixels = (W: number, H: number, t: number) => {
      const g = grille!, n = Math.max(4, Math.round(g.cols * (1 + (1 - t) * 10))), m = Math.round(n * g.rows / g.cols);
      mini.width = n; mini.height = m; const mx = mini.getContext("2d")!; mx.imageSmoothingQuality = "high"; mx.drawImage(img!, 0, 0, n, m);
      const r = couvrir(W, H); ctx.imageSmoothingEnabled = false; ctx.drawImage(mini, r.x, r.y, r.w, r.h);
    };
    /* les points de croix : la toile Aida, puis chaque case brodée au fil DMC, en vague depuis le centre */
    const croix = (W: number, H: number, t: number, symboles: number) => {
      const g = grille!, r = couvrir(W, H), s = r.w / g.cols;
      ctx.fillStyle = symboles > 0 ? `rgb(${Math.round(243 + 9 * symboles)},${Math.round(243 + 9 * symboles)},${Math.round(241 + 10 * symboles)})` : "#efeee9";
      ctx.fillRect(0, 0, W, H);
      // la trame de la toile
      ctx.strokeStyle = symboles > 0 ? `rgba(20,20,24,${.10 + .18 * symboles})` : "rgba(20,20,24,.08)"; ctx.lineWidth = 1; ctx.beginPath();
      for (let k = 0; k <= g.cols; k++) { const x = Math.round(r.x + k * s) + .5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let k = 0; k <= g.rows; k++) { const y = Math.round(r.y + k * s) + .5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
      if (symboles > 0) { ctx.strokeStyle = `rgba(20,20,24,${.35 * symboles})`; ctx.lineWidth = 1.4; ctx.beginPath();
        for (let k = 0; k <= g.cols; k += 10) { const x = Math.round(r.x + k * s) + .5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (let k = 0; k <= g.rows; k += 10) { const y = Math.round(r.y + k * s) + .5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke(); }
      const cx = g.cols / 2, cy = g.rows / 2, dmax = Math.hypot(cx, cy);
      const parFil = new Map<number, Path2D>(), ombres = new Path2D();
      const marge = s * .16;
      for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
        const d = Math.hypot(x - cx, y - cy) / dmax; if (d > t * 1.15) continue;
        const f = g.idx[y * g.cols + x], X = r.x + x * s, Y = r.y + y * s;
        if (f < 0) continue;
        if (X > W || Y > H || X + s < 0 || Y + s < 0) continue;
        let p = parFil.get(f); if (!p) parFil.set(f, p = new Path2D());
        if (symboles >= .98) { p.rect(X, Y, s, s); continue; }
        p.moveTo(X + marge, Y + marge); p.lineTo(X + s - marge, Y + s - marge); p.moveTo(X + s - marge, Y + marge); p.lineTo(X + marge, Y + s - marge);
        ombres.moveTo(X + marge, Y + marge + 1); ombres.lineTo(X + s - marge, Y + s - marge + 1);
      }
      if (symboles < .98) { ctx.lineCap = "round"; ctx.lineWidth = s * .3; ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.stroke(ombres); }
      for (const [f, p] of parFil) {
        const hex = FLOSS[f]?.hex ?? "#888";
        if (symboles >= .98) { ctx.fillStyle = hex; ctx.globalAlpha = .55; ctx.fill(p); ctx.globalAlpha = 1; continue; }
        ctx.lineCap = "round"; ctx.lineWidth = s * .3; ctx.strokeStyle = hex; ctx.globalAlpha = 1 - symboles * .5; ctx.stroke(p);
        ctx.lineWidth = s * .08; ctx.strokeStyle = "rgba(255,255,255,.28)"; ctx.stroke(p); ctx.globalAlpha = 1;
      }
      if (symboles > .2 && s >= 7) {
        ctx.globalAlpha = Math.min(1, (symboles - .2) / .6);
        for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
          const X = r.x + x * s, Y = r.y + y * s; if (X > W || Y > H || X + s < 0 || Y + s < 0) continue;
          const f = g.idx[y * g.cols + x]; if (f < 0) continue; drawSymbol(ctx, g.symbole.get(f) ?? 0, X + s / 2, Y + s / 2, s * .3, "#141210");
        }
        ctx.globalAlpha = 1;
      }
    };
    const scene = (W: number, H: number, p: number) => {
      if (!img || !grille) { ctx.fillStyle = "#121410"; ctx.fillRect(0, 0, W, H); return; }
      const a = lisse(.08, .32, p), b = lisse(.34, .6, p), c = lisse(.62, .9, p);
      if (b <= 0) { peinture(W, H, 1.06 - .06 * p / .32); if (a > 0) { ctx.globalAlpha = a; pixels(W, H, a); ctx.globalAlpha = 1; } }
      else if (c <= 0) { pixels(W, H, 1); ctx.globalAlpha = b; croix(W, H, b, 0); ctx.globalAlpha = 1; }
      else croix(W, H, 1, c);
    };
    const dessiner = () => {
      image = 0; if (!vivant) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const p = prog();
      scene(W, H, p);
      /* la loupe de la souris : l'étape suivante, dans un cercle au bord flou (aucun liseré) */
      if (souris && img && grille && !reduit && p < .9) {
        const R = Math.min(W, H) * .17, suivante = p < .32 ? .5 : p < .6 ? .8 : 1;
        if (calque.width !== cv.width || calque.height !== cv.height) { calque.width = cv.width; calque.height = cv.height; }
        const c2 = calque.getContext("2d");
        if (c2) {
          c2.setTransform(1, 0, 0, 1, 0, 0); c2.globalCompositeOperation = "source-over"; c2.clearRect(0, 0, calque.width, calque.height);
          c2.setTransform(dpr, 0, 0, dpr, 0, 0); ctx = c2; scene(W, H, suivante); ctx = principal;
          const fondu = c2.createRadialGradient(souris.x, souris.y, R * .35, souris.x, souris.y, R);
          fondu.addColorStop(0, "rgba(0,0,0,1)"); fondu.addColorStop(1, "rgba(0,0,0,0)");
          c2.globalCompositeOperation = "destination-in"; c2.fillStyle = fondu; c2.fillRect(0, 0, W, H); c2.globalCompositeOperation = "source-over";
          principal.save(); principal.setTransform(1, 0, 0, 1, 0, 0); principal.drawImage(calque, 0, 0); principal.restore();
        }
      }
      const e = p < .3 ? 0 : p < .58 ? 1 : p < .86 ? 2 : 3;
      setEtape(x => x === e ? x : e); setProgres(p);
    };
    const demander = () => { if (!image) image = requestAnimationFrame(dessiner); };
    const charger = new Image(); charger.decoding = "async"; charger.src = src;
    charger.onload = () => { if (!vivant) return; img = charger; const cols = window.innerWidth < 720 ? 64 : 104; grille = grilleDe(charger, cols); demander(); };
    const bouge = (ev: PointerEvent) => { if (ev.pointerType === "touch") return; const r = cv.getBoundingClientRect(); souris = { x: ev.clientX - r.left, y: ev.clientY - r.top }; demander(); };
    const sort = () => { souris = null; demander(); };
    window.addEventListener("scroll", demander, { passive: true }); window.addEventListener("resize", demander);
    cv.addEventListener("pointermove", bouge); cv.addEventListener("pointerleave", sort);
    demander();
    return () => { vivant = false; if (image) cancelAnimationFrame(image); window.removeEventListener("scroll", demander); window.removeEventListener("resize", demander); cv.removeEventListener("pointermove", bouge); cv.removeEventListener("pointerleave", sort); };
  }, [src, reduit]);

  return <section ref={section} className={"mm" + (reduit ? " mm-fixe" : "")} aria-labelledby="mm-titre">
    <div className="mm-scene">
      <canvas ref={toile} className="mm-toile" role="img" aria-label="Une peinture de roses qui devient pixels, puis points de croix aux fils DMC, puis patron à symboles, au fil du défilement" />
      <div className="mm-cadre" style={{ opacity: reduit ? 1 : 1 - lisse(.04, .16, progres), transform: `translateY(${-progres * 60}px)` }}>
        <h1 id="mm-titre">{titre}</h1>
        {children}
      </div>
      <ol className="mm-etapes" aria-label="Les quatre étapes">
        {ETAPES_META.map((nom, n) => <li key={nom} aria-current={etape === n ? "step" : undefined}><span>{["I", "II", "III", "IV"][n]}</span>{nom}</li>)}
      </ol>
      {!reduit && <p className="mm-defile" aria-hidden="true" style={{ opacity: 1 - lisse(.02, .1, progres) }}>Faites défiler : la peinture se brode</p>}
      <p className="mm-fils" aria-hidden="true" style={{ opacity: lisse(.5, .62, progres) }}>{BASE_FLOSS.length > 0 && "Fils DMC · couleurs réelles du nuancier"}</p>
    </div>
  </section>;
}

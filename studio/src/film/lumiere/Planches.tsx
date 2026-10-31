/**
 * LUMIERE — les planches de référence de la préproduction (route privée /one/lumiere/planches).
 * Rendues par les moteurs du film (shader, calque du Disque .0NE) en 3840 × 2160, sans texte : ce sont les images que
 * l'on joint aux générations vidéo pour que l'Orbe, le Disque, Gold et la prairie restent les mêmes d'un plan à l'autre.
 *   window.__planches.rendre("orbe" | "disque" | "gold" | "prairie") → une image PNG (data URL)
 */
import { useEffect, useState } from "react";
import { Rendu } from "./rendu";
import { sceneVoyage } from "./voyage";
import { sceneAtterrissage, sceneDisquePrepare, type Atterrissage } from "./atterrissage";
import type { Scene, Voyage } from "./partition";

const W = 3840, H = 2160;
type Fn = (t: number) => Scene;

/** une image du moteur, à la taille voulue (toile WebGL + calque) */
function image(l: number, h: number, f: Fn, t = 0, reel = 12, calqueSeul = false): HTMLCanvasElement {
  const a = document.createElement("canvas"), b = document.createElement("canvas"), out = document.createElement("canvas");
  const r = new Rendu(a, b, { qualite: 6, echelle: 1, atterrissage: true }); r.taille(l, h, 1); r.rendre(t, reel, f);
  out.width = l; out.height = h; const x = out.getContext("2d")!;
  if (!calqueSeul) x.drawImage(a, 0, 0, l, h); x.drawImage(b, 0, 0); r.detruire(); return out;
}
const avec = (base: Fn, change: (s: Scene) => void): Fn => t => { const s = base(t); change(s); return s; };
const att = (s: Scene) => (s.voyage as Voyage & { att: Atterrissage });

/* ——— 1. L'Orbe et ses transformations : lumière → Orbe → étoile → goutte → perle ——— */
function planOrbe() {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
  const lw = W / 5;
  const etats: Fn[] = [
    avec(sceneVoyage, s => { s.perle = { x: .5, y: .5, r: .006, eclat: 1, visible: 1 }; }),
    avec(sceneVoyage, s => { s.perle = { x: .5, y: .5, r: .2, eclat: 1, visible: 1 }; s.goutte = 0; }),
    avec(sceneVoyage, s => { s.perle = { x: .5, y: .5, r: .014, eclat: 1.3, visible: 1 }; s.goutte = 0; }),   /* l'étoile : dans la galaxie */
    sceneAtterrissage,   /* la « goutte » de lumière : l'Orbe ronde, nacrée, transparente, le monde inversé en elle */
    avec(sceneAtterrissage, s => { const v = att(s); v.altitude = .075; v.rDisque = .3 * (.3 / .075); }),
  ];
  const temps = [10, 60, 40, 196.5, 205];
  etats.forEach((f, i) => x.drawImage(image(lw, H, f, temps[i], 12), i * lw, 0));
  return c;
}

/* ——— 2. Le Disque exact (géométrie .0NE), perle éteinte : vue de dessus dans l'herbe, vue de dessus et vue rasante sur fond neutre ——— */
function planDisque() {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  x.fillStyle = "#d9d6cf"; x.fillRect(0, 0, W, H);
  const herbe = avec(sceneDisquePrepare, s => { const v = att(s); v.att.heure = 2.6; v.altitude = .3; v.rDisque = .3 * (.3 / .3); });
  x.drawImage(image(W / 2, H, herbe, 174, 12), 0, 0);
  /* sur fond neutre : le calque seul (le Disque et son ombre), en lumière de jour */
  const neutre = avec(sceneDisquePrepare, s => { const v = att(s); v.att.heure = 2.7; v.altitude = .3; v.rDisque = .42; });
  const dessus = image(W / 2, H / 2, neutre, 174, 12, true);
  x.drawImage(dessus, W / 2, 0);
  /* vue rasante : la même image, écrasée en perspective, avec l'épaisseur de la couronne */
  const cx = W * .75, cy = H * .76, k = .3, R = H / 2 * .5;
  const sombre = x.createRadialGradient(cx, cy + R * k * .9, R * .2, cx, cy + R * k * .9, R * 1.15);
  sombre.addColorStop(0, "rgba(0,0,0,.28)"); sombre.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = sombre;
  x.beginPath(); x.ellipse(cx, cy + R * k * .9, R * 1.15, R * k * 1.3, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#0b0b0b"; x.beginPath(); x.ellipse(cx, cy + R * .06, R, R * k, 0, 0, Math.PI); x.lineTo(cx - R, cy); x.ellipse(cx, cy, R, R * k, 0, Math.PI, 0, true); x.fill();
  x.save(); x.translate(cx, cy); x.scale(1, k); x.drawImage(dessus, -W / 4, -H / 4); x.restore();
  return c;
}

/* ——— 3. Gold : un cheval de lumière dorée (forme provisoire), au galop au-dessus de la mer de nuages ——— */
/* galop allongé, vu de profil, tourné vers la droite (unité : longueur du corps) ; lissé en courbes */
const SILHOUETTE: [number, number][] = [
  [1.18, .4], [1.16, .46], [1.1, .47], [1, .4], [.94, .42], [.86, .55], [.82, .66],
  [.86, .74], [.98, .8], [1.08, .86], [1.12, .9], [1.08, .92], [1, .86], [.92, .82], [.8, .76],
  [.76, .74], [.74, .8], [.7, .88], [.62, .86], [.58, .9], [.56, .86], [.63, .82], [.67, .78], [.68, .72],
  [.55, .7], [.38, .68],
  [.36, .72], [.42, .82], [.48, .92], [.52, .97], [.47, .98], [.42, .92], [.33, .85], [.28, .78],
  [.24, .8], [.16, .86], [.04, .92], [-.04, .95], [-.05, .91], [.04, .87], [.12, .81], [.12, .72],
  [.08, .58], [.1, .48], [.18, .42], [.4, .44], [.62, .4], [.76, .3], [.86, .22], [.94, .2], [.95, .13], [.98, .2], [1.06, .26], [1.16, .36],
];
function planGold() {
  const fond = image(W, H, avec(sceneVoyage, s => { s.perle = { x: .5, y: .62, r: .012, eclat: 1.1, visible: 1 }; }), 128, 20);
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  x.drawImage(fond, 0, 0);
  const S = H * .62, ox = W * .5 - S * .56, oy = H * -.02;
  const P = (p: [number, number]) => [ox + p[0] * S, oy + p[1] * S] as const;
  /* le contour lissé : des courbes passant par les milieux des segments */
  const chemin = new Path2D(), n = SILHOUETTE.length, m = (i: number) => { const [a, b] = P(SILHOUETTE[i % n]), [c2, d] = P(SILHOUETTE[(i + 1) % n]); return [(a + c2) / 2, (b + d) / 2]; };
  { const [a, b] = m(0); chemin.moveTo(a, b); for (let i = 1; i <= n; i++) { const [px, py] = P(SILHOUETTE[i % n]), [qx, qy] = m(i); chemin.quadraticCurveTo(px, py, qx, qy); } chemin.closePath(); }
  let g = 7; const alea = () => (g = (g * 16807) % 2147483647) / 2147483647;
  x.save(); x.globalCompositeOperation = "lighter";
  /* le corps : une lumière dorée diffuse, plus dense au cœur */
  x.filter = `blur(${S * .03}px)`; x.fillStyle = "rgba(255,178,80,.16)"; x.fill(chemin); x.filter = "none";
  /* la matière : des milliers de grains d'or dans la silhouette */
  for (let n = 0; n < 26000; n++) {
    const px = ox - .1 * S + alea() * S * 1.35, py = oy + alea() * S; if (!x.isPointInPath(chemin, px, py)) continue;
    const r = .6 + alea() * 2.2, a = .12 + alea() * .38;
    x.fillStyle = `rgba(255,${190 + alea() * 50 | 0},${110 + alea() * 80 | 0},${a})`; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  /* le contour : un trait de lumière fine */
  x.shadowColor = "rgba(255,190,100,.8)"; x.shadowBlur = S * .025; x.strokeStyle = "rgba(255,226,170,.38)"; x.lineWidth = S * .0016; x.stroke(chemin); x.shadowBlur = 0;
  /* la crinière et la queue : la lumière se défait en poussière d'or, vers l'arrière (le galop va vers la droite) */
  const flot = (x0: number, y0: number, dx: number, dy: number, n: number, ouverture: number) => {
    for (let i = 0; i < n; i++) {
      const u = alea(), [a, b] = P([x0 + dx * u + (alea() - .5) * ouverture * u, y0 + dy * u + (alea() - .5) * ouverture * u]);
      x.fillStyle = `rgba(255,${200 + alea() * 40 | 0},140,${(1 - u) * .7})`; x.beginPath(); x.arc(a, b, .5 + (1 - u) * 2.2, 0, Math.PI * 2); x.fill();
    }
  };
  for (let k = 0; k < 40; k++) { const u = alea(); flot(.62 + .32 * u, .4 - .2 * u + .02, -.34, -.1, 260, .3); }
  for (let k = 0; k < 30; k++) flot(.13, .46, -.5 - alea() * .2, -.04 + alea() * .22, 320, .3);
  x.restore();
  return c;
}

/* ——— 4. La prairie : nuit, aube, lever du soleil (le Disque toujours au même endroit) ——— */
function planPrairie() {
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  const heures = [1, 2, 3];
  heures.forEach((h, i) => x.drawImage(image(W / 3, H, avec(sceneDisquePrepare, s => { const v = att(s); v.att.heure = h; v.altitude = .55; v.rDisque = .3 * (.3 / .55); }), 174, 12), i * W / 3, 0));
  return c;
}

const PLANCHES = { orbe: planOrbe, disque: planDisque, gold: planGold, prairie: planPrairie } as const;

export default function Planches() {
  const [img, setImg] = useState("");
  useEffect(() => {
    (window as unknown as { __planches: unknown }).__planches = { rendre: (n: keyof typeof PLANCHES) => PLANCHES[n]().toDataURL("image/png") };
    const n = new URLSearchParams(window.location.search).get("p") as keyof typeof PLANCHES | null;
    if (n && PLANCHES[n]) setImg(PLANCHES[n]().toDataURL("image/jpeg", .92));
  }, []);
  return <main style={{ background: "#000", minHeight: "100vh" }} aria-label="LUMIERE, planches de référence">
    {img && <img src={img} alt="Planche de référence LUMIERE" style={{ width: "100%", display: "block" }} />}
    {/* sans planche choisie, la page n'est plus noire : elle dit ce qu'elle est et propose les quatre planches (rien n'est rendu avant le choix) */}
    {!new URLSearchParams(window.location.search).get("p") && <nav aria-label="Les planches" style={{ color: "#fff", padding: "12vh 24px", maxWidth: 640, margin: "0 auto", fontFamily: "inherit" }}>
      <p style={{ fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase", opacity: .7, margin: 0 }}>LUMIERE · préproduction</p>
      <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 600, margin: "8px 0 12px" }}>Les planches de référence</h1>
      <p style={{ opacity: .8, lineHeight: 1.5, margin: "0 0 20px" }}>Des images 3840 × 2160 rendues par les moteurs du film, à joindre aux générations vidéo. Le rendu prend quelques secondes.</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexWrap: "wrap", gap: 10 }}>
        {([["orbe", "L’Orbe"], ["disque", "Le Disque"], ["gold", "Gold"], ["prairie", "La prairie"]] as const).map(([k, l]) =>
          <li key={k}><a href={`?p=${k}`} style={{ display: "inline-flex", alignItems: "center", minHeight: 44, padding: "0 18px", borderRadius: 999, border: "1px solid rgba(255,255,255,.4)", color: "#fff", textDecoration: "none" }}>{l}</a></li>)}
      </ul>
    </nav>}
  </main>;
}

import { useEffect, useRef } from "react";
import { drawSymbol } from "../lib/symbols";

/**
 * La traîne de la souris : de petits points de croix et des symboles de patron naissent sous le pointeur, puis s'effacent.
 * Les couleurs sont des fils DMC (roses, verts, crème) ; jamais sur écran tactile ni quand l'appareil demande moins d'animations.
 */
const FILS = ["#BC4365", "#E48E9F", "#8C1D3F", "#5F7A3A", "#A9BF7E", "#C4416B", "#F3D7DC", "#3E5228"];
interface Grain { x: number; y: number; vx: number; vy: number; t: number; vie: number; c: string; s: number; forme: number; rot: number }

export default function TraineePoints() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv?.getContext?.("2d");
    if (!cv || !ctx) return;
    if (typeof window.matchMedia === "function" && (window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.matchMedia("(pointer: coarse)").matches)) return;
    const grains: Grain[] = [];
    let dernier: { x: number; y: number } | null = null, image = 0, n = 0;
    const taille = () => { const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    taille();
    const pas = () => {
      image = 0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const maintenant = performance.now();
      for (let i = grains.length - 1; i >= 0; i--) {
        const g = grains[i], age = (maintenant - g.t) / g.vie;
        if (age >= 1) { grains.splice(i, 1); continue; }
        const x = g.x + g.vx * age * 40, y = g.y + g.vy * age * 40 + age * age * 18;
        const e = age < .2 ? age / .2 : 1, s = g.s * (0.6 + .4 * e);
        ctx.globalAlpha = (1 - age) * .95;
        ctx.save(); ctx.translate(x, y); ctx.rotate(g.rot * age);
        if (g.forme < 0) {
          ctx.lineCap = "round"; ctx.lineWidth = s * .32; ctx.strokeStyle = g.c; ctx.beginPath();
          ctx.moveTo(-s / 2, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.moveTo(s / 2, -s / 2); ctx.lineTo(-s / 2, s / 2); ctx.stroke();
        } else drawSymbol(ctx, g.forme, 0, 0, s * .55, g.c);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (grains.length) image = requestAnimationFrame(pas);
    };
    const bouge = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const p = { x: e.clientX, y: e.clientY };
      if (dernier && Math.hypot(p.x - dernier.x, p.y - dernier.y) < 16) return;
      dernier = p; n++;
      grains.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * .8, vy: (Math.random() - .5) * .8, t: performance.now(), vie: 700 + Math.random() * 500, c: FILS[n % FILS.length], s: 9 + Math.random() * 7, forme: n % 3 === 0 ? (n * 7) % 24 : -1, rot: (Math.random() - .5) * 1.2 });
      if (grains.length > 90) grains.shift();
      if (!image) image = requestAnimationFrame(pas);
    };
    window.addEventListener("pointermove", bouge, { passive: true }); window.addEventListener("resize", taille);
    return () => { if (image) cancelAnimationFrame(image); window.removeEventListener("pointermove", bouge); window.removeEventListener("resize", taille); };
  }, []);
  return <canvas ref={ref} className="tp-traine" aria-hidden="true" />;
}

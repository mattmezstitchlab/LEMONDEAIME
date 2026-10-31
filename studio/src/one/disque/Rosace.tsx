/** Une rosace réelle du moteur 5D (le moteur n'est pas modifié : on lit son motif), dessinée point par point sur une toile de lin. */
import { useEffect, useRef } from "react";
import { FLOSS } from "../../lib/dmc";
import { recetteDe } from "../../lib/motif5d/recettes";
import { rosaceDe } from "../../components/edition/rosace";

export function rosaceDuCode(code: string) { const r = recetteDe(code); return rosaceDe(r.signature, r.graine); }

export default function Rosace({ code, taille, rond = true, etiquette }: { code: string; taille: number; rond?: boolean; etiquette: string }) {
  const toile = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = toile.current; if (!c) return;
    const r = rosaceDuCode(code), dpr = Math.min(2, window.devicePixelRatio || 1), T = Math.round(taille * dpr);
    c.width = T; c.height = T; const x = c.getContext("2d")!;
    x.fillStyle = "#f6f1e7"; x.fillRect(0, 0, T, T);
    /* la toile : une trame très légère */
    const s = Math.floor((T * (rond ? 0.78 : 0.94)) / Math.max(r.w, r.h)), ox = Math.round((T - s * r.w) / 2), oy = Math.round((T - s * r.h) / 2);
    x.strokeStyle = "rgba(120,100,70,.08)"; x.lineWidth = 1;
    for (let i = 0; i <= r.w; i++) { x.beginPath(); x.moveTo(ox + i * s + .5, oy); x.lineTo(ox + i * s + .5, oy + r.h * s); x.stroke(); }
    for (let j = 0; j <= r.h; j++) { x.beginPath(); x.moveTo(ox, oy + j * s + .5); x.lineTo(ox + r.w * s, oy + j * s + .5); x.stroke(); }
    /* les croix : le point du dessous, puis celui du dessus (léger relief) */
    const m = s * 0.16;
    for (const k of r.cases) {
      const hex = FLOSS[k.f]?.hex ?? "#888", px = ox + k.x * s, py = oy + k.y * s;
      x.lineCap = "round"; x.lineWidth = Math.max(1, s * 0.3);
      x.strokeStyle = hex; x.globalAlpha = .82; x.beginPath(); x.moveTo(px + m, py + s - m); x.lineTo(px + s - m, py + m); x.stroke();
      x.globalAlpha = 1; x.beginPath(); x.moveTo(px + m, py + m); x.lineTo(px + s - m, py + s - m); x.stroke();
    }
    x.globalAlpha = 1;
  }, [code, taille, rond]);
  return <canvas ref={toile} className="dq-rosace" role="img" aria-label={etiquette} style={{ width: taille, height: taille }} />;
}

import { useEffect, useMemo, useRef } from 'react';
import { FLOSS } from '../../studio/src/lib/dmc';
import type { Pattern } from '../../studio/src/lib/pattern';
import { visibilite, type CaseRosace } from '../../studio/src/components/edition/rosace';

/**
 * Présentations de pattern.cross, jamais une géométrie de remplacement.
 * La révélation réutilise les étapes de l'édition du Studio. Un fil sélectionné
 * n'est qu'un filtre visuel : il ne change ni les cases ni la recette.
 */
export default function ToileRosace({ pattern, etiquette, vue = 'croix', fil = null, progression = 1, marge = .94, className = '' }: {
  pattern: Pattern; etiquette: string; vue?: 'croix' | 'grille'; fil?: number | null;
  progression?: number; marge?: number; className?: string;
}) {
  const toile = useRef<HTMLCanvasElement>(null);
  const cases = useMemo(() => {
    const result: CaseRosace[] = [];
    const cx = (pattern.w - 1) / 2, cy = (pattern.h - 1) / 2, dmax = Math.hypot(cx, cy) || 1;
    for (let y = 0; y < pattern.h; y++) for (let x = 0; x < pattern.w; x++) {
      const f = pattern.cross[y * pattern.w + x]; if (f < 0) continue;
      const dx = x - cx, dy = y - cy, a = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
      result.push({ x, y, f, d: Math.hypot(dx, dy) / dmax, secteur: Math.floor(((a + 22.5) % 360) / 45) });
    }
    return result;
  }, [pattern]);

  useEffect(() => {
    const cv = toile.current; if (!cv) return;
    const dessiner = () => {
      const ctx = cv.getContext('2d'); if (!ctx) return;
      const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const s = Math.min(W / pattern.w, H / pattern.h) * marge;
      const ox = (W - pattern.w * s) / 2, oy = (H - pattern.h * s) / 2;
      if (vue === 'grille') { ctx.fillStyle = '#f8f5ec'; ctx.fillRect(ox, oy, pattern.w * s, pattern.h * s); }
      const chemins = new Map<string, Path2D>();
      for (const c of cases) {
        const visible = progression >= 1 ? 1 : visibilite(c, progression);
        if (visible <= .02) continue;
        const opacity = Math.round((fil === null || fil === c.f ? visible : visible * .14) * 5) / 5;
        if (!opacity) continue;
        const cle = `${c.f}|${opacity}`;
        let path = chemins.get(cle); if (!path) chemins.set(cle, (path = new Path2D()));
        const x = ox + c.x * s, y = oy + c.y * s;
        if (vue === 'grille') path.rect(x, y, s + .05, s + .05);
        else {
          const m = s * .16;
          path.moveTo(x + m, y + m); path.lineTo(x + s - m, y + s - m);
          path.moveTo(x + s - m, y + m); path.lineTo(x + m, y + s - m);
        }
      }
      ctx.lineCap = 'round';
      for (const [cle, path] of chemins) {
        const [idx, opacity] = cle.split('|').map(Number);
        ctx.globalAlpha = opacity;
        const color = FLOSS[idx]?.hex ?? '#777';
        if (vue === 'grille') { ctx.fillStyle = color; ctx.fill(path); }
        else {
          ctx.lineWidth = Math.max(.65, s * .38); ctx.strokeStyle = color; ctx.stroke(path);
          if (s >= 4) { ctx.lineWidth = Math.max(.35, s * .07); ctx.strokeStyle = 'rgba(255,255,255,.36)'; ctx.stroke(path); }
        }
      }
      ctx.globalAlpha = 1;
      if (vue === 'grille' && s >= 2) {
        ctx.lineWidth = .5; ctx.strokeStyle = 'rgba(54,46,39,.23)'; ctx.beginPath();
        for (let x = 0; x <= pattern.w; x++) { ctx.moveTo(ox + x * s, oy); ctx.lineTo(ox + x * s, oy + pattern.h * s); }
        for (let y = 0; y <= pattern.h; y++) { ctx.moveTo(ox, oy + y * s); ctx.lineTo(ox + pattern.w * s, oy + y * s); }
        ctx.stroke();
      }
    };
    dessiner();
    const observateur = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(dessiner);
    observateur?.observe(cv);
    window.addEventListener('resize', dessiner);
    return () => { observateur?.disconnect(); window.removeEventListener('resize', dessiner); };
  }, [pattern, cases, vue, fil, progression, marge]);

  return <canvas ref={toile} className={'ros-toile ' + className} role="img" aria-label={etiquette}
    data-empreinte={pattern.recette?.empreinte} data-vue={vue} data-progression={Math.round(progression * 100)} data-fil={fil === null ? 'tous' : FLOSS[fil]?.code} />;
}

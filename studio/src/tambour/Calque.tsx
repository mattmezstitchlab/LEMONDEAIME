/**
 * Le patron posé sur la toile filmée (Tambour vivant, lot B) : un calque transparent, mis en perspective par ses quatre coins.
 * Les coins se glissent à la souris ou au doigt, ou se règlent au clavier (Tab jusqu'au coin, puis les flèches ; Maj pour aller plus vite).
 * L'alignement est manuel : il tient tant que le téléphone ne bouge pas (posé, ou l'image figée). C'est une superposition à l'écran,
 * pas une projection lumineuse sur le tissu.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Pattern } from "../lib/pattern";
import { convexe, homographie, matrix3d, type Pt } from "../lib/tambour/homographie";
import { dessinerPatron, type OptionsSuperpose } from "../lib/tambour/superposition";

const NOMS = ["haut gauche", "haut droite", "bas droite", "bas gauche"];
const borne = (v: number) => Math.max(-.15, Math.min(1.15, v));

export default function Calque({ patron, options, opacite, coins, changer, dire }: {
  patron: Pattern; options: OptionsSuperpose; opacite: number; coins: Pt[]; changer: (q: Pt[]) => void; dire: (t: string) => void;
}) {
  const fenetre = useRef<HTMLDivElement>(null), toile = useRef<HTMLCanvasElement>(null);
  const [d, setD] = useState(0), [taille, setTaille] = useState({ w: 1, h: 1 });
  const glisse = useRef<number | null>(null);
  useEffect(() => {
    const el = fenetre.current; if (!el) return;
    const f = () => setD(el.clientWidth); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => { const c = toile.current; if (!c) return; dessinerPatron(patron, options, c); setTaille({ w: c.width, h: c.height }); }, [patron, options]);
  const transform = useMemo(() => {
    const h = homographie([{ x: 0, y: 0 }, { x: taille.w, y: 0 }, { x: taille.w, y: taille.h }, { x: 0, y: taille.h }], coins.map(p => ({ x: p.x * d, y: p.y * d })));
    return h ? matrix3d(h) : "none";
  }, [coins, d, taille]);

  /* un coin ne bouge que si le quadrilatère reste convexe (sinon le patron se retournerait) */
  const deplacer = (i: number, p: Pt) => { const q = coins.map((c, k) => (k === i ? { x: borne(p.x), y: borne(p.y) } : c)); if (convexe(q)) changer(q); };
  const versFraction = (e: React.PointerEvent) => { const r = fenetre.current!.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; };
  const clavier = (i: number, e: React.KeyboardEvent) => {
    const pas = e.shiftKey ? .02 : .002, dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const v = dir[e.key]; if (!v) return;
    e.preventDefault(); deplacer(i, { x: coins[i].x + v[0] * pas, y: coins[i].y + v[1] * pas });
  };

  return <>
    <div ref={fenetre} className="tb-calque-fenetre" aria-hidden="true">
      <canvas ref={toile} className="tb-calque" style={{ transform, opacity: opacite / 100, width: taille.w, height: taille.h }} />
    </div>
    <div className="tb-coins">
      {coins.map((p, i) => <button key={i} type="button" className="tb-coin" data-coin={i} style={{ left: p.x * d, top: p.y * d }}
        aria-label={`Coin ${NOMS[i]} du patron. Flèches pour le déplacer, Maj pour aller plus vite.`}
        onKeyDown={e => clavier(i, e)} onKeyUp={e => { if (e.key.startsWith("Arrow")) dire(`Coin ${NOMS[i]} déplacé.`); }}
        onPointerDown={e => { e.preventDefault(); glisse.current = i; e.currentTarget.setPointerCapture(e.pointerId); }}
        onPointerMove={e => { if (glisse.current === i) deplacer(i, versFraction(e)); }}
        onPointerUp={e => { if (glisse.current === i) { glisse.current = null; e.currentTarget.releasePointerCapture(e.pointerId); dire(`Coin ${NOMS[i]} posé.`); } }}
        onPointerCancel={() => { glisse.current = null; }}><span aria-hidden="true" /></button>)}
    </div>
  </>;
}

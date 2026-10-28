import { SYMBOLS, symbolFor } from "../lib/symbols";

/** Symbole de légende en SVG, généré depuis la même définition que la grille et le PDF. */
export default function SymbolIcon({ sym, color = "currentColor", size = 14 }: { sym: number; color?: string; size?: number }) {
  const prims = SYMBOLS[symbolFor(sym)];
  return (
    <svg viewBox="-1.25 -1.25 2.5 2.5" width={size} height={size} aria-hidden="true" className="shrink-0">
      {prims.map((p, i) => {
        if (p.t === "c")
          return <circle key={i} r={p.r} fill={p.f ? color : "none"} stroke={p.f ? "none" : color} strokeWidth={0.3} />;
        if (p.t === "r")
          return <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} fill={p.f ? color : "none"} stroke={p.f ? "none" : color} strokeWidth={0.3} />;
        if (p.t === "p")
          return (
            <polygon
              key={i}
              points={p.pts.map(([x, y]) => `${x},${y}`).join(" ")}
              fill={p.f ? color : "none"}
              stroke={p.f ? "none" : color}
              strokeWidth={0.3}
              strokeLinejoin="round"
            />
          );
        return (
          <path
            key={i}
            d={p.segs.map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join("")}
            stroke={color}
            strokeWidth={0.32}
            strokeLinecap="round"
            fill="none"
          />
        );
      })}
    </svg>
  );
}

import type { ReactNode } from "react";
import { CircleParking, Eraser, Grid3x3, Hand, Highlighter, Lasso, Move, PaintBucket, Pipette, Rows3, Scissors, Slash, Square, SquareDashed, StickyNote, Circle, ZoomIn } from "lucide-react";
import type { Tool } from "../lib/stitch";

/* Les pictos des outils : ceux que tout le monde reconnaît (main, gomme, pot de peinture, pipette…)
   et, pour les points, le dessin du point tel qu'il apparaît sur une grille de patron (une case, le point dedans). */
const S = 23;
function Case({ children }: { children: ReactNode }) {
  return <svg width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="1.5" strokeWidth="1.2" opacity=".35" />
    <path d="M12 3v18M3 12h18" strokeWidth=".8" opacity=".18" />
    {children}
  </svg>;
}
const POINTS: Partial<Record<Tool, ReactNode>> = {
  cross: <Case><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" strokeWidth="2.6" /></Case>,
  half: <Case><path d="M5.5 18.5l13-13" strokeWidth="2.6" /></Case>,
  quarter: <Case><path d="M5.5 18.5L12 12" strokeWidth="2.6" /></Case>,
  threeQuarter: <Case><path d="M5.5 18.5l13-13M5.5 5.5L12 12" strokeWidth="2.6" /></Case>,
  petite: <Case><path d="M5.5 13.5l5 5M10.5 13.5l-5 5" strokeWidth="2.2" /></Case>,
  bead: <Case><ellipse cx="12" cy="12" rx="4.2" ry="6" transform="rotate(-45 12 12)" strokeWidth="2" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></Case>,
  back: <Case><path d="M3 21V12h9V3h9" strokeWidth="2.4" /><circle cx="3" cy="21" r="1.4" fill="currentColor" stroke="none" /><circle cx="21" cy="3" r="1.4" fill="currentColor" stroke="none" /></Case>,
  knot: <Case><circle cx="12" cy="12" r="4.4" strokeWidth="2" /><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" /></Case>,
  long: <Case><path d="M3 21L21 3" strokeWidth="2.4" /><circle cx="3" cy="21" r="1.4" fill="currentColor" stroke="none" /><circle cx="21" cy="3" r="1.4" fill="currentColor" stroke="none" /></Case>,
};
const L = { size: S, strokeWidth: 1.9, "aria-hidden": true } as const;
const OUTILS: Partial<Record<Tool, ReactNode>> = {
  hand: <Hand {...L} />, erase: <Eraser {...L} />, fill: <PaintBucket {...L} />, pick: <Pipette {...L} />,
  select: <SquareDashed {...L} />, lasso: <Lasso {...L} />, move: <Move {...L} />,
  line: <Slash {...L} />, rect: <Square {...L} />, ellipse: <Circle {...L} />,
  mark: <Highlighter {...L} />, block: <Grid3x3 {...L} />, row: <Rows3 {...L} />, details: <ZoomIn {...L} />,
  park: <CircleParking {...L} />, unpick: <Scissors {...L} />, note: <StickyNote {...L} />,
};
export function ToolIcon({ tool }: { tool: Tool }) { return <>{POINTS[tool] ?? OUTILS[tool] ?? null}</>; }
export const aUnPicto = (tool: Tool) => tool in POINTS || tool in OUTILS;

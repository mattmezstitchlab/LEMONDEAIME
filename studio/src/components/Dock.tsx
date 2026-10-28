import { useEffect, useState, type ReactNode } from "react";
import {
  CircleDot,
  Ellipsis,
  Eraser,
  Hand,
  Highlighter,
  Lasso,
  Move,
  PaintBucket,
  Pipette,
  Scissors,
  ParkingCircle,
  Rows3,
  Grid2x2,
  Scan,
  CircleCheck,
  MessageSquare,
} from "lucide-react";
import { FLOSS } from "../lib/dmc";
import type { Tool } from "../lib/stitch";

interface ToolDef {
  id: Tool;
  label: string;
  key: string;
  icon: ReactNode;
}

const I = {
  viewBox: "0 0 24 24",
  width: 22,
  height: 22,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

const L = { width: 20, height: 20, strokeWidth: 1.9, "aria-hidden": true as const };

const TOOLS: ToolDef[][] = [
  [{ id: "hand", label: "Déplacer", key: "V", icon: <Hand {...{ width: 21, height: 21, strokeWidth: 1.9 }} aria-hidden /> }],
  [
    {
      id: "cross",
      label: "Point de croix",
      key: "X",
      icon: (
        <svg {...I}>
          <path d="M6 6l12 12M18 6L6 18" strokeWidth={2.1} />
        </svg>
      ),
    },
    {
      id: "half",
      label: "Demi-point",
      key: "D",
      icon: (
        <svg {...I}>
          <path d="M6 18L18 6" strokeWidth={2.1} />
          <path d="M6 6l12 12" strokeDasharray="1.5 3" opacity="0.45" />
        </svg>
      ),
    },
    {
      id: "quarter",
      label: "Quart de point",
      key: "Q",
      icon: (
        <svg {...I}>
          <path d="M5 5l7 7" strokeWidth={2.1} />
          <path d="M12 12L19 19" strokeDasharray="1.5 3" opacity="0.45" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: "back",
      label: "Point arrière",
      key: "R",
      icon: (
        <svg {...I}>
          <path d="M4 15 L10 9 L14 13 L20 7" />
          <circle cx="4" cy="15" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="20" cy="7" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    { id: "knot", label: "Noeud français", key: "K", icon: <CircleDot {...{ width: 21, height: 21, strokeWidth: 1.9 }} aria-hidden /> },
    {
      id: "long",
      label: "Point lancé",
      key: "L",
      icon: (
        <svg {...I}>
          <path d="M5 19L19 5" strokeWidth={3.2} />
        </svg>
      ),
    },
  ],
  [
    { id: "pick", label: "Pipette", key: "I", icon: <Pipette {...L} /> },
    { id: "fill", label: "Remplissage", key: "G", icon: <PaintBucket {...L} /> },
    { id: "erase", label: "Gomme", key: "E", icon: <Eraser {...L} /> },
    { id: "mark", label: "Surligner l'avancement", key: "M", icon: <Highlighter {...L} /> },
  ],
];

/**
 * Outils moins fréquents, derrière le bouton « plus ».
 *
 * Ils étaient tous accessibles, mais seulement depuis le panneau Projet : sans
 * raccourci et hors du dock, ils étaient de fait introuvables. Les chiffres les
 * distinguent des lettres déjà prises (T cycle l'affichage, P ouvre la palette
 * ou gare un fil, J coche un détail).
 */
const EXTRA_CREATE: ToolDef[] = [
  {
    id: "threeQuarter",
    label: "Trois-quarts de point",
    key: "1",
    icon: (
      <svg {...I}>
        <path d="M6 18L18 6" strokeWidth={2.1} />
        <path d="M5 5l6 6" strokeWidth={2.1} />
        <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "petite",
    label: "Petite croix",
    key: "2",
    icon: (
      <svg {...I}>
        <path d="M9 9l6 6M15 9l-6 6" strokeWidth={2.4} />
        <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" strokeDasharray="1.5 3" opacity="0.4" />
      </svg>
    ),
  },
  {
    id: "bead",
    label: "Perle",
    key: "3",
    icon: (
      <svg {...I}>
        <circle cx="12" cy="12" r="6.5" />
        <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "line",
    label: "Ligne de croix",
    key: "4",
    icon: (
      <svg {...I}>
        <path d="M4 20L20 4" />
        <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "rect",
    label: "Rectangle",
    key: "5",
    icon: (
      <svg {...I}>
        <rect x="4" y="7" width="16" height="10" rx="1.4" />
      </svg>
    ),
  },
  {
    id: "ellipse",
    label: "Ellipse",
    key: "6",
    icon: (
      <svg {...I}>
        <ellipse cx="12" cy="12" rx="8.5" ry="6.5" />
      </svg>
    ),
  },
  { id: "lasso", label: "Lasso", key: "7", icon: <Lasso {...L} /> },
  { id: "move", label: "Déplacer la sélection", key: "8", icon: <Move {...L} /> },
];

const EXTRA_STITCH: ToolDef[] = [
  { id: "details", label: "Cocher un contour ou un ornement", key: "J", icon: <CircleCheck {...L} /> },
  { id: "note", label: "Note sur la grille", key: "9", icon: <MessageSquare {...L} /> },
];

interface Props {
  tool: Tool;
  onTool: (t: Tool) => void;
  color: number;
  workspace: "create" | "stitch";
  /** Compatibilité avec les anciens tests de raccourcis. */
  coachTool?: Tool | null;
}

/** Dock flottant : vertical à gauche sur iPad paysage, horizontal en bas en portrait. */
export default function Dock({ tool, onTool, color, workspace, coachTool }: Props) {
  const hex = FLOSS[color]?.hex ?? "#000";
  const extra = workspace === "create" ? [...TOOLS[1].slice(1), ...EXTRA_CREATE] : EXTRA_STITCH;
  const [open, setOpen] = useState(false);
  // Un outil choisi depuis le panneau Projet doit devenir visible dans le dock,
  // sinon l'outil actif n'est nulle part à l'écran. Même exigence pour l'outil
  // que le guide est en train d'animer : un pictogramme qui pulse dans un groupe
  // replié ne guide personne.
  const activeIsExtra = extra.some((t) => t.id === tool);
  const coachIsExtra = !!coachTool && extra.some((t) => t.id === coachTool);
  useEffect(() => {
    if (activeIsExtra || coachIsExtra) setOpen(true);
  }, [activeIsExtra, coachIsExtra]);

  // Seulement les gestes les plus utilisés restent visibles.
  // Tous les autres outils restent accessibles sous « … ».
  const groups: ToolDef[][] = workspace === "create"
    ? [
        TOOLS[0],
        [
          TOOLS[1][0], // Point de croix
          TOOLS[2][1], // Remplissage
          TOOLS[2][2], // Gomme
          TOOLS[2][0], // Pipette
          { id: "select" as Tool, label: "Sélection", key: "S", icon: <Scan size={20} /> },
        ],
      ]
    : [
        TOOLS[0],
        [
          TOOLS[2][3], // Marquer
          { id: "block" as Tool, label: "Bloc 10 × 10", key: "B", icon: <Grid2x2 size={20} /> },
        ],
      ];
  if (open) groups.push(workspace === "create"
    ? [...TOOLS[1].slice(1), ...EXTRA_CREATE]
    : [
        TOOLS[2][0],
        { id: "row" as Tool, label: "Ligne", key: "H", icon: <Rows3 size={20} /> },
        { id: "park" as Tool, label: "Garer un fil", key: "P", icon: <ParkingCircle size={20} /> },
        { id: "unpick" as Tool, label: "À défaire", key: "U", icon: <Scissors size={20} /> },
        ...EXTRA_STITCH,
      ]);

  const button = (t: ToolDef) => (
    <div key={t.id} className="group relative">
      <button
        type="button"
        className="btn-tool"
        data-tool={t.id}
        data-coach={coachTool === t.id ? "on" : undefined}
        aria-pressed={tool === t.id}
        aria-label={`${t.label} (${t.key})`}
        title={`${t.label} · ${t.key}`}
        onClick={() => onTool(t.id)}
      >
        {t.icon}
      </button>
      <span
        aria-hidden="true"
        className="glass pointer-events-none absolute top-1/2 left-full z-40 ml-3 hidden -translate-y-1/2 translate-x-[-4px] items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[13px] whitespace-nowrap opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:flex"
      >
        {t.label}
        <span className="kbd">{t.key}</span>
      </span>
    </div>
  );

  return (
    <nav
      aria-label="Outils de broderie"
            className="glass no-scrollbar fixed bottom-[90px] left-1/2 z-30 flex max-w-[calc(100vw-20px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-md p-1 lg:top-1/2 lg:bottom-auto lg:left-4 lg:max-h-[calc(100dvh-190px)] lg:max-w-none lg:translate-x-0 lg:-translate-y-1/2 lg:flex-col lg:overflow-y-auto lg:p-1"
    >
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1 lg:flex-col">
          {gi > 0 && <span className="mx-1 h-6 w-px shrink-0 bg-white/12 lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden="true" />}
          {group.map(button)}
        </div>
      ))}

      <span className="mx-1 h-6 w-px shrink-0 bg-white/12 lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden="true" />

      <div className="group relative">
        <button
          type="button"
          className="btn-tool"
          aria-expanded={open}
          aria-label={open ? "Masquer les outils moins fréquents" : "Afficher les outils moins fréquents"}
          title={open ? "Masquer les outils moins fréquents" : "Outils moins fréquents : fractions, formes, sélection et notes"}
          onClick={() => setOpen((v) => !v)}
        >
          <Ellipsis width={20} height={20} strokeWidth={2.2} aria-hidden />
        </button>
        <span
          aria-hidden="true"
          className="glass pointer-events-none absolute top-1/2 left-full z-40 ml-3 hidden -translate-y-1/2 translate-x-[-4px] items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[13px] whitespace-nowrap opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 lg:flex"
        >
          {open ? "Masquer" : "Plus d'outils"}
        </span>
      </div>

      <span className="mx-1 h-6 w-px shrink-0 bg-white/12 lg:mx-0 lg:my-1 lg:h-px lg:w-6" aria-hidden="true" />
      <span
        className="h-[28px] w-[28px] shrink-0 rounded-[9px] ring-2 ring-white/20"
        style={{ background: hex, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.4)" }}
        aria-label={`Fil actif ${FLOSS[color]?.code ?? ""}`}
        title={`DMC ${FLOSS[color]?.code ?? ""}`}
      />
    </nav>
  );
}

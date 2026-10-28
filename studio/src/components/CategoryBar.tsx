import { Flower2, Palette, PencilRuler, Scissors } from "lucide-react";
export type AtelierCategory = "create" | "compose" | "threads" | "stitch";
const categories = [
  { id: "create", label: "Créer", Icon: Flower2 },
  { id: "compose", label: "Outils", Icon: PencilRuler },
  { id: "threads", label: "Fils", Icon: Palette },
  { id: "stitch", label: "Broder", Icon: Scissors },
] as const;
export default function CategoryBar({ active, onChoose, docked = false }: { active: AtelierCategory; onChoose: (category: AtelierCategory) => void; docked?: boolean }) {
  return <nav aria-label="Catégories de l'atelier" className={docked ? "pz-embroidery-categories grid shrink-0 grid-cols-2 gap-1 border-b border-white/10 bg-[#09090b] p-2 text-white" : "pz-surface pointer-events-auto fixed top-[64px] left-1/2 z-30 flex max-w-[calc(100vw-16px)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto p-1 text-white lg:top-[16px]"}>
    {categories.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={active === id} onClick={() => onChoose(id)}
      className={`flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-[var(--pz-radius-sm)] px-3 text-xs font-semibold transition-colors sm:px-4 ${active === id ? "bg-[var(--pz-brand)] text-[var(--pz-brand-ink)]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
      <Icon size={15} aria-hidden="true" /><span>{label}</span>
    </button>)}
  </nav>;
}

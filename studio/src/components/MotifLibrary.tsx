import { useEffect, useMemo, useState, useRef, type DragEvent } from "react";
import { FolderOpen, LibraryBig, Plus, Search, X } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import { MOTIF_PRESETS, PRESET_CATEGORIES, type PresetCategory } from "../lib/motifPresets";
import { getProject, listProjects, type ProjectRecord } from "../lib/library";
import { loadSubjectLibrary, openLibrarySubject, type LibrarySubject } from "../lib/subjectLibrary";
import type { Pattern } from "../lib/pattern";

export const MOTIF_DRAG_TYPE = "application/x-pointzero-motif";

/** Native cross-stitch preview, drawn from the same color indices as Canvas and PDF. */
export function StitchThumbnail({ pattern }: { pattern: Pattern }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const width = 108, height = 84;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#f8f4ee"; ctx.fillRect(0, 0, width, height);
    const cell = Math.min((width - 10) / pattern.w, (height - 10) / pattern.h);
    const ox = (width - pattern.w * cell) / 2, oy = (height - pattern.h * cell) / 2;
    for (let i = 0; i < pattern.cross.length; i++) {
      const idx = pattern.cross[i];
      if (idx < 0 || !FLOSS[idx]) continue;
      ctx.fillStyle = FLOSS[idx].hex;
      ctx.fillRect(ox + i % pattern.w * cell, oy + Math.floor(i / pattern.w) * cell, Math.max(1, cell), Math.max(1, cell));
    }
    for (const line of pattern.back) {
      ctx.beginPath(); ctx.strokeStyle = FLOSS[line.c]?.hex ?? "#463e32";
      ctx.lineWidth = Math.max(1, cell / 4);
      ctx.moveTo(ox + line.x1 * cell, oy + line.y1 * cell);
      ctx.lineTo(ox + line.x2 * cell, oy + line.y2 * cell); ctx.stroke();
    }
  }, [pattern]);
  return <canvas width={108} height={84} ref={canvas} aria-hidden="true" className="block h-[84px] w-full object-contain [image-rendering:pixelated]" />;
}

interface Props {
  onAdd: (id: string) => void;
  onAddSaved: (sprite: Pattern) => void;
  onOpenProject: (pattern: Pattern) => void;
  onBlank: () => void;
  onOpenLibrary: () => void;
  readOnly?: boolean;
  docked?: boolean;
}
export default function MotifLibrary({ onAdd, onAddSaved, onOpenProject, onBlank, onOpenLibrary, readOnly = false, docked = false }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"motifs" | "projets">("motifs");
  const [category, setCategory] = useState<PresetCategory | "Tout">("Tout");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<LibrarySubject[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [message, setMessage] = useState("");
  const patterns = useMemo(() => MOTIF_PRESETS.map(entry => ({ ...entry, pattern: entry.make() })), []);
  const refresh = () => {
    setSaved(loadSubjectLibrary());
    void listProjects().then(items => setProjects(items.sort((a, b) => b.updated - a.updated))).catch(() => setMessage("Projets locaux indisponibles."));
  };
  useEffect(() => { refresh(); }, [tab]);
  const closeOnMobile = () => { if (window.matchMedia?.("(max-width: 1023px)")?.matches) setOpen(false); };
  const filtered = patterns.filter(p =>
    (category === "Tout" || p.category === category) && p.name.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr").trim()));
  const drag = (event: DragEvent<HTMLButtonElement>, id: string) => {
    if (readOnly) { event.preventDefault(); return; }
    event.dataTransfer.setData(MOTIF_DRAG_TYPE, id);
    event.dataTransfer.effectAllowed = "copy";
  };
  return <>
    {!docked && <button type="button" onClick={() => setOpen(o => !o)}
      className="pz-surface fixed left-3 top-[73px] z-30 flex h-10 items-center gap-2 px-3 text-xs font-semibold text-white lg:hidden"
      aria-label={open ? "Fermer la bibliothèque de motifs" : "Ouvrir la bibliothèque de motifs"}>
      <LibraryBig size={16}/> Motifs
    </button>}
    <aside aria-label="Bibliothèque de motifs" className={docked ? "pz-motif-library-docked flex min-h-0 flex-1 flex-col overflow-hidden bg-[#09090b] text-white" : `pz-surface pz-motif-library fixed bottom-3 left-3 top-[74px] z-40 flex w-[252px] flex-col overflow-hidden text-white lg:z-20 ${open ? "is-open" : ""}`}>
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold"><LibraryBig size={16}/> Bibliothèque</h2>
        <button type="button" className={docked ? "hidden" : "grid size-8 place-items-center rounded-[5px] text-white/75 hover:bg-white/10 lg:hidden"} onClick={() => setOpen(false)} aria-label="Fermer la bibliothèque"><X size={17}/></button>
        <button type="button" className={docked ? "grid size-8 place-items-center rounded-[5px] text-white/75 hover:bg-white/10" : "hidden size-8 place-items-center rounded-[5px] text-white/75 hover:bg-white/10 lg:grid"} aria-label="Bibliothèque de projets avancée" onClick={onOpenLibrary}><FolderOpen size={17}/></button>
      </div>
      <div className="grid grid-cols-2 gap-1 border-b border-white/10 p-2">
        <button type="button" onClick={() => setTab("motifs")} aria-pressed={tab === "motifs"} className={`min-h-9 rounded-[var(--pz-radius-sm)] text-xs font-semibold ${tab === "motifs" ? "bg-[var(--pz-brand)] text-[var(--pz-brand-ink)]" : "text-white/75 hover:bg-white/10"}`}>Motifs</button>
        <button type="button" onClick={() => setTab("projets")} aria-pressed={tab === "projets"} className={`min-h-9 rounded-[var(--pz-radius-sm)] text-xs font-semibold ${tab === "projets" ? "bg-[var(--pz-brand)] text-[var(--pz-brand-ink)]" : "text-white/75 hover:bg-white/10"}`}>Projets</button>
      </div>
      {tab === "motifs" ? <>
        <div className="border-b border-white/10 p-3">
          <label className="relative block"><span className="sr-only">Rechercher des motifs</span>
            <Search size={15} className="pointer-events-none absolute left-2.5 top-2.5 text-white/65"/>
            <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher…" className="w-full rounded-[5px] border border-white/20 bg-white/10 py-2 pl-8 pr-2 text-xs text-white placeholder:text-white/60"/>
          </label>
          <div className="mt-2 flex gap-1 overflow-x-auto pb-1 no-scrollbar" aria-label="Catégories de motifs">
            {(["Tout", ...PRESET_CATEGORIES] as const).map(item=><button key={item} aria-pressed={category===item} onClick={() => setCategory(item)} className={`shrink-0 rounded-[var(--pz-pill)] px-2.5 py-1.5 text-[10px] font-medium ${category===item ? "bg-[var(--pz-brand)] text-[var(--pz-brand-ink)]" : "bg-white/10 text-white/75"}`}>{item}</button>)}
          </div>
        </div>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-2">
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(item => <button type="button" key={item.id} draggable={!readOnly} onDragStart={e => drag(e,item.id)}
              onClick={() => { onAdd(item.id); closeOnMobile(); }} disabled={readOnly}
              className="group min-w-0 overflow-hidden rounded-[6px] border border-white/15 bg-white/[.06] text-left transition-colors hover:border-white/50 hover:bg-white/10 disabled:opacity-40"
              aria-label={`Ajouter ${item.name}`} title="Cliquer pour ajouter • Glisser sur la grille pour placer">
              <div className="bg-[#f8f4ee]"><StitchThumbnail pattern={item.pattern}/></div>
              <span className="block truncate px-2 py-2 text-[11px] font-medium text-white">{item.name}</span>
            </button>)}
          </div>
          {filtered.length === 0 && <p className="px-2 py-4 text-center text-xs text-white/65">Aucun motif trouvé.</p>}
          {saved.length > 0 && <div className="mt-4 border-t border-white/10 pt-3">
            <h3 className="mb-2 text-xs font-semibold">Mes motifs</h3>
            <div className="grid grid-cols-2 gap-2">{saved.map(item => {
              let pattern: Pattern | null = null;
              try { pattern = openLibrarySubject(item); } catch { /* Keep other saved items accessible. */ }
              return pattern && <button key={item.id} type="button" disabled={readOnly} onClick={() => { onAddSaved(pattern!); closeOnMobile(); }} className="overflow-hidden rounded-[5px] border border-white/15 text-left">
                <div className="bg-[#f8f4ee]"><StitchThumbnail pattern={pattern}/></div><span className="block truncate px-2 py-2 text-[11px]">{item.name}</span>
              </button>;
            })}</div>
          </div>}
        </div>
      </> : <>
        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto p-3">
          <button type="button" className="mb-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-[5px] bg-white text-xs font-semibold text-black" onClick={() => { onBlank(); closeOnMobile(); }}><Plus size={15}/> Nouveau projet</button>
          {projects.map(item => <button type="button" key={item.id} className="flex w-full flex-col rounded-[5px] border-b border-white/10 px-2 py-3 text-left hover:bg-white/10" onClick={() => {
            const pattern = getProject(item); if (pattern) { onOpenProject(pattern); closeOnMobile(); } else setMessage("Projet introuvable.");
          }}><span className="truncate text-xs font-semibold">{item.name}</span>
            <span className="mt-1 text-[11px] text-white/60">{item.w} × {item.h} points</span></button>)}
          {!projects.length && <p className="py-4 text-xs text-white/65">Vos projets sauvegardés apparaîtront ici.</p>}
          {message && <p role="status" className="mt-3 text-xs text-white/80">{message}</p>}
        </div>
      </>}
      <p className="border-t border-white/10 px-3 py-2 text-[10px] text-white/65">Cliquer pour ajouter · glisser pour placer</p>
    </aside>
  </>;
}

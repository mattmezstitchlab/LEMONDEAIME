import { useMemo } from "react";
import { FolderOpen, Settings2, Layers3 } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import { computeStats, type Pattern } from "../lib/pattern";
import CompositionProperties from "./CompositionProperties";
import type { SubjectLayer, SubjectScene } from "../lib/subjectEngine";

interface Props {
  pattern: Pattern;
  activeColor: number;
  onSettings: () => void;
  onBrowse: () => void;
  workspace: "create" | "stitch";
  scene: SubjectScene | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Pick<SubjectLayer, "x" | "y" | "scale" | "visible" | "tint">>) => void;
  onReorder: (id: string, delta: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
}

/**
 * Le panneau droit décrit l'objet sélectionné et ses propriétés.
 * Les outils de dessin ont été déplacés à gauche, l'affichage reste dans TopBar,
 * et les contrôles détaillés sont affichés ici via WorkspacePanel inline.
 */
export default function EmbroideryInspector(props: Props) {
  const stats = useMemo(() => computeStats(props.pattern).totals, [props.pattern]);
  return <div className="flex min-h-0 flex-col text-white">
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-4">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold"><Layers3 size={16}/> Propriétés du motif</h2>
      <span className="text-[10px] text-white/50">{props.workspace === "stitch" ? "Suivi" : "Création"}</span>
    </header>
    <div className="space-y-4 px-4 py-4">
      <section aria-label="Informations du patron">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[.08em] text-white/65">Document</h3>
        <p className="mb-3 truncate text-[12px] text-white/80" title={props.pattern.name}>{props.pattern.name}</p>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-[5px] border border-white/10 bg-[#1b1b1e] p-3">
            <span className="block text-white/60">Grille</span>
            <strong className="mt-1 block text-[14px] font-semibold">{props.pattern.w} × {props.pattern.h}</strong>
          </div>
          <div className="rounded-[5px] border border-white/10 bg-[#1b1b1e] p-3">
            <span className="block text-white/60">Fils DMC</span>
            <strong className="mt-1 block text-[14px] font-semibold">{props.pattern.palette.length}</strong>
          </div>
        </div>
        <button type="button" onClick={props.onBrowse} aria-label="Rechercher ou ajouter une couleur DMC"
          className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-[5px] border border-white/15 px-3 text-left text-xs text-white/85 hover:bg-white/10">
          <span className="size-5 shrink-0 rounded-[4px] border border-white/40" style={{background:FLOSS[props.activeColor]?.hex??"#fff"}}/>
          <span className="min-w-0 flex-1 truncate">Fil actif · DMC {FLOSS[props.activeColor]?.code??"—"}</span><FolderOpen size={14}/>
        </button>
        {props.workspace==="stitch" && <p className="mt-3 text-[11px] text-white/65">{stats.doneCells.toLocaleString("fr-FR")} case(s) terminée(s)</p>}
      </section>
    </div>
    <CompositionProperties docked scene={props.scene} selectedId={props.selectedId} onSelect={props.onSelect}
      onChange={props.onChange} onReorder={props.onReorder} onDuplicate={props.onDuplicate} onRemove={props.onRemove} readOnly={props.readOnly}/>
    <div className="border-t border-white/10 p-3">
      <button type="button" onClick={props.onSettings}
        className="flex min-h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-white/20 text-xs text-white/75 hover:bg-white/10">
        <Settings2 size={14}/> Réglages du projet
      </button>
    </div>
  </div>;
}

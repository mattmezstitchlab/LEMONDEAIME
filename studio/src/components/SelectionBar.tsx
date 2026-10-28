import { ClipboardPaste, Copy, FlipHorizontal, FlipVertical, Move, RotateCw, Trash2, X } from "lucide-react";
import type { Selection } from "../lib/editing";
export default function SelectionBar({ selection, hasClipboard, onAction }: { selection: Selection; hasClipboard: boolean; onAction: (action: string) => void }) {
  const actions = [{ id: "copy", icon: Copy, label: "Copier" }, { id: "paste", icon: ClipboardPaste, label: "Coller" }, { id: "move", icon: Move, label: "Déplacer" }, { id: "rotate", icon: RotateCw, label: "Pivoter de 90 degrés" }, { id: "flipX", icon: FlipHorizontal, label: "Retourner horizontalement" }, { id: "flipY", icon: FlipVertical, label: "Retourner verticalement" }, { id: "delete", icon: Trash2, label: "Effacer la sélection" }];
  return <div className="glass no-scrollbar fixed left-1/2 top-[78px] z-30 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-[16px] p-1.5">
    <span className="shrink-0 px-2 font-mono text-[11px] text-label-2">{selection.w} × {selection.h}</span>
    {actions.map(({ id, icon: Icon, label }) => <button key={id} type="button" className="btn-icon shrink-0" title={label} aria-label={label} disabled={id === "paste" && !hasClipboard} onClick={() => onAction(id)}><Icon size={17} /></button>)}
    <button type="button" className="btn-icon shrink-0" onClick={() => onAction("close")} aria-label="Fermer la sélection"><X size={17} /></button>
  </div>;
}
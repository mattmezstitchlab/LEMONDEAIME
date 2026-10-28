import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Layers, Trash2 } from "lucide-react";
import { FLOSS, flossIndex } from "../lib/dmc";
import { spriteForExport, type SubjectLayer, type SubjectScene } from "../lib/subjectEngine";
const CODES = ["321", "603", "819", "725", "700", "703", "738", "801", "310", "828"];
interface Props {
  scene: SubjectScene | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<Pick<SubjectLayer, "x" | "y" | "scale" | "visible" | "tint">>) => void;
  onReorder: (id: string, delta: number) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  readOnly?: boolean;
  docked?: boolean;
}
export default function CompositionProperties({ scene, selectedId, onSelect, onChange, onReorder, onDuplicate, onRemove, readOnly = false, docked = false }: Props) {
  const layers = scene?.layers ?? [];
  const selected = layers.find(item => item.id === selectedId);
  if (!layers.length) return null;
  const sprite = selected ? spriteForExport(selected) : null;
  const field = "w-full rounded-[5px] border border-white/20 bg-[#212124] px-2 py-2 text-[12px] text-white";
  return <aside aria-label="Propriétés du motif" className={docked ? "pz-properties-docked min-h-0 border-b border-white/10 text-white" : "pz-surface pz-properties fixed right-3 top-[75px] z-20 flex max-h-[calc(100dvh-150px)] w-[210px] flex-col overflow-hidden text-white"}>
    <header className="flex items-center gap-2 border-b border-white/10 px-3 py-3 text-xs font-semibold"><Layers size={15}/> Composition <span className="ml-auto text-[10px] font-normal text-white/55">{layers.length}/16</span></header>
    <div className="thin-scroll min-h-0 overflow-y-auto p-3">
      {selected && sprite ? <>
        <h3 className="mb-3 truncate text-[13px] font-semibold">{selected.name}</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-white/75">X
            <input aria-label="Position X" disabled={readOnly} type="number" className={field+" mt-1"} value={selected.x} onChange={e => onChange(selected.id,{x:Number(e.target.value)})}/>
          </label>
          <label className="text-[11px] text-white/75">Y
            <input aria-label="Position Y" disabled={readOnly} type="number" className={field+" mt-1"} value={selected.y} onChange={e => onChange(selected.id,{y:Number(e.target.value)})}/>
          </label>
        </div>
        <label className="mt-3 block text-[11px] text-white/75">Taille · {Math.round(selected.scale*100)} %
          <input aria-label="Taille du motif" disabled={readOnly} type="range" min="25" max="300" step="25" value={Math.round(selected.scale*100)} onChange={e => onChange(selected.id,{scale:Number(e.target.value)/100})} className="mt-2 w-full accent-white"/>
        </label>
        <p className="mt-1 text-[10px] text-white/55">{Math.round(sprite.w*selected.scale)} × {Math.round(sprite.h*selected.scale)} points</p>
        <label className="mt-3 block text-[11px] text-white/75">Couleurs
          <select aria-label="Couleur dominante du motif" disabled={readOnly} className={field+" mt-1"} value={selected.tint ?? ""} onChange={e => onChange(selected.id,{tint:e.target.value})}>
            <option value="">Originales</option>
            {CODES.filter(code => flossIndex(code)>=0).map(code => <option key={code} value={code}>DMC {code} · {FLOSS[flossIndex(code)]?.name}</option>)}
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button disabled={readOnly} className="flex min-h-9 items-center justify-center gap-1 rounded-[5px] border border-white/20 text-[11px] hover:bg-white/10" aria-label="Placer derrière" onClick={()=>onReorder(selected.id,-1)}><ArrowDown size={13}/> Arrière</button>
          <button disabled={readOnly} className="flex min-h-9 items-center justify-center gap-1 rounded-[5px] border border-white/20 text-[11px] hover:bg-white/10" aria-label="Placer devant" onClick={()=>onReorder(selected.id,1)}><ArrowUp size={13}/> Avant</button>
          <button disabled={readOnly} className="flex min-h-9 items-center justify-center gap-1 rounded-[5px] border border-white/20 text-[11px] hover:bg-white/10" onClick={()=>onDuplicate(selected.id)}><Copy size={13}/> Copier</button>
          <button disabled={readOnly} className="flex min-h-9 items-center justify-center gap-1 rounded-[5px] border border-white/20 text-[11px] hover:bg-white/10" onClick={()=>onRemove(selected.id)}><Trash2 size={13}/> Retirer</button>
        </div>
      </> : <p className="text-[11px] text-white/65">Sélectionnez un motif sur la grille.</p>}
      <div className="mt-4 border-t border-white/10 pt-2" aria-label="Calques de composition">
        {[...layers].reverse().map(layer => <button key={layer.id} type="button" aria-pressed={selectedId === layer.id} onClick={()=>onSelect(layer.id)}
          className={`flex min-h-9 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[11px] ${selectedId === layer.id ? "bg-white text-black" : "text-white/75 hover:bg-white/10"}`}>
          {layer.visible ? <Eye size={13}/> : <EyeOff size={13}/>}
          <span className="min-w-0 flex-1 truncate">{layer.name}</span>
        </button>)}
      </div>
    </div>
  </aside>;
}

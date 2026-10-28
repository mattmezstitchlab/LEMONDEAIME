import type { InterfaceLevel } from "../lib/interfaceLevel";
import { useMemo } from "react";
import { CheckSquare, Circle, Eraser, Hand, PaintBucket, Pencil, Pipette, Scan, Rows3, Scissors, Minus, Plus } from "lucide-react";
import type { Tool } from "../lib/stitch";

interface Props {
  level?: InterfaceLevel;
  tool: Tool;
  onTool: (tool: Tool) => void;
  workspace: "create" | "stitch";
  expanded: boolean;
  onToggleExpanded: () => void;
  readOnly?: boolean;
}

/**
 * Les gestes appartiennent à la gauche (navigation/outils), jamais à l'inspecteur de droite.
 * Un seul sélecteur d'outil persistant remplace les raccourcis concurrents.
 */
const createBasics = [
  ["hand","Main",Hand],["cross","Croix",Pencil],["erase","Gomme",Eraser],
  ["fill","Remplir",PaintBucket],["pick","Pipette",Pipette],["select","Sélection",Scan],
] as const;
const createMore = [
  ["half","Demi-point"],["quarter","Quart"],["threeQuarter","3/4"],
  ["petite","Petite croix"],["bead","Perle"],["back","Arrière"],
  ["knot","Nœud"],["long","Lancé"],["line","Ligne"],
  ["rect","Rectangle"],["ellipse","Ellipse"],["lasso","Lasso"],["move","Déplacer"],
] as const;
const stitchBasics = [
  ["hand","Main",Hand],["mark","Marquer",CheckSquare],["block","Bloc 10×10",Rows3],
  ["row","Ligne",Scissors],["pick","Pipette",Pipette],["details","Détails",Circle],
] as const;
const stitchMore = [["park","Parking"],["unpick","À défaire"],["note","Note"]] as const;

export default function EmbroideryToolbox({ tool,onTool,workspace,level="intermediate",expanded,onToggleExpanded,readOnly=false }:Props){
  const allBasics = workspace==="stitch" ? stitchBasics : createBasics;
  const basics = level === "beginner" ? allBasics.filter(([id]) => ["hand","cross","erase","pick","mark"].includes(id) || id === tool) : allBasics;
  const more = useMemo(()=>workspace==="stitch" ? stitchMore : createMore,[workspace]);
  const visibleMore = expanded || more.some(([id]) => id === tool);
  return <section aria-label="Outils de broderie" className="pz-toolbox-chrome shrink-0 border-b border-white/10 px-3 pb-3 pt-3 text-white">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[11px] font-semibold uppercase tracking-[.08em] text-white/65">{workspace==="stitch"?"Outils de suivi":"Outils de dessin"}</h2>
      
    </div>
    <div className="pz-tool-rail grid grid-cols-2 gap-1.5">
      {basics.map(([id,name,Icon])=><button key={id} type="button" aria-pressed={tool===id}
        disabled={readOnly&&id!=="hand"} title={name} onClick={()=>onTool(id)}
        className={`pz-tool-control flex min-h-[44px] flex-col items-center justify-center gap-1 border p-1 text-[11px] transition-colors disabled:opacity-40 ${tool===id?"border-white bg-white text-black":"border-white/15 bg-white/[.04] text-white/80 hover:bg-white/10"}`}>
        <Icon size={18} aria-hidden="true"/><span className="sr-only">{name}</span>
      </button>)}
    </div>
    <button type="button" aria-expanded={visibleMore} onClick={onToggleExpanded}
      className="pz-tool-control mt-2 flex min-h-10 w-full items-center justify-between border border-white/15 px-2 text-left text-[11px] text-white/75 hover:bg-white/10">
      <span>{visibleMore?"Masquer les outils avancés":"Afficher tous les outils"}</span>{visibleMore?<Minus size={14}/>:<Plus size={14}/>}
    </button>
    {level === "beginner" && <div className="mt-2 flex flex-wrap gap-1" aria-label="Autres outils courants">
      {expanded && allBasics.filter(([id]) => !basics.some(([shown]) => shown === id)).map(([id,name]) => <button type="button" key={id} disabled={readOnly} onClick={() => onTool(id)} className="pz-tool-control min-h-10 border border-white/20 px-2 text-xs">{name}</button>)}
    </div>}
    {visibleMore&&<div className="mt-2 grid grid-cols-2 gap-1" aria-label="Outils avancés">
      {more.map(([id,name])=><button key={id} type="button" aria-pressed={tool===id}
        disabled={readOnly} onClick={()=>onTool(id as Tool)}
        className={`pz-tool-control min-h-10 border px-2 py-1 text-left text-[11px] disabled:opacity-40 ${tool===id?"border-white bg-white text-black":"border-white/15 text-white/75 hover:bg-white/10"}`}>{name}</button>)}
    </div>}
    
  </section>;
}

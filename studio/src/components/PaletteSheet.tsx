import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BASE_FLOSS, contrastOn, FLOSS } from "../lib/dmc";
import { assignedSymbol, computeStats, type Pattern } from "../lib/pattern";
import Sheet from "./Sheet";
import SymbolIcon from "./SymbolIcon";

interface Props {
  open: boolean;
  onClose: () => void;
  pattern: Pattern;
  color: number;
  onPick: (idx: number) => void;
}

/** Nuancier DMC documenté : recherche par code ou nom et filtre des fils du motif. */
export default function PaletteSheet({ open, onClose, pattern, color, onPick }: Props) {
  const [q, setQ] = useState("");
  const [onlyUsed, setOnlyUsed] = useState(false);

  const usage = useMemo(() => {
    const m = new Map<number, number>();
    for (const r of computeStats(pattern).rows) m.set(r.idx, r.cross + r.half + r.quarter + r.knots);
    return m;
  }, [pattern]);

  const term = q.trim().toLowerCase();
  const list = FLOSS.map((f, idx) => ({ f, idx })).filter(
    ({ f, idx }) =>
      (!onlyUsed || usage.has(idx)) && (!term || f.code.toLowerCase().includes(term) || f.name.toLowerCase().includes(term)),
  );

  const active = FLOSS[color];
  const activePos = pattern.palette.includes(color) ? assignedSymbol(pattern, color) : -1;

  return (
    <Sheet open={open} onClose={onClose} title="Nuancier DMC" subtitle={`${BASE_FLOSS.length} références numériques documentées · teintes indicatives`}>
      <div className="mb-3 flex items-center gap-3 rounded-[16px] bg-white/[0.06] p-3">
        <span className="swatch h-12 w-12 rounded-[12px]" style={{ background: active?.hex }} />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-label-3">Fil actif</p>
          <p className="font-mono text-[17px] font-semibold tracking-tight">DMC {active?.code}</p>
          <p className="truncate text-[13px] text-label-2">{active?.name}</p>
        </div>
        {activePos >= 0 && (
          <div className="flex flex-col items-center gap-1 text-label-2">
            <SymbolIcon sym={activePos} size={22} color={active?.hex} />
            <span className="text-[10px] tracking-wide uppercase">Symbole</span>
          </div>
        )}
      </div>

      <div className="mb-3 space-y-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-label-3" aria-hidden="true" />
          <input
            type="search"
            className="field pl-9"
            placeholder="Code ou nom (ex. 310, rose)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher un fil DMC"
            enterKeyHint="search"
          />
        </div>
        <div className="seg" role="group" aria-label="Filtre">
          <button type="button" aria-pressed={!onlyUsed} onClick={() => setOnlyUsed(false)}>
            Tous les fils
          </button>
          <button type="button" aria-pressed={onlyUsed} onClick={() => setOnlyUsed(true)}>
            Dans le motif ({usage.size})
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[15px] font-medium">Aucun fil trouvé</p>
          <p className="mt-1 text-[13px] text-label-3">Essayez un autre code ou nom.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-6 gap-1.5 rounded-[16px] bg-white/[0.035] p-2" aria-label="Nuancier DMC">
          {list.map(({ f, idx }) => {
            const isActive = idx === color;
            const n = usage.get(idx);
            const pos = pattern.palette.includes(idx) ? assignedSymbol(pattern, idx) : -1;
            return (
              <li key={f.code} className="min-w-0">
                <button
                  type="button"
                  className={`group/color flex w-full flex-col items-center gap-1 rounded-[10px] p-1 transition-colors hover:bg-white/[0.08] active:scale-95 ${
                    isActive ? "bg-accent/20 ring-1 ring-accent" : ""
                  }`}
                  aria-pressed={isActive}
                  aria-label={`DMC ${f.code}, ${f.name}${n ? `, ${n} points dans le motif` : ""}`}
                  title={`DMC ${f.code} · ${f.name}`}
                  onClick={() => onPick(idx)}
                >
                  <span
                    className="relative grid aspect-square w-full place-items-center rounded-[8px] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.35)]"
                    style={{ background: f.hex }}
                  >
                    {pos >= 0 && <SymbolIcon sym={pos} size={14} color={contrastOn(f.hex)} />}
                    {n ? <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white ring-1 ring-black/30" /> : null}
                  </span>
                  <span className="max-w-full truncate font-mono text-[9px] leading-none text-label-2">{f.code}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 px-1 text-[12px] leading-relaxed text-label-3">
        Chaque fil ajouté au motif reçoit un symbole vectoriel propre, conservé dans le projet — le même
        symbole apparaît sur la grille, dans la légende et dans le PDF exporté. Données couleur : craft-color-codes par MakeBead,
        CC BY 4.0.
      </p>
    </Sheet>
  );
}

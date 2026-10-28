import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, Search, X } from "lucide-react";
import { GLASS_LABEL, beadByCode, deltaELabel, loadBeads, nearestBeads, type BeadPalette } from "../lib/beads";
import { contrastOn, FLOSS } from "../lib/dmc";
import { assignedSymbol, computeStats, type ColorStat, type Pattern, type Supply } from "../lib/pattern";
import { SYMBOL_COUNT } from "../lib/symbols";
import SymbolIcon from "./SymbolIcon";

interface Props {
  pattern: Pattern;
  active: number;
  onActive: (idx: number) => void;
  onPattern: (pattern: Pattern) => void;
  onBrowse: () => void;
  stitching: boolean;
  hidden?: boolean;
  fullWidth?: boolean;
  onSupply?: (code: string, supply: Supply) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Palette de projet compacte : chaque carré combine couleur, symbole, stock et état.
 * Les 489 DMC ne sont affichés que dans le sélecteur de recherche, sur demande.
 */
export default function FlossRail({ pattern, active, onActive, onPattern, onBrowse, stitching, hidden, fullWidth = false, onSupply }: Props) {
  // Compter les points parcourt toutes les cases du motif. Pendant un trait de
  // stylet le rail est redescendu à chaque échantillon : sur un grand motif, ce
  // recomptage prenait le pas sur le dessin. La valeur différée laisse React
  // sauter les étapes intermédiaires et rattraper son retard dès que le trait se
  // pose. Les compteurs peuvent donc avoir un temps de retard pendant le tracé,
  // ce qui est préférable à un atelier qui ne répond plus.
  const counted = useDeferredValue(pattern);
  const stats = useMemo(() => {
    const used = computeStats(counted).rows;
    return counted.palette.map((idx): ColorStat => used.find((r) => r.idx === idx) ?? { idx, code: FLOSS[idx].code, name: FLOSS[idx].name, hex: FLOSS[idx].hex, pos: assignedSymbol(counted, idx), cross: 0, half: 0, quarter: 0, back: 0, long: 0, knots: 0, cells: 0, done: 0, meters: 0, skeins: 0, owned: counted.supplies?.[FLOSS[idx].code]?.whole ?? 0, petite: 0, beads: 0 });
  }, [counted]);
  const [filter, setFilter] = useState<"project" | "used" | "stock" | "missing">("project");
  const [detail, setDetail] = useState<number | null>(null);
  const [choosingSymbol, setChoosingSymbol] = useState(false);
  const row = detail === null ? null : stats.find((r) => r.idx === detail) ?? null;
  const displayed = stats.filter(s => {
    if (filter === "used") return s.cells > 0;
    if (filter === "stock") return s.owned > 0;
    if (filter === "missing") return s.cells > 0 && s.owned < s.skeins;
    return true;
  });

  useEffect(() => {
    const show = (e: Event) => { const idx = (e as CustomEvent<{ idx: number | null }>).detail.idx; setDetail(idx); setChoosingSymbol(false); };
    window.addEventListener("pointzero:floss", show);
    return () => window.removeEventListener("pointzero:floss", show);
  }, []);

  const supply = (code: string): Supply => pattern.supplies?.[code] ?? { whole: pattern.stock[code] ?? 0, partialMeters: 0, lot: "" };
  const stock = (code: string, value: Supply) => {
    if (onSupply) onSupply(code, value);
    else onPattern({ ...pattern, supplies: { ...pattern.supplies, [code]: value } });
  };

  if (hidden) return null;

  return (
    <>
      <aside
        className={fullWidth ? "pz-embroidery-dmc fixed inset-x-0 bottom-0 z-30 flex h-[94px] flex-col border-t border-white/15 bg-[#09090b] pb-[env(safe-area-inset-bottom)] text-white" :
        "pz-surface no-scrollbar fixed right-3 bottom-[max(12px,env(safe-area-inset-bottom))] left-3 z-30 flex h-[64px] items-center gap-2 overflow-x-auto p-2 lg:right-auto lg:bottom-3 lg:left-1/2 lg:max-w-[min(760px,calc(100vw-260px))] lg:-translate-x-1/2"}
        aria-label="Fils du motif"
        data-guide="floss"
      >
        {fullWidth && <div className="flex h-[35px] shrink-0 items-center gap-3 border-b border-white/10 px-3">
          <h2 className="shrink-0 text-[11px] font-semibold tracking-wide">Fils DMC <span className="font-normal text-white/55">{stats.length}</span></h2>
          <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto" role="group" aria-label="Filtres des fils DMC">
            {([["project","Projet"],["used","Utilisés"],["stock","En stock"],["missing","Manquants"]] as const).map(([id,label])=>
              <button key={id} type="button" aria-pressed={filter===id} onClick={()=>setFilter(id)}
                className={`shrink-0 rounded-[4px] px-2 py-1 text-[10px] font-medium ${filter===id ? "bg-white text-black" : "text-white/65 hover:bg-white/10"}`}>{label}</button>)}
          </div>
        </div>}
        <div className={fullWidth ? "no-scrollbar flex min-h-0 flex-1 items-center gap-3 overflow-x-auto px-3 py-1.5" : "contents"}>
        <button
          type="button"
          onClick={onBrowse}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] border border-white/25 bg-white/10 text-white transition-transform hover:bg-white/20 active:scale-90"
          aria-label="Ajouter ou rechercher un fil DMC"
          title="Ajouter un fil DMC"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <span className="mx-0.5 h-6 w-px shrink-0 bg-white/12" />

        {displayed.map((s) => {
          const selected = s.idx === active;
          const enough = s.owned >= s.skeins;
          const progress = s.cells > 0 ? Math.round((s.done / s.cells) * 100) : 0;
          return (
            <button
              key={s.idx}
              type="button"
              onClick={() => {
                onActive(s.idx);
                setDetail((v) => (v === s.idx ? null : s.idx));
              }}
              className={`relative grid h-9 w-12 shrink-0 place-items-center rounded-[5px] transition-all active:scale-90 ${selected ? "ring-2 ring-white ring-offset-1 ring-offset-[#09090b]" : "ring-1 ring-white/20"}`}
              style={{ background: s.hex }}
              aria-label={`DMC ${s.code}, ${s.name}, ${s.owned} sur ${s.skeins} écheveaux en stock`}
              title={`DMC ${s.code} · ${s.name}${stitching ? ` · ${s.cells - s.done} éléments restants` : ""}`}
            >
              <SymbolIcon sym={s.pos} size={15} color={contrastOn(s.hex)} />
              <span className="absolute -bottom-2 rounded-[4px] bg-[#09090b] px-1 font-mono text-[9px] text-white/85">{FLOSS[s.idx].blend ? "Mix" : s.code}</span>
              <span
                className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#242426] ${enough ? "bg-ok" : "bg-warn"}`}
                aria-hidden="true"
              />
              {stitching && (
                <span className="absolute right-1 bottom-0.5 left-1 h-[2px] overflow-hidden rounded-full bg-black/25" aria-hidden="true">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
                </span>
              )}
            </button>
          );
        })}

        {displayed.length === 0 && (
          <button type="button" onClick={onBrowse} className="flex items-center gap-2 text-[11px] text-white/70" aria-label="Rechercher un fil">
            <Search className="h-4 w-4" /> {stats.length ? "Aucun fil dans ce filtre" : "Ajouter une couleur DMC"}
          </button>
        )}
        </div>
      </aside>

      {row && (
        <section
          className={fullWidth ? "pz-surface thin-scroll fixed bottom-[168px] right-3 z-40 max-h-[min(55dvh,500px)] w-[min(310px,calc(100vw-24px))] overflow-y-auto p-4" : "pz-surface thin-scroll fixed right-3 bottom-[160px] z-40 max-h-[calc(100dvh-250px)] w-[300px] overflow-y-auto p-4 lg:right-auto lg:bottom-[88px] lg:left-1/2 lg:max-h-[calc(100dvh-180px)] lg:-translate-x-1/2"}
          aria-label={`Informations DMC ${row.code}`}
        >
          <button type="button" onClick={() => setDetail(null)} className="btn-icon absolute top-2 right-2 h-8 w-8 rounded-full bg-white/[0.07]" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[13px] ring-1 ring-black/30" style={{ background: row.hex }}>
              <SymbolIcon sym={row.pos} size={22} color={contrastOn(row.hex)} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[15px] font-semibold">{FLOSS[row.idx].blend ? "Mélange de fils" : `DMC ${row.code}`}</p>
              <p className="truncate text-[13px] text-label-2">{row.name}</p>
            </div>
          </div>

          <div className={`mt-4 grid gap-2 text-center ${stitching ? "grid-cols-4" : "grid-cols-3"}`}>
            <Info value={String(row.cells)} label="éléments" />
            {stitching && <Info value={String(Math.max(0, row.cells - row.done))} label="à broder" />}
            <Info value={`${fmt(row.meters)} m`} label="brins simples" />
            <Info value={String(row.skeins)} label="écheveaux" />
          </div>

          {stitching && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-label-3">
                <span>Progression de cette couleur</span>
                <span className="font-mono tabular-nums">{row.cells ? Math.round((row.done / row.cells) * 100) : 0} %</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full bg-ok transition-[width] duration-300" style={{ width: `${row.cells ? (row.done / row.cells) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          {(FLOSS[row.idx].blend ?? [{ code: row.code, strands: 1 }]).map((part) => {
            const value = supply(part.code), total = FLOSS[row.idx].blend?.reduce((n, v) => n + v.strands, 0) ?? 1;
            const needed = row.meters * part.strands / total, available = (value.whole * 8 + value.partialMeters) * 6, missing = Math.max(0, Math.ceil((needed - available) / 48));
            return <div key={part.code} className="mt-3 border-t border-white/10 pt-3">
              <div className="flex items-center justify-between"><div><p className="text-[12px] font-medium">Stock DMC {part.code}</p><p className={`text-[10px] ${missing ? "text-warn" : "text-ok"}`}>{missing ? `${missing} écheveau(x) à prévoir` : "Quantité estimée disponible"}</p></div><div className="stepper"><button type="button" onClick={() => stock(part.code, { ...value, whole: Math.max(0, value.whole - 1) })} disabled={!value.whole} aria-label="Retirer un écheveau"><Minus size={13} /></button><span>{value.whole}</span><button type="button" onClick={() => stock(part.code, { ...value, whole: value.whole + 1 })} aria-label="Ajouter un écheveau"><Plus size={13} /></button></div></div>
              <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[10px] text-label-3">Mètres partiels, 6 brins<input className="field mt-1 h-9 text-[12px]" type="number" min={0} max={800} step={.1} value={value.partialMeters} onChange={(e) => stock(part.code, { ...value, partialMeters: Math.max(0, +e.target.value) })} /></label><label className="text-[10px] text-label-3">Lot de teinture<input className="field mt-1 h-9 text-[12px]" value={value.lot} placeholder="Facultatif" onChange={(e) => stock(part.code, { ...value, lot: e.target.value })} /></label></div>
            </div>;
          })}
          {(row.beads > 0 || pattern.beadMap?.[row.code]) && (
            <BeadBlock
              code={row.code}
              lab={FLOSS[row.idx].lab}
              beads={row.beads}
              value={pattern.beadMap?.[row.code]}
              onPick={(ref) => {
                const map = { ...(pattern.beadMap ?? {}) };
                if (ref) map[row.code] = ref;
                else delete map[row.code];
                onPattern({ ...pattern, beadMap: Object.keys(map).length ? map : undefined });
              }}
            />
          )}

          <button className="mt-3 text-[12px] text-accent-2" type="button" onClick={() => setChoosingSymbol(!choosingSymbol)}>Personnaliser le symbole</button>
          {choosingSymbol && <div className="mt-2 grid max-h-[150px] grid-cols-8 gap-1 overflow-auto">{Array.from({ length: SYMBOL_COUNT }, (_, symbol) => <button key={symbol} className={`grid h-7 place-items-center rounded-[5px] ${row.pos === symbol ? "bg-accent" : "bg-white/[.06]"}`} title={`Symbole ${symbol + 1}`} onClick={() => { const other = pattern.palette.find((c) => c !== row.idx && assignedSymbol(pattern, c) === symbol); const map = { ...pattern.symbolMap, [row.code]: symbol }; if (other !== undefined) map[FLOSS[other].code] = row.pos; onPattern({ ...pattern, symbolMap: map }); setChoosingSymbol(false); }}><SymbolIcon sym={symbol} size={13} /></button>)}</div>}

          <button
            type="button"
            onClick={() => onActive(row.idx)}
            className="btn-tinted mt-3 w-full"
            disabled={active === row.idx}
          >
            {active === row.idx && <Check className="h-4 w-4" />}
            {active === row.idx ? "Fil actif" : "Utiliser ce fil"}
          </button>
        </section>
      )}
    </>
  );
}

function Info({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[11px] bg-white/[0.06] px-1 py-2">
      <p className="font-mono text-[13px] font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-label-3">{label}</p>
    </div>
  );
}

/**
 * Référence de perle fabricant pour une couleur du motif.
 *
 * L'atelier sait dessiner et suivre des perles depuis le début, mais ne savait
 * pas les nommer : la référence devait être recopiée à la main dans les notes.
 * La table Miyuki Delica 11/0 (1 288 références, statut « measured ») vient de
 * craft-color-codes, déjà en dépendance pour le DMC, et n'est chargée que si le
 * motif porte vraiment des perles de cette couleur.
 *
 * L'écart de teinte est affiché tel quel, jamais arrondi à une correspondance
 * exacte : la source mesure la moyenne sRGB de la photo produit officielle et,
 * comparée à deux jeux de données indépendants, la famille de couleur tombe
 * juste sur tous les codes mais la teinte diffère de 6 à 12 ΔE00 en médiane.
 * C'est la bonne perle, pas la bonne teinte — et les perles métallisées,
 * galvanisées, AB ou silver-lined ne peuvent pas être une couleur plate.
 */
function BeadBlock({ code, lab, beads, value, onPick }: {
  code: string;
  lab: [number, number, number];
  beads: number;
  value?: string;
  onPick: (reference: string | null) => void;
}) {
  const [palette, setPalette] = useState<BeadPalette | null>(null);
  const [failed, setFailed] = useState(false);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    let live = true;
    loadBeads()
      .then((p) => { if (live) setPalette(p); })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const chosen = palette && value ? beadByCode(palette.colors, value) : undefined;
  // Une référence choisie ouvre sur ses substituts disponibles ; sans
  // référence, on part de la couleur du fil.
  const proposals = palette
    ? chosen
      ? nearestBeads(chosen.lab, palette.colors, 3).filter((b) => b.code !== chosen.code)
      : nearestBeads(lab, palette.colors, 3)
    : [];
  const typedBead = palette ? beadByCode(palette.colors, typed) : undefined;
  const beadLabel = (b: { code: string; name: string; glass?: string }) =>
    `${b.code} · ${b.name}${b.glass ? ` · ${GLASS_LABEL[b.glass] ?? b.glass}` : ""}`;

  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-medium">Perles Miyuki Delica 11/0</p>
          <p className="text-[10px] text-label-3">
            {beads > 0 ? `${beads} perle(s) de cette couleur dans le motif` : "Référence prévue pour ce fil"}
          </p>
        </div>
        {value && (
          <button
            type="button"
            className="shrink-0 text-[11px] text-label-3 underline"
            aria-label={`Retirer la référence de perle du DMC ${code}`}
            onClick={() => onPick(null)}
          >
            Retirer
          </button>
        )}
      </div>

      {!palette && !failed && <p className="mt-2 text-[11px] text-label-3">Chargement des 1 288 références…</p>}
      {failed && (
        <p className="mt-2 text-[11px] text-warn">
          Table des perles indisponible. Une référence exacte peut quand même être saisie ci-dessous.
        </p>
      )}

      {chosen && (
        <div className="mt-2 flex items-center gap-2 rounded-[10px] bg-white/[0.06] p-2">
          <span className="h-7 w-7 shrink-0 rounded-full ring-1 ring-black/30" style={{ background: chosen.hex }} aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-mono text-[12px] font-semibold">{chosen.code}</p>
            <p className="truncate text-[10px] text-label-3">{chosen.name}{chosen.glass ? ` · ${GLASS_LABEL[chosen.glass] ?? chosen.glass}` : ""}</p>
          </div>
          {chosen.discontinued && (
            <span className="ml-auto shrink-0 rounded-[6px] bg-warn/20 px-1.5 py-0.5 text-[9px] text-warn">arrêtée</span>
          )}
        </div>
      )}

      {proposals.length > 0 && (
        <>
          <p className="mt-2 text-[10px] text-label-3">
            {chosen ? "Remplaçantes disponibles les plus proches" : "Les plus proches de ce fil"}
          </p>
          <div className="mt-1 grid gap-1">
            {proposals.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => onPick(b.code)}
                className="flex items-center gap-2 rounded-[9px] bg-white/[0.04] p-1.5 text-left transition-colors hover:bg-white/[0.09]"
                aria-label={`Choisir la perle ${beadLabel(b)}, écart ${b.deltaE.toFixed(1)} (${deltaELabel(b.deltaE)})`}
              >
                <span className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/30" style={{ background: b.hex }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px]">{b.code}</span>
                  <span className="block truncate text-[10px] text-label-3">{b.name}{b.glass ? ` · ${GLASS_LABEL[b.glass] ?? b.glass}` : ""}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-[10px] tabular-nums">ΔE {b.deltaE.toFixed(1)}</span>
                  <span className="block text-[9px] text-label-3">{deltaELabel(b.deltaE)}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <label className="mt-2 block text-[10px] text-label-3" htmlFor={`perle-${code}`}>
        Référence exacte
        <span className="mt-1 flex gap-1">
          <input
            id={`perle-${code}`}
            className="field h-9 min-w-0 flex-1 font-mono text-[12px]"
            value={typed}
            placeholder="DB0361"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button type="button" className="btn-tinted h-9 shrink-0 px-3 text-[12px]" disabled={!typedBead} onClick={() => { if (typedBead) { onPick(typedBead.code); setTyped(""); } }}>
            Choisir
          </button>
        </span>
      </label>
      {typed.trim() && palette && !typedBead && (
        <p className="mt-1 text-[10px] text-warn">Référence absente de la table Miyuki Delica.</p>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-label-3">
        Teinte approchée, à confirmer sur carte physique : la couleur est la moyenne sRGB de la photo
        produit Miyuki, et l'écart médian avec deux jeux de données indépendants est de 6 à 12 ΔE00.
        Les références métallisées, galvanisées, AB et silver-lined ne sont pas une couleur plate.
        La référence choisie est reprise dans la légende du SVG et sur la page perles du PDF.
        Données : craft-color-codes (MakeBead), CC BY 4.0.
      </p>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Ban, Download, Eye, FileCode2, FileJson, Image, Rows3, ShoppingBag, VectorSquare } from "lucide-react";
import { buildPdf, PdfAborted, pdfFileName, type PdfOptions } from "../lib/pdf";
import { assignedSymbol, compositePattern, computeStats, fabricInfo, type Pattern } from "../lib/pattern";
import { contrastOn, FLOSS } from "../lib/dmc";
import { drawSymbol } from "../lib/symbols";
import { patternToSvg } from "../lib/svg";
import { downloadBlob, saveProjectFile, slugify } from "../lib/io";
import { downloadOxs } from "../lib/oxs";
import { shoppingList } from "../lib/library";
import { deltaELabel } from "../lib/colorScience";
import {
  equivalencesCsv,
  equivalents,
  equivalenceWarning,
  FAR_DELTA_E,
  PALETTE_CHOICES,
  STATUS_LABEL,
  type EquivalenceTable,
  type PaletteId,
} from "../lib/palettes";
import Sheet from "./Sheet";

const Q_CORNER: [number, number][] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/** Aperçu raster du motif, dans le même langage visuel que le PDF et le SVG. */
function renderPng(pattern: Pattern): Promise<Blob | null> {
  const p = compositePattern(pattern);
  const c = document.createElement("canvas");
  const scale = Math.min(14, Math.max(2, 3600 / Math.max(p.w, p.h)));
  c.width = Math.ceil(p.w * scale);
  c.height = Math.ceil(p.h * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = p.fabric?.color ?? "#faf6ed";
  ctx.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < p.cross.length; i++) {
    if (p.cross[i] < 0) continue;
    ctx.fillStyle = FLOSS[p.cross[i]].hex;
    ctx.fillRect((i % p.w) * scale, Math.floor(i / p.w) * scale, scale, scale);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [arr, flip] of [[p.fwd, false], [p.bwd, true]] as const) {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] < 0) continue;
      const x = (i % p.w) * scale;
      const y = Math.floor(i / p.w) * scale;
      ctx.strokeStyle = FLOSS[arr[i]].hex;
      ctx.lineWidth = Math.max(1, scale * 0.18);
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + scale, y + scale);
      } else {
        ctx.moveTo(x, y + scale);
        ctx.lineTo(x + scale, y);
      }
      ctx.stroke();
    }
  }
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < p.q[k].length; i++) {
      if (p.q[k][i] < 0) continue;
      const [qx, qy] = Q_CORNER[k];
      ctx.strokeStyle = FLOSS[p.q[k][i]].hex;
      ctx.lineWidth = Math.max(1, scale * 0.18);
      ctx.beginPath();
      ctx.moveTo((i % p.w) * scale + qx * scale, Math.floor(i / p.w) * scale + qy * scale);
      ctx.lineTo((i % p.w) * scale + scale / 2, Math.floor(i / p.w) * scale + scale / 2);
      ctx.stroke();
    }
  }
  for (const [list, factor] of [[p.back, 0.14], [p.long, 0.22]] as const) {
    for (const s of list) {
      ctx.strokeStyle = FLOSS[s.c]?.hex ?? "#444";
      ctx.lineWidth = Math.max(1, scale * factor);
      ctx.beginPath();
      ctx.moveTo(s.x1 * scale, s.y1 * scale);
      ctx.lineTo(s.x2 * scale, s.y2 * scale);
      ctx.stroke();
    }
  }
  for (const k of p.knots) {
    ctx.fillStyle = FLOSS[k.c]?.hex ?? "#444";
    ctx.beginPath();
    ctx.arc(k.x * scale, k.y * scale, Math.max(1.5, scale * 0.24), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of p.special ?? []) {
    const color = FLOSS[s.c]?.hex ?? "#444";
    if (s.kind === "petite") {
      const k = scale * 0.18;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, scale * 0.1);
      ctx.beginPath();
      ctx.moveTo(s.x * scale - k, s.y * scale - k);
      ctx.lineTo(s.x * scale + k, s.y * scale + k);
      ctx.moveTo(s.x * scale + k, s.y * scale - k);
      ctx.lineTo(s.x * scale - k, s.y * scale + k);
      ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(s.x * scale, s.y * scale);
      ctx.rotate(-0.35);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.max(1.5, scale * 0.17), Math.max(2, scale * 0.28), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = contrastOn(color);
      ctx.lineWidth = Math.max(0.8, scale * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, -scale * 0.12);
      ctx.lineTo(0, scale * 0.12);
      ctx.stroke();
      ctx.restore();
    }
  }
  // Réseau de grille par-dessus, comme sur une vraie grille imprimée.
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(60,50,40,0.18)";
  ctx.beginPath();
  for (let x = 0; x <= p.w; x++) {
    if (x % 10 === 0) continue;
    ctx.moveTo(Math.round(x * scale) + 0.5, 0);
    ctx.lineTo(Math.round(x * scale) + 0.5, c.height);
  }
  for (let y = 0; y <= p.h; y++) {
    if (y % 10 === 0) continue;
    ctx.moveTo(0, Math.round(y * scale) + 0.5);
    ctx.lineTo(c.width, Math.round(y * scale) + 0.5);
  }
  ctx.stroke();
  ctx.strokeStyle = "rgba(40,32,26,0.5)";
  ctx.beginPath();
  for (let x = 0; x <= p.w; x += 10) {
    ctx.moveTo(Math.round(x * scale) + 0.5, 0);
    ctx.lineTo(Math.round(x * scale) + 0.5, c.height);
  }
  for (let y = 0; y <= p.h; y += 10) {
    ctx.moveTo(0, Math.round(y * scale) + 0.5);
    ctx.lineTo(c.width, Math.round(y * scale) + 0.5);
  }
  ctx.stroke();

  // Symboles en dernier, lisibles par-dessus la couleur.
  if (scale >= 6) {
    for (let i = 0; i < p.cross.length; i++) {
      const idx = p.cross[i];
      if (idx < 0) continue;
      drawSymbol(ctx, assignedSymbol(p, idx), (i % p.w) * scale + scale / 2, Math.floor(i / p.w) * scale + scale / 2, scale * 0.33, contrastOn(FLOSS[idx].hex));
    }
  }

  return new Promise((resolve) => c.toBlob((blob) => resolve(blob), "image/png"));
}

export default function ExportStudio({ pattern, onClose }: { pattern: Pattern; onClose: () => void }) {
  const [bw, setBw] = useState(true);
  const [paper, setPaper] = useState<"a4" | "letter">("a4");
  const [overlap, setOverlap] = useState(true);
  const [svgSymbols, setSvgSymbols] = useState(true);
  const [svgLegend, setSvgLegend] = useState(true);
  const [brand, setBrand] = useState<PaletteId | "">("");
  const [table, setTable] = useState<EquivalenceTable | null>(null);
  const [tableBusy, setTableBusy] = useState(false);
  const [tableError, setTableError] = useState("");
  const [tableInPdf, setTableInPdf] = useState(true);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [error, setError] = useState("");
  const [warn, setWarn] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); abort.current?.abort(); }, [url]);

  // Changer de marque ou de motif invalide la table déjà calculée.
  useEffect(() => {
    setTable(null);
    setTableError("");
  }, [brand, pattern]);

  const options = (): PdfOptions => ({ bw, paper, overlap, equivalences: table && tableInPdf ? table : undefined });

  /**
   * Correspondance vers une autre marque.
   *
   * Calculée sur le motif composite : c'est ce que le PDF imprime, donc ce que
   * la table doit décrire. Un motif à calques masqués ne doit pas proposer des
   * références pour des fils qui ne seront pas brodés.
   */
  const computeTable = async () => {
    if (!brand) return;
    setTableBusy(true);
    setTableError("");
    try {
      setTable(await equivalents(compositePattern(pattern), brand));
    } catch {
      setTable(null);
      setTableError("Table fabricante indisponible sur cet appareil.");
    } finally {
      setTableBusy(false);
    }
  };

  const exportChart = async (preview: boolean) => {
    setBusy(true);
    setError("");
    setWarn("");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const blob = await buildPdf(pattern, {
        ...options(),
        signal: controller.signal,
        onProgress: (done, total, label) => setProgress({ done, total, label }),
      });
      if (preview) {
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
      } else {
        // buildPdf ne télécharge plus rien : l'appelant décide.
        downloadBlob(blob, pdfFileName(pattern, options()));
      }
    } catch (e) {
      if (e instanceof PdfAborted) setWarn("Export interrompu.");
      else setError(e instanceof Error ? e.message : "Export impossible");
    } finally {
      abort.current = null;
      setProgress(null);
      setBusy(false);
    }
  };

  const previewCallback = useRef(() => void exportChart(true));
  previewCallback.current = () => void exportChart(true);
  useEffect(() => {
    const preview = () => previewCallback.current();
    window.addEventListener("pointzero:export-preview", preview);
    return () => window.removeEventListener("pointzero:export-preview", preview);
  }, []);

  const png = async () => {
    setBusy(true);
    try {
      const blob = await renderPng(pattern);
      if (blob) downloadBlob(blob, `${slugify(pattern.name)}-apercu.png`);
      else setError("Le rendu PNG est indisponible sur cet appareil.");
    } finally {
      setBusy(false);
    }
  };

  const svg = () => {
    setBusy(true);
    setError("");
    setWarn("");
    try {
      const result = patternToSvg(pattern, { bw, symbols: svgSymbols, legend: svgLegend });
      if (result.symbolsOmitted) setWarn("SVG : symboles omis, la grille dépasse 90 000 cases. Désactivez les symboles ou exportez en PDF paginé.");
      downloadBlob(new Blob([result.svg], { type: "image/svg+xml;charset=utf-8" }), `${slugify(pattern.name)}-grille${bw ? "-nb" : "-couleur"}.svg`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export SVG impossible");
    } finally {
      setBusy(false);
    }
  };

  const csv = () => {
    const rows = shoppingList([pattern], pattern.supplies ?? {});
    downloadBlob(
      new Blob(["\uFEFFDMC;Nom;Metres;Echeveaux_a_acheter\n" + rows.map((r) => `${r.code};${r.name};${r.meters.toFixed(2)};${r.buy}`).join("\n")], {
        type: "text/csv;charset=utf-8",
      }),
      `${slugify(pattern.name)}-achats.csv`,
    );
  };

  const tableCsv = () => {
    if (!table) return;
    downloadBlob(
      new Blob([equivalencesCsv(table)], { type: "text/csv;charset=utf-8" }),
      `${slugify(pattern.name)}-correspondance-${table.palette.id}.csv`,
    );
  };

  const fab = fabricInfo(pattern);
  const { totals } = computeStats(pattern);
  const beads = Object.keys(pattern.beadMap ?? {}).length;
  const gridPages = Math.ceil(pattern.w / 40) * Math.ceil(pattern.h / 40);

  return (
    <Sheet open onClose={onClose} guideTarget="export" title="Exporter le patron" subtitle="Contrôler avant de partager ou d'imprimer">
      {pattern.provenance?.personalOnly && (
        <div className="mb-4 border-l-2 border-warn pl-3 text-[13px] leading-relaxed text-warn">
          Patron tiers : usage personnel. La conversion ne vous transfère pas le droit de redistribuer ou de vendre le motif. Source et auteur restent inscrits au PDF.
        </div>
      )}
      <p className="mb-1 text-[14px] text-label-2">
        {pattern.w} × {pattern.h} · {fab.fw.toFixed(1)} × {fab.fh.toFixed(1)} cm · {totals.colors} fils
      </p>
      <p className="mb-4 text-[12px] text-label-3">
        {gridPages} page{gridPages > 1 ? "s" : ""} de grille{beads ? ` · ${beads} référence${beads > 1 ? "s" : ""} de perle` : ""}
        {table && tableInPdf ? ` · correspondances ${table.palette.brand}` : ""}
        {pattern.layers?.length ? ` · ${pattern.layers.filter((l) => l.visible).length} calque(s) visible(s) fusionné(s)` : ""}
      </p>

      <div className="seg mb-3">
        <button aria-pressed={bw} onClick={() => setBw(true)}>Symboles N&B</button>
        <button aria-pressed={!bw} onClick={() => setBw(false)}>Couleur + symboles</button>
      </div>
      <div className="seg mb-3">
        <button aria-pressed={paper === "a4"} onClick={() => setPaper("a4")}>A4</button>
        <button aria-pressed={paper === "letter"} onClick={() => setPaper("letter")}>US Letter</button>
      </div>
      <label className="mb-4 flex items-start gap-2.5 text-[13px] leading-snug text-label-2">
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#0a84ff]" checked={overlap} onChange={() => setOverlap(!overlap)} />
        <span>
          Chevauchement de 10 cases
          <span className="block text-[11px] text-label-3">Répète 10 cases du bloc voisin sur fond grisé, pour caler les feuilles avant collage.</span>
        </span>
      </label>

      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={busy} onClick={() => void exportChart(false)}>
          <Download size={16} />
          {busy ? "Préparation…" : "PDF"}
        </button>
        <button className="btn-quiet" disabled={busy} onClick={() => void exportChart(true)}>
          <Eye size={16} />
          Aperçu
        </button>
        {busy && (
          <button className="btn-quiet text-danger" onClick={() => abort.current?.abort()} aria-label="Annuler l'export">
            <Ban size={16} />
          </button>
        )}
      </div>

      {progress && (
        <div className="mt-3" role="status" aria-live="polite">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-label-3">
            <span>{progress.label}</span>
            <span className="font-mono tabular-nums">{Math.round((progress.done / Math.max(1, progress.total)) * 100)} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <span className="block h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
          </div>
        </div>
      )}

      {url && (
        <div className="mt-4">
          <iframe title="Aperçu du PDF réel" src={url} className="h-[350px] w-full rounded-[12px] bg-white" />
          <p className="mt-2 text-[11px] leading-relaxed text-label-3">
            iPad et iPhone n'affichent pas les PDF dans une page web : si l'aperçu reste vide, utilisez le lien ci-dessous.
          </p>
          <a href={url} target="_blank" rel="noreferrer" className="mt-1 block text-[12px] text-accent-2">
            Ouvrir le PDF dans un nouvel onglet
          </a>
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="mb-2 text-[12px] font-medium text-label-2">Export SVG vectoriel</p>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-[12px] text-label-2">
            <input type="checkbox" className="h-4 w-4 accent-[#0a84ff]" checked={svgSymbols} onChange={() => setSvgSymbols(!svgSymbols)} />
            Symboles
          </label>
          <label className="flex items-center gap-2 text-[12px] text-label-2">
            <input type="checkbox" className="h-4 w-4 accent-[#0a84ff]" checked={svgLegend} onChange={() => setSvgLegend(!svgLegend)} />
            Légende
          </label>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-label-3">
          Un seul fichier, redimensionnable sans perte. Au-delà de 90 000 cases les symboles sont omis pour garder un fichier exploitable.
        </p>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="mb-1 text-[12px] font-medium text-label-2">Correspondances multi-marques</p>
        <p className="mb-2 text-[11px] leading-relaxed text-label-3">
          Le motif reste en DMC : c'est sa langue. Voici, pour chacun de ses fils, les références les plus proches d'une autre marque —
          broderie diamant ou perles à repasser — avec l'écart perceptuel.
        </p>
        <select
          className="field"
          value={brand}
          aria-label="Marque cible"
          onChange={(e) => setBrand(e.target.value as PaletteId | "")}
        >
          <option value="">Choisir une marque…</option>
          {PALETTE_CHOICES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} — {c.use}
            </option>
          ))}
        </select>
        {brand && (
          <button className="btn-tinted mt-2 w-full" disabled={tableBusy || busy} onClick={() => void computeTable()}>
            <Rows3 size={15} />
            {tableBusy ? "Calcul des écarts…" : table ? "Recalculer la correspondance" : "Calculer la correspondance"}
          </button>
        )}
        {tableError && <p role="alert" className="mt-2 text-[12px] text-danger">{tableError}</p>}

        {table && (
          <>
            <p className="mt-3 text-[11px] leading-relaxed text-label-2">{equivalenceWarning(table)}</p>
            <p className="mt-2 text-[11px] leading-relaxed text-label-3">
              Table {STATUS_LABEL[table.palette.status] ?? table.palette.status} — note de la source, en anglais : {table.palette.notes}
            </p>

            <label className="mt-3 flex items-start gap-2.5 text-[13px] leading-snug text-label-2">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[#0a84ff]"
                checked={tableInPdf}
                onChange={() => setTableInPdf(!tableInPdf)}
              />
              <span>
                Imprimer la correspondance dans le PDF
                <span className="block text-[11px] text-label-3">
                  Résumé en couverture, {table.rows.length} ligne(s) détaillées après la légende des fils.
                </span>
              </span>
            </label>

            <ul className="thin-scroll mt-3 max-h-[240px] divide-y divide-white/[0.06] overflow-y-auto rounded-[10px] bg-white/[0.03] px-2">
              {table.rows.map((r) => (
                <li key={r.idx} className="flex items-center gap-2 py-1.5">
                  <span className="h-5 w-5 shrink-0 rounded-[5px] ring-1 ring-black/30" style={{ background: r.hex }} aria-hidden="true" />
                  <span className="w-12 shrink-0 font-mono text-[11px]">{FLOSS[r.idx].blend ? "Mix" : r.code}</span>
                  <span className="w-12 shrink-0 text-[10px] text-label-3 tabular-nums">{r.cells} él.</span>
                  <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-2 gap-y-1">
                    {r.matches.map((m, i) => (
                      <span
                        key={m.code}
                        className="flex items-center gap-1"
                        title={`${m.name}${m.finish ? ` · ${m.finish}` : ""} — écart ${m.deltaE.toFixed(1)} (${deltaELabel(m.deltaE)})${m.sameCode ? " · même code DMC" : ""}${i === 0 ? " · meilleure correspondance" : ""}`}
                      >
                        <span className="h-4 w-4 rounded-[4px] ring-1 ring-black/30" style={{ background: m.hex }} aria-hidden="true" />
                        <span className="font-mono text-[10px]">{m.code}</span>
                        <span className={`font-mono text-[9px] tabular-nums ${m.deltaE > FAR_DELTA_E ? "text-warn" : "text-label-3"}`}>
                          {m.deltaE.toFixed(1)}
                        </span>
                        {m.sameCode && <span className="text-[9px] text-ok">=</span>}
                        {m.discontinued && <span className="text-[9px] text-warn">arrêt</span>}
                      </span>
                    ))}
                  </span>
                  <span className="sr-only">
                    {`DMC ${r.code}, ${r.cells} éléments, correspondances ${r.matches
                      .map((m) => `${m.code} écart ${m.deltaE.toFixed(1)} ${deltaELabel(m.deltaE)}`)
                      .join(", ")}`}
                  </span>
                </li>
              ))}
            </ul>

            <button className="mt-2 text-[12px] text-accent-2" type="button" onClick={tableCsv}>
              Télécharger la correspondance en CSV
            </button>
          </>
        )}
      </div>

      <div className="mt-4 divide-y divide-white/10">
        {[
          { label: "Grille SVG vectorielle", icon: VectorSquare, fn: svg },
          { label: "Projet complet JSON", icon: FileJson, fn: () => saveProjectFile(pattern) },
          { label: "Format ouvert OXS", icon: FileCode2, fn: () => downloadOxs(pattern) },
          { label: "Aperçu couleur PNG", icon: Image, fn: () => void png() },
          { label: "Liste d'achat CSV", icon: ShoppingBag, fn: csv },
          ...(table ? [{ label: `Correspondance ${table.palette.brand} CSV`, icon: Rows3, fn: tableCsv }] : []),
        ].map(({ label, icon: Icon, fn }) => (
          <button key={label} className="flex w-full items-center gap-3 py-4 text-left text-[14px] text-accent-2 disabled:opacity-40" disabled={busy} onClick={fn}>
            <Icon size={18} />
            {label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-label-3">
        Ce PDF est le motif : l'avancement, les cases à défaire et les fils garés ne sont pas imprimés. Les contours et ornements sont listés
        avec leurs coordonnées dans une table dédiée. Les conventions de fractions et ornements OXS diffèrent selon le lecteur : le cœur
        croix/arrière est portable, les extensions Point Zéro gardent les détails. Compatibilité avec Pattern Keeper et autres lecteurs à
        valider sur vos fichiers, sans garantie universelle.
      </p>
      {warn && <p role="status" className="mt-3 text-[13px] text-warn">{warn}</p>}
      {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
    </Sheet>
  );
}

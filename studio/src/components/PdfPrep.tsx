import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ArrowLeft, Check, Grid3x3, Magnet, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { FLOSS, flossIndex } from "../lib/dmc";
import { closestDmcAlternatives, patternFromVector, remapImportedPalette } from "../lib/pdfColorImport";
import {
  analyzePdf,
  convertBlockAuto,
  convertBlockColor,
  fitGrid,
  SymbolRegistry,
  type PdfAnalysis,
  type PdfBlock,
} from "../lib/pdfAnalysis";
import { readVectorChart, type VectorResult } from "../lib/pdfVector";
import { readCompleteGlyphChart, type CompleteGlyphChart } from "../lib/pdfGlyphChart";
import type { PdfHandle } from "../lib/pdfimport";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";

const STAGES = ["Analyse", "Calage", "Grille & Montage"] as const;
type Mode = "vecteur" | "auto" | "photo";

interface CachedBlock {
  cells: Int16Array;
  byColor: number;
  byLegend: number;
  unresolved: number;
}
interface Placed {
  b: PdfBlock;
  data: CachedBlock;
}
interface Assembled {
  pattern: Pattern;
  rawW: number;
  rawH: number;
  fitW: number;
  fitH: number;
  scaled: boolean;
  blocks: number;
  byColor: number;
  byLegend: number;
  unresolved: number;
  source: "vecteur" | "image";
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const keyOf = (b: PdfBlock, mode: Mode, colors: number) =>
  `${mode}|${colors}|${b.id}|${b.page}|${b.x0.toFixed(2)},${b.y0.toFixed(2)},${b.x1.toFixed(2)},${b.y1.toFixed(2)}|${b.cols}x${b.rows}`;

/** Positions sans chevauchement, même si les blocs ont différentes dimensions. */
export function positionsPuzzle(
  blocks: PdfBlock[], columns: number, uniformSizes: boolean, size: { cols: number; rows: number },
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const n = Math.max(1, columns);
  let x = 0, y = 0, rowHeight = 0;
  blocks.forEach((block, index) => {
    if (index > 0 && index % n === 0) {
      y += rowHeight; x = 0; rowHeight = 0;
    }
    positions[block.id] = { x, y };
    x += uniformSizes ? size.cols : block.cols;
    rowHeight = Math.max(rowHeight, uniformSizes ? size.rows : block.rows);
  });
  return positions;
}


export default function PdfPrep({
  file,
  onClose,
  onImport,
  embedded = false,
  integrated = false,
  studioEmbedded = false,
  echelleMonde = 1,
}: {
  file: File;
  onClose: () => void;
  onImport: (p: Pattern) => void;
  /** Intégré dans la landing : s'affiche dans le flux de la page au lieu d'occuper tout l'écran. */
  embedded?: boolean;
  /** Keep the main studio header visible while assembling a PDF. */
  integrated?: boolean;
  /** Mode PDF Studio : hauteur responsive et forme harmonisée. */
  studioEmbedded?: boolean;
  /** Posé sur la toile zoomée : les deltas de souris arrivent déjà zoomés. */
  echelleMonde?: number;
}) {
  /* En mode intégré, le panneau a une hauteur fixe et défile : sans cela, il
     faut chercher le bouton pour continuer, ce qui ne fait pas professionnel.
     L'action primaire de chaque étape reste donc collée en bas du défilement. */
  const stick = embedded
    ? "sticky bottom-0 z-10 rounded-[14px] bg-[#0e0e11]/95 shadow-[0_-12px_32px_rgba(0,0,0,.55)] backdrop-blur-md"
    : "";
  const [analysis, setAnalysis] = useState<PdfAnalysis | null>(null);
  const [handle, setHandle] = useState<PdfHandle | null>(null);
  const [vector, setVector] = useState<VectorResult | null>(null);
  const [completeGlyph, setCompleteGlyph] = useState<CompleteGlyphChart | null>(null);
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [pageN, setPageN] = useState(1);
  const [blocks, setBlocks] = useState<PdfBlock[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [excluded] = useState<Set<string>>(new Set());
  const [perRow, setPerRow] = useState(3);
  const [mode, setMode] = useState<Mode>("auto");
  const [colors, setColors] = useState(24);
  const [assembled, setAssembled] = useState<Assembled | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [author, setAuthor] = useState("");
  const [authorized, setAuthorized] = useState(false);

  // Vue centrale au stade 2 : Puzzle tactile ou Aperçu broderie unifiée
  const [centerTab, setCenterTab] = useState<"puzzle" | "preview">("puzzle");
  // Puzzle manuel : positions en coordonnées de points de grille (x, y en cases)
  const [manualPositions, setManualPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [uniformSizes, setUniformSizes] = useState(false);
  const [magnet, setMagnet] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [addingZone, setAddingZone] = useState(false);
  const [zoneDraft, setZoneDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const zoneStart = useRef<{ x: number; y: number } | null>(null);
  const draggedCard = useRef<string | null>(null);

  const handleRef = useRef<PdfHandle | null>(null);
  const registry = useRef(new SymbolRegistry());
  const cache = useRef(new Map<string, CachedBlock>());
  const tableRef = useRef<HTMLDivElement>(null);

  // Drag state sur la grande table de montage
  const dragInfo = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startTileX: number;
    startTileY: number;
    tileW: number;
    tileH: number;
  } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number } | null>(null);

  /* ------------------------- Chargement et analyse ------------------------- */

  useEffect(() => {
    let live = true;
    setBusy("Analyse du PDF…");
    registry.current = new SymbolRegistry();
    cache.current.clear();
    setCorrections({});
    setCompleteGlyph(null);
    analyzePdf(file, (m) => {
      if (live) setBusy(m);
    })
      .then(async ({ analysis: a, handle: h }) => {
        if (!live) {
          h.destroy();
          return;
        }
        handleRef.current = h;
        setHandle(h);
        setAnalysis(a);
        setAuthor(a.author);
        a.legend.forEach((e) => registry.current.addKnown(e.bits, e.code));
        // Priorité à la vraie matrice de glyphes lorsqu'elle est complète.
        // BeeL.pdf, par exemple, porte même ses cases vides dans le texte PDF :
        // 12 grilles = 193 × 200 cases ; le raster perd des zones.
        setBusy("Lecture complète des symboles et codes DMC…");
        const full = await readCompleteGlyphChart(h);
        if (!live) return;
        setCompleteGlyph(full.ok ? full : null);
        if (full.ok) {
          const chart: PdfBlock[] = full.tiles.map(t => ({
            id: "glyph-" + t.page, page: t.page,
            x0: t.bounds.x0, y0: t.bounds.y0, x1: t.bounds.x1, y1: t.bounds.y1,
            cols: t.cols, rows: t.rows, label: "Grille DMC exacte · page " + t.page,
          }));
          setBlocks(chart);
          setOrder(chart.map(b => b.id));
          setPerRow(full.columns);
          setPageN(chart[0].page);
          setCenterTab("preview");
          setVector(null);
          setMode("vecteur");
          setBusy("");
          return;
        }
        const pages = a.pages.filter((p) => p.kind === "chart");
        const chart = pages.flatMap((p) => p.blocks);
        setBlocks(chart);
        setOrder(autoOrder(chart).map(b => b.id));
        const suggestedPerRow = a.modelAspect >= 1.2 ? 4 : a.modelAspect <= 0.7 ? 2 : 3;
        setPerRow(Math.min(suggestedPerRow, Math.max(1, chart.length)));
        if (pages[0]) setPageN(pages[0].n);
        const initialBoxes = new Map<number, { x0: number; y0: number; x1: number; y1: number }[]>();
        for (const b of chart) {
          const list = initialBoxes.get(b.page) ?? [];
          list.push({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 });
          initialBoxes.set(b.page, list);
        }
        setBusy("Lecture vectorielle des axes du patron…");
        const v = await readVectorChart(h, initialBoxes);
        if (!live) return;
        setVector(v);
        setMode(v.ok ? "vecteur" : "auto");
        setBusy("");
      })
      .catch((e) => {
        if (live) {
          setError(e instanceof Error ? e.message : "PDF illisible");
          setBusy("");
        }
      });
    return () => {
      live = false;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [file]);

  const zonePoint = (e: RPointerEvent<HTMLElement>) => {
    const bounds = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, (e.clientX - bounds.left) / bounds.width * 100)),
      y: Math.min(100, Math.max(0, (e.clientY - bounds.top) / bounds.height * 100)),
    };
  };
  const finishMissingZone = (e: RPointerEvent<HTMLDivElement>) => {
    const start = zoneStart.current;
    zoneStart.current = null;
    if (!start) return;
    const end = zonePoint(e);
    const x0 = Math.min(start.x, end.x), y0 = Math.min(start.y, end.y);
    const x1 = Math.max(start.x, end.x), y1 = Math.max(start.y, end.y);
    setZoneDraft(null);
    if (x1 - x0 < 3 || y1 - y0 < 3) return;
    const nearby = blocks.find(b => b.page === pageN) ?? blocks[0];
    const b: PdfBlock = {
      id: "manuelle-" + Date.now() + "-" + Math.random().toString(36).slice(2, 5),
      page: pageN, x0, y0, x1, y1,
      cols: nearby?.cols ?? 40, rows: nearby?.rows ?? 40,
      label: "Zone ajoutée manuellement",
    };
    setBlocks(previous => [...previous, b]);
    setOrder(previous => [...previous, b.id]);
    setMode("auto");
    setVector(null);
    cache.current.clear();
    setAddingZone(false);
    setManualPositions({});
  };

  const page = analysis?.pages.find((p) => p.n === pageN);
  const pageBlocks = blocks.filter((b) => b.page === pageN);
  const byId = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const effective = useMemo(
    () => order.map((id) => byId.get(id)).filter((b): b is PdfBlock => !!b && !excluded.has(b.id)),
    [order, byId, excluded],
  );

  // Dimensions uniformisées calculées (médianes) pour éviter les décalages de rangées
  const uniformDim = useMemo(() => {
    if (!effective.length) return { cols: 50, rows: 60 };
    const cols = [...effective.map((b) => b.cols)].sort((a, b) => a - b);
    const rows = [...effective.map((b) => b.rows)].sort((a, b) => a - b);
    return {
      cols: cols[cols.length >> 1] || 50,
      rows: rows[rows.length >> 1] || 60,
    };
  }, [effective]);

  // Largeur et hauteur d'un bloc (uniformisées ou réelles)
  const blockW = (b: PdfBlock) => (uniformSizes ? uniformDim.cols : b.cols);
  const blockH = (b: PdfBlock) => (uniformSizes ? uniformDim.rows : b.rows);

  // Mosaïque ordonnée par défaut (pages dans l'ordre numérique, rangées régulières)
  const defaultMosaic = useMemo(
    () => positionsPuzzle(effective, perRow, uniformSizes, uniformDim),
    [effective, perRow, uniformSizes, uniformDim],
  );

  // Position effective de chaque bloc sur la table de montage
  const tileLayout = useMemo(() => {
    return effective.map((b) => {
      const pos = manualPositions[b.id] ?? defaultMosaic[b.id] ?? { x: 0, y: 0 };
      return {
        b,
        x: pos.x,
        y: pos.y,
        w: blockW(b),
        h: blockH(b),
      };
    });
  }, [effective, manualPositions, defaultMosaic, uniformSizes, uniformDim]);

  // Dimensions totales du plateau en points de broderie
  const boardSize = useMemo(() => {
    if (!tileLayout.length) return { w: 100, h: 100 };
    const maxX = Math.max(...tileLayout.map((t) => t.x + t.w));
    const maxY = Math.max(...tileLayout.map((t) => t.y + t.h));
    return { w: Math.max(10, maxX), h: Math.max(10, maxY) };
  }, [tileLayout]);

  /* ------------------- Drag & Drop Magnétique sur la Table Centrale ------------------- */

  // Échelle d'affichage pixels / point de grille sur le tableau central
  const tableScale = useMemo(() => {
    // Le plateau fait typiquement 600px de haut
    const maxPxW = 780;
    const maxPxH = 560;
    const sX = maxPxW / boardSize.w;
    const sY = maxPxH / boardSize.h;
    return Math.max(0.3, Math.min(2.5, Math.min(sX, sY) * zoom));
  }, [boardSize, zoom]);

  const onPointerDownTile = (e: RPointerEvent, b: PdfBlock) => {
    e.preventDefault();
    e.stopPropagation();
    const t = tileLayout.find((item) => item.b.id === b.id);
    if (!t) return;
    dragInfo.current = {
      id: b.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startTileX: t.x,
      startTileY: t.y,
      tileW: t.w,
      tileH: t.h,
    };
    setActiveDragId(b.id);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMoveTile = (e: RPointerEvent) => {
    const drag = dragInfo.current;
    if (!drag) return;
    e.preventDefault();
    const deltaClientX = e.clientX - drag.startClientX;
    const deltaClientY = e.clientY - drag.startClientY;

    // Déplacement en points de grille
    const deltaGridX = Math.round(deltaClientX / (tableScale * echelleMonde));
    const deltaGridY = Math.round(deltaClientY / (tableScale * echelleMonde));

    let newX = Math.max(0, drag.startTileX + deltaGridX);
    let newY = Math.max(0, drag.startTileY + deltaGridY);

    // Aimantage magnétique aux bords des autres blocs
    if (magnet) {
      const snapDist = Math.max(4, Math.round(14 / (tableScale * echelleMonde))); // ~14px réels d'attraction
      let snappedX: number | undefined;
      let snappedY: number | undefined;

      const otherTiles = tileLayout.filter((t) => t.b.id !== drag.id);
      for (const o of otherTiles) {
        // Aimantage horizontal : bord gauche colle au bord droit d'un voisin
        if (Math.abs(newX - (o.x + o.w)) <= snapDist) {
          newX = o.x + o.w;
          snappedX = newX;
        }
        // Bord droit colle au bord gauche d'un voisin
        else if (Math.abs(newX + drag.tileW - o.x) <= snapDist) {
          newX = o.x - drag.tileW;
          snappedX = o.x;
        }
        // Alignement des bords gauches
        else if (Math.abs(newX - o.x) <= snapDist) {
          newX = o.x;
          snappedX = newX;
        }

        // Aimantage vertical : bord haut colle au bord bas d'un voisin
        if (Math.abs(newY - (o.y + o.h)) <= snapDist) {
          newY = o.y + o.h;
          snappedY = newY;
        }
        // Bord bas colle au bord haut d'un voisin
        else if (Math.abs(newY + drag.tileH - o.y) <= snapDist) {
          newY = o.y - drag.tileH;
          snappedY = o.y;
        }
        // Alignement des bords hauts
        else if (Math.abs(newY - o.y) <= snapDist) {
          newY = o.y;
          snappedY = newY;
        }
      }

      // Aimantage à l'origine (0, 0)
      if (newX <= snapDist) {
        newX = 0;
        snappedX = 0;
      }
      if (newY <= snapDist) {
        newY = 0;
        snappedY = 0;
      }

      setSnapGuides(snappedX !== undefined || snappedY !== undefined ? { x: snappedX, y: snappedY } : null);
    } else {
      setSnapGuides(null);
    }

    // The exact vector parser fixes coordinates to their source pages.
    // Switch to symbol/image reconciliation only when a card truly moves,
    // otherwise a magnetic adjustment would be silently ignored on export.
    if ((newX !== drag.startTileX || newY !== drag.startTileY) && mode === "vecteur") {
      setMode("auto");
    }
    setManualPositions((prev) => ({
      ...prev,
      [drag.id]: { x: Math.max(0, newX), y: Math.max(0, newY) },
    }));
  };

  const onPointerUpTile = (e: RPointerEvent) => {
    if (!dragInfo.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
    dragInfo.current = null;
    setActiveDragId(null);
    setSnapGuides(null);
  };

  const arrangeMosaic = (cols: number) => {
    setPerRow(cols);
    setManualPositions(positionsPuzzle(effective, cols, uniformSizes, uniformDim));
    if (mode === "vecteur") setMode("auto");
  };

  const moveCard = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    setOrder(previous => {
      const next = previous.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    // Les positions suivent le nouvel ordre.
    setManualPositions({});
    if (mode === "vecteur") setMode("auto");
  };

  const resetToDefault = () => {
    setManualPositions({});
  };

  /* ------------------- Assemblage final vers Pattern ------------------- */

  const sig = effective.map((b) => keyOf(b, mode, colors)).join("|");
  const layoutSig = tileLayout.map((t) => `${t.b.id}:${t.x},${t.y},${t.w},${t.h}`).join("|");

  useEffect(() => {
    if (stage !== 2 || !handle || !analysis) return;
    let dead = false;
    (async () => {
      try {
        if (!effective.length) {
          setAssembled(null);
          setError("Aucun bloc inclus.");
          return;
        }
        setError("");
        // Priorité aux codes DMC réellement présents dans le tableau PDF :
        // l'ancien mode "vecteur" était bien détecté mais jamais utilisé.
        if (mode === "vecteur") {
          if (completeGlyph?.ok) {
            // L'ordre des cartes et leur placement influencent l'assemblage
            // réel, mais leur matrice de cases ne repasse jamais par le raster.
            const placed: Placed[] = effective.map(b => {
              const t = completeGlyph.tiles.find(t => t.page === b.page);
              if (!t) throw new Error("Page vectorielle manquante : " + b.page);
              return { b, data: {
                cells: t.cells, byColor: 0, byLegend: t.mapped, unresolved: t.unresolved,
              } };
            });
            const product = assembleFromTileLayout(placed, tileLayout, analysis.title);
            setAssembled({ ...product, source: "vecteur" });
            return;
          }
          if (!vector?.ok) {
            setAssembled(null);
            setError("Correspondance vectorielle indisponible : choisissez Automatique pour lire les couleurs visibles.");
            return;
          }
          const p = patternFromVector(vector, analysis.title);
          if (!p) {
            setAssembled(null);
            setError("Codes DMC vectoriels illisibles : choisissez Automatique.");
            return;
          }
          const miss = Object.values(vector.unmapped).reduce((sum, n) => sum + n, 0);
          setAssembled({
            pattern: p, rawW: p.w, rawH: p.h, fitW: p.w, fitH: p.h,
            scaled: false, blocks: effective.length, byColor: 0,
            byLegend: vector.cells.size, unresolved: miss, source: "vecteur",
          });
          return;
        }
        for (let i = 0; i < effective.length; i++) {
          const b = effective[i];
          const key = keyOf(b, mode, colors);
          if (cache.current.has(key)) continue;
          setBusy(`Lecture du bloc ${i + 1}/${effective.length} · page ${b.page}`);
          await tick();
          const v =
            mode === "auto"
              ? await convertBlockAuto(handle, b.page, b, registry.current)
              : await convertBlockColor(handle, b.page, b, colors);
          if (dead) return;
          cache.current.set(
            key,
            "byColor" in v ? v : { cells: v.cells, byColor: v.cells.filter((x) => x >= 0).length, byLegend: 0, unresolved: 0 },
          );
        }
        if (dead) return;

        // Assemblage des blocs aux coordonnées calculées par la table magnétique
        const placed: Placed[] = effective.map((b) => ({
          b,
          data: cache.current.get(keyOf(b, mode, colors)) as CachedBlock,
        }));

        setAssembled(assembleFromTileLayout(placed, tileLayout, analysis.title));
      } catch (e) {
        if (!dead) setError(e instanceof Error ? e.message : "Assemblage impossible");
      } finally {
        if (!dead) setBusy("");
      }
    })();
    return () => {
      dead = true;
    };
  }, [stage, handle, analysis, sig, layoutSig, mode, colors, vector, completeGlyph]);

  // Les substitutions sont un calque NON DESTRUCTIF. Modifier une estimation
  // ne modifie jamais les données extraites du PDF ; annuler restaure l'original.
  const correctedPattern = useMemo(
    () => assembled ? remapImportedPalette(assembled.pattern, corrections) : null,
    [assembled, corrections],
  );
  const preview = useMemo(() => (correctedPattern ? renderPreview(correctedPattern) : ""), [correctedPattern]);
  const detectedColors = useMemo(() => {
    if (!assembled) return [];
    const counts = new Map<number, number>();
    for (const idx of assembled.pattern.cross) if (idx >= 0) counts.set(idx, (counts.get(idx) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [assembled]);

  const commit = () => {
    if (!assembled) return;
    const p = correctedPattern;
    if (!p) return;
    p.provenance = {
      kind: "pdf",
      source: file.name,
      author: author.trim(),
      license: authorized ? "Droits de redistribution déclarés" : "Usage personnel uniquement",
      personalOnly: !authorized,
    };
    p.notes = `PDF reconstitué : ${assembled.blocks} blocs (${assembled.fitW} × ${assembled.fitH} pts). Codes DMC ${assembled.source === "vecteur" ? "lus dans la légende vectorielle" : "lus dans l'image / estimés par couleur"} : ${assembled.byLegend} associés, ${assembled.byColor} déduits par couleur, ${assembled.unresolved} symboles non résolus. Vérifier les estimations sur la légende originale. Substitutions manuelles : ${Object.entries(corrections).filter(([from, to]) => from !== to && flossIndex(to) >= 0).map(([from, to]) => from + "→" + to).join(", ") || "aucune"}.\nDocument original : ${file.name}`;
    onImport(p);
  };

  return (
    <div
      className={`glass-strong flex flex-col overflow-hidden bg-[#0e0e11] ${
        embedded ? (studioEmbedded ? "h-[min(85dvh,980px)] min-h-[600px] w-full rounded-[6px] border border-white/15" : "h-[860px] w-full rounded-[26px] ring-1 ring-white/10") : integrated ? "fixed inset-x-0 bottom-0 top-[58px] z-[35]" : "fixed inset-0 z-[75]"
      }`}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        {!embedded && (
          <button className="btn-icon" onClick={onClose} disabled={!!busy} aria-label="Retour">
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="min-w-0">
          <h2 className="truncate text-[16px] font-semibold">{studioEmbedded?"Cartes magnétiques · grille PDF":"Importer un PDF · puzzle de recomposition"}</h2>
          <p className="truncate text-[12px] text-label-3">
            {file.name}
            {analysis ? ` · ${analysis.pages.length} pages` : ""}
            {stage === 2 && ` · Plateau ${boardSize.w} × ${boardSize.h} pts`}
          </p>
        </div>
        <ol className="ml-auto hidden gap-1 md:flex">
          {STAGES.map((l, i) => (
            <li key={l}>
              <button
                disabled={i > stage || !!busy}
                onClick={() => i < stage && setStage(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] ${
                  i === stage ? "bg-accent text-white" : i < stage ? "text-accent-2" : "text-label-3"
                }`}
              >
                <span className="grid h-4 w-4 place-items-center rounded-full bg-white/10 text-[10px]">
                  {i < stage ? <Check size={10} /> : i + 1}
                </span>
                {l}
              </button>
            </li>
          ))}
        </ol>
      </header>

      <main className="thin-scroll min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {error && <p role="alert" className="mb-4 rounded-[12px] bg-white/5 px-4 py-3 text-[13px] leading-relaxed text-label-2">{error}</p>}

        {/* Étape 1 : Analyse initiale */}
        {stage === 0 && analysis && (
          <section className="mx-auto max-w-[860px]">
            <h3 className="text-[15px] font-semibold">Pages analysées</h3>
            <p className="mt-1 text-[13px] text-label-2">
              {completeGlyph?.ok
                ? `${completeGlyph.tiles.length} pages de grille complètes · ${completeGlyph.columns} colonnes × ${completeGlyph.tiles.length / completeGlyph.columns} rangées · ${completeGlyph.width} × ${completeGlyph.height} points`
                : `${analysis.pages.filter(p => p.kind === "chart").length} page(s) de grille · ${blocks.length} bloc(s) détecté(s)`}
              {vector?.ok ? " · codes DMC et symboles vectoriels reconnus" : ""}.
            </p>
            <p className="mt-2 text-[12px] text-label-2" role="status">
              {completeGlyph?.ok
                ? `Grille exacte détectée : ${completeGlyph.mapped.toLocaleString("fr-FR")} points avec codes DMC, ${completeGlyph.blank.toLocaleString("fr-FR")} cases vides, ${completeGlyph.legendCount} références et ${completeGlyph.unresolved} symbole(s) sans correspondance. Les 12 pages restent indépendantes et réordonnables avant l'import.`
                : vector?.ok
                ? `Lecture vectorielle de ${vector.cells.size} cases avec codes DMC du PDF, à vérifier dans l’aperçu.`
                : `Légende image : ${analysis.legend.length} correspondance(s) détectée(s). Les codes absents ne peuvent pas être devinés depuis des symboles noirs et blancs.`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {analysis.pages.map((p) => (
                <button
                  key={p.n}
                  className="overflow-hidden rounded-[12px] bg-white/5 text-left transition-transform hover:scale-[1.02]"
                  onClick={() => {
                    setPageN(p.n);
                    setStage(1);
                  }}
                >
                  <img src={p.thumb} className="aspect-[1/1.1] w-full object-cover" alt={`Page ${p.n}`} />
                  <span className="flex justify-between px-2 py-1.5 text-[11px]">
                    Page {p.n}
                    <span className={p.kind === "chart" ? "text-accent-2" : "text-label-3"}>
                      {p.kind === "chart" ? "Grille" : p.kind === "legend" ? "Légende" : p.kind === "cover" ? "Couverture" : "Autre"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button className={`btn-primary mt-6 w-full ${embedded ? "sticky bottom-0 z-10 shadow-[0_-12px_32px_rgba(0,0,0,.55)]" : ""}`} onClick={() => setStage(1)}>
              Continuer vers le calage
            </button>
          </section>
        )}

        {/* Étape 2 : Calage par page */}
        {stage === 1 && analysis && page && (
          <section className="mx-auto flex max-w-[1100px] flex-col gap-4 lg:flex-row">
            <div className="lg:w-[58%]">
              <div className="mb-2 flex flex-wrap gap-1">
                {analysis.pages.map((p) => (
                  <button
                    key={p.n}
                    onClick={() => setPageN(p.n)}
                    className={`rounded-full px-2.5 py-1 text-[12px] ${p.n === pageN ? "bg-accent text-white" : "bg-white/5 text-label-2"}`}
                  >
                    {p.n}
                    {p.kind === "chart" && " ✓"}
                  </button>
                ))}
              </div>
              <div
                className={"relative touch-none select-none overflow-hidden rounded-[14px] bg-white shadow-2xl" + (addingZone ? " cursor-crosshair outline outline-2 outline-[#30d158]" : "")}
                style={{ aspectRatio: `1 / ${page.aspect}` }}
                onPointerDown={e => {
                  if (!addingZone) return;
                  const point = zonePoint(e);
                  zoneStart.current = point;
                  setZoneDraft({ x0: point.x, y0: point.y, x1: point.x, y1: point.y });
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                }}
                onPointerMove={e => {
                  const start = zoneStart.current;
                  if (!addingZone || !start) return;
                  const end = zonePoint(e);
                  setZoneDraft({ x0: Math.min(start.x, end.x), y0: Math.min(start.y, end.y),
                    x1: Math.max(start.x, end.x), y1: Math.max(start.y, end.y) });
                }}
                onPointerUp={e => { if (addingZone) finishMissingZone(e); }}
                onPointerCancel={() => { zoneStart.current = null; setZoneDraft(null); }}
              >
                <img src={page.thumb} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-fill" draggable={false} />
                {pageBlocks.map((b) => (
                  <div key={b.id}>
                    <div
                      className="pointer-events-none absolute border-2 border-accent bg-accent/15"
                      style={{ left: `${b.x0}%`, top: `${b.y0}%`, width: `${b.x1 - b.x0}%`, height: `${b.y1 - b.y0}%` }}
                    />
                    <span
                      className="pointer-events-none absolute z-10 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white"
                      style={{ left: `${b.x0}%`, top: `calc(${b.y0}% - 18px)` }}
                    >
                      P.{b.page} · {b.cols}×{b.rows}
                    </span>
                  </div>
                ))}
                {addingZone && zoneDraft && (
                  <div className="pointer-events-none absolute z-30 border-2 border-[#30d158] bg-[#30d158]/15"
                    style={{ left: zoneDraft.x0 + "%", top: zoneDraft.y0 + "%",
                      width: zoneDraft.x1 - zoneDraft.x0 + "%", height: zoneDraft.y1 - zoneDraft.y0 + "%" }} />
                )}
              </div>
              {addingZone && <p className="mt-2 text-xs text-[#30d158]">Tracez un rectangle autour de la partie oubliée du PDF.</p>}
            </div>
            <aside className="lg:w-[42%]">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold">Blocs de la page {pageN}</h3>
              </div>
              <button type="button" className="btn-quiet mb-3 min-h-10 w-full"
                aria-pressed={addingZone}
                onClick={() => { setAddingZone(!addingZone); setZoneDraft(null); zoneStart.current = null; }}>
                {addingZone ? "Annuler le tracé" : "+ Récupérer une zone manquante"}
              </button>
              <p className="mb-3 text-xs text-label-3">Si une partie du dessin est oubliée, dessinez-la sur l'image à gauche, puis corrigez ses dimensions en cases ci-dessous. Une zone ajoutée utilise la lecture par image et conserve les autres blocs.</p>
              <div className="space-y-2">
                {pageBlocks.map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2 rounded-[12px] bg-white/5 px-3 py-2">
                    <span className="text-[12px] font-medium">Bloc {i + 1}</span>
                    <input
                      type="number"
                      className="field ml-auto w-[62px] min-h-[32px] text-[12px]"
                      value={b.cols}
                      onChange={(e) =>
                        setBlocks((all) => all.map((v) => (v.id === b.id ? { ...v, cols: clampInt(e.target.value, 5, 400, v.cols) } : v)))
                      }
                      aria-label="Colonnes"
                    />
                    <span>×</span>
                    <input
                      type="number"
                      className="field w-[62px] min-h-[32px] text-[12px]"
                      value={b.rows}
                      onChange={(e) =>
                        setBlocks((all) => all.map((v) => (v.id === b.id ? { ...v, rows: clampInt(e.target.value, 5, 400, v.rows) } : v)))
                      }
                      aria-label="Rangées"
                    />
                  </div>
                ))}
              </div>
              <div className={`mt-4 flex gap-2 ${stick}`}>
                <button className="btn-quiet flex-1" onClick={() => setStage(0)}>
                  Retour
                </button>
                <button className="btn-primary flex-1" disabled={!effective.length} onClick={() => { setCenterTab(studioEmbedded ? "puzzle" : (mode === "vecteur" ? "preview" : "puzzle")); setStage(2); }}>
                  Monter le puzzle →
                </button>
              </div>
            </aside>
          </section>
        )}

        {/* Étape 3 : LE GRAND TABLEAU DE MONTAGE MAGNÉTIQUE AU CENTRE */}
        {stage === 2 && (
          <section className="mx-auto flex h-[calc(100vh-140px)] max-w-[1400px] flex-col gap-4 lg:flex-row">
            {/* Colonne centrale : le puzzle magnétique ou l'aperçu broderie */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Barre de commutation de vue centrale */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="seg" role="group" aria-label="Affichage central">
                  <button
                    type="button"
                    aria-pressed={centerTab === "puzzle"}
                    onClick={() => setCenterTab("puzzle")}
                    className="flex items-center gap-1.5 px-3 py-1.5"
                  >
                    <Grid3x3 size={15} />
                    Table de montage magnétique (Puzzle)
                  </button>
                  <button
                    type="button"
                    aria-pressed={centerTab === "preview"}
                    onClick={() => setCenterTab("preview")}
                    className="flex items-center gap-1.5 px-3 py-1.5"
                  >
                    Aperçu broderie unifiée
                  </button>
                </div>

                {centerTab === "puzzle" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-icon h-8 w-8"
                      onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                      aria-label="Zoom arrière"
                    >
                      <ZoomOut size={15} />
                    </button>
                    <span className="font-mono text-[11px] text-label-3">{Math.round(zoom * 100)}%</span>
                    <button
                      type="button"
                      className="btn-icon h-8 w-8"
                      onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                      aria-label="Zoom avant"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <span className="mx-1 h-4 w-px bg-white/10" />
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={resetToDefault}
                      title="Réaligner tous les blocs en mosaïque"
                    >
                      <Undo2 size={13} />
                      Réaligner
                    </button>
                  </div>
                )}
              </div>

              {/* Vue 1 : LA TABLE DE MONTAGE MAGNÉTIQUE CENTRALE */}
              {centerTab === "puzzle" && (
                <div
                  ref={tableRef}
                  className="relative flex flex-1 items-center justify-center overflow-auto rounded-[18px] border border-white/10 bg-[#161619] p-4 shadow-2xl"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "24px 24px, 12px 12px",
                  }}
                  onPointerMove={onPointerMoveTile}
                  onPointerUp={onPointerUpTile}
                  onPointerCancel={onPointerUpTile}
                >
                  {/* Plateau d'assemblage magnétique dimensionné en points de broderie */}
                  <div
                    className="relative rounded-[12px] bg-[#222227] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/15"
                    style={{
                      width: `${boardSize.w * tableScale}px`,
                      height: `${boardSize.h * tableScale}px`,
                      minWidth: "280px",
                      minHeight: "280px",
                    }}
                  >
                    {/* Grille de repère magnétique en fond */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)`,
                        backgroundSize: `${10 * tableScale}px ${10 * tableScale}px`,
                      }}
                    />

                    {/* Guides d'aimantage magnétiques */}
                    {snapGuides?.x !== undefined && (
                      <div
                        className="pointer-events-none absolute top-0 bottom-0 z-30 w-[2px] bg-[#30d158] shadow-[0_0_8px_#30d158]"
                        style={{ left: `${snapGuides.x * tableScale}px` }}
                      />
                    )}
                    {snapGuides?.y !== undefined && (
                      <div
                        className="pointer-events-none absolute right-0 left-0 z-30 h-[2px] bg-[#30d158] shadow-[0_0_8px_#30d158]"
                        style={{ top: `${snapGuides.y * tableScale}px` }}
                      />
                    )}

                    {/* VRAIES PAGES / TILES DE BRODERIE DRAGGABLES */}
                    {tileLayout.map(({ b, x, y, w: tw, h: th }) => {
                      const pageObj = analysis?.pages.find((p) => p.n === b.page);
                      const isDragging = activeDragId === b.id;
                      const cropW = Math.max(1, b.x1 - b.x0);
                      const cropH = Math.max(1, b.y1 - b.y0);

                      return (
                        <div
                          key={b.id}
                          onPointerDown={(e) => onPointerDownTile(e, b)}
                          className={`group absolute select-none rounded-[8px] bg-white text-black transition-shadow ${
                            isDragging
                              ? "z-40 cursor-grabbing shadow-[0_24px_48px_rgba(0,0,0,0.8)] ring-2 ring-accent scale-[1.02]"
                              : "z-20 cursor-grab shadow-md hover:shadow-xl hover:ring-2 hover:ring-white/60"
                          }`}
                          style={{
                            left: `${x * tableScale}px`,
                            top: `${y * tableScale}px`,
                            width: `${tw * tableScale}px`,
                            height: `${th * tableScale}px`,
                            touchAction: "none",
                          }}
                        >
                          {/* L'IMAGE EXACTE DE LA GRILLE DE CETTE PAGE */}
                          <div className="relative h-full w-full overflow-hidden rounded-[7px] bg-white">
                            {pageObj?.thumb && (
                              <img
                                src={pageObj.thumb}
                                alt={`Page ${b.page}`}
                                draggable={false}
                                className="pointer-events-none absolute max-w-none select-none"
                                style={{
                                  left: `-${(b.x0 / cropW) * 100}%`,
                                  top: `-${(b.y0 / cropH) * 100}%`,
                                  width: `${(100 / cropW) * 100}%`,
                                  height: `${(100 / cropH) * 100}%`,
                                  objectFit: "fill",
                                }}
                              />
                            )}

                            {/* Badge titre de page flottant */}
                            <div className="pointer-events-none absolute top-1.5 left-1.5 z-20 flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-white backdrop-blur">
                              <span className="font-mono text-[10px] font-bold">P.{b.page}</span>
                              <span className="text-[9px] text-white/60">
                                {tw}×{th}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vue 2 : Aperçu broderie unifiée */}
              {centerTab === "preview" && (
                <div className="grid flex-1 place-items-center overflow-hidden rounded-[18px] bg-white p-4 shadow-2xl">
                  {preview ? (
                    <img src={preview} className="max-h-[68vh] w-full object-contain" alt="Grille reconstituée" />
                  ) : (
                    <p className="text-[13px] text-black/50">{busy || "Génération de l'aperçu…"}</p>
                  )}
                </div>
              )}

              {assembled && (
                <div className="mt-2 flex items-center justify-between px-1 text-[12px] text-label-3">
                  <span className="font-mono">
                    Grille finale : {assembled.fitW} × {assembled.fitH} points · {assembled.pattern.palette.length} couleurs DMC · {assembled.blocks} blocs assemblés
                  </span>
                  {assembled.scaled && <span className="text-accent-2">Adapté pour l'atelier (&lt;1000 pts)</span>}
                </div>
              )}
            </div>

            {/* Sidebar de contrôle droite */}
            <aside className="w-full space-y-4 lg:w-[320px] lg:shrink-0">
              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Disposition en mosaïque</h3>
                <p className="mb-2.5 text-[11.5px] leading-relaxed text-label-3">
                  Alignez vos pages en un clic selon l'organisation de votre patron (ex. 3 colonnes pour 12 pages) :
                </p>
                <div className="seg mb-3" role="group" aria-label="Colonnes mosaïque">
                  {[2, 3, 4, 6].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      aria-pressed={perRow === cols}
                      onClick={() => arrangeMosaic(cols)}
                    >
                      {cols} col.
                    </button>
                  ))}
                </div>

                <div className="space-y-2 border-t border-white/10 pt-2.5">
                  <label className="flex items-center justify-between text-[12px] text-label-2">
                    <span>Mosaïque à tailles égales</span>
                    <input
                      type="checkbox"
                      checked={uniformSizes}
                      onChange={(e) => setUniformSizes(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                  <label className="flex items-center justify-between text-[12px] text-label-2">
                    <span className="flex items-center gap-1.5">
                      <Magnet size={13} className="text-[#30d158]" />
                      Aimantage aux bords
                    </span>
                    <input
                      type="checkbox"
                      checked={magnet}
                      onChange={(e) => setMagnet(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Ordre des cartes du puzzle</h3>
                <p className="mb-2 text-[11px] text-label-3">Glissez les cartes pour les réordonner (ou utilisez les flèches). Ajustez ensuite les positions sur le tableau magnétique.</p>
                <div className="max-h-48 space-y-1 overflow-y-auto">
                  {effective.map((b, i) => (
                    <div key={b.id} draggable
                      onDragStart={e => { draggedCard.current = b.id; e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={e => { if (draggedCard.current) e.preventDefault(); }}
                      onDrop={e => {
                        e.preventDefault();
                        const from = effective.findIndex(x => x.id === draggedCard.current);
                        if (from >= 0) moveCard(from, i - from);
                        draggedCard.current = null;
                      }}
                      onDragEnd={() => { draggedCard.current = null; }}
                      className="flex cursor-grab items-center gap-2 rounded-md border border-white/10 bg-black/15 p-2 active:cursor-grabbing">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-white/10 text-[11px]">{i + 1}</span>
                      {analysis?.pages.find(p => p.n === b.page)?.thumb && (
                        <img src={analysis.pages.find(p => p.n === b.page)!.thumb}
                          className="h-10 w-8 shrink-0 rounded-sm bg-white object-cover" alt={`Aperçu page ${b.page}`} draggable={false} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs">Page {b.page} · {b.cols} × {b.rows}</span>
                      <button type="button" disabled={i === 0} className="px-2 py-1 text-xs disabled:opacity-20" aria-label={`Monter la carte ${i + 1}`} onClick={() => moveCard(i, -1)}>↑</button>
                      <button type="button" disabled={i === effective.length - 1} className="px-2 py-1 text-xs disabled:opacity-20" aria-label={`Descendre la carte ${i + 1}`} onClick={() => moveCard(i, 1)}>↓</button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Lecture des points</h3>
                <div className="seg mb-2">
                  {(vector?.ok || completeGlyph?.ok) && (
                    <button type="button" aria-pressed={mode === "vecteur"} onClick={() => { setMode("vecteur"); setCenterTab("preview"); }}>
                      DMC exacts
                    </button>
                  )}
                  <button type="button" aria-pressed={mode === "auto"} onClick={() => setMode("auto")}>
                    Automatique
                  </button>
                  <button type="button" aria-pressed={mode === "photo"} onClick={() => setMode("photo")}>
                    Photo
                  </button>
                </div>
                <p className="text-[11.5px] leading-relaxed text-label-3">
                  {mode === "vecteur"
                    ? "Codes DMC de la légende et symboles vectoriels. Dès qu’une carte est déplacée, la lecture automatique prend le relais pour respecter les positions magnétiques. Vérifiez les codes obtenus."
                    : mode === "auto"
                      ? "Associe les symboles lisibles à la légende DMC ; pour les cases visiblement colorées, propose le fil le plus proche."
                      : "Photographie couleur : estimation des références DMC à partir des pixels imprimés. À vérifier avant de broder."}
                </p>
                {mode === "photo" && (
                  <div className="mt-2.5">
                    <label className="text-[11.5px] text-label-3">
                      Couleurs max ({colors})
                      <input
                        type="range"
                        min={2}
                        max={60}
                        value={colors}
                        onChange={(e) => setColors(Number(e.target.value))}
                        className="mt-1 w-full"
                      />
                    </label>
                  </div>
                )}
              </section>

              {assembled && correctedPattern && (
                <section className="rounded-[14px] bg-white/5 p-3.5" aria-label="Couleurs DMC reconnues">
                  <h3 className="mb-2 text-[13px] font-semibold">Couleurs et codes DMC</h3>
                  <p className="text-[11px] leading-relaxed text-label-3">
                    {assembled.byLegend} points liés à la légende · {assembled.byColor} points estimés par couleur.
                    {assembled.unresolved > 0 && ` ${assembled.unresolved} symbole(s) sans code reconnu, laissés vides.`}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-label-3">
                    {assembled.source === "vecteur"
                      ? "Codes extraits de la légende PDF et de toutes les cases, sans estimation de couleur. Vérifiez le placement des pages."
                      : "Couleurs d'image approximatives : vérifiez la légende du PDF avant d'accepter."}
                  </p>
                  <div className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-1">
                    {detectedColors.map(([idx, count]) => {
                      const floss = FLOSS[idx];
                      if (!floss) return null;
                      const suggestion = closestDmcAlternatives(idx, 3);
                      const selected = corrections[floss.code] ?? floss.code;
                      const valid = flossIndex(selected.toUpperCase().trim()) >= 0;
                      return (
                        <div key={floss.code} className="rounded-md border border-white/10 bg-white/5 p-2.5">
                          <div className="mb-2 flex items-center gap-2 text-[12px]">
                            <span className="h-5 w-5 shrink-0 rounded-sm border border-white/20" style={{ backgroundColor: FLOSS[flossIndex(valid ? selected.toUpperCase().trim() : floss.code)]?.hex ?? floss.hex }} />
                            <span className="min-w-0 flex-1 truncate">DMC {floss.code} · {floss.name}</span>
                            <span className="text-[11px] text-label-3">{count} pts</span>
                          </div>
                          <label className="block text-[11px] text-label-3">
                            Remplacer par code DMC
                            <input
                              value={selected}
                              onChange={e => setCorrections(previous => ({ ...previous, [floss.code]: e.target.value.toUpperCase().trim() }))}
                              className={`field mt-1 min-h-9 w-full text-[12px] ${valid ? "" : "border-[#ff9f0a]"}`}
                              aria-label={`Code DMC de remplacement pour ${floss.code}`}
                            />
                          </label>
                          {!valid && <p className="mt-1 text-[11px] text-[#ffbd70]">Code non reconnu, couleur originale conservée.</p>}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {suggestion.map(s => (
                              <button key={s.idx} type="button" className="flex items-center gap-1 rounded border border-white/15 px-1.5 py-1 text-[11px] text-label-2"
                                title={`Couleur proche de DMC ${floss.code}, écart CIEDE2000 ${s.deltaE.toFixed(1)}`}
                                onClick={() => setCorrections(previous => ({ ...previous, [floss.code]: FLOSS[s.idx].code }))}>
                                <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: FLOSS[s.idx].hex }} />
                                {FLOSS[s.idx].code}
                              </button>
                            ))}
                            {selected !== floss.code && <button type="button" className="px-1 text-[11px] text-accent-2" onClick={() => setCorrections(previous => ({ ...previous, [floss.code]: floss.code }))}>Rétablir</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="rounded-[14px] bg-white/5 p-3.5">
                <h3 className="mb-2 text-[13px] font-semibold">Auteur et droits</h3>
                <input
                  className="field"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Créateur ou boutique (ex. Light Unicorn Designs)"
                />
                <label className="mt-2.5 flex items-start gap-2 text-[11px] leading-relaxed text-label-3">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <span>Usage personnel. Conserve la mention de licence et d'auteur dans le patron.</span>
                </label>
              </section>

              <div className={`flex gap-2 pt-1 ${stick}`}>
                <button type="button" className="btn-quiet flex-1" onClick={() => setStage(1)}>
                  Calage
                </button>
                <button
                  type="button"
                  className="btn-primary flex-1"
                  disabled={!assembled || !!busy}
                  onClick={commit}
                >
                  <Check size={16} />
                  Importer
                </button>
              </div>
            </aside>
          </section>
        )}

        {busy && (
          <div className="sticky bottom-3 mt-4 flex justify-center">
            <div className="glass-strong flex items-center gap-3 rounded-full px-5 py-2.5 text-[13px]" role="status">
              <span className="spinner" />
              {busy}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function clampInt(raw: string | number, min: number, max: number, fallback: number) {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function autoOrder(blocks: PdfBlock[]) {
  return [...blocks].sort((a, b) => a.page - b.page || a.y0 - b.y0 || a.x0 - b.x0);
}

export function assembleFromTileLayout(
  list: Placed[],
  layout: { b: PdfBlock; x: number; y: number; w: number; h: number }[],
  name: string,
): Assembled {
  if (!list.length) throw new Error("Aucun bloc à assembler.");
  let maxX = 1;
  let maxY = 1;
  let byColor = 0;
  let byLegend = 0;
  let unresolved = 0;

  for (const t of layout) {
    maxX = Math.max(maxX, t.x + t.w);
    maxY = Math.max(maxY, t.y + t.h);
  }
  for (const p of list) {
    byColor += p.data.byColor;
    byLegend += p.data.byLegend;
    unresolved += p.data.unresolved;
  }

  // Ne pas tronquer AVANT fitGrid : autrement les dernières pages
  // sont repliées sur la bordure et des zones entières disparaissent.
  const W = Math.max(1, Math.ceil(maxX));
  const H = Math.max(1, Math.ceil(maxY));
  if (W * H > 8_000_000) throw new Error("Grille trop grande : réduisez les blocs ou le nombre de pages.");
  const raw = new Int16Array(W * H).fill(-1);

  for (const p of list) {
    const t = layout.find((item) => item.b.id === p.b.id);
    if (!t) continue;
    // Une carte peut être ajustée à des dimensions communes. Si c'est
    // le cas, rééchantillonner ses cellules de façon explicite, sans trou.
    for (let r = 0; r < t.h; r++) {
      for (let c = 0; c < t.w; c++) {
        const srcX = Math.min(p.b.cols - 1, Math.floor(c * p.b.cols / t.w));
        const srcY = Math.min(p.b.rows - 1, Math.floor(r * p.b.rows / t.h));
        const gx = t.x + c;
        const gy = t.y + r;
        if (gx < 0 || gy < 0 || gx >= W || gy >= H) continue;
        const value = p.data.cells[srcY * p.b.cols + srcX];
        if (value >= 0) raw[gy * W + gx] = value;
      }
    }
  }

  const fit = fitGrid(raw, W, H);
  const pattern = createPattern(name || "Patron PDF", fit.w, fit.h);
  pattern.cross = fit.cells;
  for (const v of new Set(fit.cells)) if (v >= 0) ensurePalette(pattern, v);

  return {
    pattern,
    rawW: maxX,
    rawH: maxY,
    fitW: fit.w,
    fitH: fit.h,
    scaled: fit.scaled,
    blocks: list.length,
    byColor,
    byLegend,
    unresolved,
    source: "image",
  };
}

function renderPreview(p: Pattern) {
  const scale = Math.max(1, Math.min(4, Math.floor(1100 / p.w), Math.floor(850 / p.h)));
  const c = document.createElement("canvas");
  c.width = p.w * scale;
  c.height = p.h * scale;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f7f2e8";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < p.cross.length; i++) {
    const v = p.cross[i];
    if (v < 0) continue;
    ctx.fillStyle = FLOSS[v]?.hex ?? "#777";
    ctx.fillRect((i % p.w) * scale, Math.floor(i / p.w) * scale, scale, scale);
  }
  return c.toDataURL("image/png");
}

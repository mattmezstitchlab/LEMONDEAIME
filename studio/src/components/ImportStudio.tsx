import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ScanLine } from "lucide-react";
import { BASE_FLOSS, flossIndex } from "../lib/dmc";
import { asyncRasterToCells, loadImage, sizeFromRatio } from "../lib/convert";
import { openPdf, type PdfHandle } from "../lib/pdfimport";
import { detectGrid, recognizeChart, recognizedPattern, type Corners, type Recognition } from "../lib/chartRecognition";
import { createPattern, type Pattern } from "../lib/pattern";
import { pasteSelection, resizePattern } from "../lib/editing";
import Sheet from "./Sheet";

export default function ImportStudio({ file, onClose, onImport }: { file: File; onClose: () => void; onImport: (p: Pattern) => void }) {
  const pdf = useRef<PdfHandle | null>(null), raster = useRef<HTMLCanvasElement | null>(null);
  const [page, setPage] = useState(1), [pages, setPages] = useState(1), [preview, setPreview] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [mode, setMode] = useState<"photo" | "symbols" | "colors">(file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? "symbols" : "photo");
  const [corners, setCorners] = useState<Corners>([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }]);
  const [w, setW] = useState(80), [h, setH] = useState(80), [colors, setColors] = useState(24), [clean, setClean] = useState(false), [white, setWhite] = useState(true), [pixelArt, setPixelArt] = useState(false);
  const [result, setResult] = useState<Recognition | null>(null), [tiles, setTiles] = useState<Pattern | null>(null), [tileX, setTileX] = useState(0), [tileY, setTileY] = useState(0), [author, setAuthor] = useState(""), [authorized, setAuthorized] = useState(false);

  const renderPage = async (n: number) => {
    if (!pdf.current) return; setBusy(true); setError("");
    try { const c = await pdf.current.render(n, 1600); raster.current = c; setPreview(c.toDataURL("image/jpeg", .8)); setPage(n); setResult(null); } catch { setError("Impossible de lire cette page."); } finally { setBusy(false); }
  };
  useEffect(() => {
    let live = true;
    const load = async () => {
      setBusy(true);
      try {
        if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
          const handle = await openPdf(file); if (!live) { handle.destroy(); return; } pdf.current = handle; setPages(handle.pages);
          const startPage = file.name.startsWith("guide--") ? Math.min(3, handle.pages) : 1;
          const c = await handle.render(startPage, 1600); if (live) { raster.current = c; setPreview(c.toDataURL("image/jpeg", .8)); setPage(startPage); if (startPage > 1) { setW(40); setH(40); const grid = detectGrid(c); if (grid) { setCorners(grid.corners); setW(grid.cols); setH(grid.rows); } } }
        } else {
          const img = await loadImage(file), c = document.createElement("canvas");
          const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
          c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale); c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
          if (live) { raster.current = c; setPreview(c.toDataURL("image/jpeg", .8)); setH(sizeFromRatio(c.width, c.height, 80).h); }
        }
      } catch { if (live) setError("Ce fichier ne peut pas être lu. Essayez un PDF non protégé, PNG ou JPEG."); } finally { if (live) setBusy(false); }
    };
    void load(); return () => { live = false; pdf.current?.destroy(); };
  }, [file]);
  const analyze = async () => {
    if (!raster.current) return; setBusy(true); setError("");
    try {
      if (mode === "photo") {
        const p = createPattern(file.name.replace(/\.[^.]+$/, ""), w, h);
        const v = await asyncRasterToCells(raster.current, w, h, { maxColors: colors, dropWhite: white, confetti: clean, pixelArt }); p.cross = v.cross; p.palette = v.palette;
        setTiles(p); setResult(null);
      } else setResult(await recognizeChart(raster.current, corners, w, h, mode));
    } catch (e) { setError(e instanceof Error ? e.message : "Analyse impossible"); } finally { setBusy(false); }
  };
  const addTile = () => {
    if (!result) return;
    if (result.groups.some((g) => g.code.trim() && flossIndex(g.code) < 0)) { setError("Un code saisi n’existe pas dans le nuancier documenté. Corrigez-le avant d’ajouter la page."); return; }
    const p = recognizedPattern(result, file.name.replace(/\.[^.]+$/, ""), 14);
    const base = tiles ? resizePattern(tiles, Math.max(tiles.w, tileX + w), Math.max(tiles.h, tileY + h), false) : createPattern(p.name, tileX + w, tileY + h);
    setTiles(pasteSelection(base, p, tileX, tileY)); setResult(null);
  };
  const commit = () => {
    if (!tiles) return;
    onImport({ ...tiles, provenance: { kind: pdf.current ? "pdf" : "image", source: file.name, author, personalOnly: !authorized, license: authorized ? "Droits de redistribution déclarés par l’utilisateur" : "Import tiers : usage personnel uniquement" }, reference: preview });
  };
  return <Sheet open onClose={onClose} title="Import contrôlé" subtitle={file.name} toolbar={<div className="flex items-center justify-between"><span className="text-[12px] text-label-2">{tiles ? `${tiles.w} × ${tiles.h} cases préparées` : "Aucun patron remplacé avant validation"}</span><button className="btn-tinted" disabled={!tiles || busy} onClick={commit}><Check size={15} />Valider</button></div>}>
    {preview && <div className="relative mb-3 overflow-hidden rounded-[12px] bg-white"><img src={preview} className="max-h-[270px] w-full object-contain" alt={`Page ${page} à calibrer`} /><p className="bg-black px-3 py-2 text-[11px] text-label-2">Vérifiez les quatre coins, les dimensions et la légende avant conversion.</p></div>}
    {pages > 1 && <div className="mb-3 flex items-center justify-between"><button className="btn-icon" disabled={page === 1 || busy} onClick={() => void renderPage(page - 1)} aria-label="Page précédente"><ChevronLeft size={18} /></button><span className="text-[13px]">Page {page} / {pages}</span><button className="btn-icon" disabled={page === pages || busy} onClick={() => void renderPage(page + 1)} aria-label="Page suivante"><ChevronRight size={18} /></button></div>}
    <div className="seg mb-4">{(["photo", "symbols", "colors"] as const).map((v) => <button key={v} aria-pressed={mode === v} onClick={() => { setMode(v); setResult(null); }}>{v === "photo" ? "Image" : v === "symbols" ? "Symboles" : "Grille couleur"}</button>)}</div>
    <div className="grid grid-cols-2 gap-3"><Number label="Colonnes exactes" value={w} onChange={setW} min={1} max={mode === "photo" ? 1000 : 300} /><Number label="Rangées exactes" value={h} onChange={setH} min={1} max={mode === "photo" ? 1000 : 300} /></div>
    {mode !== "photo" && <><button className="my-3 flex items-center gap-2 text-[13px] text-accent-2" onClick={() => { if (!raster.current) return; const v = detectGrid(raster.current); if (v) { setCorners(v.corners); setW(v.cols); setH(v.rows); } else setError("Grille non détectée. Calibrez manuellement les coins."); }}><ScanLine size={16} />Proposer un cadrage automatique</button>
      <div className="group-card p-3"><p className="mb-2 text-[12px] text-label-2">Coins de la grille, en % de l’image. Corrige aussi la perspective.</p>{corners.map((v, i) => <div key={i} className="mb-2 grid grid-cols-[60px_1fr_1fr] items-center gap-2"><span className="text-[11px] text-label-3">{["Haut G.", "Haut D.", "Bas D.", "Bas G."][i]}</span>{(["x", "y"] as const).map((k) => <input key={k} className="field min-w-0" aria-label={`Coin ${i + 1}, ${k}`} type="number" min={0} max={100} step={.1} value={+v[k].toFixed(2)} onChange={(e) => setCorners(corners.map((c, n) => n === i ? { ...c, [k]: Math.min(100, Math.max(0, +e.target.value)) } : c) as Corners)} />)}</div>)}</div></>}
    {mode === "photo" && <div className="mt-3 space-y-3"><Number label="Fils maximum" value={colors} min={2} max={150} onChange={setColors} /><label className="flex items-center justify-between text-[13px]">Pixel art, un pixel par point<input type="checkbox" checked={pixelArt} onChange={(e) => { const enabled = e.target.checked; if (enabled && raster.current) { if (raster.current.width > 1000 || raster.current.height > 1000) { setError("Recadrez l’image à 1000 pixels maximum pour le mode 1:1."); return; } setW(raster.current.width); setH(raster.current.height); setClean(false); } setPixelArt(enabled); }} /></label><label className="flex items-center justify-between text-[13px]">Laisser le blanc non brodé<input type="checkbox" checked={white} onChange={(e) => setWhite(e.target.checked)} /></label><label className="flex items-center justify-between text-[13px]">Anti-confetti (modifie les détails)<input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} /></label></div>}
    <button className="btn-primary mt-4 w-full" disabled={busy || !preview} onClick={() => void analyze()}>{busy ? "Analyse en cours…" : mode === "photo" ? "Préparer la grille" : "Détecter les groupes"}</button>
    {result && <section className="mt-5"><h3 className="font-semibold">Vérifier les fils de la légende</h3><p className="mt-1 text-[12px] leading-relaxed text-label-3">Chaque forme détectée doit être associée au code de votre légende. Aucun code n’est inventé. Laissez vide les éléments à ignorer.</p><datalist id="import-dmc">{BASE_FLOSS.map((f) => <option key={f.code} value={f.code}>{f.name}</option>)}</datalist>
      <div className="mt-3 max-h-[250px] overflow-y-auto">{result.groups.map((g) => <div key={g.id} className="flex items-center gap-3 border-b border-white/10 py-2"><img src={g.preview} className="h-9 w-9 rounded-[6px] bg-white [image-rendering:pixelated]" alt={`Symbole détecté ${g.id + 1}`} /><span className="flex-1 text-[12px] text-label-3">{g.count} cases</span><input className="field w-[115px]" list="import-dmc" placeholder="Code DMC" aria-label={`DMC du symbole ${g.id + 1}`} value={g.code} onChange={(e) => setResult({ ...result, groups: result.groups.map((v) => v.id === g.id ? { ...v, code: e.target.value } : v) })} /></div>)}</div>
      <div className="my-3 grid grid-cols-2 gap-3"><Number label="Décalage colonne" value={tileX} min={0} max={700} onChange={setTileX} /><Number label="Décalage rangée" value={tileY} min={0} max={700} onChange={setTileY} /></div><button className="btn-tinted w-full" onClick={addTile}>Ajouter cette page à la grille continue</button></section>}
    <label className="mt-5 block text-[12px] text-label-2">Auteur / créatrice<input className="field mt-2" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="À conserver depuis le PDF original" /></label>
    <label className="mt-3 flex items-start gap-2 text-[12px] leading-relaxed text-label-2"><input className="mt-1" type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />Je suis l’auteur de l’image ou je possède une autorisation explicite de redistribution.</label>
    <p className="mt-3 text-[12px] leading-relaxed text-label-3">Par défaut, un import est réservé à l’usage personnel. La reconnaissance est une aide contrôlée, pas une compatibilité universelle. Les contours, perles et fractions du PDF doivent être vérifiés et complétés manuellement.</p>
    {error && <p role="alert" className="mt-3 text-[13px] text-danger">{error}</p>}
  </Sheet>;
}
function Number({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) { return <label className="block text-[12px] text-label-2">{label}<input type="number" min={min} max={max} className="field mt-1" value={value} onChange={(e) => onChange(Math.max(min, Math.min(max, Math.round(+e.target.value))))} /></label>; }
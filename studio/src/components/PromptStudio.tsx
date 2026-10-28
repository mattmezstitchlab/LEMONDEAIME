import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Dices, Sparkles, Wand2, WandSparkles, X } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import { imageToDmc } from "../lib/dither";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import {
  DETAILS,
  FORMATS,
  STYLES,
  buildPrompt,
  gridHeightFor,
  requestedColorLimit,
  type DetailId,
  type FormatId,
  type StyleId,
} from "../lib/promptcraft";
import { loadRemoteImage } from "../lib/convert";

const DETAILS_DEFAULTS: Record<DetailId, number> = { delicat: 24, equilibre: 40, tres: 64 };
const EXAMPLES = [
  "abeille sur une fleur tournesol",
  "chat persan endormi",
  "village pastoral avec maisons de couleurs",
  "pissenlit blanc au vent",
  "chaton tigré assis",
];

/**
 * Génération d'un motif de point de croix à partir d'une description.
 * Image générée (Pollinations / Flux) → conversion réaliste par dithering vers la palette DMC.
 */
export default function PromptStudio({ onClose, onImport, initialPrompt = "", embedded = false }: { onClose: () => void; onImport: (p: Pattern) => void; initialPrompt?: string; embedded?: boolean }) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [main, setMain] = useState("");
  const [second, setSecond] = useState("");
  const [relation, setRelation] = useState("");
  const [style, setStyle] = useState<StyleId>("description");
  const [detail, setDetail] = useState<DetailId>("tres");
  const [format, setFormat] = useState<FormatId>("carre");
  const [mode, setMode] = useState<"dither" | "flat">("dither");
  const [size, setSize] = useState(240);
  const [colors, setColors] = useState(DETAILS_DEFAULTS.tres);
  const [dropWhite, setDropWhite] = useState(false);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [accessCode, setAccessCode] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [imgUrl, setImgUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);


  useEffect(() => {
    // Never validate an image produced for an earlier description.
    imgRef.current = null; setImgUrl(""); setPattern(null); setPreview("");
  }, [prompt, main, second, relation, style, detail, format]);
  useEffect(() => { setPattern(null); setPreview(""); }, [size, colors, mode, dropWhite]);

  const chooseDetail = (d: DetailId) => {
    setDetail(d);
    setColors(DETAILS_DEFAULTS[d]);
  };

  const fullPrompt = () =>
    buildPrompt({ subject: prompt, main, second, relation, style, detail, format });

  const generate = async (seedValue = seed) => {
    if (prompt.trim().length < 3) {
      setError("Décrivez le motif en quelques mots (sujet, couleurs, ambiance).");
      return;
    }
    setBusy("Génération authentifiée de l’image…");
    setError("");
    setPattern(null);
    setPreview("");
    setImgUrl(""); imgRef.current = null;
    try {
      const limit = requestedColorLimit(prompt) ?? colors;
      const f = FORMATS.find(f => f.id === format)!;
      const response = await fetch("/api/pattern-generate", {
        method: "POST", headers: { "Content-Type": "application/json", "x-generation-code": accessCode },
        body: JSON.stringify({ prompt: fullPrompt(), width: f.w, height: f.h, seed: seedValue }),
        signal: AbortSignal.timeout(65000),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Le service de génération n’a pas répondu.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      let img: HTMLImageElement;
      try { img = await loadRemoteImage(objectUrl); } finally { URL.revokeObjectURL(objectUrl); }
      // A durable local data URL keeps the source preview independent of the provider.
      const source = document.createElement("canvas");
      source.width = img.naturalWidth || f.w; source.height = img.naturalHeight || f.h;
      source.getContext("2d")!.drawImage(img, 0, 0);
      const sourcePreview = source.toDataURL("image/png");
      imgRef.current = img;
      setImgUrl(sourcePreview);
      await convert(img, limit);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Génération indisponible.");
    } finally {
      setBusy("");
    }
  };

  const variant = () => {
    const next = Math.floor(Math.random() * 1000000);
    setSeed(next);
    void generate(next);
  };

  const convert = async (source?: HTMLImageElement, limit?: number) => {
    const img = source ?? imgRef.current;
    if (!img) return;
    setBusy("Conversion réaliste en grille DMC…");
    setError("");
    try {
      const gridH = gridHeightFor(size, format);
      const { cross, palette } = imageToDmc(img, size, gridH, { mode, maxColors: limit ?? requestedColorLimit(prompt) ?? colors, dropWhite });
      const p = createPattern(prompt.trim().slice(0, 60) || "Motif généré", size, gridH, 14, 2);
      p.cross = cross;
      for (const v of palette) ensurePalette(p, v);
      p.provenance = {
        kind: "image",
        source: "Image générée (Pollinations / Flux), conversion dithering",
        author: "",
        license: "Création assistée par IA : vérifiez l'originalité avant toute diffusion",
        personalOnly: false,
      };
      p.notes = `Description : « ${prompt.trim()} ». ${size} × ${gridH}, ${palette.length} fils, ${mode === "dither" ? "dégradés dithering (réaliste)" : "aplats"}.`;
      setPattern(p);
      setPreview(renderPreview(p));
      if (embedded) onImport(p);
    } catch {
      setError("Conversion impossible sur cet appareil.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className={`glass-strong fixed ${embedded ? "left-0 top-[58px] bottom-[94px] z-[35] w-[min(354px,calc(100vw-20px))] border-r border-white/15 rounded-r-2xl" : "inset-0 z-[75]"} flex flex-col bg-[#141517]`} role="dialog" aria-modal="true" aria-label="Générer dans le studio">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-3 py-3">
        <button type="button" className="btn-icon" onClick={onClose} disabled={!!busy} aria-label="Fermer">
          <X size={18} />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-[16px] leading-tight font-semibold">Générer dans mon ouvrage</h2>
          {!embedded && <p className="truncate text-[12px] text-label-3">Description → image et grille DMC en une seule génération</p>}
        </div>
      </header>

      <main className={`thin-scroll min-h-0 flex-1 overflow-y-auto ${embedded ? "p-3" : "p-4 md:p-6"}`}>
        <section className={`mx-auto flex flex-col gap-4 ${embedded ? "w-full" : "max-w-[1160px] lg:flex-row"}`}>
          {/* Colonne de contrôle */}
          <fieldset disabled={!!busy} className="min-w-0 flex-1 space-y-4">
            <div>
              <label className="text-[13px] font-semibold" htmlFor="pz-prompt">
                Décrivez le motif
              </label>
              <textarea
                id="pz-prompt"
                className="field mt-2 min-h-[84px] py-2.5"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex. une abeille posée sur une fleur de tournesol"
                maxLength={300}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button key={ex} type="button" className="rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-label-2 hover:bg-white/10" onClick={() => setPrompt(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <label className="block text-xs">Code d’accès à la génération
              <input type="password" autoComplete="off" value={accessCode} onChange={e => setAccessCode(e.target.value)} className="field mt-2" />
            </label>
            <p className="text-xs text-label-2">Limite DMC demandée : {(() => { try { return requestedColorLimit(prompt) ?? colors; } catch { return "1 à 64 couleurs requises"; } })()} couleurs maximum. Le code reste en mémoire, jamais sauvegardé.</p>
            <details className="space-y-4 rounded-[12px] border border-white/10 p-3">
              <summary className="cursor-pointer text-sm">Réglages facultatifs · style, taille et fils</summary>
            <details className="rounded-[12px] bg-white/[.04] px-3 py-2">
              <summary className="cursor-pointer py-1 text-[12px] font-medium text-label-2">Plusieurs sujets ou leur position</summary>
              <p className="mt-2 text-[11px] leading-relaxed text-label-3">
                Facultatif : précisez les sujets et leur position sans remplacer votre description complète.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="text-[11px] text-label-3">
                  Sujet principal
                  <input className="field mt-1 text-[13px]" value={main} onChange={(e) => setMain(e.target.value)} placeholder="éléphant" />
                </label>
                <label className="text-[11px] text-label-3">
                  Sujet à inclure
                  <input className="field mt-1 text-[13px]" value={second} onChange={(e) => setSecond(e.target.value)} placeholder="papillon" />
                </label>
              </div>
              <label className="mt-2 block text-[11px] text-label-3">
                Position / relation
                <input className="field mt-1 text-[13px]" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="papillon posé sur la tête de l’éléphant" />
              </label>
            </details>

            <Control label="Style">
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((s) => (
                  <Chip key={s.id} active={style === s.id} onClick={() => setStyle(s.id)}>
                    {s.label}
                  </Chip>
                ))}
              </div>
            </Control>

            <Control label="Détail">
              <div className="flex flex-wrap gap-1.5">
                {DETAILS.map((d) => (
                  <Chip key={d.id} active={detail === d.id} onClick={() => chooseDetail(d.id)}>
                    {d.label}
                  </Chip>
                ))}
              </div>
            </Control>

            <Control label="Format">
              <div className="flex flex-wrap gap-1.5">
                {FORMATS.map((f) => (
                  <Chip key={f.id} active={format === f.id} onClick={() => setFormat(f.id)}>
                    {f.label}
                  </Chip>
                ))}
              </div>
            </Control>

            <Control label="Réalisme">
              <div className="flex flex-wrap gap-1.5">
                <Chip active={mode === "dither"} onClick={() => setMode("dither")}>
                  Dégradés (réaliste)
                </Chip>
                <Chip active={mode === "flat"} onClick={() => setMode("flat")}>
                  Aplats nets
                </Chip>
              </div>
            </Control>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-[12px] text-label-2">
                Taille
                <select className="field mt-1.5" value={size} onChange={(e) => setSize(Number(e.target.value))}>
                  {[120, 160, 200, 240, 280, 320].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[12px] text-label-2">
                Couleurs max.
                <input type="range" min={8} max={64} step={1} value={colors} onChange={(e) => setColors(Number(e.target.value))} className="mt-3 w-full" />
                <span className="mt-1 block font-mono text-[12px] text-label-2">{colors}</span>
              </label>
              <label className="text-[12px] text-label-2">
                Graine
                <span className="mt-1.5 flex gap-1.5">
                  <input type="number" className="field min-w-0" value={seed} onChange={(e) => setSeed(Math.max(0, Math.floor(+e.target.value) || 0))} aria-label="Graine" />
                  <button type="button" className="btn-icon h-10 w-10 shrink-0" onClick={() => setSeed(Math.floor(Math.random() * 1000000))} aria-label="Nouvelle graine">
                    <Dices size={16} />
                  </button>
                </span>
              </label>
              <label className="flex items-end gap-2 pb-2.5 text-[12px] text-label-2">
                <input type="checkbox" className="mt-1" checked={dropWhite} onChange={(e) => setDropWhite(e.target.checked)} />
                Fond blanc non brodé
              </label>
            </div>

            </details>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-tinted flex-1" onClick={() => void generate()} disabled={!!busy}>
                <Wand2 size={15} /> {busy ? "En cours…" : "Générer mon motif"}
              </button>
              <button type="button" className="btn-quiet" onClick={variant} disabled={!imgUrl || !!busy} title="Autre interprétation">
                <Sparkles size={15} /> Variante
              </button>
              {!embedded && <button type="button" className="btn-primary flex-1" onClick={() => void convert()} disabled={!!busy || !imgUrl}>
                <WandSparkles size={15} /> Actualiser la grille
              </button>}
            </div>

            {error && <p role="alert" className="rounded-[12px] bg-white/5 px-4 py-3 text-[13px] text-label-2">{error}</p>}
            {!embedded && <p className="text-[11px] leading-relaxed text-label-3">
              « Dégradés (réaliste) » applique un dithering Floyd–Steinberg vers la palette DMC : c'est ce qui donne les dégradés lisses et le
              rendu détaillé d'un vrai patron. « Aplats » donne des aplats de couleur nets. La fidélité dépend du générateur externe : vérifiez les deux aperçus avant validation. Votre description est envoyée à ce service.
            </p>}
          </fieldset>

          {/* Aperçus */}
          {!embedded && <aside className="w-full shrink-0 space-y-3 lg:w-[400px]">
            <div className="grid min-h-[180px] place-items-center overflow-hidden rounded-[14px] bg-white p-2">
              {imgUrl ? (
                <img src={imgUrl} alt="Image générée" className="max-h-[280px] w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-[12px] text-black/50">L'image générée apparaîtra ici.</p>
              )}
            </div>
            <div className="grid min-h-[180px] place-items-center overflow-hidden rounded-[14px] bg-[#f7f2e8] p-2">
              {pattern && preview ? (
                <img src={preview} alt="Motif converti" className="max-h-[280px] w-full object-contain" />
              ) : (
                <p className="p-6 text-center text-[12px] text-black/40">Le motif de point de croix apparaîtra ici.</p>
              )}
            </div>
            {pattern && <p className="font-mono text-[12px] text-label-2">{pattern.w} × {pattern.h} points · {pattern.palette.length} fils</p>}
            <button
              type="button"
              className="btn-primary w-full"
              disabled={!pattern || !!busy}
              onClick={() => pattern && onImport(pattern)}
            >
              <Check size={15} /> Utiliser dans ma grille
            </button>
          </aside>}
        </section>

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

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${active ? "bg-accent text-white" : "bg-white/5 text-label-2 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

function renderPreview(p: Pattern) {
  const scale = Math.max(2, Math.min(5, Math.floor(460 / p.w), Math.floor(360 / p.h)));
  const c = document.createElement("canvas");
  c.width = p.w * scale;
  c.height = p.h * scale;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f7f2e8";
  ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < p.cross.length; i++) {
    const v = p.cross[i];
    if (v < 0) continue;
    ctx.fillStyle = FLOSS[v].hex;
    ctx.fillRect((i % p.w) * scale, Math.floor(i / p.w) * scale, scale, scale);
  }
  return c.toDataURL("image/png");
}

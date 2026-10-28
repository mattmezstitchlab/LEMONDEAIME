import { useRef, type FormEvent } from "react";
import { FilePlus2, FolderOpen, Import, Sparkles } from "lucide-react";

export default function AtelierCreate({
  prompt, onPrompt, onGenerate, onImport, onBlank, onLibrary, compact = false,
}: {
  prompt: string;
  onPrompt: (value: string) => void;
  onGenerate: () => void;
  onImport: (file: File) => void;
  onBlank: () => void;
  onLibrary: () => void;
  compact?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (prompt.trim().length >= 3) onGenerate();
  };
  return (
    <section
      aria-label="Créer ou reprendre un motif"
      className={compact ? "space-y-3 text-white" : "pz-surface w-[min(460px,calc(100vw-28px))] p-5 text-white sm:p-6"}
    >
      {!compact && <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/45">Point Zéro · Atelier</p>}
      {!compact && <h1 className="mt-2 text-[clamp(20px,3vw,28px)] font-semibold tracking-[-.04em] text-white">Que voulez-vous broder ?</h1>}
      <form className="mt-3 space-y-3" onSubmit={submit}>
        <label htmlFor={compact ? "atelier-description-panel" : "atelier-description"} className="sr-only">Description du motif</label>
        <textarea
          id={compact ? "atelier-description-panel" : "atelier-description"}
          rows={2}
          maxLength={300}
          value={prompt}
          onChange={(event) => onPrompt(event.target.value)}
          placeholder="Décrivez votre motif…"
          className="w-full resize-none rounded-[5px] border border-white/30 bg-[#202024] px-3 py-3 text-sm text-white outline-none placeholder:text-[#b3b3bc] focus:border-white/80"
        />
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={prompt.trim().length < 3} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[5px] bg-white px-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={16} />Générer</button>
          <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[5px] border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/15"><Import size={16} />Importer</button>
        </div>
      </form>
      <input ref={fileInput} type="file" className="sr-only" aria-label="Importer image, PDF ou projet JSON/OXS" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.json,.oxs,application/json" onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) onImport(file); }} />
      <div className="flex flex-wrap justify-center gap-5 border-t border-white/10 pt-3">
        <button type="button" onClick={onBlank} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-white/80 hover:text-white"><FilePlus2 size={15} />Grille vierge</button>
        <button type="button" onClick={onLibrary} className="inline-flex min-h-9 items-center gap-1.5 text-xs text-white/60 hover:text-white"><FolderOpen size={15} />Mes projets</button>
      </div>
    </section>
  );
}

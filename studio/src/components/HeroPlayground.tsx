import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Wand2, FileImage, FileUp, FileJson, ArrowRight, RotateCw, Pencil, LoaderCircle } from "lucide-react";
import { FLOSS } from "../lib/dmc";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { genererMotif } from "../lib/generation";
import type { MotifGrille } from "./ToileInfinie";

/** L'aperçu du résultat utilise les cases DMC réelles, pas une photo factice. */
function ApercuMotif({ p }: { p: Pattern }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const step = 7;
    canvas.width = p.w * step;
    canvas.height = p.h * step;
    ctx.fillStyle = "#fffefa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = .6;
    ctx.strokeStyle = "rgba(40,40,40,.08)";
    for (let x = 0; x <= p.w; x++) {
      ctx.beginPath(); ctx.moveTo(x * step, 0); ctx.lineTo(x * step, canvas.height); ctx.stroke();
    }
    for (let y = 0; y <= p.h; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * step); ctx.lineTo(canvas.width, y * step); ctx.stroke();
    }
    for (let i = 0; i < p.cross.length; i++) {
      const idx = p.cross[i], color = FLOSS[idx]?.hex;
      if (!color) continue;
      const x = (i % p.w) * step, y = Math.floor(i / p.w) * step;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y + 1); ctx.lineTo(x + 1, y + 6); ctx.stroke();
    }
  }, [p]);
  return <canvas ref={ref} className="aspect-square w-full max-w-[230px] rounded-md border border-black/10 bg-white" aria-label={"Aperçu du patron "+p.name} />;
}

type Phase =
  | { kind: "repos" }
  | { kind: "chargement" }
  | { kind: "motif"; p: Pattern }
  | { kind: "erreur"; msg: string };

export default function HeroPlayground({
  onMotif, onPdf, onImage, onProjectFile, onGrille, prompt, setPrompt,
}: {
  onMotif: (p: Pattern) => void;
  onPdf: (file: File) => void;
  onImage: (file: File) => void;
  onProjectFile: (file: File) => Promise<string | null>;
  onGrille: (m: MotifGrille | null) => void;
  prompt: string;
  setPrompt: (v: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "repos" });
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [projectError, setProjectError] = useState("");
  const [openingProject, setOpeningProject] = useState(false);

  const generate = async (graine: number) => {
    const text = prompt.trim();
    if (!text || phase.kind === "chargement") return;
    setPhase({ kind: "chargement" });
    try {
      const { cross, palette } = await genererMotif(text, graine);
      const p = createPattern(text.slice(0, 60), 44, 44, 14, 2);
      p.cross = cross;
      for (const idx of palette) ensurePalette(p, idx);
      p.provenance = {
        kind: "image",
        source: "Image assistée par IA convertie en points DMC",
        author: "",
        license: "Vérifier les droits et l'originalité avant toute redistribution",
        personalOnly: false,
      };
      p.notes = "Description : « " + text + " ». Motif de 44 × 44 points.";
      onGrille({ cross, palette, w: 44, h: 44, nom: text });
      setPhase({ kind: "motif", p });
    } catch {
      setPhase({ kind: "erreur", msg: "La génération n'a pas abouti. Vérifiez votre connexion et réessayez." });
    }
  };

  const onSelectPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onPdf(file);
  };

  const onSelectProject = async (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected || openingProject) return;
    setOpeningProject(true);
    setProjectError("");
    try {
      const error = await onProjectFile(selected);
      if (error) setProjectError(error);
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Impossible d'ouvrir ce projet.");
    } finally {
      setOpeningProject(false);
    }
  };

  const reset = () => {
    setPhase({ kind: "repos" });
    onGrille(null);
  };

  return (
    <div id="hero-jeu" className="relative mt-6 scroll-m-24">
      {phase.kind === "motif" ? (
        <section className="hero-result mx-auto w-full max-w-[680px] rounded-lg border border-black/10 bg-white/95 p-4 shadow-[0_12px_42px_#00000014] sm:p-5" aria-label="Motif généré">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="w-[190px] shrink-0 sm:w-[210px]"><ApercuMotif p={phase.p}/></div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 text-center sm:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[.15em] text-[#76658a]">Votre motif</p>
              <h2 className="line-clamp-2 text-xl font-semibold text-[#161616]">{phase.p.name}</h2>
              <p className="text-xs text-[#646464]">{phase.p.w} × {phase.p.h} points · {phase.p.palette.length} couleurs DMC</p>
              <button className="mt-2 flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#181819] px-4 text-sm font-semibold text-white" onClick={() => onMotif(phase.p)}>
                Continuer dans l'atelier <ArrowRight size={16}/>
              </button>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button className="flex items-center gap-1 rounded-md px-2 py-2 text-xs text-[#555]" onClick={reset}><Pencil size={13}/> Modifier</button>
                <button className="flex items-center gap-1 rounded-md px-2 py-2 text-xs text-[#555]" onClick={() => {
                  const next = Math.floor(Math.random() * 1000000);
                  setSeed(next);
                  void generate(next);
                }}><RotateCw size={13}/> Autre version</button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          <form className="hero-form mx-auto flex w-full max-w-[780px] flex-col gap-3 rounded-lg p-3 sm:flex-row sm:flex-wrap sm:items-center" onSubmit={e => { e.preventDefault(); void generate(seed); }}>
            <input className="field min-h-12 min-w-0 flex-1 rounded-md px-4 text-[15px] sm:min-w-[240px]" value={prompt}
              onChange={e => setPrompt(e.target.value)} placeholder="Décrivez votre motif, par exemple un oiseau botanique"
              aria-label="Décrire un motif à générer"/>
            <button type="submit" className="btn-primary min-h-12 shrink-0 px-5" disabled={!prompt.trim() || phase.kind === "chargement"}>
              {phase.kind === "chargement" ? <LoaderCircle className="animate-spin" size={16}/> : <Wand2 size={16}/>}
              {phase.kind === "chargement" ? "Création…" : "Générer"}
            </button>
            <label className="btn-quiet min-h-12 shrink-0 cursor-pointer px-4">
              <FileImage size={16}/> Importer une image
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only"
                aria-label="Choisir une image PNG, JPEG ou WebP" onChange={e=>{const selected=e.target.files?.[0];e.target.value="";if(selected)onImage(selected);}} />
            </label>
            <label className="btn-quiet min-h-12 shrink-0 cursor-pointer px-4">
              <FileUp size={16}/> Importer un PDF
              <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={onSelectPdf} aria-label="Choisir un PDF" />
            </label>
            <label className="btn-quiet min-h-12 shrink-0 cursor-pointer px-4">
              <FileJson size={16}/> {openingProject ? "Ouverture…" : "Importer un projet JSON"}
              <input type="file" accept=".json,.oxs,application/json" className="sr-only" onChange={e => { void onSelectProject(e); }} aria-label="Choisir un projet Point Zéro (JSON ou OXS)" />
            </label>
          </form>
          {projectError && <p className="mx-auto mt-2 max-w-[700px] rounded-md border border-red-300 bg-white p-3 text-center text-sm text-red-800" role="alert">Projet non ouvert : {projectError}</p>}
          {phase.kind === "erreur" && <p className="mx-auto mt-2 max-w-[560px] rounded-md bg-white p-3 text-center text-sm text-[#8c241e]" role="alert">
            {phase.msg} <button className="ml-2 underline" onClick={() => void generate(seed)}>Réessayer</button>
          </p>}
          <p className="hero-note mx-auto mt-3 max-w-[560px] text-center text-xs text-black/60">
            Votre motif apparaîtra ici. PDF : montage dans l'atelier. JSON : patron et couleurs DMC ouverts directement dans l'atelier.
          </p>
        </>
      )}
    </div>
  );
}

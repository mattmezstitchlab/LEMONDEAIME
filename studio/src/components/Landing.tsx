import { useCallback, useMemo, useState } from "react";
import ToileInfinie, { type MotifGrille } from "./ToileInfinie";
import HeroPlayground from "./HeroPlayground";
import { createPattern, ensurePalette, type Pattern } from "../lib/pattern";
import { appendWaypoint, type Point } from "../lib/slame";
import HomeSlamePanel, { type GrilleMode } from "./HomeSlamePanel";
import BoutiquePatrons from "./BoutiquePatrons";

interface Props {
  onOpen: () => void;
  onSlame?: () => void;
  onMotif: (p: Pattern) => void;
  onPdf: (file: File) => void;
  onImage: (file: File) => void;
  onProjectFile: (file: File) => Promise<string | null>;
}

/** Accueil épuré : grille nue, une seule création visible après génération.
 * Les patrons PDF et leur puzzle s'ouvrent uniquement dans l'atelier. */
export default function Landing({ onOpen, onMotif, onPdf, onImage, onProjectFile, onSlame = onOpen }: Props) {
  const [promptText, setPromptText] = useState("");
  const [source, setSource] = useState<MotifGrille | null>(null);
  const [modeGrille, setModeGrille] = useState<GrilleMode>("toile");
  const [boutique, setBoutique] = useState(false);
  const [musicTrail, setMusicTrail] = useState<Point[]>([]);
  const addMusicPoint = useCallback((point: Point) => {
    setMusicTrail(trail => appendWaypoint(trail, point));
  }, []);

  const motif = source;

  /* Le motif de la grille, en vrai Pattern : le rail de fils de l'atelier
     (computeStats, symboles, écheveaux) officie ici, pas un rail parallèle. */
  const motifVersPattern = (m: MotifGrille): Pattern => {
    const p = createPattern(m.nom.slice(0, 60) || "Motif de la toile", m.w, m.h, 14, 2);
    p.cross = Int16Array.from(m.cross);
    for (const v of m.palette) ensurePalette(p, v);
    p.provenance = {
      kind: "demo",
      source: "Motif brodé sur la toile",
      author: "",
      license: "Démo hors ligne : génération locale ou service tiers selon le réseau",
      personalOnly: false,
    };
    p.notes = `« ${m.nom} », ${m.w} × ${m.h} cases, brodé sur la toile.`;
    return p;
  };

  const patternRail = useMemo(() => (motif ? motifVersPattern(motif) : null), [motif]);

  return (
    <>
    <ToileInfinie
      musicMode={modeGrille === "musique"}
      musicTrail={musicTrail}
      onMusicCell={addMusicPoint}
      onOpen={onOpen}
      onMotif={onMotif}
      motif={motif}
      showShowcase={false}
      displayMotifOnToile={false}
      reglages={[]}
      onReglage={() => {}}
      nbCouleursSource={() => 0}
    >
      <div className={"hero-cadre" + (modeGrille !== "toile" ? " pointer-events-none opacity-0" : "")} data-tag="Créer votre patron à partir de la grille">
        <h1 className="hero-titre relative text-[clamp(34px,4.6vw,64px)] leading-[0.98] font-semibold tracking-[-0.05em] text-black">
          De l’image au dernier point.
        </h1>
      <HeroPlayground
        onMotif={onMotif}
        onPdf={onPdf}
        onImage={onImage}
        onProjectFile={onProjectFile}
        onGrille={(m) => {
          setSource(m);
          setMusicTrail([]);
        }}
        prompt={promptText}
        setPrompt={setPromptText}
      />
      </div>
    </ToileInfinie>
    <nav className="fixed bottom-4 left-1/2 z-[75] flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-lg border border-black/15 bg-white/95 p-1.5 text-black shadow-[0_7px_35px_#0002] backdrop-blur-xl" aria-label="Outils de la grille">
      <button type="button" onClick={() => setModeGrille("toile")} aria-pressed={modeGrille === "toile"} className={modeGrille === "toile" ? "rounded-md bg-[#1d1d21] px-4 py-2.5 text-sm font-semibold text-white" : "rounded-md px-4 py-2.5 text-sm hover:bg-black/5"}>Créer</button>
      <button type="button" onClick={() => setModeGrille("musique")} aria-pressed={modeGrille === "musique"} className={modeGrille === "musique" ? "rounded-md bg-[#1d1d21] px-4 py-2.5 text-sm font-semibold text-white" : "rounded-md px-4 py-2.5 text-sm hover:bg-black/5"}>♫ Musique</button>
      <button type="button" onClick={() => setModeGrille("parole")} aria-pressed={modeGrille === "parole"} className={modeGrille === "parole" ? "rounded-md bg-[#1d1d21] px-4 py-2.5 text-sm font-semibold text-white" : "rounded-md px-4 py-2.5 text-sm hover:bg-black/5"}>Parole</button>
      <button type="button" onClick={() => setBoutique(true)} className="rounded-md bg-[#efe9d9] px-4 py-2.5 text-sm font-semibold hover:bg-[#e6dec9]">Boutique · patrons</button>
      <button type="button" onClick={onOpen} className="rounded-md px-4 py-2.5 text-sm hover:bg-black/5">Broder · outils précis ↗</button>
    </nav>
    {boutique && <BoutiquePatrons onClose={() => setBoutique(false)} onOpenPattern={onMotif} />}
    <HomeSlamePanel
      mode={modeGrille}
      pattern={patternRail}
      trail={musicTrail}
      onPoint={addMusicPoint}
      onTrail={setMusicTrail}
      onMode={setModeGrille}
      onAdvanced={onSlame}
    />
    </>
  );
}

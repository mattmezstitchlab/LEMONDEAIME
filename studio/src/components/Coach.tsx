import { useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, Send, Sparkles, X } from "lucide-react";
import { STARTERS, entryById, type AnswerHit, type CoachStep, type Gesture, type KnowledgeEntry } from "../lib/coach";

/** Ce que le guide attend de l'utilisateur, dit en une ligne. */
const GESTURE_HINT: Record<Gesture, string> = {
  any: "Lisez le mémo, puis « Suivant ».",
  tool: "Prenez l'outil qui pulse : l'étape se validera seule.",
  stitch: "Posez un point sur la grille : l'étape se validera seule.",
  color: "Choisissez un fil dans le rail : l'étape se validera seule.",
  panel: "Ouvrez le panneau : l'étape se validera seule.",
};

export interface Ask {
  query: string;
  hits: AnswerHit[];
}

export interface CoachProps {
  open: boolean;
  track: "create" | "stitch";
  step: CoachStep | null;
  index: number;
  total: number;
  /** Question posée, et ce que la base locale a trouvé — vide si rien. */
  ask: Ask | null;
  onAsk: (query: string) => void;
  onPick: (id: string) => void;
  onBackToStep: () => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/**
 * Le guide de l'atelier : un mémo, un pictogramme qui pulse, et un champ pour
 * poser une question.
 *
 * Une seule étape à la fois, et une seule cible animée à la fois : deux
 * pictogrammes qui clignotent ensemble ne guident plus personne. Le champ de
 * saisie n'est pas une fenêtre de conversation — c'est une recherche dans une
 * base écrite depuis le source de l'atelier, qui répond hors ligne et dit
 * « je ne sais pas » plutôt que d'inventer.
 *
 * L'étape se valide par le geste réel quand il y en a un, et « Suivant » reste
 * disponible dans tous les cas : un guide qui bloque est pire que pas de guide.
 */
export default function Coach(p: CoachProps) {
  const [query, setQuery] = useState("");
  const fieldId = useId();
  const form = useRef<HTMLFormElement>(null);
  if (!p.open) return null;

  const best = p.ask?.hits[0]?.entry ?? null;
  const others = (p.ask?.hits.slice(1) ?? []).map((h) => h.entry);
  const starters = STARTERS.map((id) => entryById(id)).filter((e): e is KnowledgeEntry => !!e);

  const submit = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    p.onAsk(clean);
    setQuery("");
  };

  return (
    <section
      className="glass-strong coach-in fixed left-1/2 top-[74px] z-[70] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 rounded-[18px] p-3.5"
      role="region"
      aria-label="Guide de l'atelier"
    >
      <header className="flex items-center gap-2">
        <Compass size={16} className="shrink-0 text-accent-2" aria-hidden />
        <span className="text-[12px] font-semibold text-label">
          {best ? "L'atelier répond" : p.step ? "Guide pas à pas" : "Guide"}
        </span>
        {!best && p.step && (
          <span className="font-mono text-[11px] text-label-3">
            Étape {p.index + 1} / {p.total} · {p.track === "create" ? "Créer" : "Broder"}
          </span>
        )}
        <button type="button" className="btn-icon ml-auto h-8 w-8" onClick={p.onClose} aria-label="Terminer le guide" title="Terminer le guide">
          <X size={15} />
        </button>
      </header>

      {best ? (
        <div aria-live="polite" className="mt-2">
          <p className="text-[13px] font-semibold text-label">{best.ask}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-label-2">{best.answer}</p>
          <p className="mt-2 flex gap-1.5 text-[12px] leading-relaxed text-accent-2">
            <Sparkles size={13} className="mt-[2px] shrink-0" aria-hidden />
            <span>{best.memo}</span>
          </p>
          {(others.length > 0 || best.also?.length) && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {[...others, ...(best.also ?? []).map((id) => entryById(id)).filter((e): e is KnowledgeEntry => !!e && !others.some((o) => o.id === e.id))].map(
                (entry) => (
                  <button key={entry.id} type="button" className="chip" onClick={() => p.onPick(entry.id)}>
                    {entry.ask}
                  </button>
                ),
              )}
            </div>
          )}
          <button type="button" className="mt-3 text-[12px] text-accent-2" onClick={p.onBackToStep}>
            <ChevronLeft size={13} className="mr-0.5 inline" aria-hidden />
            Revenir au guide pas à pas
          </button>
        </div>
      ) : p.ask ? (
        <div aria-live="polite" className="mt-2">
          <p className="text-[13px] leading-relaxed text-label-2">
            « {p.ask.query} » — je ne sais pas répondre à ça. Ce guide connaît l'atelier par cœur, pas la broderie en
            général : il répond depuis ce qui est écrit dans ce logiciel, hors ligne, et préfère le dire plutôt que
            d'inventer.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {starters.map((entry) => (
              <button key={entry.id} type="button" className="chip" onClick={() => p.onPick(entry.id)}>
                {entry.ask}
              </button>
            ))}
          </div>
        </div>
      ) : p.step ? (
        <div aria-live="polite" className="mt-2">
          <p className="text-[13px] font-semibold text-label">{p.step.title}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-label-2">{p.step.memo}</p>
          <p className="mt-2 text-[11.5px] text-label-3">{GESTURE_HINT[p.step.gesture]}</p>
        </div>
      ) : (
        <p className="mt-2 text-[12.5px] leading-relaxed text-label-2">
          Le parcours est terminé. Posez une question ci-dessous, ou relancez le guide depuis la boussole de la barre du
          haut.
        </p>
      )}

      <form
        ref={form}
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <label className="sr-only" htmlFor={fieldId}>
          Poser une question sur l'atelier
        </label>
        <input
          id={fieldId}
          className="field min-h-11 flex-1"
          type="text"
          value={query}
          placeholder="Une question sur l'atelier ? (symétrie, perles, export, mélange…)"
          autoComplete="off"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-tinted h-11 shrink-0 px-3" disabled={!query.trim()} aria-label="Demander au guide">
          <Send size={15} />
        </button>
      </form>

      {!best && p.step && (
        <footer className="mt-3 flex items-center gap-2">
          <button type="button" className="btn-quiet h-10" onClick={p.onPrev} disabled={p.index === 0}>
            <ChevronLeft size={15} />Précédent
          </button>
          <button type="button" className="btn-primary h-10 flex-1" onClick={p.onNext}>
            {p.index + 1 >= p.total ? "Terminer" : "Suivant"}
            <ChevronRight size={15} />
          </button>
        </footer>
      )}
    </section>
  );
}

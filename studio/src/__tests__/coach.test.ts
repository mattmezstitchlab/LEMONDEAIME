import { describe, expect, it } from "vitest";
import {
  COACH_STORAGE_KEY,
  EMPTY_PROGRESS,
  KNOWLEDGE,
  STARTERS,
  TRACKS,
  answerQuery,
  entryById,
  loadCoach,
  normalize,
  resolveStep,
  saveCoach,
  stepIndex,
  type CoachProgress,
} from "../lib/coach";

/**
 * Le guide pas à pas et le champ de questions.
 *
 * Ce qui est verrouillé ici tient en une exigence : le guide ne doit jamais
 * répondre à côté. Une base de connaissances qui affiche un outil sans rapport
 * avec la question apprend à ne plus lui faire confiance — mieux vaut « je ne
 * sais pas » qu'une réponse inventée. D'où les tests sur les questions hors
 * sujet, autant que sur celles qui trouvent.
 */

function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
  };
}

describe("Recherche dans la base de connaissances", () => {
  it("ignore les accents, la casse et la ponctuation", () => {
    expect(normalize("À défaire !")).toBe("a defaire");
    // Le Δ grec n'a pas de repli ASCII : il tombe, « ΔE00 » devient « e00 ».
    // D'où la clé « e00 » dans l'entrée concernée — sinon la question la plus
    // naturelle sur les écarts de couleur ne trouvait rien.
    expect(normalize("  ΔE00  ?  ")).toBe("e00");
    expect(answerQuery("c'est quoi ΔE00")[0].entry.id).toBe("deltae");
    expect(normalize("Trois-quarts de POINT")).toBe("trois quarts de point");
    // Une question écrite avec ou sans accent tombe sur la même entrée.
    expect(answerQuery("comment activer la symétrie")[0].entry.id).toBe(answerQuery("COMMENT ACTIVER LA SYMETRIE ?")[0].entry.id);
  });

  it("trouve l'outil ou le réglage demandé", () => {
    const cas: [string, string][] = [
      ["comment activer la symétrie", "symmetry"],
      ["je veux exporter en pdf", "exportpdf"],
      ["comment faire un mélange de fils", "blends"],
      ["comment signaler une erreur à défaire", "mistakes"],
      ["quels sont les raccourcis clavier", "shortcuts"],
      ["comment régler la toile en lin 28", "fabric"],
      ["peut-on broder avec des perler", "brands"],
      ["que perd-on en exportant en oxs", "oxs"],
      ["comment garer un fil", "park"],
      ["où sont mes projets et versions", "library"],
    ];
    for (const [question, id] of cas) {
      const hits = answerQuery(question);
      expect(hits.length, question).toBeGreaterThan(0);
      expect(hits[0].entry.id, question).toBe(id);
    }
  });

  it("classe par pertinence, et propose les entrées voisines", () => {
    const hits = answerQuery("perles miyuki delica");
    expect(hits.length).toBeGreaterThan(1);
    const ids = hits.map((h) => h.entry.id);
    expect(ids).toContain("bead");
    expect(ids).toContain("miyuki");
    // Les scores sont décroissants : la première réponse est la meilleure.
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
  });

  it("une locution entière pèse plus qu'un mot isolé", () => {
    // « point arrière » est une locution de l'entrée `back` ; « point » seul ne
    // doit pas l'emporter sur une entrée plus précise.
    expect(answerQuery("point arrière")[0].entry.id).toBe("back");
    expect(answerQuery("liste de courses")[0].entry.id).toBe("stock");
  });

  it("dit qu'il ne sait pas plutôt que de répondre à côté", () => {
    for (const question of [
      "",
      "   ",
      "quelle est la capitale du Pérou",
      "peux-tu me raconter une histoire drôle",
      "combien font 7 fois 8 en devises",
      "quel temps fera-t-il demain à Lille",
    ]) {
      expect(answerQuery(question), question).toEqual([]);
    }
  });

  it("« écrire » vise l'alphabet compté : c'est un verbe de l'atelier", () => {
    // Le refus précédent portait sur « écrire un poème », mais « écrire » seul
    // est une demande légitime : l'atelier pose du texte sur la grille. Mieux
    // vaut l'assumer ici que de retirer le mot de la base.
    expect(answerQuery("écrire")[0].entry.id).toBe("text");
  });

  it("respecte la limite demandée et reste déterministe", () => {
    expect(answerQuery("couleur des fils et des perles", 2)).toHaveLength(2);
    const a = answerQuery("export").map((h) => h.entry.id);
    const b = answerQuery("export").map((h) => h.entry.id);
    expect(a).toEqual(b);
  });

  it("la base ne rétrécit pas en silence", () => {
    // La documentation cite un nombre d'entrées, et surtout : si la base fond,
    // le guide continue de compiler et cesse simplement de savoir répondre.
    // Personne ne s'en aperçoit sans ce plancher.
    expect(KNOWLEDGE.length).toBeGreaterThanOrEqual(54);
  });

  it("toute entrée est joignable et cohérente", () => {
    const ids = new Set<string>();
    for (const entry of KNOWLEDGE) {
      expect(ids.has(entry.id), `doublon ${entry.id}`).toBe(false);
      ids.add(entry.id);
      expect(entry.keys.length, entry.id).toBeGreaterThan(0);
      expect(entry.answer.length, entry.id).toBeGreaterThan(60);
      expect(entry.memo.length, entry.id).toBeGreaterThan(10);
      expect(entry.memo.length, entry.id).toBeLessThanOrEqual(160);
      expect(entry.ask.endsWith("?"), entry.id).toBe(true);
      expect(entryById(entry.id)?.id).toBe(entry.id);
      // Chaque clé doit normaliser en quelque chose d'utilisable : une clé
      // réduite à un symbole (« δe ») ne peut rien reconnaître.
      for (const key of entry.keys) expect(normalize(key).length, `${entry.id}:${key}`).toBeGreaterThan(0);
    }
    for (const id of STARTERS) expect(ids.has(id), `suggestion ${id}`).toBe(true);
    for (const entry of KNOWLEDGE) for (const other of entry.also ?? []) expect(ids.has(other), `${entry.id} → ${other}`).toBe(true);
  });

  it("aucun des 26 outils n'est absent de la base", () => {
    const outils = [
      "hand", "cross", "half", "quarter", "threeQuarter", "petite", "bead", "back", "knot", "long",
      "select", "pick", "fill", "erase", "mark", "details", "block", "row", "park", "unpick",
      "note", "lasso", "move", "line", "rect", "ellipse",
    ];
    // Un outil est couvert s'il est la cible d'une entrée, ou s'il est nommé
    // dans une entrée qui traite de sa famille : le lasso et le déplacement de
    // sélection sont expliqués avec la sélection, le rectangle et l'ellipse avec
    // les formes. Une entrée par outil ferait vingt-six fois la même phrase.
    const cible = new Set(KNOWLEDGE.filter((e) => e.target.kind === "tool").map((e) => (e.target as { tool: string }).tool));
    const nomme = (outil: string) =>
      KNOWLEDGE.some((e) => e.keys.some((k) => k.includes(outil)) || e.answer.toLowerCase().includes(outil));
    const essentiels = ["hand", "cross", "half", "quarter", "back", "knot", "long", "pick", "fill", "erase",
      "mark", "details", "block", "row", "park", "unpick", "note", "threeQuarter", "petite", "bead", "select"];
    expect(essentiels.filter((t) => !cible.has(t))).toEqual([]);
    expect(outils.filter((t) => !cible.has(t) && !nomme(t))).toEqual([]);
  });
});

describe("Parcours pas à pas", () => {
  it("chaque étape est jouable et pointe une cible réelle", () => {
    for (const track of ["create", "stitch"] as const) {
      const steps = TRACKS[track];
      expect(steps.length, track).toBeGreaterThanOrEqual(6);
      const ids = new Set<string>();
      for (const step of steps) {
        expect(ids.has(step.id), `doublon ${step.id}`).toBe(false);
        ids.add(step.id);
        expect(step.workspace, step.id).toBe(track);
        expect(step.title.length, step.id).toBeGreaterThan(4);
        expect(step.memo.length, step.id).toBeGreaterThan(20);
        expect(step.target.kind === "tool" || step.target.kind === "zone", step.id).toBe(true);
        if (step.gesture === "tool") expect(step.expect, step.id).toBeTruthy();
        if (step.gesture === "panel") expect(step.expectPanel, step.id).toBeTruthy();
      }
      // Au moins une étape validée par un geste réel, sinon le guide redevient
      // un diaporama.
      expect(steps.some((s) => s.gesture !== "any"), track).toBe(true);
    }
  });

  it("reprend à la première étape non validée", () => {
    const fresh: CoachProgress = { ...EMPTY_PROGRESS };
    expect(resolveStep(fresh, "create")?.id).toBe(TRACKS.create[0].id);

    const interrompu: CoachProgress = { ...fresh, seen: true, done: [TRACKS.create[0].id], stepId: TRACKS.create[1].id };
    expect(resolveStep(interrompu, "create")?.id).toBe(TRACKS.create[1].id);

    // Une étape qui n'appartient pas à la piste : on retombe sur la piste en
    // cours, sans planter ni repartir de zéro si tout est validé.
    const change: CoachProgress = { ...interrompu, stepId: TRACKS.create[1].id };
    expect(resolveStep(change, "stitch")?.id).toBe(TRACKS.stitch[0].id);

    const termine: CoachProgress = { ...fresh, seen: true, stepId: null, done: TRACKS.create.map((s) => s.id) };
    expect(resolveStep(termine, "create")).toBeNull();
  });

  it("numérote les étapes depuis zéro, et borne un identifiant inconnu", () => {
    expect(stepIndex("create", TRACKS.create[2].id)).toBe(2);
    expect(stepIndex("stitch", TRACKS.stitch[0].id)).toBe(0);
    expect(stepIndex("create", "étape-inexistante")).toBe(0);
    expect(stepIndex("create", null)).toBe(0);
  });
});

describe("Progression enregistrée", () => {
  it("fait l'aller-retour", () => {
    const storage = fakeStorage();
    const progress: CoachProgress = { track: "stitch", stepId: TRACKS.stitch[3].id, done: [TRACKS.stitch[0].id], seen: true, dismissed: false };
    saveCoach(progress, storage);
    expect(storage.map.get(COACH_STORAGE_KEY)).toBeTruthy();
    expect(loadCoach(storage)).toEqual(progress);
  });

  it("un contenu illisible retombe sur l'état initial", () => {
    expect(loadCoach(fakeStorage({ [COACH_STORAGE_KEY]: "{ pas du JSON" }))).toEqual(EMPTY_PROGRESS);
    expect(loadCoach(fakeStorage({ [COACH_STORAGE_KEY]: "42" }))).toEqual(EMPTY_PROGRESS);
    expect(loadCoach(fakeStorage({ [COACH_STORAGE_KEY]: JSON.stringify({ track: "inconnu" }) }))).toEqual(EMPTY_PROGRESS);
    expect(loadCoach(null)).toEqual(EMPTY_PROGRESS);
  });

  it("une progression d'une version antérieure est nettoyée, pas subie", () => {
    const storage = fakeStorage({
      [COACH_STORAGE_KEY]: JSON.stringify({
        track: "create",
        stepId: "etape-qui-n-existe-plus",
        done: [TRACKS.create[0].id, "fantôme", 42, null],
        seen: "oui",
        dismissed: undefined,
      }),
    });
    const loaded = loadCoach(storage);
    expect(loaded.track).toBe("create");
    expect(loaded.stepId).toBeNull();
    expect(loaded.done).toEqual([TRACKS.create[0].id]);
    expect(loaded.seen).toBe(false); // « oui » n'est pas un booléen
    expect(loaded.dismissed).toBe(false);
    // Et le guide repart d'une étape qui existe.
    expect(resolveStep(loaded, "create")?.id).toBe(TRACKS.create[1].id);
  });

  it("passe par le stockage du navigateur quand il est disponible", () => {
    window.localStorage.removeItem(COACH_STORAGE_KEY);
    expect(loadCoach()).toEqual(EMPTY_PROGRESS);
    const progress: CoachProgress = { track: "create", stepId: TRACKS.create[1].id, done: [TRACKS.create[0].id], seen: true, dismissed: true };
    saveCoach(progress);
    expect(loadCoach()).toEqual(progress);
    window.localStorage.setItem(COACH_STORAGE_KEY, "corrompu");
    expect(loadCoach()).toEqual(EMPTY_PROGRESS);
    window.localStorage.removeItem(COACH_STORAGE_KEY);
  });

  it("l'état initial ne condamne personne", () => {
    expect(EMPTY_PROGRESS.seen).toBe(false);
    expect(EMPTY_PROGRESS.dismissed).toBe(false);
    expect(EMPTY_PROGRESS.stepId).toBeNull();
    expect(EMPTY_PROGRESS.done).toEqual([]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

/* Sécurité S2 — un navigateur partagé : les ouvrages de A ne vont jamais dans le compte de B, et B ne les voit pas.
   Un ouvrage sans propriétaire (créé sans compte) reste sur l'appareil jusqu'à un rattachement explicite. */
type Rec = { id: string; name: string; folder: string; updated: number; w: number; h: number; progress: number; data: string; compte?: string };
const rec = (id: string, compte?: string, updated = 1000): Rec => ({ id, name: id, folder: "", updated, w: 10, h: 10, progress: 0.5, data: "{\"w\":10}", ...(compte ? { compte } : {}) });

function serveur(user: string | null, distants: { id: string; maj: number }[] = []) {
  const envois: { id: string }[] = [];
  const fetch = vi.fn(async (url: string, opts?: { method?: string; body?: string }) => {
    if (url === "/api/auth/get-session") return { ok: true, json: async () => (user ? { user: { id: user } } : null) };
    if (url === "/api/ouvrages" && opts?.method === "POST") { envois.push(JSON.parse(opts.body || "{}")); return { ok: true, json: async () => ({ ok: true }) }; }
    if (url === "/api/ouvrages") return { ok: true, json: async () => ({ ouvrages: distants.map(d => ({ ...d, nom: d.id, dossier: "", w: 10, h: 10, progression: 0 })) }) };
    if (url.startsWith("/api/ouvrages?id=")) return { ok: true, json: async () => ({ contenu: "{\"w\":10}" }) };
    return { ok: false, json: async () => ({}) };
  });
  vi.stubGlobal("fetch", fetch);
  return { envois, fetch };
}

describe("StudiO — cloisonnement des ouvrages par compte", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); vi.useRealTimers(); });

  it("B connecté sur l'appareil de A : rien de A ni de l'appareil ne part dans le compte de B", async () => {
    vi.useFakeTimers(); vi.stubEnv("BASE_URL", "/studio/");
    const { envois } = serveur("B");
    const m = await import("../lib/aimeSync");
    await m.tirer(async () => [rec("de-A", "A"), rec("sans-proprio")] as never, async () => {});
    await vi.advanceTimersByTimeAsync(10000);
    expect(envois.map(e => e.id)).toEqual([]);
  });

  it("les ouvrages ramenés du compte portent ce compte ; ceux du compte plus récents sur l'appareil repartent", async () => {
    vi.useFakeTimers(); vi.stubEnv("BASE_URL", "/studio/");
    const { envois } = serveur("B", [{ id: "neuf", maj: 2000 }, { id: "local-plus-recent", maj: 1000 }]);
    const m = await import("../lib/aimeSync");
    const ecrits: Rec[] = [];
    await m.tirer(async () => [rec("local-plus-recent", "B", 1500), rec("a-envoyer", "B")] as never, async (x) => { ecrits.push(x as Rec); });
    await vi.advanceTimersByTimeAsync(10000);
    expect(ecrits.map(e => [e.id, e.compte])).toEqual([["neuf", "B"]]);
    expect(envois.map(e => e.id).sort()).toEqual(["a-envoyer", "local-plus-recent"]);
  });

  it("un ouvrage sans propriétaire déjà présent dans le compte lui est rattaché (c'est le sien), sans rien envoyer d'autre", async () => {
    vi.useFakeTimers(); vi.stubEnv("BASE_URL", "/studio/");
    serveur("B", [{ id: "deja", maj: 1000 }]);
    const m = await import("../lib/aimeSync");
    const ecrits: Rec[] = [];
    await m.tirer(async () => [rec("deja", undefined, 1000)] as never, async (x) => { ecrits.push(x as Rec); });
    expect(ecrits.map(e => [e.id, e.compte])).toEqual([["deja", "B"]]);
  });

  it("envoyer refuse l'ouvrage d'un autre compte, ou sans propriétaire", async () => {
    vi.stubEnv("BASE_URL", "/studio/");
    const { envois } = serveur("B");
    const m = await import("../lib/aimeSync");
    expect(await m.envoyer(rec("de-A", "A") as never)).toBe(false);
    expect(await m.envoyer(rec("sans") as never)).toBe(false);
    expect(await m.envoyer(rec("de-B", "B") as never)).toBe(true);
    expect(envois.map(e => e.id)).toEqual(["de-B"]);
  });

  it("l'affichage : chacun voit les siens et ceux sans propriétaire ; personne ne voit ceux d'un autre", async () => {
    vi.stubEnv("BASE_URL", "/studio/");
    const m = await import("../lib/aimeSync");
    const tous = [rec("de-A", "A"), rec("de-B", "B"), rec("sans")];
    expect(m.visibles(tous, "B").map(r => r.id)).toEqual(["de-B", "sans"]);
    expect(m.visibles(tous, null).map(r => r.id)).toEqual(["sans"]);
  });

  it("rattacher un ouvrage sans propriétaire : seulement par un geste, au compte connecté", async () => {
    vi.stubEnv("BASE_URL", "/studio/");
    const { envois } = serveur("B");
    const m = await import("../lib/aimeSync");
    const r = await m.rattacher(rec("sans") as never);
    expect(r && r.compte).toBe("B");
    expect(envois.map(e => e.id)).toEqual(["sans"]);
    serveur(null);
    vi.resetModules();
    const m2 = await import("../lib/aimeSync");
    expect(await m2.rattacher(rec("sans") as never)).toBeNull();
  });

  it("effacer à la déconnexion : seulement les ouvrages de ce compte, jamais ceux sans propriétaire ni d'un autre", async () => {
    const m = await import("../lib/aimeSync");
    expect(m.aEffacer([rec("de-A", "A"), rec("de-B", "B"), rec("sans")], "B")).toEqual(["de-B"]);
  });
});

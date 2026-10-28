import { afterEach, describe, expect, it, vi } from "vitest";

/* Les ouvrages de l'atelier dans le compte AIME : seul le plus récent gagne, rien n'est écrasé à l'aveugle. */
describe("AIME — Votre espace pour les ouvrages", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); vi.useRealTimers(); });
  it("hors d'AIME (à la racine), rien ne part ni ne revient", async () => {
    vi.stubEnv("BASE_URL", "/");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const m = await import("../lib/aimeSync");
    expect(m.dansAime()).toBe(false);
    expect(await m.tirer(async () => [], async () => {})).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("dans AIME et connecté : ramène l'ouvrage du compte plus récent, garde celui de l'appareil plus récent", async () => {
    vi.stubEnv("BASE_URL", "/studio/");
    const reponses: Record<string, unknown> = {
      "/api/auth/get-session": { user: { id: "u1" } },
      "/api/ouvrages": { ouvrages: [{ id: "neuf", nom: "Roses", dossier: "", w: 10, h: 10, progression: 0.5, maj: 2000 }, { id: "vieux", nom: "Chat", dossier: "", w: 5, h: 5, progression: 0, maj: 1000 }] },
      "/api/ouvrages?id=neuf": { contenu: "{\"w\":10}" },
    };
    const fetch = vi.fn(async (url: string) => ({ ok: true, json: async () => reponses[url] }));
    vi.stubGlobal("fetch", fetch);
    const m = await import("../lib/aimeSync");
    const ecrits: string[] = [];
    const locaux = [{ id: "neuf", name: "Roses", folder: "", updated: 1500, w: 10, h: 10, progress: 0, data: "{}" }, { id: "vieux", name: "Chat", folder: "", updated: 1000, w: 5, h: 5, progress: 0, data: "{}" }];
    const r = await m.tirer(async () => locaux, async (x) => { ecrits.push(x.id); });
    expect(r).toEqual(["neuf"]);
    expect(ecrits).toEqual(["neuf", "vieux"]); // « vieux », sans propriétaire mais déjà dans ce compte, lui est rattaché (S2), sans être téléchargé
    expect(fetch).not.toHaveBeenCalledWith("/api/ouvrages?id=vieux", expect.anything());
  });
  it("un ouvrage trop lourd reste sur l'appareil et le dit", async () => {
    vi.stubEnv("BASE_URL", "/studio/");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ user: { id: "u1" } }) })));
    const m = await import("../lib/aimeSync");
    const vus: string[] = []; window.addEventListener("pointzero:aime-espace", (e) => vus.push((e as CustomEvent).detail.etat));
    const ok = await m.envoyer({ id: "lourd", name: "Lourd", folder: "", updated: 1, w: 1, h: 1, progress: 0, data: "x".repeat(m.TAILLE_MAX + 1), compte: "u1" });
    expect(ok).toBe(false); expect(vus).toContain("trop-gros");
  });
});

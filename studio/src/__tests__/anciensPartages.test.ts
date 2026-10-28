import { afterEach, expect, it, vi } from "vitest";

/* Sécurité S2 · un navigateur partagé avec des ouvrages ANCIENS, laissés par une version précédente sans propriétaire :
   - « de-A » : déjà rangé dans le compte de A (A l'avait ramené sur cet appareil) ;
   - « cree-ici » : créé sur cet appareil, rangé dans aucun compte ;
   - « de-B » : déjà rangé dans le compte de B.
   Personne ne doit récupérer l'ouvrage d'un autre, ni par la synchronisation, ni par un geste ambigu. Rien n'est effacé. */
type R = { id: string; compte?: string; appareil?: boolean; autreCompte?: boolean; name: string; data: string; versions: unknown[]; folder: string; updated: number; w: number; h: number; progress: number };
const r = (id: string, updated = 1000): R => ({ id, name: id, data: "{\"w\":2,\"h\":2}", versions: [], folder: "", updated, w: 2, h: 2, progress: 0.5 });
const PROPRIOS: Record<string, string> = { "de-A": "A", "de-B": "B" };   // ce que sait le serveur

function base(initial: R[]) {
  const donnees = new Map(initial.map(x => [x.id, { ...x }]));
  const store = {
    getAll: () => ({ result: [...donnees.values()].map(x => ({ ...x })) }), get: (id: string) => ({ result: donnees.get(id) && { ...donnees.get(id) } }),
    put: (x: R) => { donnees.set(x.id, { ...x }); return { result: x.id }; }, delete: (id: string) => { donnees.delete(id); return { result: undefined }; },
  };
  vi.stubGlobal("indexedDB", { open: () => {
    const req: { result: unknown; onsuccess?: () => void } = { result: { close() {}, transaction: () => {
      const t: { oncomplete?: () => void; objectStore: () => unknown } = { objectStore: () => new Proxy(store, { get: (o, k) => (...a: unknown[]) => { const res = (o as never as Record<string, (...x: unknown[]) => { result: unknown }>)[k as string](...a); const q: { result: unknown; onsuccess?: () => void } = { result: res.result }; queueMicrotask(() => { q.onsuccess?.(); queueMicrotask(() => t.oncomplete?.()); }); return q; } }) };
      return t; } } };
    queueMicrotask(() => req.onsuccess?.()); return req; } });
  return donnees;
}
/* le serveur simulé : vérifie, refuse un ouvrage d'un autre compte (409), et note tout ce qui est envoyé */
function serveur(user: string | null, joignable = true) {
  const envois: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, o?: { method?: string; body?: string }) => {
    if (url === "/api/auth/get-session") return { ok: true, status: 200, json: async () => (user ? { user: { id: user } } : null) };
    if (!joignable) throw new Error("hors ligne");
    if (url === "/api/ouvrages" && o?.method === "POST") {
      const b = JSON.parse(o.body || "{}");
      if (b.action === "verifier") return { ok: true, status: 200, json: async () => ({ siens: b.ids.filter((i: string) => PROPRIOS[i] === user), autres: b.ids.filter((i: string) => PROPRIOS[i] && PROPRIOS[i] !== user) }) };
      if (PROPRIOS[b.id] && PROPRIOS[b.id] !== user) return { ok: false, status: 409, json: async () => ({ code: "autre-compte" }) };
      envois.push(b.id); return { ok: true, status: 200, json: async () => ({ ok: true }) };
    }
    if (url === "/api/ouvrages") return { ok: true, status: 200, json: async () => ({ ouvrages: Object.entries(PROPRIOS).filter(([, u]) => u === user).map(([id]) => ({ id, nom: id, dossier: "", w: 2, h: 2, progression: 0.5, maj: 1000 })) }) };
    if (url.startsWith("/api/ouvrages?id=")) return { ok: true, status: 200, json: async () => ({ contenu: "{\"w\":2,\"h\":2}" }) };
    return { ok: false, status: 404, json: async () => ({}) };
  }));
  return envois;
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); vi.useRealTimers(); });
const anciens = () => [r("de-A"), r("cree-ici"), r("de-B")];

it("sans compte : les anciens sont cachés (propriétaire inconnu), comptés, et rien n'est effacé", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base(anciens()); serveur(null);
  const L = await import("../lib/library");
  expect(await L.listProjects()).toEqual([]);
  expect(await L.anciensEnAttente()).toBe(3);
  expect(await L.tirerDuCompte()).toEqual([]);
  expect([...d.keys()].sort()).toEqual(["cree-ici", "de-A", "de-B"]);
});

it("B se connecte : il retrouve le sien, voit celui créé ici (local), ne voit jamais celui de A ; rien de A ne part", async () => {
  vi.useFakeTimers(); vi.stubEnv("BASE_URL", "/studio/");
  const d = base(anciens()); const envois = serveur("B");
  const L = await import("../lib/library");
  await L.tirerDuCompte();
  await vi.advanceTimersByTimeAsync(10000);
  expect(d.get("de-A")?.autreCompte).toBe(true);
  expect(d.get("de-B")?.compte).toBe("B");
  expect(d.get("cree-ici")?.appareil).toBe(true);
  expect(d.get("cree-ici")?.compte).toBeUndefined();
  expect((await L.listProjects()).map(x => x.id).sort()).toEqual(["cree-ici", "de-B"]);
  expect(envois).toEqual([]);   // ni « de-A », ni « cree-ici » (local tant qu'aucun geste ne le rattache)
  expect([...d.keys()].sort()).toEqual(["cree-ici", "de-A", "de-B"]);   // rien n'est effacé
});

it("aucun geste ne permet à B de prendre l'ouvrage de A : ni rattachement, ni suppression, ni enregistrement par-dessus", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base(anciens()); const envois = serveur("B");
  const L = await import("../lib/library");
  await L.tirerDuCompte();
  expect(await L.rattacherProjet("de-A")).toBe("impossible");
  await L.deleteProject("de-A");
  expect(d.has("de-A")).toBe(true);
  expect(envois).not.toContain("de-A");
});

it("un ouvrage « de l'appareil » qui s'avère rangé dans un autre compte : le serveur refuse, il est mis à l'écart, pas copié", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base([{ ...r("de-A"), appareil: true }]); const envois = serveur("B");
  const L = await import("../lib/library");
  expect(await L.rattacherProjet("de-A")).toBe("autre-compte");
  expect(d.get("de-A")?.autreCompte).toBe(true);
  expect(d.get("de-A")?.compte).toBeUndefined();
  expect(envois).toEqual([]);
  expect((await L.listProjects()).map(x => x.id)).toEqual([]);
});

it("une création locale légitime se rattache par un geste explicite, sans rien effacer", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base(anciens()); const envois = serveur("B");
  const L = await import("../lib/library");
  await L.tirerDuCompte();
  expect(await L.rattacherProjet("cree-ici")).toBe("rattache");
  expect(d.get("cree-ici")?.compte).toBe("B");
  expect(envois).toEqual(["cree-ici"]);
});

it("A se connecte ensuite sur le même appareil : son ouvrage lui revient ; celui rattaché par B reste à B", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base([{ ...r("de-A"), autreCompte: true }, { ...r("cree-ici"), compte: "B" }, { ...r("de-B"), compte: "B" }]); serveur("A");
  const L = await import("../lib/library");
  await L.tirerDuCompte();
  expect((await L.listProjects()).map(x => x.id)).toEqual(["de-A"]);
  expect(d.get("de-A")?.compte).toBe("A");
});

it("serveur injoignable : les anciens restent cachés et intacts, rien n'est envoyé", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base(anciens()); const envois = serveur("B", false);
  const L = await import("../lib/library");
  await L.tirerDuCompte();
  expect(await L.listProjects()).toEqual([]);
  expect([...d.values()].every(x => !x.compte && !x.appareil && !x.autreCompte)).toBe(true);
  expect(envois).toEqual([]);
});

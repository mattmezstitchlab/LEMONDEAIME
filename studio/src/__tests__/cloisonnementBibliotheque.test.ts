import { afterEach, expect, it, vi } from "vitest";

/* Sécurité S2, la bibliothèque de l'appareil : B ne voit ni ne supprime les ouvrages de A ; un ouvrage sans propriétaire
   n'est rattaché à un compte que par un geste. Une petite base IndexedDB en mémoire suffit à le vérifier. */
type R = { id: string; compte?: string; appareil?: boolean; autreCompte?: boolean; name: string; data: string; versions: unknown[]; folder: string; updated: number; w: number; h: number; progress: number };
function base(initial: R[]) {
  const donnees = new Map(initial.map(r => [r.id, r]));
  const store = {
    getAll: () => ({ result: [...donnees.values()] }), get: (id: string) => ({ result: donnees.get(id) }),
    put: (r: R) => { donnees.set(r.id, r); return { result: r.id }; }, delete: (id: string) => { donnees.delete(id); return { result: undefined }; },
  };
  vi.stubGlobal("indexedDB", { open: () => {
    const req: { result: unknown; onsuccess?: () => void } = { result: { close() {}, transaction: () => {
      const t: { oncomplete?: () => void; objectStore: () => unknown } = { objectStore: () => new Proxy(store, { get: (o, k) => (...a: unknown[]) => { const r = (o as never as Record<string, (...x: unknown[]) => { result: unknown }>)[k as string](...a); const q: { result: unknown; onsuccess?: () => void } = { result: r.result }; queueMicrotask(() => { q.onsuccess?.(); queueMicrotask(() => t.oncomplete?.()); }); return q; } }) };
      return t; } } };
    queueMicrotask(() => req.onsuccess?.()); return req; } });
  return donnees;
}
const r = (id: string, compte?: string): R => ({ id, name: id, data: "{}", versions: [], folder: "", updated: 1, w: 1, h: 1, progress: 0, ...(compte ? { compte } : {}) });
function session(user: string | null) {
  const envois: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, o?: { method?: string; body?: string }) => {
    if (url === "/api/auth/get-session") return { ok: true, json: async () => (user ? { user: { id: user } } : null) };
    if (o?.method === "POST") envois.push(JSON.parse(o.body || "{}").id || JSON.parse(o.body || "{}").action);
    return { ok: true, json: async () => ({ ok: true }) };
  }));
  return envois;
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

it("B ne voit que ses ouvrages et ceux sans propriétaire ; sans compte, seulement ceux sans propriétaire", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  base([r("de-A", "A"), r("de-B", "B"), { ...r("sans"), appareil: true } as R]); session("B");
  const L = await import("../lib/library");
  expect((await L.listProjects()).map(x => x.id).sort()).toEqual(["de-B", "sans"]);
  vi.resetModules(); session(null);
  const L2 = await import("../lib/library");
  expect((await L2.listProjects()).map(x => x.id)).toEqual(["sans"]);
});

it("B ne peut pas supprimer l'ouvrage de A, ni sur l'appareil ni dans un compte", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base([r("de-A", "A")]); const envois = session("B");
  const L = await import("../lib/library");
  await L.deleteProject("de-A");
  expect(d.has("de-A")).toBe(true); expect(envois).toEqual([]);
});

it("rattacher un ouvrage sans propriétaire : au compte connecté, envoyé une fois, jamais celui d'un autre", async () => {
  vi.stubEnv("BASE_URL", "/studio/");
  const d = base([{ ...r("sans"), appareil: true } as R, r("de-A", "A")]); const envois = session("B");
  const L = await import("../lib/library");
  expect(await L.rattacherProjet("sans")).toBe("rattache");
  expect(d.get("sans")?.compte).toBe("B"); expect(envois).toEqual(["sans"]);
  expect(await L.rattacherProjet("de-A")).toBe("impossible");
  expect(d.get("de-A")?.compte).toBe("A");
});

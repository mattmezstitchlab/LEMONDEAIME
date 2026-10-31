import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPrefs } from "../lib/accessibilityCore";
import { appliquerProfil, lireNiveau, profilActuel } from "../lib/point/profils";
import { enregistrer, instantane, lien, lireEtat, suivreChangements, utiliserCompte, type PreferencesPoint } from "../lib/preferencesCompte";

const reponse = (status: number, corps: unknown) => Promise.resolve(new Response(JSON.stringify(corps), { status }));

describe("Les préférences du Point dans le compte", () => {
  beforeEach(() => { localStorage.clear(); vi.useRealTimers(); });
  afterEach(() => vi.restoreAllMocks());

  it("un compte sans préférences : rien n'est envoyé tout seul ; « Enregistrer » les envoie sans base", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => reponse(200, { ok: true, preferences: null, maj: null }));
    expect((await lireEtat("u1")).etat).toBe("absent");
    expect(f).toHaveBeenCalledTimes(1);
    f.mockImplementation(() => reponse(200, { ok: true, maj: 1000 }));
    expect(await enregistrer("u1", null)).toEqual({ etat: "a-jour", maj: 1000 });
    const envoye = JSON.parse((f.mock.calls[1][1] as RequestInit).body as string);
    expect(envoye.base).toBeNull();
    expect(envoye.preferences).toEqual(instantane());
    expect(lien("u1")).toBe(1000);
    expect(lien("autre")).toBeNull();
  });

  it("le compte a d'autres préférences : on demande, on n'applique rien tant qu'on n'a pas choisi", async () => {
    appliquerProfil("experte");
    const distant: PreferencesPoint = { ...instantane(), profil: "lecture", niveau: "intermediate", menu: "liste", confort: { ...readPrefs(), fontScale: 1.25, lineHeight: 1.8, enhancedFocus: true } };
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reponse(200, { ok: true, preferences: distant, maj: 5000 }));
    const e = await lireEtat("u1");
    expect(e.etat).toBe("different");
    expect(profilActuel()).toBe("experte");   /* rien n'a bougé */
    utiliserCompte("u1", distant, 5000);      /* le geste explicite */
    expect(profilActuel()).toBe("lecture");
    expect(lireNiveau()).toBe("intermediate");
    expect(lien("u1")).toBe(5000);
  });

  it("une écriture fondée sur une version dépassée revient en conflit (409) : rien n'est écrasé", async () => {
    const distant = { ...instantane(), profil: "debutante" };
    vi.spyOn(globalThis, "fetch").mockImplementation(() => reponse(409, { ok: false, code: "conflit", preferences: distant, maj: 9000 }));
    const e = await enregistrer("u1", 5000);
    expect(e).toEqual({ etat: "different", compte: distant, maj: 9000 });
    expect(lien("u1")).toBeNull();
  });

  it("une fois lié, un changement part tout seul avec la base connue ; pas lié, rien ne part", async () => {
    vi.useFakeTimers();
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(() => reponse(200, { ok: true, maj: 7000 }));
    const arreter = suivreChangements("u1", () => {});
    appliquerProfil("debutante"); await vi.advanceTimersByTimeAsync(2500);
    expect(f).not.toHaveBeenCalled();
    localStorage.setItem("pointzero:preferences-compte:v1", JSON.stringify({ compte: "u1", maj: 6000 }));
    appliquerProfil("lecture"); await vi.advanceTimersByTimeAsync(2500);
    expect(f).toHaveBeenCalledTimes(1);
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string).base).toBe(6000);
    arreter();
  });
});

import { describe, expect, it } from "vitest";
import { adresseAtlas, verifierCreation } from "../lib/atlas/reference";

const A = "https://atlas.exemple/";
const ref = (o: object = {}) => ({ format: "atlas-reference", version: 1, type: "composition", id: "demo-un-essai-abc123", ...o });
const fiche = (o: object = {}) => ({ format: "atlas-creation", version: 1, id: "demo-un-essai-abc123", titre: "Démo", visibility: "public", publicationStatus: "publie", blocs: [], ...o });
const repondre = (statut: number, corps?: unknown) => (async () => new Response(corps === undefined ? "" : JSON.stringify(corps), { status: statut })) as unknown as typeof fetch;

describe(".0NE → ATLAS : la référence", () => {
  it("construit l'adresse de lecture et la fiche, sans rien ajouter", () => {
    expect(adresseAtlas(ref(), A)).toEqual({ ok: true, url: A + "composition/demo-un-essai-abc123", fiche: A + "creations/demo-un-essai-abc123.json" });
  });
  it("refuse les références invalides", () => {
    for (const r of [null, "x", ref({ format: "atlas-recette" }), ref({ version: 2 }), ref({ type: "entree" }), ref({ id: "../admin" }), ref({ id: "A-Majuscule" }), ref({ id: "x?apercu=1" }), ref({ id: "" })])
      expect(adresseAtlas(r, A).ok).toBe(false);
  });
  it("dit honnêtement l'état de la création", async () => {
    expect(await verifierCreation(ref(), repondre(200, fiche()), A)).toEqual({ etat: "publiee", titre: "Démo", url: A + "composition/demo-un-essai-abc123" });
    expect((await verifierCreation(ref(), repondre(404), A)).etat).toBe("absente");
    expect((await verifierCreation(ref(), repondre(200, fiche({ visibility: "prive" })), A)).etat).toBe("privee");
    expect((await verifierCreation(ref(), repondre(200, fiche({ publicationStatus: "brouillon" })), A)).etat).toBe("non-publiee");
    expect((await verifierCreation(ref(), repondre(200, fiche({ id: "autre" })), A)).etat).toBe("invalide");
    expect((await verifierCreation(ref({ id: "../x" }), repondre(200, fiche()), A)).etat).toBe("invalide");
    expect((await verifierCreation(ref(), (async () => { throw new TypeError("réseau"); }) as unknown as typeof fetch, A)).etat).toBe("injoignable");
  });
  it("n'envoie ni identité ni adresse d'origine", async () => {
    let options: RequestInit | undefined;
    await verifierCreation(ref(), (async (_u: string, o?: RequestInit) => { options = o; return new Response(JSON.stringify(fiche())); }) as unknown as typeof fetch, A);
    expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer" });
  });
});

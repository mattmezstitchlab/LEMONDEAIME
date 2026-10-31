/**
 * Phase 1 du Bureau éditorial : les contenus de l'édition sortent du code. La version publiée est fondue sur l'origine,
 * champ par champ ; tout ce qui est invalide retombe sur le texte d'origine. Et l'emplacement réservé au mode Tambour.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import Edition from "../components/edition/Edition";
import { ORIGINE, remplir, srcOk, validerContenus } from "../components/edition/contenus";
import { RENCONTRES } from "../components/edition/Participation";
import { creation } from "../components/edition/creation";
import { DISPOSITIONS, dispositionEffective, dispositionsProposees } from "../lib/point/disposition";

describe("Les contenus publiés, validés contre l'origine", () => {
  it("sans version publiée : l'origine, sans écart", () => {
    const { contenus, ecarts } = validerContenus(undefined);
    expect(contenus).toEqual(ORIGINE); expect(ecarts).toEqual([]);
  });
  it("un titre et une image valides remplacent l'origine ; le reste ne bouge pas", () => {
    const { contenus, ecarts } = validerContenus({ histoire: { origine: { titre: "Rouge & bleu",
      media: { src: "https://abc123.public.blob.vercel-storage.com/contenus/garance.webp", alt: "Une racine de garance", legende: "Photographie de l’atelier, 2026.", licence: "autorise", reconstitution: false } } } });
    expect(ecarts).toEqual([]);
    expect(contenus.histoire.origine.titre).toBe("Rouge & bleu");
    expect(contenus.histoire.origine.media.src).toMatch(/^https:\/\/abc123\.public\.blob/);
    expect(contenus.histoire.origine.sous).toBe(ORIGINE.histoire.origine.sous);
    expect(contenus.histoire.mulhouse).toEqual(ORIGINE.histoire.mulhouse);
  });
  it("refuse le balisage, les textes vides ou trop longs, les champs inconnus, les formes changées", () => {
    const { contenus, ecarts } = validerContenus({
      histoire: { origine: { titre: "<script>alert(1)</script>", sous: "", corps: "x".repeat(5000), inconnu: "?" }, sources: { liens: [{ libelle: "seul", url: "https://a.fr" }] } },
      fils: { etapes: "pas une liste" }, cadeau: { usages: [{ titre: 3, texte: "ok" }, { titre: "Deux", texte: "ok" }] },
    });
    expect(contenus.histoire.origine.titre).toBe(ORIGINE.histoire.origine.titre);
    expect(contenus.histoire.origine.sous).toBe(ORIGINE.histoire.origine.sous);
    expect(contenus.histoire.origine.corps).toBe(ORIGINE.histoire.origine.corps);
    expect(contenus.histoire.sources.liens).toEqual(ORIGINE.histoire.sources.liens);
    expect(contenus.fils.etapes).toEqual(ORIGINE.fils.etapes);
    expect(contenus.cadeau.usages[0].titre).toBe(ORIGINE.cadeau.usages[0].titre);
    expect(contenus.cadeau.usages[1].titre).toBe("Deux");
    expect("inconnu" in contenus.histoire.origine).toBe(false);
    expect(ecarts.map(e => e.chemin)).toEqual(expect.arrayContaining(["histoire.origine.titre", "histoire.origine.sous", "histoire.origine.corps", "histoire.origine.inconnu", "histoire.sources.liens", "fils.etapes", "cadeau.usages[0].titre"]));
  });
  it("des images d'ici ou du stockage de médias seulement ; des liens https seulement", () => {
    for (const ok of ["images/histoire/a.webp", "https://x1.public.blob.vercel-storage.com/contenus/b.jpg"]) expect(srcOk(ok)).toBe(true);
    for (const non of ["javascript:alert(1)", "https://exemple.com/a.webp", "images/../secret.webp", "/images/a.webp", "data:image/png;base64,AAA", "http://x1.public.blob.vercel-storage.com/a.png", "images/a.svg"]) expect(srcOk(non)).toBe(false);
    const { contenus } = validerContenus({ histoire: { sources: { liens: ORIGINE.histoire.sources.liens.map((l, i) => i ? l : { ...l, url: "javascript:alert(1)" }) } } });
    expect(contenus.histoire.sources.liens[0].url).toBe(ORIGINE.histoire.sources.liens[0].url);
  });
  it("une reconstitution est toujours annoncée ; une nouvelle image déclare sa licence et sa nature", () => {
    const m = ORIGINE.histoire.mulhouse.media;
    let r = validerContenus({ histoire: { mulhouse: { media: { legende: "Un atelier à Mulhouse." } } } });
    expect(r.contenus.histoire.mulhouse.media).toEqual(m);
    expect(r.ecarts[0].raison).toMatch(/reconstitution/);
    r = validerContenus({ histoire: { mulhouse: { media: { src: "images/histoire/autre.webp" } } } });
    expect(r.contenus.histoire.mulhouse.media.src).toBe(m.src);
    r = validerContenus({ histoire: { mulhouse: { media: { src: "images/histoire/autre.webp", licence: "reconstitution", reconstitution: false } } } });
    expect(r.contenus.histoire.mulhouse.media.src).toBe(m.src);
  });
  it("les gabarits de l'Orbe gardent leur place ; les réactions se remplissent comme avant", () => {
    const { contenus } = validerContenus({ rencontres: { trace: { reaction: "Bien vu." } }, cadeau: { orbeEnCours: "Encore un effort." } });
    expect(contenus.rencontres.trace.reaction).toBe(ORIGINE.rencontres.trace.reaction);
    expect(contenus.cadeau.orbeEnCours).toBe(ORIGINE.cadeau.orbeEnCours);
    expect(RENCONTRES[1].reaction("Pétales")).toBe("Pétales : les lignes sont posées.");
    expect(remplir("Il reste {n} choix", { n: 2 })).toBe("Il reste 2 choix");
    expect(RENCONTRES.map(r => r.id)).toEqual(["or-forme", "or-lignes", "or-finesse", "or-couleurs", "or-plein"]);
  });
});

const saved = { matchMedia: globalThis.matchMedia, getContext: HTMLCanvasElement.prototype.getContext };
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) as unknown as typeof globalThis.matchMedia;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => { globalThis.matchMedia = saved.matchMedia; HTMLCanvasElement.prototype.getContext = saved.getContext; });
let root: Root | null = null, hote: HTMLElement | null = null;
afterEach(async () => { await act(async () => root?.unmount()); root = null; hote?.remove(); hote = null; creation.oublier(); });

describe("L'édition lit les contenus publiés", () => {
  it("un titre, une image, une question de l'Orbe et une note changent à l'écran ; rien d'autre", async () => {
    const { contenus } = validerContenus({
      histoire: { origine: { titre: "Rouge & bleu", media: { src: "images/histoire/essai.webp", alt: "Essai", legende: "Photographie d’essai.", licence: "autorise", reconstitution: false } }, brodeuses: { corps: "Un *livre* et des fils." } },
      rencontres: { structure: { question: "Quelle forme ?" } }, cadeau: { note: "Une note publiée." },
    });
    hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote);
    await act(async () => { root!.render(<Edition actions={{ ouvrir: vi.fn(), importer: vi.fn(), visite: vi.fn() }} contenus={contenus} />); });
    const h2 = document.querySelector("#hi-origine h2")!;
    expect(h2.textContent).toBe("Rouge & bleu"); expect(h2.querySelector(".hi-et")!.textContent).toBe("&");
    expect(document.querySelector<HTMLImageElement>("#hi-origine .ed-brode-photo")!.getAttribute("src")).toMatch(/images\/histoire\/essai\.webp$/);
    expect(document.querySelector("#hi-origine figcaption")!.textContent).toBe("Photographie d’essai.");
    expect(document.querySelector("#hi-brodeuses .hi-corps i")!.textContent).toBe("livre");
    expect(document.querySelector("#or-forme .or-question")!.textContent).toBe("Quelle forme ?");
    expect(document.querySelector("#ed-cadeau .cd-note")!.textContent).toBe("Une note publiée.");
    expect(document.querySelector("#hi-mulhouse h2")!.textContent).toBe("Mulhouse");
    expect(document.querySelectorAll(".hi-sources a").length).toBe(5);
  });
  it("un texte hostile n'est jamais interprété comme du HTML", async () => {
    hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote);
    const brut = structuredClone(ORIGINE); brut.histoire.origine.sous = "<img src=x onerror=alert(1)>";
    await act(async () => { root!.render(<Edition actions={{ ouvrir: vi.fn(), importer: vi.fn(), visite: vi.fn() }} contenus={brut} />); });
    expect(document.querySelector("#hi-origine .hi-sous img")).toBeNull();
    expect(document.querySelector("#hi-origine .hi-sous")!.textContent).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("Les modes Tambour et Projection sur toile : des places réservées, rien de construit", () => {
  it("la configuration connaît « tambour », mais elle retombe sur le disque tant qu'il n'existe pas", () => {
    expect(DISPOSITIONS.map(d => d.id)).toEqual(expect.arrayContaining(["tambour", "projection"]));
    expect(dispositionEffective("tambour")).toBe("disque");
    expect(dispositionEffective("projection")).toBe("disque");
    expect(dispositionEffective("n'importe quoi")).toBe("disque");
    expect(dispositionEffective(undefined)).toBe("disque");
    expect(dispositionsProposees().map(d => d.id)).toEqual(["disque"]);
  });
});

describe("La landing lit la version publiée ; l'aperçu reste réservé et annoncé", () => {
  const monter = async (url: string, reponse: (u: string) => Response | Promise<Response>) => {
    window.history.replaceState(null, "", url);
    const f = vi.fn((u: string) => Promise.resolve(reponse(u)));
    vi.stubGlobal("fetch", f); vi.stubEnv("BASE_URL", "/studio/");
    const { EditionEnLigne } = await import("../components/edition/Edition");
    hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote);
    await act(async () => { root!.render(<EditionEnLigne actions={{ ouvrir: vi.fn(), importer: vi.fn(), visite: vi.fn() }} />); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });
    return f;
  };
  const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); localStorage.clear(); window.history.replaceState(null, "", "/"); });

  it("une version publiée remplace le titre ; elle est revalidée dans le navigateur", async () => {
    const c = structuredClone(ORIGINE); c.histoire.origine.titre = "Publié & vu"; c.histoire.origine.sous = "<b>refusé</b>";
    const f = await monter("/?edition", () => json({ ok: true, version: "7", contenus: c }));
    expect(f).toHaveBeenCalledWith("/api/contenus", expect.anything());
    expect(document.querySelector("#hi-origine h2")!.textContent).toBe("Publié & vu");
    expect(document.querySelector<HTMLImageElement>("#hi-origine .ed-brode-photo")!.getAttribute("src")).toBe("/studio/images/histoire/reconstitution-pigments.webp");
    expect(document.querySelector("#hi-origine .hi-sous")!.textContent).toBe(ORIGINE.histoire.origine.sous);
    expect(document.querySelector(".ed-apercu")).toBeNull();
  });
  it("sans API (page HTML, erreur réseau) ou sans publication : le texte d'origine", async () => {
    await monter("/?edition", () => new Response("<!doctype html>", { status: 200, headers: { "Content-Type": "text/html" } }));
    expect(document.querySelector("#hi-origine h2")!.textContent).toBe("Garance & indigo");
    await act(async () => root?.unmount()); hote?.remove(); root = null;
    await monter("/?edition", () => json({ ok: true, contenus: null }));
    expect(document.querySelector("#hi-origine h2")!.textContent).toBe("Garance & indigo");
  });
  it("?apercu=ID : la version demandée, annoncée comme non publiée ; refusée sans le compte d'administration", async () => {
    const c = structuredClone(ORIGINE); c.histoire.origine.titre = "Brouillon & essai";
    const f = await monter("/?edition&apercu=12", () => json({ ok: true, contenus: c, ecarts: [] }));
    expect(f).toHaveBeenCalledWith("/api/contenus?version=12", expect.objectContaining({ credentials: "same-origin" }));
    expect(document.querySelector("#hi-origine h2")!.textContent).toBe("Brouillon & essai");
    expect(document.querySelector(".ed-apercu")!.textContent).toMatch(/Aperçu de la version 12 : elle n’est pas publiée/);
    await act(async () => root?.unmount()); hote?.remove(); root = null;
    await monter("/?edition&apercu=12", () => json({ ok: false }, 403));
    expect(document.querySelector(".ed-apercu")!.textContent).toMatch(/réservé à l’administration/);
    expect(document.querySelector("#hi-origine h2")!.textContent).toBe("Garance & indigo");
  });
});

describe("Servi seul (essais locaux, sans API)", () => {
  it("n'appelle aucune API : pas d'erreur 404 dans la page, les textes d'origine", async () => {
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    const { EditionEnLigne } = await import("../components/edition/Edition");
    hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote);
    await act(async () => { root!.render(<EditionEnLigne actions={{ ouvrir: vi.fn(), importer: vi.fn(), visite: vi.fn() }} />); });
    expect(f).not.toHaveBeenCalled();
    expect(document.querySelector("#hi-origine h2")!.textContent).toBe("Garance & indigo");
    vi.unstubAllGlobals();
  });
});

/**
 * La carte vivante : une donnée, plusieurs formes. Les modules suivent le métier et le rôle ; les actions ne s'inventent pas ;
 * la carte devient sa page sans navigation, en gardant le média affiché, la face et le créneau choisi.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import CarteVivante from "../components/carte/CarteVivante";
import { actionsPour, disposition, METIERS, modulesVisibles, type Carte, type Format, type Role } from "../lib/carte/carte";
import { CARTE_EXEMPLE } from "../lib/carte/exemple";

describe("Le modèle : des modules facultatifs, configurés par le métier et le rôle", () => {
  it("chaque rôle voit ce qui lui est ouvert, dans l'ordre du métier ; l'identité est toujours là", () => {
    const v = modulesVisibles(CARTE_EXEMPLE, "visiteur"), c = modulesVisibles(CARTE_EXEMPLE, "client");
    expect(v[0]).toBe("identite");
    expect(v).not.toContain("contact"); expect(c).toContain("contact");
    expect(v.filter(t => c.includes(t))).toEqual(v);
    const prive: Carte = { ...CARTE_EXEMPLE, visibilite: { ...CARTE_EXEMPLE.visibilite, tarifs: "prive" } };
    expect(modulesVisibles(prive, "client")).not.toContain("tarifs");
    expect(modulesVisibles(prive, "proprietaire")).toContain("tarifs");
  });
  it("un module sans données, ou que le métier ne propose pas, n'apparaît jamais", () => {
    const sans: Carte = { ...CARTE_EXEMPLE, tarifs: [], galerie: undefined };
    expect(modulesVisibles(sans, "proprietaire")).not.toContain("tarifs");
    expect(modulesVisibles(sans, "proprietaire")).not.toContain("galerie");
    const musicien: Carte = { ...CARTE_EXEMPLE, metier: "musicien" };
    expect(METIERS.musicien.modules).not.toContain("galerie");
    expect(modulesVisibles(musicien, "proprietaire")).not.toContain("galerie");
  });
  it("les actions : déclarées par la carte, permises par le métier, autorisées pour le rôle ; jamais inventées", () => {
    expect(actionsPour(CARTE_EXEMPLE, "visiteur")).toEqual(["contacter", "devis", "enregistrer", "partager"]);
    expect(actionsPour(CARTE_EXEMPLE, "client")).toContain("reserver");
    expect(actionsPour(CARTE_EXEMPLE, "proprietaire")).toEqual(["partager", "modifier"]);
    const pirate = { ...CARTE_EXEMPLE, actions: ["supprimer-tout", "modifier"] } as unknown as Carte;
    expect(actionsPour(pirate, "visiteur")).toEqual([]);
    expect(actionsPour({ ...CARTE_EXEMPLE, metier: "musicien" }, "client")).not.toContain("reserver");
  });
  it("chaque forme dispose les mêmes données ; rien ne se perd : la page montre tout ce que le rôle voit", () => {
    for (const role of ["visiteur", "client", "proprietaire"] as Role[]) {
      const vis = modulesVisibles(CARTE_EXEMPLE, role);
      expect(disposition("page", vis).recto).toEqual(vis);
      for (const f of ["ronde", "carree", "verticale"] as Format[]) {
        const d = disposition(f, vis);
        expect([...d.recto, ...d.verso, ...d.ailleurs].sort()).toEqual([...vis].sort());
        if (vis.includes("actions")) expect(d.verso.at(-1)).toBe("actions");
      }
    }
    expect(disposition("ronde", modulesVisibles(CARTE_EXEMPLE, "visiteur")).verso.length).toBeLessThanOrEqual(2);
  });
  it("la carte d'exemple est fictive et annonce ses reconstitutions", () => {
    expect(CARTE_EXEMPLE.fictive).toBe(true);
    for (const m of CARTE_EXEMPLE.medias) if (/reconstitution/.test(m.src)) expect(m.credit).toMatch(/Reconstitution/);
  });
});

/* ——— le composant ——— */
const saved = { matchMedia: globalThis.matchMedia };
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((q: string) => ({ matches: false, media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) as unknown as typeof globalThis.matchMedia;
  if (!globalThis.CSS?.escape) (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = { escape: (s: string) => s.replace(/:/g, "\\:") };
});
afterAll(() => { globalThis.matchMedia = saved.matchMedia; });
let root: Root | null = null, hote: HTMLElement | null = null;
afterEach(async () => { await act(async () => root?.unmount()); root = null; hote?.remove(); hote = null; });

function Banc({ role = "visiteur" as Role, depart = "verticale" as Format }) {
  return <Hote role={role} depart={depart} />;
}
import { useState } from "react";
function Hote({ role, depart }: { role: Role; depart: Format }) {
  const [f, setF] = useState<Format>(depart);
  return <><button type="button" data-format-test="ronde" onClick={() => setF("ronde")}>ronde</button><button type="button" data-format-test="carree" onClick={() => setF("carree")}>carrée</button>
    <CarteVivante carte={CARTE_EXEMPLE} role={role} format={f} onFormat={setF} /></>;
}
const monter = async (role?: Role, depart?: Format) => {
  hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote);
  await act(async () => { root!.render(<Banc role={role} depart={depart} />); });
};
const clic = async (el: Element | null | undefined) => { expect(el).toBeTruthy(); await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); };
const bouton = (nom: RegExp) => [...document.querySelectorAll<HTMLButtonElement>("button")].find(b => nom.test(b.getAttribute("aria-label") || b.textContent || ""));
const raf = () => act(async () => { await new Promise(r => requestAnimationFrame(() => r(null))); });
const mediaCourant = () => document.querySelector<HTMLImageElement>(".cv-recto .cv-media, .cv-page .cv-media")!.getAttribute("src");

describe("La carte vivante, au clavier et au doigt", () => {
  it("retourner : la face cachée est inerte, le focus passe au titre du verso, puis revient au recto", async () => {
    await monter();
    const recto = document.querySelector(".cv-recto")!, verso = document.querySelector(".cv-verso")!;
    expect(verso.hasAttribute("inert")).toBe(true); expect(recto.hasAttribute("inert")).toBe(false);
    await clic(bouton(/voir le verso/)); await raf();
    expect(document.querySelector(".cv")!.getAttribute("data-face")).toBe("verso");
    expect(recto.hasAttribute("inert")).toBe(true); expect(verso.hasAttribute("inert")).toBe(false);
    expect(verso.getAttribute("aria-hidden")).toBe("false");
    expect(document.activeElement?.classList.contains("cv-verso-titre")).toBe(true);
    await clic(bouton(/revenir au recto/)); await raf();
    expect(document.activeElement?.classList.contains("cv-nom")).toBe(true);
  });
  it("le carrousel : suivant, précédent, flèches du clavier, points ; l'annonce dit où l'on est ; jamais de défilement seul", async () => {
    await monter();
    const premier = mediaCourant();
    await clic(bouton(/^Média suivant$/));
    expect(mediaCourant()).not.toBe(premier);
    expect(document.querySelector(".cv-recto .cv-carrousel .cv-cache")!.textContent).toMatch(/^Média 2 sur 3 : /);
    const car = document.querySelector<HTMLElement>(".cv-recto .cv-carrousel")!;
    await act(async () => { car.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); });
    expect(mediaCourant()).toBe(premier);
    await act(async () => { car.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); });
    expect(document.querySelector(".cv-recto .cv-cache")!.textContent).toMatch(/^Média 3 sur 3/);
    await clic(bouton(/^Média 1 :/));
    expect(mediaCourant()).toBe(premier);
    await act(async () => { await new Promise(r => setTimeout(r, 50)); });
    expect(mediaCourant()).toBe(premier);
  });
  it("changer de forme garde tout : le média affiché, la face, le créneau choisi", async () => {
    await monter("client");
    await clic(bouton(/^Média suivant$/));
    const second = mediaCourant();
    await clic(bouton(/voir le verso/));
    await clic([...document.querySelectorAll(".cv-verso .cv-creneau")][1]);
    const choisi = document.querySelector(".cv-choisi")!.textContent;
    await clic(document.querySelector('[data-format-test="carree"]'));
    expect(document.querySelector(".cv")!.className).toMatch(/cv-carree/);
    expect(document.querySelector(".cv")!.getAttribute("data-face")).toBe("verso");
    expect(mediaCourant()).toBe(second);
    await clic(bouton(/Voir toute la carte/));
    expect(document.querySelector(".cv-page .cv-choisi")!.textContent).toBe(choisi);
    expect(mediaCourant()).toBe(second);
  });
  it("devenir une page : sans navigation, toutes les données du rôle ; Échap ou Réduire revient à la forme d'avant", async () => {
    await monter("client", "carree");
    const adresse = window.location.href;
    await clic(bouton(/Voir toute la carte/));
    expect(window.location.href).toBe(adresse);
    const dans = [...document.querySelectorAll<HTMLElement>(".cv-page [data-module]")].map(e => e.dataset.module);
    expect([...dans].sort()).toEqual([...modulesVisibles(CARTE_EXEMPLE, "client")].sort()); /* le média occupe la colonne de gauche */
    expect(document.activeElement?.classList.contains("cv-nom")).toBe(true);
    await act(async () => { document.activeElement!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(document.querySelector(".cv")!.className).toMatch(/cv-carree/);
    expect(document.activeElement?.textContent).toBe("Voir toute la carte");
    await clic(bouton(/Voir toute la carte/)); await clic(bouton(/Réduire la carte/));
    expect(document.querySelector(".cv")!.className).toMatch(/cv-carree/);
  });
  it("les actions : celles du rôle seulement ; réserver demande un créneau ; rien n'est envoyé", async () => {
    await monter("visiteur", "verticale");
    await clic(bouton(/Voir toute la carte/));
    const noms = [...document.querySelectorAll(".cv-page .cv-action")].map(b => b.textContent);
    expect(noms).toEqual(["Contacter", "Demander un devis", "Enregistrer la carte", "Partager"]);
    await act(async () => root?.unmount()); hote?.remove(); root = null;
    const f = vi.fn(); vi.stubGlobal("fetch", f);
    await monter("client", "page");
    await clic([...document.querySelectorAll(".cv-page .cv-action")].find(b => b.textContent === "Réserver"));
    expect(document.querySelector(".cv-message")!.textContent).toBe("Choisissez d’abord un créneau.");
    await clic(document.querySelector(".cv-page .cv-creneau"));
    await clic([...document.querySelectorAll(".cv-page .cv-action")].find(b => b.textContent === "Réserver"));
    expect(document.querySelector(".cv-message")!.textContent).toMatch(/Démonstration : « Réserver » \(Mardi 10 h\) n’envoie rien/);
    expect(f).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

/**
 * Le Point, contrôleur universel : un seul bouton, un anneau de modes, Confort toujours premier.
 * Le noyau (lib/point) est vérifié seul ; le Point est ensuite vérifié dans l'atelier : clavier, focus, annonces, réglages appliqués.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import AccessibilityShell from "../components/AccessibilityShell";
import { anneau, dispositionArc, ecrirePresentation, lirePresentation, nomAccessible, positionDe, presentationPour, PRESENTATION_CLE, secteurVise, tourner, type ModePoint } from "../lib/point/modes";
import { annonce, PROFILS, reglagesActifs } from "../lib/point/confort";
import { ACCESS_KEY, DEFAULT_ACCESS, readPrefs } from "../lib/accessibilityCore";

const m = (id: string, groupe: ModePoint["groupe"], actif = false): ModePoint => ({ id, nom: id, aide: "aide de " + id, groupe, actif, ouvrir: () => {} });

describe("Le Point · le noyau", () => {
  it("met Confort en premier, puis le socle, le métier, la création, en gardant l'ordre de déclaration", () => {
    const l = anneau([m("espace", "creation"), m("broderie", "metier"), m("loupe", "socle"), m("confort", "acces"), m("guide", "socle")]);
    expect(l.map(x => x.id)).toEqual(["confort", "loupe", "guide", "broderie", "espace"]);
  });
  it("refuse un anneau sans réglage d'accès, avec deux, ou avec un mode en double", () => {
    expect(() => anneau([m("loupe", "socle")])).toThrow(/exactement un mode d’accès/);
    expect(() => anneau([m("a", "acces"), m("b", "acces")])).toThrow();
    expect(() => anneau([m("a", "acces"), m("x", "socle"), m("x", "metier")])).toThrow(/double/);
  });
  it("tourne en boucle et place Confort en haut (repère radial)", () => {
    expect(tourner(0, 4, -1)).toBe(3); expect(tourner(3, 4, 1)).toBe(0);
    const haut = positionDe(0, 4, 80, 264);
    expect(Math.round(haut.x)).toBe(132); expect(Math.round(haut.y)).toBe(132 - 80);
  });
  it("la Poignée : un geste court est un clic, un tiré vise le secteur dans sa direction", () => {
    expect(secteurVise(5, -5, 4)).toBeNull();
    expect(secteurVise(0, -60, 4)).toBe(0);  // vers le haut : Confort
    expect(secteurVise(60, 0, 4)).toBe(1);   // vers la droite
    expect(secteurVise(0, 60, 4)).toBe(2);   // vers le bas
    expect(secteurVise(-60, 0, 4)).toBe(3);  // vers la gauche
  });
  it("la Poignée du compositeur : quatre quarts en diagonale, le quart 0 en haut à gauche", () => {
    expect(secteurVise(-50, -50, 4, 36, -45)).toBe(0); // haut gauche
    expect(secteurVise(50, -50, 4, 36, -45)).toBe(1);  // haut droit
    expect(secteurVise(50, 50, 4, 36, -45)).toBe(2);   // bas droit
    expect(secteurVise(-50, 50, 4, 36, -45)).toBe(3);  // bas gauche
    expect(secteurVise(20, -20, 4, 36, -45)).toBeNull();
  });
  it("présentation : anneau sur grand écran, panneau compact sur téléphone, arc ou liste si on les choisit", () => {
    expect(presentationPour("auto", 1440)).toBe("anneau");
    expect(presentationPour("auto", 390)).toBe("panneau");
    expect(presentationPour("arc", 390)).toBe("arc");
    expect(presentationPour("liste", 1440)).toBe("liste");
    expect(lirePresentation()).toBe("auto");
    ecrirePresentation("liste"); expect(lirePresentation()).toBe("liste");
    ecrirePresentation("auto"); expect(localStorage.getItem(PRESENTATION_CLE)).toBeNull();
  });
  it("l'arc compact : un quart de cercle vers le côté libre, boutons espacés d'au moins 52 px (pastilles de 48), sans sortir de l'écran", () => {
    for (const n of [3, 4, 5]) {
      const d = dispositionArc(n, 40, 800, 390);
      expect(d.sens).toBe(1);
      for (let i = 1; i < n; i++) expect(Math.hypot(d.points[i].x - d.points[i - 1].x, d.points[i].y - d.points[i - 1].y)).toBeGreaterThanOrEqual(52);
      expect(Math.round(d.points[0].x)).toBe(40); // le premier mode (Confort) juste au-dessus du Point
      expect(d.boite.left).toBeGreaterThanOrEqual(0); expect(d.boite.right).toBeLessThanOrEqual(390);
    }
    expect(dispositionArc(4, 350, 800, 390).sens).toBe(-1);
  });
  it("le nom d'un secteur commence par son mot visible et dit s'il est actif", () => {
    expect(nomAccessible(m("Loupe", "socle", true))).toMatch(/^Loupe, actif : /);
  });
  it("l'Onde dit ce qui a changé, en une phrase", () => {
    expect(annonce(DEFAULT_ACCESS, { ...DEFAULT_ACCESS, fontScale: 1.25, reduceMotion: true })).toBe("Texte à 125 %, Mouvements réduits activé.");
    expect(annonce(DEFAULT_ACCESS, DEFAULT_ACCESS)).toBe("Aucun changement.");
    expect(reglagesActifs(PROFILS[0].valeur)).toBe(3);
  });
});

vi.mock("../lib/library", async importOriginal => ({ ...await importOriginal<typeof import("../lib/library")>(), saveLibrary: vi.fn().mockResolvedValue(undefined) }));
const saved = { matchMedia: globalThis.matchMedia, ResizeObserver: globalThis.ResizeObserver, getContext: HTMLCanvasElement.prototype.getContext };
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof globalThis.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => { globalThis.matchMedia = saved.matchMedia; globalThis.ResizeObserver = saved.ResizeObserver; HTMLCanvasElement.prototype.getContext = saved.getContext; });

let root: Root | null = null, container: HTMLElement | null = null;
const attendre = () => act(async () => { for (let k = 0; k < 4; k++) await new Promise(r => requestAnimationFrame(() => r(null))); });
async function ouvrirAtelier() {
  window.history.replaceState(null, "", "/atelier");
  localStorage.setItem("pointzero:visite-docks:v1", "vue");
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<AccessibilityShell><App /></AccessibilityShell>); });
  await attendre();
}
const lePoint = () => container?.querySelector<HTMLButtonElement>(".lp-point");
const secteurs = () => [...document.querySelectorAll<HTMLButtonElement>('[data-presentation] [role="menuitem"]')];
const cliquer = async (el: Element | null | undefined) => { expect(el).toBeTruthy(); await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); }); await attendre(); };
const touche = async (el: Element | null | undefined, key: string) => { await act(async () => { el!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })); }); await attendre(); };
const panneau = () => document.querySelector<HTMLElement>(".lp-panneau");

beforeEach(() => { localStorage.clear(); });
afterEach(async () => { await act(async () => root?.unmount()); root = null; container?.remove(); container = null; localStorage.clear(); window.history.replaceState(null, "", "/"); });

describe("Le Point · dans l'atelier", () => {
  it("un seul Point : il remplace le cercle, s'ouvre en menu, Confort premier et focalisé", async () => {
    await ouvrirAtelier();
    expect(container!.querySelectorAll(".lp-point").length).toBe(1);
    expect(container!.querySelector(".pzs-bottom .lp-point")).toBeTruthy();
    expect(lePoint()!.getAttribute("aria-haspopup")).toBe("menu");
    await cliquer(lePoint());
    expect(lePoint()!.getAttribute("aria-expanded")).toBe("true");
    expect(secteurs().map(s => s.dataset.mode)).toEqual(["confort", "loupe", "guide", "broderie"]);
    expect(document.activeElement).toBe(secteurs()[0]);
    expect(secteurs()[0].tabIndex).toBe(0); expect(secteurs()[1].tabIndex).toBe(-1);
  });
  it("au clavier : les flèches tournent et bouclent, Fin et Début, Échap referme et rend le focus au Point", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint());
    await touche(document.activeElement, "ArrowRight");
    expect((document.activeElement as HTMLElement).dataset.mode).toBe("loupe");
    await touche(document.activeElement, "ArrowLeft"); await touche(document.activeElement, "ArrowLeft");
    expect((document.activeElement as HTMLElement).dataset.mode).toBe("broderie");
    await touche(document.activeElement, "Home");
    expect((document.activeElement as HTMLElement).dataset.mode).toBe("confort");
    await touche(document.activeElement, "Escape");
    expect(document.querySelector(".lp-anneau")).toBeNull();
    expect(document.activeElement).toBe(lePoint());
  });
  it("Confort : un formulaire ordinaire, appliqué à toute la page, enregistré sur l'appareil, annoncé", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint());
    await cliquer(secteurs()[0]);
    const p = panneau()!;
    expect(p.getAttribute("role")).toBe("dialog");
    expect(p.querySelector("h2")?.textContent).toBe("Confort de lecture");
    const mouvement = [...p.querySelectorAll("label")].find(l => l.textContent?.startsWith("Mouvements réduits"))!.querySelector("input")!;
    await cliquer(mouvement);
    expect(readPrefs().reduceMotion).toBe(true);
    expect(localStorage.getItem(ACCESS_KEY)).toContain("\"reduceMotion\":true");
    expect(document.documentElement.dataset.pzMotion).toBe("reduce");
    expect(container!.querySelector(".lp-annonce")?.textContent).toBe("Mouvements réduits activé.");
    /* le Point porte la Marque : Confort est actif */
    expect(lePoint()!.getAttribute("aria-label")).toContain("Actif : Confort");
    /* le profil « Lecture confortable » (Mon profil) : un choix, pas un bouton */
    await cliquer([...p.querySelectorAll("label")].find(l => l.textContent?.startsWith("Lecture confortable"))!.querySelector("input")!);
    expect(readPrefs().fontScale).toBe(1.25);
    expect(document.documentElement.style.getPropertyValue("--pz-user-font-scale")).toBe("1.25");
    await touche(panneau(), "Escape");
    expect(panneau()).toBeNull();
    expect(document.activeElement).toBe(lePoint());
  });
  it("aucun réglage d'accès ne demande de glisser : chaque contrôle est un bouton, une case, un choix ou un curseur au clavier", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint()); await cliquer(secteurs()[0]);
    const champs = [...panneau()!.querySelectorAll("input")];
    expect(champs.length).toBeGreaterThan(8);
    expect(champs.every(i => ["checkbox", "radio", "range"].includes(i.type))).toBe(true);
    expect(champs.every(i => !!i.closest("label"))).toBe(true);
  });
  it("le lien d'évitement ouvre Confort de n'importe où, en deux gestes (Tab, Entrée)", async () => {
    await ouvrirAtelier();
    const lien = [...container!.querySelectorAll("button")].find(b => b.textContent === "Réglages de confort");
    await cliquer(lien);
    expect(panneau()).toBeTruthy();
  });
  it("Loupe et Broderie s'ouvrent depuis l'anneau ; la Loupe ne modifie rien", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint()); await cliquer(secteurs()[1]);
    expect(container!.querySelector(".pzs-loupe-dock")).toBeTruthy();
    await cliquer(lePoint()); await cliquer(secteurs()[3]);
    expect(container!.querySelector(".pzs-modes")).toBeTruthy();
  });
  it("la Loupe suit la case choisie au clavier comme le pointeur, sans rien modifier", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint()); await cliquer(secteurs()[1]);
    const loupe = () => container!.querySelector(".pzs-loupe-dock")?.textContent ?? "";
    const grille = container!.querySelector<HTMLCanvasElement>('canvas[role="application"]')!;
    const annuler = [...container!.querySelectorAll<HTMLButtonElement>("button")].find(b => b.getAttribute("aria-label") === "Annuler")!;
    await act(async () => { grille.focus(); }); await attendre();
    expect(loupe()).toContain("X 1 · Y 1");
    expect(loupe()).toContain("choisie au clavier");
    await touche(grille, "ArrowRight"); await touche(grille, "ArrowRight"); await touche(grille, "ArrowDown");
    expect(loupe()).toContain("X 3 · Y 2");
    expect(annuler.disabled).toBe(true); // rien n'a été brodé
  });
  it("le menu du haut n'est plus une orbe : c'est le menu AIME, avec toutes ses fonctions", async () => {
    await ouvrirAtelier();
    const menu = container!.querySelector<HTMLButtonElement>("#pzs-brand")!;
    expect(menu.querySelector(".pzs-orb")).toBeNull();
    expect(menu.getAttribute("aria-label")).toMatch(/^Menu AIME/);
    await cliquer(menu);
    const texte = container!.querySelector("#pzs-bloc")?.textContent ?? "";
    for (const f of ["Accueil Point Zéro", "Réglages et aide", "Revoir la visite avec Le Point", "Débutant", "Intermédiaire", "Expert"]) expect(texte).toContain(f);
    expect(container!.querySelectorAll(".pzs-orb").length).toBe(0);
  });
});

describe("Le même Point dans le compositeur 5D", () => {
  const ouvrirCompositeur = async () => {
    await ouvrirAtelier();
    await cliquer(container!.querySelector(".pz-point-zero-composer"));
    expect(container!.querySelector(".cr")).toBeTruthy();
  };
  it("un seul Point à l'écran : celui du compositeur, avec Confort, Guide et Espace", async () => {
    await ouvrirCompositeur();
    expect(document.querySelectorAll(".lp-point").length).toBe(1);
    expect(document.querySelector(".lp-contexte")?.getAttribute("data-contexte")).toBe("compositeur");
    await cliquer(lePoint());
    expect(secteurs().map(s => s.dataset.mode)).toEqual(["confort", "guide", "espace"]);
    expect(document.activeElement).toBe(secteurs()[0]);
  });
  it("Échap referme l'anneau sans fermer le compositeur ; Confort y est le même réglage", async () => {
    await ouvrirCompositeur();
    await cliquer(lePoint());
    await touche(document.activeElement, "Escape");
    expect(document.querySelector(".lp-anneau")).toBeNull();
    expect(container!.querySelector(".cr")).toBeTruthy();
    await cliquer(lePoint()); await cliquer(secteurs()[0]);
    const mouvement = [...panneau()!.querySelectorAll("label")].find(l => l.textContent?.startsWith("Focus renforcé"))!.querySelector("input")!;
    await cliquer(mouvement);
    expect(readPrefs().enhancedFocus).toBe(true);
    await touche(panneau(), "Escape");
    expect(panneau()).toBeNull();
    expect(container!.querySelector(".cr")).toBeTruthy();
  });
  it("Espace se coupe et se rallume, et l'annonce le dit ; les images restent toujours choisissables", async () => {
    await ouvrirCompositeur();
    const centre = () => container!.querySelector(".cr-centre")!;
    expect(centre().classList.contains("cr-espace")).toBe(true);
    await cliquer(lePoint()); await cliquer(secteurs()[2]);
    expect(centre().classList.contains("cr-espace")).toBe(false);
    expect(container!.querySelector(".cr [role=status]")?.textContent).toMatch(/Gestes spatiaux désactivés/);
    await cliquer(container!.querySelector('.cr-reponses [role="radio"]'));
    expect(container!.querySelector(".cr-sur")?.textContent).toContain("2 / 5");
  });
  it("le Guide du compositeur est la même visite, avec ses étapes", async () => {
    await ouvrirCompositeur();
    await cliquer(lePoint()); await cliquer(secteurs()[1]);
    expect(document.querySelector("#og-titre")?.textContent).toBe("Quatre réponses");
    await touche(document.querySelector(".og-couche"), "Escape");
    expect(document.querySelector("#og-titre")).toBeNull();
    expect(container!.querySelector(".cr")).toBeTruthy();
  });
});

describe("Le Point selon le support", () => {
  const largeur = (w: number) => Object.defineProperty(window, "innerWidth", { configurable: true, value: w });
  afterEach(() => largeur(1024));
  it("sur téléphone, par défaut : un panneau compact au-dessus du Point, le dock reste là ; même menu, même clavier", async () => {
    largeur(390);
    await ouvrirAtelier();
    await cliquer(lePoint());
    const p = document.querySelector<HTMLElement>(".lp-compact")!;
    expect(p.getAttribute("data-presentation")).toBe("panneau");
    expect(p.getAttribute("role")).toBe("menu");
    expect(secteurs().map(s => s.dataset.mode)).toEqual(["confort", "loupe", "guide", "broderie"]);
    expect(document.activeElement).toBe(secteurs()[0]);
    expect(secteurs().map(s => s.textContent)).toEqual(["Confort", "Loupe", "Guide", "Broderie"]);
    expect(container!.querySelector(".pzs-bottom")).toBeTruthy();
    await touche(document.activeElement, "ArrowDown");
    expect((document.activeElement as HTMLElement).dataset.mode).toBe("loupe");
    await touche(document.activeElement, "Escape");
    expect(document.activeElement).toBe(lePoint());
  });
  it("sur téléphone, au choix : le même menu en arc compact, Confort premier et focalisé, pictogrammes nommés", async () => {
    largeur(390);
    localStorage.setItem(PRESENTATION_CLE, "arc");
    await ouvrirAtelier();
    await cliquer(lePoint());
    expect(document.querySelector(".lp-arc")?.getAttribute("data-presentation")).toBe("arc");
    expect(secteurs().map(s => s.dataset.mode)).toEqual(["confort", "loupe", "guide", "broderie"]);
    expect(document.activeElement).toBe(secteurs()[0]);
    expect(secteurs().every(s => !!s.querySelector("svg") && s.getAttribute("aria-label")!.startsWith(s.dataset.mode === "confort" ? "Confort" : s.getAttribute("aria-label")!.split(/[ ,:]/)[0]))).toBe(true);
    expect(secteurs().map(s => s.getAttribute("aria-label")!.split(" :")[0])).toEqual(["Confort", "Loupe", "Guide", "Broderie"]);
    expect(document.querySelector(".lp-arc-mot")?.textContent).toBe("Confort");
    await touche(document.activeElement, "ArrowDown");
    expect(document.querySelector(".lp-arc-mot")?.textContent).toBe("Loupe");
    await touche(document.activeElement, "Escape");
    expect(document.activeElement).toBe(lePoint());
  });
  it("la liste en mots se choisit dans Confort, et sert ensuite partout", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint()); await cliquer(secteurs()[0]);
    const liste = [...panneau()!.querySelectorAll("label")].find(l => l.textContent?.startsWith("Liste en mots"))!.querySelector("input")!;
    await cliquer(liste);
    expect(localStorage.getItem(PRESENTATION_CLE)).toBe("liste");
    expect(container!.querySelector(".lp-annonce")?.textContent).toBe("Menu du Point : liste en mots.");
    await touche(panneau(), "Escape");
    await cliquer(lePoint());
    expect(document.querySelector(".lp-liste")).toBeTruthy();
    expect(secteurs()[0].textContent).toContain("taille du texte");
    expect(document.activeElement).toBe(secteurs()[0]);
  });
  it("un toucher à côté du menu le referme sans rien choisir dessous", async () => {
    largeur(390);
    await ouvrirAtelier();
    await cliquer(lePoint());
    expect(document.querySelector("[data-presentation]")).toBeTruthy();
    const dessous = container!.querySelector<HTMLButtonElement>(".pz-point-zero-composer")!;
    await act(async () => { dessous.dispatchEvent(new Event("pointerdown", { bubbles: true })); dessous.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })); });
    await attendre();
    expect(document.querySelector("[data-presentation]")).toBeNull();
    expect(container!.querySelector(".cr")).toBeNull(); // le compositeur ne s'est pas ouvert par mégarde
  });
  it("la loupe est ronde par défaut, carrée au choix, et s'en souvient", async () => {
    await ouvrirAtelier();
    await cliquer(lePoint()); await cliquer(secteurs()[1]);
    const toile = () => container!.querySelector(".pzs-loupe-dock canvas")!;
    expect(toile().getAttribute("data-forme")).toBe("ronde");
    await cliquer([...container!.querySelectorAll(".dg-loupe-formes button")].find(b => b.textContent?.startsWith("Carrée")));
    expect(toile().getAttribute("data-forme")).toBe("carree");
    expect(localStorage.getItem("pointzero:loupe:forme")).toBe("carree");
  });
});

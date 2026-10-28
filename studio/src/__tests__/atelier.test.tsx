/**
 * Intégration de l'atelier unique.
 * jsdom ne rend pas le trait Canvas : ici nous vérifions navigation, outils,
 * absence du guide et continuité des parcours. Le rendu réel exige une recette navigateur.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "../App";
import { createPattern, ensurePalette } from "../lib/pattern";
import { flossIndex } from "../lib/dmc";
import { loadStored, saveStored } from "../lib/store";

// Navigation tests isolate persistence; failure handling is covered by unifiedImport.
vi.mock("../lib/library", async importOriginal => ({...await importOriginal<typeof import("../lib/library")>(),saveLibrary:vi.fn().mockResolvedValue(undefined)}));
const saved = {
  matchMedia: globalThis.matchMedia,
  ResizeObserver: globalThis.ResizeObserver,
  getContext: HTMLCanvasElement.prototype.getContext,
};
beforeAll(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});
afterAll(() => {
  globalThis.matchMedia = saved.matchMedia;
  globalThis.ResizeObserver = saved.ResizeObserver;
  HTMLCanvasElement.prototype.getContext = saved.getContext;
});
let root: Root | null = null;
let container: HTMLElement | null = null;
async function mount(publicHome=false) {
  // Legacy atelier regression tests now use the explicit studio deep link.
  // The domain root now opens the cross-stitch welcome.
  const requested=localStorage.getItem("pointzero:workspace");
  if(!publicHome&&requested&&!window.location.search){
    window.history.replaceState(null,"","/?studio="+encodeURIComponent(requested));
  }
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<App />); });
  return container;
}
async function click(el: Element | null | undefined) {
  expect(el, "commande de l'atelier présente").toBeTruthy();
  await act(async () => { el!.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}
// Les deux docks (charte UniO) : en haut, faire ; en bas, se repérer.
const nav = () => container?.querySelector('nav[aria-label="Dock des outils du studio de broderie"]');
const bottom = () => container?.querySelector('nav[aria-label="Se repérer dans le studio"]');
const category = (name: string) => [...(nav()?.querySelectorAll("button") ?? [])].find((b) => b.textContent?.replace(/\d+$/, "") === name);
const inBottom = (name: string) => [...(bottom()?.querySelectorAll("button") ?? [])].find((b) => b.textContent === name || b.getAttribute("aria-label") === name);
const inspector = () => container?.querySelector('[aria-label="Inspecteur de broderie"]');
async function brandMenu(item: string) {
  await click(container?.querySelector("#pzs-brand"));
  await click([...(container?.querySelectorAll("#pzs-menu button") ?? [])].find(b => b.textContent === item));
}
const dialog = (name: string) => container?.querySelector(`[role="dialog"][aria-label="${name}"]`);
const button = (label: string) => container?.querySelector(`button[aria-label="${label}"]`);
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pointzero:workspace","embroidery");
  window.history.replaceState(null, "", "/");
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  localStorage.clear();
});
describe("POINTZERO : atelier unique sans assistant", () => {
  it("conserve le parcours historique AIME sur son lien explicite", async () => {
    window.history.replaceState(null, "", "/aime");
    localStorage.setItem("pointzero:workspace","design");
    await mount(true);
    expect(container?.querySelector('[aria-label="AIME — Architecture mère"]')).toBeTruthy();
    expect(container?.textContent).toContain("LETTRE OUVERTE");
    await click(container?.querySelector('a[href="/pointzero"]'));
    expect(container?.querySelector('[aria-label="POINTZERO .0 — Le temps retrouvé"]')).toBeTruthy();
    const opener=[...(container?.querySelectorAll("button")??[])].find(x=>x.textContent?.includes("Ouvrir l’Atelier"));
    await click(opener);
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    await click(button("Ouvrir le menu des studios"));
    expect(container?.querySelector('[aria-label="Choix du studio"]')).toBeTruthy();
    expect(button("Ouvrir le studio LE MONDE AIME · Présentation")).toBeNull();
    expect(button("Ouvrir le studio LE MONDE AIME · Atelier libre")).toBeTruthy();
    await click(button("Retour à l’accueil POINTZERO"));
    expect(container?.textContent).toContain("Le temps retrouvé.");
    expect(container?.querySelector('a[href="/le-monde-aime"]')).toBeTruthy();
  });


  it("affiche RIPPLECIRCLE comme module externe réutilisable sans chargement automatique", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Mon Espace · Tous les mondes"));
    await click(button("Démarrer le parcours Jour J"));
    await click(button("Afficher Ma page"));
    expect(container?.querySelector('[aria-label="Projet externe RIPPLECIRCLE · Cadran vivant"]')).toBeTruthy();
    expect(button("Essayer l'aperçu intégré de RIPPLECIRCLE · Cadran vivant")).toBeTruthy();
    expect(container?.querySelector('iframe[src="https://ripplecircle.vercel.app/"]')).toBeNull();
    const link=container?.querySelector('a[href="https://ripplecircle.vercel.app/"]');
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
    await click(button("Retour au studio universel"));
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Mini-site"));
    expect(container?.querySelector('option[value="externe"]')).toBeTruthy();
  });

  it("relie Mini-site au dossier juridique sans ressaisir le nom de son projet", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Mini-site"));
    expect(button("Vérifier Juridique RGPD du mini-site")).toBeTruthy();
    await click(button("Vérifier Juridique RGPD du mini-site"));
    expect(container?.querySelector('[aria-label="Espace Juridique & RGPD"]')).toBeTruthy();
    expect(container?.textContent).toContain("Mariage sans titre");
    await click(button("Ouvrir Mentions légales"));
    expect(container?.querySelector('[aria-label="Nature de l\'éditeur"]')).toBeTruthy();
    await click(button("Ouvrir Données personnelles"));
    expect(container?.querySelector('[aria-label="Ajouter un traitement au registre"]')).toBeTruthy();
    await click(button("Ouvrir Cookies & sécurité"));
    expect(container?.querySelector('[aria-label="Catégorie des traceurs"]')).toBeTruthy();
    await click(button("Ouvrir Dossier à transmettre"));
    expect(button("Exporter le brouillon juridique Markdown")).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("Mini-site : plan du site, Academy, diagnostic et correction dans les vrais champs", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Mini-site"));
    expect(container?.querySelector('[aria-label="Sélectionner l\'accueil et le hero du mini-site"]')).toBeTruthy();
    await click(button("Ouvrir le parcours Academy du mini-site"));
    const progress=container?.querySelector('[aria-label="Progression Academy du mini-site"]');
    expect(progress).toBeTruthy();
    expect(container?.querySelector('[aria-label="Public visé par le mini-site"]')).toBeTruthy();
    await click(button("Étape Premier écran"));
    expect(button("Corriger Titre principal trop générique")).toBeTruthy();
    await click(button("Corriger Titre principal trop générique"));
    expect(container?.querySelector('[aria-label="Titre principal"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Libellé du bouton du hero"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Destination interne du bouton du hero"]')).toBeTruthy();
    await click(button("Ouvrir le parcours Academy du mini-site"));
    await click(button("Étape Lisibilité"));
    expect(container?.querySelector('[aria-label="Progression Academy du mini-site"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("ouvre Mon Espace et suit un Jour J fictif jusqu'au plan causal sans notifications", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Mon Espace · Tous les mondes"));
    expect(container?.querySelector('[aria-label="Espace Mon Espace"]')).toBeTruthy();
    await click(button("Démarrer le parcours Jour J"));
    expect(container?.querySelector('[aria-label="Progression de formation Jour J"]')).toBeTruthy();
    await click(button("Simuler un retard pour le Jour J"));
    expect(container?.querySelector('[aria-label="Aperçu de l\'onde causale"]')).toBeTruthy();
    await click(button("Retard 20 minutes"));
    await click(button("Enregistrer un brouillon causal"));
    await click(button("Valider le plan causal sans envoyer"));
    expect(container?.textContent).toContain("aucun envoi");
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });
  it("ouvre Studio Causal en direct avec une page vide et permet de retrouver son espace", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Studio Causal · RIPPLE"));
    expect(container?.querySelector('[aria-label="Espace Studio Causal"]')).toBeTruthy();
    await click(button("Afficher Ma page"));
    expect(container?.querySelector('[aria-label="Espace Studio Causal"]')).toBeTruthy();
    expect(button("Créer mon espace")).toBeTruthy();
  });

  it("ouvre POINTZERO Academy puis son parcours No Code en mode apprenant et formateur", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio POINTZERO Academy · UI/UX & No Code"));
    expect(container?.querySelector('[aria-label="Espace UI/UX & Academy"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Prévisualisation du site No Code"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Progression du parcours UI UX"]')).toBeTruthy();
    await click(button("Mode formateur Academy"));
    expect(container?.querySelector('[aria-label="Titre de l\'exercice du formateur"]')).toBeTruthy();
    await click(button("Mode apprenant Academy"));
    await click(button("Aperçu Mobile"));
    expect(button("Aperçu Mobile")?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Ajouter bloc Citation"));
    expect(container?.querySelectorAll('[aria-label^="Modifier "]').length).toBeGreaterThan(4);
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("ouvre Studio Accessibilité et expose réglages persistants, contrastes et audit HTML", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Accessibilité & Design System"));
    expect(container?.querySelector('[aria-label="Espace Accessibilité & Design System"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Agrandir les caractères"]')).toBeTruthy();
    await click(button("Ouvrir Design System"));
    expect(container?.querySelector('[aria-label="Couleurs d\'accent accessibles"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Choisir la couleur de fond"]')).toBeTruthy();
    await click(button("Ouvrir Audit WCAG / RGAA"));
    expect(button("Analyser les critères HTML de base")).toBeTruthy();
    await click(button("Ouvrir Confidentialité"));
    expect(container?.querySelector('[aria-label="Mode discret des aperçus"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("ouvre Studio Music et propose invités, Radio Mix, pré-mastering et SACEM", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Music · Radio & Label"));
    expect(container?.querySelector('[aria-label="Espace Music · Radio & Label"]')).toBeTruthy();
    expect(button("Ouvrir Radio & Mix")).toBeTruthy();
    await click(button("Ouvrir Playlists & invités"));
    expect(container?.querySelector('[aria-label="Titre demandé par l\'invité"]')).toBeTruthy();
    await click(button("Ouvrir Pré-mastering"));
    expect(container?.querySelector('[aria-label="Profil de pré-master"]')).toBeTruthy();
    await click(button("Ouvrir Artistes & Label"));
    expect(container?.querySelector('[aria-label="Fiche du morceau musical"]')).toBeTruthy();
    await click(button("Ouvrir Événements & SACEM"));
    expect(button("Exporter un programme SACEM préparatoire")).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("conserve la page publique LE MONDE AIME par lien direct, hors du menu des studios", async () => {
    window.history.replaceState(null,"","/?site=le-monde-aime");
    await mount();
    expect(container?.querySelector('[aria-label="Présentation LE MONDE AIME"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Présentation LE MONDE AIME"] h1')?.textContent).toContain("Un amour");
    await click(button("Ouvrir la musique inclusive depuis LE MONDE AIME"));
    expect(container?.querySelector('[aria-label="Espace Musique inclusive"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    await click(button("Ouvrir le menu des studios"));
    expect(button("Ouvrir le studio LE MONDE AIME · Présentation")).toBeNull();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Retour à l’accueil POINTZERO"));
    const publicLink=container?.querySelector('a[href="/le-monde-aime"]');
    expect(publicLink).toBeTruthy();
    await act(async()=>root?.unmount());
    container?.remove();
    window.history.replaceState(null,"","/?site=le-monde-aime");
    await mount();
    await click(button("Créer une œuvre dans LE MONDE AIME"));
    expect(container?.querySelector('[aria-label="Espace LE MONDE AIME"]')).toBeTruthy();
  });
  it("garde la barre de lecture musicale active pendant les ajouts et propose le rail DMC sonore", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Musique inclusive"));
    expect(button("Mettre en pause")).toBeTruthy();
    const count=container?.querySelectorAll('[data-music-note]').length??0;
    await click(button("Ajouter un geste musical au curseur"));
    expect(container?.querySelectorAll('[data-music-note]').length).toBe(count+1);
    expect(button("Mettre en pause")).toBeTruthy();
    expect(container?.querySelector('[aria-label="Nuancier sonore DMC"]')).toBeTruthy();
    await click(button("Jouer et choisir DMC 820"));
    expect(button("Jouer et choisir DMC 820")?.getAttribute("aria-pressed")).toBe("true");
  });
  it("ouvre LE MONDE AIME depuis le menu unique et revient aux autres studios", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio LE MONDE AIME · Atelier libre"));
    expect(container?.querySelector('[aria-label="Espace LE MONDE AIME"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Toile libre tactile et souris"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Palette universelle de matières, couleurs et sons"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("ouvre Musique inclusive et permet de déposer des gestes sans manipulation complexe", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Musique inclusive"));
    expect(container?.querySelector('[aria-label="Espace Musique inclusive"]')).toBeTruthy();
    const score=container?.querySelector('svg[aria-label^="Partition musicale tactile"]');
    expect(score).toBeTruthy();
    const initial=score?.querySelectorAll('[data-music-note]').length??0;
    await click(button("Émotion Amour"));
    expect(button("Émotion Amour")?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Ajouter un geste musical au curseur"));
    expect(container?.querySelectorAll('[data-music-note]').length).toBe(initial+1);
    expect(container?.querySelector('[aria-label="Palette des émotions musicales"]')).toBeTruthy();
    expect(button("Exporter la partition MIDI")).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("ouvre la génération universelle et ses destinations sans perdre le studio graphique", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Génération"));
    expect(container?.querySelector('[aria-label="Espace Génération"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Description pour génération universelle"]')).toBeTruthy();
    await click(button("Broderie DMC"));
    expect(container?.querySelector('[aria-label="Grille DMC · largeur"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio PDF"));
    expect(container?.querySelector('[aria-label="Mode du Studio PDF"]')).toBeTruthy();
    expect(button("Grilles magnétiques")?.hasAttribute("disabled")).toBe(true);
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("ouvre Mini-site et PDF depuis les studios, puis revient à l'atelier", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Mini-site"));
    expect(container?.querySelector('[aria-label="Espace Mini-site"]')).toBeTruthy();
    expect(container?.querySelector('iframe[title="Prévisualisation du mini-site"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio PDF"));
    expect(container?.querySelector('[aria-label="Espace PDF"]')).toBeTruthy();
    expect(container?.querySelector('input[aria-label="Choisir des PDF"]')).toBeTruthy();
    await click(button("Retour au studio universel"));
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
  });

  it("range le studio entre deux docks, la grille en plein écran", async () => {
    await mount();
    expect(nav()).toBeTruthy();
    expect(bottom()).toBeTruthy();
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
    expect(container?.querySelector('.pz-embroidery-header')).toBeNull();
    expect(container?.querySelector('[aria-label="Bibliothèque et outils de broderie"]')).toBeNull();
    expect(inspector()?.hasAttribute("hidden")).toBe(true);
    expect(container?.querySelector('[aria-label="Fils du motif"]')).toBeNull();
    expect(["Dessiner","Broder","Fils","Partager"].every(name => category(name))).toBe(true);
    expect(category("Créer")).toBeUndefined();
    expect(category("Dessiner")?.getAttribute("aria-pressed")).toBe("true");
    expect(inBottom("Revenir au BurO")).toBeTruthy();
  });
  it("déploie les fils au-dessus du dock du bas et garde les filtres DMC", async () => {
    await mount();
    await click(category("Fils"));
    const rail=container?.querySelector('[aria-label="Fils du motif"]');
    expect(rail?.querySelector('[aria-label="Filtres des fils DMC"]')).toBeTruthy();
    const used=[...(rail?.querySelectorAll("button")??[])].find(x=>x.textContent?.includes("Utilisés"));
    await click(used);
    expect(used?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Ajouter ou rechercher un fil DMC"));
    expect(dialog("Nuancier DMC")?.classList.contains("is-open")).toBe(true);
    await click(button("Remonter d’un niveau"));
    expect(container?.querySelector('[aria-label="Fils du motif"]')).toBeNull();
  });
  it("ouvre et ferme le panneau Calques sans masquer la grille", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Calques"));
    expect(inspector()?.hasAttribute("hidden")).toBe(false);
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
    await click(button("Fermer le panneau"));
    expect(inspector()?.hasAttribute("hidden")).toBe(true);
  });

  it("ouvre Budget, Programme et Admin depuis le même menu de studios, puis revient aux créations", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    for (const [name,region] of [
      ["Budget","Espace Budget"],
      ["Programme","Espace Programme"],
      ["Admin / Documents","Espace Admin / Documents"]
    ]) {
      await click(button("Ouvrir le menu des studios"));
      await click(button("Ouvrir le studio "+name));
      expect(container?.querySelector('[aria-label="'+region+'"]')).toBeTruthy();
      await click(button("Retour au studio universel"));
      expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    }
    await click(button("Ouvrir l'atelier broderie"));
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
  });

  it("ouvre Photo et Stylisme depuis les supports sans changer le patron de broderie", async () => {
    localStorage.setItem("pointzero:workspace","design");
    await mount();
    expect(container?.querySelector('[aria-label="Canevas de création universel"]')).toBeTruthy();
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Photo"));
    expect(container?.querySelector('[aria-label="Prévisualisation photo"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Réglages de retouche"]')).toBeTruthy();
    await click(button("Retour aux supports graphiques"));
    await click(button("Ouvrir le menu des studios"));
    await click(button("Ouvrir le studio Stylisme"));
    expect(container?.querySelector('[aria-label="Maquette de vêtement"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Propriétés du vêtement"]')).toBeTruthy();
    await click(button("Retour aux supports graphiques"));
    await click(button("Ouvrir l'atelier broderie"));
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
  });

  it("revient à l’accueil spécialisé et reprend le suivi sans remplacer le motif", async () => {
    const existing = createPattern("Ouvrage à préserver", 20, 20);
    const red = flossIndex("321");
    existing.cross[4] = red;
    existing.done[4] = 1;
    ensurePalette(existing, red);
    expect(saveStored(existing)).toBe(true);
    await mount();
    const before = container?.querySelector('canvas[role="application"]')?.getAttribute("aria-label");
    await brandMenu("Accueil Point Zéro");
    expect(container?.querySelector("h1")?.textContent).toBe("Point Zéro");
    expect(window.location.pathname).toBe("/");
    const resume = [...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent?.includes("Continuer à broder"));
    await click(resume);
    expect(container?.querySelector('canvas[role="application"]')?.getAttribute("aria-label")).toBe(before);
    expect(localStorage.getItem("pointzero:workspace")).toBe("embroidery");
    expect(category("Broder")?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    const restored = loadStored()!;
    expect(restored.name).toBe(existing.name);
    expect(restored.cross[4]).toBe(red);
    expect(restored.done[4]).toBe(1);
    expect(restored.w).toBe(20);
  });

  it("change les trois affichages sans altérer points, palette ni suivi", async () => {
    const p = createPattern("Patron protégé", 20, 20);
    const red = flossIndex("321"); p.cross[5] = red; p.done[5] = 1; ensurePalette(p, red);
    expect(saveStored(p)).toBe(true);
    await mount();
    await click(container?.querySelector("#pzs-brand"));
    const levelBar = container!.querySelector<HTMLElement>('[aria-label="Affichage du studio"]')!;
    expect(levelBar.getAttribute("role")).toBe("group");
    const labels: Record<string,string> = { beginner: "Débutant", expert: "Expert", intermediate: "Intermédiaire" };
    for (const level of ["beginner", "expert", "intermediate"]) {
      const levelButton = [...levelBar.querySelectorAll("button")].find(b => b.textContent === labels[level])!;
      await click(levelButton);
      expect(levelButton.getAttribute("aria-pressed")).toBe("true");
      expect(localStorage.getItem("pointzero:interface-level")).toBe(level);
      expect(container!.textContent).toContain("Patron protégé");
      await act(async () => window.dispatchEvent(new Event("pagehide")));
      const after = loadStored()!;
      expect(after.cross).toEqual(p.cross); expect(after.done).toEqual(p.done); expect(after.palette).toEqual(p.palette);
    }
  });

  it("conserve l’outil actif et rend les autres accessibles en Débutant", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Plus d’outils"));
    await click(category("Quart"));
    expect(category("Quart")?.getAttribute("aria-pressed")).toBe("true");
    await click(container?.querySelector("#pzs-brand"));
    await click([...container!.querySelectorAll('[aria-label="Affichage du studio"] button')].find(b => b.textContent === "Débutant"));
    await click(container?.querySelector("#pzs-brand"));
    expect(category("Quart")?.getAttribute("aria-pressed")).toBe("true");
    await click(button("Remonter d’un niveau"));
    expect(category("Remplir")).toBeUndefined();
    expect(category("Croix")).toBeTruthy();
    expect(category("Plus d’outils")).toBeTruthy();
  });

  it("centralise la navigation et protège le redimensionnement", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Calques"));
    const sections=container!.querySelector(".pz-embroidery-right nav");
    expect([...sections!.querySelectorAll("button")].map(b=>b.textContent)).toEqual(["Calques","Motifs","Réglages"]);
    await click(category("Réglages du dessin"));
    expect(container!.textContent).toContain("Redimensionner la grille");
    const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
    await click([...container!.querySelectorAll("button")].find(b=>b.textContent==="Redimensionner"));
    expect(confirm).toHaveBeenCalled();
  });

  it("relie le dock du bas au zoom et au recentrage, et le dock du haut à l’import et à l’export", async () => {
    await mount();
    const send=vi.spyOn(window,"dispatchEvent");
    await click(inBottom("Loupe : doubler le zoom de la zone visible"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({detail:{action:"magnify"}}));
    await click(inBottom("Zoomer"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({detail:{action:"zoomIn"}}));
    await click(inBottom("Dézoomer"));
    expect(send).toHaveBeenCalledWith(expect.objectContaining({detail:{action:"zoomOut"}}));
    await click(inBottom("Tout voir"));
    await click(category("Partager"));
    await click(category("Exporter"));
    expect(container!.textContent).toContain("PDF");
  });

  it("ouvre directement la préparation depuis l’accueil spécialisé", async () => {
    await mount(true);
    const prepare = [...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent?.includes("Préparer mon ouvrage"));
    await click(prepare);
    expect(inspector()?.hasAttribute("hidden")).toBe(false);
    expect(inspector()?.textContent).toContain("Fils & toile");
    expect(window.location.pathname+window.location.search).toBe("/atelier");
  });

  it("ouvre directement la grille et la bibliothèque de motifs, sans écran d'accueil", async () => {
    const view = await mount();
    expect(view.querySelector('canvas[role="application"]')).toBeTruthy();
    await click(category("Dessiner"));
    await click(category("Motifs"));
    expect(view.querySelector('[aria-label="Bibliothèque de motifs"]')).toBeTruthy();
    expect(view.querySelector('button[aria-label="Ajouter Fleur rose"]')).toBeTruthy();
    expect(view.querySelector('[aria-label="Créer un nouveau motif"]')).toBeNull();
  });
  it("ne montre ni guide, ni démarrage automatique, même si l'ancien état subsiste", async () => {
    localStorage.setItem("point-zero:coach", JSON.stringify({ seen: false, dismissed: false }));
    await mount();
    expect(container?.querySelector(".coach-in")).toBeNull();
    expect(button("Guide de l'atelier")).toBeNull();
    expect(container?.querySelector('[data-coach="on"]')).toBeNull();
  });
  it("Dessiner conserve la grille centrale sans ouvrir le grand panneau de réglages", async () => {
    await mount();
    await click(category("Dessiner"));
    expect(dialog("Composer")?.classList.contains("is-open")).toBeFalsy();
    expect(inspector()?.hasAttribute("hidden")).toBe(true);
    expect(container?.querySelector('canvas[role="application"]')).toBeTruthy();
  });
  it("ajoute un motif DMC par clic et ouvre ses propriétés minimales", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Motifs"));
    await click(container?.querySelector('button[aria-label="Ajouter Fleur rose"]'));
    expect(container?.querySelector('[aria-label="Propriétés du motif"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Taille du motif"]')).toBeTruthy();
    expect(container?.querySelector('[aria-label="Calques de composition"]')).toBeTruthy();
    expect(button("Annuler")?.hasAttribute("disabled")).toBe(false);
  });
  it("réunit fils, toile et profil dans le même panneau", async () => {
    await mount();
    await click(category("Fils"));
    await click(category("Fils et toile"));
    expect(inspector()?.querySelector(".pz-embroidery-inline")).toBeTruthy();
    expect(inspector()?.textContent).toContain("Mon profil brodeuse");
    expect(inspector()?.textContent).toContain("Modifier la toile");
    expect(dialog("Fils & toile")?.classList.contains("is-open")).toBeFalsy();
  });
  it("donne accès au suivi Broder sans changer de page", async () => {
    await mount();
    await click(category("Broder"));
    expect(category("Marquer")).toBeTruthy();
    expect(nav()?.querySelector('button[aria-label^="Fil actif"]')).toBeTruthy();
    await click(category("Suivi"));
    expect(inspector()?.querySelector(".pz-embroidery-inline")).toBeTruthy();
    expect(inspector()?.textContent).toContain("Journal du projet");
    expect(dialog("Broder")?.classList.contains("is-open")).toBeFalsy();
    expect(window.location.hash).toBe("");
  });
  it("garde le BurO et les Réglages dans le menu Point Zéro, et Exporter dans Partager", async () => {
    await mount();
    await click(container?.querySelector("#pzs-brand"));
    const items=[...(container?.querySelectorAll("#pzs-menu button")??[])].map(b=>b.textContent);
    expect(items).toContain("BurO");
    expect(items).toContain("Réglages et aide");
    await click([...(container?.querySelectorAll("#pzs-menu button")??[])].find(b=>b.textContent==="Réglages et aide"));
    expect(inspector()?.textContent).toContain("Confort et accessibilité");
    expect(dialog("Réglages & aide")?.classList.contains("is-open")).toBeFalsy();
    await click(category("Partager"));
    expect(category("Exporter")).toBeTruthy();
  });
  it("ouvre le BurO : créer, importer et retrouver ses projets, avec des lieux en bas", async () => {
    await mount();
    await brandMenu("BurO");
    expect(window.location.pathname).toBe("/buro");
    expect(container?.querySelector("h1")?.textContent).toBe("BurO");
    const top = () => container?.querySelector('nav[aria-label="Dock des actions du BurO"]');
    const inTop = (name: string) => [...(top()?.querySelectorAll("button") ?? [])].find(b => b.textContent?.replace(/\d+$/, "") === name);
    expect(["Créer","Rejoindre","Échanger","Modèles"].every(name => inTop(name))).toBe(true);
    const places = [...(container?.querySelectorAll('nav[aria-label="Lieux du BurO"] button') ?? [])].map(b => b.textContent?.replace(/\s*\d+$/, ""));
    expect(places).toEqual(["Projets","Partagés avec moi","Archives"]);
    await click(inTop("Créer"));
    expect(["Grille vierge","Importer","Générer"].every(name => inTop(name))).toBe(true);
    const picker = container!.querySelector<HTMLInputElement>('input[aria-label="Importer une image, un PDF ou un projet dans le BurO"]')!;
    expect(picker.accept).toContain(".pdf"); expect(picker.accept).toContain(".oxs"); expect(picker.accept).toContain(".json"); expect(picker.accept).toContain("image/png");
    const choose = vi.spyOn(picker, "click"); await click(inTop("Importer")); expect(choose).toHaveBeenCalled();
    await click(button("Remonter d’un niveau"));
    await click([...(container?.querySelectorAll('nav[aria-label="Lieux du BurO"] button') ?? [])].find(b => b.textContent?.startsWith("Partagés")));
    expect(container?.textContent).toContain("Regarder un ouvrage en direct");
    await click([...(container?.querySelectorAll("button") ?? [])].find(b => b.textContent === "Continuer →") ?? [...(container?.querySelectorAll("#buro-brand") ?? [])][0]);
  });
  it("choisit la visibilité du projet dans Partager, avec son orbe et son mot", async () => {
    await mount();
    await click(category("Partager"));
    expect(category("Visibilité · Privé")).toBeTruthy();
    await click(category("Visibilité · Privé"));
    await click(category("Restreint"));
    expect(category("Restreint")?.getAttribute("aria-pressed")).toBe("true");
    expect(JSON.stringify(JSON.parse(localStorage.getItem("pointzero:visibilite") ?? "{}"))).toContain("restreint");
    expect(bottom()?.textContent).toContain("Restreint");
  });
  it("réutilise un seul panneau pour Fils, Suivi et Réglages, sans feuilles superposées", async () => {
    await mount();
    await click(category("Fils"));
    await click(category("Fils et toile"));
    expect(inspector()?.textContent).toContain("Mon profil brodeuse");
    await click(button("Remonter d’un niveau"));
    await click(category("Broder"));
    await click(category("Suivi"));
    expect(inspector()?.textContent).toContain("Journal du projet");
    await brandMenu("Réglages et aide");
    expect(inspector()?.textContent).toContain("Confort et accessibilité");
    expect(container?.querySelectorAll(".pz-embroidery-inline")).toHaveLength(1);
  });
  it("garde les réglages techniques du dessin dans le panneau noir, à la demande", async () => {
    await mount();
    expect(inspector()?.querySelector('[aria-label="Outils de broderie"]')).toBeNull();
    await click(category("Dessiner"));
    await click(category("Réglages du dessin"));
    expect(inspector()?.querySelector(".pz-embroidery-inline")).toBeTruthy();
    expect(inspector()?.textContent).toContain("Texte (lettres en croix)");
    expect(inspector()?.textContent).toContain("Symétrie du dessin");
    expect(dialog("Composer")?.classList.contains("is-open")).toBeFalsy();
  });
  it("remonte d’un niveau avec Échap dans le dock", async () => {
    await mount();
    await click(category("Dessiner"));
    await click(category("Plus d’outils"));
    await act(async () => { nav()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(category("Plus d’outils")).toBeTruthy();
    await act(async () => { nav()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    expect(category("Partager")).toBeTruthy();
  });
  it("ne propose plus de page ni de catégorie SLÂME", async () => {
    await mount();
    expect(category("Musique & parole")).toBeUndefined();
    expect(container?.textContent).not.toContain("Retour à la grille");
    expect(window.location.hash).toBe("");
  });
  it("redirige les anciens fragments vers la page atelier unique", async () => {
    window.history.replaceState(null, "", "/#slame");
    await mount();
    expect(window.location.hash).toBe("");
    expect(nav()).toBeTruthy();
  });
});

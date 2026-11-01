/**
 * Le second domaine de la fiche contextuelle : « élément SYST'AIME », branché sur la VRAIE version publique du manifeste
 * (src/systaime/publique.json), avec la couronne du Disque (construireModes) et une action locale relue à sa source.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { declarerDomaine, oublierDomaine, resoudre } from "../lib/fiche/registre";
import { verifierFiche } from "../lib/fiche/fiche";
import { executerAction } from "../lib/fiche/actions";
import { domaineSyst, epinglesDeLAppareil, MAX_EPINGLES, type ManifestePublic, type SourcesSyst } from "../lib/fiche/syst";
import { domaineDmc } from "../lib/fiche/dmc";
import { loadBrodeuseProfile, saveBrodeuseProfile } from "../lib/brodeuseProfile";
import { construireModes, type GroupeFiches } from "../components/fiche/DisqueFiches";
import FicheContextuelle from "../components/fiche/FicheContextuelle";

const MANIFESTE = JSON.parse(readFileSync(resolve(__dirname, "../../../src/systaime/publique.json"), "utf8")) as ManifestePublic & { themes: string[] };
beforeAll(() => { (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
let root: Root | null = null, host: HTMLElement | null = null;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { if (root) act(() => root!.unmount()); host?.remove(); root = host = null; oublierDomaine("syst"); oublierDomaine("dmc"); });
afterAll(() => localStorage.clear());
const sources = (): SourcesSyst => ({ manifeste: () => MANIFESTE, ...epinglesDeLAppareil() });
const syst = (s = sources()) => { declarerDomaine(domaineSyst(s)); };

describe("domaine SYST'AIME : données du manifeste public", () => {
  it("la fiche d'une case vient du manifeste et se vérifie elle-même", () => {
    syst();
    const r = resoudre("syst-visuel.tokens", "visiteur");
    expect(r.ok).toBe(true); if (!r.ok) return;
    expect(verifierFiche(r.fiche)).toEqual([]);
    expect(r.fiche.titre).toBe(MANIFESTE.cases.find(c => c.id === "visuel.tokens")!.nom);
    expect(r.fiche.version?.libelle).toContain(MANIFESTE.version);
    const f = (k: string) => r.fiche.faits.find(x => x.cle === k)!;
    expect(f("theme").valeur).toBe("Visuel"); expect(f("couche").valeur).toBe("Tokens");
    expect(f("validation")).toMatchObject({ statut: "calcule", valeur: "Pas encore" });   // aucune case n'est validée par une personne
  });
  it("dit ce qui manque, avec la raison : la source canonique n'est jamais inventée", () => {
    syst();
    const r = resoudre("syst-visuel.tokens", "visiteur"); if (!r.ok) throw new Error("fiche absente");
    const c = r.fiche.faits.find(x => x.cle === "canonique")!;
    expect(c).toMatchObject({ statut: "manquant", valeur: null }); expect(c.manque).toMatch(/administration/);
  });
  it("le public ne reçoit ni chemin, ni empreinte, ni commit", () => {
    syst();
    for (const c of MANIFESTE.cases) {
      const r = resoudre("syst-" + c.id, "visiteur"); expect(r.ok).toBe(true); if (!r.ok) continue;
      const texte = JSON.stringify({ ...r.fiche, actions: r.fiche.actions.map(a => a.id) });
      expect(texte).not.toMatch(/[0-9a-f]{40}/); expect(texte).not.toMatch(/\.(tsx?|mjs|json)\b/);
    }
  });
  it("une case inconnue est dite absente", () => {
    syst(); expect(resoudre("syst-nexistepas.zz", "visiteur")).toMatchObject({ ok: false, raison: expect.stringMatching(/n'existe pas/) });
  });
  it("un croisement relie les cinq autres couches de son thème et la même couche des autres thèmes", () => {
    syst();
    const r = resoudre("syst-visuel.tokens", "visiteur"); if (!r.ok) throw new Error();
    expect(r.fiche.relations.filter(x => x.nature === "même thème")).toHaveLength(5);
    expect(r.fiche.relations.filter(x => x.nature === "même couche")).toHaveLength(5);
  });
});

describe("domaine SYST'AIME : droits et action locale", () => {
  it("épingler est réservé au propriétaire ; la fiche du visiteur n'a pas l'action", () => {
    syst();
    const v = resoudre("syst-visuel.tokens", "visiteur"), p = resoudre("syst-visuel.tokens", "proprietaire");
    if (!v.ok || !p.ok) throw new Error();
    expect(v.fiche.actions).toHaveLength(0); expect(p.fiche.actions.map(a => a.id)).toEqual(["epingler"]);
    expect(v.fiche.faits.find(x => x.cle === "epingle")).toBeUndefined();   // donnée privée : absente pour le visiteur
    expect(p.fiche.faits.find(x => x.cle === "epingle")?.valeur).toBe("Non");
  });
  it("épingler écrit puis RELIT sur l'appareil, et la fiche suivante propose de retirer", () => {
    syst();
    const p = resoudre("syst-visuel.tokens", "proprietaire"); if (!p.ok) throw new Error();
    const r = executerAction(p.fiche.actions[0], "proprietaire");
    expect(r.ok).toBe(true); expect(r.verification).toMatch(/Relu depuis l'appareil : 1 élément/);
    expect(JSON.parse(localStorage.getItem("aime:system:epingles-v1")!)).toEqual(["visuel.tokens"]);
    const q = resoudre("syst-visuel.tokens", "proprietaire"); if (!q.ok) throw new Error();
    expect(q.fiche.actions.map(a => a.id)).toEqual(["desepingler"]);
    expect(executerAction(q.fiche.actions[0], "proprietaire").ok).toBe(true);
    expect(JSON.parse(localStorage.getItem("aime:system:epingles-v1")!)).toEqual([]);
  });
  it("un visiteur ne peut pas exécuter l'action, même en la tenant en main", () => {
    syst();
    const p = resoudre("syst-visuel.tokens", "proprietaire"); if (!p.ok) throw new Error();
    expect(executerAction(p.fiche.actions[0], "visiteur").ok).toBe(false);
    expect(localStorage.getItem("aime:system:epingles-v1")).toBeNull();
  });
  it("un appareil qui refuse d'écrire est dit, rien n'est annoncé", () => {
    syst({ manifeste: () => MANIFESTE, epingles: () => [], enregistrerEpingles: () => { throw new Error("Épingle non enregistrée : ce navigateur refuse d'écrire sur l'appareil."); } });
    const p = resoudre("syst-visuel.tokens", "proprietaire"); if (!p.ok) throw new Error();
    const r = executerAction(p.fiche.actions[0], "proprietaire");
    expect(r.ok).toBe(false); expect(r.message).toMatch(/refuse d'écrire/);
  });
  it("une lecture illisible vaut « aucune épingle »", () => {
    localStorage.setItem("aime:system:epingles-v1", "{pas du json"); expect(epinglesDeLAppareil().epingles()).toEqual([]);
    localStorage.setItem("aime:system:epingles-v1", JSON.stringify(["ok.1", 5, "<x>", ...Array(100).fill("a.b")])); expect(epinglesDeLAppareil().epingles().length).toBeLessThanOrEqual(MAX_EPINGLES);
  });
});

describe("même architecture, deux métiers", () => {
  const groupes = (): GroupeFiches[] => [
    { id: "dmc", nom: "Fils DMC", aide: "fils", elements: [{ adresse: "dmc-310", nom: "DMC 310" }, { adresse: "dmc-321", nom: "DMC 321" }] },
    { id: "syst", nom: "SYST'AIME", aide: "thèmes", elements: [
      { adresse: "syst-visuel.principes", nom: "Visuel", contient: a => a.startsWith("syst-visuel.") }, { adresse: "syst-interaction.principes", nom: "Interaction", contient: a => a.startsWith("syst-interaction.") }] },
  ];
  it("la couronne a une famille par domaine, un enfant actif, et le thème reste actif sur ses six couches", () => {
    const choisis: string[] = [];
    const m = construireModes({ groupes: groupes(), courante: "syst-visuel.tokens", choisir: a => choisis.push(a), actions: [], toutVoir: () => {} });
    expect(m.filter(x => x.id.startsWith("df-") && x.enfants).map(x => x.nom)).toEqual(["Fils DMC", "SYST'AIME"]);
    const fam = m.find(x => x.id === "df-syst")!; expect(fam.actif).toBe(true); expect(m.find(x => x.id === "df-dmc")!.actif).toBe(false);
    const enfants = fam.enfants!(); expect(enfants.find(e => e.nom === "Visuel")!.actif).toBe(true); expect(enfants.find(e => e.nom === "Interaction")!.actif).toBe(false);
    m.find(x => x.id === "df-suivant")!.ouvrir(); expect(choisis).toEqual(["syst-interaction.principes"]);
    m.find(x => x.id === "df-precedent")!.ouvrir(); expect(choisis[1]).toBe("syst-interaction.principes");   // cycle à deux éléments
    expect(m.some(x => x.id === "df-tout")).toBe(true);
  });
  it("sans « Tout voir » fourni, la commande n'existe pas", () => {
    expect(construireModes({ groupes: groupes(), courante: "dmc-310", choisir: () => {}, actions: [] }).some(x => x.id === "df-tout")).toBe(false);
  });
  it("une fiche DMC et une fiche SYST'AIME sortent de la même présentation, avec leurs données propres", () => {
    declarerDomaine(domaineDmc({ profil: loadBrodeuseProfile, enregistrerProfil: saveBrodeuseProfile, toile: () => null })); syst();
    const monter = (a: string, pres: "disque" | "etendu") => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); act(() => root!.render(<FicheContextuelle adresse={a} role="proprietaire" presentation={pres} />)); return host; };
    const d = monter("dmc-310", "etendu"); const td = d.textContent ?? ""; act(() => root!.unmount()); host!.remove();
    const s = monter("syst-visuel.tokens", "etendu"); const ts = s.textContent ?? "";
    expect(td).toMatch(/310/); expect(ts).toMatch(/Manifeste/); expect(ts).not.toMatch(/Miyuki/);
    expect(s.querySelectorAll("h2").length).toBeGreaterThan(0);
  });
  it("la présentation « disque » marque une copie dupliquée en aria-hidden et deux fiches ont des ids distincts", () => {
    syst();
    host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    act(() => root!.render(<><FicheContextuelle adresse="syst-visuel.tokens" role="visiteur" presentation="disque" duplique /><FicheContextuelle adresse="syst-visuel.tokens" role="visiteur" presentation="etendu" /></>));
    expect(host.querySelector("[aria-hidden='true'].fc, article[aria-hidden='true']")).not.toBeNull();
    const ids = [...host.querySelectorAll("[id]")].map(e => e.id); expect(new Set(ids).size).toBe(ids.length);
  });
});

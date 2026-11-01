/**
 * La fiche contextuelle universelle : contrat commun, domaine DMC branché sur les vraies sources de l'atelier,
 * et preuve d'universalité (un second domaine sans une ligne d'interface en plus).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { etatDe, pourRole, verifierFiche, type Fiche } from "../lib/fiche/fiche";
import { adresse, declarerDomaine, lireAdresse, oublierDomaine, resoudre } from "../lib/fiche/registre";
import { commandesDeFiche, executerAction } from "../lib/fiche/actions";
import { domaineDmc, type SourcesDmc } from "../lib/fiche/dmc";
import { loadBrodeuseProfile, saveBrodeuseProfile } from "../lib/brodeuseProfile";
import FicheContextuelle from "../components/fiche/FicheContextuelle";

beforeAll(() => { (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
let root: Root | null = null, host: HTMLElement | null = null;
beforeEach(() => { localStorage.clear(); });
afterEach(() => { if (root) act(() => root!.unmount()); host?.remove(); root = host = null; oublierDomaine("dmc"); oublierDomaine("test"); });
afterAll(() => localStorage.clear());

const reelles = (): SourcesDmc => ({ profil: loadBrodeuseProfile, enregistrerProfil: saveBrodeuseProfile, toile: () => null });
const dmc = (src: SourcesDmc = reelles()) => { declarerDomaine(domaineDmc(src)); };
const monter = (el: React.ReactElement) => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); act(() => root!.render(el)); return host; };

describe("adresses et registre", () => {
  it("une adresse s'écrit et se relit, le reste est refusé", () => {
    expect(adresse("dmc", "310")).toBe("dmc-310");
    expect(lireAdresse("dmc-310")).toEqual({ domaine: "dmc", id: "310" });
    for (const m of ["", "310", "DMC-310", "dmc-", "dmc-a b", "dmc-<x>", undefined, null]) expect(lireAdresse(m as string)).toBeNull();
  });
  it("refuse un domaine invalide ou déjà déclaré, et dit pourquoi", () => {
    expect(declarerDomaine({ id: "X!", nom: "x", resoudre: () => null })).toMatch(/invalide/);
    expect(declarerDomaine({ id: "test", nom: "t", resoudre: () => null })).toBeNull();
    expect(declarerDomaine({ id: "test", nom: "t", resoudre: () => null })).toMatch(/déjà/);
  });
  it("dit honnêtement domaine inconnu et élément absent", () => {
    dmc();
    expect(resoudre("zzz-1", "visiteur")).toMatchObject({ ok: false, raison: expect.stringMatching(/Aucun domaine/) });
    expect(resoudre("dmc-99999", "visiteur")).toMatchObject({ ok: false, raison: expect.stringMatching(/n'existe pas/) });
    expect(resoudre("pas une adresse", "visiteur")).toMatchObject({ ok: false });
  });
});

describe("domaine DMC : informations réelles", () => {
  it("la fiche du 310 vient de la table et se vérifie elle-même", () => {
    dmc();
    const r = resoudre("dmc-310", "proprietaire");
    if (!r.ok) throw new Error(r.raison);
    expect(r.fiche.titre).toMatch(/310/);
    expect(verifierFiche(r.fiche)).toEqual([]);
    expect(r.fiche.version.libelle).toMatch(/489/);
    expect(r.fiche.limites.length).toBeGreaterThan(0);
    expect(r.fiche.relations.length).toBeGreaterThan(0);
    expect(r.fiche.relations.every(x => x.domaine === "dmc" && x.navigable && x.raison)).toBe(true);
  });
  it("le stock non renseigné est dit « manquant » avec sa raison, jamais zéro", () => {
    dmc();
    const r = resoudre("dmc-310", "proprietaire");
    if (!r.ok) throw new Error(r.raison);
    const stock = r.fiche.faits.find(x => x.cle === "stock")!;
    expect(stock.statut).toBe("manquant");
    expect(stock.valeur).toBeNull();
    expect(stock.manque).toMatch(/pas la même chose/);
    expect(etatDe(r.fiche)).toBe("partielle");
  });
  it("un visiteur ne voit ni stock, ni usage, ni action", () => {
    dmc();
    const r = resoudre("dmc-310", "visiteur");
    if (!r.ok) throw new Error(r.raison);
    expect(r.fiche.faits.map(x => x.cle)).not.toContain("stock");
    expect(r.fiche.faits.map(x => x.cle)).not.toContain("usage");
    expect(r.fiche.actions).toEqual([]);
    expect(verifierFiche(r.fiche)).toEqual([]);
  });
});

describe("action autorisée, résultat vérifiable", () => {
  it("+1 écheveau écrit le profil de l'atelier et le relit", () => {
    dmc();
    const r = resoudre("dmc-310", "proprietaire");
    if (!r.ok) throw new Error(r.raison);
    const plus = r.fiche.actions.find(a => a.id.includes("plus") || /\+1/.test(a.nom))!;
    expect(plus.effet?.reversible).toBe(true);
    expect(plus.effet?.quoi).toMatch(/310/);
    const res = executerAction(plus, "proprietaire");
    expect(res.ok).toBe(true);
    expect(res.verification).toMatch(/1 écheveau/);
    expect(loadBrodeuseProfile().stock["310"]?.skeins).toBe(1);        // relu à la source, pas seulement annoncé
    const apres = resoudre("dmc-310", "proprietaire");
    if (!apres.ok) throw new Error(apres.raison);
    expect(apres.fiche.faits.find(x => x.cle === "stock")!.statut).toBe("declare");
  });
  it("−1 n'existe qu'avec du stock, et le rôle est revérifié au moment d'agir", () => {
    dmc();
    const r = resoudre("dmc-310", "proprietaire");
    if (!r.ok) throw new Error(r.raison);
    expect(r.fiche.actions.some(a => /−1|-1/.test(a.nom))).toBe(false);
    const plus = r.fiche.actions[0];
    expect(executerAction(plus, "visiteur")).toMatchObject({ ok: false, message: expect.stringMatching(/pas permis/) });
    expect(loadBrodeuseProfile().stock["310"]).toBeUndefined();
  });
  it("une écriture qui échoue est dite, pas masquée", () => {
    const src: SourcesDmc = { ...reelles(), enregistrerProfil: () => { throw new Error("Profil non sauvegardé : disque plein."); } };
    dmc(src);
    const r = resoudre("dmc-310", "proprietaire");
    if (!r.ok) throw new Error(r.raison);
    const res = executerAction(r.fiche.actions[0], "proprietaire");
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/non sauvegardé/);
  });
  it("la couronne du Disque reprend les mêmes actions (un seul système)", () => {
    dmc();
    const r = resoudre("dmc-310", "proprietaire");
    if (!r.ok) throw new Error(r.raison);
    const cmds = commandesDeFiche(r.fiche, "proprietaire", () => {});
    expect(cmds.map(c => c.nom)).toEqual(r.fiche.actions.map(a => a.nom));
    expect(cmds.every(c => c.id.startsWith("fc-dmc-") && /écheveau|stock/.test(c.aide))).toBe(true);
  });
});

describe("universalité : un second domaine sans interface en plus", () => {
  const fiche = (id: string): Fiche | null => id === "x" ? {
    domaine: "test", id, surtitre: "Projet", titre: "Nappe", faits: [
      { cle: "etat", libelle: "Avancement", valeur: "40 %", statut: "declare", source: "s" },
      { cle: "budget", libelle: "Budget", valeur: "à définir", statut: "declare", source: "s", visibilite: "prive" },
      { cle: "date", libelle: "Échéance", valeur: null, statut: "manquant", source: "s", manque: "aucune date saisie" }],
    relations: [], sources: [{ id: "s", libelle: "Projet", lieu: "appareil" }], limites: ["Domaine de démonstration."],
    actions: [], version: { libelle: "v1", source: "s" } } : null;
  it("la même fiche, les mêmes règles, un autre métier", () => {
    declarerDomaine({ id: "test", nom: "Projet de test", resoudre: fiche });
    const r = resoudre("test-x", "visiteur");
    if (!r.ok) throw new Error(r.raison);
    expect(verifierFiche(pourRole(fiche("x")!, "visiteur"))).toEqual([]);
    expect(r.fiche.faits.map(x => x.cle)).toEqual(["etat", "date"]);
    const h = monter(<FicheContextuelle adresse="test-x" role="visiteur" presentation="etendu" />);
    expect(h.textContent).toMatch(/Nappe/);
    expect(h.textContent).toMatch(/aucune date saisie/);
    expect(h.textContent).not.toMatch(/Budget/);
  });
  it("verifierFiche refuse une source inconnue et un manque sans raison", () => {
    const f = fiche("x")!;
    f.faits[2] = { ...f.faits[2], manque: undefined };
    f.faits[0] = { ...f.faits[0], source: "inconnue" };
    expect(verifierFiche(f).join(" ")).toMatch(/source inconnue/);
    expect(verifierFiche(f).join(" ")).toMatch(/incohérents/);
  });
});

describe("composant", () => {
  it("disque : l'essentiel, état partiel dit, « Tout voir » proposé", () => {
    dmc();
    let tout = 0;
    const h = monter(<FicheContextuelle adresse="dmc-310" role="proprietaire" presentation="disque" onAgrandir={() => { tout++; }} />);
    expect(h.querySelector("h2")?.textContent).toMatch(/310/);
    expect(h.textContent).toMatch(/Fiche partielle/);
    const b = [...h.querySelectorAll("button")].find(x => x.textContent === "Tout voir")!;
    act(() => b.click());
    expect(tout).toBe(1);
  });
  it("étendu : provenance de chaque information, sources, limites, effet de l'action, résultat annoncé", () => {
    dmc();
    const h = monter(<FicheContextuelle adresse="dmc-310" role="proprietaire" presentation="etendu" />);
    expect(h.textContent).toMatch(/Ce que l'on sait/);
    expect(h.textContent).toMatch(/D'où vient cette fiche/);
    expect(h.textContent).toMatch(/Modifie/);
    const plus = [...h.querySelectorAll("button")].find(x => /\+1/.test(x.textContent ?? ""))!;
    act(() => plus.click());
    const statut = h.querySelector("[role=status]");
    expect(statut?.textContent).toMatch(/Relu/);
    expect(loadBrodeuseProfile().stock["310"]?.skeins).toBe(1);
  });
  it("une adresse inconnue est dite, pas inventée", () => {
    dmc();
    const h = monter(<FicheContextuelle adresse="dmc-0000" role="proprietaire" presentation="disque" />);
    expect(h.textContent).toMatch(/Rien à montrer/);
  });
  it("une relation navigable appelle onNaviguer avec l'adresse du fil voisin", () => {
    dmc();
    const vus: string[] = [];
    const h = monter(<FicheContextuelle adresse="dmc-310" role="visiteur" presentation="etendu" onNaviguer={a => vus.push(a)} />);
    const rel = [...h.querySelectorAll("button")].find(x => /ΔE|DMC/.test(x.textContent ?? "") && !/\+1/.test(x.textContent ?? ""))!;
    act(() => rel.click());
    expect(vus[0]).toMatch(/^dmc-/);
  });
});

/**
 * L'entrée directe dans l'atelier (« ?ouvrir= », depuis la carte Broderie) : la lecture, le retrait de l'adresse, le chemin dans la couronne,
 * l'ouverture du Point sur la bonne commande, et le Tambour comme mode normal (un refus explicite le coupe).
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { cheminVers, disquePour, lireOuvrir, OUVRIR, sansOuvrir } from "../lib/ouvrir";
import { CADRE_TAMBOUR_CLE, ecrireCadreTambour, lireCadreTambour, premierAnneau, PRIORITE } from "../components/TambourAtelier";
import { entryStudio } from "../lib/entryNavigation";
import LePoint from "../components/point/LePoint";
import type { ModePoint } from "../lib/point/modes";

const mode = (id: string, enfants?: ModePoint[]): ModePoint => ({ id, nom: id[0].toUpperCase() + id.slice(1), aide: id, groupe: "metier", ouvrir: () => {}, ...(enfants ? { enfants: () => enfants } : {}) });
const TOUS = ["points", "broder", "fils", "affichage", "loupe", "importer", "exporter", "guide"].map(id => mode(id, id === "fils" ? [mode("famille-rouges")] : id === "importer" ? [mode("imp-image")] : undefined));

describe("?ouvrir= : lire, retirer, choisir la commande", () => {
  it("quatre valeurs, et rien d'autre : une valeur inconnue ou absente n'ouvre rien", () => {
    expect([...OUVRIR]).toEqual(["ouvrages", "reprendre", "composer", "importer", "fils"]);
    for (const v of OUVRIR) expect(lireOuvrir("?ouvrir=" + v)).toBe(v);
    expect(lireOuvrir("")).toBeNull(); expect(lireOuvrir("?ouvrir=supprimer")).toBeNull(); expect(lireOuvrir("?ouvrir=")).toBeNull(); expect(lireOuvrir("?ouvrir=FILS")).toBeNull();
  });
  it("le retrait garde le chemin, les autres paramètres et le fragment ; une adresse sans ouvrir ne change pas", () => {
    expect(sansOuvrir("/studio/atelier?ouvrir=fils")).toBe("/studio/atelier");
    expect(sansOuvrir("/studio/atelier?rosace=5D-13222.g59.v0.1&ouvrir=composer#x")).toBe("/studio/atelier?rosace=5D-13222.g59.v0.1#x");
    expect(sansOuvrir("/studio/atelier?rosace=5D-1")).toBeNull();
  });
  it("les anciens liens profonds ouvrent toujours le même écran, avec ou sans ouvrir", () => {
    expect(entryStudio("?ouvrir=fils", "", "/atelier")).toBe("embroidery");
    expect(entryStudio("?rosace=5D-13222.g59.v0.1", "", "/atelier")).toBe("embroidery");
    expect(entryStudio("?studio=embroidery", "", "/")).toBe("embroidery");
    expect(entryStudio("", "#atelier", "/")).toBe("embroidery");
    expect(entryStudio("", "", "/")).toBe("stitch-home");
  });
  it("seules les entrées qui touchent la couronne ouvrent le Disque ; « Mes ouvrages » ouvre la bibliothèque, sans Disque", () => {
    expect(disquePour(null)).toBeUndefined(); expect(disquePour("ouvrages")).toBeUndefined(); expect(disquePour("reprendre")).toEqual({});
    expect(disquePour("composer")).toEqual({}); expect(disquePour("fils")).toEqual({ noeud: "fils" }); expect(disquePour("importer")).toEqual({ noeud: "importer" });
  });
  it("le chemin vers une commande : au premier anneau, ou dans « Plus » quand la place manque ; inconnue : le premier cercle", () => {
    expect(cheminVers(TOUS, "fils")).toEqual(["fils"]);
    const serre = premierAnneau(TOUS, 6);
    expect(serre.some(m => m.id === "importer")).toBe(false);   /* rangée dans « Plus » : ce n'est pas une priorité */
    expect(cheminVers(serre, "importer")).toEqual(["plus", "importer"]);
    expect(PRIORITE).toContain("fils"); expect(cheminVers(serre, "fils")).toEqual(["fils"]);
    expect(cheminVers(TOUS, "inconnue")).toEqual([]);
  });
});

describe("le Point s'ouvre sur la bonne commande (le vrai LePoint, sans second composant)", () => {
  let hote: HTMLDivElement | null = null, root: Root | null = null;
  afterEach(() => { act(() => root?.unmount()); hote?.remove(); root = null; });
  const rendre = (chemin?: string[]) => { hote = document.createElement("div"); document.body.appendChild(hote); root = createRoot(hote); act(() => root!.render(<LePoint scene cheminInitial={chemin} modes={[{ ...mode("confort"), groupe: "acces" }, ...TOUS]} />)); return hote.querySelector("[role=menu]")!; };
  it("sans chemin : le premier cercle ; avec « fils » : le niveau Fils et ses familles, avec Retour", () => {
    expect(rendre().getAttribute("data-niveau")).toBe("0");
    act(() => root!.unmount()); hote!.remove();
    const m = rendre(["fils"]);
    expect(m.getAttribute("data-niveau")).toBe("1"); expect(m.getAttribute("aria-label")).toContain("Fils");
    expect([...m.querySelectorAll("[role=menuitem]")].map(e => e.getAttribute("aria-label") ?? "").some(t => /Retour/i.test(t))).toBe(true);
  });
  it("un chemin inconnu laisse le premier cercle (rien ne casse)", () => {
    expect(rendre(["nexiste-pas"]).getAttribute("data-niveau")).toBe("0");
  });
});

describe("le Tambour est le mode normal de l'atelier", () => {
  beforeEach(() => localStorage.removeItem(CADRE_TAMBOUR_CLE));
  it("sans réglage : actif ; refusé explicitement : coupé, et le refus est retenu ; accepté de nouveau : actif", () => {
    expect(lireCadreTambour()).toBe(true);
    ecrireCadreTambour(false); expect(localStorage.getItem(CADRE_TAMBOUR_CLE)).toBe("0"); expect(lireCadreTambour()).toBe(false);
    ecrireCadreTambour(true); expect(lireCadreTambour()).toBe(true);
  });
  it("l'ancien réglage « 1 » reste actif", () => { localStorage.setItem(CADRE_TAMBOUR_CLE, "1"); expect(lireCadreTambour()).toBe(true); });
});

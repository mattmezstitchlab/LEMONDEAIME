import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ACCESS, readPrefs, savePrefs } from "../lib/accessibilityCore";
import { INTERFACE_LEVEL_KEY, readInterfaceLevel } from "../lib/interfaceLevel";
import { lirePresentation } from "../lib/point/modes";
import { appliquerProfil, CLE_NIVEAU, EVENEMENT_NIVEAU, nomProfil, profilActuel, PROFIL_CLE, PROFILS_POINT } from "../lib/point/profils";

describe("Les profils du Point", () => {
  beforeEach(() => localStorage.clear());

  it("partagent la clé du niveau d'affichage du studio, sans en dépendre", () => { expect(CLE_NIVEAU).toBe(INTERFACE_LEVEL_KEY); });
  it("proposent les quatre profils décidés, plus « Personnalisé » quand rien ne correspond", () => {
    expect(PROFILS_POINT.map(p => p.nom)).toEqual(["Débutante", "Experte", "Lecture confortable", "Création géométrique"]);
    savePrefs({ ...DEFAULT_ACCESS, fontScale: 1.5 });
    expect(profilActuel()).toBeNull();
    expect(nomProfil(profilActuel())).toBe("Personnalisé");
  });

  it("un profil règle ensemble le niveau d'affichage, le confort et le menu du Point, et prévient le studio", () => {
    const ecoute = vi.fn(); window.addEventListener(EVENEMENT_NIVEAU, ecoute);
    expect(appliquerProfil("lecture")).toBe(true);
    expect(readPrefs().fontScale).toBe(1.25);
    expect(readInterfaceLevel()).toBe("intermediate");
    expect(lirePresentation()).toBe("liste");
    expect(profilActuel()).toBe("lecture");
    expect((ecoute.mock.calls[0][0] as CustomEvent).detail).toBe("intermediate");
    appliquerProfil("debutante");
    expect(localStorage.getItem(INTERFACE_LEVEL_KEY)).toBe("beginner");
    expect(profilActuel()).toBe("debutante");
    window.removeEventListener(EVENEMENT_NIVEAU, ecoute);
  });

  it("deux profils aux mêmes réglages (Experte, Création géométrique) : le dernier choisi l'emporte", () => {
    appliquerProfil("geometrique"); expect(profilActuel()).toBe("geometrique");
    appliquerProfil("experte"); expect(profilActuel()).toBe("experte");
    expect(localStorage.getItem(PROFIL_CLE)).toBe("experte");
  });

  it("un réglage modifié à la main fait passer en « Personnalisé », sans rien effacer d'autre", () => {
    appliquerProfil("experte");
    savePrefs({ ...readPrefs(), contrast: "strong" });
    expect(profilActuel()).toBeNull();
    expect(readInterfaceLevel()).toBe("expert");
  });
});

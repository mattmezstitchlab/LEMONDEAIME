import { describe, expect, it, vi } from "vitest";
import { buildPdf, PdfAborted, pdfFileName } from "../lib/pdf";
import { compositePattern, createPattern, ensurePalette, toObject, type Pattern } from "../lib/pattern";
import { FLOSS, flossIndex } from "../lib/dmc";
import { normalize, pageCount, pdfText, rectOps } from "./helpers";

/**
 * Régressions de l'export PDF.
 *
 * Quatre défauts ont été corrigés et sont verrouillés ici :
 * B1 les symboles imprimés suivaient la position dans la palette au lieu du
 *    `symbolMap` de l'atelier ;
 * B2 les calques n'étaient pas fusionnés avant impression ;
 * B3 `buildPdf` téléchargeait le fichier en plus de le renvoyer, donc chaque
 *    export produisait deux fichiers — et un simple aperçu en téléchargeait un
 *    sans qu'on le demande ;
 * B4 les nœuds français, points lancés, perles, petites croix et annotations
 *    étaient comptés en couverture mais dessinés nulle part.
 */

const RED = flossIndex("321");
const BLUE = flossIndex("3801");

/** Les deux PDF doivent être octet pour octet identiques. */
async function identical(a: Pattern, b: Pattern, bw: boolean) {
  const [ta, tb] = await Promise.all([pdfText(await buildPdf(a, { bw })), pdfText(await buildPdf(b, { bw }))]);
  return normalize(ta) === normalize(tb);
}

describe("B3 — buildPdf est une fonction pure", () => {
  it("renvoie le blob sans déclencher de téléchargement", async () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const previous = URL.createObjectURL;
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    try {
      const p = createPattern("Pureté", 8, 8, 14, 2);
      p.cross[0] = RED;
      ensurePalette(p, RED);
      const blob = await buildPdf(p, { bw: true });
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(2000);
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(click).not.toHaveBeenCalled();
    } finally {
      URL.createObjectURL = previous;
      click.mockRestore();
    }
  });

  it("nomme le fichier comme l'appelant s'y attend", () => {
    const p = createPattern("Mon été 2026", 8, 8, 14, 2);
    expect(pdfFileName(p, { bw: true, paper: "a4" })).toBe("mon-ete-2026-a4-symboles.pdf");
    expect(pdfFileName(p, { bw: false, paper: "letter" })).toBe("mon-ete-2026-letter-couleur.pdf");
  });
});

describe("B1 — les symboles imprimés suivent l'atelier", () => {
  /**
   * Même affectation de symboles (rouge → 1, bleu → 0), obtenue de deux
   * façons : par la position dans la palette d'un côté, par `symbolMap` de
   * l'autre. Si le PDF lit la position, les deux sorties diffèrent.
   */
  const cells = () => {
    const p = createPattern("Symboles", 10, 10, 14, 2);
    p.cross[0] = RED;
    p.cross[1] = RED;
    p.cross[2] = BLUE;
    p.cross[3] = BLUE;
    p.fwd[20] = RED;
    p.bwd[21] = BLUE;
    p.back.push({ x1: 0, y1: 5, x2: 3, y2: 5, c: RED });
    p.knots.push({ x: 6, y: 6, c: BLUE });
    return p;
  };

  it("ignore l'ordre de la palette quand symbolMap décide", async () => {
    const byPosition = cells();
    byPosition.palette = [BLUE, RED];
    byPosition.symbolMap = {};

    const byMap = cells();
    byMap.palette = [RED, BLUE];
    byMap.symbolMap = { [FLOSS[RED].code]: 1, [FLOSS[BLUE].code]: 0 };

    expect(await identical(byPosition, byMap, true)).toBe(true);
    expect(await identical(byPosition, byMap, false)).toBe(true);
  });

  it("change réellement quand on réaffecte un symbole", async () => {
    const base = cells();
    base.palette = [RED, BLUE];
    base.symbolMap = {};

    const moved = cells();
    moved.palette = [RED, BLUE];
    moved.symbolMap = { [FLOSS[RED].code]: 9 };

    // Garde-fou : le test précédent n'est pas vide, une réaffectation se voit.
    expect(await identical(base, moved, true)).toBe(false);
  });

  it("légende et grille utilisent la même source que l'écran", async () => {
    const p = cells();
    p.palette = [RED, BLUE];
    p.symbolMap = { [FLOSS[RED].code]: 42 };
    const text = await pdfText(await buildPdf(p, { bw: true }));
    // Couverture, légende, index, table des ornements (le motif a un point
    // arrière et un noeud), puis une page de grille. Le nombre exact de pages
    // dépend de la longueur des notes et du format : ce qui est verrouillé ici,
    // c'est la présence de chaque section annoncée et un total raisonnable.
    for (const section of ["Légende des fils", "Index des pages de grille", "Contours et ornements", "Échelle d'impression"]) {
      expect(text, section).toContain(section);
    }
    expect(pageCount(text)).toBeGreaterThanOrEqual(5);
    expect(pageCount(text)).toBeLessThanOrEqual(7);
    expect(text).toContain("craft-color-codes");
  });
});

describe("Échelle d'impression", () => {
  const small = () => {
    const p = createPattern("Échelle", 10, 10, 14, 2);
    p.cross[0] = RED;
    p.cross[1] = BLUE;
    ensurePalette(p, RED);
    ensurePalette(p, BLUE);
    return p;
  };

  it("imprime une règle de 10 cm à mesurer, en noir et blanc comme en couleur", async () => {
    const p = small();
    for (const bw of [true, false]) {
      const text = await pdfText(await buildPdf(p, { bw }));
      expect(text, `bw=${bw}`).toContain("Échelle d'impression");
      expect(text).toContain("exactement 10 cm");
      expect(text).toContain("100 %");
      // Les graduations sont dessinées : 21 traits (tous les 5 mm) plus la règle.
      expect(rectOps(text)).toBeGreaterThan(0);
    }
  });

  it("annonce la taille de case réellement calculée, pas une valeur fixe", async () => {
    const petit = await pdfText(await buildPdf(small(), { bw: true, paper: "a4" }));
    const large = () => {
      const p = createPattern("Grand", 300, 300, 14, 2);
      p.cross[0] = RED;
      ensurePalette(p, RED);
      return p;
    };
    const grand = await pdfText(await buildPdf(large(), { bw: true, paper: "a4" }));
    const taille = (text: string) => {
      const found = /case de (\d+[.,]\d+) mm/.exec(text);
      expect(found, "taille de case annoncée").not.toBeNull();
      return Number(found![1].replace(",", "."));
    };
    const casePetite = taille(petit);
    const caseGrande = taille(grand);
    // Un 10 × 10 tient large : la case est au maximum autorisé. Un 300 × 300
    // doit réduire la case pour garder 40 cases plus le chevauchement par page.
    expect(casePetite).toBeGreaterThan(caseGrande);
    expect(casePetite).toBeLessThanOrEqual(7);
    expect(caseGrande).toBeGreaterThanOrEqual(1.4);
  });
});

describe("B2 — les calques sont fusionnés avant impression", () => {
  const filled = () => {
    const p = createPattern("Calques", 10, 10, 14, 2);
    for (let i = 0; i < 5; i++) p.cross[i] = RED;
    ensurePalette(p, RED);
    return p;
  };

  const layered = () => {
    const other = filled();
    const p = createPattern("Calques", 10, 10, 14, 2);
    // Le calque actif est vide : tout le dessin vient de l'autre calque.
    p.palette = other.palette.slice();
    p.symbolMap = { ...other.symbolMap };
    p.layers = [
      { id: "a", name: "Motif", visible: true, locked: false, snapshot: JSON.stringify(toObject(other)) },
      { id: "b", name: "Calque 2", visible: true, locked: false, snapshot: null },
    ];
    p.activeLayer = "b";
    return p;
  };

  it("compositePattern récupère le dessin du calque visible", () => {
    const merged = compositePattern(layered());
    expect(Array.from(merged.cross).filter((v) => v === RED)).toHaveLength(5);
    expect(merged.layers).toHaveLength(0);
  });

  it("le PDF d'un projet à calques imprime le motif fusionné", async () => {
    const [flat, stacked] = await Promise.all([
      pdfText(await buildPdf(filled(), { bw: false })),
      pdfText(await buildPdf(layered(), { bw: false })),
    ]);
    // Autant d'aplats coloriés d'un côté comme de l'autre : sans fusion, le
    // projet à calques n'imprimerait aucune case.
    expect(rectOps(stacked)).toBe(rectOps(flat));
    expect(rectOps(stacked)).toBeGreaterThan(0);
  });
});

describe("B4 — ornements et notes sont imprimés", () => {
  const ornamented = () => {
    const p = createPattern("Ornements", 10, 10, 14, 2);
    p.cross[0] = RED;
    ensurePalette(p, RED);
    p.back.push({ x1: 0, y1: 0, x2: 4, y2: 0, c: RED });
    p.long.push({ x1: 1, y1: 2, x2: 5, y2: 6, c: RED });
    p.knots.push({ x: 3, y: 3, c: RED });
    p.special = [
      { x: 4.5, y: 4.5, c: RED, kind: "bead" },
      { x: 5.25, y: 5.25, c: RED, kind: "petite" },
    ];
    return p;
  };

  it("publie une table des contours et ornements", async () => {
    const text = await pdfText(await buildPdf(ornamented(), { bw: true }));
    expect(text).toContain("Contours et ornements");
    expect(text).toContain("Point arrière");
    expect(text).toContain("Point lancé");
    expect(text).toContain("Noeud français");
    expect(text).toContain("Perle");
    expect(text).toContain("Petite croix");
    // Au moins : couverture, légende, index, table des ornements et une page
    // de grille. La couverture peut se replier sur deux pages quand une phrase
    // d'explication s'ajoute, donc on borne sans figer un total absolu.
    expect(pageCount(text)).toBeGreaterThanOrEqual(5);
  });

  it("dessine les nœuds et les perles sur la grille", async () => {
    const withOrnaments = await pdfText(await buildPdf(ornamented(), { bw: true }));
    const bare = createPattern("Nu", 10, 10, 14, 2);
    bare.cross[0] = RED;
    ensurePalette(bare, RED);
    const withoutOrnaments = await pdfText(await buildPdf(bare, { bw: true }));
    // Nœuds et perles sont des cercles et des ellipses : des chemins courbes
    // que le patron nu ne contient pas.
    const curves = (t: string) => (t.match(/ re\n|\bc\n/g) ?? []).length;
    expect(curves(withOrnaments)).toBeGreaterThan(curves(withoutOrnaments));
  });

  it("n'ajoute pas de table vide quand le motif n'a pas d'ornement", async () => {
    const p = createPattern("Simple", 10, 10, 14, 2);
    p.cross[0] = RED;
    ensurePalette(p, RED);
    const text = await pdfText(await buildPdf(p, { bw: true }));
    expect(text).not.toContain("Contours et ornements");
    expect(pageCount(text)).toBe(4);
  });

  it("publie les annotations et les renvois numérotés", async () => {
    const p = ornamented();
    p.annotations = [{ x: 2, y: 3, text: "Vérifier le sens des demi-points" }];
    const text = await pdfText(await buildPdf(p, { bw: true }));
    const without = await pdfText(await buildPdf(ornamented(), { bw: true }));
    expect(text).toContain("Notes");
    expect(text).toContain("Vérifier le sens des demi-points");
    expect(text).toContain("repères carrés numérotés");
    // La page de notes s'ajoute. La couverture peut aussi se replier d'une
    // page, puisqu'une phrase d'explication apparaît : on compare donc
    // l'écart, pas un total absolu.
    expect(pageCount(text)).toBeGreaterThanOrEqual(pageCount(without) + 1);
  });

  it("n'imprime pas le suivi de broderie", async () => {
    const p = ornamented();
    p.done[0] = 1;
    p.mistakes = [1];
    p.parked = [{ x: 2, y: 2, corner: 0, c: RED }];
    const text = await pdfText(await buildPdf(p, { bw: false }));
    expect(text).toContain("ne sont pas imprimés");
    const tracked = await pdfText(await buildPdf(ornamented(), { bw: false }));
    // Les pages de grille sont identiques : l'avancement ne change rien à
    // l'impression du motif.
    const strip = (t: string) => normalize(t).slice(t.indexOf("/Count"));
    expect(strip(text)).toBe(strip(tracked));
  });
});

describe("Pagination et mise en page", () => {
  it("numérote les pages à partir du nombre réel produit", async () => {
    const p = createPattern("Grand", 80, 80, 14, 2);
    p.cross[0] = RED;
    ensurePalette(p, RED);
    const text = await pdfText(await buildPdf(p, { bw: true }));
    // 80 / 40 = 2 colonnes × 2 rangées = 4 pages de grille, après 3 pages liminaires.
    expect(pageCount(text)).toBe(7);
    expect(text).toContain("p. 4");
    expect(text).toContain("p. 7");
    expect(text).toContain("Page 7 / 7");
  });

  it("le chevauchement répète vraiment les cases du bloc voisin", async () => {
    const p = createPattern("Chevauché", 50, 10, 14, 2);
    p.cross.fill(RED);
    ensurePalette(p, RED);
    const [without, withOverlap] = await Promise.all([
      pdfText(await buildPdf(p, { bw: false, overlap: false })),
      pdfText(await buildPdf(p, { bw: false, overlap: true })),
    ]);
    expect(pageCount(without)).toBe(pageCount(withOverlap));
    // Dix cases de la deuxième colonne sont dessinées deux fois : c'est la
    // bande de calage, pas une simple marge grisée.
    expect(rectOps(withOverlap)).toBeGreaterThan(rectOps(without));
  });

  it("tient sur une seule page de grille en Letter comme en A4", async () => {
    const p = createPattern("Formats", 40, 40, 14, 2);
    p.cross[0] = RED;
    ensurePalette(p, RED);
    for (const paper of ["a4", "letter"] as const) {
      const text = await pdfText(await buildPdf(p, { bw: true, paper }));
      expect(pageCount(text)).toBe(4);
    }
  });
});

describe("Progression et annulation", () => {
  const wide = () => {
    const p = createPattern("Suivi", 120, 40, 14, 2);
    p.cross[0] = RED;
    ensurePalette(p, RED);
    return p;
  };

  it("signale chaque page de grille", async () => {
    const seen: number[] = [];
    const totals: number[] = [];
    await buildPdf(wide(), { bw: true, onProgress: (done, total) => { seen.push(done); totals.push(total); } });
    // 120 / 40 = 3 colonnes × 1 rangée.
    expect(seen).toEqual([1, 2, 3]);
    expect(totals).toEqual([3, 3, 3]);
  });

  it("s'arrête proprement quand l'appel annule", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(buildPdf(wide(), { bw: true, signal: controller.signal })).rejects.toBeInstanceOf(PdfAborted);
  });

  it("s'arrête en cours de production", async () => {
    const controller = new AbortController();
    let calls = 0;
    await expect(
      buildPdf(wide(), {
        bw: true,
        signal: controller.signal,
        onProgress: () => {
          calls++;
          if (calls === 2) controller.abort();
        },
      }),
    ).rejects.toBeInstanceOf(PdfAborted);
    expect(calls).toBe(2);
  });
});

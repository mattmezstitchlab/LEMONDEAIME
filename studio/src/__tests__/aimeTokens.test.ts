/**
 * Les contrastes du socle AIME, calculés depuis design/aime.css lui-même (une seule source), dans les deux thèmes.
 * WCAG 2.2 AA : texte 4,5:1 ; contrôles, bordures de champs et focus 3:1 (1.4.11). Les couleurs translucides sont
 * composées sur le fond où elles se posent.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = readFileSync("src/design/aime.css", "utf8");
function bloc(theme: string): Record<string, string> {
  const m = new RegExp(`\\[data-aime="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(css); if (!m) throw new Error("thème absent : " + theme);
  return Object.fromEntries([...m[1].matchAll(/(--aime-[\w-]+):\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]));
}
type RGBA = [number, number, number, number];
function couleur(v: string): RGBA {
  const h = /^#([0-9a-f]{6})$/i.exec(v); if (h) { const n = parseInt(h[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
  const r = /^rgba?\(([^)]+)\)$/.exec(v); if (r) { const p = r[1].split(",").map(x => parseFloat(x)); return [p[0], p[1], p[2], p[3] ?? 1]; }
  throw new Error("couleur illisible : " + v);
}
const sur = (a: RGBA, fond: RGBA): RGBA => [0, 1, 2].map(i => a[i] * a[3] + fond[i] * (1 - a[3])).concat(1) as RGBA;
const lum = ([r, g, b]: RGBA) => { const c = (x: number) => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * c(r) + .7152 * c(g) + .0722 * c(b); };
export function ratio(a: RGBA, b: RGBA) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); }

for (const theme of ["nuit", "jour"]) describe(`Le thème ${theme}`, () => {
  const t = bloc(theme), C = (k: string) => couleur(t["--aime-" + k]);
  const fonds = ["fond", "fond-2", "surface", "surface-2"].map(C);
  const verre = sur(C("verre"), C("fond"));
  it("chaque token sémantique est défini", () => {
    for (const k of ["fond", "fond-2", "surface", "surface-2", "verre", "texte", "texte-2", "texte-3", "bordure", "bordure-forte", "bordure-champ", "champ",
      "primaire", "primaire-texte", "secondaire", "secondaire-texte", "selection", "selection-texte", "focus", "erreur", "erreur-fond", "succes", "desactive", "desactive-fond", "cadre"])
      expect(t["--aime-" + k], k).toBeTruthy();
  });
  it("les textes se lisent sur tous les fonds et sur le verre (4,5:1)", () => {
    for (const f of [...fonds, verre]) for (const k of ["texte", "texte-2", "texte-3"]) expect(ratio(C(k), f), `${k}`).toBeGreaterThanOrEqual(4.5);
  });
  it("les boutons, la sélection, l'erreur et le succès se lisent (4,5:1)", () => {
    expect(ratio(C("primaire-texte"), C("primaire"))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(C("secondaire-texte"), sur(C("secondaire"), C("fond")))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(C("selection-texte"), C("selection"))).toBeGreaterThanOrEqual(4.5);
    for (const f of fonds) { expect(ratio(C("erreur"), f)).toBeGreaterThanOrEqual(4.5); expect(ratio(C("succes"), f)).toBeGreaterThanOrEqual(4.5); }
    expect(ratio(C("erreur"), sur(C("erreur-fond"), C("surface")))).toBeGreaterThanOrEqual(4.5);
  });
  it("le focus, les bordures de champs et le bouton principal se distinguent de leur fond (3:1)", () => {
    for (const f of fonds) { expect(ratio(C("focus"), f), "focus").toBeGreaterThanOrEqual(3); expect(ratio(C("bordure-champ"), f), "champ").toBeGreaterThanOrEqual(3); }
    expect(ratio(C("bordure-champ"), C("champ"))).toBeGreaterThanOrEqual(3);
    expect(ratio(C("primaire"), C("fond"))).toBeGreaterThanOrEqual(3);
  });
  it("un état désactivé reste visible sans se confondre avec l'actif", () => {
    const r = ratio(C("desactive"), C("fond"));
    expect(r).toBeGreaterThanOrEqual(2); expect(r).toBeLessThan(ratio(C("texte-3"), C("fond")));
  });
  it("le texte sur photographie passe par un voile sombre (≥ 4,5:1 même sur un ciel blanc, au bas du voile)", () => {
    const blanc: RGBA = [255, 255, 255, 1], basVoile = sur([8, 8, 9, .72], blanc);
    expect(ratio([255, 255, 255, 1], basVoile)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("Un seul socle", () => {
  it("les deux thèmes définissent exactement les mêmes tokens ; aucun marron ni cuivre dans l'interface", () => {
    expect(Object.keys(bloc("nuit")).sort()).toEqual(Object.keys(bloc("jour")).sort());
    for (const theme of ["nuit", "jour"]) for (const [k, v] of Object.entries(bloc(theme))) {
      const m = /^#([0-9a-f]{6})$/i.exec(v); if (!m) continue;
      const n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
      if (k.match(/erreur|succes|focus/)) continue;
      expect(Math.max(r, g, b) - Math.min(r, g, b), `${theme} ${k} ${v} : un gris neutre`).toBeLessThanOrEqual(10);
    }
  });
});

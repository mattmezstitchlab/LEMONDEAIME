import { describe, expect, it } from 'vitest';
import { calculerRosace, changerDimension, lienAtelier, RECETTE_INITIALE, varier } from '../../../src/rosace/modele';
import { codeDe, lireCode, MAX_GRAINE } from '../lib/motif5d/code';
import { empreinteCroix, formatParDefaut, generer } from '../lib/motif5d/generer';
import { FLOSS } from '../lib/dmc';
import { mesures } from '../lib/cadre';
import { patternToSvg } from '../lib/svg';

describe('ROSACE : une seule recette, plusieurs lectures', () => {
  it('utilise exactement le Pattern et les garde-fous du générateur 5D existant', () => {
    const apercu = calculerRosace(RECETTE_INITIALE);
    const [w, h] = formatParDefaut(RECETTE_INITIALE.signature);
    const studio = generer({ ...RECETTE_INITIALE, w, h });
    expect(apercu.pattern.cross).toEqual(studio.pattern.cross);
    expect(apercu.pattern.palette).toEqual(studio.pattern.palette);
    expect(apercu.controle).toEqual(studio.controle);
    expect(apercu.pattern.recette?.empreinte).toBe(empreinteCroix(studio.pattern));
    expect(apercu.code).toBe(codeDe(RECETTE_INITIALE));
  });

  it('les fils, les croix et les mesures lisent le même ouvrage', () => {
    const { pattern, controle, cadre, statistiques } = calculerRosace(RECETTE_INITIALE);
    expect(pattern.cross.filter(i => i >= 0).length).toBe(controle.croix);
    expect(statistiques.totals.cross).toBe(controle.croix);
    expect(statistiques.rows.map(r => r.idx).sort((a, b) => a - b)).toEqual([...pattern.palette].sort((a, b) => a - b));
    expect(pattern.palette.every(i => !!FLOSS[i]?.code && /^#[0-9a-f]{6}$/i.test(FLOSS[i]?.hex))).toBe(true);
    expect(cadre).toEqual(mesures(pattern));
    expect(cadre.points).toBe(controle.croix);
  });

  it('un choix change une dimension sans muter la recette précédente', () => {
    const r = changerDimension(RECETTE_INITIALE, 'palette', 3);
    expect(r.signature.palette).toBe(3);
    expect(RECETTE_INITIALE.signature.palette).toBe(2);
    expect(r.signature.structure).toBe(RECETTE_INITIALE.signature.structure);
    expect(r.graine).toBe(RECETTE_INITIALE.graine);
    expect(calculerRosace(r).code).not.toBe(calculerRosace(RECETTE_INITIALE).code);
  });

  it('la frise prend le format réel du moteur, sans inventer un sixième réglage', () => {
    const frise = changerDimension(RECETTE_INITIALE, 'structure', 2);
    const { pattern } = calculerRosace(frise);
    expect([pattern.w, pattern.h]).toEqual([121, 31]);
  });

  it('une variation change la graine, et boucle à la limite autorisée', () => {
    const r = varier(RECETTE_INITIALE);
    expect(r.graine).toBe(RECETTE_INITIALE.graine + 1);
    expect(r.signature).toEqual(RECETTE_INITIALE.signature);
    expect(varier({ ...r, graine: MAX_GRAINE }).graine).toBe(1);
    expect(empreinteCroix(calculerRosace(r).pattern)).not.toBe(empreinteCroix(calculerRosace(RECETTE_INITIALE).pattern));
  });

  it('le lien existant de l’atelier transmet la recette, pas une image ou un ouvrage', () => {
    const r = changerDimension(RECETTE_INITIALE, 'trace', 1);
    const u = new URL(lienAtelier(r), 'https://exemple.invalid');
    expect(u.pathname).toBe('/studio/atelier');
    expect(lireCode(u.searchParams.get('rosace'))).toEqual(r);
    expect([...u.searchParams.keys()]).toEqual(['rosace']);
  });

  it('l’aperçu du patron emploie le générateur SVG de l’atelier et les fils du Pattern', () => {
    const { pattern, code } = calculerRosace(RECETTE_INITIALE);
    const result = patternToSvg(pattern, { bw: true, grid: true, symbols: true, legend: true });
    expect(result.svg).toContain('<svg');
    expect(result.symbolsOmitted).toBe(false);
    for (const idx of pattern.palette) expect(result.svg).toContain(FLOSS[idx].code);
    expect(pattern.recette?.code).toBe(code);
  });
});

describe('collection ROSACE : 64 recettes réelles, indépendantes de l’échiquier SYST’AIME', () => {
  it('compose 64 recettes 5D déterministes, distinctes et toutes de forme rosace', async () => {
    const { COLLECTION_ROSACES } = await import('../../../src/rosace/collection');
    const { genererRosace } = await import('../../../src/rosace/modele');
    expect(COLLECTION_ROSACES).toHaveLength(64);
    expect(new Set(COLLECTION_ROSACES.map(r => r.code)).size).toBe(64);
    expect(COLLECTION_ROSACES.map(r => r.numero)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(COLLECTION_ROSACES.slice(1, 4).map(r => r.nom)).toEqual(['Carreau rose', 'Givre', 'Kaléidoscope']);
    const empreintes = COLLECTION_ROSACES.map(r => {
      expect(lireCode(r.code)).toEqual(r.recette);
      expect(r.recette.signature.structure).toBe(0);
      const { pattern, controle } = genererRosace(r.recette);
      expect([pattern.w, pattern.h]).toEqual([61, 61]);
      expect(controle.croix).toBeGreaterThan(0);
      expect(pattern.recette?.code).toBe(r.code);
      expect(pattern.recette?.empreinte).toBe(empreinteCroix(pattern));
      expect(pattern.palette.every(i => !!FLOSS[i]?.code)).toBe(true);
      return pattern.recette!.empreinte;
    });
    expect(new Set(empreintes).size).toBe(64);
    expect(genererRosace(COLLECTION_ROSACES[63].recette).pattern.recette?.empreinte).toBe(empreintes[63]);
  });

  it('parcourt toute la collection, boucle et rejoint ses extrémités depuis une recette libre', async () => {
    const { COLLECTION_ROSACES: c, prochaineRosace } = await import('../../../src/rosace/collection');
    expect(prochaineRosace(c[0].code, -1)).toBe(c[63]);
    expect(prochaineRosace(c[63].code, 1)).toBe(c[0]);
    expect(prochaineRosace('hors-collection', 1)).toBe(c[0]);
    expect(prochaineRosace('hors-collection', -1)).toBe(c[63]);
    let courant = c[0];
    const visites = new Set<string>();
    for (let i = 0; i < 64; i++) { visites.add(courant.code); courant = prochaineRosace(courant.code, 1); }
    expect(visites.size).toBe(64);
    expect(courant).toBe(c[0]);
  });
});

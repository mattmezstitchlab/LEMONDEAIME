/* La Métamorphose : chacun transforme l'accueil pour soi (noms des mariés, univers, prestataires cherchés, sections et leur ordre).
   La page ne change que pour cette personne, sur cet appareil : pour tous les autres, l'accueil reste le même. */
import { useEffect, useState } from 'react';

export type SectionId = 'unions' | 'prestataires' | 'studio' | 'invites' | 'collections' | 'boutique' | 'chacun' | 'espace' | 'aplus';
export const SECTIONS: [SectionId, string][] = [['unions', 'Unions'], ['prestataires', 'Prestataires'], ['studio', 'Studio'], ['invites', 'Invités'], ['collections', 'Collections'], ['boutique', 'Boutique'], ['chacun', 'Pour chacun'], ['espace', 'L’Espace'], ['aplus', 'A+']];
export type Meta = { a: string; b: string; date: string; univers: string | null; presta: string[]; ordre: SectionId[]; cachees: SectionId[] };
export const DEFAUT: Meta = { a: '', b: '', date: '', univers: null, presta: [], ordre: SECTIONS.map(s => s[0]), cachees: ['boutique'] };
const CLE = 'aime-metamorphose';
const EVT = 'aime:metamorphose';

function propre(v: Partial<Meta>): Meta {
  const ids = SECTIONS.map(s => s[0]);
  const ordre = (Array.isArray(v.ordre) ? v.ordre.filter(x => ids.includes(x)) : []) as SectionId[];
  ids.forEach(x => { if (!ordre.includes(x)) ordre.push(x); });
  const t = (x: unknown, n: number) => typeof x === 'string' ? x.slice(0, n) : '';
  return { a: t(v.a, 40), b: t(v.b, 40), date: t(v.date, 60), univers: typeof v.univers === 'string' ? v.univers : null,
    presta: Array.isArray(v.presta) ? v.presta.filter(x => typeof x === 'string').slice(0, 30) : [], ordre,
    cachees: (Array.isArray(v.cachees) ? v.cachees.filter(x => ids.includes(x)) : DEFAUT.cachees) as SectionId[] };
}
export function lireMeta(): Meta { try { const v = JSON.parse(localStorage.getItem(CLE) || 'null'); return v && typeof v === 'object' ? propre(v) : DEFAUT; } catch { return DEFAUT; } }
export function ecrireMeta(m: Meta | null) {
  try { if (m) localStorage.setItem(CLE, JSON.stringify(m)); else localStorage.removeItem(CLE); } catch { /* reste pour la visite */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: m ? propre(m) : DEFAUT }));
}
export function useMeta(): [Meta, (m: Meta | null) => void] {
  const [m, setM] = useState(lireMeta);
  useEffect(() => { const f = (e: Event) => setM((e as CustomEvent<Meta>).detail); window.addEventListener(EVT, f); return () => window.removeEventListener(EVT, f); }, []);
  return [m, ecrireMeta];
}
export function estTransformee(m: Meta) { return JSON.stringify(propre(m)) !== JSON.stringify(DEFAUT); }

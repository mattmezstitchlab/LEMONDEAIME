import type { UnionEnregistree } from './programme-outils.mjs';
/* union : présente pour un mariage (kind « evenement », modèle « mariage »), la forme canonique partagée avec AIMESTUDIO */
export type Projet = { id: string; genre: string; titre: string; role: string; maj: string; briques: string[]; studio: string; visibilite: string; archive: boolean; ouvrage?: string | null; union?: UnionEnregistree | null };
export const nomUnion = (u: UnionEnregistree) => u.a && u.b ? u.a + ' & ' + u.b : '';
const H = { 'Content-Type': 'application/json' };
export async function lireBuro(): Promise<{ ok: boolean; projets?: Projet[]; raison?: string; code: number }> {
  try { const r = await fetch('/api/buro', { credentials: 'same-origin' }); const j = await r.json().catch(() => ({})); return { ...j, code: r.status }; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.', code: 0 }; }
}
export async function ecrireBuro(corps: object): Promise<{ ok: boolean; id?: string; existant?: boolean; raison?: string; code: number }> {
  try { const r = await fetch('/api/buro', { method: 'POST', headers: H, credentials: 'same-origin', body: JSON.stringify(corps) }); const j = await r.json().catch(() => ({})); return { ...j, code: r.status }; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.', code: 0 }; }
}

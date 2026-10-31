export type Mariage = { noms: string[]; date?: string; lieu?: { nom?: string; ville?: string } };
export type Projet = { id: string; genre: string; titre: string; role: string; maj: string; briques: string[]; studio: string; visibilite: string; archive: boolean; ouvrage?: string | null; description?: string; rev?: number; intention?: string; modele?: string | null; mariage?: Mariage | null };
const H = { 'Content-Type': 'application/json' };
export async function lireBuro(): Promise<{ ok: boolean; projets?: Projet[]; raison?: string; code: number }> {
  try { const r = await fetch('/api/buro', { credentials: 'same-origin' }); const j = await r.json().catch(() => ({})); return { ...j, code: r.status }; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.', code: 0 }; }
}
export async function ecrireBuro(corps: object): Promise<{ ok: boolean; id?: string; rev?: number; conflit?: boolean; raison?: string; code: number }> {
  try { const r = await fetch('/api/buro', { method: 'POST', headers: H, credentials: 'same-origin', body: JSON.stringify(corps) }); const j = await r.json().catch(() => ({})); return { ...j, code: r.status }; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.', code: 0 }; }
}

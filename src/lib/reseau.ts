export type Profil = { nom: string; metier: string; ville: string; bio: string; site: string; visible?: boolean };
type Reponse = { ok: boolean; raison?: string; code: number; metiers?: string[]; profils?: Profil[]; profil?: Profil | null; suggestion?: { nom: string } };
async function appel(url: string, init?: RequestInit): Promise<Reponse> {
  try { const r = await fetch(url, { credentials: 'same-origin', ...init }); const j = await r.json().catch(() => ({})); return { ...j, code: r.status }; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.', code: 0 }; }
}
export const lireReseau = () => appel('/api/reseau');
export const lireMonProfil = () => appel('/api/reseau?moi=1');
export const ecrireMonProfil = (p: Profil) => appel('/api/reseau', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
export const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0]!.toUpperCase()).join('') || '·';

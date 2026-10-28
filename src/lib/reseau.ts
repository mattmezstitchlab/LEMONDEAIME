export type Prestation = { titre: string; texte: string };
export type Etat = 'libre' | 'option' | 'prise';
export type Profil = { ref?: string; nom: string; domaine: string; metier: string; ville: string; bio: string; site: string; visible?: boolean;
  zone?: string; langues?: string; tarif?: string; prestations?: Prestation[]; liens?: string[]; photo?: boolean; etat?: Etat | null };
export type ProjetPublic = { titre: string; briques: string[] };
export type Demande = { id: string; de_nom: string; de_email: string; jour: string | null; lieu: string; invites: number | null; message: string; lue: boolean; cree_le: string };
type Reponse = { ok: boolean; raison?: string; code: number; domaines?: string[]; profils?: Profil[]; profil?: Profil | null; projets?: ProjetPublic[]; suggestion?: { nom: string };
  dates?: Record<string, Etat>; demandes?: Demande[]; questions?: { question: string; cree_le: string }[]; reponse?: string; trouve?: boolean; source?: string };
async function appel(url: string, init?: RequestInit): Promise<Reponse> {
  try { const r = await fetch(url, { credentials: 'same-origin', ...init }); const j = await r.json().catch(() => ({})); return { ...j, code: r.status }; }
  catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.', code: 0 }; }
}
const poster = (url: string, corps: unknown) => appel(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
export const lireReseau = (date?: string | null) => appel('/api/reseau' + (date ? '?date=' + date : ''));
export const lireProfil = (ref: string, date?: string | null) => appel('/api/reseau?ref=' + encodeURIComponent(ref) + (date ? '&date=' + date : ''));
export const lireMonProfil = () => appel('/api/reseau?moi=1');
export const ecrireMonProfil = (p: Profil) => poster('/api/reseau', p);
export const ecrireDates = (jours: Record<string, Etat | null>) => poster('/api/reseau', { action: 'dates', jours });
export const envoyerDemande = (ref: string, d: { jour?: string; lieu?: string; invites?: string; message: string }) => poster('/api/reseau', { action: 'demande', ref, ...d });
export const marquerLue = (id: string) => poster('/api/reseau', { action: 'demande-lue', id });
export const demanderOrbe = (ref: string, question: string) => poster('/api/orbe', { ref, question });
export const photoProfil = (ref: string) => '/api/reseau?photo=' + ref;
export const initiales = (nom: string) => nom.split(/\s+/).filter(Boolean).slice(0, 2).map(m => m[0]!.toUpperCase()).join('') || '·';

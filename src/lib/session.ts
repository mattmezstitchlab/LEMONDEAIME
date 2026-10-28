import { useEffect, useState } from 'react';

/* La personne connectée, lue depuis la session Better Auth (cookie vérifié côté serveur). */
export type Personne = { id: string; email: string; name?: string | null };
let cache: Personne | null | undefined;
const abonnes = new Set<(p: Personne | null) => void>();
export async function lireSession(): Promise<Personne | null> {
  try {
    const r = await fetch('/api/auth/get-session', { credentials: 'same-origin' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.user ? { id: j.user.id, email: j.user.email, name: j.user.name } : null;
  } catch { return null; }
}
export function useSession() {
  const [p, setP] = useState<Personne | null | undefined>(cache);
  useEffect(() => {
    abonnes.add(setP);
    if (cache === undefined) lireSession().then(v => { cache = v; abonnes.forEach(f => f(v)); });
    return () => { abonnes.delete(setP); };
  }, []);
  return p;
}
export async function seDeconnecter() {
  await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin' }).catch(() => {});
  cache = null; abonnes.forEach(f => f(null));
}
export async function demanderLien(email: string, retour = '/buro'): Promise<{ ok: boolean; raison?: string }> {
  try {
    const r = await fetch('/api/auth/sign-in/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ email, callbackURL: retour }) });
    if (r.ok) return { ok: true };
    const j = await r.json().catch(() => ({}));
    return { ok: false, raison: j.raison || j.message || 'Le lien n’a pas pu être envoyé.' };
  } catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.' }; }
}

export type Fournisseurs = { comptes: boolean; google: boolean; lien: boolean; cle: boolean };
export async function lireFournisseurs(): Promise<Fournisseurs> {
  try { const r = await fetch('/api/fournisseurs'); if (r.ok) return await r.json(); } catch { /* hors ligne */ }
  return { comptes: false, google: false, lien: false, cle: false };
}
/* « Continuer avec Google » : le serveur renvoie l'adresse de Google, on y part ; Google nous ramène sur le BurO. */
export async function entrerAvecGoogle(retour = '/buro'): Promise<{ ok: boolean; raison?: string }> {
  try {
    const r = await fetch('/api/auth/sign-in/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ provider: 'google', callbackURL: retour, errorCallbackURL: '/entrer?erreur=google' }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.url) { window.location.href = j.url; return { ok: true }; }
    return { ok: false, raison: j.raison || j.message || 'Google n’est pas disponible pour le moment.' };
  } catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.' }; }
}

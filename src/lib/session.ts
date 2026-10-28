import { useEffect, useState } from 'react';

/* La personne connectée, lue depuis la session Better Auth (cookie vérifié côté serveur). */
export type Personne = { id: string; email: string; name?: string | null; image?: string | null };
let cache: Personne | null | undefined;
const abonnes = new Set<(p: Personne | null) => void>();
export async function lireSession(): Promise<Personne | null> {
  try {
    const r = await fetch('/api/auth/get-session', { credentials: 'same-origin' });
    if (!r.ok) return null;
    const j = await r.json();
    return j && j.user ? { id: j.user.id, email: j.user.email, name: j.user.name, image: j.user.image } : null;
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
/* la photo du compte : une petite image (WebP, 512 px au plus, 160 Ko au plus), enregistrée sur le compte */
export async function changerPhoto(image: string | null): Promise<{ ok: boolean; raison?: string }> {
  try {
    const r = await fetch('/api/auth/update-user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ image }) });
    if (!r.ok) return { ok: false, raison: 'La photo n’a pas pu être enregistrée.' };
    if (cache) { cache = { ...cache, image }; const v = cache; abonnes.forEach(f => f(v)); }
    return { ok: true };
  } catch { return { ok: false, raison: 'Connexion impossible : vérifiez votre réseau.' }; }
}
export async function reduirePhoto(f: File): Promise<string> {
  const url = URL.createObjectURL(f);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    for (const [cote, q] of [[512, .82], [400, .75], [320, .7]] as const) {
      const k = Math.min(1, cote / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      const d = c.toDataURL('image/webp', q);
      if (d.startsWith('data:image/webp') && d.length <= 160000) return d;
      const j = c.toDataURL('image/jpeg', q); if (j.length <= 160000) return j;
    }
    throw new Error('trop lourde');
  } finally { URL.revokeObjectURL(url); }
}
/* effacerOuvrages : jamais par défaut ; efface de l'appareil les ouvrages de ce compte déjà rangés dans son espace (ils restent sur le compte) */
export async function seDeconnecter({ effacerOuvrages = false }: { effacerOuvrages?: boolean } = {}): Promise<{ effaces: number; gardes: number } | null> {
  let bilan: { effaces: number; gardes: number } | null = null;
  if (effacerOuvrages && cache && cache.id) {
    const { effacerOuvragesDuCompte } = await import('./ouvragesAppareil');
    bilan = await effacerOuvragesDuCompte(cache.id).catch(() => null);
  }
  await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', credentials: 'same-origin' }).catch(() => {});
  cache = null; abonnes.forEach(f => f(null));
  return bilan;
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

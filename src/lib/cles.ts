/* Clés d'accès (Face ID, Touch ID, empreinte, Windows Hello) : chargées seulement quand on s'en sert. */
async function client() {
  const [{ createAuthClient }, { passkeyClient }] = await Promise.all([import('better-auth/client'), import('@better-auth/passkey/client')]);
  return createAuthClient({ basePath: '/api/auth', plugins: [passkeyClient()] });
}
export const clesPossibles = () => typeof window !== 'undefined' && !!window.PublicKeyCredential;
export async function entrerAvecCle(): Promise<{ ok: boolean; raison?: string }> {
  try {
    const c = await client(); const r = await c.signIn.passkey();
    return r && !r.error ? { ok: true } : { ok: false, raison: 'Aucune clé d’accès reconnue sur cet appareil : entrez avec Google ou un lien e-mail, puis créez-en une.' };
  } catch { return { ok: false, raison: 'Clé d’accès indisponible sur cet appareil.' }; }
}
export async function creerCle(): Promise<{ ok: boolean; raison?: string }> {
  try {
    const c = await client(); const r = await c.passkey.addPasskey({ name: 'AIME · ' + (navigator.platform || 'cet appareil') });
    return r && !r.error ? { ok: true } : { ok: false, raison: 'La clé d’accès n’a pas été créée.' };
  } catch { return { ok: false, raison: 'La clé d’accès n’a pas été créée.' }; }
}
export async function nombreDeCles(): Promise<number | null> {
  try { const r = await fetch('/api/auth/passkey/list-user-passkeys', { credentials: 'same-origin' }); if (!r.ok) return null; const j = await r.json(); return Array.isArray(j) ? j.length : null; } catch { return null; }
}

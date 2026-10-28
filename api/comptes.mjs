// /api/auth/* : les routes de Better Auth (lien de connexion, clés d'accès, session, déconnexion).
// Vercel n'achemine pas les chemins à plusieurs segments vers une fonction simple : vercel.json réécrit
// /api/auth/<chemin> vers /api/comptes?__chemin=<chemin>, et l'adresse d'origine est reconstruite ici.
import { toNodeHandler } from 'better-auth/node';
import { auth, envoiPret, oublier, schemaManquant, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';     /* même origine et corps JSON sur toute écriture (audit Vercel, PR 2) */
import Q from './_auth/quotas.cjs';      /* liens de connexion (des e-mails) : 10 par adresse IP et par heure, partagé entre instances */
let gestion = null;
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); }
export function adresseOrigine(url) {
  const u = new URL(url || '/', 'http://x');
  if (u.pathname.startsWith('/api/auth/')) return u.pathname + u.search;
  const l = u.searchParams.get('__lien');
  if (l !== null) {   /* /lien/<jeton>/<page> : le lien reçu par e-mail */
    const m = /^([A-Za-z0-9_-]{8,200})(?:\/([a-z0-9-]{1,40}))?\/?$/.exec(l);
    if (!m) return '/api/auth/magic-link/verify';
    return '/api/auth/magic-link/verify?token=' + m[1] + '&callbackURL=' + encodeURIComponent('/' + (m[2] || 'buro')) + '&errorCallbackURL=' + encodeURIComponent('/entrer?erreur=lien');
  }
  const c = u.searchParams.get('__chemin') || ''; u.searchParams.delete('__chemin');
  if (!/^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+){0,5}$/.test(c)) return null;
  const q = u.searchParams.toString(); return '/api/auth/' + c + (q ? '?' + q : '');
}
export default async function comptes(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origine = adresseOrigine(req.url); if (!origine) return json(res, 404, { ok: false }); req.url = origine;
  if (/\/magic-link\/verify$/.test(origine.split('?')[0]) && !new URL(origine, 'http://x').searchParams.get('token')) {
    res.statusCode = 302; res.setHeader('Location', '/entrer?erreur=lien'); return res.end();   /* lien coupé ou incomplet : retour à « Entrer », jamais une page d'erreur brute */
  }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);   /* avant tout : même origine et JSON pour toute écriture */
  const a = auth();
  if (!a) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  if (/\/sign-in\/magic-link$/.test((req.url || '').split('?')[0]) && req.method === 'POST') {
    const q = await Q.quota('lien:ip', Q.ipDe(req), { db: _pool() || undefined });
    if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: 'Trop de liens de connexion demandés depuis cette connexion : réessayez dans un moment.' }); }
  }
  if (/\/sign-in\/magic-link$/.test((req.url || '').split('?')[0]) && !envoiPret()) return json(res, 503, { ok: false, raison: 'L\'envoi des e-mails n\'est pas encore configuré : utilisez une clé d\'accès, ou réessayez plus tard.' });
  gestion = gestion || toNodeHandler(a);
  try { return await gestion(req, res); }
  catch (e) {
    const manque = schemaManquant(e); if (manque) { oublier(); gestion = null; }   /* la base vient peut-être d'être migrée : on réessaiera à neuf */
    if (!res.headersSent) return json(res, 503, { ok: false, raison: manque ? 'Les comptes ne sont pas encore installés sur cette base (migration à exécuter).' : 'Service des comptes indisponible : réessayez.' }); }
}

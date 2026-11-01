// /api/systaime : le détail INTERNE de SYST'AIME (chemins, preuves, dépendances, notes d'audit). Réservé à l'administration.
// GET → { ok, manifeste } pour les adresses listées dans AIME_ADMIN (vérifiées sur la session, jamais sur la requête) ; sinon 401 / 403.
// Rien d'écrit ici, aucune base : le manifeste est un fichier du dépôt, embarqué avec la fonction (vercel.json : includeFiles).
// Le public ne reçoit que la projection expurgée, déjà dans la page (src/systaime/publique.json).
import { readFileSync } from 'node:fs';
import { auth, personne } from './_auth/auth.mjs';
import { estAdmin } from './_projets.mjs';

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex'); res.end(JSON.stringify(o)); }
const lireManifeste = () => JSON.parse(readFileSync(new URL('../docs/systaime/manifeste.interne.json', import.meta.url), 'utf8'));

/* Le cœur, testable : moi() (la personne de la session, ou null), admins (la liste AIME_ADMIN), manifeste() (la lecture du fichier). */
export async function traiter(req, res, { moi, admins, manifeste = lireManifeste }) {
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { ok: false, raison: 'Lecture seule.' }); }
  /* ?sante=1 : seulement « le fichier est-il embarqué avec la fonction ? » (un booléen, aucun contenu) — pour vérifier un déploiement sans compte */
  if (/[?&]sante=1(&|$)/.test(req.url || '')) { try { manifeste(); return json(res, 200, { ok: true, embarque: true }); } catch { return json(res, 200, { ok: true, embarque: false }); } }
  const m = await moi();
  if (!m) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour lire le détail interne.' });
  if (!estAdmin(m.email, admins)) return json(res, 403, { ok: false, raison: 'Réservé à l’administration du site.' });
  try { return json(res, 200, { ok: true, manifeste: manifeste() }); }
  catch { return json(res, 500, { ok: false, raison: 'Le manifeste interne est momentanément illisible.' }); }
}

export default async function systaime(req, res) {
  const a = auth();
  return traiter(req, res, { moi: () => (a ? personne(req).catch(() => null) : Promise.resolve(null)), admins: process.env.AIME_ADMIN || '' });
}

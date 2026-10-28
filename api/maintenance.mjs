// /api/maintenance : la reprise des effacements de fichiers en attente (comptes supprimés dont le stockage n'a pas répondu).
// Appelée chaque jour par la tâche planifiée de Vercel (vercel.json, « crons »), qui envoie « Authorization: Bearer <CRON_SECRET> ».
// Sans CRON_SECRET dans l'environnement, elle reste fermée (503). Elle ne lit ni ne montre aucune donnée : un simple bilan chiffré.
// Elle applique aussi la durée de conservation des demandes anonymisées (comptes supprimés) : DEMANDES_ANONYMES_MOIS, 12 par défaut.
import { auth, _pool } from './_auth/auth.mjs';
import { reprendre } from './_auth/effacements.mjs';
import { timingSafeEqual } from 'node:crypto';

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
export function autorise(entete, secret) {
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(String(entete || '')), b = Buffer.from('Bearer ' + secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
/** Les demandes reçues d'un compte supprimé (déjà anonymisées) sont gardées pour leur destinataire, puis effacées après N mois. */
export const moisConservation = (env = process.env) => { const n = parseInt(env.DEMANDES_ANONYMES_MOIS, 10); return Number.isInteger(n) && n >= 1 && n <= 120 ? n : 12; };
export async function purgerDemandes(db) {
  if (!(await db.query("select to_regclass('public.reseau_demandes') as t")).rows[0].t) return 0;
  const r = await db.query(`delete from reseau_demandes where de_user = '' and de_nom = 'Compte supprimé' and cree_le < now() - make_interval(months => $1)`, [moisConservation()]);
  return r.rowCount;
}
export default async function maintenance(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false });
  if (!process.env.CRON_SECRET) return json(res, 503, { ok: false, raison: 'Maintenance non configurée.' });
  if (!autorise(req.headers.authorization, process.env.CRON_SECRET)) return json(res, 401, { ok: false });
  if (!auth()) return json(res, 503, { ok: false, raison: 'Base non configurée.' });
  try {
    const db = _pool();
    const fichiers = await reprendre(db, { max: 200 });
    const demandes = await purgerDemandes(db);
    return json(res, 200, { ok: true, ...fichiers, demandesPurgees: demandes });
  }
  catch { return json(res, 500, { ok: false }); }
}

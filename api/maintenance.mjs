// /api/maintenance : la reprise des effacements de fichiers en attente (comptes supprimés dont le stockage n'a pas répondu).
// Appelée chaque jour par la tâche planifiée de Vercel (vercel.json, « crons »), qui envoie « Authorization: Bearer <CRON_SECRET> ».
// Sans CRON_SECRET dans l'environnement, elle reste fermée (503). Elle ne lit ni ne montre aucune donnée : un simple bilan chiffré.
import { auth, _pool } from './_auth/auth.mjs';
import { reprendre } from './_auth/effacements.mjs';
import { timingSafeEqual } from 'node:crypto';

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
export function autorise(entete, secret) {
  if (!secret || secret.length < 16) return false;
  const a = Buffer.from(String(entete || '')), b = Buffer.from('Bearer ' + secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
export default async function maintenance(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false });
  if (!process.env.CRON_SECRET) return json(res, 503, { ok: false, raison: 'Maintenance non configurée.' });
  if (!autorise(req.headers.authorization, process.env.CRON_SECRET)) return json(res, 401, { ok: false });
  if (!auth()) return json(res, 503, { ok: false, raison: 'Base non configurée.' });
  try { return json(res, 200, { ok: true, ...(await reprendre(_pool(), { max: 200 })) }); }
  catch { return json(res, 500, { ok: false }); }
}

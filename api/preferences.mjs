// /api/preferences : les préférences du Point (profil, affichage, menu, confort) rangées dans le compte AIME.
// GET                         → { ok, preferences | null, maj | null }
// POST { preferences, base }  → enregistre. « base » = la version du compte que l'appareil connaissait (null s'il n'en connaissait aucune).
//   Si le compte a changé depuis (base plus ancienne), 409 avec la version du compte : l'appareil doit demander, jamais écraser.
// L'identité vient toujours de la session vérifiée, jamais du corps de la requête. Sans la table (migration 2026-10-29-02), 503.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import { validerPreferences } from './_preferences.mjs';

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 8000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}

export default async function preferences(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const moi = await personne(req).catch(() => null);
  if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour retrouver vos préférences sur tous vos appareils.' });
  const db = _pool();
  try {
    const t = await db.query("select to_regclass('public.preferences_point') as t");
    if (!t.rows[0] || !t.rows[0].t) return json(res, 503, { ok: false, raison: 'Les préférences du compte ne sont pas encore ouvertes : elles restent sur cet appareil.' });
    if (req.method === 'GET') {
      const r = await db.query('select data, maj from preferences_point where user_id = $1', [moi.id]);
      return json(res, 200, { ok: true, preferences: r.rows[0] ? r.rows[0].data : null, maj: r.rows[0] ? Number(r.rows[0].maj) : null });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    let b; try { b = await corps(req); } catch { return json(res, 400, { ok: false, raison: 'Requête illisible.' }); }
    const { preferences: p, raison } = validerPreferences(b.preferences);
    if (!p) return json(res, 400, { ok: false, raison });
    const base = b.base === null || b.base === undefined ? null : Math.trunc(Number(b.base));
    const c = await db.connect();
    try {
      await c.query('begin');
      const ex = await c.query('select data, maj from preferences_point where user_id = $1 for update', [moi.id]);
      const actuel = ex.rows[0] ? Number(ex.rows[0].maj) : null;
      if (actuel !== null && actuel !== base) { await c.query('rollback'); return json(res, 409, { ok: false, code: 'conflit', raison: 'Votre compte a d’autres préférences, enregistrées depuis un autre appareil.', preferences: ex.rows[0].data, maj: actuel }); }
      const maj = Math.max(Date.now(), (actuel || 0) + 1);
      await c.query('insert into preferences_point (user_id, data, maj) values ($1, $2::jsonb, $3) on conflict (user_id) do update set data = excluded.data, maj = excluded.maj', [moi.id, JSON.stringify(p), maj]);
      await c.query('commit');
      return json(res, 200, { ok: true, maj });
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  } catch {
    return json(res, 500, { ok: false, raison: 'Votre compte est momentanément indisponible : vos préférences restent sur cet appareil.' });
  }
}

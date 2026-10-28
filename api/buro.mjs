// /api/buro : les projets du BurO de la personne connectée, rangés dans la table « spaces » (la même base que les comptes).
// GET  → ses projets (dont elle est propriétaire) et ceux qu'on lui partage.
// POST → { titre, briques, studio, intention } crée un projet ; { action: 'maj', id, archive?, visibilite? } le modifie (propriétaire seulement).
// L'identité vient toujours de la session vérifiée, jamais du corps de la requête.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import { IDS } from './_briques.mjs';

const VISIBILITES = ['prive', 'restreint', 'lien', 'public'];
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 20000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
export function nettoyerProjet(b) {
  const titre = String(b.titre || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120);
  if (!titre) return null;
  const briques = (Array.isArray(b.briques) ? b.briques : []).filter((x, i, l) => IDS.includes(x) && l.indexOf(x) === i).slice(0, 20);
  return { titre, data: { briques, studio: String(b.studio || '').slice(0, 60), intention: String(b.intention || '').slice(0, 1000), visibilite: 'prive', archive: false, source: 'point-zero' } };
}
export default async function buro(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const moi = await personne(req).catch(() => null);
  if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour ouvrir votre espace.' });
  const db = _pool();
  try {
    if (req.method === 'GET') {
      const r = await db.query(`select s.id::text as id, s.kind, s.title, s.data, s.updated_at, m.role from spaces s join space_members m on m.space_id = s.id where m.user_id = $1 order by s.updated_at desc limit 200`, [moi.id]);
      return json(res, 200, { ok: true, projets: r.rows.map(x => ({ id: x.id, genre: x.kind, titre: x.title, role: x.role, maj: x.updated_at, briques: (x.data && x.data.briques) || [], studio: (x.data && x.data.studio) || '', ouvrage: (x.data && x.data.ouvrage) || null, visibilite: (x.data && x.data.visibilite) || 'prive', archive: !!(x.data && x.data.archive) })) });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const b = await corps(req);
    if (b.action === 'maj') {
      const patch = {};
      if (typeof b.archive === 'boolean') patch.archive = b.archive;
      if (VISIBILITES.includes(b.visibilite)) patch.visibilite = b.visibilite;
      const r = await db.query(`update spaces set data = data || $3::jsonb, updated_at = now() where id::text = $1 and owner_id = $2 returning id::text as id`, [String(b.id || ''), moi.id, JSON.stringify(patch)]);
      return r.rowCount ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, raison: 'Projet introuvable, ou vous n’en êtes pas propriétaire.' });
    }
    const p = nettoyerProjet(b);
    if (!p) return json(res, 400, { ok: false, raison: 'Donnez un nom au projet.' });
    const n = await db.query(`select count(*)::int as n from spaces where owner_id = $1`, [moi.id]);
    if (n.rows[0].n >= 500) return json(res, 429, { ok: false, raison: 'Votre espace est plein (500 projets) : archivez ou supprimez-en.' });
    const c = await db.connect();
    try {
      await c.query('begin');
      const s = await c.query(`insert into spaces (kind, title, owner_id, data) values ('projet', $1, $2, $3::jsonb) returning id::text as id`, [p.titre, moi.id, JSON.stringify(p.data)]);
      await c.query(`insert into space_members (space_id, user_id, role) values ($1::uuid, $2, 'owner')`, [s.rows[0].id, moi.id]);
      await c.query('commit');
      return json(res, 201, { ok: true, id: s.rows[0].id });
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  } catch {
    return json(res, 500, { ok: false, raison: 'Votre espace est momentanément indisponible : réessayez.' });
  }
}

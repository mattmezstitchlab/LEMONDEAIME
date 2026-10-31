// /api/buro : les projets du BurO de la personne connectée, rangés dans la table « spaces » (la même base que les comptes).
// GET  → ses projets (dont elle est propriétaire) et ceux qu'on lui partage.
// POST → { titre, description?, briques, studio, intention } crée un projet ;
//        { action: 'maj', id, titre?, description?, archive?, visibilite?, rev? } le modifie (propriétaire seulement).
// « rev » : la révision que la personne a vue. Si le projet a changé depuis (autre onglet, autre appareil), la modification est refusée (409)
// et rien n'est écrasé. La révision vit dans « data » (jsonb) : aucune migration ; un projet plus ancien est à la révision 0.
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
export function nettoyerTitre(v) { return String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120); }
/* la description garde ses retours à la ligne ; les autres caractères de contrôle partent */
export function nettoyerDescription(v) { return String(v || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, 2000); }
export function nettoyerProjet(b) {
  const titre = nettoyerTitre(b.titre);
  if (!titre) return null;
  const briques = (Array.isArray(b.briques) ? b.briques : []).filter((x, i, l) => IDS.includes(x) && l.indexOf(x) === i).slice(0, 20);
  return { titre, data: { briques, studio: String(b.studio || '').slice(0, 60), intention: String(b.intention || '').slice(0, 1000), description: nettoyerDescription(b.description), rev: 0, visibilite: 'prive', archive: false, source: 'point-zero' } };
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
      return json(res, 200, { ok: true, projets: r.rows.map(x => ({ id: x.id, genre: x.kind, titre: x.title, role: x.role, maj: x.updated_at, briques: (x.data && x.data.briques) || [], studio: (x.data && x.data.studio) || '', ouvrage: (x.data && x.data.ouvrage) || null, visibilite: (x.data && x.data.visibilite) || 'prive', archive: !!(x.data && x.data.archive), description: (x.data && x.data.description) || '', rev: Number(x.data && x.data.rev) || 0, intention: (x.data && x.data.intention) || '' })) });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const b = await corps(req);
    if (b.action === 'maj') {
      const patch = {};
      if (typeof b.archive === 'boolean') patch.archive = b.archive;
      if (VISIBILITES.includes(b.visibilite)) patch.visibilite = b.visibilite;
      let titre = null;
      if (b.titre !== undefined) { titre = nettoyerTitre(b.titre); if (!titre) return json(res, 400, { ok: false, raison: 'Donnez un nom au projet.' }); }
      if (b.description !== undefined) patch.description = nettoyerDescription(b.description);
      if (titre === null && !Object.keys(patch).length) return json(res, 400, { ok: false, raison: 'Rien à modifier.' });
      const rev = b.rev === undefined || b.rev === null ? null : Number(b.rev);
      if (rev !== null && !(Number.isInteger(rev) && rev >= 0 && rev < 1e9)) return json(res, 400, { ok: false, raison: 'Révision invalide.' });
      /* la même requête vérifie l'appartenance (owner_id) et la révision, puis écrit : pas de course entre lire et écrire */
      const r = await db.query(
        `update spaces set title = coalesce($4::text, title), data = data || $3::jsonb || jsonb_build_object('rev', coalesce((data->>'rev')::int, 0) + 1), updated_at = now()
          where id::text = $1 and owner_id = $2 and ($5::int is null or coalesce((data->>'rev')::int, 0) = $5::int)
          returning id::text as id, title, updated_at, coalesce((data->>'rev')::int, 0) as rev`,
        [String(b.id || ''), moi.id, JSON.stringify(patch), titre, rev]);
      if (r.rowCount) return json(res, 200, { ok: true, id: r.rows[0].id, titre: r.rows[0].title, rev: r.rows[0].rev, maj: r.rows[0].updated_at });
      const la = await db.query(`select coalesce((data->>'rev')::int, 0) as rev from spaces where id::text = $1 and owner_id = $2`, [String(b.id || ''), moi.id]);
      return la.rowCount
        ? json(res, 409, { ok: false, conflit: true, rev: la.rows[0].rev, raison: 'Ce projet a été modifié ailleurs depuis que vous l’avez ouvert. Rien n’a été écrasé : rechargez-le pour voir la dernière version.' })
        : json(res, 404, { ok: false, raison: 'Projet introuvable, ou vous n’en êtes pas propriétaire.' });
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

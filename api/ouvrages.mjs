// /api/ouvrages : les ouvrages de l'atelier de broderie (le StudiO, sous /studio/) rangés dans le compte AIME.
// GET          → mes ouvrages (sans leur contenu) : id, nom, dossier, w, h, progression, maj.
// GET ?id=…    → le contenu d'un de mes ouvrages (le JSON de l'atelier, tel quel).
// POST         → { id, nom, dossier, w, h, progression, maj, contenu } : crée ou met à jour (le plus récent gagne).
// POST         → { action: 'supprimer', id } : le retire du compte (il reste sur l'appareil qui l'a).
// Chaque ouvrage a aussi sa ligne dans « spaces » : il apparaît dans Votre espace, comme un projet du Point Zéro.
// L'identité vient toujours de la session vérifiée, jamais du corps de la requête.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';

export const TAILLE_MAX = 3_500_000;
const PAR_COMPTE = 500;
const TABLE = `create table if not exists ouvrages (
  user_id text not null, id text not null, nom text not null, dossier text not null default '',
  w integer not null, h integer not null, progression real not null default 0, maj bigint not null,
  contenu text not null, space_id uuid, cree_le timestamptz not null default now(),
  primary key (user_id, id))`;
let pretTable = null;
const table = db => (pretTable = pretTable || db.query(TABLE).catch(e => { pretTable = null; throw e; }));

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > TAILLE_MAX + 4000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const ligne = (v, n) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
/* Ce qu'on accepte d'un ouvrage : un identifiant simple, des dimensions de grille, un contenu JSON lisible. */
export function nettoyerOuvrage(b) {
  const id = String(b.id || '');
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return { raison: 'Identifiant d’ouvrage invalide.' };
  const w = Math.trunc(Number(b.w)), h = Math.trunc(Number(b.h)), maj = Math.trunc(Number(b.maj));
  if (!(w >= 1 && w <= 1000 && h >= 1 && h <= 1000)) return { raison: 'Dimensions de grille invalides.' };
  if (!(maj > 1.5e12 && maj < 1e13)) return { raison: 'Date de modification invalide.' };
  if (typeof b.contenu !== 'string' || !b.contenu) return { raison: 'Ouvrage vide.' };
  if (b.contenu.length > TAILLE_MAX) return { raison: 'Ouvrage trop lourd pour votre espace (plus de 3,5 Mo) : il reste sur l’appareil.', code: 413 };
  try { const o = JSON.parse(b.contenu); if (!o || typeof o !== 'object' || Array.isArray(o)) throw 0; } catch { return { raison: 'Contenu d’ouvrage illisible.' }; }
  const p = Number(b.progression);
  return { ouvrage: { id, nom: ligne(b.nom, 120) || 'Ouvrage sans nom', dossier: ligne(b.dossier, 60), w, h, maj, progression: Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0, contenu: b.contenu } };
}

export default async function ouvrages(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const moi = await personne(req).catch(() => null);
  if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour ranger vos ouvrages dans votre espace.' });
  const db = _pool();
  try {
    await table(db);
    if (req.method === 'GET') {
      const id = (/[?&]id=([A-Za-z0-9_-]{4,64})(?:&|$)/.exec(req.url || '') || [])[1];
      if (id) {
        const r = await db.query(`select contenu, maj from ouvrages where user_id = $1 and id = $2`, [moi.id, id]);
        return r.rows[0] ? json(res, 200, { ok: true, contenu: r.rows[0].contenu, maj: Number(r.rows[0].maj) }) : json(res, 404, { ok: false, raison: 'Ouvrage introuvable dans votre espace.' });
      }
      const r = await db.query(`select id, nom, dossier, w, h, progression, maj from ouvrages where user_id = $1 order by maj desc limit ${PAR_COMPTE}`, [moi.id]);
      return json(res, 200, { ok: true, ouvrages: r.rows.map(x => ({ ...x, maj: Number(x.maj) })) });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const b = await corps(req);
    if (b.action === 'supprimer') {
      const id = String(b.id || '');
      const r = await db.query(`delete from ouvrages where user_id = $1 and id = $2 returning space_id`, [moi.id, id]);
      const sid = r.rows[0] && r.rows[0].space_id;
      if (sid) await db.query(`delete from spaces where id = $1 and owner_id = $2`, [sid, moi.id]);   /* ses membres partent avec (clé étrangère) ou restent orphelins sans effet */
      return json(res, 200, { ok: true });
    }
    const { ouvrage: o, raison, code } = nettoyerOuvrage(b);
    if (!o) return json(res, code || 400, { ok: false, raison });
    const c = await db.connect();
    try {
      await c.query('begin');
      const ex = await c.query(`select maj, space_id from ouvrages where user_id = $1 and id = $2 for update`, [moi.id, o.id]);
      if (ex.rows[0] && Number(ex.rows[0].maj) > o.maj) { await c.query('rollback'); return json(res, 409, { ok: false, raison: 'Une version plus récente est déjà dans votre espace.' }); }
      if (!ex.rows[0]) {
        const n = await c.query(`select count(*)::int as n from ouvrages where user_id = $1`, [moi.id]);
        if (n.rows[0].n >= PAR_COMPTE) { await c.query('rollback'); return json(res, 429, { ok: false, raison: 'Votre espace est plein (500 ouvrages).' }); }
      }
      let sid = ex.rows[0] && ex.rows[0].space_id;
      const data = { studio: 'Brode Way', ouvrage: o.id, briques: ['grille', 'palette', 'atelier'], w: o.w, h: o.h, progression: o.progression, source: 'studio' };
      if (sid) {
        const u = await c.query(`update spaces set title = $3, data = data || $4::jsonb, updated_at = now() where id = $1 and owner_id = $2 returning id`, [sid, moi.id, o.nom, JSON.stringify(data)]);
        if (!u.rowCount) sid = null;
      }
      if (!sid) {
        const s = await c.query(`insert into spaces (kind, title, owner_id, data) values ('atelier', $1, $2, $3::jsonb) returning id`, [o.nom, moi.id, JSON.stringify({ ...data, visibilite: 'prive', archive: false })]);
        sid = s.rows[0].id;
        await c.query(`insert into space_members (space_id, user_id, role) values ($1, $2, 'owner')`, [sid, moi.id]);
      }
      await c.query(`insert into ouvrages (user_id, id, nom, dossier, w, h, progression, maj, contenu, space_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        on conflict (user_id, id) do update set nom = excluded.nom, dossier = excluded.dossier, w = excluded.w, h = excluded.h, progression = excluded.progression, maj = excluded.maj, contenu = excluded.contenu, space_id = excluded.space_id`,
      [moi.id, o.id, o.nom, o.dossier, o.w, o.h, o.progression, o.maj, o.contenu, sid]);
      await c.query('commit');
      return json(res, 200, { ok: true });
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  } catch {
    return json(res, 500, { ok: false, raison: 'Votre espace est momentanément indisponible : l’ouvrage reste sur l’appareil.' });
  }
}

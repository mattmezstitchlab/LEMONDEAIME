// /api/buro : les projets du BurO de la personne connectée, rangés dans la table « spaces » (la même base que les comptes).
// GET  → ses projets (dont elle est propriétaire) et ceux qu'on lui partage.
// POST → { titre, briques, studio, intention } crée un projet ; { action: 'maj', id, archive?, visibilite? } le modifie (propriétaire seulement).
// Une union : la forme canonique d'AIMESTUDIO, kind = 'evenement' et data.modele = 'mariage', ses informations dans data.union.
//   { action: 'union', union?, briques?, intention? } range l'union de la personne : une seule (si elle en a déjà une, on la rend) ;
//   { action: 'union-maj', id, union } modifie prénoms, date officielle, lieu et choix du programme (propriétaire seulement).
//   Ni invitation, ni partage public d'une union à cette étape.
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
const LIGNE = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
export function dateOk(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [a, m, j] = v.split('-').map(Number), d = new Date(Date.UTC(a, m - 1, j));
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j && a >= 1900 && a <= 2200;
}
const ID_MOMENT = /^[a-z0-9-]{1,60}$/, HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
/* Ce qu'on accepte des informations d'une union : seulement les champs envoyés (une modification partielle n'efface rien).
   null si une valeur est invalide. */
export function nettoyerUnion(u) {
  if (!u || typeof u !== 'object' || Array.isArray(u)) return {};
  const o = {};
  for (const k of ['a', 'b']) if (k in u) o[k] = LIGNE(u[k], 60);
  if ('lieu' in u) o.lieu = LIGNE(u.lieu, 120);
  if ('date' in u) { const d = LIGNE(u.date, 10); if (d && !dateOk(d)) return null; o.date = d; }
  if ('programme' in u) {
    const p = u.programme;
    if (p === null) o.programme = null;
    else {
      if (!p || typeof p !== 'object') return null;
      const ms = p.moments == null ? null : Array.isArray(p.moments) ? [...new Set(p.moments.filter(x => typeof x === 'string' && ID_MOMENT.test(x)))].slice(0, 400) : undefined;
      if (ms === undefined) return null;
      const h = {}; for (const [k, v] of Object.entries(p.horaires && typeof p.horaires === 'object' ? p.horaires : {}).slice(0, 400)) if (ID_MOMENT.test(k) && HEURE.test(String(v))) h[k] = String(v);
      o.programme = { moments: ms, horaires: h };
    }
  }
  return o;
}
/* l'union telle qu'on la rend : toujours les mêmes champs, vides pour un mariage encore incomplet */
export function unionLue(data) {
  if (!data || data.modele !== 'mariage') return null;
  const u = data.union && typeof data.union === 'object' ? data.union : {};
  return { a: u.a || '', b: u.b || '', date: u.date || '', lieu: u.lieu || '', programme: u.programme || null };
}
const EST_UNION = `kind = 'evenement' and data->>'modele' = 'mariage'`;
const ORIGINE_UNION = 'lemondeaime-union';   /* l'index unique (propriétaire, origine) d'AIMESTUDIO empêche deux créations simultanées */

export default async function buro(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const moi = await personne(req).catch(() => null);
  if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour ouvrir votre espace.' });
  const db = _pool();
  try {
    if (req.method === 'GET') {
      const r = await db.query(`select s.id::text as id, s.kind, s.title, s.data, s.updated_at, m.role from spaces s join space_members m on m.space_id = s.id where m.user_id = $1 order by s.updated_at desc limit 200`, [moi.id]);
      return json(res, 200, { ok: true, projets: r.rows.map(x => ({ id: x.id, genre: x.kind, titre: x.title, role: x.role, maj: x.updated_at, briques: (x.data && x.data.briques) || [], studio: (x.data && x.data.studio) || '', ouvrage: (x.data && x.data.ouvrage) || null, visibilite: (x.data && x.data.visibilite) || 'prive', archive: !!(x.data && x.data.archive), union: x.kind === 'evenement' ? unionLue(x.data) : null })) });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const b = await corps(req);
    if (b.action === 'maj') {
      const patch = {};
      if (typeof b.archive === 'boolean') patch.archive = b.archive;
      if (VISIBILITES.includes(b.visibilite)) patch.visibilite = b.visibilite;
      /* une union reste privée à cette étape : on ne change pas sa visibilité */
      const r = await db.query(`update spaces set data = data || $3::jsonb, updated_at = now() where id::text = $1 and owner_id = $2${'visibilite' in patch ? ` and not (${EST_UNION})` : ''} returning id::text as id`, [String(b.id || ''), moi.id, JSON.stringify(patch)]);
      return r.rowCount ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, raison: 'Projet introuvable, ou vous n’en êtes pas propriétaire.' });
    }
    if (b.action === 'union-maj') {
      const u = nettoyerUnion(b.union);
      if (u === null) return json(res, 400, { ok: false, raison: 'Une information de l’union n’est pas valide (la date s’écrit AAAA-MM-JJ).' });
      const r = await db.query(`update spaces set data = jsonb_set(data, '{union}', coalesce(data->'union', '{}'::jsonb) || $3::jsonb), updated_at = now() where id::text = $1 and owner_id = $2 and ${EST_UNION} returning id::text as id`, [String(b.id || ''), moi.id, JSON.stringify(u)]);
      return r.rowCount ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, raison: 'Union introuvable, ou vous n’en êtes pas propriétaire.' });
    }
    if (b.action === 'union') {
      const u = nettoyerUnion(b.union);
      if (u === null) return json(res, 400, { ok: false, raison: 'Une information de l’union n’est pas valide (la date s’écrit AAAA-MM-JJ).' });
      const briques = (Array.isArray(b.briques) ? b.briques : []).filter((x, i, l) => IDS.includes(x) && l.indexOf(x) === i).slice(0, 20);
      const deja = () => db.query(`select id::text as id from spaces where owner_id = $1 and ${EST_UNION} order by created_at limit 1`, [moi.id]);
      const ex = await deja();
      if (ex.rows[0]) return json(res, 200, { ok: true, id: ex.rows[0].id, existant: true });
      const titre = u.a && u.b ? u.a + ' & ' + u.b : 'Notre union';
      const data = { modele: 'mariage', origine: ORIGINE_UNION, union: { a: '', b: '', date: '', lieu: '', programme: null, ...u }, briques, studio: 'AIME Wedding', intention: LIGNE(b.intention, 1000), visibilite: 'prive', archive: false, source: 'point-zero' };
      const c = await db.connect();
      try {
        await c.query('begin');
        const s = await c.query(`insert into spaces (kind, title, owner_id, data) values ('evenement', $1, $2, $3::jsonb) returning id::text as id`, [titre, moi.id, JSON.stringify(data)]);
        await c.query(`insert into space_members (space_id, user_id, role) values ($1::uuid, $2, 'owner')`, [s.rows[0].id, moi.id]);
        await c.query('commit');
        return json(res, 201, { ok: true, id: s.rows[0].id, existant: false });
      } catch (e) {
        await c.query('rollback').catch(() => {});
        if (e && e.code === '23505') { const r = await deja(); if (r.rows[0]) return json(res, 200, { ok: true, id: r.rows[0].id, existant: true }); }   /* deux envois en même temps : l'index a tranché */
        throw e;
      } finally { c.release(); }
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

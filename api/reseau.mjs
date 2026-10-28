// /api/reseau : le Réseau du Monde AIME, des profils que chacun choisit de montrer (ou non).
// GET                 → les profils visibles (jamais d'adresse e-mail ni d'identifiant de compte : une référence publique).
//   &date=AAAA-MM-JJ  → avec, pour chacun, son état ce jour-là (libre, option, prise) s'il l'a indiqué.
// GET ?ref=…          → un profil visible, avec les briques de ses projets publics (son module) ; &date=… → son état ce jour-là.
// GET ?photo=…        → la photo de son compte (l'image elle-même), seulement si le profil est visible.
// GET ?moi=1          → mon profil (connecté·e), même s'il est caché, avec mes dates, les demandes reçues et les questions sans réponse.
// POST                → { nom, domaine, metier, ville, bio, site, zone, langues, tarif, prestations, liens, visible } : mon profil.
// POST { action: 'dates', jours: { 'AAAA-MM-JJ': 'libre' | 'option' | 'prise' | null } } → mes dates.
// POST { action: 'demande', ref, jour?, lieu?, invites?, message } → une demande à quelqu'un (connecté·e : il voit mon nom et mon e-mail pour répondre).
// POST { action: 'demande-lue', id } → je marque une demande reçue comme lue.
// L'identité vient toujours de la session vérifiée ; par défaut, un profil est caché.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import Q from './_auth/quotas.cjs';

import { IDS } from './_briques.mjs';
/* le filtre universel : des domaines larges (les mêmes que src/lib/reseau-exemples.ts) */
export const DOMAINES = ['mariage', 'broderie', 'evenement', 'formation', 'numerique', 'commerce'];
export const ETATS = ['libre', 'option', 'prise'];
const TABLE = `create table if not exists profils (
  user_id text primary key, nom text not null, metier text not null, ville text not null default '',
  bio text not null default '', site text not null default '', visible boolean not null default false,
  cree_le timestamptz not null default now(), maj_le timestamptz not null default now());
  alter table profils add column if not exists domaine text not null default 'mariage';
  alter table profils add column if not exists ref text unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  alter table profils add column if not exists zone text not null default '';
  alter table profils add column if not exists langues text not null default '';
  alter table profils add column if not exists tarif text not null default '';
  alter table profils add column if not exists prestations jsonb not null default '[]'::jsonb;
  alter table profils add column if not exists liens jsonb not null default '[]'::jsonb;
  create table if not exists reseau_dates (user_id text not null, jour date not null, etat text not null check (etat in ('libre','option','prise')), primary key (user_id, jour));
  create table if not exists reseau_demandes (id bigserial primary key, a_user text not null, de_user text not null, de_nom text not null default '', de_email text not null default '',
    jour date, lieu text not null default '', invites integer, message text not null, lue boolean not null default false, cree_le timestamptz not null default now());
  create index if not exists reseau_demandes_a on reseau_demandes (a_user, cree_le desc);
  create table if not exists reseau_questions (id bigserial primary key, user_id text not null, question text not null, cree_le timestamptz not null default now());
  create index if not exists reseau_questions_u on reseau_questions (user_id, cree_le desc)`;
let pretTable = null;
export const table = db => (pretTable = pretTable || db.query(TABLE).catch(e => { pretTable = null; throw e; }));

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 20000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const ligne = (v, n) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const texte = (v, n) => String(v || '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);
function adresse(v) {
  let s = ligne(v, 200); if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  try { const u = new URL(s); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null; return u.toString(); } catch { return null; }
}
export function nettoyerProfil(b) {
  const nom = ligne(b.nom, 60);
  if (!nom) return { raison: 'Indiquez le nom à afficher.' };
  if (!DOMAINES.includes(b.domaine)) return { raison: 'Choisissez votre domaine.' };
  const metier = ligne(b.metier, 40);
  if (!metier) return { raison: 'Dites ce que vous faites, en un ou deux mots.' };
  const site = adresse(b.site);
  if (site === null) return { raison: 'Cette adresse de site ne semble pas valide.' };
  const liens = [];
  for (const l of (Array.isArray(b.liens) ? b.liens : []).slice(0, 4)) { const a = adresse(l); if (a === null) return { raison: 'Un de vos liens ne semble pas valide.' }; if (a) liens.push(a); }
  const prestations = (Array.isArray(b.prestations) ? b.prestations : []).slice(0, 8)
    .map(p => ({ titre: ligne(p && p.titre, 60), texte: ligne(p && p.texte, 160) })).filter(p => p.titre);
  return { profil: { nom, domaine: b.domaine, metier, ville: ligne(b.ville, 60), bio: texte(b.bio, 400), site,
    zone: ligne(b.zone, 80), langues: ligne(b.langues, 60), tarif: ligne(b.tarif, 80), prestations, liens, visible: b.visible === true } };
}
export const jourOk = j => typeof j === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j) && !isNaN(Date.parse(j + 'T00:00:00Z')) && new Date(j + 'T00:00:00Z').toISOString().slice(0, 10) === j;
export function nettoyerDemande(b) {
  const message = texte(b.message, 1000);
  if (message.length < 5) return { raison: 'Écrivez quelques mots : votre projet, ce que vous attendez.' };
  const jour = b.jour ? (jourOk(b.jour) ? b.jour : null) : '';
  if (jour === null) return { raison: 'Cette date ne semble pas valide.' };
  const n = b.invites === '' || b.invites == null ? null : Math.round(Number(b.invites));
  if (n !== null && !(n > 0 && n < 100000)) return { raison: 'Le nombre d’invités ne semble pas valide.' };
  return { demande: { jour: jour || null, lieu: ligne(b.lieu, 120), invites: n, message } };
}
const PUBLIC = p => ({ ref: p.ref, nom: p.nom, domaine: p.domaine, metier: p.metier, ville: p.ville, bio: p.bio, site: p.site,
  zone: p.zone || '', langues: p.langues || '', tarif: p.tarif || '', prestations: p.prestations || [], liens: p.liens || [], photo: !!p.a_photo, ...(p.etat !== undefined ? { etat: p.etat } : {}) });
const COLS = `p.user_id, p.ref, p.nom, p.domaine, p.metier, p.ville, p.bio, p.site, p.zone, p.langues, p.tarif, p.prestations, p.liens, (u.image is not null and u.image <> '') as a_photo`;
const JOINT = `profils p left join "user" u on u.id = p.user_id`;
const param = (url, k, re) => (new RegExp('[?&]' + k + '=(' + re + ')(?:&|$)').exec(url || '') || [])[1];

export default async function reseau(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Le Réseau n’est pas encore ouvert sur cet environnement.' });
  const db = _pool();
  try {
    await table(db);
    const url = req.url || '';
    const moiDemande = req.method === 'POST' || /[?&]moi=1\b/.test(url);
    if (req.method === 'GET' && !moiDemande) {
      const photo = param(url, 'photo', '[a-f0-9]{12}');
      if (photo) {
        const r = await db.query(`select u.image from ${JOINT} where p.visible and p.ref = $1`, [photo]);
        const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/]+=*)$/.exec((r.rows[0] && r.rows[0].image) || '');
        if (!m) { res.statusCode = 404; return res.end(); }
        res.statusCode = 200; res.setHeader('Content-Type', m[1]); res.setHeader('Cache-Control', 'public, max-age=300'); res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.end(Buffer.from(m[2], 'base64'));
      }
      const date = param(url, 'date', '\\d{4}-\\d{2}-\\d{2}'), jour = jourOk(date) ? date : null;
      const etat = jour ? `, (select etat from reseau_dates d where d.user_id = p.user_id and d.jour = $2) as etat` : '';
      const ref = param(url, 'ref', '[a-f0-9]{12}');
      if (ref) {
        const r = await db.query(`select ${COLS}${etat} from ${JOINT} where p.visible and p.ref = $1`, jour ? [ref, jour] : [ref]);
        if (!r.rows[0]) return json(res, 404, { ok: false, raison: 'Ce profil n’existe pas ou n’est plus visible.' });
        /* son module : les briques de ses projets publics, et leurs noms (jamais les projets privés) */
        const p = await db.query(`select title, data from spaces where owner_id = $1 and coalesce(data->>'visibilite','prive') = 'public' and coalesce((data->>'archive')::boolean, false) = false order by updated_at desc limit 50`, [r.rows[0].user_id]);
        const projets = p.rows.map(x => ({ titre: x.title, briques: ((x.data && x.data.briques) || []).filter(b => IDS.includes(b)) }));
        return json(res, 200, { ok: true, profil: PUBLIC(r.rows[0]), projets });
      }
      const r = await db.query(`select ${COLS}${etat.replace('$2', '$1')} from ${JOINT} where p.visible order by p.maj_le desc limit 300`, jour ? [jour] : []);
      return json(res, 200, { ok: true, domaines: DOMAINES, profils: r.rows.map(PUBLIC) });
    }
    const moi = await personne(req).catch(() => null);
    if (!moi) return json(res, 401, { ok: false, raison: req.method === 'POST' ? 'Entrez dans AIME pour continuer.' : 'Entrez dans AIME pour créer votre profil.' });
    if (req.method === 'GET') {
      const [r, d, dm, qs] = await Promise.all([
        db.query(`select ${COLS}, p.visible from ${JOINT} where p.user_id = $1`, [moi.id]),
        db.query(`select to_char(jour, 'YYYY-MM-DD') as jour, etat from reseau_dates where user_id = $1 and jour >= current_date - 1 order by jour limit 800`, [moi.id]),
        db.query(`select id, de_nom, de_email, to_char(jour, 'YYYY-MM-DD') as jour, lieu, invites, message, lue, cree_le from reseau_demandes where a_user = $1 order by cree_le desc limit 100`, [moi.id]),
        db.query(`select question, cree_le from reseau_questions where user_id = $1 order by cree_le desc limit 30`, [moi.id]),
      ]);
      const p = r.rows[0];
      return json(res, 200, { ok: true, domaines: DOMAINES, profil: p ? { ...PUBLIC(p), visible: p.visible } : null, suggestion: { nom: ligne(moi.nom, 60) },
        dates: Object.fromEntries(d.rows.map(x => [x.jour, x.etat])), demandes: dm.rows.map(x => ({ ...x, id: String(x.id) })), questions: qs.rows });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const b = await corps(req);
    if (b.action === 'dates') {
      const jours = b.jours && typeof b.jours === 'object' ? Object.entries(b.jours).slice(0, 400) : [];
      if (jours.some(([j, e]) => !jourOk(j) || (e !== null && !ETATS.includes(e)))) return json(res, 400, { ok: false, raison: 'Une date ou un état ne semble pas valide.' });
      for (const [j, e] of jours) {
        if (e === null) await db.query(`delete from reseau_dates where user_id = $1 and jour = $2`, [moi.id, j]);
        else await db.query(`insert into reseau_dates (user_id, jour, etat) values ($1,$2,$3) on conflict (user_id, jour) do update set etat = excluded.etat`, [moi.id, j, e]);
      }
      return json(res, 200, { ok: true });
    }
    if (b.action === 'demande') {
      const ref = typeof b.ref === 'string' && /^[a-f0-9]{12}$/.test(b.ref) ? b.ref : null;
      const { demande: dm, raison } = nettoyerDemande(b);
      if (!ref || !dm) return json(res, 400, { ok: false, raison: raison || 'Profil inconnu.' });
      const a = await db.query(`select user_id from profils where visible and ref = $1`, [ref]);
      if (!a.rows[0]) return json(res, 404, { ok: false, raison: 'Ce profil n’existe pas ou n’est plus visible.' });
      if (a.rows[0].user_id === moi.id) return json(res, 400, { ok: false, raison: 'C’est votre propre profil.' });
      const q = await Q.quota('demande:personne', moi.id, { db });
      if (!q.ok) { res.setHeader('Retry-After', String(q.attente)); return json(res, 429, { ok: false, raison: 'Beaucoup de demandes envoyées à la suite : réessayez dans un moment.' }); }
      await db.query(`insert into reseau_demandes (a_user, de_user, de_nom, de_email, jour, lieu, invites, message) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [a.rows[0].user_id, moi.id, ligne(moi.nom, 80), ligne(moi.email, 200), dm.jour, dm.lieu, dm.invites, dm.message]);
      return json(res, 200, { ok: true });
    }
    if (b.action === 'demande-lue') {
      const id = /^\d{1,18}$/.test(String(b.id || '')) ? String(b.id) : null;
      if (!id) return json(res, 400, { ok: false });
      await db.query(`update reseau_demandes set lue = true where id = $1 and a_user = $2`, [id, moi.id]);
      return json(res, 200, { ok: true });
    }
    const { profil: p, raison } = nettoyerProfil(b);
    if (!p) return json(res, 400, { ok: false, raison });
    const e = await db.query(`insert into profils (user_id, nom, domaine, metier, ville, bio, site, visible, zone, langues, tarif, prestations, liens) values ($1,$2,$8,$3,$4,$5,$6,$7,$9,$10,$11,$12::jsonb,$13::jsonb)
      on conflict (user_id) do update set nom = excluded.nom, domaine = excluded.domaine, metier = excluded.metier, ville = excluded.ville, bio = excluded.bio, site = excluded.site, visible = excluded.visible,
        zone = excluded.zone, langues = excluded.langues, tarif = excluded.tarif, prestations = excluded.prestations, liens = excluded.liens, maj_le = now() returning ref`,
    [moi.id, p.nom, p.metier, p.ville, p.bio, p.site, p.visible, p.domaine, p.zone, p.langues, p.tarif, JSON.stringify(p.prestations), JSON.stringify(p.liens)]);
    return json(res, 200, { ok: true, profil: { ...p, ref: e.rows[0] && e.rows[0].ref } });
  } catch {
    return json(res, 500, { ok: false, raison: 'Le Réseau est momentanément indisponible : réessayez.' });
  }
}

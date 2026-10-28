// /api/reseau : le Réseau du Monde AIME, des profils que chacun choisit de montrer (ou non).
// GET          → les profils visibles (jamais d'adresse e-mail ni d'identifiant de compte : une référence publique).
// GET ?ref=…   → un profil visible, avec les briques de ses projets publics (son module).
// GET ?moi=1   → mon profil (connecté·e), même s'il est caché.
// POST         → { nom, domaine, metier, ville, bio, site, visible } : crée ou modifie mon profil.
// L'identité vient toujours de la session vérifiée ; par défaut, un profil est caché.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';

import { IDS } from './_briques.mjs';
/* le filtre universel : des domaines larges (les mêmes que src/lib/reseau-exemples.ts) */
export const DOMAINES = ['mariage', 'broderie', 'evenement', 'formation', 'numerique', 'commerce'];
const TABLE = `create table if not exists profils (
  user_id text primary key, nom text not null, metier text not null, ville text not null default '',
  bio text not null default '', site text not null default '', visible boolean not null default false,
  cree_le timestamptz not null default now(), maj_le timestamptz not null default now());
  alter table profils add column if not exists domaine text not null default 'mariage';
  alter table profils add column if not exists ref text unique default substr(md5(random()::text || clock_timestamp()::text), 1, 12)`;
let pretTable = null;
const table = db => (pretTable = pretTable || db.query(TABLE).catch(e => { pretTable = null; throw e; }));

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 10000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const ligne = (v, n) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
export function nettoyerProfil(b) {
  const nom = ligne(b.nom, 60);
  if (!nom) return { raison: 'Indiquez le nom à afficher.' };
  if (!DOMAINES.includes(b.domaine)) return { raison: 'Choisissez votre domaine.' };
  const metier = ligne(b.metier, 40);
  if (!metier) return { raison: 'Dites ce que vous faites, en un ou deux mots.' };
  const bio = String(b.bio || '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 400);
  let site = ligne(b.site, 200);
  if (site && !/^https?:\/\//i.test(site)) site = 'https://' + site;
  if (site) { try { const u = new URL(site); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return { raison: 'Cette adresse de site ne semble pas valide.' }; site = u.toString(); } catch { return { raison: 'Cette adresse de site ne semble pas valide.' }; } }
  return { profil: { nom, domaine: b.domaine, metier, ville: ligne(b.ville, 60), bio, site, visible: b.visible === true } };
}
const PUBLIC = p => ({ ref: p.ref, nom: p.nom, domaine: p.domaine, metier: p.metier, ville: p.ville, bio: p.bio, site: p.site });

export default async function reseau(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Le Réseau n’est pas encore ouvert sur cet environnement.' });
  const db = _pool();
  try {
    await table(db);
    const moiDemande = req.method === 'POST' || /[?&]moi=1\b/.test(req.url || '');
    if (req.method === 'GET' && !moiDemande) {
      const ref = (/[?&]ref=([a-f0-9]{12})\b/.exec(req.url || '') || [])[1];
      if (ref) {
        const r = await db.query(`select user_id, ref, nom, domaine, metier, ville, bio, site from profils where visible and ref = $1`, [ref]);
        if (!r.rows[0]) return json(res, 404, { ok: false, raison: 'Ce profil n’existe pas ou n’est plus visible.' });
        /* son module : les briques de ses projets publics, et leurs noms (jamais les projets privés) */
        const p = await db.query(`select title, data from spaces where owner_id = $1 and coalesce(data->>'visibilite','prive') = 'public' and coalesce((data->>'archive')::boolean, false) = false order by updated_at desc limit 50`, [r.rows[0].user_id]);
        const projets = p.rows.map(x => ({ titre: x.title, briques: ((x.data && x.data.briques) || []).filter(b => IDS.includes(b)) }));
        return json(res, 200, { ok: true, profil: PUBLIC(r.rows[0]), projets });
      }
      const r = await db.query(`select ref, nom, domaine, metier, ville, bio, site from profils where visible order by maj_le desc limit 300`);
      return json(res, 200, { ok: true, domaines: DOMAINES, profils: r.rows.map(PUBLIC) });
    }
    const moi = await personne(req).catch(() => null);
    if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour créer votre profil.' });
    if (req.method === 'GET') {
      const r = await db.query(`select ref, nom, domaine, metier, ville, bio, site, visible from profils where user_id = $1`, [moi.id]);
      return json(res, 200, { ok: true, domaines: DOMAINES, profil: r.rows[0] || null, suggestion: { nom: ligne(moi.nom, 60) } });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const { profil: p, raison } = nettoyerProfil(await corps(req));
    if (!p) return json(res, 400, { ok: false, raison });
    const e = await db.query(`insert into profils (user_id, nom, domaine, metier, ville, bio, site, visible) values ($1,$2,$8,$3,$4,$5,$6,$7)
      on conflict (user_id) do update set nom = excluded.nom, domaine = excluded.domaine, metier = excluded.metier, ville = excluded.ville, bio = excluded.bio, site = excluded.site, visible = excluded.visible, maj_le = now() returning ref`,
    [moi.id, p.nom, p.metier, p.ville, p.bio, p.site, p.visible, p.domaine]);
    return json(res, 200, { ok: true, profil: { ...p, ref: e.rows[0] && e.rows[0].ref } });
  } catch {
    return json(res, 500, { ok: false, raison: 'Le Réseau est momentanément indisponible : réessayez.' });
  }
}

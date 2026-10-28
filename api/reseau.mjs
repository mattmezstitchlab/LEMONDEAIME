// /api/reseau : le Réseau du Monde AIME, des profils que chacun choisit de montrer (ou non).
// GET          → les profils visibles (jamais d'adresse e-mail ni d'identifiant de compte).
// GET ?moi=1   → mon profil (connecté·e), même s'il est caché.
// POST         → { nom, metier, ville, bio, site, visible } : crée ou modifie mon profil.
// L'identité vient toujours de la session vérifiée ; par défaut, un profil est caché.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';

export const METIERS = ['Particulier', 'Prestataire de l’union', 'Brodeuse · brodeur', 'Créatrice · créateur', 'Studio', 'Association'];
const TABLE = `create table if not exists profils (
  user_id text primary key, nom text not null, metier text not null, ville text not null default '',
  bio text not null default '', site text not null default '', visible boolean not null default false,
  cree_le timestamptz not null default now(), maj_le timestamptz not null default now())`;
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
  if (!METIERS.includes(b.metier)) return { raison: 'Choisissez ce que vous faites.' };
  const bio = String(b.bio || '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 400);
  let site = ligne(b.site, 200);
  if (site && !/^https?:\/\//i.test(site)) site = 'https://' + site;
  if (site) { try { const u = new URL(site); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return { raison: 'Cette adresse de site ne semble pas valide.' }; site = u.toString(); } catch { return { raison: 'Cette adresse de site ne semble pas valide.' }; } }
  return { profil: { nom, metier: b.metier, ville: ligne(b.ville, 60), bio, site, visible: b.visible === true } };
}
const PUBLIC = p => ({ nom: p.nom, metier: p.metier, ville: p.ville, bio: p.bio, site: p.site });

export default async function reseau(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Le Réseau n’est pas encore ouvert sur cet environnement.' });
  const db = _pool();
  try {
    await table(db);
    const moiDemande = req.method === 'POST' || /[?&]moi=1\b/.test(req.url || '');
    if (req.method === 'GET' && !moiDemande) {
      const r = await db.query(`select nom, metier, ville, bio, site from profils where visible order by maj_le desc limit 300`);
      return json(res, 200, { ok: true, metiers: METIERS, profils: r.rows.map(PUBLIC) });
    }
    const moi = await personne(req).catch(() => null);
    if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour créer votre profil.' });
    if (req.method === 'GET') {
      const r = await db.query(`select nom, metier, ville, bio, site, visible from profils where user_id = $1`, [moi.id]);
      return json(res, 200, { ok: true, metiers: METIERS, profil: r.rows[0] || null, suggestion: { nom: ligne(moi.nom, 60) } });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const { profil: p, raison } = nettoyerProfil(await corps(req));
    if (!p) return json(res, 400, { ok: false, raison });
    await db.query(`insert into profils (user_id, nom, metier, ville, bio, site, visible) values ($1,$2,$3,$4,$5,$6,$7)
      on conflict (user_id) do update set nom = excluded.nom, metier = excluded.metier, ville = excluded.ville, bio = excluded.bio, site = excluded.site, visible = excluded.visible, maj_le = now()`,
    [moi.id, p.nom, p.metier, p.ville, p.bio, p.site, p.visible]);
    return json(res, 200, { ok: true, profil: p });
  } catch {
    return json(res, 500, { ok: false, raison: 'Le Réseau est momentanément indisponible : réessayez.' });
  }
}

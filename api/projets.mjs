// /api/projets : les projets présentés par LE MONDE AIME (le portfolio), et leur administration.
// GET                 → les projets publiés, dans l'ordre (public).
// GET ?slug=…         → un projet publié (l'administration voit aussi ses brouillons).
// GET ?moi=1          → { admin } : la personne connectée peut-elle administrer ?
// GET ?admin=1        → tous les projets, brouillons compris (administration seulement).
// POST { action: 'enregistrer', projet, ancien? } | { action: 'supprimer', slug } | { action: 'ordre', slugs }   (administration)
// POST ?envoi=1       → envoyer une image (couverture, galerie) dans le stockage Vercel Blob, depuis le navigateur (administration).
// L'administration : les adresses listées dans AIME_ADMIN, vérifiées sur la session (jamais sur le corps). Sans AIME_ADMIN : fermée.
// Sans la table (migration 2026-10-28-02 pas encore appliquée) : le public voit les deux projets d'origine, l'administration est refusée (503).
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import { handleUpload } from '@vercel/blob/client';
import { DEFAUTS, LIMITES, estAdmin, nettoyerProjet, publics, slugOk } from './_projets.mjs';

export const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const TAILLE_IMAGE = 8 * 1024 * 1024;

function json(res, code, o, cache) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', cache || 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 60000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const param = (url, k) => { try { return new URL(url || '/', 'http://x').searchParams.get(k); } catch { return null; } };
const ligneVersProjet = r => ({ ...r.data, slug: r.slug, publie: r.publie, ordre: r.ordre, maj: r.maj });
const absente = e => e && (e.code === '42P01' || /relation "projets" does not exist/.test(String(e.message)));

/* tous les projets : ceux de la table, ou ceux d'origine si la table n'existe pas encore (ou ne répond pas) */
async function lire(db) {
  if (!db) return { projets: DEFAUTS.map(p => ({ ...p })), source: 'origine' };
  try {
    const r = await db.query('select slug, data, publie, ordre, maj from projets order by ordre, slug');
    return { projets: r.rows.map(ligneVersProjet), source: 'base' };
  } catch (e) {
    return { projets: DEFAUTS.map(p => ({ ...p })), source: 'origine', table: !absente(e) };
  }
}

/* Le cœur, testable : db (pool pg ou null), moi() (la personne de la session, ou null), admins (la liste AIME_ADMIN). */
export async function traiter(req, res, { db, moi, admins, envoi }) {
  const url = req.url || '';
  if (req.method === 'POST' && param(url, 'envoi') && req.headers['x-vercel-signature']) {
    /* le retour de Vercel Blob après un envoi : signé par Vercel, vérifié par handleUpload ; rien à enregistrer ici */
    try { await envoi({ body: await corps(req), request: req, onBeforeGenerateToken: async () => { throw new Error('non'); }, onUploadCompleted: async () => {} }); return json(res, 200, { ok: true }); }
    catch { return json(res, 400, { ok: false }); }
  }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);

  if (req.method === 'GET') {
    if (param(url, 'moi')) { const m = await moi(); return json(res, 200, { ok: true, admin: !!m && estAdmin(m.email, admins) }); }
    const admin = param(url, 'admin') || param(url, 'slug') ? await moi().then(m => !!m && estAdmin(m.email, admins)) : false;
    const { projets, source } = await lire(db);
    if (param(url, 'admin')) {
      if (!admin) return json(res, 403, { ok: false, raison: 'Réservé à l’administration du site.' });
      return json(res, 200, { ok: true, projets, table: source === 'base' });
    }
    const slug = param(url, 'slug');
    if (slug !== null) {
      const p = projets.find(x => x.slug === slug && (x.publie || admin));
      return p ? json(res, 200, { ok: true, projet: p }, admin ? 'no-store' : 'public, max-age=0, s-maxage=30, stale-while-revalidate=300')
        : json(res, 404, { ok: false, raison: 'Ce projet n’existe pas, ou n’est pas encore publié.' });
    }
    return json(res, 200, { ok: true, projets: publics(projets) }, 'public, max-age=0, s-maxage=30, stale-while-revalidate=300');
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false });

  const m = await moi();
  if (!m) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour administrer le site.' });
  if (!estAdmin(m.email, admins)) return json(res, 403, { ok: false, raison: 'Réservé à l’administration du site.' });

  if (param(url, 'envoi')) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, raison: 'L’envoi d’images n’est pas ouvert sur cet environnement.' });
    try {
      const r = await envoi({ body: await corps(req), request: req,
        onBeforeGenerateToken: async pathname => {
          if (!/^projets\/[a-z0-9-]{1,60}\/[^/]{1,120}$/.test(pathname)) throw new Error('chemin');
          return { allowedContentTypes: TYPES_IMAGE, maximumSizeInBytes: TAILLE_IMAGE, addRandomSuffix: true };
        },
        onUploadCompleted: async () => {} });
      return json(res, 200, r);
    } catch { return json(res, 400, { ok: false, raison: 'Envoi refusé : une image JPEG, PNG, WebP ou AVIF de 8 Mo au plus.' }); }
  }

  if (!db) return json(res, 503, { ok: false, code: 'base', raison: 'La base n’est pas branchée sur cet environnement.' });
  let b; try { b = await corps(req); } catch { return json(res, 400, { ok: false, raison: 'Requête illisible.' }); }
  try {
    if (b.action === 'enregistrer') {
      const { projet, erreur } = nettoyerProjet(b.projet);
      if (erreur) return json(res, 400, { ok: false, raison: erreur });
      const ancien = b.ancien ? String(b.ancien) : null;
      if (ancien !== null && !slugOk(ancien)) return json(res, 400, { ok: false, raison: 'Projet d’origine illisible.' });
      const { slug, publie, ordre, ...data } = projet;
      const c = await db.connect();
      try {
        await c.query('begin');
        if (ancien === null || ancien !== slug) {
          const pris = await c.query('select 1 from projets where slug = $1', [slug]);
          if (pris.rowCount) { await c.query('rollback'); return json(res, 409, { ok: false, raison: 'Un autre projet porte déjà cette adresse (' + slug + ').' }); }
          const n = await c.query('select count(*)::int as n from projets');
          if (ancien === null && n.rows[0].n >= LIMITES.projets) { await c.query('rollback'); return json(res, 429, { ok: false, raison: 'Le portfolio compte déjà ' + LIMITES.projets + ' projets.' }); }
        }
        if (ancien !== null && ancien !== slug) await c.query('delete from projets where slug = $1', [ancien]);
        if (data.une) await c.query(`update projets set data = data || '{"une":false}'::jsonb where slug <> $1 and (data->>'une')::boolean`, [slug]);
        await c.query(`insert into projets (slug, data, publie, ordre) values ($1, $2::jsonb, $3, $4)
          on conflict (slug) do update set data = excluded.data, publie = excluded.publie, ordre = excluded.ordre, maj = now()`, [slug, JSON.stringify(data), publie, ordre]);
        await c.query('commit');
        return json(res, 200, { ok: true, slug });
      } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
    }
    if (b.action === 'supprimer') {
      const slug = String(b.slug || '');
      if (!slugOk(slug)) return json(res, 400, { ok: false, raison: 'Projet illisible.' });
      const r = await db.query('delete from projets where slug = $1', [slug]);
      return r.rowCount ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, raison: 'Ce projet n’existe pas.' });
    }
    if (b.action === 'ordre') {
      const slugs = Array.isArray(b.slugs) ? b.slugs.map(String) : [];
      if (!slugs.length || slugs.length > LIMITES.projets || !slugs.every(slugOk) || new Set(slugs).size !== slugs.length) return json(res, 400, { ok: false, raison: 'Ordre illisible.' });
      await db.query('update projets p set ordre = o.n from unnest($1::text[]) with ordinality as o(slug, n) where p.slug = o.slug', [slugs]);
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { ok: false, raison: 'Action inconnue.' });
  } catch (e) {
    if (absente(e)) return json(res, 503, { ok: false, code: 'migration', raison: 'La table des projets n’existe pas encore : la migration 2026-10-28-02 est à appliquer.' });
    return json(res, 500, { ok: false, raison: 'L’administration est momentanément indisponible : réessayez.' });
  }
}

export default async function projets(req, res) {
  const a = auth();
  return traiter(req, res, {
    db: a ? _pool() : null,
    moi: () => (a ? personne(req).catch(() => null) : Promise.resolve(null)),
    admins: process.env.AIME_ADMIN || '',
    envoi: handleUpload,
  });
}

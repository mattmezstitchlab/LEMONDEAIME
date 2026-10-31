// /api/contenus : les contenus éditoriaux de la landing (Bureau éditorial, phase 2).
// GET                          → la version publiée, validée (public). Sans table ni publication : { contenus: null } (le studio garde l'origine).
// GET ?moi=1                   → { admin } : la personne connectée peut-elle administrer ?
// GET ?admin=1                 → la publication et l'historique des versions (administration).
// GET ?version=ID              → une version, validée, pour la prévisualiser (administration).
// GET ?medias=1                → la médiathèque (administration).
// POST { action: 'enregistrer', contenus, note? }   → un nouveau brouillon (refusé s'il a le moindre écart)   (administration)
// POST { action: 'publier', id } | { action: 'restaurer', id }                                              (administration)
// POST { action: 'media', media }                   → décrire un média envoyé (licence, provenance, reconstitution) (administration)
// POST ?envoi=1                → envoyer une image ou une vidéo dans Vercel Blob, dossier « contenus/ » (administration).
// L'administration : les adresses listées dans AIME_ADMIN, vérifiées sur la session (jamais sur le corps). Sans AIME_ADMIN : fermée.
// Sans la table (migration 2026-10-29-01 pas encore appliquée) : le public reçoit { contenus: null }, l'administration un 503.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import { handleUpload } from '@vercel/blob/client';
import { estAdmin } from './_projets.mjs';
import { depotPg, nettoyerMedia, pageOk, TAILLES, TYPES_MEDIA, validerPage } from './_contenus.mjs';

function json(res, code, o, cache) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', cache || 'no-store'); if (cache === PUBLIC) res.setHeader('CDN-Cache-Control', 'max-age=10'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 200000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const param = (url, k) => { try { return new URL(url || '/', 'http://x').searchParams.get(k); } catch { return null; } };
const absente = e => e && (e.code === '42P01' || /relation "(contenus_versions|contenus_journal|medias)" does not exist/.test(String(e.message)));
const idOk = v => /^[1-9]\d{0,15}$/.test(String(v ?? ''));
/* le public : le navigateur revalide toujours (une publication se voit au rechargement) ; le CDN garde la réponse 10 secondes au plus */
const PUBLIC = 'public, max-age=0, must-revalidate';

/* Le cœur, testable : depot (contrat de depotPg, ou null), moi() (la personne de la session, ou null), admins (AIME_ADMIN). */
export async function traiter(req, res, { depot, moi, admins, envoi }) {
  const url = req.url || '';
  const page = param(url, 'page') || 'edition';
  if (!pageOk(page)) return json(res, 400, { ok: false, raison: 'Page inconnue.' });
  const admin = async () => { const m = await moi(); return m && estAdmin(m.email, admins) ? m : null; };
  /* 401 sans session, 403 pour un compte qui n'administre pas : la décision est toujours prise ici, sur la session */
  const garde = async () => { const m = await moi(); if (!m) return { refus: [401, { ok: false, raison: 'Connectez-vous pour administrer le site.' }] };
    return estAdmin(m.email, admins) ? { m } : { refus: [403, { ok: false, raison: 'Réservé à l’administration du site.' }] }; };

  if (req.method === 'POST' && param(url, 'envoi')) {
    if (req.headers['x-vercel-signature']) {
      /* le retour de Vercel Blob après un envoi : signé, vérifié par handleUpload ; la description du média vient ensuite (action « media ») */
      try { await envoi({ body: await corps(req), request: req, onBeforeGenerateToken: async () => { throw new Error('non'); }, onUploadCompleted: async () => {} }); return json(res, 200, { ok: true }); }
      catch { return json(res, 400, { ok: false }); }
    }
    const refus = R.ecriture(req); if (refus) return json(res, ...refus);
    const { m, refus: non } = await garde(); if (non) return json(res, ...non);
    if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, raison: 'Le stockage des médias n’est pas configuré.' });
    try {
      const r = await envoi({ body: await corps(req), request: req,
        onBeforeGenerateToken: async chemin => {
          if (!/^contenus\/[\w./-]+$/.test(chemin) || chemin.includes('..')) throw new Error('chemin');
          return { allowedContentTypes: Object.keys(TYPES_MEDIA), maximumSizeInBytes: TAILLES.video, addRandomSuffix: true, tokenPayload: JSON.stringify({ auteur: m.id }) };
        },
        onUploadCompleted: async () => {} });
      return json(res, 200, r);
    } catch { return json(res, 400, { ok: false, raison: 'Envoi refusé.' }); }
  }

  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  try {
    if (req.method === 'GET') {
      if (param(url, 'moi')) return json(res, 200, { ok: true, admin: !!(await admin()) });
      if (param(url, 'admin') || param(url, 'version') || param(url, 'medias')) {
        const { refus: non } = await garde(); if (non) return json(res, ...non);
        if (!depot) return json(res, 503, { ok: false, raison: 'La base n’est pas configurée.' });
        if (param(url, 'medias')) return json(res, 200, { ok: true, medias: await depot.medias() });
        if (param(url, 'version')) {
          const id = param(url, 'version'); if (!idOk(id)) return json(res, 400, { ok: false, raison: 'Version inconnue.' });
          const v = await depot.version(page, id); if (!v) return json(res, 404, { ok: false, raison: 'Version introuvable.' });
          const { data, ...meta } = v; const { contenus, ecarts } = validerPage(page, data);
          return json(res, 200, { ok: true, version: meta, contenus, ecarts });
        }
        const p = await depot.publie(page);
        return json(res, 200, { ok: true, publie: p ? { id: p.id, publie_le: p.publie_le } : null, versions: await depot.versions(page) });
      }
      /* le public : la version publiée seulement, revalidée à la lecture */
      if (!depot) return json(res, 200, { ok: true, contenus: null }, PUBLIC);
      let p = null;
      try { p = await depot.publie(page); } catch (e) { if (absente(e)) return json(res, 200, { ok: true, contenus: null }, PUBLIC); throw e; }
      if (!p) return json(res, 200, { ok: true, contenus: null }, PUBLIC);
      return json(res, 200, { ok: true, version: p.id, contenus: validerPage(page, p.data).contenus }, PUBLIC);
    }

    if (req.method !== 'POST') return json(res, 405, { ok: false, raison: 'Méthode non prise en charge.' });
    const { m, refus: non } = await garde(); if (non) return json(res, ...non);
    if (!depot) return json(res, 503, { ok: false, raison: 'La base n’est pas configurée.' });
    let b; try { b = await corps(req); } catch { return json(res, 400, { ok: false, raison: 'Requête illisible.' }); }
    const valide = data => validerPage(page, data).ecarts.length === 0;

    if (b.action === 'enregistrer') {
      if (!b.contenus || typeof b.contenus !== 'object' || Array.isArray(b.contenus)) return json(res, 400, { ok: false, raison: 'Contenus manquants.' });
      const { contenus, ecarts } = validerPage(page, b.contenus);
      if (ecarts.length) return json(res, 422, { ok: false, raison: 'Certains champs sont refusés : rien n’est enregistré.', ecarts });
      const note = String(b.note ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').trim().slice(0, 200);
      return json(res, 200, { ok: true, id: await depot.enregistrer(page, contenus, note, m.id) });
    }
    if (b.action === 'publier' || b.action === 'restaurer') {
      if (!idOk(b.id)) return json(res, 400, { ok: false, raison: 'Version inconnue.' });
      const r = await depot[b.action](page, String(b.id), m.id, valide);
      if (r.erreur === 'introuvable') return json(res, 404, { ok: false, raison: 'Version introuvable.' });
      if (r.erreur === 'invalide') return json(res, 422, { ok: false, raison: 'Cette version ne passe plus la validation : elle n’est pas publiée.' });
      return json(res, 200, { ok: true, id: r.id });
    }
    if (b.action === 'media') {
      const { media, erreur } = nettoyerMedia(b.media);
      if (erreur) return json(res, 422, { ok: false, raison: erreur });
      const r = await depot.ajouterMedia(media, m.id);
      if (r.erreur === 'parent') return json(res, 422, { ok: false, raison: 'Le média de rattachement est introuvable.' });
      if (r.erreur === 'doublon') return json(res, 409, { ok: false, raison: 'Ce média est déjà dans la médiathèque.' });
      return json(res, 200, { ok: true, id: r.id });
    }
    return json(res, 400, { ok: false, raison: 'Action inconnue.' });
  } catch (e) {
    if (absente(e)) return json(res, 503, { ok: false, code: 'migration', raison: 'Les tables des contenus n’existent pas encore : la migration 2026-10-29-01 est à appliquer.' });
    return json(res, 500, { ok: false, raison: 'Le Bureau est momentanément indisponible : réessayez.' });
  }
}

export default async function contenus(req, res) {
  const a = auth(), pool = a ? _pool() : null;
  return traiter(req, res, {
    depot: pool ? depotPg(pool) : null,
    moi: () => (a ? personne(req).catch(() => null) : Promise.resolve(null)),
    admins: process.env.AIME_ADMIN || '',
    envoi: handleUpload,
  });
}

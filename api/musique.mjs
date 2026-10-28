// /api/musique : la musique de chacun, rangée par moments du Jour J.
// Les extraits viennent de Deezer (API publique) : 30 secondes, lues depuis les serveurs de Deezer, jamais copiées ici
// (les règles de Deezer interdisent de stocker l'audio). On garde seulement l'identifiant du morceau, son titre et son lien.
// Un lien d'une autre plateforme (Spotify, YouTube, Apple Music…) est gardé comme lien : il s'ouvre chez elle.
// GET ?q=…          → chercher un morceau (Deezer), 8 résultats.
// GET ?extrait=ID   → l'adresse fraîche de l'extrait de 30 s (elle expire vite chez Deezer).
// GET ?ref=…        → les morceaux publics d'un profil visible du Réseau.
// GET ?moi=1        → mes morceaux (connecté·e).
// POST { action: 'ajouter', deezer?: id, lien?, fichier?, titre?, artiste?, droits?, moment } | { action: 'retirer', id } | { action: 'moment', id, moment }
// POST ?envoi=1     → envoyer un fichier audio (le sien) dans le stockage Vercel Blob, directement depuis le navigateur.
//                     Seulement ses propres créations : la personne coche « c'est ma création, j'en ai les droits ».
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import Q from './_auth/quotas.cjs';
import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';

export const MOMENTS = ['preparatifs', 'ceremonie', 'sortie', 'cocktail', 'entree', 'repas', 'gateau', 'ouverture', 'soiree', 'fin'];
export const MAX_PAR_PERSONNE = 60;
const TABLE = `create table if not exists musiques (id bigserial primary key, user_id text not null, source text not null check (source in ('deezer','lien')),
  deezer_id bigint, titre text not null, artiste text not null default '', pochette text not null default '', lien text not null default '',
  moment text not null default 'soiree', cree_le timestamptz not null default now());
  create index if not exists musiques_user on musiques (user_id, cree_le);
  alter table musiques drop constraint if exists musiques_source_check;
  alter table musiques add constraint musiques_source_check check (source in ('deezer','lien','fichier'))`;
export const TYPES_AUDIO = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm'];
export const TAILLE_MAX = 20 * 1024 * 1024;
/* un fichier envoyé dans notre stockage, dans le dossier de cette personne */
export const fichierOk = (u, id) => { try { const x = new URL(u); return x.protocol === 'https:' && /\.public\.blob\.vercel-storage\.com$/.test(x.hostname) && x.pathname.startsWith('/musique/' + id + '/'); } catch { return false; } };
let pret = null;
const table = db => (pret = pret || db.query(TABLE).catch(e => { pret = null; throw e; }));
function json(res, code, o, cache) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', cache || 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 4000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const ligne = (v, n) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const param = (url, k) => { try { return new URL(url || '/', 'http://x').searchParams.get(k); } catch { return null; } };
/* un morceau Deezer, réduit à ce qu'on montre (jamais l'adresse de l'extrait, qui expire) */
export const deDeezer = t => ({ deezer: t.id, titre: ligne(t.title, 120), artiste: ligne(t.artist && t.artist.name, 120), pochette: /^https:\/\/[a-z0-9.-]+\.dzcdn\.net\//.test((t.album && t.album.cover_medium) || '') ? t.album.cover_medium : '', lien: 'https://www.deezer.com/track/' + t.id, duree: t.duration || 0 });
/* un lien collé : Deezer (on retrouve le morceau), sinon une plateforme connue ou n'importe quel https */
export function lireLien(v) {
  let u; try { u = new URL(String(v || '').trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const d = /(?:^|\.)deezer\.com$/.test(u.hostname) && /\/track\/(\d{1,15})/.exec(u.pathname);
  if (d) return { deezer: Number(d[1]) };
  const plateforme = /spotify\.com$/.test(u.hostname) ? 'Spotify' : /(youtube\.com|youtu\.be)$/.test(u.hostname) ? 'YouTube' : /music\.apple\.com$/.test(u.hostname) ? 'Apple Music' : /soundcloud\.com$/.test(u.hostname) ? 'SoundCloud' : /bandcamp\.com$/.test(u.hostname) ? 'Bandcamp' : 'Lien';
  return { lien: u.toString().slice(0, 300), plateforme };
}
async function deezer(chemin) {
  const r = await fetch('https://api.deezer.com' + chemin, { signal: AbortSignal.timeout(6000) });
  const j = await r.json(); if (!r.ok || j.error) throw new Error('deezer'); return j;
}
const PUBLIC = m => ({ id: String(m.id), source: m.source, deezer: m.deezer_id ? Number(m.deezer_id) : null, titre: m.titre, artiste: m.artiste, pochette: m.pochette, lien: m.lien, moment: m.moment });

export default async function musique(req, res) {
  const url = req.url || '';
  /* le retour de Vercel Blob après un envoi : signé par Vercel, vérifié par handleUpload ; rien à enregistrer ici */
  if (req.method === 'POST' && param(url, 'envoi') && req.headers['x-vercel-signature']) {
    try { const b = await corps(req); await handleUpload({ body: b, request: req, onBeforeGenerateToken: async () => { throw new Error('non'); }, onUploadCompleted: async () => {} }); return json(res, 200, { ok: true }); }
    catch { return json(res, 400, { ok: false }); }
  }
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  try {
    if (req.method === 'GET') {
      const q = param(url, 'q');
      if (q !== null) {
        const t = ligne(q, 100); if (t.length < 2) return json(res, 200, { ok: true, resultats: [] });
        const lim = await Q.quota('musique:ip', Q.ipDe(req), { db: _pool() || undefined });
        if (!lim.ok) return json(res, 429, { ok: false, raison: 'Beaucoup de recherches à la suite : réessayez dans un moment.' });
        const j = await deezer('/search?limit=8&q=' + encodeURIComponent(t));
        return json(res, 200, { ok: true, resultats: (j.data || []).filter(x => x.readable !== false).map(deDeezer) }, 'public, max-age=600');
      }
      const ex = param(url, 'extrait');
      if (ex !== null) {
        if (!/^\d{1,15}$/.test(ex)) return json(res, 400, { ok: false });
        const j = await deezer('/track/' + ex);
        if (!j.preview || !/^https:\/\/[a-z0-9.-]+\.dzcdn\.net\//.test(j.preview)) return json(res, 404, { ok: false, raison: 'Pas d’extrait pour ce morceau.' });
        return json(res, 200, { ok: true, extrait: j.preview, ...deDeezer(j) });
      }
    }
    if (!auth()) return json(res, 503, { ok: false, raison: 'La musique n’est pas encore ouverte sur cet environnement.' });
    const db = _pool(); await table(db);
    if (req.method === 'GET') {
      const ref = param(url, 'ref');
      if (ref) {
        if (!/^[a-f0-9]{12}$/.test(ref)) return json(res, 400, { ok: false });
        const r = await db.query(`select m.* from musiques m join profils p on p.user_id = m.user_id where p.visible and p.ref = $1 order by m.cree_le limit 60`, [ref]);
        return json(res, 200, { ok: true, musiques: r.rows.map(PUBLIC) });
      }
      const moi = await personne(req).catch(() => null);
      if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour garder votre musique.' });
      const r = await db.query(`select * from musiques where user_id = $1 order by cree_le limit $2`, [moi.id, MAX_PAR_PERSONNE]);
      return json(res, 200, { ok: true, moments: MOMENTS, musiques: r.rows.map(PUBLIC) });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false });
    const moi = await personne(req).catch(() => null);
    if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour garder votre musique.' });
    const b = await corps(req);
    if (param(url, 'envoi')) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 503, { ok: false, raison: 'L’envoi de fichiers n’est pas encore ouvert.' });
      try {
        const r = await handleUpload({ body: b, request: req,
          onBeforeGenerateToken: async (pathname, payload) => {
            let p = {}; try { p = JSON.parse(payload || '{}'); } catch { /* vide */ }
            if (p.droits !== true) throw new Error('droits');
            if (!pathname.startsWith('musique/' + moi.id + '/')) throw new Error('chemin');
            const q = await Q.quota('envoi:personne', moi.id, { db });
            if (!q.ok) throw new Error('quota');
            return { allowedContentTypes: TYPES_AUDIO, maximumSizeInBytes: TAILLE_MAX, addRandomSuffix: true };
          },
          onUploadCompleted: async () => {} });
        return json(res, 200, r);
      } catch (e) { return json(res, 400, { ok: false, raison: /droits/.test(String(e && e.message)) ? 'Cochez « c’est ma création, j’en ai les droits ».' : /quota/.test(String(e && e.message)) ? 'Beaucoup d’envois à la suite : réessayez plus tard.' : 'Envoi refusé : un fichier audio (MP3, M4A, WAV, OGG) de 20 Mo au plus.' }); }
    }
    const moment = MOMENTS.includes(b.moment) ? b.moment : 'soiree';
    if (b.action === 'ajouter') {
      const n = await db.query(`select count(*)::int as n from musiques where user_id = $1`, [moi.id]);
      if (n.rows[0].n >= MAX_PAR_PERSONNE) return json(res, 400, { ok: false, raison: 'Votre musique compte déjà ' + MAX_PAR_PERSONNE + ' morceaux : retirez-en un d’abord.' });
      let m;
      const id = b.deezer != null ? String(b.deezer) : null, l = b.lien ? lireLien(b.lien) : null;
      if (b.lien && !l) return json(res, 400, { ok: false, raison: 'Ce lien ne semble pas valide (il doit commencer par https://).' });
      const dz = id && /^\d{1,15}$/.test(id) ? id : l && l.deezer ? String(l.deezer) : null;
      if (b.fichier) {
        if (!fichierOk(b.fichier, moi.id)) return json(res, 400, { ok: false, raison: 'Ce fichier ne vient pas de votre envoi.' });
        if (b.droits !== true) return json(res, 400, { ok: false, raison: 'Cochez « c’est ma création, j’en ai les droits ».' });
        const titre = ligne(b.titre, 120); if (!titre) return json(res, 400, { ok: false, raison: 'Donnez le titre du morceau.' });
        m = { source: 'fichier', deezer_id: null, titre, artiste: ligne(b.artiste, 120), pochette: '', lien: String(b.fichier) };
      } else if (dz) { const t = deDeezer(await deezer('/track/' + dz)); m = { source: 'deezer', deezer_id: t.deezer, titre: t.titre, artiste: t.artiste, pochette: t.pochette, lien: t.lien }; }
      else if (l) { const titre = ligne(b.titre, 120); if (!titre) return json(res, 400, { ok: false, raison: 'Donnez le titre du morceau.' }); m = { source: 'lien', deezer_id: null, titre, artiste: ligne(b.artiste, 120), pochette: '', lien: l.lien }; }
      else return json(res, 400, { ok: false, raison: 'Choisissez un morceau ou collez un lien.' });
      const r = await db.query(`insert into musiques (user_id, source, deezer_id, titre, artiste, pochette, lien, moment) values ($1,$2,$3,$4,$5,$6,$7,$8) returning *`,
        [moi.id, m.source, m.deezer_id, m.titre, m.artiste, m.pochette, m.lien, moment]);
      return json(res, 200, { ok: true, musique: PUBLIC(r.rows[0]) });
    }
    const id = /^\d{1,18}$/.test(String(b.id || '')) ? String(b.id) : null;
    if (!id) return json(res, 400, { ok: false });
    if (b.action === 'retirer') {
      const r = await db.query(`delete from musiques where id = $1 and user_id = $2 returning source, lien`, [id, moi.id]);
      const x = r.rows[0]; if (x && x.source === 'fichier' && fichierOk(x.lien, moi.id) && process.env.BLOB_READ_WRITE_TOKEN) await del(x.lien).catch(() => {});
      return json(res, 200, { ok: true });
    }
    if (b.action === 'moment') { await db.query(`update musiques set moment = $3 where id = $1 and user_id = $2`, [id, moi.id, moment]); return json(res, 200, { ok: true }); }
    return json(res, 400, { ok: false });
  } catch {
    return json(res, 502, { ok: false, raison: 'La musique ne répond pas pour le moment : réessayez.' });
  }
}

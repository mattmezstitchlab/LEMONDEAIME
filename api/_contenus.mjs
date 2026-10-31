// Les contenus éditoriaux (Bureau éditorial, phase 2) : la validation partagée avec le studio, les médias, et le dépôt en base.
// Une version n'est jamais modifiée ni effacée : « Enregistrer » ajoute un brouillon, « Publier » le rend public et archive
// l'ancienne publication, « Restaurer » republie une ancienne version comme une nouvelle. Rien n'est perdu.
import { createRequire } from 'node:module';
import { valider } from '../studio/src/components/edition/validation.mjs';

const exiger = createRequire(import.meta.url);
export const ORIGINE = exiger('../studio/src/components/edition/contenus.origine.json');
export const PAGES = { edition: ORIGINE };
export const pageOk = p => typeof p === 'string' && Object.hasOwn(PAGES, p);
export const validerPage = (page, brut) => valider(PAGES[page], brut);

/* ——— Les médias : images (8 Mo), vidéos (100 Mo, limite initiale à confirmer), affiches ——— */
export const TYPES_MEDIA = {
  'image/jpeg': 'image', 'image/png': 'image', 'image/webp': 'image', 'image/avif': 'image',
  'video/mp4': 'video', 'video/webm': 'video',
};
export const TAILLES = { image: 8 * 1024 * 1024, video: 100 * 1024 * 1024 };
export const ROLES = ['principal', 'mobile', 'affiche'];
export const LICENCES = ['domaine-public', 'reconstitution', 'capture', 'autorise'];
export const blobOk = u => typeof u === 'string' && !u.includes('..') && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/contenus\/[\w./%-]+$/i.test(u);
const texte = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').trim().slice(0, max);
const entier = (v, min, max) => Number.isInteger(v) && v >= min && v <= max ? v : null;

/** Un média décrit par l'administration après son envoi : refusé s'il n'est pas complet et honnête. */
export function nettoyerMedia(m) {
  if (!m || typeof m !== 'object') return { erreur: 'Média manquant.' };
  if (!blobOk(m.url)) return { erreur: 'Adresse refusée : seulement le dossier « contenus » du stockage de médias.' };
  const genre = TYPES_MEDIA[m.mime];
  if (!genre) return { erreur: 'Format refusé : JPEG, PNG, WebP, AVIF, MP4 ou WebM.' };
  const role = ROLES.includes(m.role) ? m.role : 'principal';
  if (role === 'affiche' && genre !== 'image') return { erreur: 'Une affiche de vidéo est une image.' };
  const poids = entier(m.poids, 1, TAILLES[genre]);
  if (!poids) return { erreur: genre === 'video' ? 'Vidéo trop lourde : 100 Mo au plus.' : 'Image trop lourde : 8 Mo au plus.' };
  if (!LICENCES.includes(m.licence)) return { erreur: 'Précisez la licence : domaine public, reconstitution, capture ou autorisé.' };
  const reconstitution = m.reconstitution === true || m.licence === 'reconstitution';
  const legende = texte(m.legende, 1600), alt = texte(m.alt, 400);
  if (genre === 'image' && role !== 'affiche' && !alt) return { erreur: 'Décrivez l’image (texte alternatif).' };
  if (reconstitution && !/reconstitution/i.test(legende)) return { erreur: 'Une reconstitution doit être annoncée dans sa légende.' };
  if ((m.licence === 'domaine-public' || m.licence === 'autorise') && !texte(m.provenance, 400)) return { erreur: 'Indiquez la provenance (musée, auteur, autorisation).' };
  const parent = m.parent_id == null ? null : entier(m.parent_id, 1, Number.MAX_SAFE_INTEGER);
  if (role !== 'principal' && !parent) return { erreur: 'Une version mobile ou une affiche se rattache à un média.' };
  return { media: {
    url: m.url, genre: role === 'affiche' ? 'affiche' : genre, mime: m.mime, poids, role, parent_id: role === 'principal' ? null : parent,
    largeur: entier(m.largeur, 1, 20000), hauteur: entier(m.hauteur, 1, 20000),
    alt, legende, licence: m.licence, reconstitution, provenance: texte(m.provenance, 400), credit: texte(m.credit, 400),
  } };
}

/* ——— Le dépôt en base (pg). Les tests remplacent ce dépôt par un dépôt en mémoire, de même contrat. ——— */
const COLS = 'id::text as id, page, etat, note, cree_le, publie_le, restaure_de::text as restaure_de';
export function depotPg(db) {
  const transaction = async f => { const c = await db.connect(); try { await c.query('begin'); const r = await f(c); await c.query('commit'); return r; } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); } };
  const journal = (c, page, action, version, auteur, detail = {}) => c.query('insert into contenus_journal (page, action, version_id, auteur, detail) values ($1, $2, $3, $4, $5)', [page, action, version, auteur, detail]);
  return {
    async publie(page) { const r = await db.query('select id::text as id, data, publie_le from contenus_versions where page = $1 and etat = \'publie\'', [page]); return r.rows[0] || null; },
    async versions(page, n = 50) { return (await db.query(`select ${COLS} from contenus_versions where page = $1 order by id desc limit $2`, [page, n])).rows; },
    async version(page, id) { const r = await db.query(`select ${COLS}, data from contenus_versions where page = $1 and id = $2`, [page, id]); return r.rows[0] || null; },
    async enregistrer(page, data, note, auteur) {
      return transaction(async c => { const r = await c.query('insert into contenus_versions (page, data, note, auteur) values ($1, $2, $3, $4) returning id::text as id', [page, data, note, auteur]);
        await journal(c, page, 'enregistrer', r.rows[0].id, auteur); return r.rows[0].id; });
    },
    async publier(page, id, auteur, valide) {
      return transaction(async c => {
        const v = (await c.query('select id, data, etat from contenus_versions where page = $1 and id = $2 for update', [page, id])).rows[0];
        if (!v) return { erreur: 'introuvable' };
        if (!valide(v.data)) return { erreur: 'invalide' };
        await c.query('update contenus_versions set etat = \'archive\' where page = $1 and etat = \'publie\' and id <> $2', [page, id]);
        await c.query('update contenus_versions set etat = \'publie\', publie_le = now() where id = $1', [id]);
        await journal(c, page, 'publier', id, auteur); return { id: String(id) };
      });
    },
    async restaurer(page, id, auteur, valide) {
      return transaction(async c => {
        const v = (await c.query('select id, data from contenus_versions where page = $1 and id = $2', [page, id])).rows[0];
        if (!v) return { erreur: 'introuvable' };
        if (!valide(v.data)) return { erreur: 'invalide' };
        await c.query('update contenus_versions set etat = \'archive\' where page = $1 and etat = \'publie\'', [page]);
        const n = (await c.query('insert into contenus_versions (page, data, note, auteur, etat, publie_le, restaure_de) values ($1, $2, $3, $4, \'publie\', now(), $5) returning id::text as id',
          [page, v.data, 'Restauration de la version ' + id, auteur, id])).rows[0].id;
        await journal(c, page, 'restaurer', n, auteur, { depuis: String(id) }); return { id: n };
      });
    },
    async ajouterMedia(m, auteur) {
      return transaction(async c => {
        if (m.parent_id && !(await c.query('select 1 from medias where id = $1 and role = \'principal\'', [m.parent_id])).rowCount) return { erreur: 'parent' };
        const r = await c.query(`insert into medias (url, genre, mime, poids, role, parent_id, largeur, hauteur, alt, legende, licence, reconstitution, provenance, credit, auteur)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) on conflict (url) do nothing returning id::text as id`,
          [m.url, m.genre, m.mime, m.poids, m.role, m.parent_id, m.largeur, m.hauteur, m.alt, m.legende, m.licence, m.reconstitution, m.provenance, m.credit, auteur]);
        if (!r.rowCount) return { erreur: 'doublon' };
        await journal(c, 'medias', 'media', null, auteur, { media: r.rows[0].id }); return { id: r.rows[0].id };
      });
    },
    async medias(n = 200) { return (await db.query('select id::text as id, url, genre, mime, poids, role, parent_id::text as parent_id, largeur, hauteur, alt, legende, licence, reconstitution, provenance, credit, cree_le from medias order by id desc limit $1', [n])).rows; },
  };
}

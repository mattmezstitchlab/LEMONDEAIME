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
/* la révision d'un projet (data.rev) ; absente ou illisible = 0, jamais une erreur de conversion */
const REV = `(case when data->>'rev' ~ '^[0-9]{1,9}$' then (data->>'rev')::int else 0 end)`;
export const revDe = d => { const v = d && d.rev; return /^[0-9]{1,9}$/.test(String(v)) ? Number(v) : 0; };
function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > 20000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
export function nettoyerTitre(v) { return String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 120); }
/* la description garde ses retours à la ligne ; les autres caractères de contrôle partent */
export function nettoyerDescription(v) { return String(v || '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, ' ').trim().slice(0, 2000); }
/* La fiche mariage (data.mariage) : noms des deux personnes, date, lieu. Rien d'autre : ni coordonnées bancaires, ni contacts.
   « complet » (création) exige les deux noms ; une modification ne touche que les clés envoyées. Renvoie { mariage } ou { erreur }. */
const NOM_MAX = 80, LIEU_MAX = 120;
const nettoyerNom = v => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NOM_MAX);
export function dateValide(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [a, m, j] = v.split('-').map(Number), d = new Date(Date.UTC(a, m - 1, j));
  return a >= 2000 && a <= 2100 && d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j;
}
export function nettoyerMariage(b, complet) {
  const src = b && typeof b === 'object' && !Array.isArray(b) ? b : {}, m = {};
  if (complet || src.noms !== undefined) {
    const n = Array.isArray(src.noms) ? src.noms.map(nettoyerNom) : [];
    if (n.length !== 2 || !n[0] || !n[1]) return { erreur: 'Indiquez les deux noms (ou prénoms) de l’union.' };
    m.noms = n;
  }
  if (src.date !== undefined) {
    if (src.date === '' || src.date === null) m.date = '';
    else if (dateValide(src.date)) m.date = src.date;
    else return { erreur: 'Cette date n’existe pas : indiquez-la au format jour/mois/année.' };
  }
  if (src.lieu !== undefined) {
    const l = src.lieu && typeof src.lieu === 'object' ? src.lieu : {};
    m.lieu = { nom: String(l.nom || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIEU_MAX), ville: String(l.ville || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIEU_MAX) };
  }
  return { mariage: m };
}
export const titreMariage = n => n.join(' & ').slice(0, 120);
export function nettoyerProjet(b) {
  if (b && b.genre === 'mariage') {
    const f = nettoyerMariage(b.mariage, true);
    if (f.erreur) return { erreur: f.erreur };
    const m = Object.assign({ date: '', lieu: { nom: '', ville: '' } }, f.mariage);
    return { titre: nettoyerTitre(b.titre) || titreMariage(m.noms), kind: 'evenement', data: { modele: 'mariage', mariage: m, briques: [], studio: 'AIME Wedding', intention: 'organiser', description: '', rev: 0, visibilite: 'prive', archive: false, source: 'buro' } };
  }
  const titre = nettoyerTitre(b.titre);
  if (!titre) return null;
  const briques = (Array.isArray(b.briques) ? b.briques : []).filter((x, i, l) => IDS.includes(x) && l.indexOf(x) === i).slice(0, 20);
  return { titre, data: { briques, studio: String(b.studio || '').slice(0, 60), intention: String(b.intention || '').slice(0, 1000), description: nettoyerDescription(b.description), rev: 0, visibilite: 'prive', archive: false, source: 'point-zero' } };
}
/* Un accès (space_members) ne vaut que tant qu'il n'a pas expiré : la même condition sert à toutes les lectures et écritures, quel que soit le rôle. */
const ACCES_VALIDE = `(m.jusqu_au is null or m.jusqu_au > now())`;
export default async function buro(req, res) {
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const moi = await personne(req).catch(() => null);
  if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour ouvrir votre espace.' });
  const db = _pool();
  try {
    if (req.method === 'GET') {
      const r = await db.query(`select s.id::text as id, s.kind, s.title, s.data, s.updated_at, m.role from spaces s join space_members m on m.space_id = s.id where m.user_id = $1 and ${ACCES_VALIDE} order by s.updated_at desc limit 200`, [moi.id]);
      return json(res, 200, { ok: true, projets: r.rows.map(x => ({ id: x.id, genre: x.kind, titre: x.title, role: x.role, maj: x.updated_at, briques: (x.data && x.data.briques) || [], studio: (x.data && x.data.studio) || '', ouvrage: (x.data && x.data.ouvrage) || null, visibilite: (x.data && x.data.visibilite) || 'prive', archive: !!(x.data && x.data.archive), description: (x.data && x.data.description) || '', rev: revDe(x.data), intention: (x.data && x.data.intention) || '', modele: (x.data && x.data.modele) || null, mariage: x.kind === 'evenement' && x.data && x.data.modele === 'mariage' ? (x.data.mariage || null) : null })) });
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
      let fiche = null;
      if (b.mariage !== undefined) {
        const f = nettoyerMariage(b.mariage, false);
        if (f.erreur) return json(res, 400, { ok: false, raison: f.erreur });
        fiche = f.mariage;
      }
      if (titre === null && !Object.keys(patch).length && !(fiche && Object.keys(fiche).length)) return json(res, 400, { ok: false, raison: 'Rien à modifier.' });
      /* La révision vue est obligatoire et doit être un entier JSON (jamais un texte, un booléen, un tableau, un objet, un nombre négatif ou décimal). */
      if (b.rev === undefined || b.rev === null || b.rev === '') return json(res, 400, { ok: false, raison: 'Révision manquante : rechargez le projet avant de l’enregistrer.' });
      if (typeof b.rev !== 'number' || !Number.isInteger(b.rev) || b.rev < 0 || b.rev >= 1e9) return json(res, 400, { ok: false, raison: 'Révision invalide.' });
      const rev = b.rev;
      /* Un mariage se modifie à deux : le propriétaire, et un membre « editor » dont le rôle n'a pas expiré (space_members), pour la fiche
         et le titre seulement. Archiver, partager et la description restent au propriétaire. Les autres reçoivent 404, comme avant. */
      const reservees = Object.keys(patch).length > 0;
      const EDITEUR = `exists (select 1 from space_members m where m.space_id = spaces.id and m.user_id = $2 and m.role = 'editor' and ${ACCES_VALIDE})`;
      const condition = reservees ? `owner_id = $2` : `(owner_id = $2 or (kind = 'evenement' and data->>'modele' = 'mariage' and ${EDITEUR}))`;
      /* la même requête vérifie le droit et la révision, puis écrit : pas de course entre lire et écrire */
      const r = await db.query(
        `update spaces set title = coalesce($4::text, title),
                data = data || $3::jsonb || case when $6::jsonb is null then '{}'::jsonb else jsonb_build_object('mariage', coalesce(data->'mariage', '{}'::jsonb) || $6::jsonb) end || jsonb_build_object('rev', ${REV} + 1), updated_at = now()
          where id::text = $1 and ${condition} and ($5::int is null or ${REV} = $5::int)
          returning id::text as id, title, updated_at, ${REV} as rev`,
        [String(b.id || ''), moi.id, JSON.stringify(patch), titre, rev, fiche && Object.keys(fiche).length ? JSON.stringify(fiche) : null]);
      if (r.rowCount) return json(res, 200, { ok: true, id: r.rows[0].id, titre: r.rows[0].title, rev: r.rows[0].rev, maj: r.rows[0].updated_at });
      const la = await db.query(`select ${REV} as rev from spaces where id::text = $1 and ${condition}`, [String(b.id || ''), moi.id]);
      return la.rowCount
        ? json(res, 409, { ok: false, conflit: true, rev: la.rows[0].rev, raison: 'Ce projet a été modifié ailleurs depuis que vous l’avez ouvert. Rien n’a été écrasé : rechargez-le pour voir la dernière version.' })
        : json(res, 404, { ok: false, raison: 'Projet introuvable, ou vous n’en êtes pas propriétaire.' });
    }
    const p = nettoyerProjet(b);
    if (!p) return json(res, 400, { ok: false, raison: 'Donnez un nom au projet.' });
    if (p.erreur) return json(res, 400, { ok: false, raison: p.erreur });
    /* « cle » : une clé tirée à l'ouverture du formulaire. Un double clic, une nouvelle tentative après une coupure ou un second envoi du même
       formulaire retombent sur le MÊME projet au lieu d'en créer un autre (l'index unique spaces_origine_unique existe déjà : aucune migration). */
    const cle = typeof b.cle === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(b.cle) ? 'bureau:' + b.cle : null;
    if (cle) {
      p.data.origine = cle;
      const deja = await db.query(`select id::text as id from spaces where owner_id = $1 and data->>'origine' = $2`, [moi.id, cle]);
      if (deja.rowCount) return json(res, 200, { ok: true, id: deja.rows[0].id, doublon: true });
    }
    const n = await db.query(`select count(*)::int as n from spaces where owner_id = $1`, [moi.id]);
    if (n.rows[0].n >= 500) return json(res, 429, { ok: false, raison: 'Votre espace est plein (500 projets) : archivez ou supprimez-en.' });
    const c = await db.connect();
    try {
      await c.query('begin');
      const s = await c.query(`insert into spaces (kind, title, owner_id, data) values ($4, $1, $2, $3::jsonb) on conflict (owner_id, (data ->> 'origine')) where (data ? 'origine') do nothing returning id::text as id`, [p.titre, moi.id, JSON.stringify(p.data), p.kind || 'projet']);
      if (!s.rowCount) {   /* deux envois simultanés : l'autre a gagné, on renvoie son projet */
        await c.query('rollback');
        const l = await c.query(`select id::text as id from spaces where owner_id = $1 and data->>'origine' = $2`, [moi.id, cle]);   /* sur la même connexion : une seconde connexion ferait attendre le bassin (3) */
        return json(res, 200, { ok: true, id: l.rows[0] && l.rows[0].id, doublon: true });
      }
      await c.query(`insert into space_members (space_id, user_id, role) values ($1::uuid, $2, 'owner')`, [s.rows[0].id, moi.id]);
      await c.query('commit');
      return json(res, 201, { ok: true, id: s.rows[0].id });
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  } catch {
    return json(res, 500, { ok: false, raison: 'Votre espace est momentanément indisponible : réessayez.' });
  }
}

// /api/galerie : la Galerie des Vivants (lot G1).
// Public (sans compte) : GET → les œuvres visibles ; GET ?id= → une fiche ; GET ?id=&contenu=1 → la copie du motif (pour « Ouvrir dans le Cadre »).
// Avec compte :          GET ?miennes=1 → mes œuvres ; POST { action: 'exposer' | 'retirer' | 'voter' }.
// Tout le monde :        POST { action: 'signaler', id, raison, texte } (quota par adresse IP, une fois par œuvre).
// Administration :       GET ?signalements=1 ; POST { action: 'masquer' | 'demasquer', id, motif }.
// L'identité vient toujours de la session vérifiée, jamais du corps ; l'administration, des adresses AIME_ADMIN.
import { auth, personne, _pool } from './_auth/auth.mjs';
import R from './_auth/requete.cjs';
import Q from './_auth/quotas.cjs';
import { estAdmin } from './_projets.mjs';
import { depotPg, idOk, LIMITES, nettoyerExposition, publique, RAISONS_SIGNALEMENT } from './_galerie.mjs';

function json(res, code, o, cache = 'no-store') { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', cache); res.end(JSON.stringify(o)); }
async function corps(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = ''; for await (const c of req) { s += c; if (s.length > LIMITES.contenu + LIMITES.apercu + 20000) throw new Error('trop long'); }
  return s ? JSON.parse(s) : {};
}
const param = (url, k) => { try { return new URL(url || '/', 'http://x').searchParams.get(k); } catch { return null; } };
const absente = e => e && (e.code === '42P01' || /relation "(oeuvres_exposees|votes_oeuvres|signalements_oeuvres)" does not exist/.test(String(e.message)));

/* Le cœur, testable : depot (contrat de depotPg), moi() (la personne de la session, ou null), admins (AIME_ADMIN), quota(nom, valeur) → { ok, attente } */
export async function traiter(req, res, { depot, moi, admins, quota, ip }) {
  const url = req.url || '';
  if (req.method === 'GET') {
    const m = await moi(), id = param(url, 'id');
    if (param(url, 'signalements')) {
      if (!m) return json(res, 401, { ok: false, raison: 'Connectez-vous.' });
      if (!estAdmin(m.email, admins)) return json(res, 403, { ok: false, raison: 'Réservé à l’administration du site.' });
      return json(res, 200, { ok: true, signalements: await depot.signalements() });
    }
    if (param(url, 'miennes')) {
      if (!m) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour retrouver vos œuvres exposées.' });
      return json(res, 200, { ok: true, oeuvres: (await depot.mesOeuvres(m.id)).map(r => ({ ...publique(r, m.id), statut: r.statut })) });
    }
    if (id) {
      if (!idOk(id)) return json(res, 400, { ok: false, raison: 'Œuvre inconnue.' });
      if (param(url, 'contenu')) { const c = await depot.contenu(id); return c ? json(res, 200, { ok: true, ...c }) : json(res, 404, { ok: false, raison: 'Œuvre introuvable.' }); }
      const r = await depot.fiche(id, m?.id ?? null);
      if (!r || r.statut !== 'visible') return json(res, 404, { ok: false, raison: 'Cette œuvre n’est pas (ou plus) exposée.' });
      return json(res, 200, { ok: true, oeuvre: publique(r, m?.id ?? null) }, m ? 'no-store' : 'public, max-age=0, must-revalidate');
    }
    const avant = param(url, 'avant'), date = avant && !Number.isNaN(Date.parse(avant)) ? new Date(avant) : null;
    const rows = await depot.liste({ moi: m?.id ?? null, avant: date });
    return json(res, 200, { ok: true, oeuvres: rows.map(r => publique(r, m?.id ?? null)) }, m ? 'no-store' : 'public, max-age=0, must-revalidate');
  }
  if (req.method !== 'POST') return json(res, 405, { ok: false });
  const refus = R.ecriture(req); if (refus) return json(res, ...refus);
  let b; try { b = await corps(req); } catch { return json(res, 400, { ok: false, raison: 'Requête illisible.' }); }
  const action = String(b.action || '');

  if (action === 'signaler') {
    if (!idOk(b.id)) return json(res, 400, { ok: false, raison: 'Œuvre inconnue.' });
    const raison = RAISONS_SIGNALEMENT.includes(b.raison) ? b.raison : 'autre';
    const q = await quota('galerie:signaler:ip', ip); if (!q.ok) return json(res, 429, { ok: false, raison: 'Trop de signalements depuis cette connexion. Réessayez plus tard.' });
    const m = await moi();
    const ok = await depot.signaler(b.id, m ? 'compte:' + m.id : 'ip:' + Q.empreinte(ip), raison, String(b.texte ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, LIMITES.signalement));
    return ok ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, raison: 'Œuvre introuvable.' });
  }

  const m = await moi();
  if (!m) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour exposer, retirer ou voter.' });

  if (action === 'exposer') {
    const { oeuvre, raison, code } = nettoyerExposition(b);
    if (!oeuvre) return json(res, code || 400, { ok: false, raison });
    const q = await quota('galerie:exposer', m.id); if (!q.ok) return json(res, 429, { ok: false, raison: 'Vous avez exposé 10 œuvres aujourd’hui : la suite demain.' });
    return json(res, 200, { ok: true, id: await depot.exposer(m.id, oeuvre) });
  }
  if (action === 'retirer') {
    if (!idOk(b.id)) return json(res, 400, { ok: false, raison: 'Œuvre inconnue.' });
    return (await depot.retirer(m.id, b.id)) ? json(res, 200, { ok: true }) : json(res, 404, { ok: false, raison: 'Œuvre introuvable parmi les vôtres.' });
  }
  if (action === 'voter') {
    if (!idOk(b.id)) return json(res, 400, { ok: false, raison: 'Œuvre inconnue.' });
    const q = await quota('galerie:voter', m.id); if (!q.ok) return json(res, 429, { ok: false, raison: 'Beaucoup de cœurs aujourd’hui : la suite demain.' });
    const r = await depot.voter(m.id, b.id, b.oui !== false);
    if (r === 'introuvable') return json(res, 404, { ok: false, raison: 'Œuvre introuvable.' });
    if (r === 'soi') return json(res, 403, { ok: false, raison: 'On ne vote pas pour sa propre œuvre.' });
    return json(res, 200, { ok: true, votes: r, jaiVote: b.oui !== false });
  }
  if (action === 'masquer' || action === 'demasquer') {
    if (!estAdmin(m.email, admins)) return json(res, 403, { ok: false, raison: 'Réservé à l’administration du site.' });
    if (!idOk(b.id)) return json(res, 400, { ok: false, raison: 'Œuvre inconnue.' });
    const ok = await depot.masquer(b.id, action === 'masquer', String(b.motif ?? '').slice(0, 200));
    return ok ? json(res, 200, { ok: true }) : json(res, 409, { ok: false, raison: action === 'masquer' ? 'Cette œuvre n’est pas visible.' : 'Cette œuvre n’est pas masquée.' });
  }
  return json(res, 400, { ok: false, raison: 'Action inconnue.' });
}

export default async function galerie(req, res) {
  if (!auth()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const db = _pool();
  try {
    return await traiter(req, res, {
      depot: depotPg(db), moi: (() => { let p; return () => (p = p || personne(req).catch(() => null)); })(),
      admins: process.env.AIME_ADMIN || '', ip: Q.ipDe(req),
      quota: (nom, valeur) => Q.quota(nom, valeur, { db }),
    });
  } catch (e) {
    if (absente(e)) return json(res, 503, { ok: false, raison: 'La galerie n’est pas encore ouverte (migration 2026-10-29-03).' });
    return json(res, 500, { ok: false, raison: 'La galerie est momentanément indisponible.' });
  }
}

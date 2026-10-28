// AIME · la garde des requêtes qui modifient des données (audit Vercel, PR 2) : même origine et corps JSON, partout.
// Un navigateur envoie toujours l'en-tête Origin sur un POST ; un formulaire d'un autre site ne peut pas envoyer
// « Content-Type: application/json » sans une requête préalable (CORS), que nous ne servons pas. Les deux contrôles
// ensemble ferment la porte aux requêtes forgées depuis un autre site (CSRF), même avec un cookie de session.
// Origines admises : l'hôte de la requête lui-même (https, ou localhost en test), et la liste ORIGINES_AUTORISEES
// (ou CONTACT_ORIGINS, l'ancien nom), séparée par des virgules. GET, HEAD et OPTIONS ne sont pas concernés.
'use strict';
const LECTURE = ['GET', 'HEAD', 'OPTIONS'];

function origineAutorisee(req) {
  const h = (req && req.headers) || {};
  if (h['sec-fetch-site'] && !['same-origin', 'none'].includes(String(h['sec-fetch-site']))) return false;
  let u; try { u = new URL(h.origin); } catch { return false; }
  const hote = String(h['x-forwarded-host'] || h.host || '').toLowerCase();
  if (u.host.toLowerCase() === hote && (u.protocol === 'https:' || /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(hote))) return true;
  const liste = String(process.env.ORIGINES_AUTORISEES || process.env.CONTACT_ORIGINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return liste.includes(String(h.origin).toLowerCase());
}
const json = req => /^application\/json\s*(;|$)/i.test(String(((req && req.headers) || {})['content-type'] || ''));

/* null si la requête peut passer ; sinon [code, corps] à renvoyer tel quel */
function ecriture(req) {
  const m = String((req && req.method) || 'GET').toUpperCase();
  if (LECTURE.includes(m)) return null;
  if (!origineAutorisee(req)) return [403, { ok: false, erreur: 'origine', raison: 'Requête refusée : elle ne vient pas de ce site.' }];
  if (!json(req)) return [415, { ok: false, erreur: 'format', raison: 'Requête refusée : le corps doit être en JSON.' }];
  return null;
}

module.exports = { ecriture, origineAutorisee, json };

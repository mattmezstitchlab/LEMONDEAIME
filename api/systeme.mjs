// /api/systeme : la lecture d'inspection du système nerveux (/systeme-nerveux).
// La lecture publique est un fichier du site ; celle-ci (modules, données, tests, doublons) n'est servie
// qu'aux personnes autorisées : connectées, et dont l'adresse figure dans AIME_INSPECTION (adresses séparées par des virgules).
// Rien de secret n'y figure : ni variable d'environnement, ni donnée d'une personne, ni contenu de la base.
import { readFileSync } from 'node:fs';
import { auth, personne } from './_auth/auth.mjs';
import { entrees, compter } from '../cartographie/outils.mjs';

function json(res, code, o) { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store, private'); res.end(JSON.stringify(o)); }
const fichier = n => JSON.parse(readFileSync(new URL('../cartographie/' + n, import.meta.url), 'utf8'));
/* lus au chargement : si la carte manquait au déploiement, la fonction échouerait tout de suite (500),
   même sans session ; une réponse 401 en déploiement prouve donc aussi que la carte est bien embarquée */
const RESEAU = fichier('reseau.json'), INVENTAIRE = fichier('inventaire.json');
export const autorise = (email, liste = process.env.AIME_INSPECTION || '') =>
  !!email && liste.split(',').map(x => x.trim().toLowerCase()).filter(x => x.includes('@')).includes(String(email).trim().toLowerCase());

export function lectureInspection() {
  const reseau = RESEAU, inventaire = INVENTAIRE;
  let preuves = {}; try { preuves = fichier('preuves.json'); } catch { /* aucun parcours enregistré */ }
  // la présence d'une configuration serveur ne sort pas, même sans nom ni valeur
  const serveur = inventaire.serveur.map(({ configuration, ...s }) => s); // eslint-disable-line no-unused-vars
  return { reseau, inventaire: { ...inventaire, serveur }, preuves, entrees: entrees(inventaire), comptes: compter(reseau) };
}

export async function traiter(req, res, { qui = personne, ouvert = () => !!auth() } = {}) {
  if (req.method !== 'GET') return json(res, 405, { ok: false });
  if (!ouvert()) return json(res, 503, { ok: false, raison: 'Les comptes ne sont pas encore ouverts sur cet environnement.' });
  const moi = await qui(req).catch(() => null);
  if (!moi) return json(res, 401, { ok: false, raison: 'Entrez dans AIME pour la lecture d’inspection.' });
  if (!autorise(moi.email)) return json(res, 403, { ok: false, raison: 'La lecture d’inspection est réservée aux personnes autorisées.' });
  return json(res, 200, { ok: true, ...lectureInspection() });
}
export default function systeme(req, res) { return traiter(req, res); }

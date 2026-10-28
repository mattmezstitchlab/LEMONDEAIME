// AIME · les quotas partagés entre instances (audit Vercel, PR 2). Une fonction Vercel a plusieurs instances : un compteur en
// mémoire ne voit que la sienne. Ici, chaque compteur est une ligne de la table « quotas » (db/migrations/2026-10-24-06-quotas.sql),
// incrémentée en une seule requête atomique (insert … on conflict do update … returning n), par fenêtre fixe.
// Vie privée : la clé ne contient jamais une adresse IP ni un identifiant en clair, seulement leur empreinte HMAC ; les lignes
// de plus de 48 heures sont effacées au passage.
// Repli : sans base, ou tant que la migration n'est pas appliquée, le compteur reste en mémoire (le comportement d'avant),
// et la réponse le dit (partage: false). Un quota ne bloque jamais le site à cause d'une panne de base.
// En CommonJS exprès : api/contact.js et les fonctions du direct sont en CommonJS ; un module .mjs y casserait sous Node 20.
'use strict';
const crypto = require('crypto');

const memoire = new Map();
let pool = null, tableAbsente = 0, nettoye = 0;
const DUREE_GARDE_H = 48;

function secret() { return process.env.QUOTAS_SECRET || process.env.BETTER_AUTH_SECRET || 'aime-quotas'; }
/* l'empreinte d'une valeur (IP, identifiant) : jamais la valeur elle-même */
function empreinte(v) { return crypto.createHmac('sha256', secret()).update(String(v == null ? '' : v)).digest('base64url').slice(0, 24); }
function ipDe(req) {
  const h = (req && req.headers) || {};
  return String(h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || (req && req.socket && req.socket.remoteAddress) || 'inconnue').trim().slice(0, 64);
}

/* une connexion à la base, propre à ce module (pour les fonctions qui n'en ont pas) ; même règle TLS que api/_auth/auth.mjs */
function base() {
  if (pool) return pool;
  const url = process.env.DATABASE_URL; if (!url) return null;
  try {
    const pg = require('pg'), u = new URL(url); u.searchParams.delete('sslmode');
    pool = new pg.Pool({ connectionString: u.toString(), max: 2, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: true } });
    pool.on('error', () => {});
    return pool;
  } catch { return null; }
}

function enMemoire(cle, max, fenetreS, t) {
  const debut = Math.floor(t / (fenetreS * 1000)) * fenetreS * 1000, k = cle + '@' + debut;
  const n = (memoire.get(k) || 0) + 1; memoire.set(k, n);
  if (memoire.size > 20000) memoire.clear();
  return { n, debut };
}

/* compter(nom, valeur, { max, fenetre }) → { ok, attente (secondes), n, partage }
   nom : le quota (« contact:ip », « espaces:inviter »…) ; valeur : ce qu'on compte (une IP, un identifiant), jamais stocké en clair ;
   fenetre : en secondes. opts.db : une connexion déjà ouverte (pg.Pool), sinon celle de ce module. */
async function compter(nom, valeur, { max, fenetre }, opts = {}) {
  const t = opts.maintenant || Date.now(), cle = (String(nom) + ':' + empreinte(valeur)).slice(0, 120);
  const debut = Math.floor(t / (fenetre * 1000)) * fenetre * 1000, fin = debut + fenetre * 1000;
  const reponse = (n, partage) => ({ ok: n <= max, n, attente: n <= max ? 0 : Math.max(1, Math.ceil((fin - t) / 1000)), partage });
  const db = opts.db || base();
  if (db && Date.now() - tableAbsente > 60000) {
    try {
      const { rows } = await db.query('insert into quotas (cle, fenetre, n) values ($1, $2, 1) on conflict (cle, fenetre) do update set n = quotas.n + 1 returning n', [cle, new Date(debut)]);
      if (Date.now() - nettoye > 600000) { nettoye = Date.now(); db.query("delete from quotas where fenetre < now() - interval '" + DUREE_GARDE_H + " hours'").catch(() => {}); }
      return reponse(rows[0].n, true);
    } catch (e) { if (e && e.code === '42P01') tableAbsente = Date.now(); }
  }
  return reponse(enMemoire(cle, max, fenetre, t).n, false);
}

/* les quotas du site, en un seul endroit */
const QUOTAS = {
  'contact:ip': { max: 3, fenetre: 600 },           /* le formulaire de contact : 3 envois par adresse IP et par 10 minutes */
  'contact:tous': { max: 30, fenetre: 3600 },       /* … et 30 par heure pour tout le site */
  'remontee:personne': { max: 5, fenetre: 600 },    /* « Transmettre à AIME » : 5 par personne et par 10 minutes */
  'lien:ip': { max: 10, fenetre: 3600 },            /* liens de connexion (e-mails) : 10 par adresse IP et par heure */
  'espaces:inviter': { max: 60, fenetre: 3600 },    /* invitations : 60 par personne et par heure (et 50 en attente par projet, déjà) */
  'espaces:creer': { max: 10, fenetre: 3600 },      /* projets créés : 10 par personne et par heure */
  'carte:enregistrer': { max: 60, fenetre: 3600 },  /* la Carte enregistrée sur le compte : 60 enregistrements par personne et par heure */
  'carte:lecture': { max: 120, fenetre: 600 },      /* une Carte ouverte par son lien public : 120 ouvertures par adresse IP et par 10 minutes */
  'demande:personne': { max: 10, fenetre: 3600 },   /* demandes envoyées depuis une carte du Réseau : 10 par personne et par heure */
  'orbe:ip': { max: 20, fenetre: 600 },             /* questions à l'orbe d'une carte : 20 par adresse IP et par 10 minutes */
  'orbe:tous': { max: 600, fenetre: 3600 },         /* … et 600 par heure pour tout le site (le coût des appels à Claude) */
  'carte:demande:ip': { max: 3, fenetre: 600 },     /* écrire à une Carte : 3 demandes par adresse IP et par 10 minutes (comme Contact) */
  'carte:demande:boite': { max: 20, fenetre: 86400 },/* … et 20 demandes par Carte et par jour, pour qu'aucune personne ne soit submergée */
  'live:act': { max: 30, fenetre: 60 },             /* le direct : 30 actions par adresse IP et par minute */
  'temps:geste': { max: 60, fenetre: 60 },          /* Temps : 60 gestes par personne et par minute (lecture : aucun quota, relue toutes les 2 s) */
  'engagement:geste': { max: 60, fenetre: 3600 },  /* engagements (V1, P6) : 60 créations ou gestes par personne et par heure */
  'live:passe': { max: 20, fenetre: 60 },           /* … et 20 laissez-passer */
  'attente:ip': { max: 5, fenetre: 3600 },          /* liste d'attente de la bêta : 5 inscriptions par adresse IP et par heure */
  'attente:adresse': { max: 3, fenetre: 86400 },    /* … 3 e-mails de confirmation par adresse et par jour */
  'attente:envois': { max: 300, fenetre: 3600 }     /* … et 300 e-mails par heure pour tout le site */
};
function quota(nom, valeur, opts) { const q = QUOTAS[nom]; if (!q) return Promise.reject(new Error('quota inconnu : ' + nom)); return compter(nom, valeur, q, opts); }

module.exports = { compter, quota, QUOTAS, empreinte, ipDe, DUREE_GARDE_H, _oublier() { memoire.clear(); tableAbsente = 0; nettoye = 0; }, _pool(p) { pool = p; } };

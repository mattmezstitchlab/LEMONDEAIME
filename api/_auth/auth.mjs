// AIME · comptes (Better Auth). Connexion par lien envoyé par e-mail (Resend) puis clé d'accès (passkey).
// Aucun secret ici : DATABASE_URL, BETTER_AUTH_SECRET, RESEND_API_KEY et AUTH_EMAIL_FROM (ou AUTH_FROM) viennent de l'environnement.
// Fermé par défaut : sans base ni secret, l'instance n'est pas créée et l'API répond 503.
import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';
import { passkey } from '@better-auth/passkey';
import pg from 'pg';
import { APIError } from 'better-auth/api';
import { masquer } from './nettoyer-texte.mjs';
import { inscrire as inscrireEffacements, reprendre as reprendreEffacements, FileAbsente } from './effacements.mjs';

/* l'adresse publique : fixée par l'environnement, sinon l'adresse de la branche Vercel, sinon le local */
export function adresse(env = process.env) {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL.replace(/\/$/, '');
  if (env.VERCEL_BRANCH_URL) return 'https://' + env.VERCEL_BRANCH_URL;
  if (env.VERCEL_URL) return 'https://' + env.VERCEL_URL;
  return 'http://localhost:8773';
}
/* Google : seulement si l'identifiant et le secret OAuth sont posés dans l'environnement */
export function googlePret(env = process.env) { return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET); }
export function pret(env = process.env) { return !!(env.DATABASE_URL && env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length >= 32); }

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = s => String(s).replace(/[&<>"']/g, c => ESC[c]);

/* l'envoi d'e-mails : Resend, expéditeur de notre domaine vérifié ; injectable pour les tests */
let envoyeur = null;
export function _envoyeur(f) { envoyeur = f; instance = null; }
export function expediteur(env = process.env) { return env.AUTH_EMAIL_FROM || env.AUTH_FROM || env.CONTACT_FROM || ''; }
export function envoiPret(env = process.env) { return !!(envoyeur || (env.RESEND_API_KEY && expediteur(env))); }
export async function envoyer({ to, subject, text, html, replyTo }) {
  if (envoyeur) return envoyeur({ to, subject, text, html, replyTo });
  const cle = process.env.RESEND_API_KEY, de = expediteur();
  if (!cle || !de) throw new Error('envoi d\'e-mail non configuré');
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + cle, 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ from: de, to: [to], subject, text, html }, replyTo && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(replyTo) ? { reply_to: replyTo } : {})) });
  if (!r.ok) throw new Error('envoi refusé');
}
/* Le lien envoyé par e-mail : tout dans le chemin (/lien/<jeton>/<page>), sans « ?token=… ».
   Certaines messageries et certains navigateurs retirent les paramètres d'une adresse au clic : un chemin, lui, passe toujours. */
export function lienPropre(url) {
  try {
    const u = new URL(url), t = u.searchParams.get('token') || '';
    if (!/^[A-Za-z0-9_-]{8,200}$/.test(t)) return url;
    const c = u.searchParams.get('callbackURL') || '/buro';
    return u.origin + '/lien/' + t + '/' + (c === '/' ? 'accueil' : /^\/[a-z0-9-]{1,40}$/.test(c) ? c.slice(1) : 'buro');   /* « accueil » : revenir sur la page d'accueil */
  } catch { return url; }
}
function envoyerLien({ email, url: brut }) {
  const url = lienPropre(brut);
  return envoyer({ to: email, subject: 'Votre lien de connexion AIME',
    text: 'Bonjour,\n\nPour vous connecter à AIME, ouvrez ce lien (valable 15 minutes, une seule fois) :\n' + url + '\n\nSi vous n\'avez rien demandé, ignorez ce message.\n',
    html: '<p>Bonjour,</p><p>Pour vous connecter à AIME, cliquez sur ce lien (valable 15 minutes, une seule fois) :</p><p><a href="' + esc(url) + '">Me connecter à AIME</a></p><p style="color:#666">Si vous n\'avez rien demandé, ignorez ce message.</p>' });
}

/* la photo de profil : une petite image encodée (WebP, JPEG ou PNG), jamais une adresse externe ni du code */
export function imageOk(v) { return typeof v === 'string' && v.length <= 160000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(v); }
function propre(u) { const o = Object.assign({}, u); if (o.name !== undefined) o.name = String(o.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80); if ('image' in o && o.image && !imageOk(o.image)) o.image = null; return o; }

let instance = null, pool = null;
export function schemaManquant(e) { return /SCHEMA_MISMATCH|schema mismatch/i.test(String((e && (e.code || (e.cause && e.cause.code))) || '') + ' ' + String(e && e.message)); }
/* oublier l'instance : la prochaine requête relit le schéma (utile juste après une migration) */
export function oublier() { const p = pool; instance = null; pool = null; if (p) p.end().catch(() => {}); }
export function _pool() { return pool; }
export function auth(env = process.env) {
  if (instance) return instance;
  if (!pret(env)) return null;
  const base = adresse(env), hote = new URL(base).hostname;
  pool = new pg.Pool({ connectionString: (u => { u.searchParams.delete('sslmode'); return u.toString(); })(new URL(env.DATABASE_URL)), max: 3, ssl: /sslmode=disable|localhost|127\.0\.0\.1/.test(env.DATABASE_URL) ? false : { rejectUnauthorized: true } });   /* sans sslmode (avertissement de pg) : ssl est réglé ici, rejectUnauthorized = verify-full */
  instance = betterAuth({
    appName: 'AIME',
    baseURL: base,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: pool,
    trustedOrigins: [base],
    emailAndPassword: { enabled: false },
    /* « Continuer avec Google » ; une adresse déjà inscrite (lien e-mail, clé d'accès) retrouve son compte */
    socialProviders: googlePret(env) ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: 'select_account' } } : {},
    account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
    advanced: { cookiePrefix: 'aime', useSecureCookies: base.startsWith('https://'), ipAddress: { ipAddressHeaders: ['x-forwarded-for', 'x-real-ip'] } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, freshAge: 60 * 60 * 24 },
    /* supprimer son compte : session de moins de 24 h exigée ; ses espaces, ses adhésions et ses invitations partent avec */
    user: { deleteUser: { enabled: true, beforeDelete: u => effacerTraces(pool, u), afterDelete: () => reprendreEffacements(pool).catch(() => {}) } },
    rateLimit: { enabled: true, window: 60, max: 30, storage: 'memory' },
    databaseHooks: { user: {
      create: { before: async u => ({ data: propre(u) }) },
      update: { before: async d => { if ('image' in d && d.image != null && d.image !== '' && !imageOk(d.image)) return false; return { data: propre(d) }; } } } },
    plugins: [
      magicLink({ expiresIn: 60 * 15, storeToken: 'hashed', sendMagicLink: envoyerLien, rateLimit: { window: 60, max: 3 } }),
      passkey({ rpID: hote, rpName: 'AIME', origin: base })
    ]
  });
  return instance;
}

/* règle 5 : un espace garde toujours un propriétaire. Tant qu'un espace dont la personne est propriétaire compte d'autres membres,
   son compte n'est pas supprimé : elle retire d'abord ces membres (la transmission viendra avec le co-propriétaire).
   Rien n'est donc jamais effacé de ce que d'autres ont mis dans un espace partagé. */
export const PARTAGES = `select s.id::text as id, s.title from spaces s where s.owner_id = $1 and exists (select 1 from space_members m where m.space_id = s.id and m.user_id <> $1)`;
export class EspacesPartages extends Error { constructor(titres) { super('espaces partagés'); this.titres = titres; } }
/* ce que la personne laisse hors des tables de Better Auth : ses espaces (et leur direct), ses adhésions, les invitations à son adresse, sa matière du Point Zéro,
   ses ouvrages, son profil et ses traces du Réseau, sa musique et ses fichiers (cartes, activités, sessions et engagements partent par cascade) */
export async function effacerTraces(db, u) {
  const c = await db.connect();
  try {
    await c.query('begin');
    const partages = (await c.query(PARTAGES, [u.id])).rows;
    if (partages.length) throw new EspacesPartages(partages.map(x => x.title));
    const possedes = (await c.query('select id::text as id from spaces where owner_id = $1', [u.id])).rows.map(r => r.id);
    if (possedes.length) {
      const j = await c.query("select to_regclass('public.live_journal') as t");
      if (j.rows[0] && j.rows[0].t) await c.query('delete from live_journal where espace = any($1::text[])', [possedes]);
      await c.query('delete from spaces where owner_id = $1', [u.id]);
    }
    await c.query('delete from space_members where user_id = $1', [u.id]);
    if (u.email) await c.query('delete from invitations where lower(email) = lower($1) and used_at is null', [u.email]);
    const m = await c.query("select to_regclass('public.matiere') as t");
    if (m.rows[0] && m.rows[0].t) await c.query('delete from matiere where user_id = $1', [u.id]);
    const id = await c.query("select to_regclass('public.identite') as t");
    if (id.rows[0] && id.rows[0].t) await c.query('delete from identite where user_id = $1', [u.id]);
    const ou = await c.query("select to_regclass('public.ouvrages') as t");   /* les ouvrages de l'atelier partent avec le compte */
    if (ou.rows[0] && ou.rows[0].t) await c.query('delete from ouvrages where user_id = $1', [u.id]);
    const pr = await c.query("select to_regclass('public.profils') as t");   /* le profil du Réseau part avec le compte */
    if (pr.rows[0] && pr.rows[0].t) await c.query('delete from profils where user_id = $1', [u.id]);
    /* le Réseau : son calendrier, les questions posées à son orbe et les demandes qu'elle a reçues partent avec elle ;
       celles qu'elle a envoyées restent chez leur destinataire (c'est sa boîte), mais sans son nom, son adresse ni son compte */
    const rd = await c.query("select to_regclass('public.reseau_dates') as t");
    if (rd.rows[0] && rd.rows[0].t) {
      await c.query('delete from reseau_dates where user_id = $1', [u.id]);
      await c.query('delete from reseau_questions where user_id = $1', [u.id]);
      await c.query('delete from reseau_demandes where a_user = $1', [u.id]);
      /* son texte libre : nettoyé automatiquement (adresses, téléphones, liens, son nom) ; ce n'est pas une anonymisation garantie (voir nettoyer-texte.mjs) */
      const envoyees = (await c.query('select id, message, de_nom, de_email from reseau_demandes where de_user = $1', [u.id])).rows;
      for (const d of envoyees) await c.query("update reseau_demandes set de_user = '', de_nom = 'Compte supprimé', de_email = '', message = $2 where id = $1", [d.id, masquer(d.message, { nom: [d.de_nom, u.name].filter(Boolean).join(' '), email: d.de_email || u.email })]);
    }
    /* sa musique : les morceaux, et les fichiers envoyés (même jamais rattachés à un morceau), inscrits pour effacement avec reprise */
    const mu = await c.query("select to_regclass('public.musiques') as t");
    const urls = mu.rows[0] && mu.rows[0].t ? (await c.query("delete from musiques where user_id = $1 returning source, lien", [u.id])).rows.filter(r => r.source === 'fichier' && r.lien).map(r => r.lien) : [];
    await inscrireEffacements(c, { urls, prefixes: ['musique/' + u.id + '/'] });
    await c.query('commit');
  } catch (e) {
    await c.query('rollback').catch(() => {});
    if (e instanceof FileAbsente) throw new APIError('INTERNAL_SERVER_ERROR', { code: 'SUPPRESSION_INDISPONIBLE', message: 'La suppression de compte est momentanément indisponible : rien n\'a été effacé. Réessayez plus tard.' });
    if (e instanceof EspacesPartages) throw new APIError('BAD_REQUEST', { code: 'ESPACES_PARTAGES', message: 'Vous êtes propriétaire d\'espaces où d\'autres personnes sont membres (' + e.titres.slice(0, 3).join(', ') + (e.titres.length > 3 ? '…' : '') + ') : retirez-les d\'abord, rien de ce qu\'elles y ont mis ne sera effacé.' });
    throw e;
  }
  finally { c.release(); }
}

/* la personne connectée, ou null : TOUJOURS depuis le cookie de session vérifié, jamais depuis le corps */
export async function personne(req) {
  const a = auth(); if (!a) return null;
  const h = new Headers(); for (const [k, v] of Object.entries(req.headers || {})) if (v != null) h.set(k, Array.isArray(v) ? v.join(', ') : String(v));
  try { const s = await a.api.getSession({ headers: h }); return s && s.user ? { id: s.user.id, email: s.user.email, nom: s.user.name || '' } : null; }
  catch (e) { if (schemaManquant(e)) { oublier(); throw e; } return null; }
}

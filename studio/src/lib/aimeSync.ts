/**
 * Les ouvrages de l'atelier dans le compte AIME.
 * Servi dans le site AIME (sous /studio/) et connecté, chaque ouvrage enregistré sur l'appareil part aussi
 * dans Votre espace (/api/ouvrages) ; à l'ouverture, les ouvrages du compte reviennent sur l'appareil.
 * Seul (hors d'AIME), rien ne change : tout reste sur l'appareil, comme avant.
 * L'appareil reste la source de travail : le compte est une copie, jamais l'inverse sans date plus récente.
 *
 * Cloisonnement (sécurité S2), dans AIME. Chaque ouvrage de l'appareil a l'un de ces états :
 *  - « compte » : le compte qui l'a créé ou ramené. Montré et envoyé seulement quand ce compte est connecté.
 *  - « appareil » : créé ici sans compte (ou ancien, vérifié libre). Reste local ; rattaché seulement par un geste explicite.
 *  - « autreCompte » : ancien, déjà rangé dans un autre compte. Jamais montré, jamais envoyé, jamais rattaché ; gardé tel quel.
 *  - ancien (aucun des trois) : laissé par une version précédente, propriétaire inconnu. Caché tant qu'il n'est pas vérifié ;
 *    à la connexion, le serveur dit s'il est à ce compte (rattaché), à un autre (autreCompte) ou à personne (appareil).
 * Rien n'est jamais effacé par ce cloisonnement.
 */
import { baseDuStudio } from "./entryNavigation";

export type OuvrageDistant = { id: string; nom: string; dossier: string; w: number; h: number; progression: number; maj: number };
export type Proprietaire = { compte?: string; appareil?: boolean; autreCompte?: boolean };
export type EnregistrementLocal = { id: string; name: string; folder: string; updated: number; w: number; h: number; progress: number; data: string } & Proprietaire;
export const TAILLE_MAX = 3_500_000; // octets de JSON par ouvrage (limite d'une requête Vercel : 4,5 Mo)
const ATTENTE = 4000; // après la dernière modification, on attend 4 s avant d'envoyer

let session: Promise<string | null> | null = null;
const enAttente = new Map<string, ReturnType<typeof setTimeout>>();

export function dansAime(): boolean { return baseDuStudio() !== ""; }
function signaler(etat: "range" | "erreur" | "trop-gros", nom: string) {
  try { window.dispatchEvent(new CustomEvent("pointzero:aime-espace", { detail: { etat, nom } })); } catch { /* hors navigateur */ }
}
/** L'identifiant du compte connecté (vérifié par le serveur), ou null hors d'AIME ou sans compte. */
export function compteCourant(): Promise<string | null> {
  if (!dansAime()) return Promise.resolve(null);
  session = session || fetch("/api/auth/get-session", { credentials: "same-origin" })
    .then(r => r.ok ? r.json() : null).then(j => (j && j.user && typeof j.user.id === "string" ? j.user.id : null)).catch(() => null);
  return session;
}
export async function estConnecte(): Promise<boolean> { return !!(await compteCourant()); }
/** Un ouvrage laissé par une version précédente : propriétaire inconnu, à vérifier. */
export const estAncien = (r: Proprietaire) => !r.compte && !r.appareil && !r.autreCompte;
/** Ce que l'appareil montre. Hors d'AIME : tout. Dans AIME : ceux du compte connecté et ceux de l'appareil ; jamais ceux d'un
 *  autre compte, ni les anciens pas encore vérifiés. */
export function visibles<T extends Proprietaire>(liste: T[], compte: string | null): T[] {
  if (!dansAime()) return liste;
  return liste.filter(r => (r.compte ? r.compte === compte : !!r.appareil && !r.autreCompte));
}
/** À la déconnexion, si la personne le choisit : les ouvrages de son compte (ceux de l'appareil restent). */
export function aEffacer<T extends { id: string } & Proprietaire>(liste: T[], compte: string): string[] {
  return liste.filter(r => r.compte === compte).map(r => r.id);
}
async function appel(corps: object): Promise<Response> {
  return fetch("/api/ouvrages", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
}
/** Après chaque enregistrement local : envoi différé (une seule requête par rafale de modifications). */
export function apresEnregistrement(r: EnregistrementLocal) {
  if (!dansAime() || !r.compte) return;   /* sans compte : reste sur l'appareil */
  const t = enAttente.get(r.id); if (t) clearTimeout(t);
  enAttente.set(r.id, setTimeout(() => { enAttente.delete(r.id); void envoyer(r); }, ATTENTE));
}
/** Envoie un ouvrage de CE compte. Renvoie true si rangé ; « autre-compte » si le serveur dit qu'il appartient à un autre compte. */
export async function envoyer(r: EnregistrementLocal): Promise<boolean | "autre-compte"> {
  const compte = await compteCourant();
  if (!compte || r.compte !== compte) return false;   /* jamais l'ouvrage d'un autre compte, ni un ouvrage de l'appareil */
  if (r.data.length > TAILLE_MAX) { signaler("trop-gros", r.name); return false; }
  try {
    const res = await appel({ id: r.id, nom: r.name, dossier: r.folder, w: r.w, h: r.h, progression: r.progress, maj: r.updated, contenu: r.data });
    if (res.status === 409) { const j = await res.json().catch(() => ({})); if (j && j.code === "autre-compte") return "autre-compte"; }
    signaler(res.ok ? "range" : "erreur", r.name); return res.ok;
  } catch { signaler("erreur", r.name); return false; }
}
export async function apresSuppression(id: string, proprietaire?: string) {
  const t = enAttente.get(id); if (t) { clearTimeout(t); enAttente.delete(id); }
  const compte = await compteCourant();
  if (!compte || proprietaire !== compte) return;   /* on ne retire du compte que ses propres ouvrages */
  try { await appel({ action: "supprimer", id }); } catch { /* la copie du compte reste : rien n'est perdu */ }
}
/** Vérifie les anciens auprès du serveur (connecté) : à ce compte, à un autre, ou à personne. Ne renvoie que les changements. */
export async function verifierAnciens(locaux: EnregistrementLocal[]): Promise<EnregistrementLocal[]> {
  const compte = await compteCourant();
  /* les anciens, et ceux mis à l'écart pour un autre compte (peut-être celui qui vient de se connecter) */
  const anciens = locaux.filter(r => estAncien(r) || (r.autreCompte && !r.compte));
  if (!compte || !anciens.length) return [];
  const res = await appel({ action: "verifier", ids: anciens.map(r => r.id) }).catch(() => null);
  if (!res || !res.ok) return [];   /* sans réponse : ils restent anciens (cachés), rien n'est perdu */
  const j = await res.json().catch(() => null) as { siens?: string[]; autres?: string[] } | null;
  if (!j || !Array.isArray(j.siens) || !Array.isArray(j.autres)) return [];
  const siens = new Set(j.siens), autres = new Set(j.autres);
  /* à ce compte : rattaché ; à un autre : mis à l'écart ; à personne : de l'appareil, sauf s'il avait déjà été vu dans un autre
     compte (ce compte a pu le retirer, ou disparaître : on ne le donne pas pour autant à quelqu'un d'autre) */
  return anciens.flatMap((r): EnregistrementLocal[] => siens.has(r.id) ? [{ ...r, compte, autreCompte: undefined }] : autres.has(r.id) ? (r.autreCompte ? [] : [{ ...r, autreCompte: true }]) : r.autreCompte ? [] : [{ ...r, appareil: true }]);
}
/**
 * Ramène sur l'appareil les ouvrages du compte plus récents (ou absents). Renvoie ceux écrits.
 * `lireLocal` / `ecrireLocal` = la bibliothèque IndexedDB de l'atelier (injectées pour rester testables).
 */
export async function tirer(lireLocal: () => Promise<EnregistrementLocal[]>, ecrireLocal: (r: EnregistrementLocal) => Promise<unknown>, utile: (r: EnregistrementLocal) => boolean = () => true): Promise<string[]> {
  const compte = await compteCourant();
  if (!compte) return [];
  const res = await fetch("/api/ouvrages", { credentials: "same-origin" }).catch(() => null);
  if (!res || !res.ok) return [];
  const { ouvrages = [] } = await res.json().catch(() => ({})) as { ouvrages?: OuvrageDistant[] };
  const locaux = new Map((await lireLocal()).map(r => [r.id, r]));
  for (const v of await verifierAnciens([...locaux.values()])) { locaux.set(v.id, v); await ecrireLocal(v); }   /* classés, jamais effacés */
  const ecrits: string[] = [];
  for (const o of ouvrages) {
    let l = locaux.get(o.id);
    if (l && (l.autreCompte || (l.compte && l.compte !== compte))) continue;   /* (déjà reclassé ci-dessus s'il est à ce compte) */   /* l'ouvrage d'un autre compte sur cet appareil : on n'y touche pas */
    if (l && !l.compte) {   /* de l'appareil mais déjà dans ce compte : c'est le sien, on le lui rattache */
      l = { ...l, compte, appareil: undefined }; locaux.set(l.id, l);
      if (l.updated >= o.maj) await ecrireLocal(l);   /* rattaché, pas « récupéré » */
    }
    if (l && l.updated >= o.maj) { if (l.updated > o.maj) apresEnregistrement(l); continue; } // l'appareil est à jour, ou plus récent : on renvoie
    const c = await fetch("/api/ouvrages?id=" + encodeURIComponent(o.id), { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!c || typeof c.contenu !== "string") continue;
    await ecrireLocal({ id: o.id, name: o.nom, folder: o.dossier, updated: o.maj, w: o.w, h: o.h, progress: o.progression, data: c.contenu, compte });
    ecrits.push(o.id);
  }
  /* un ouvrage DE CE COMPTE jamais envoyé part aussi ; ceux de l'appareil ou d'un autre compte restent sur l'appareil */
  const distants = new Set(ouvrages.map(o => o.id));
  for (const l of locaux.values()) if (l.compte === compte && !distants.has(l.id) && utile(l)) apresEnregistrement(l);
  return ecrits;
}
/** Rattacher un ouvrage de l'appareil au compte connecté, par un geste explicite. Le serveur refuse s'il est déjà dans un
 *  autre compte. Renvoie l'ouvrage à enregistrer (rattaché, ou marqué « autreCompte »), ou null si rien n'a changé. */
export async function rattacher(r: EnregistrementLocal): Promise<EnregistrementLocal | null> {
  const compte = await compteCourant();
  if (!compte || r.compte || !r.appareil || r.autreCompte) return null;
  const x = { ...r, compte, appareil: undefined };
  const fait = await envoyer(x);
  if (fait === "autre-compte") return { ...r, autreCompte: true, appareil: undefined };
  return fait ? x : null;
}
export function _oublierSession() { session = null; }

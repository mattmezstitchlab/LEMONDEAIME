/**
 * Les ouvrages de l'atelier dans le compte AIME.
 * Servi dans le site AIME (sous /studio/) et connecté, chaque ouvrage enregistré sur l'appareil part aussi
 * dans Votre espace (/api/ouvrages) ; à l'ouverture, les ouvrages du compte reviennent sur l'appareil.
 * Seul (hors d'AIME) ou sans compte, rien ne change : tout reste sur l'appareil, comme avant.
 * L'appareil reste la source de travail : le compte est une copie, jamais l'inverse sans date plus récente.
 * Cloisonnement (sécurité S2) : chaque ouvrage de l'appareil porte le compte qui l'a créé ou ramené (« compte »).
 * Seuls les ouvrages du compte connecté sont montrés et envoyés ; ceux d'un autre compte restent invisibles et ne partent jamais.
 * Un ouvrage sans propriétaire (créé sans compte) reste sur l'appareil jusqu'à un rattachement explicite (rattacher).
 */
import { baseDuStudio } from "./entryNavigation";

export type OuvrageDistant = { id: string; nom: string; dossier: string; w: number; h: number; progression: number; maj: number };
export type EnregistrementLocal = { id: string; name: string; folder: string; updated: number; w: number; h: number; progress: number; data: string; compte?: string };
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
/** Ce que l'appareil montre : les ouvrages du compte connecté et ceux sans propriétaire ; jamais ceux d'un autre compte. */
export function visibles<T extends { compte?: string }>(liste: T[], compte: string | null): T[] {
  return liste.filter(r => !r.compte || r.compte === compte);
}
/** À la déconnexion, si la personne le choisit : les ouvrages de son compte (ceux sans propriétaire restent). */
export function aEffacer<T extends { id: string; compte?: string }>(liste: T[], compte: string): string[] {
  return liste.filter(r => r.compte === compte).map(r => r.id);
}
async function appel(corps: object): Promise<Response> {
  return fetch("/api/ouvrages", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
}
/** Après chaque enregistrement local : envoi différé (une seule requête par rafale de modifications). */
export function apresEnregistrement(r: EnregistrementLocal) {
  if (!dansAime() || !r.compte) return;   /* sans propriétaire : reste sur l'appareil */
  const t = enAttente.get(r.id); if (t) clearTimeout(t);
  enAttente.set(r.id, setTimeout(() => { enAttente.delete(r.id); void envoyer(r); }, ATTENTE));
}
export async function envoyer(r: EnregistrementLocal): Promise<boolean> {
  const compte = await compteCourant();
  if (!compte || r.compte !== compte) return false;   /* jamais l'ouvrage d'un autre compte, ni un ouvrage sans propriétaire */
  if (r.data.length > TAILLE_MAX) { signaler("trop-gros", r.name); return false; }
  try {
    const res = await appel({ id: r.id, nom: r.name, dossier: r.folder, w: r.w, h: r.h, progression: r.progress, maj: r.updated, contenu: r.data });
    signaler(res.ok ? "range" : "erreur", r.name); return res.ok;
  } catch { signaler("erreur", r.name); return false; }
}
export async function apresSuppression(id: string, proprietaire?: string) {
  const t = enAttente.get(id); if (t) { clearTimeout(t); enAttente.delete(id); }
  const compte = await compteCourant();
  if (!compte || proprietaire !== compte) return;   /* on ne retire du compte que ses propres ouvrages */
  try { await appel({ action: "supprimer", id }); } catch { /* la copie du compte reste : rien n'est perdu */ }
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
  const ecrits: string[] = [];
  for (const o of ouvrages) {
    let l = locaux.get(o.id);
    if (l && l.compte && l.compte !== compte) continue;   /* l'ouvrage d'un autre compte sur cet appareil : on n'y touche pas */
    if (l && !l.compte) {   /* sans propriétaire mais déjà dans ce compte : c'est le sien, on le lui rattache */
      l = { ...l, compte }; locaux.set(l.id, l);
      if (l.updated >= o.maj) await ecrireLocal(l);   /* rattaché, pas « récupéré » */
    }
    if (l && l.updated >= o.maj) { if (l.updated > o.maj) apresEnregistrement(l); continue; } // l'appareil est à jour, ou plus récent : on renvoie
    const c = await fetch("/api/ouvrages?id=" + encodeURIComponent(o.id), { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!c || typeof c.contenu !== "string") continue;
    await ecrireLocal({ id: o.id, name: o.nom, folder: o.dossier, updated: o.maj, w: o.w, h: o.h, progress: o.progression, data: c.contenu, compte });
    ecrits.push(o.id);
  }
  /* un ouvrage DE CE COMPTE jamais envoyé part aussi ; ceux sans propriétaire ou d'un autre compte restent sur l'appareil */
  const distants = new Set(ouvrages.map(o => o.id));
  for (const l of locaux.values()) if (l.compte === compte && !distants.has(l.id) && utile(l)) apresEnregistrement(l);
  return ecrits;
}
/** Rattacher un ouvrage sans propriétaire au compte connecté, par un geste explicite. Renvoie l'ouvrage rattaché (à enregistrer), ou null. */
export async function rattacher(r: EnregistrementLocal): Promise<EnregistrementLocal | null> {
  const compte = await compteCourant();
  if (!compte || r.compte) return null;
  const x = { ...r, compte };
  await envoyer(x);
  return x;
}
export function _oublierSession() { session = null; }

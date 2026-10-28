/**
 * Les ouvrages de l'atelier dans le compte AIME.
 * Servi dans le site AIME (sous /studio/) et connecté, chaque ouvrage enregistré sur l'appareil part aussi
 * dans Votre espace (/api/ouvrages) ; à l'ouverture, les ouvrages du compte reviennent sur l'appareil.
 * Seul (hors d'AIME) ou sans compte, rien ne change : tout reste sur l'appareil, comme avant.
 * L'appareil reste la source de travail : le compte est une copie, jamais l'inverse sans date plus récente.
 */
import { baseDuStudio } from "./entryNavigation";

export type OuvrageDistant = { id: string; nom: string; dossier: string; w: number; h: number; progression: number; maj: number };
export type EnregistrementLocal = { id: string; name: string; folder: string; updated: number; w: number; h: number; progress: number; data: string };
export const TAILLE_MAX = 3_500_000; // octets de JSON par ouvrage (limite d'une requête Vercel : 4,5 Mo)
const ATTENTE = 4000; // après la dernière modification, on attend 4 s avant d'envoyer

let session: Promise<boolean> | null = null;
const enAttente = new Map<string, ReturnType<typeof setTimeout>>();

export function dansAime(): boolean { return baseDuStudio() !== ""; }
function signaler(etat: "range" | "erreur" | "trop-gros", nom: string) {
  try { window.dispatchEvent(new CustomEvent("pointzero:aime-espace", { detail: { etat, nom } })); } catch { /* hors navigateur */ }
}
export function estConnecte(): Promise<boolean> {
  if (!dansAime()) return Promise.resolve(false);
  session = session || fetch("/api/auth/get-session", { credentials: "same-origin" })
    .then(r => r.ok ? r.json() : null).then(j => !!(j && j.user)).catch(() => false);
  return session;
}
async function appel(corps: object): Promise<Response> {
  return fetch("/api/ouvrages", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });
}
/** Après chaque enregistrement local : envoi différé (une seule requête par rafale de modifications). */
export function apresEnregistrement(r: EnregistrementLocal) {
  if (!dansAime()) return;
  const t = enAttente.get(r.id); if (t) clearTimeout(t);
  enAttente.set(r.id, setTimeout(() => { enAttente.delete(r.id); void envoyer(r); }, ATTENTE));
}
export async function envoyer(r: EnregistrementLocal): Promise<boolean> {
  if (!(await estConnecte())) return false;
  if (r.data.length > TAILLE_MAX) { signaler("trop-gros", r.name); return false; }
  try {
    const res = await appel({ id: r.id, nom: r.name, dossier: r.folder, w: r.w, h: r.h, progression: r.progress, maj: r.updated, contenu: r.data });
    signaler(res.ok ? "range" : "erreur", r.name); return res.ok;
  } catch { signaler("erreur", r.name); return false; }
}
export async function apresSuppression(id: string) {
  const t = enAttente.get(id); if (t) { clearTimeout(t); enAttente.delete(id); }
  if (!(await estConnecte())) return;
  try { await appel({ action: "supprimer", id }); } catch { /* la copie du compte reste : rien n'est perdu */ }
}
/**
 * Ramène sur l'appareil les ouvrages du compte plus récents (ou absents). Renvoie ceux écrits.
 * `lireLocal` / `ecrireLocal` = la bibliothèque IndexedDB de l'atelier (injectées pour rester testables).
 */
export async function tirer(lireLocal: () => Promise<EnregistrementLocal[]>, ecrireLocal: (r: EnregistrementLocal) => Promise<unknown>, utile: (r: EnregistrementLocal) => boolean = () => true): Promise<string[]> {
  if (!(await estConnecte())) return [];
  const res = await fetch("/api/ouvrages", { credentials: "same-origin" }).catch(() => null);
  if (!res || !res.ok) return [];
  const { ouvrages = [] } = await res.json().catch(() => ({})) as { ouvrages?: OuvrageDistant[] };
  const locaux = new Map((await lireLocal()).map(r => [r.id, r]));
  const ecrits: string[] = [];
  for (const o of ouvrages) {
    const l = locaux.get(o.id);
    if (l && l.updated >= o.maj) { if (l.updated > o.maj) apresEnregistrement(l); continue; } // l'appareil est à jour, ou plus récent : on renvoie
    const c = await fetch("/api/ouvrages?id=" + encodeURIComponent(o.id), { credentials: "same-origin" }).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!c || typeof c.contenu !== "string") continue;
    await ecrireLocal({ id: o.id, name: o.nom, folder: o.dossier, updated: o.maj, w: o.w, h: o.h, progress: o.progression, data: c.contenu });
    ecrits.push(o.id);
  }
  /* un ouvrage de l'appareil jamais envoyé part aussi */
  const distants = new Set(ouvrages.map(o => o.id));
  for (const l of locaux.values()) if (!distants.has(l.id) && utile(l)) apresEnregistrement(l);
  return ecrits;
}
export function _oublierSession() { session = null; }

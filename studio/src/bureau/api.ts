/**
 * Le Bureau parle à /api/contenus et aux comptes (/api/auth). Le serveur décide de tout : ces appels ne font que demander.
 */
import type { Contenus } from "../components/edition/contenus";
import type { Ecart } from "../components/edition/validation.mjs";

export interface Version { id: string; page: string; etat: "brouillon" | "publie" | "archive"; note: string; cree_le: string; publie_le: string | null; restaure_de: string | null }
export interface MediaEnvoye { id: string; url: string; genre: "image" | "video" | "affiche"; mime: string; poids: number; role: string; parent_id: string | null; largeur: number | null; hauteur: number | null; alt: string; legende: string; licence: string; reconstitution: boolean; provenance: string; credit: string }
export interface Reponse<T> { ok: boolean; code: number; raison?: string; ecarts?: Ecart[]; donnees?: T }

async function appel<T>(url: string, corps?: unknown): Promise<Reponse<T>> {
  try {
    const r = await fetch(url, corps === undefined ? { credentials: "same-origin", headers: { Accept: "application/json" } }
      : { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corps) });
    const j = await r.json().catch(() => null);
    if (!j) return { ok: false, code: r.status, raison: "Le serveur ne répond pas comme prévu (API absente ?)." };
    return { ok: r.ok && j.ok !== false, code: r.status, raison: j.raison, ecarts: j.ecarts, donnees: j as T };
  } catch { return { ok: false, code: 0, raison: "Réseau indisponible : réessayez." }; }
}

export const api = {
  session: () => appel<{ user?: { email: string; name?: string } } | null>("/api/auth/get-session"),
  moi: () => appel<{ admin: boolean }>("/api/contenus?moi=1"),
  /** le lien de connexion, envoyé par e-mail ; il ramène au Bureau */
  lien: (email: string) => appel("/api/auth/sign-in/magic-link", { email, callbackURL: "/bureau" }),
  sortir: () => appel("/api/auth/sign-out", {}),
  etat: () => appel<{ publie: { id: string; publie_le: string } | null; versions: Version[] }>("/api/contenus?admin=1"),
  version: (id: string) => appel<{ version: Version; contenus: Contenus; ecarts: Ecart[] }>("/api/contenus?version=" + encodeURIComponent(id)),
  enregistrer: (contenus: Contenus, note: string) => appel<{ id: string }>("/api/contenus", { action: "enregistrer", contenus, note }),
  publier: (id: string) => appel<{ id: string }>("/api/contenus", { action: "publier", id }),
  restaurer: (id: string) => appel<{ id: string }>("/api/contenus", { action: "restaurer", id }),
  medias: () => appel<{ medias: MediaEnvoye[] }>("/api/contenus?medias=1"),
  decrireMedia: (media: Record<string, unknown>) => appel<{ id: string }>("/api/contenus", { action: "media", media }),
};

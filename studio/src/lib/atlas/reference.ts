/**
 * .0NE → ATLAS : ouvrir une création publique d'ATLAS par sa référence, sans rien recopier.
 *
 *   { format: "atlas-reference", version: 1, type: "composition", id: "…" }  →  <ATLAS>/composition/<id>
 *
 * - La référence est vérifiée avant tout : format, version, type connu, identifiant (minuscules, chiffres, tirets).
 * - L'adresse construite reste sur ATLAS (ATLAS_URL, une seule source) ; rien n'y est ajouté :
 *   ni préférence, ni identité, ni univers d'origine.
 * - verifierCreation() lit seulement la fiche publique (creations/<id>.json, servie par ATLAS avec CORS) pour dire honnêtement
 *   si la création est publiée ; elle ne garde que le titre. Les blocs ne sont ni copiés ni affichés dans .0NE.
 * Contrat côté ATLAS : docs/PUBLICATION.md du dépôt Atlas-de-pique-de-coeur.
 */
import { ATLAS_URL } from "../destinations";

export interface ReferenceAtlas { format: "atlas-reference"; version: 1; type: "composition"; id: string; titre?: string }
export type Adresse = { ok: true; url: string; fiche: string } | { ok: false; raison: string };
export type EtatCreation =
  | { etat: "publiee"; titre: string; url: string }
  | { etat: "invalide" | "absente" | "privee" | "non-publiee" | "injoignable"; raison: string };

const ID = /^[a-z0-9-]{1,80}$/;
const base = (b: string) => (b.endsWith("/") ? b : b + "/");

export function adresseAtlas(ref: unknown, atlas: string = ATLAS_URL): Adresse {
  const r = ref as Partial<ReferenceAtlas> | null;
  if (!r || typeof r !== "object") return { ok: false, raison: "Cette référence est illisible." };
  if (r.format !== "atlas-reference" || r.version !== 1) return { ok: false, raison: "Ce n'est pas une référence ATLAS (format ou version inconnus)." };
  if (r.type !== "composition") return { ok: false, raison: "Ce type de création ATLAS n'est pas encore ouvert par .0NE." };
  if (typeof r.id !== "string" || !ID.test(r.id)) return { ok: false, raison: "L'identifiant de la création est invalide." };
  const b = base(atlas), url = new URL("composition/" + r.id, b).href, fiche = new URL("creations/" + r.id + ".json", b).href;
  if (!url.startsWith(b) || !fiche.startsWith(b)) return { ok: false, raison: "Cette adresse ne mène pas à ATLAS." };
  return { ok: true, url, fiche };
}

/** Dire si la création est publiée, d'après sa seule fiche publique. Aucune donnée n'est gardée, à part son titre. */
export async function verifierCreation(ref: unknown, lire: typeof fetch = fetch, atlas: string = ATLAS_URL): Promise<EtatCreation> {
  const a = adresseAtlas(ref, atlas);
  if (!a.ok) return { etat: "invalide", raison: a.raison };
  const id = (ref as ReferenceAtlas).id;
  let reponse: Response;
  try { reponse = await lire(a.fiche, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-cache" }); }
  catch { return { etat: "injoignable", raison: "ATLAS ne répond pas pour l'instant." }; }
  if (reponse.status === 404) return { etat: "absente", raison: "Cette création n'est pas (encore) publiée dans ATLAS." };
  if (!reponse.ok) return { etat: "injoignable", raison: `ATLAS ne répond pas pour l'instant (erreur ${reponse.status}).` };
  let f: Record<string, unknown>;
  try { f = await reponse.json(); } catch { return { etat: "invalide", raison: "La fiche publiée est illisible." }; }
  if (!f || f.format !== "atlas-creation" || f.version !== 1 || f.id !== id) return { etat: "invalide", raison: "La fiche publiée ne correspond pas à cette référence." };
  if (f.visibility !== "public") return { etat: "privee", raison: "Cette création est privée : .0NE ne l'ouvre pas." };
  if (f.publicationStatus !== "publie") return { etat: "non-publiee", raison: "Cette création n'est pas publiée." };
  if (typeof f.titre !== "string" || !f.titre.trim()) return { etat: "invalide", raison: "La fiche publiée n'a pas de titre." };
  return { etat: "publiee", titre: f.titre.slice(0, 80), url: a.url };
}

/** Les créations ATLAS que .0NE propose d'ouvrir : seulement des références (type + identifiant), aucune donnée. */
export const CREATIONS_ATLAS: ReferenceAtlas[] = [
  { format: "atlas-reference", version: 1, type: "composition", id: "demonstration-un-concert-en-deux-demandes-c010df", titre: "Démonstration : un concert en deux demandes" },
];

/**
 * La Galerie des Vivants côté studio : les appels à /api/galerie (lots G2 à G5).
 * Lecture sans compte ; exposer, retirer, voter avec un compte AIME ; signaler pour tout le monde.
 */
import { FLOSS } from "../lib/dmc";
import { toObject, type Pattern } from "../lib/pattern";

export interface Oeuvre {
  id: string; titre: string; pseudo: string; description: string; histoire: string; w: number; h: number; fils: string[]; recette: string | null;
  apercu: string; votes: number; autorisations: Record<string, boolean>; realisations: unknown[]; expose_le: string;
  mienne?: boolean; jaiVote?: boolean; statut?: "visible" | "masquee" | "retiree";
}
type Reponse<T> = ({ ok: true } & T) | { ok: false; raison: string; code?: number };

async function appel<T>(url: string, init?: RequestInit): Promise<Reponse<T>> {
  try {
    const r = await fetch(url, { credentials: "same-origin", ...init }), j = await r.json().catch(() => ({}));
    return r.ok && j.ok ? j : { ok: false, raison: j.raison || "La galerie ne répond pas pour le moment.", code: r.status };
  } catch { return { ok: false, raison: "La galerie ne répond pas pour le moment." }; }
}
const poster = <T,>(corps: object) => appel<T>("/api/galerie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) });

export const lireGalerie = () => appel<{ oeuvres: Oeuvre[] }>("/api/galerie");
export const lireFiche = (id: string) => appel<{ oeuvre: Oeuvre }>("/api/galerie?id=" + encodeURIComponent(id));
export const lireMiennes = () => appel<{ oeuvres: Oeuvre[] }>("/api/galerie?miennes=1");
export const lireContenu = (id: string) => appel<{ contenu: string; titre: string; pseudo: string }>(`/api/galerie?id=${encodeURIComponent(id)}&contenu=1`);
export const voter = (id: string, oui: boolean) => poster<{ votes: number; jaiVote: boolean }>({ action: "voter", id, oui });
export const retirer = (id: string) => poster<object>({ action: "retirer", id });
export const signaler = (id: string, raison: "droits" | "contenu" | "autre", texte: string) => poster<object>({ action: "signaler", id, raison, texte });
export const exposer = (champs: { titre: string; pseudo: string; description: string; histoire: string; contenu: string; apercu: string; attestations: { auteur: boolean; public: boolean } }) =>
  poster<{ id: string }>({ action: "exposer", ...champs });

/** même règle que le serveur (api/_galerie.mjs) : imports PDF/OXS, œuvres de la galerie, démonstrations : jamais ; créations originales (rosaces 5D comprises) : oui */
export const exposable = (p: Pattern) => !(p.provenance && (["pdf", "oxs", "galerie", "demo"].includes(p.provenance.kind) || (p.provenance.personalOnly && p.provenance.kind !== "original")));

/** la vignette : une case par point, à la couleur de son fil, sur la toile (PNG, au plus ~480 px de côté) */
export function apercuDe(p: Pattern, cote = 480): string {
  const s = Math.max(1, Math.floor(cote / Math.max(p.w, p.h))), c = document.createElement("canvas");
  c.width = p.w * s; c.height = p.h * s;
  const x = c.getContext("2d"); if (!x) return "";
  x.fillStyle = "#f6f4ef"; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < p.w * p.h; i++) { const f = p.cross[i]; if (f < 0) continue; x.fillStyle = FLOSS[f]?.hex ?? "#888"; x.fillRect((i % p.w) * s, Math.floor(i / p.w) * s, s, s); }
  return c.toDataURL("image/png");
}
/** la copie envoyée : le serveur ne garde de toute façon que les champs du motif */
export const contenuDe = (p: Pattern) => JSON.stringify(toObject(p));

export const nomDuFil = (code: string) => FLOSS.find(f => f.code === code);
export const cm = (pts: number, count = 14) => (pts / count * 2.54).toLocaleString("fr-FR", { maximumFractionDigits: 1 });

/**
 * « ?ouvrir=… » : l'entrée directe dans l'atelier (depuis la carte Broderie de LE MONDE AIME).
 * Une seule valeur, lue une fois à l'ouverture puis retirée de l'adresse (comme « ?rosace= ») : aucun état n'est créé,
 * chaque valeur appelle une commande qui existe déjà (« reprendre » : l'atelier restaure le dernier ouvrage, sans visite guidée). Les anciens liens (?rosace=, ?studio=, #atelier, ?offerte=) ne changent pas.
 */
export const OUVRIR = ["ouvrages", "reprendre", "composer", "importer", "fils"] as const;
export type Ouvrir = (typeof OUVRIR)[number];

export function lireOuvrir(search: string): Ouvrir | null {
  try { const v = new URLSearchParams(search).get("ouvrir"); return (OUVRIR as readonly string[]).includes(v ?? "") ? (v as Ouvrir) : null; } catch { return null; }
}
/** L'adresse sans « ouvrir » (le reste de la requête et le fragment sont conservés), ou null s'il n'y était pas. */
export function sansOuvrir(href: string): string | null {
  try { const u = new URL(href, "http://x.invalid"); if (!u.searchParams.has("ouvrir")) return null; u.searchParams.delete("ouvrir"); return u.pathname + u.search + u.hash; } catch { return null; }
}
/** Ce que l'entrée demande au Disque : s'ouvrir (toujours, sauf pour « Mes ouvrages »), sur quelle commande de la couronne. */
export function disquePour(o: Ouvrir | null): { noeud?: string } | undefined {
  if (!o || o === "ouvrages") return undefined;
  return o === "importer" || o === "fils" ? { noeud: o } : {};
}
/** Le chemin dans la couronne vers la commande « id » : au premier anneau, ou rangée dans « Plus » quand la place manque. */
export function cheminVers(modes: { id: string; enfants?: () => { id: string }[] }[], id: string): string[] {
  if (modes.some(m => m.id === id)) return [id];
  const plus = modes.find(m => m.id === "plus");
  return plus?.enfants?.().some(m => m.id === id) ? ["plus", id] : [];
}

import { computeStats, fromObject, makeId, toObject, type Pattern, type Supply } from "./pattern";
import { FLOSS, flossIndex } from "./dmc";
import { loadBrodeuseProfile, saveBrodeuseProfile } from "./brodeuseProfile";
import { apresEnregistrement, apresSuppression, compteCourant, rattacher, tirer, visibles } from "./aimeSync";

/* compte : le compte AIME propriétaire de l'ouvrage sur cet appareil ; absent = sans propriétaire (créé sans compte), reste local */
export interface ProjectRecord { id: string; name: string; folder: string; updated: number; w: number; h: number; progress: number; data: string; versions: { date: number; data: string }[]; compte?: string }
const DB = "point-zero-library";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("projects", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function request<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("projects", mode), req = fn(transaction.objectStore("projects"));
    let value: T;
    req.onsuccess = () => { value = req.result; };
    transaction.oncomplete = () => { database.close(); resolve(value); };
    const failed = () => { database.close(); reject(transaction.error ?? new Error("Transaction de sauvegarde interrompue.")); };
    transaction.onerror = failed;
    transaction.onabort = failed;
  });
}
const tousLesProjets = () => request<ProjectRecord[]>("readonly", (s) => s.getAll());
/** Les ouvrages que cet appareil montre : ceux du compte connecté et ceux sans propriétaire ; jamais ceux d'un autre compte. */
export const listProjects = async () => visibles(await tousLesProjets(), await compteCourant());
export const deleteProject = async (id: string) => {
  const old = await request<ProjectRecord | undefined>("readonly", (s) => s.get(id));
  if (!old || (old.compte && old.compte !== await compteCourant())) return;   /* l'ouvrage d'un autre compte : intouchable ici */
  const r = await request("readwrite", (s) => s.delete(id)); void apresSuppression(id, old.compte); return r;
};
/** Rattacher à son compte un ouvrage sans propriétaire : un geste explicite, jamais automatique. */
export async function rattacherProjet(id: string): Promise<boolean> {
  const old = await request<ProjectRecord | undefined>("readonly", (s) => s.get(id));
  if (!old || old.compte) return false;
  const x = await rattacher(old);
  if (!x) return false;
  await request("readwrite", (s) => s.put({ ...old, compte: x.compte } satisfies ProjectRecord));
  return true;
}
export const getProject = (record: ProjectRecord) => fromObject(JSON.parse(record.data));
export async function saveLibrary(p: Pattern, checkpoint = false): Promise<void> {
  const compte = await compteCourant();
  const id = p.id ?? makeId();
  const old = await request<ProjectRecord | undefined>("readonly", (s) => s.get(id));
  if (old && old.compte && old.compte !== compte) throw Error("Cet ouvrage appartient à un autre compte sur cet appareil : il n’est pas modifié.");   /* jamais d'écriture sur l'ouvrage d'un autre compte */
  if(old){try{if(!fromObject(JSON.parse(old.data)))throw Error();}catch{throw Error("Projet enregistré illisible : remplacement bloqué, original conservé.");}}
  const { totals } = computeStats(p), now = Date.now(), data = JSON.stringify(toObject({ ...p, id }));
  const versions = [...(old?.versions ?? [])];
  if (old && (checkpoint || now - (versions[0]?.date ?? 0) > 180000) && old.data !== data) versions.unshift({ date: old.updated, data: old.data });
  /* le propriétaire ne change jamais à l'enregistrement : un nouvel ouvrage prend le compte connecté, un ouvrage sans propriétaire le reste */
  const proprietaire = old ? old.compte : (compte ?? undefined);
  const record = { id, name: p.name, folder: p.folder ?? "", updated: now, w: p.w, h: p.h, progress: totals.units ? totals.doneUnits / totals.units : 0, data, versions: versions.slice(0, 8), ...(proprietaire ? { compte: proprietaire } : {}) } satisfies ProjectRecord;
  await request("readwrite", (s) => s.put(record));
  if (totals.units > 0) apresEnregistrement(record); // dans AIME et connecté : rangé aussi dans Votre espace (une grille vide reste sur l'appareil)
}
/** Dans AIME et connecté : ramène sur l'appareil les ouvrages du compte plus récents. L'ancienne version locale reste dans l'historique. */
export async function tirerDuCompte(): Promise<string[]> {
  return tirer(tousLesProjets, async (r) => {
    if (!fromObject(JSON.parse(r.data))) return;
    const old = await request<ProjectRecord | undefined>("readonly", (s) => s.get(r.id));
    const versions = old ? [{ date: old.updated, data: old.data }, ...old.versions].slice(0, 8) : [];
    await request("readwrite", (s) => s.put({ ...r, versions } satisfies ProjectRecord));
  }, (r) => { try { const p = getProject(r as ProjectRecord); return !!p && computeStats(p).totals.units > 0; } catch { return false; } });
}
export function readInventory(): Record<string, Supply> {
  try {
    const saved = JSON.parse(localStorage.getItem("point-zero:inventory") ?? "null") as Record<string, Supply> | null;
    if (saved && typeof saved === "object") return Object.fromEntries(Object.entries(saved).map(([code, q]) =>
      [code, { whole: Number(q?.whole ?? 0), partialMeters: Number(q?.partialMeters ?? 0), lot: q?.lot ?? "" }]));
    const profile = loadBrodeuseProfile();
    return Object.fromEntries(Object.entries(profile.stock).map(([code, q]) =>
      [code, { whole: q.skeins, partialMeters: q.remainingMeters, lot: "" }]));
  } catch { return {}; }
}
/** Stock canonique commun au rail, à la liste d'achats et à l'adaptation du profil. */
export function writeInventory(value: Record<string, Supply>) {
  const p = loadBrodeuseProfile();
  saveBrodeuseProfile({ ...p, stock: Object.fromEntries(Object.entries(value).map(([code, q]) =>
    [code, { skeins: q.whole ?? 0, remainingMeters: q.partialMeters ?? 0 }])) });
}

export function shoppingList(projects: Pattern[], inventory: Record<string, Supply>) {
  const sums = new Map<string, { code: string; name: string; meters: number; buy: number }>();
  for (const p of projects) for (const row of computeStats(p).rows) {
    const blend = FLOSS[row.idx].blend, strands = blend?.reduce((n, v) => n + v.strands, 0) ?? 1;
    for (const part of blend ?? [{ code: row.code, strands: 1 }]) {
      const name = FLOSS[flossIndex(part.code)]?.name ?? row.name;
      const old = sums.get(part.code) ?? { code: part.code, name, meters: 0, buy: 0 };
      old.meters += row.meters * part.strands / strands; sums.set(part.code, old);
    }
  }
  // meters is the sum of single-strand lengths. One physical DMC skein supplies 48 m.
  for (const row of sums.values()) { const owned = inventory[row.code]; row.buy = Math.max(0, Math.ceil((row.meters - ((owned?.whole ?? 0) * 8 + (owned?.partialMeters ?? 0)) * 6) / 48)); }
  return [...sums.values()];
}
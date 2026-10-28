import { computeStats, fromObject, makeId, toObject, type Pattern, type Supply } from "./pattern";
import { FLOSS, flossIndex } from "./dmc";
import { loadBrodeuseProfile, saveBrodeuseProfile } from "./brodeuseProfile";

export interface ProjectRecord { id: string; name: string; folder: string; updated: number; w: number; h: number; progress: number; data: string; versions: { date: number; data: string }[] }
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
export const listProjects = () => request<ProjectRecord[]>("readonly", (s) => s.getAll());
export const deleteProject = (id: string) => request("readwrite", (s) => s.delete(id));
export const getProject = (record: ProjectRecord) => fromObject(JSON.parse(record.data));
export async function saveLibrary(p: Pattern, checkpoint = false): Promise<void> {
  const id = p.id ?? makeId();
  const old = await request<ProjectRecord | undefined>("readonly", (s) => s.get(id));
  if(old){try{if(!fromObject(JSON.parse(old.data)))throw Error();}catch{throw Error("Projet enregistré illisible : remplacement bloqué, original conservé.");}}
  const { totals } = computeStats(p), now = Date.now(), data = JSON.stringify(toObject({ ...p, id }));
  const versions = [...(old?.versions ?? [])];
  if (old && (checkpoint || now - (versions[0]?.date ?? 0) > 180000) && old.data !== data) versions.unshift({ date: old.updated, data: old.data });
  await request("readwrite", (s) => s.put({ id, name: p.name, folder: p.folder ?? "", updated: now, w: p.w, h: p.h, progress: totals.units ? totals.doneUnits / totals.units : 0, data, versions: versions.slice(0, 8) } satisfies ProjectRecord));
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
/** Un dossier en mémoire, avec la même interface que FileSystemDirectoryHandle (pour les tests du Disque Terminal). */
import { Fs } from "../lib/terminal/fs";
/* — un dossier en mémoire, avec la même interface que FileSystemDirectoryHandle — */
export class FicM { kind = "file" as const; data: Uint8Array = new Uint8Array(); modifie = Date.now(); constructor(public name: string) {}
  async getFile() { return new File([this.data.slice()], this.name, { lastModified: this.modifie }); }
  async createWritable() { const f = this; let parts: BlobPart[] = []; return { async write(c: BlobPart) { parts.push(c); }, async close() { f.data = new Uint8Array(await new Blob(parts).arrayBuffer()); f.modifie = Date.now(); parts = []; } }; } }
export class DirM { kind = "directory" as const; enfants = new Map<string, DirM | FicM>(); constructor(public name: string) {}
  async getDirectoryHandle(n: string, o?: { create?: boolean }) { const e = this.enfants.get(n); if (e instanceof DirM) return e; if (e) throw Object.assign(new Error(), { name: "TypeMismatchError" }); if (!o?.create) throw Object.assign(new Error(), { name: "NotFoundError" }); const d = new DirM(n); this.enfants.set(n, d); return d; }
  async getFileHandle(n: string, o?: { create?: boolean }) { const e = this.enfants.get(n); if (e instanceof FicM) return e; if (e) throw Object.assign(new Error(), { name: "TypeMismatchError" }); if (!o?.create) throw Object.assign(new Error(), { name: "NotFoundError" }); const f = new FicM(n); this.enfants.set(n, f); return f; }
  async removeEntry(n: string) { if (!this.enfants.delete(n)) throw Object.assign(new Error(), { name: "NotFoundError" }); }
  async *entries() { for (const e of this.enfants) yield e; } }
export const nouveauFs = () => new Fs(new DirM("racine") as unknown as FileSystemDirectoryHandle, "Essai");

/**
 * Disque Terminal — le système de fichiers RÉEL sur lequel il agit (aucune simulation) :
 * - un dossier de l'ordinateur, ouvert par la personne (File System Access, Chrome et Edge sur ordinateur) ;
 * - ou l'« espace d'essai » : un vrai dossier privé, dans ce navigateur (Origin Private File System), disponible partout.
 * Les chemins sont relatifs à la racine choisie, séparés par « / » ; on ne sort jamais de la racine.
 * Supprimer met à la corbeille (.corbeille) : on peut annuler. Vider la corbeille est la seule suppression définitive.
 */

export type Genre = "dossier" | "fichier";
export interface Entree { nom: string; chemin: string; genre: Genre; taille: number; modifie: number }
export class ErreurFs extends Error { constructor(public code: "ENOENT" | "EEXIST" | "ENOTDIR" | "EISDIR" | "ENOTEMPTY" | "EINVAL" | "EPERM", message: string) { super(message); } }

export const CORBEILLE = ".corbeille";
export const normaliser = (chemin: string): string => {
  const parts: string[] = [];
  for (const p of chemin.split("/")) { if (!p || p === ".") continue; if (p === "..") { parts.pop(); continue; } parts.push(p); }
  return parts.join("/");
};
export const parent = (chemin: string) => normaliser(chemin).split("/").slice(0, -1).join("/");
export const nomDe = (chemin: string) => normaliser(chemin).split("/").pop() ?? "";
export const joindre = (...p: string[]) => normaliser(p.filter(Boolean).join("/"));
const nomValide = (n: string) => !!n && n !== "." && n !== ".." && !/[\\/\0]/.test(n) && n.length <= 255;

type Dir = FileSystemDirectoryHandle;
type Fic = FileSystemFileHandle;

export class Fs {
  constructor(public racine: Dir, public nom: string) {}

  async dossier(chemin: string, creer = false): Promise<Dir> {
    let d = this.racine;
    for (const p of normaliser(chemin).split("/").filter(Boolean)) {
      try { d = await d.getDirectoryHandle(p, { create: creer }); }
      catch (e) { throw this.erreur(e, chemin); }
    }
    return d;
  }
  async fichier(chemin: string, creer = false): Promise<Fic> {
    const n = normaliser(chemin), d = await this.dossier(parent(n));
    try { return await d.getFileHandle(nomDe(n), { create: creer }); } catch (e) { throw this.erreur(e, chemin); }
  }
  private erreur(e: unknown, chemin: string): ErreurFs {
    const nom = (e as { name?: string })?.name;
    if (nom === "NotFoundError") return new ErreurFs("ENOENT", `« ${chemin || "/"} » n’existe pas.`);
    if (nom === "TypeMismatchError") return new ErreurFs("ENOTDIR", `« ${chemin} » n’est pas du bon genre (dossier ou fichier).`);
    if (nom === "NotAllowedError" || nom === "SecurityError") return new ErreurFs("EPERM", "Permission refusée par le navigateur.");
    if (nom === "InvalidModificationError") return new ErreurFs("ENOTEMPTY", `« ${chemin} » n’est pas vide.`);
    return e instanceof ErreurFs ? e : new ErreurFs("EINVAL", (e as Error)?.message || "Opération impossible.");
  }
  async genre(chemin: string): Promise<Genre | null> {
    const n = normaliser(chemin); if (!n) return "dossier";
    const d = await this.dossier(parent(n)).catch(() => null); if (!d) return null;
    try { await d.getDirectoryHandle(nomDe(n)); return "dossier"; } catch { /* pas un dossier */ }
    try { await d.getFileHandle(nomDe(n)); return "fichier"; } catch { return null; }
  }
  async lister(chemin: string, { caches = false } = {}): Promise<Entree[]> {
    const d = await this.dossier(chemin), l: Entree[] = [];
    for await (const [nom, h] of (d as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries()) {
      if (!caches && (nom === CORBEILLE || nom === ".git")) continue;
      const c = joindre(chemin, nom);
      if (h.kind === "directory") l.push({ nom, chemin: c, genre: "dossier", taille: 0, modifie: 0 });
      else { const f = await (h as Fic).getFile(); l.push({ nom, chemin: c, genre: "fichier", taille: f.size, modifie: f.lastModified }); }
    }
    return l.sort((a, b) => (a.genre === b.genre ? 0 : a.genre === "dossier" ? -1 : 1) || a.nom.localeCompare(b.nom, "fr", { numeric: true }));
  }
  async lire(chemin: string): Promise<File> { return (await this.fichier(chemin)).getFile(); }
  async ecrire(chemin: string, contenu: Blob | ArrayBuffer | Uint8Array | string): Promise<void> {
    const n = normaliser(chemin); if (!nomValide(nomDe(n))) throw new ErreurFs("EINVAL", "Nom de fichier invalide.");
    await this.dossier(parent(n), true);
    const w = await (await this.fichier(n, true)).createWritable();
    await w.write(contenu as FileSystemWriteChunkType); await w.close();
  }
  async creerDossier(chemin: string): Promise<void> {
    const n = normaliser(chemin); if (!nomValide(nomDe(n))) throw new ErreurFs("EINVAL", "Nom de dossier invalide.");
    if (await this.genre(n)) throw new ErreurFs("EEXIST", `« ${nomDe(n)} » existe déjà.`);
    await this.dossier(n, true);
  }
  /** copier un fichier ou un dossier entier ; jamais par-dessus un élément existant */
  async copier(de: string, vers: string): Promise<void> {
    const g = await this.genre(de); if (!g) throw new ErreurFs("ENOENT", `« ${de} » n’existe pas.`);
    if (await this.genre(vers)) throw new ErreurFs("EEXIST", `« ${nomDe(vers)} » existe déjà à cet endroit.`);
    if (normaliser(vers).startsWith(normaliser(de) + "/")) throw new ErreurFs("EINVAL", "Impossible de copier un dossier dans lui-même.");
    if (g === "fichier") { await this.ecrire(vers, await this.lire(de)); return; }
    await this.dossier(vers, true);
    for (const e of await this.lister(de, { caches: true })) await this.copier(e.chemin, joindre(vers, e.nom));
  }
  async supprimerDefinitivement(chemin: string): Promise<void> {
    const n = normaliser(chemin); if (!n) throw new ErreurFs("EPERM", "On ne supprime pas la racine.");
    const d = await this.dossier(parent(n));
    try { await d.removeEntry(nomDe(n), { recursive: true }); } catch (e) { throw this.erreur(e, chemin); }
  }
  /** déplacer ou renommer : copie puis retrait (fiable partout), jamais par-dessus un élément existant */
  async deplacer(de: string, vers: string): Promise<void> {
    if (normaliser(de) === normaliser(vers)) return;
    await this.copier(de, vers); await this.supprimerDefinitivement(de);
  }
  /** supprimer = mettre à la corbeille ; renvoie le chemin dans la corbeille (pour annuler) */
  async jeter(chemin: string): Promise<string> {
    const dest = joindre(CORBEILLE, `${Date.now()}-${nomDe(chemin)}`);
    await this.dossier(CORBEILLE, true); await this.deplacer(chemin, dest); return dest;
  }
  /** parcourir tout l'arbre (pour chercher), sans la corbeille ni .git */
  async *parcourir(chemin = ""): AsyncGenerator<Entree> {
    for (const e of await this.lister(chemin)) { yield e; if (e.genre === "dossier") yield* this.parcourir(e.chemin); }
  }
}

/* — les deux racines possibles — */
export const dossierDisponible = () => typeof window !== "undefined" && "showDirectoryPicker" in window;
export const espaceDisponible = () => typeof navigator !== "undefined" && !!navigator.storage?.getDirectory;
export async function ouvrirEspaceEssai(): Promise<Fs> {
  const r = await navigator.storage.getDirectory();
  return new Fs(await r.getDirectoryHandle("espace-terminal", { create: true }), "Espace d’essai");
}
export async function ouvrirDossierOrdinateur(): Promise<Fs> {
  const h = await (window as unknown as { showDirectoryPicker(o: object): Promise<Dir> }).showDirectoryPicker({ mode: "readwrite", id: "aime-terminal" });
  return new Fs(h, h.name);
}

export const tailleLisible = (o: number) => o < 1024 ? `${o} o` : o < 1048576 ? `${(o / 1024).toFixed(o < 10240 ? 1 : 0)} Ko` : o < 1073741824 ? `${(o / 1048576).toFixed(1)} Mo` : `${(o / 1073741824).toFixed(2)} Go`;

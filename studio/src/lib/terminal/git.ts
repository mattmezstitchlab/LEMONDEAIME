/**
 * Disque Terminal — Git, réellement, dans le navigateur (isomorphic-git) sur le même dossier que les Fichiers.
 * Fait ici : état, ajouter, valider (commit), historique, différences (par fichier), branches, initialiser.
 * Pas fait ici : envoyer (push) et récupérer (pull) demandent le réseau, une authentification et un relais ;
 * ils sont annoncés comme tels (« pont local à venir »), jamais simulés.
 */
import { Buffer } from "buffer";
import { ErreurFs, normaliser, parent, nomDe, type Fs } from "./fs";

(globalThis as unknown as { Buffer?: typeof Buffer }).Buffer ??= Buffer;
type Git = typeof import("isomorphic-git");
let charge: Promise<Git> | null = null;
/* chargé seulement quand on ouvre la famille Git (le reste de .0NE ne paie pas ce poids) */
const git = () => (charge ??= import("isomorphic-git").then(m => (m as unknown as { default?: Git }).default ?? (m as unknown as Git)));

const enErreurNode = (e: unknown) => { const x = e instanceof ErreurFs ? e : new ErreurFs("EINVAL", String(e)); return Object.assign(new Error(x.message), { code: x.code }); };
const rel = (p: string) => normaliser(p.replace(/^\/+/, ""));

/** l'adaptateur : l'interface « fs.promises » qu'attend isomorphic-git, posée sur notre dossier réel */
export function adaptateur(fs: Fs) {
  const stat = async (p: string) => {
    const g = await fs.genre(rel(p)).catch(() => null);
    if (!g) throw Object.assign(new Error(`ENOENT: ${p}`), { code: "ENOENT" });
    const f = g === "fichier" ? await fs.lire(rel(p)) : null, m = f?.lastModified ?? 0;
    return { type: g === "fichier" ? "file" : "dir", mode: g === "fichier" ? 0o100644 : 0o40000, size: f?.size ?? 0, ino: 0, mtimeMs: m, ctimeMs: m, uid: 1, gid: 1, dev: 1,
      isFile: () => g === "fichier", isDirectory: () => g === "dossier", isSymbolicLink: () => false };
  };
  const promises = {
    async readFile(p: string, o?: { encoding?: string } | string) {
      try { const b = new Uint8Array(await (await fs.lire(rel(p))).arrayBuffer()); const enc = typeof o === "string" ? o : o?.encoding; return enc === "utf8" ? new TextDecoder().decode(b) : Buffer.from(b); }
      catch (e) { throw enErreurNode(e); }
    },
    async writeFile(p: string, data: Uint8Array | string) { try { await fs.ecrire(rel(p), typeof data === "string" ? data : new Uint8Array(data)); } catch (e) { throw enErreurNode(e); } },
    async unlink(p: string) { try { await fs.supprimerDefinitivement(rel(p)); } catch (e) { throw enErreurNode(e); } },
    async readdir(p: string) { try { const d = await fs.dossier(rel(p)), l: string[] = []; for await (const [n] of (d as unknown as { entries(): AsyncIterable<[string, unknown]> }).entries()) l.push(n); return l; } catch (e) { throw enErreurNode(e); } },
    async mkdir(p: string) { if (await fs.genre(rel(p))) throw Object.assign(new Error("EEXIST"), { code: "EEXIST" }); if (!(await fs.genre(parent(rel(p))))) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); await fs.dossier(rel(p), true); },
    async rmdir(p: string) { try { await fs.supprimerDefinitivement(rel(p)); } catch (e) { throw enErreurNode(e); } },
    stat, lstat: stat,
    async readlink() { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); },
    async symlink() { throw Object.assign(new Error("EPERM"), { code: "EPERM" }); },
    async chmod() { /* sans objet ici */ },
  };
  return { promises };
}

export type EtatFichier = "nouveau" | "modifie" | "supprime" | "ajoute" | "ajoute-modifie";
export interface LigneEtat { chemin: string; etat: EtatFichier; indexe: boolean }
const ETATS: Record<string, [EtatFichier, boolean]> = {
  "0,2,0": ["nouveau", false], "0,2,2": ["ajoute", true], "0,2,3": ["ajoute-modifie", true], "1,2,1": ["modifie", false], "1,2,2": ["modifie", true], "1,2,3": ["modifie", true],
  "1,0,1": ["supprime", false], "1,0,0": ["supprime", true], "1,1,0": ["supprime", true], "1,1,3": ["modifie", true], "1,2,0": ["modifie", true],
};

export class DepotGit {
  readonly dir = "/";
  constructor(private fs: Fs) {}
  private get f() { return adaptateur(this.fs); }
  async existe(): Promise<boolean> { return (await this.fs.genre(".git")) === "dossier"; }
  async initialiser(branche = "principale") { const g = await git(); await g.init({ fs: this.f, dir: this.dir, defaultBranch: branche }); }
  async branche(): Promise<string | null> { const g = await git(); return (await g.currentBranch({ fs: this.f, dir: this.dir, fullname: false })) ?? null; }
  async branches(): Promise<string[]> { const g = await git(); return g.listBranches({ fs: this.f, dir: this.dir }); }
  async etat(): Promise<LigneEtat[]> {
    const g = await git();
    const m = await g.statusMatrix({ fs: this.f, dir: this.dir, filter: (p: string) => !p.startsWith(".corbeille/") });
    return m.filter(([, h, w, s]) => !(h === 1 && w === 1 && s === 1)).map(([chemin, h, w, s]) => { const [etat, indexe] = ETATS[`${h},${w},${s}`] ?? ["modifie", false]; return { chemin, etat, indexe }; });
  }
  async ajouter(chemins: string[]) {
    const g = await git();
    for (const p of chemins) { if (await this.fs.genre(p)) await g.add({ fs: this.f, dir: this.dir, filepath: p }); else await g.remove({ fs: this.f, dir: this.dir, filepath: p }); }
  }
  async valider(message: string, auteur: { name: string; email: string }): Promise<string> {
    if (!message.trim()) throw new Error("Le message de validation est vide.");
    const g = await git(); return g.commit({ fs: this.f, dir: this.dir, message: message.trim(), author: auteur });
  }
  async historique(n = 12) { const g = await git(); try { return (await g.log({ fs: this.f, dir: this.dir, depth: n })).map(c => ({ oid: c.oid.slice(0, 7), message: c.commit.message.trim(), auteur: c.commit.author.name, date: c.commit.author.timestamp * 1000 })); } catch { return []; } }
  async creerBranche(nom: string, aller = true) {
    if (!/^[A-Za-z0-9._\-/]{1,60}$/.test(nom) || nom.includes("..")) throw new Error("Nom de branche invalide.");
    const g = await git(); await g.branch({ fs: this.f, dir: this.dir, ref: nom, checkout: aller });
  }
  async changerBranche(nom: string) { const g = await git(); await g.checkout({ fs: this.f, dir: this.dir, ref: nom }); }
  /** la différence d'un fichier texte : la version validée et la version de travail, ligne à ligne (simple, lisible) */
  async difference(chemin: string): Promise<{ avant: string; apres: string; lignes: { genre: "+" | "-" | " "; texte: string }[] }> {
    const g = await git();
    let avant = "";
    try { const oid = await g.resolveRef({ fs: this.f, dir: this.dir, ref: "HEAD" }); const { blob } = await g.readBlob({ fs: this.f, dir: this.dir, oid, filepath: chemin }); avant = new TextDecoder().decode(blob); } catch { avant = ""; }
    const apres = (await this.fs.genre(chemin)) ? await (await this.fs.lire(chemin)).text() : "";
    return { avant, apres, lignes: diffLignes(avant, apres) };
  }
}

/** différence ligne à ligne (plus longue sous-suite commune), bornée pour rester rapide */
export function diffLignes(a: string, b: string): { genre: "+" | "-" | " "; texte: string }[] {
  const A = a ? a.split("\n") : [], B = b ? b.split("\n") : [];
  if (A.length * B.length > 4_000_000) return [...A.map(t => ({ genre: "-" as const, texte: t })), ...B.map(t => ({ genre: "+" as const, texte: t }))];
  const L = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1));
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const r: { genre: "+" | "-" | " "; texte: string }[] = []; let i = 0, j = 0;
  while (i < A.length && j < B.length) { if (A[i] === B[j]) { r.push({ genre: " ", texte: A[i] }); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) r.push({ genre: "-", texte: A[i++] }); else r.push({ genre: "+", texte: B[j++] }); }
  while (i < A.length) r.push({ genre: "-", texte: A[i++] }); while (j < B.length) r.push({ genre: "+", texte: B[j++] });
  return r;
}
export { nomDe };

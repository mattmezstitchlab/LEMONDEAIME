/**
 * Les données du clip brodé (format « clip-brode » v1, produites depuis le clip rendu : mêmes fils, même temps).
 * clip.json : la palette DMC, la carte du temps, les parties de la musique, les temps forts ;
 * fils-NNN.bin.gz : 50 images par morceau, chaque image 160 × 160 octets (l'indice du fil de chaque point).
 * Les morceaux sont lus à la demande (le suivant d'avance) et gardés en petit nombre : la page reste légère sur téléphone.
 */
export interface FilClip { code: string; nom: string; rgb: [number, number, number]; clair: boolean; points: number }
export interface Clip {
  format: "clip-brode"; version: 1; titre: string; musique: string; source: string;
  grille: number; fps: number; images: number; parMorceau: number; morceaux: number; duree: number; battue: number;
  brodeJusqua: number; finDuPassage: number;
  carte: [number, number][]; parties: [number, string][]; accents: [number, number][];
  fils: FilClip[];
}

export async function lireClip(base: string, signal?: AbortSignal): Promise<Clip> {
  const r = await fetch(base + "clip.json", { signal }); if (!r.ok) throw new Error(`clip.json : ${r.status}`);
  const c = await r.json() as Clip; if (c.format !== "clip-brode" || c.version !== 1) throw new Error("format de clip inconnu");
  return c;
}

/** les morceaux d'images, lus et décompressés à la demande */
export class Morceaux {
  private prets = new Map<number, Uint8Array>(); private enCours = new Map<number, Promise<void>>();
  private controle = new AbortController();
  constructor(private base: string, private clip: Clip, private garder = 6) {}
  private charger(m: number): Promise<void> {
    if (this.prets.has(m) || m < 0 || m >= this.clip.morceaux) return Promise.resolve();
    const cours = this.enCours.get(m); if (cours) return cours;
    const p = (async () => {
      const r = await fetch(`${this.base}fils-${String(m).padStart(3, "0")}.bin.gz`, { signal: this.controle.signal }); if (!r.ok) throw new Error(`morceau ${m} : ${r.status}`);
      /* le serveur peut l'avoir déjà décompressé (Content-Encoding) : on regarde les deux premiers octets (gzip : 1f 8b) */
      const brut = new Uint8Array(await r.arrayBuffer());
      const donnees = brut[0] === 0x1f && brut[1] === 0x8b ? new Uint8Array(await new Response(new Blob([brut]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()) : brut;
      if (this.controle.signal.aborted) return;
      this.prets.set(m, donnees);
      while (this.prets.size > this.garder) { const plusVieux = this.prets.keys().next().value as number; this.prets.delete(plusVieux); }
    })().finally(() => this.enCours.delete(m));
    this.enCours.set(m, p); return p;
  }
  /** l'image n (ou null si son morceau n'est pas encore là : on le demande, et le suivant) */
  image(n: number): Uint8Array | null {
    const G = this.clip.grille, m = Math.floor(n / this.clip.parMorceau), d = this.prets.get(m);
    /* Le préchargement est opportuniste ; une fermeture peut l'annuler. */
    void this.charger(m).catch(() => {}); void this.charger(m + 1).catch(() => {});
    if (!d) return null;
    /* l'usage récent garde le morceau en mémoire */
    this.prets.delete(m); this.prets.set(m, d);
    const i = n - m * this.clip.parMorceau; if ((i + 1) * G * G > d.length) return null;
    return d.subarray(i * G * G, (i + 1) * G * G);
  }
  attendre(n: number) { const m = Math.floor(n / this.clip.parMorceau); return this.charger(m); }
  /** Abandonne les chargements et libère les morceaux à la fermeture du lecteur. */
  arreter() { this.controle.abort(); this.prets.clear(); }
}

/** les rendus du clip au fil de la musique (la démonstration), en codes du nuanceur */
export const partieEn = (p: [number, string][], code: Record<string, number>): [number, number][] => p.map(([t, m]) => [t, code[m] ?? 0]);

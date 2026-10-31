/**
 * Disque Terminal — Audio, sur les vrais fichiers : durée, métadonnées (étiquettes ID3 d'un MP3, en-tête et INFO d'un WAV),
 * forme d'onde (pour l'aperçu circulaire du centre), conversion en WAV 16 bits (décodage du navigateur).
 * Ce qui n'est pas fait ici est dit : l'encodage MP3 demande un encodeur que .0NE n'embarque pas encore.
 */
export const EXTENSIONS_AUDIO = ["mp3", "wav", "ogg", "m4a", "aac", "flac", "opus", "webm"];
export const estAudio = (nom: string) => EXTENSIONS_AUDIO.includes(nom.split(".").pop()?.toLowerCase() ?? "");

export interface Metadonnees { format: string; titre?: string; artiste?: string; album?: string; piste?: string; annee?: string; frequence?: number; canaux?: number; bits?: number }

/** lire les métadonnées sans décoder tout le fichier */
export async function metadonnees(f: Blob, nom: string): Promise<Metadonnees> {
  const ext = nom.split(".").pop()?.toLowerCase() ?? "", tete = new Uint8Array(await f.slice(0, Math.min(f.size, 262144)).arrayBuffer());
  if (ext === "wav" || (tete[0] === 0x52 && tete[1] === 0x49 && tete[2] === 0x46 && tete[3] === 0x46)) return lireWav(new Uint8Array(await f.slice(0, Math.min(f.size, 1048576)).arrayBuffer()), f);
  if (tete[0] === 0x49 && tete[1] === 0x44 && tete[2] === 0x33) return { format: "MP3", ...lireId3(tete) };
  return { format: ext.toUpperCase() || "audio" };
}

function lireId3(b: Uint8Array): Partial<Metadonnees> {
  const v = b[3], taille = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f), r: Partial<Metadonnees> = {};
  const CLES: Record<string, keyof Metadonnees> = { TIT2: "titre", TPE1: "artiste", TALB: "album", TRCK: "piste", TYER: "annee", TDRC: "annee" };
  let i = 10;
  while (i + 10 < Math.min(b.length, 10 + taille)) {
    const id = String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]); if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const n = v === 4 ? ((b[i + 4] & 0x7f) << 21) | ((b[i + 5] & 0x7f) << 14) | ((b[i + 6] & 0x7f) << 7) | (b[i + 7] & 0x7f) : (b[i + 4] << 24) | (b[i + 5] << 16) | (b[i + 6] << 8) | b[i + 7];
    if (n <= 0 || i + 10 + n > b.length) break;
    const cle = CLES[id];
    if (cle) { const enc = b[i + 10], data = b.subarray(i + 11, i + 10 + n);
      const t = enc === 1 || enc === 2 ? new TextDecoder(enc === 2 ? "utf-16be" : "utf-16").decode(data) : new TextDecoder(enc === 3 ? "utf-8" : "latin1").decode(data);
      (r as Record<string, string>)[cle] = t.replace(/\0/g, "").trim(); }
    i += 10 + n;
  }
  return r;
}

function lireWav(b: Uint8Array, f: Blob): Metadonnees {
  const d = new DataView(b.buffer, b.byteOffset, b.byteLength), r: Metadonnees = { format: "WAV" };
  const txt = (o: number, n: number) => new TextDecoder("latin1").decode(b.subarray(o, o + n)).replace(/\0/g, "").trim();
  const id4 = (o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);
  let i = 12;
  while (i + 8 <= b.length) {
    const id = id4(i), n = d.getUint32(i + 4, true);
    if (id === "fmt ") { r.canaux = d.getUint16(i + 10, true); r.frequence = d.getUint32(i + 12, true); r.bits = d.getUint16(i + 22, true); }
    if (id === "LIST" && id4(i + 8) === "INFO") {
      let j = i + 12; const fin = Math.min(i + 8 + n, b.length);
      while (j + 8 <= fin) { const k = id4(j), m = d.getUint32(j + 4, true), v = txt(j + 8, m);
        if (k === "INAM") r.titre = v; if (k === "IART") r.artiste = v; if (k === "IPRD") r.album = v; if (k === "ITRK") r.piste = v; if (k === "ICRD") r.annee = v;
        j += 8 + m + (m % 2); }
    }
    if (id === "data") break;
    i += 8 + n + (n % 2);
  }
  void f; return r;
}

/** décoder (durée exacte, forme d'onde) ; un fichier très lourd est refusé plutôt que de figer l'appareil */
export const LIMITE_DECODAGE = 250 * 1048576;
export async function decoder(f: Blob): Promise<AudioBuffer> {
  if (f.size > LIMITE_DECODAGE) throw new Error("Fichier trop lourd pour être décodé dans le navigateur (plus de 250 Mo).");
  const C = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new C(1, 1, 44100);
  return ctx.decodeAudioData(await f.arrayBuffer());
}
/** la forme d'onde, en n crêtes (0 → 1) */
export function cretes(a: AudioBuffer, n = 160): number[] {
  const c = a.getChannelData(0), pas = Math.max(1, Math.floor(c.length / n)), r: number[] = [];
  for (let k = 0; k < n; k++) { let m = 0; for (let i = k * pas; i < Math.min(c.length, (k + 1) * pas); i += 16) m = Math.max(m, Math.abs(c[i])); r.push(m); }
  const max = Math.max(...r, 1e-6); return r.map(x => x / max);
}
/** un AudioBuffer en fichier WAV PCM 16 bits */
export function versWav(a: AudioBuffer): Blob {
  const n = a.numberOfChannels, len = a.length, data = new DataView(new ArrayBuffer(44 + len * n * 2));
  const ecrire = (o: number, s: string) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  ecrire(0, "RIFF"); data.setUint32(4, 36 + len * n * 2, true); ecrire(8, "WAVE"); ecrire(12, "fmt "); data.setUint32(16, 16, true); data.setUint16(20, 1, true);
  data.setUint16(22, n, true); data.setUint32(24, a.sampleRate, true); data.setUint32(28, a.sampleRate * n * 2, true); data.setUint16(32, n * 2, true); data.setUint16(34, 16, true);
  ecrire(36, "data"); data.setUint32(40, len * n * 2, true);
  const canaux = Array.from({ length: n }, (_, k) => a.getChannelData(k));
  let o = 44; for (let i = 0; i < len; i++) for (let k = 0; k < n; k++) { const s = Math.max(-1, Math.min(1, canaux[k][i])); data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  return new Blob([data.buffer], { type: "audio/wav" });
}
/** une note d'essai (pour l'espace d'essai : un vrai fichier, annoncé comme une note de test, jamais une œuvre) */
export function noteEssai(secondes = 3, frequence = 440, taux = 22050): Blob {
  const len = secondes * taux, ctxLike = { numberOfChannels: 1, length: len, sampleRate: taux, getChannelData: () => { const c = new Float32Array(len); for (let i = 0; i < len; i++) { const t = i / taux, env = Math.min(1, t * 8) * Math.exp(-t * 0.9); c[i] = 0.5 * env * Math.sin(2 * Math.PI * frequence * t) + 0.2 * env * Math.sin(2 * Math.PI * frequence * 1.5 * t); } return c; } };
  return versWav(ctxLike as unknown as AudioBuffer);
}
export const dureeLisible = (s: number) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s`;

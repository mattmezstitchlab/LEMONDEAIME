/* Le lecteur de musique du dock : un seul lecteur pour tout le site, il continue quand on change de mode du dock.
   Deux sortes de pistes : un fichier choisi sur l'appareil (rien n'est envoyé), ou un extrait Deezer de 30 s,
   dont l'adresse est demandée au moment de jouer (elle expire vite chez Deezer, on ne la garde pas). */
import { useEffect, useState } from 'react';
import { extrait } from './musique';

export type Piste = { nom: string; url?: string; deezer?: number | null; artiste?: string; pochette?: string; lien?: string; source?: string };
type Etat = { pistes: Piste[]; i: number; joue: boolean; temps: number; duree: number };
let audio: HTMLAudioElement | null = null;
let etat: Etat = { pistes: [], i: 0, joue: false, temps: 0, duree: 0 };
const abonnes = new Set<(e: Etat) => void>();
const diffuser = (p: Partial<Etat>) => { etat = { ...etat, ...p }; abonnes.forEach(f => f(etat)); };
function lecteur() {
  if (audio) return audio;
  audio = new Audio();
  audio.addEventListener('play', () => diffuser({ joue: true }));
  audio.addEventListener('pause', () => diffuser({ joue: false }));
  audio.addEventListener('timeupdate', () => diffuser({ temps: audio!.currentTime, duree: audio!.duration || 0 }));
  audio.addEventListener('ended', () => suivant());
  return audio;
}
export function ajouter(fichiers: FileList | File[]) {
  const n = Array.from(fichiers).filter(f => f.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name))
    .map(f => ({ nom: f.name.replace(/\.[a-z0-9]+$/i, ''), url: URL.createObjectURL(f) }));
  if (!n.length) return;
  const vide = !etat.pistes.length;
  diffuser({ pistes: [...etat.pistes, ...n] });
  if (vide) void jouer(0);
}
let demande = 0;
export async function jouer(i = etat.i) {
  const a = lecteur(), p = etat.pistes[i]; if (!p) return;
  diffuser({ i });
  if (!p.url && p.deezer) {
    const n = ++demande; const r = await extrait(p.deezer); if (n !== demande) return;
    if (!r.ok || !r.extrait) { diffuser({ joue: false }); if (etat.pistes.length > 1) suivant(); return; }
    if (a.src !== r.extrait) a.src = r.extrait;
  } else if (p.url) { if (a.src !== p.url) a.src = p.url; }
  else { diffuser({ joue: false }); return; }
  a.play().catch(() => diffuser({ joue: false }));
}
/* remplacer la file : une carte, une page Musique, toute la journée */
export function jouerListe(pistes: Piste[], i = 0) { const n = pistes.filter(p => p.url || p.deezer); if (!n.length) return false; diffuser({ pistes: n, i: 0 }); void jouer(Math.min(i, n.length - 1)); return true; }
export function basculer() { const a = lecteur(); if (!etat.pistes.length) return; if (a.paused) { if (a.src) a.play().catch(() => diffuser({ joue: false })); else void jouer(); } else a.pause(); }
export function suivant() { if (etat.pistes.length) void jouer((etat.i + 1) % etat.pistes.length); }
export function precedent() { if (!etat.pistes.length) return; const a = lecteur(); if (a.currentTime > 3) { a.currentTime = 0; return; } void jouer((etat.i - 1 + etat.pistes.length) % etat.pistes.length); }
export function useLecteur() {
  const [e, setE] = useState(etat);
  useEffect(() => { abonnes.add(setE); return () => { abonnes.delete(setE); }; }, []);
  return e;
}

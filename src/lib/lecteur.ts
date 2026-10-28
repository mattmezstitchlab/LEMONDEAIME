/* Le lecteur de musique du dock : vos propres morceaux, choisis sur l'appareil. Rien n'est envoyé au serveur.
   Un seul lecteur pour tout le site : il continue quand on change de mode du dock. */
import { useEffect, useState } from 'react';

export type Piste = { nom: string; url: string };
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
  if (vide) jouer(0);
}
export function jouer(i = etat.i) {
  const a = lecteur(), p = etat.pistes[i]; if (!p) return;
  if (a.src !== p.url) a.src = p.url;
  diffuser({ i });
  a.play().catch(() => diffuser({ joue: false }));
}
export function basculer() { const a = lecteur(); if (!etat.pistes.length) return; if (a.paused) jouer(); else a.pause(); }
export function suivant() { if (etat.pistes.length) jouer((etat.i + 1) % etat.pistes.length); }
export function precedent() { if (!etat.pistes.length) return; const a = lecteur(); if (a.currentTime > 3) { a.currentTime = 0; return; } jouer((etat.i - 1 + etat.pistes.length) % etat.pistes.length); }
export function useLecteur() {
  const [e, setE] = useState(etat);
  useEffect(() => { abonnes.add(setE); return () => { abonnes.delete(setE); }; }, []);
  return e;
}

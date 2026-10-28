/* Mon confort : l'orbe du dock règle le site pour chacun (taille du texte, espacement, contraste, mouvement, sons).
   Réglé une fois, appliqué sur chaque page. Les réglages restent sur cet appareil, visibles par personne d'autre. */
import { useEffect, useState } from 'react';
import { halo, nettoyer, verifier } from './orbe-perso.js';

export type Prefs = { taille: 100 | 115 | 130; espace: 'normal' | 'aere'; contraste: 'standard' | 'renforce'; mouvement: 'normal' | 'reduit'; sons: 'off' | 'on' };
export type Profil = { id: string; nom: string; indice: string; prefs: Prefs; n: number; couleurs: string[]; w: number; halo: string; msg: string };
const CLE = 'aime-mon-confort';
const EVT = 'aime:confort';
const CLES: (keyof Prefs)[] = ['taille', 'espace', 'contraste', 'mouvement', 'sons'];

const mq = (q: string) => { try { return !!window.matchMedia?.(q).matches; } catch { return false; } };
export function prefsAppareil(): Prefs {
  return { taille: 100, espace: 'normal', contraste: mq('(prefers-contrast: more)') ? 'renforce' : 'standard', mouvement: mq('(prefers-reduced-motion: reduce)') ? 'reduit' : 'normal', sons: 'off' };
}
export function lirePrefs(): Prefs {
  const d = prefsAppareil();
  try { const p = JSON.parse(localStorage.getItem(CLE) || 'null'); if (p && typeof p === 'object') return { ...d, ...p }; } catch { /* stockage indisponible */ }
  return d;
}
export function appliquer(p: Prefs) {
  const h = document.documentElement;
  h.classList.toggle('aere', p.espace === 'aere');
  h.classList.toggle('contraste', p.contraste === 'renforce');
  h.classList.toggle('calme', p.mouvement === 'reduit');
  h.style.setProperty('--zoom', String(p.taille / 100));
  const r = document.getElementById('root');
  if (r) (r.style as CSSStyleDeclaration & { zoom: string }).zoom = p.taille === 100 ? '' : String(p.taille / 100);
}
export function ecrirePrefs(p: Prefs | null) {
  try { if (p) localStorage.setItem(CLE, JSON.stringify(p)); else localStorage.removeItem(CLE); } catch { /* reste pour la session */ }
  const v = p || prefsAppareil();
  appliquer(v);
  window.dispatchEvent(new CustomEvent(EVT, { detail: v }));
}
export function useConfort(): Prefs {
  const [p, setP] = useState(lirePrefs);
  useEffect(() => { const f = (e: Event) => setP((e as CustomEvent<Prefs>).detail); window.addEventListener(EVT, f); return () => window.removeEventListener(EVT, f); }, []);
  return p;
}
export function estPerso(p: Prefs) { const d = prefsAppareil(); return CLES.some(k => d[k] !== p[k]); }

/* Mon orbe : le dessin que la personne a composé (arcs, couleurs, épaisseur). Il reste sur cet appareil, comme Mon confort,
   et ne touche à aucun réglage d'accès. Ce qu'on relit est remis d'aplomb et refusé s'il n'est plus lisible sur le dock. */
export type Dessin = { n: number; couleurs: string[]; w: number };
const CLE_ORBE = 'aime-mon-orbe';
const EVT_ORBE = 'aime:orbe';
export function lireOrbe(): Dessin | null {
  try { const d = nettoyer(JSON.parse(localStorage.getItem(CLE_ORBE) || 'null')); return d && verifier(d).ok ? d : null; } catch { return null; }
}
export function ecrireOrbe(d: Dessin | null): boolean {
  if (d && !verifier(d).ok) return false;
  try { if (d) localStorage.setItem(CLE_ORBE, JSON.stringify(d)); else localStorage.removeItem(CLE_ORBE); } catch { /* reste pour la session */ }
  window.dispatchEvent(new CustomEvent(EVT_ORBE, { detail: d }));
  return true;
}
export function useOrbePerso(): Dessin | null {
  const [o, setO] = useState(lireOrbe);
  useEffect(() => { const f = (e: Event) => setO((e as CustomEvent<Dessin | null>).detail); window.addEventListener(EVT_ORBE, f); return () => window.removeEventListener(EVT_ORBE, f); }, []);
  return o;
}
export function enProfil(d: Dessin): Profil {
  return { id: 'perso', nom: 'Mon orbe', indice: 'Dessinée par vous', prefs: lirePrefs(), n: d.n, couleurs: d.couleurs, w: d.w, halo: halo(d), msg: 'Mon orbe est gardée sur cet appareil.' };
}

const base: Prefs = { taille: 100, espace: 'normal', contraste: 'standard', mouvement: 'normal', sons: 'off' };
const mk = (o: Partial<Prefs>): Prefs => ({ ...base, ...o });
export function profils(): Profil[] {
  return [
    { id: 'nacre', nom: 'Nacre', indice: 'Les réglages de mon appareil', prefs: prefsAppareil(), n: 12, couleurs: ['#EDE7F7', '#D9E8FF', '#FFD6EC', '#B9F0E4'], w: 2.6, halo: 'rgba(230,220,255,.55)', msg: 'Orbe Nacre : réglages de votre appareil.' },
    { id: 'lecture', nom: 'Lecture', indice: 'Texte 115 %, aéré', prefs: mk({ taille: 115, espace: 'aere' }), n: 10, couleurs: ['#4F7BFF', '#4FD6E8'], w: 3, halo: 'rgba(79,123,255,.6)', msg: 'Orbe Lecture : texte à 115 %, espacement aéré.' },
    { id: 'grand', nom: 'Grand texte', indice: 'Texte 130 %, aéré', prefs: mk({ taille: 130, espace: 'aere' }), n: 6, couleurs: ['#F5B754', '#FF9A3C'], w: 4, halo: 'rgba(245,183,84,.6)', msg: 'Orbe Grand texte : texte à 130 %, espacement aéré.' },
    { id: 'calme', nom: 'Calme', indice: 'Rien ne bouge', prefs: mk({ mouvement: 'reduit' }), n: 1, couleurs: ['#4FD69A'], w: 2.4, halo: 'rgba(79,214,154,.5)', msg: 'Orbe Calme : mouvement réduit, diaporama arrêté.' },
    { id: 'contraste', nom: 'Contraste', indice: 'Net, sans animation', prefs: mk({ taille: 115, contraste: 'renforce', mouvement: 'reduit' }), n: 4, couleurs: ['#FFFFFF'], w: 4.5, halo: 'rgba(255,255,255,.45)', msg: 'Orbe Contraste : contraste renforcé, texte à 115 %, mouvement réduit.' },
    { id: 'ecoute', nom: 'Écoute', indice: 'Sons et vibrations', prefs: mk({ sons: 'on' }), n: 16, couleurs: ['#A46BFF', '#4F7BFF'], w: 2.2, halo: 'rgba(164,107,255,.6)', msg: 'Orbe Écoute : sons et vibrations activés.' },
  ];
}
export function profilCourant(p: Prefs): Profil | null { return profils().find(x => CLES.every(k => x.prefs[k] === p[k])) || null; }

/* les arcs d'une orbe (viewBox 44) : n segments, couleurs en boucle */
export function arcs(n: number, couleurs: string[], r = 17, ecart = 10) {
  const pt = (a: number) => { const t = a * Math.PI / 180; return (22 + r * Math.cos(t)).toFixed(2) + ' ' + (22 + r * Math.sin(t)).toFixed(2); };
  return Array.from({ length: n }, (_, k) => {
    const span = 360 / n, g = n === 1 ? 0.6 : ecart, a0 = -90 + k * span + g / 2, a1 = a0 + span - g;
    return { d: 'M ' + pt(a0) + ' A ' + r + ' ' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + pt(a1), c: couleurs[k % couleurs.length] };
  });
}

/* un petit retour sonore (et une vibration) quand « Sons et vibrations » est activé */
let audio: AudioContext | null = null;
export function earcon(genre: 'ok' | 'nav', force = false) {
  if (!force && lirePrefs().sons !== 'on') return;
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; if (!C) return;
    audio = audio || new C();
    const ctx = audio, t0 = ctx.currentTime;
    (genre === 'ok' ? [523.25, 659.25] : [440]).forEach((f, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + k * 0.12);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + k * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.12 + 0.22);
      o.connect(g); g.connect(ctx.destination); o.start(t0 + k * 0.12); o.stop(t0 + k * 0.12 + 0.25);
    });
    navigator.vibrate?.(genre === 'ok' ? [12, 60, 12] : 15);
  } catch { /* pas de son sur cet appareil */ }
}

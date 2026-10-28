// Mon orbe : le dessin d'une orbe personnelle (arcs, couleurs, épaisseur) et ses garde-fous.
// Du JavaScript pur, sans React ni navigateur, pour que les règles (contraste, bornes, nettoyage) se testent seules.
// Les couleurs d'une orbe se posent sur le dock sombre : elles doivent y rester visibles (WCAG 1.4.11, 3:1).
// @ts-nocheck

export const FOND = '#1B1B1A';
export const SEUIL = 3;
export const BORNES = { arcs: [1, 16], epaisseur: [2, 5], couleurs: [1, 4] };
export const DEFAUT = { n: 12, couleurs: ['#c9b8ff', '#4f7bff'], w: 3 };

const HEX = /^#[0-9a-f]{6}$/i;
export const couleurValide = c => typeof c === 'string' && HEX.test(c);

function rvb(hex) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
export function luminance(hex) {
  const [r, g, b] = rvb(hex).map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contraste(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/* Les problèmes d'un dessin, en mots, pour les lecteurs d'écran comme pour les yeux. Aucun problème : le dessin peut être gardé. */
export function verifier(d) {
  const problemes = [];
  if (!d || typeof d !== 'object') return { ok: false, problemes: ['Cette orbe est illisible.'] };
  if (!Number.isInteger(d.n) || d.n < BORNES.arcs[0] || d.n > BORNES.arcs[1]) problemes.push('Le nombre d’arcs va de ' + BORNES.arcs[0] + ' à ' + BORNES.arcs[1] + '.');
  if (!(d.w >= BORNES.epaisseur[0] && d.w <= BORNES.epaisseur[1])) problemes.push('L’épaisseur va de ' + BORNES.epaisseur[0] + ' à ' + BORNES.epaisseur[1] + '.');
  const cs = Array.isArray(d.couleurs) ? d.couleurs : [];
  if (cs.length < BORNES.couleurs[0] || cs.length > BORNES.couleurs[1]) problemes.push('Une orbe a de ' + BORNES.couleurs[0] + ' à ' + BORNES.couleurs[1] + ' couleurs.');
  cs.forEach((c, i) => {
    if (!couleurValide(c)) { problemes.push('Couleur ' + (i + 1) + ' : valeur illisible.'); return; }
    const r = contraste(c, FOND);
    if (r < SEUIL) problemes.push('Couleur ' + (i + 1) + ' : trop sombre sur le dock (contraste ' + r.toFixed(1).replace('.', ',') + ' sur ' + SEUIL + ' demandé). Choisissez-en une plus claire.');
  });
  return { ok: problemes.length === 0, problemes };
}

const borne = (v, [a, b]) => Math.min(b, Math.max(a, v));
/* Remet d'aplomb ce qu'on relit d'un stockage : bornes tenues, couleurs illisibles écartées, rien du tout si rien d'exploitable. */
export function nettoyer(brut) {
  if (!brut || typeof brut !== 'object') return null;
  const n = Number(brut.n), w = Number(brut.w);
  if (!Number.isFinite(n) || !Number.isFinite(w)) return null;
  const couleurs = (Array.isArray(brut.couleurs) ? brut.couleurs : []).filter(couleurValide).map(c => c.toLowerCase()).slice(0, BORNES.couleurs[1]);
  if (!couleurs.length) return null;
  return { n: borne(Math.round(n), BORNES.arcs), couleurs, w: Math.round(borne(w, BORNES.epaisseur) * 10) / 10 };
}

export function halo(d) {
  const [r, g, b] = rvb(couleurValide(d && d.couleurs && d.couleurs[0]) ? d.couleurs[0] : '#ffffff');
  return 'rgba(' + r + ',' + g + ',' + b + ',.55)';
}

// Les préférences du Point dans le compte : ce qu'on accepte, et rien d'autre.
// Mêmes bornes que le studio (studio/src/lib/accessibilityCore.ts parsePrefs, lib/point/profils.ts) ; un test vérifie la parité.
export const PROFILS = ['debutante', 'experte', 'lecture', 'geometrique'];
export const NIVEAUX = ['beginner', 'intermediate', 'expert'];
export const MENUS = ['auto', 'arc', 'liste'];
export const ACCENTS = ['#7562ce', '#0d766b', '#a14878', '#2457ac', '#a56c20', '#1d1d1d'];
const fini = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const booleen = v => typeof v === 'boolean';

export function validerConfort(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  if (c.version !== 1 || !['system', 'dark', 'light'].includes(c.theme) || !['standard', 'daltonisme', 'monochrome'].includes(c.vision)) return null;
  if (!fini(c.fontScale, 1, 1.75) || !fini(c.lineHeight, 1.2, 2.1) || !fini(c.spacing, 0, 0.15) || !['normal', 'strong'].includes(c.contrast)) return null;
  if (![c.reduceMotion, c.enhancedFocus, c.readingGuide, c.privacyBlur].every(booleen) || !ACCENTS.includes(c.accent)) return null;
  const { version, theme, vision, fontScale, lineHeight, spacing, contrast, reduceMotion, enhancedFocus, readingGuide, privacyBlur, accent } = c;
  return { version, theme, vision, fontScale, lineHeight, spacing, contrast, reduceMotion, enhancedFocus, readingGuide, privacyBlur, accent };
}

/** { preferences } ou { raison } */
export function validerPreferences(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return { raison: 'Préférences illisibles.' };
  const profil = p.profil === null || PROFILS.includes(p.profil) ? p.profil : undefined;
  if (profil === undefined) return { raison: 'Profil inconnu.' };
  if (!NIVEAUX.includes(p.niveau)) return { raison: 'Niveau d’affichage inconnu.' };
  if (!MENUS.includes(p.menu)) return { raison: 'Menu du Point inconnu.' };
  const confort = validerConfort(p.confort);
  if (!confort) return { raison: 'Réglages de confort invalides.' };
  return { preferences: { profil, niveau: p.niveau, menu: p.menu, confort } };
}

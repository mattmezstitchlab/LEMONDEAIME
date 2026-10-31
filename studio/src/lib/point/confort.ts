/**
 * Le mode Confort du Point : les profils rapides et les annonces.
 * Les préférences elles-mêmes restent celles d'accessibilityCore (validées, enregistrées sur l'appareil, appliquées à la page).
 */
import { DEFAULT_ACCESS, type Preferences } from "../accessibilityCore";

export const PROFILS: { id: string; nom: string; aide: string; valeur: Preferences }[] = [
  { id: "lecture", nom: "Lecture confortable", aide: "Texte à 125 %, interligne large, focus renforcé.", valeur: { ...DEFAULT_ACCESS, fontScale: 1.25, lineHeight: 1.8, enhancedFocus: true } },
  { id: "contraste", nom: "Contraste et repères", aide: "Contraste renforcé, focus renforcé, repères pour les couleurs.", valeur: { ...DEFAULT_ACCESS, contrast: "strong", enhancedFocus: true, vision: "daltonisme" } },
  { id: "calme", nom: "Lecture guidée calme", aide: "Sans animation, la lecture guidée suit le focus, texte à 110 %.", valeur: { ...DEFAULT_ACCESS, reduceMotion: true, readingGuide: true, fontScale: 1.1 } },
];

const pc = (x: number) => `${Math.round(x * 100)} %`;
const oui = (b: boolean) => (b ? "activé" : "désactivé");
const THEMES = { system: "celui de l’appareil", light: "clair", dark: "sombre" } as const;
const VISIONS = { standard: "standard", daltonisme: "repères pour les couleurs", monochrome: "monochrome" } as const;

/** L'Onde : ce qui a changé, dit en une phrase (zone d'annonce polie). */
export function annonce(avant: Preferences, apres: Preferences): string {
  const dits: string[] = [];
  if (avant.theme !== apres.theme) dits.push(`Thème ${THEMES[apres.theme]}`);
  if (avant.fontScale !== apres.fontScale) dits.push(`Texte à ${pc(apres.fontScale)}`);
  if (avant.lineHeight !== apres.lineHeight) dits.push(`Interligne ${apres.lineHeight.toLocaleString("fr-FR")}`);
  if (avant.spacing !== apres.spacing) dits.push(`Espacement des lettres ${apres.spacing ? "+" + pc(apres.spacing) : "normal"}`);
  if (avant.contrast !== apres.contrast) dits.push(`Contraste ${apres.contrast === "strong" ? "renforcé" : "normal"}`);
  if (avant.reduceMotion !== apres.reduceMotion) dits.push(`Mouvements réduits ${oui(apres.reduceMotion)}`);
  if (avant.enhancedFocus !== apres.enhancedFocus) dits.push(`Focus renforcé ${oui(apres.enhancedFocus)}`);
  if (avant.readingGuide !== apres.readingGuide) dits.push(`Lecture guidée ${oui(apres.readingGuide)}`);
  if (avant.vision !== apres.vision) dits.push(`Couleurs : ${VISIONS[apres.vision]}`);
  if (avant.privacyBlur !== apres.privacyBlur) dits.push(`Affichage discret ${oui(apres.privacyBlur)}`);
  return dits.length ? dits.join(", ") + "." : "Aucun changement.";
}

/** Combien de réglages s'écartent des valeurs par défaut : la Marque du secteur Confort. */
export function reglagesActifs(p: Preferences): number {
  const d = DEFAULT_ACCESS;
  return (["theme", "fontScale", "lineHeight", "spacing", "contrast", "reduceMotion", "enhancedFocus", "readingGuide", "vision", "privacyBlur"] as const)
    .filter(k => p[k] !== d[k]).length;
}

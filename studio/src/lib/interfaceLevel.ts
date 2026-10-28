export type InterfaceLevel = "beginner" | "intermediate" | "expert";
export const INTERFACE_LEVEL_KEY = "pointzero:interface-level";
export function readInterfaceLevel(): InterfaceLevel {
  try { const value = localStorage.getItem(INTERFACE_LEVEL_KEY); if (value === "beginner" || value === "expert") return value; } catch { /* Optional preference. */ }
  return "intermediate";
}
export const LEVEL_LABELS: Record<InterfaceLevel,string> = {beginner:"Débutant",intermediate:"Intermédiaire",expert:"Expert"};
export const LEVEL_HELP: Record<InterfaceLevel,string> = {
  beginner:"Les gestes essentiels d’abord. Tous les outils restent accessibles à la demande.",
  intermediate:"Les outils courants, les transformations et les réglages de création.",
  expert:"Tous les outils et réglages avancés sont dépliés. Votre ouvrage reste inchangé.",
};

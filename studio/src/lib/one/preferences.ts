/**
 * .0NE — une source unique de préférences (version de schéma, affichage, interaction, notifications, univers favoris,
 * confidentialité, état de synchronisation). Pas de second Confort : l'affichage EST celui de POINT ZÉRO
 * (lib/accessibilityCore, même clé, même événement « pz:accessibility ») et la présentation du menu du Point est la sienne
 * (lib/point/modes). Ce module les réunit et ajoute ce qui manquait (interaction, sons, favoris, identité locale, la mise en route).
 *
 * Confidentialité : tout reste sur cet appareil. Aucun diagnostic n'est demandé ni enregistré : on choisit des besoins concrets
 * (« j'ai besoin de commandes plus grandes »), qui proposent des réglages ; la personne garde la main sur chacun.
 * Synchronisation : « locale » tant qu'un serveur ne l'a pas réellement confirmée (jamais annoncée avant).
 */
import { applyPrefs, DEFAULT_ACCESS, readPrefs, savePrefs, type Preferences } from "../accessibilityCore";
import { ecrirePresentation, lirePresentation, type ChoixPresentation } from "../point/modes";

export const CLE_ONE = "aime:one:preferences:v1";
export const EVENEMENT_ONE = "aime:one:preferences";

export type Cibles = "standard" | "grandes" | "tres-grandes";
export const FACTEUR_CIBLES: Record<Cibles, number> = { standard: 1, grandes: 1.2, "tres-grandes": 1.4 };

export interface ReglagesOne {
  version: 1;
  interaction: { cibles: Cibles; /** confirmer avant d'agir (un temps de validation) */ validation: "immediate" | "confirmer"; gestesSimples: boolean; parEtapes: boolean; positionPoint: "gauche" | "centre" | "droite";
    /** le degré de guidage choisi (l'Orbe relationnelle explique plus ou moins) */ guidage?: "discret" | "standard" | "pas-a-pas" };
  notifications: { sons: boolean; volume: number; signauxVisuels: boolean; sousTitres: boolean };
  /** des besoins concrets (jamais un diagnostic), gardés pour retrouver ses choix ; jamais envoyés */
  besoins: IdBesoin[];
  favoris: string[];
  identite: { prenom: string; ville: string; langue: "fr" };
  rencontre: { etape: number; terminee: boolean };
  /** la personne a choisi elle-même son thème (sinon .0NE reste en Jour, le blanc AIME) */
  themeChoisi?: boolean;
}
export interface PreferencesOne extends ReglagesOne {
  affichage: Preferences;
  presentation: ChoixPresentation;
  synchronisation: "locale";
}

export const DEFAUT_ONE: ReglagesOne = {
  version: 1,
  interaction: { cibles: "standard", validation: "immediate", gestesSimples: false, parEtapes: false, positionPoint: "gauche", guidage: "standard" },
  notifications: { sons: false, volume: 0.5, signauxVisuels: true, sousTitres: true },
  besoins: [], favoris: ["broderie", "bureau"], identite: { prenom: "", ville: "", langue: "fr" }, rencontre: { etape: 0, terminee: false },
};

/* — les besoins concrets : chacun propose des réglages (visibles, modifiables), aucun ne décrit une personne — */
export type IdBesoin = "souris-difficile" | "commandes-grandes" | "texte-plutot" | "pointage-alternatif" | "sans-parole" | "peu-de-gestes" | "lecture-difficile" | "fatigue";
export interface Besoin { id: IdBesoin; phrase: string; propose: string; reglages: (p: PreferencesOne) => Partial<PreferencesOne> }
export const BESOINS: Besoin[] = [
  { id: "souris-difficile", phrase: "J’utilise difficilement la souris.", propose: "Commandes plus grandes, menu du Point écrit en liste, gestes simples.",
    reglages: p => ({ interaction: { ...p.interaction, cibles: "grandes", gestesSimples: true }, presentation: "liste" }) },
  { id: "commandes-grandes", phrase: "J’ai besoin de commandes plus grandes.", propose: "Commandes plus grandes.", reglages: p => ({ interaction: { ...p.interaction, cibles: "grandes" } }) },
  { id: "texte-plutot", phrase: "Je préfère communiquer par texte.", propose: "Signaux visuels et sous-titres ; aucun son nécessaire.",
    reglages: p => ({ notifications: { ...p.notifications, signauxVisuels: true, sousTitres: true } }) },
  { id: "pointage-alternatif", phrase: "J’utilise un dispositif de pointage alternatif.", propose: "Très grandes commandes, confirmation avant d’agir, menu en liste.",
    reglages: p => ({ interaction: { ...p.interaction, cibles: "tres-grandes", validation: "confirmer", gestesSimples: true }, presentation: "liste" }) },
  { id: "sans-parole", phrase: "J’ai besoin d’une interface utilisable sans parole.", propose: "Rien à changer : aucune commande de .0NE ne demande la parole.", reglages: () => ({}) },
  { id: "peu-de-gestes", phrase: "Je souhaite naviguer avec très peu de gestes.", propose: "Navigation par étapes, gestes simples, menu en liste.",
    reglages: p => ({ interaction: { ...p.interaction, parEtapes: true, gestesSimples: true }, presentation: "liste" }) },
  { id: "lecture-difficile", phrase: "La lecture me demande un effort.", propose: "Texte à 125 %, interligne large, espacement, guide de lecture.",
    reglages: p => ({ affichage: { ...p.affichage, fontScale: 1.25, lineHeight: 1.8, spacing: 0.05, readingGuide: true } }) },
  { id: "fatigue", phrase: "Je me fatigue vite à l’écran.", propose: "Effets visuels réduits, navigation par étapes.",
    reglages: p => ({ affichage: { ...p.affichage, reduceMotion: true }, interaction: { ...p.interaction, parEtapes: true } }) },
];

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
/** relire ce qui est enregistré, en ne gardant que ce qui est valide (un champ abîmé revient à sa valeur par défaut) */
export function lireReglages(): ReglagesOne {
  let brut: unknown = null;
  try { brut = JSON.parse(localStorage.getItem(CLE_ONE) ?? "null"); } catch { brut = null; }
  if (!estObjet(brut) || brut.version !== 1) return structuredClone(DEFAUT_ONE);
  const d = DEFAUT_ONE, i = estObjet(brut.interaction) ? brut.interaction : {}, n = estObjet(brut.notifications) ? brut.notifications : {}, id = estObjet(brut.identite) ? brut.identite : {}, r = estObjet(brut.rencontre) ? brut.rencontre : {};
  const dans = <T,>(v: unknown, permis: readonly T[], def: T): T => permis.includes(v as T) ? v as T : def;
  const bool = (v: unknown, def: boolean) => typeof v === "boolean" ? v : def;
  const texte = (v: unknown) => typeof v === "string" ? v.slice(0, 60) : "";
  return {
    version: 1,
    interaction: { cibles: dans(i.cibles, ["standard", "grandes", "tres-grandes"] as const, d.interaction.cibles), validation: dans(i.validation, ["immediate", "confirmer"] as const, d.interaction.validation),
      gestesSimples: bool(i.gestesSimples, false), parEtapes: bool(i.parEtapes, false), positionPoint: dans(i.positionPoint, ["gauche", "centre", "droite"] as const, d.interaction.positionPoint),
      guidage: dans(i.guidage, ["discret", "standard", "pas-a-pas"] as const, "standard") },
    notifications: { sons: bool(n.sons, d.notifications.sons), volume: typeof n.volume === "number" && n.volume >= 0 && n.volume <= 1 ? n.volume : d.notifications.volume,
      signauxVisuels: bool(n.signauxVisuels, true), sousTitres: bool(n.sousTitres, true) },
    besoins: Array.isArray(brut.besoins) ? brut.besoins.filter((b): b is IdBesoin => BESOINS.some(x => x.id === b)) : [],
    favoris: Array.isArray(brut.favoris) ? brut.favoris.filter((f): f is string => typeof f === "string" && /^[a-z][a-z0-9-]{1,31}$/.test(f)).slice(0, 24) : [...d.favoris],
    identite: { prenom: texte(id.prenom), ville: texte(id.ville), langue: "fr" },
    themeChoisi: bool(brut.themeChoisi, false),
    rencontre: { etape: typeof r.etape === "number" && r.etape >= 0 && r.etape <= 10 ? Math.floor(r.etape) : 0, terminee: bool(r.terminee, false) },
  };
}

/** la vue complète : l'affichage et la présentation sont lus chez eux (aucune copie) */
export function lireOne(): PreferencesOne {
  return { ...lireReglages(), affichage: readPrefs(), presentation: lirePresentation(), synchronisation: "locale" };
}

/** Écrire : chaque partie va à sa place (l'affichage dans le Confort de POINT ZÉRO, le reste ici) ; tout s'applique tout de suite.
    Renvoie false si l'appareil refuse d'enregistrer (navigation privée) : les réglages valent alors jusqu'au rechargement. */
export function ecrireOne(suite: PreferencesOne): boolean {
  let ok = true;
  try { savePrefs(suite.affichage); } catch { ok = false; applyPrefs(suite.affichage); }
  /* le thème du socle AIME (data-aime) suit le même choix : une seule décision pour la personne */
  try { if (suite.affichage.theme === "system") localStorage.removeItem("aime:theme"); else localStorage.setItem("aime:theme", suite.affichage.theme === "dark" ? "nuit" : "jour"); } catch { ok = false; }
  if (!ecrirePresentation(suite.presentation)) ok = false;
  const { affichage: _a, presentation: _p, synchronisation: _s, ...reste } = suite; void _a; void _p; void _s;
  try { localStorage.setItem(CLE_ONE, JSON.stringify(reste)); } catch { ok = false; }
  appliquerOne(suite);
  window.dispatchEvent(new CustomEvent(EVENEMENT_ONE, { detail: suite }));
  return ok;
}

/** Appliquer à la page : des attributs et des variables que le Disque, les docks et les modules lisent. */
export function appliquerOne(p: PreferencesOne = lireOne()): void {
  const r = document.documentElement;
  applyPrefs(p.affichage);
  r.dataset.oneCibles = p.interaction.cibles;
  r.style.setProperty("--one-cible", String(FACTEUR_CIBLES[p.interaction.cibles]));
  r.dataset.oneGestes = p.interaction.gestesSimples ? "simples" : "standard";
  r.dataset.oneEtapes = p.interaction.parEtapes ? "oui" : "non";
  r.dataset.onePoint = p.interaction.positionPoint;
  r.dataset.oneSignaux = p.notifications.signauxVisuels ? "oui" : "non";
}

/** Proposer les réglages d'un ensemble de besoins (la personne les voit et peut les changer ensuite). */
export function proposerPourBesoins(p: PreferencesOne, ids: IdBesoin[]): PreferencesOne {
  return ids.reduce<PreferencesOne>((acc, id) => { const b = BESOINS.find(x => x.id === id); return b ? { ...acc, ...b.reglages(acc) } : acc; }, { ...p, besoins: ids });
}

/** Tout remettre comme au premier jour (les ouvrages ne sont pas touchés). */
export function reinitialiserOne(): PreferencesOne {
  const p: PreferencesOne = { ...structuredClone(DEFAUT_ONE), affichage: { ...DEFAULT_ACCESS }, presentation: "auto", synchronisation: "locale" };
  ecrireOne(p); return p;
}

/** Le thème de .0NE : le blanc AIME par défaut ; la Nuit seulement si la personne l'a choisie (ou a choisi de suivre son appareil). */
export function themeOne(p: PreferencesOne = lireOne()): "jour" | "nuit" {
  if (p.affichage.theme === "dark") return "nuit";
  if (p.affichage.theme === "system" && p.themeChoisi) return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "nuit" : "jour";
  return "jour";
}

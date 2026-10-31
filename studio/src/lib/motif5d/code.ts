/**
 * Point Zéro 5D : la signature, la recette et leur code écrit. Ce module ne dépend de rien :
 * il est lu aussi par pattern.ts (sauvegarde des ouvrages) et par le lien de partage.
 * Cinq choix (une réponse sur quatre par dimension) donnent une signature ; signature + graine + version = une recette.
 */
export type Choix = 0 | 1 | 2 | 3;
export interface Signature { structure: Choix; trace: Choix; densite: Choix; echelle: Choix; palette: Choix }
export const VERSION = "v0.1" as const;
export interface Recette { signature: Signature; graine: number; version: typeof VERSION }

/** Les cinq dimensions, dans l'ordre des gestes, avec leurs quatre réponses (nom, phrase lue au lecteur d'écran). */
export const DIMENSIONS: { cle: keyof Signature; nom: string; question: string; reponses: [string, string][] }[] = [
  { cle: "structure", nom: "Structure", question: "Quelle forme ?", reponses: [
    ["Rosace", "une fleur géométrique, symétrique autour du centre"],
    ["Anneaux", "des cercles concentriques, comme un médaillon"],
    ["Frise", "une bande qui se répète, comme une bordure"],
    ["Pavage", "un motif répété sur toute la surface, comme un carrelage"]] },
  { cle: "trace", nom: "Tracé", question: "Quelles lignes ?", reponses: [
    ["Droit", "des lignes droites, en carrés"],
    ["Diagonal", "des lignes en biais, en losanges"],
    ["Courbe", "des lignes rondes, comme des cercles"],
    ["Itératif", "des motifs emboîtés les uns dans les autres"]] },
  { cle: "densite", nom: "Densité", question: "Léger ou plein ?", reponses: [
    ["Aérée", "beaucoup de toile visible, un ouvrage léger"],
    ["Équilibrée", "autant de toile que de broderie"],
    ["Pleine", "presque tout est brodé"],
    ["Totale", "le fond est brodé aussi"]] },
  { cle: "echelle", nom: "Échelle", question: "Grands motifs ou dentelle ?", reponses: [
    ["Large", "de grands aplats, faciles à broder"],
    ["Moyen", "des motifs de taille moyenne"],
    ["Fin", "des motifs fins, plus de détails"],
    ["Dentelle", "de petits motifs ajourés, comme une dentelle"]] },
  { cle: "palette", nom: "Palette", question: "Quelles couleurs ?", reponses: [
    ["Camaïeu", "une seule teinte, du clair au foncé"],
    ["Douce", "des tons poudrés et clairs"],
    ["Vive", "des couleurs franches qui se répondent"],
    ["Terre", "des ocres, des olives, des briques"]] },
];
export const CLES: (keyof Signature)[] = DIMENSIONS.map(d => d.cle);

/** « 5D-13133.g3.v0.1 » : un chiffre de 1 à 4 par dimension, la graine, la version. */
export function codeDe(r: Recette): string {
  return "5D-" + CLES.map(k => r.signature[k] + 1).join("") + ".g" + r.graine + "." + r.version;
}
/** Le code court de la signature seule : « 5D-13133 ». */
export const codeSignature = (s: Signature) => "5D-" + CLES.map(k => s[k] + 1).join("");
export const MAX_GRAINE = 99999;

/** Lit un code de recette ; refuse tout ce qui n'est pas exactement de la forme attendue. */
export function lireCode(texte: unknown): Recette | null {
  if (typeof texte !== "string" || texte.length > 40) return null;
  const m = /^5D-([1-4]{5})\.g([1-9][0-9]{0,4})\.(v0\.1)$/.exec(texte.trim());
  if (!m) return null;
  const graine = Number(m[2]);
  if (!Number.isInteger(graine) || graine < 1 || graine > MAX_GRAINE) return null;
  const c = m[1].split("").map(x => (Number(x) - 1) as Choix);
  return { signature: { structure: c[0], trace: c[1], densite: c[2], echelle: c[3], palette: c[4] }, graine, version: VERSION };
}

/** Les cinq réponses en clair : « rosace, courbe, aérée, fin, vive ». */
export const enClair = (s: Signature) => DIMENSIONS.map(d => d.reponses[s[d.cle]][0].toLowerCase()).join(", ");

/** Ce qu'un ouvrage garde de sa recette, pour que le Cadre la régénère à une autre taille. */
export interface RecetteOuvrage { code: string; empreinte: number }
export function lireRecetteOuvrage(v: unknown): RecetteOuvrage | undefined {
  if (!v || typeof v !== "object") return undefined;
  const o = v as Partial<RecetteOuvrage>;
  if (!lireCode(o.code)) return undefined;
  return { code: o.code as string, empreinte: typeof o.empreinte === "number" && Number.isFinite(o.empreinte) ? o.empreinte : 0 };
}

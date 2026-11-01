/**
 * Une seule chorégraphie d'interface, mesurée sur le temps du clip, jamais sur une autre horloge.
 * Elle n'écrit aucun point : les images et leur apparition restent celles de clip-brode.
 * Le fil est temporairement mis en lumière, comme dans l'outil Fils du lecteur.
 */
export type PhaseFleur = "attente" | "broder" | "fils" | "couleur" | "loupe" | "replier" | "termine";
export interface ScenarioFleur {
  phase: PhaseFleur;
  ouvert: boolean;
  chemin: "racine" | "fils";
  outil: "broder" | "fils" | "loupe" | "replier" | null;
  couleur: boolean;
  loupe: boolean;
  opacite: number;
  echelle: number;
}

const borne = (n: number) => Math.max(0, Math.min(1, n));
const douceur = (n: number) => { const x = borne(n); return x * x * (3 - 2 * x); };

/** Temps relatif au début de la démonstration, en secondes du morceau. */
export function scenarioFleur(t: number): ScenarioFleur {
  const base = { ouvert: false, chemin: "racine" as const, outil: null, couleur: false, loupe: false, opacite: 0, echelle: .94 };
  if (!Number.isFinite(t) || t < .65) return { ...base, phase: "attente" };
  if (t >= 10.6) return { ...base, phase: "termine" };
  const entree = douceur((t - .65) / .65), sortie = 1 - douceur((t - 9.8) / .8);
  const opacite = Math.min(entree, sortie);
  const visible = { ...base, ouvert: true, opacite, echelle: .94 + .06 * opacite };
  if (t < 2.8) return { ...visible, phase: "broder", outil: "broder" };
  if (t < 3.8) return { ...visible, phase: "fils", chemin: "fils", outil: "fils" };
  if (t < 5.5) return { ...visible, phase: "couleur", chemin: "fils", outil: "fils", couleur: true };
  if (t < 9.1) return { ...visible, phase: "loupe", outil: "loupe", loupe: t >= 6.5 };
  return { ...visible, phase: "replier", outil: "replier" };
}

export type Position = { x: number; y: number };
const lerp = (a: Position, b: Position, u: number): Position => {
  const v = douceur(u); return { x: a.x + (b.x - a.x) * v, y: a.y + (b.y - a.y) * v };
};

/** Le pointeur illustratif relie les centres des vraies commandes, puis un point de la toile. */
export function positionCurseur(t: number, p: { depart: Position; broder: Position; fils: Position; couleur: Position; loupe: Position; fleur: Position; replier: Position }): Position {
  if (t < 1.9) return lerp(p.depart, p.broder, (t - .65) / 1.25);
  if (t < 2.8) return lerp(p.broder, p.fils, (t - 1.9) / .9);
  if (t < 3.8) return lerp(p.fils, p.couleur, (t - 2.8) / 1);
  if (t < 5.1) return p.couleur;
  if (t < 6.1) return lerp(p.couleur, p.loupe, (t - 5.1) / 1);
  if (t < 7.2) return lerp(p.loupe, p.fleur, (t - 6.1) / 1.1);
  if (t < 8.9) return p.fleur;
  return lerp(p.fleur, p.replier, (t - 8.9) / .9);
}

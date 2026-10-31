/**
 * L'onde : un contrat géométrique commun au film LUMIERE et au futur Disque Ripple.
 *
 * Le film et l'application n'utilisent pas la même technologie (shader + calque 2D d'un côté, SVG interactif de l'autre),
 * mais ils lisent les MÊMES paramètres : centre, rayon, nombre d'ondes, espacement, amplitude, vitesse, atténuation, phase,
 * couleur, déclencheur, progression temporelle — et la même géométrie polaire que RIPPLECIRCLE.
 *
 * Règle absolue : une onde DÉCORATIVE (le film, une illustration) ne peut jamais passer pour une notification transmise.
 * Seule une onde CAUSALE porte un événement réel (identifiant, source, horodatage) ; `transmettre` n'accepte qu'elle.
 */

/* ——— géométrie polaire : reprise telle quelle de RIPPLECIRCLE (src/utils/radial.ts, commit 63fe103) ———
   0° en haut, sens horaire. Aucune dépendance à un planning, à un mariage ou à des données. */
export const polarXY = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
export const arcPathAt = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const s = polarXY(cx, cy, r, a0), e = polarXY(cx, cy, r, a1);
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
};
export const normDeg = (a: number) => ((a % 360) + 360) % 360;
export const angularDist = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

/** Les anneaux du cadran Ripple (RIPPLECIRCLE src/ripple/config.ts : cadran de 1000, centre 500), en fractions du rayon.
    Seuls les rayons sont repris ; ce que chaque anneau représentait dans le mariage (calendrier, tables…) ne l'est pas. */
export const ANNEAUX_RIPPLE = [488, 462, 456, 438, 432, 408, 384, 354, 320, 288, 172, 162, 148].map(r => r / 500);
/** les anneaux « porteurs » (lignes principales du cadran), du dehors vers le centre */
export const ANNEAUX_PRINCIPAUX = [488, 432, 408, 354, 288, 172, 148].map(r => r / 500);
/** l'anneau des heures porte 12 repères ; l'anneau des personnes porte des positions polaires */
export const ANNEAU_HEURES = 408 / 500, ANNEAU_PERSONNES = 288 / 500, DISQUE_CENTRAL = 148 / 500;

/* ——— le déclencheur : décoratif OU causal, jamais les deux ——— */
export type Declencheur =
  | { genre: "decoratif"; raison: string; /** facultatif : un repère mesuré qui RYTHME l'onde (ex. une attaque musicale), sans rien transmettre */ synchro?: { source: string; instant: number } }
  | { genre: "evenement"; id: string; source: string; horodatage: string };

export interface Onde {
  /** centre, en fractions du cadran (0..1) */
  centre: { x: number; y: number };
  /** rayon de départ du premier front, en fraction du rayon du cadran */
  rayon: number;
  nombre: number;
  /** écart entre deux fronts successifs (fraction du rayon) */
  espacement: number;
  /** amplitude initiale (hauteur d'onde relative, 0..1) */
  amplitude: number;
  /** vitesse du front (fraction du rayon par seconde) */
  vitesse: number;
  /** atténuation exponentielle par seconde */
  attenuation: number;
  /** phase (0..1) : décale l'ondulation interne d'un front */
  phase: number;
  couleur: string;
  declencheur: Declencheur;
  /** progression temporelle : quand l'onde commence, combien de temps elle vit, et l'écart entre les fronts */
  progression: { debut: number; duree: number; cadence: number };
}

/** Un front de l'onde à l'instant t : son rayon, son intensité (0 = éteint), sa phase. */
export interface Front { k: number; rayon: number; intensite: number; phase: number; age: number }

/** les fronts visibles à l'instant t (secondes, dans le temps de l'onde) */
export function fronts(o: Onde, t: number): Front[] {
  const res: Front[] = [];
  for (let k = 0; k < o.nombre; k++) {
    const age = t - (o.progression.debut + k * o.progression.cadence);
    if (age < 0 || age > o.progression.duree) continue;
    const rayon = o.rayon + o.vitesse * age;   /* les fronts sont espacés dans le temps (cadence) ; `espacement` est la longueur d'onde d'un front */
    const intensite = o.amplitude * Math.exp(-o.attenuation * age) * Math.min(1, age / 0.08) * Math.min(1, (o.progression.duree - age) / 0.6);
    res.push({ k, rayon, intensite: Math.max(0, intensite), phase: o.phase + k / Math.max(1, o.nombre), age });
  }
  return res;
}

/** hauteur de la surface à la distance r du centre (somme des fronts) : la même formule nourrit le shader du film */
export function hauteur(o: Onde, r: number, t: number): number {
  let h = 0;
  for (const f of fronts(o, t)) {
    const d = r - f.rayon, largeur = o.espacement * 0.5;
    h += f.intensite * Math.exp(-(d * d) / (2 * largeur * largeur)) * Math.cos((d / o.espacement) * Math.PI * 2 + f.phase * Math.PI * 2);
  }
  return h;
}

/** Rattacher les fronts d'une onde aux anneaux du cadran Ripple : u = 0 → fronts libres ; u = 1 → chaque front repose sur un anneau. */
export function versAnneaux(rayons: number[], u: number, anneaux: number[] = ANNEAUX_PRINCIPAUX): number[] {
  const cibles = [...anneaux].sort((a, b) => a - b), e = Math.min(1, Math.max(0, u)), lisse = e * e * (3 - 2 * e);
  return [...rayons].sort((a, b) => a - b).map((r, i) => r + (cibles[Math.min(i, cibles.length - 1)] - r) * lisse);
}

/** les 12 repères angulaires d'un anneau (degrés), et un déploiement radial progressif (0..1) qui les révèle dans le sens horaire */
export function reperes(n = 12, deploiement = 1): { angle: number; visible: number }[] {
  return Array.from({ length: n }, (_, i) => { const angle = (360 * i) / n; return { angle, visible: Math.min(1, Math.max(0, deploiement * n - i)) }; });
}

/* ——— la règle : seule une onde causale peut être transmise ——— */
export type OndeCausale = Onde & { declencheur: Extract<Declencheur, { genre: "evenement" }> };
export const estCausale = (o: Onde): o is OndeCausale => o.declencheur.genre === "evenement" && !!o.declencheur.id && !!o.declencheur.source && !Number.isNaN(Date.parse(o.declencheur.horodatage));

/** Le seul passage vers une notification : il refuse toute onde décorative (au typage ET à l'exécution). */
export function transmettre(o: OndeCausale, envoyer: (evenement: OndeCausale["declencheur"]) => void): void {
  if (!estCausale(o)) throw new Error("Une onde décorative ne transmet rien : aucune notification n'a été envoyée.");
  envoyer(o.declencheur);
}

/** ce qu'une onde « dit » quand on demande pourquoi elle est là (même vocabulaire que l'Orbe relationnelle) */
export const sens = (o: Onde) => o.declencheur.genre === "evenement"
  ? { genre: "donnee" as const, source: `${o.declencheur.source} · ${o.declencheur.id}` }
  : { genre: "illustratif" as const, raison: o.declencheur.raison + (o.declencheur.synchro ? ` (rythmée par ${o.declencheur.synchro.source})` : "") };

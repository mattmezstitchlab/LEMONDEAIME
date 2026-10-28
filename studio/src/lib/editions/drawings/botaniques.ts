/**
 * Point Zéro · Éditions — collection « Oiseaux botaniques ».
 * Des oiseaux perchés dont le plumage est fait de fleurs : chaque zone (poitrine, dos, ventre, calotte…) a sa couleur de fond,
 * modelée par la lumière, et sa propre jonchée de petites fleurs ; les ailes et la queue sont des rangs de plumes rayées.
 * Dessins originaux, générés de façon déterministe (même identifiant, mêmes cases), 150 × 150 points.
 */
import { Toile, bezier, circle, diff, ellipse, hash, inter, lit, path, pickRamp, poly, union, type Code, type Shape } from "../kit";

type Pt = [number, number];
type Ramp = Code[];
/** Une zone du plumage : sa forme, son fond (clair → foncé), ses fleurs. */
interface Zone { forme: Shape; fond: Ramp; fleurs?: Ramp[]; coeurs?: Code[]; densite?: number; taille?: [number, number]; feuilles?: Ramp; points?: Code[]; grandes?: number }
interface Oiseau {
  graine: number;
  /** corps (ellipse), tête (cercle), queue (polygone), aile (ellipse) */
  corps: [number, number, number, number, number];
  tete: [number, number, number];
  queue: Pt[];
  aile: [number, number, number, number, number];
  /** zones dessinées dans l'ordre, après le fond général du corps */
  zones: (forme: Formes) => Zone[];
  /** les fleurs du dos et de la tête, semées partout sous les autres zones */
  dos?: Pick<Zone, "fleurs" | "coeurs" | "taille" | "feuilles">;
  fondCorps: Ramp;
  plumes: Ramp;          /* aile : rangs clair → foncé */
  plumesQueue: Ramp;
  couvertures?: Zone;    /* le haut de l'aile, fleuri */
  bec: [Pt[], Code, Code];
  oeil: [number, number, number];
  contour: Code;
  pattes: Code;
  branche: Pt[];
  ecorce: Ramp;
  feuillage: Ramp;
  bourgeons?: [Ramp, Code];
}
interface Formes { corps: Shape; tete: Shape; oiseau: Shape; aile: Shape; queue: Shape }

/** Comme Toile.fill, mais seulement dans le carré autour de (cx, cy) de demi-côté r : même résultat, bien plus rapide pour les petites formes. */
function remplir(t: Toile, forme: Shape, peinture: Code | ((x: number, y: number) => Code | null), cx: number, cy: number, r: number) {
  const x0 = Math.max(0, Math.floor(cx - r - 1)), x1 = Math.min(t.w - 1, Math.ceil(cx + r + 1)), y0 = Math.max(0, Math.floor(cy - r - 1)), y1 = Math.min(t.h - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!forme(x + .5, y + .5)) continue;
    const c = typeof peinture === "string" ? peinture : peinture(x + .5, y + .5);
    if (c !== null) t.set(x, y, c);
  }
}
/** Une forme lue une fois pour toutes, case par case : la même réponse au centre de chaque case, sans recalcul. */
function masque(t: Toile, forme: Shape): Shape {
  const m = new Uint8Array(t.w * t.h);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) m[y * t.w + x] = forme(x + .5, y + .5) ? 1 : 0;
  return (x, y) => { const i = Math.floor(x), j = Math.floor(y); return i >= 0 && j >= 0 && i < t.w && j < t.h && m[j * t.w + i] === 1; };
}
/** Une feuille en amande et sa nervure (comme leaf() de elements.ts, dessinée seulement autour d'elle). */
function feuille(t: Toile, x: number, y: number, angle: number, len: number, ramp: Ramp, nervure?: Code) {
  const cx = x + Math.cos(angle) * len / 2, cy = y + Math.sin(angle) * len / 2;
  remplir(t, ellipse(cx, cy, len / 2, Math.max(1.3, len / 4.2), angle), lit(cx, cy, len / 1.6, ramp, -.6, -.7), cx, cy, len / 2 + 1);
  if (nervure && len >= 7) remplir(t, path([[x + Math.cos(angle) * 1.5, y + Math.sin(angle) * 1.5], [x + Math.cos(angle) * (len - 2), y + Math.sin(angle) * (len - 2)]], .9), nervure, cx, cy, len / 2 + 1);
}
/** Une fleur à n pétales, découpée par la zone, modelée par la lumière du corps (biais). */
function fleur(t: Toile, x: number, y: number, r: number, petales: Ramp, coeur: Code, n: number, rot: number, dans: Shape, biais: number) {
  if (r >= 5) {   /* une grande fleur : une couronne de pétales plus sombres, une seconde plus claire, un cœur */
    for (let i = 0; i < n + 2; i++) {
      const a = rot + i * 2 * Math.PI / (n + 2), px = x + Math.cos(a) * r * .64, py = y + Math.sin(a) * r * .64;
      remplir(t, inter(circle(px, py, r * .42), dans), lit(px, py, r * .5, petales, -.6, -.7, biais + .3), px, py, r * .42);
    }
    for (let i = 0; i < n; i++) {
      const a = rot + .4 + i * 2 * Math.PI / n, px = x + Math.cos(a) * r * .3, py = y + Math.sin(a) * r * .3;
      remplir(t, inter(circle(px, py, r * .34), dans), lit(px, py, r * .4, petales, -.6, -.7, biais - .1), px, py, r * .34);
    }
    remplir(t, inter(circle(x, y, r * .2), dans), coeur, x, y, r * .2);
    return;
  }
  for (let i = 0; i < n; i++) {
    const a = rot + i * 2 * Math.PI / n;
    const px = x + Math.cos(a) * r * .58, py = y + Math.sin(a) * r * .58;
    remplir(t, inter(circle(px, py, r * .5), dans), lit(px, py, r * .62, petales, -.6, -.7, biais), px, py, r * .5);
  }
  remplir(t, inter(circle(x, y, Math.max(.9, r * .3)), dans), coeur, x, y, Math.max(.9, r * .3));
}
/** La lumière du corps en (x, y) : 0 en haut à gauche (éclairé), 1 en bas à droite (ombre). */
const ombre = (cx: number, cy: number, r: number) => (x: number, y: number) => {
  const nx = (x - cx) / r, ny = (y - cy) / r;
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const d = (nx * -.55 + ny * -.65 + nz * .6) / Math.hypot(.55, .65, .6);
  return (1 - d) / 1.6;
};

/** Remplit une zone : fond modelé, puis une jonchée de fleurs, de feuilles et de points, sans se chevaucher. */
function jonchee(t: Toile, z: Zone, graine: number, lumiere: (x: number, y: number) => number) {
  z = { ...z, forme: masque(t, z.forme) };
  t.fill(z.forme, (x, y) => pickRamp(z.fond, lumiere(x, y) * .95, x, y));
  if (!z.fleurs || !z.fleurs.length) return;
  const [rmin, rmax] = z.taille ?? [2.4, 4.2];
  const pas = (rmin + rmax) * (z.densite ?? .82);
  const posees: [number, number, number][] = [];
  /* d'abord quelques grandes fleurs, bien visibles */
  for (let gy = 0, n = 0; gy < t.h && n < (z.grandes ?? 0); gy += 7) for (let gx = 0; gx < t.w && n < (z.grandes ?? 0); gx += 7) {
    const x = gx + hash(gx, gy, graine + 41) * 7, y = gy + hash(gy, gx, graine + 43) * 7, r = 5.2 + hash(x, y, graine + 47) * 2.6;
    if (!z.forme(x, y) || !z.forme(x + r * .6, y) || !z.forme(x - r * .6, y) || hash(x, y, graine + 53) > .5) continue;
    if (posees.some(([a, b, c]) => Math.hypot(a - x, b - y) < (c + r) * .85)) continue;
    posees.push([x, y, r]); n++;
    const k = Math.floor(hash(x, y, graine + 11) * z.fleurs.length);
    fleur(t, x, y, r, z.fleurs[k], z.coeurs ? z.coeurs[0] : z.fond[z.fond.length - 1], 5, hash(x, y, graine + 19) * Math.PI, z.forme, (lumiere(x, y) - .45) * .8 + .12);
  }
  for (let gy = 0; gy < t.h; gy += pas * .86) for (let gx = (Math.floor(gy / pas) % 2) * pas / 2; gx < t.w; gx += pas) {
    const x = gx + (hash(gx, gy, graine) - .5) * pas * .7, y = gy + (hash(gy, gx, graine + 7) - .5) * pas * .7;
    if (!z.forme(x, y)) continue;
    const r = rmin + hash(x, y, graine + 3) * (rmax - rmin);
    if (posees.some(([a, b, c]) => Math.hypot(a - x, b - y) < (c + r) * .72)) continue;
    posees.push([x, y, r]);
    const k = Math.floor(hash(x, y, graine + 11) * z.fleurs.length);
    const coeur = z.coeurs ? z.coeurs[Math.floor(hash(y, x, graine + 13) * z.coeurs.length)] : z.fond[z.fond.length - 1];
    const biais = (lumiere(x, y) - .45) * .8 + .22;
    const n = hash(x, y, graine + 17) < .7 ? 5 : 6;
    fleur(t, x, y, r, z.fleurs[k], coeur, n, hash(x, y, graine + 19) * Math.PI, z.forme, biais);
  }
  /* entre les fleurs : de petites feuilles et quelques points de couleur */
  if (z.feuilles) for (const [x, y, r] of posees) if (hash(x, y, graine + 23) < .55) {
    const a = hash(y, x, graine + 29) * Math.PI * 2, lx = x + Math.cos(a) * r * 1.05, ly = y + Math.sin(a) * r * 1.05;
    if (z.forme(lx, ly)) remplir(t, inter(ellipse(lx + Math.cos(a) * 1.3, ly + Math.sin(a) * 1.3, 2.1, 1, a), z.forme), lit(lx, ly, 2.5, z.feuilles), lx, ly, 4);
  }
  if (z.points) for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) {
    if (!z.forme(x + .5, y + .5) || hash(x, y, graine + 31) > .035) continue;
    if (posees.some(([a, b, c]) => Math.hypot(a - x - .5, b - y - .5) < c + .6)) continue;
    t.set(x, y, z.points[Math.floor(hash(y, x, graine + 37) * z.points.length)]);
  }
}

/** Des rangs de plumes : des bandes le long de l'axe, séparées par un trait plus foncé, plus sombres vers la pointe. */
function plumes(t: Toile, forme: Shape, cx: number, cy: number, angle: number, ramp: Ramp, largeur = 2.6, pointe = 1) {
  const c = Math.cos(angle), s = Math.sin(angle);
  t.fill(forme, (x, y) => {
    const u = (x - cx) * c + (y - cy) * s, v = -(x - cx) * s + (y - cy) * c;
    const rang = Math.floor((v + 200) / largeur), bord = ((v + 200) % largeur) < .9;
    const avance = Math.max(0, Math.min(1, (u / 30 + .5) * pointe));
    const base = (rang % 2 ? .18 : .4) + hash(rang, 0, 5) * .12 + avance * .38;
    return pickRamp(ramp, bord ? Math.min(.999, base + .35) : base, x, y, false);
  });
}

function dessiner(t: Toile, o: Oiseau) {
  const [bx, by, brx, bry, brot] = o.corps, [hx, hy, hr] = o.tete, [ax, ay, arx, ary, arot] = o.aile;
  const corps = ellipse(bx, by, brx, bry, brot), tete = circle(hx, hy, hr), cou = ellipse((bx + hx) / 2 + 2, (by + hy) / 2, hr * .95, hr * 1.1, -.5);
  const queue = poly(o.queue), aile = ellipse(ax, ay, arx, ary, arot);
  const oiseau = masque(t, union(corps, tete, cou, queue));
  const F: Formes = { corps: masque(t, union(corps, cou)), tete: masque(t, tete), oiseau, aile: masque(t, aile), queue: masque(t, queue) };
  const lumiere = ombre(bx + 6, by - 8, Math.max(brx, bry) * 1.25);

  /* la branche, derrière les pattes mais devant la queue */
  const tronc = o.branche;
  const brancheForme = path(tronc, 5.4);
  /* la queue, puis le corps et ses zones */
  plumes(t, queue, o.queue[0][0], o.queue[0][1], Math.atan2(o.queue[2][1] - o.queue[0][1], o.queue[2][0] - o.queue[0][0]), o.plumesQueue, 2.4, 1.3);
  t.fill(diff(union(corps, tete, cou), queue), (x, y) => pickRamp(o.fondCorps, lumiere(x, y), x, y));
  const dedans = masque(t, diff(union(corps, tete, cou), queue));
  if (o.dos) jonchee(t, { forme: dedans, fond: o.fondCorps, densite: .95, ...o.dos }, o.graine * 100 + 90, lumiere);
  o.zones(F).forEach((z, i) => jonchee(t, { ...z, forme: inter(z.forme, dedans) }, o.graine * 100 + i, lumiere));
  /* l'aile : rangs de plumes, et ses couvertures fleuries en haut */
  plumes(t, aile, ax, ay, arot + Math.PI, o.plumes, 2.6, 1.4);
  if (o.couvertures) jonchee(t, { ...o.couvertures, forme: inter(aile, o.couvertures.forme) }, o.graine * 100 + 50, lumiere);
  t.outline(aile, o.contour);
  t.outline(oiseau, o.contour);
  /* l'œil : la pupille, son reflet, son liseré */
  const [ex, ey, er] = o.oeil;
  t.fill(circle(ex, ey, er + .9), o.fondCorps[0]);
  t.fill(circle(ex, ey, er), "310");
  t.set(Math.floor(ex - er * .45), Math.floor(ey - er * .45), "B5200");
  /* le bec */
  const [pts, haut, bas] = o.bec;
  const mi = (pts[0][1] + pts[pts.length - 1][1]) / 2;
  t.fill(poly(pts), (_x, y) => (y < mi ? haut : bas));
  t.fill(path([pts[0], pts[1]], .8), "3371");
  /* la branche et les pattes */
  t.fill(brancheForme, (x, y) => {
    const n = hash(Math.floor(x / 3), y, 9);
    return pickRamp(o.ecorce, (n * .5 + (y % 3 < 1 ? .4 : .1)), x, y, false);
  });
  for (let i = 2; i < tronc.length - 1; i += 3) {
    const [x0, y0] = tronc[i], dir = i % 2 ? -1.1 : -2.0;
    const rameau: Pt[] = bezier([x0, y0], [x0 + Math.cos(dir) * 6, y0 + Math.sin(dir) * 6], [x0 + Math.cos(dir) * 10, y0 + Math.sin(dir) * 11], [x0 + Math.cos(dir) * 15, y0 + Math.sin(dir) * 14], 12);
    const [lx, ly] = rameau[rameau.length - 1];
    if (rameau.some(([x, y]) => oiseau(x, y))) continue;   /* pas de rameau devant l'oiseau */
    remplir(t, path(rameau, 1.6), o.ecorce[2], (x0 + lx) / 2, (y0 + ly) / 2, 12);
    feuille(t, lx, ly, dir - .5, 9, o.feuillage, o.feuillage[o.feuillage.length - 1]);
    feuille(t, rameau[6][0], rameau[6][1], dir + .9, 7, o.feuillage);
    if (o.bourgeons) remplir(t, circle(lx + Math.cos(dir) * 2, ly + Math.sin(dir) * 2, 1.6), lit(lx, ly, 2, o.bourgeons[0]), lx + Math.cos(dir) * 2, ly + Math.sin(dir) * 2, 2);
  }
  const pied = (x: number) => { const k = tronc.reduce((m, p, i) => (Math.abs(p[0] - x) < Math.abs(tronc[m][0] - x) ? i : m), 0); return tronc[k][1] - 2; };
  for (const dx of [-5, 6]) {
    const px = bx + dx, py0 = by + bry * .82, py1 = pied(px);
    t.fill(path([[px, py0], [px + 1, py1]], 1.9), o.pattes);
    t.fill(path([[px - 3, py1 + 1], [px + 4, py1 + 1]], 1.2), o.pattes);
  }
}

/* ——— les couleurs DMC (rampes du clair au foncé) ——— */
const R = {
  orange: ["3824", "3341", "3340", "608", "606", "900"], rouge: ["3712", "3328", "347", "304", "816"], corail: ["3824", "352", "351", "350", "817"],
  sauge: ["524", "523", "522", "520"], olive: ["3013", "3012", "3011", "3787"], vert: ["3348", "3347", "3346", "3345", "895"], tilleul: ["472", "471", "470", "469"],
  bleu: ["3756", "3753", "3752", "932", "931", "930"], azur: ["3761", "519", "518", "517"], turquoise: ["3846", "3845", "3844", "3765"], marine: ["3750", "336", "823"],
  jaune: ["3823", "745", "744", "743", "742"], or: ["3822", "3821", "3820", "3852"], creme: ["B5200", "3865", "Ecru", "712", "739"], lin: ["739", "738", "437", "436"],
  brun: ["3864", "3863", "3862", "3781", "3371"], tabac: ["842", "841", "840", "839", "838"], gris: ["762", "415", "318", "414", "413"], ardoise: ["3753", "3752", "932", "3768", "924"],
  rose: ["819", "3713", "761", "760", "3712"], framboise: ["3716", "962", "961", "3832", "3350"], lavande: ["211", "210", "209", "208"], peche: ["3770", "945", "3779", "3778", "356"],
  ecorce: ["3864", "3863", "3862", "3031"], feuille: ["3348", "3347", "3346", "3345"],
};
/** La silhouette commune : un oiseau rond, perché, tourné vers la droite ; chaque espèce l'ajuste. */
const base = (graine: number, v: Partial<Oiseau> & Pick<Oiseau, "zones" | "fondCorps" | "plumes" | "plumesQueue" | "bec" | "branche">): Oiseau => ({
  graine,
  corps: [70, 78, 36, 31, -.35],
  tete: [96, 48, 21],
  queue: [[46, 92], [14, 124], [24, 130], [58, 104]],
  aile: [57, 86, 32, 13.5, -.69],
  oeil: [101, 44, 3.2],
  contour: "3371",
  pattes: "3371",
  ecorce: R.ecorce,
  feuillage: R.feuille,
  ...v,
});
const BRANCHE: Pt[] = bezier([4, 128], [50, 118], [100, 116], [148, 102], 30);
const BEC: Pt[] = [[113, 42], [126, 46], [113, 51]];

/** Le rouge-gorge fleuri — poitrine de pivoines orangées, dos olive semé de fleurs crème. */
export function rougeGorgeFleuri(t: Toile) {
  dessiner(t, base(1, {
    fondCorps: R.olive, plumes: ["3013", "3012", "3011", "3787", "3781"], plumesQueue: ["3012", "3011", "3787", "3781"], bec: [BEC, "3799", "414"], branche: BRANCHE, bourgeons: [R.rose, "3712"],
    couvertures: { forme: (_x, y) => y < 80, fond: R.olive, fleurs: [R.creme, R.jaune], coeurs: ["743", "3852"], taille: [2.4, 3.9], feuilles: R.sauge },
    dos: { fleurs: [R.creme, R.sauge, R.jaune], coeurs: ["3852", "3781"], taille: [2.4, 4], feuilles: R.sauge },
    zones: F => [
      { forme: diff(ellipse(98, 62, 22, 27, -.2), F.aile), fond: R.orange, grandes: 6, fleurs: [R.orange, R.corail, R.orange, R.rouge], coeurs: ["742", "3852", "900"], taille: [3.5, 6.4], feuilles: R.sauge },
      { forme: diff(inter(F.corps, ellipse(82, 98, 24, 13, -.25)), F.aile), fond: R.creme, fleurs: [R.creme, R.jaune], coeurs: ["743", "3852"], taille: [2.7, 4.8], feuilles: R.sauge, points: ["350", "743"] },
      { forme: diff(inter(F.tete, (x, y) => y < 40 || x < 92), ellipse(98, 62, 22, 27, -.2)), fond: R.olive, fleurs: [R.creme, R.sauge, R.jaune], coeurs: ["3852", "3781"], taille: [2.4, 4.2], feuilles: R.sauge },
    ],
  }));
}
/** La mésange aux fleurs des champs — calotte bleue, joue blanche, poitrine jaune pleine de boutons d'or. */
export function mesangeFleurie(t: Toile) {
  dessiner(t, base(2, {
    fondCorps: R.tilleul, plumes: ["3756", "3753", "3752", "932", "931"], plumesQueue: ["3753", "932", "931", "930"], bec: [[[113, 43], [123, 46], [113, 49]], "3799", "413"], branche: BRANCHE, bourgeons: [R.rose, "3712"],
    couvertures: { forme: (_x, y) => y < 78, fond: R.bleu, fleurs: [R.creme, R.azur], coeurs: ["743"], taille: [2.2, 3.6] },
    dos: { fleurs: [R.creme, R.vert, R.jaune], coeurs: ["3852"], taille: [2.2, 3.6], feuilles: R.sauge },
    zones: F => [
      { forme: inter(F.tete, (x, y) => y < 42 - (x - 96) * .15), fond: R.bleu, fleurs: [R.azur, R.creme], coeurs: ["743", "930"], taille: [2.2, 3.6] },
      { forme: ellipse(98, 51, 12, 7, -.1), fond: R.creme, fleurs: [R.creme, R.lavande], coeurs: ["743"], taille: [1.9, 3.1] },
      { forme: path([[80, 46], [96, 46], [112, 44]], 2.4), fond: R.marine },
      { forme: diff(union(ellipse(92, 82, 24, 26, -.2), inter(F.tete, (_x, y) => y > 58)), F.aile), fond: R.jaune, grandes: 5, fleurs: [R.jaune, R.or, R.creme], coeurs: ["3852", "3011"], taille: [3.0, 5.6], feuilles: R.vert, points: ["3346"] },
    ],
  }));
}
/** Le chardonneret en fête — masque rouge, joues blanches, aile noire barrée d'or. */
export function chardonneretEnFete(t: Toile) {
  dessiner(t, base(3, {
    fondCorps: R.tabac, plumes: ["414", "3799", "3371", "310"], plumesQueue: ["3787", "3371", "310"], bec: [[[113, 41], [127, 46], [113, 51]], "3866", "738"], branche: BRANCHE, bourgeons: [R.framboise, "3350"],
    couvertures: { forme: (_x, y) => y < 82, fond: R.or, fleurs: [R.jaune, R.or], coeurs: ["3371"], taille: [2.4, 3.9] },
    dos: { fleurs: [R.lin, R.creme, R.tabac], coeurs: ["3781"], taille: [2.2, 3.6], feuilles: R.sauge },
    zones: F => [
      { forme: inter(F.tete, ellipse(108, 46, 12, 10)), fond: R.rouge, fleurs: [R.rouge, R.framboise], coeurs: ["3371"], taille: [2.2, 3.6] },
      { forme: diff(inter(F.tete, ellipse(94, 56, 13, 11)), ellipse(108, 46, 12, 10)), fond: R.creme, fleurs: [R.creme], coeurs: ["743"], taille: [1.9, 3.1] },
      { forme: inter(F.tete, (x, y) => y < 36 && x > 86), fond: ["3799", "3371", "310"] },
      { forme: diff(inter(F.corps, ellipse(88, 92, 24, 20, -.3)), F.aile), fond: R.lin, grandes: 4, fleurs: [R.lin, R.creme, R.peche], coeurs: ["3852", "3781"], taille: [2.7, 5.0], feuilles: R.sauge },
    ],
  }));
}
/** Le martin-pêcheur — dos de turquoises et de bleuets, ventre orangé, long bec. */
export function martinPecheur(t: Toile) {
  dessiner(t, base(4, {
    fondCorps: R.turquoise, plumes: ["3846", "3845", "3844", "3765", "3750"], plumesQueue: ["3845", "3844", "3765", "3750"], bec: [[[112, 40], [138, 47], [112, 51]], "310", "3371"], branche: BRANCHE,
    queue: [[48, 94], [24, 118], [32, 124], [58, 104]],
    couvertures: { forme: (_x, y) => y < 82, fond: R.turquoise, fleurs: [R.azur, R.bleu, R.creme], coeurs: ["742"], taille: [2.2, 3.9] },
    dos: { fleurs: [R.azur, R.creme, R.bleu], coeurs: ["742"], taille: [2.2, 3.6] },
    zones: F => [
      { forme: diff(union(ellipse(90, 88, 26, 22, -.2), inter(F.tete, ellipse(100, 62, 12, 7))), F.aile), fond: R.peche, grandes: 5, fleurs: [R.peche, R.orange, R.corail], coeurs: ["3852", "900"], taille: [3.0, 5.6], feuilles: R.vert },
      { forme: inter(F.tete, ellipse(94, 52, 8, 4.5, .2)), fond: R.creme },
      { forme: diff(F.tete, ellipse(100, 62, 12, 7), ellipse(94, 52, 8, 4.5, .2)), fond: R.turquoise, fleurs: [R.azur, R.creme], coeurs: ["742"], taille: [1.9, 3.4] },
    ],
  }));
}
/** Le moineau des jardins — tout en bruns et en lin, semé de fleurettes de lavande. */
export function moineauDesJardins(t: Toile) {
  dessiner(t, base(5, {
    fondCorps: R.tabac, plumes: ["842", "841", "840", "839", "3371"], plumesQueue: ["840", "839", "838", "3371"], bec: [[[113, 42], [123, 46], [113, 50]], "414", "318"], branche: BRANCHE, bourgeons: [R.lavande, "208"],
    couvertures: { forme: (_x, y) => y < 82, fond: R.tabac, fleurs: [R.lin, R.lavande], coeurs: ["743"], taille: [2.4, 3.9] },
    dos: { fleurs: [R.lin, R.lavande, R.creme], coeurs: ["743"], taille: [2.2, 3.6], feuilles: R.sauge },
    zones: F => [
      { forme: inter(F.tete, (_x, y) => y < 42), fond: R.gris, fleurs: [R.gris, R.lavande], coeurs: ["743"], taille: [2.2, 3.6] },
      { forme: inter(F.tete, ellipse(108, 58, 4.5, 6)), fond: ["3799", "3371", "310"] },
      { forme: diff(inter(F.corps, ellipse(88, 90, 26, 22, -.3)), F.aile), fond: R.lin, grandes: 4, fleurs: [R.lin, R.creme, R.lavande], coeurs: ["3852", "3781"], taille: [2.7, 5.0], feuilles: R.sauge, points: ["209"] },
      { forme: diff(inter(F.tete, (_x, y) => y >= 42), ellipse(108, 58, 4.5, 6)), fond: R.lin, fleurs: [R.creme, R.lavande], coeurs: ["743"], taille: [2.4, 3.9] },
    ],
  }));
}
/** Le bouvreuil en hiver — poitrine de roses framboise, dos gris perle, calotte noire. */
export function bouvreuilEnHiver(t: Toile) {
  dessiner(t, base(6, {
    fondCorps: R.gris, plumes: ["415", "318", "414", "3799", "310"], plumesQueue: ["414", "3799", "310"], bec: [[[113, 43], [121, 47], [113, 51]], "3799", "310"], branche: BRANCHE, bourgeons: [R.rouge, "816"],
    corps: [70, 80, 38, 33, -.3],
    couvertures: { forme: (_x, y) => y < 80, fond: ["B5200", "762", "415"], fleurs: [R.creme], coeurs: ["414"], taille: [2.2, 3.4] },
    dos: { fleurs: [R.creme, R.gris, R.lavande], coeurs: ["414"], taille: [2.2, 3.6] },
    zones: F => [
      { forme: inter(F.tete, (x, y) => y < 42 || x > 108), fond: ["3799", "3371", "310"] },
      { forme: diff(union(ellipse(92, 82, 27, 28, -.2), inter(F.tete, (x, y) => y >= 42 && x <= 108)), F.aile), fond: R.framboise, grandes: 6, fleurs: [R.rose, R.framboise, R.rouge], coeurs: ["3371", "743"], taille: [3.2, 6.2], feuilles: R.sauge, points: ["B5200"] },
      { forme: diff(inter(F.corps, ellipse(70, 106, 20, 7)), F.aile), fond: R.creme, fleurs: [R.creme], coeurs: ["762"], taille: [2.2, 3.4] },
    ],
  }));
}
/** L'hirondelle au printemps — dos marine semé de myosotis, gorge rouge, longue queue fourchue. */
export function hirondelleAuPrintemps(t: Toile) {
  dessiner(t, base(7, {
    fondCorps: R.marine, plumes: ["932", "931", "930", "3750", "823"], plumesQueue: ["930", "3750", "823", "939"], bec: [[[114, 43], [121, 46], [114, 49]], "310", "3371"], branche: BRANCHE, bourgeons: [R.rose, "3712"],
    corps: [72, 78, 34, 26, -.45], tete: [96, 50, 18], oeil: [101, 46, 2.8],
    queue: [[50, 90], [4, 128], [12, 132], [40, 108], [18, 138], [26, 140], [60, 102]],
    aile: [54, 88, 42, 12, -.62],
    couvertures: { forme: (_x, y) => y < 80, fond: R.marine, fleurs: [R.azur, R.creme], coeurs: ["743"], taille: [2.2, 3.6] },
    dos: { fleurs: [R.azur, R.creme, R.bleu], coeurs: ["743"], taille: [2.2, 3.4] },
    zones: F => [
      { forme: inter(F.tete, ellipse(106, 58, 10, 8)), fond: R.rouge, fleurs: [R.rouge, R.corail], coeurs: ["3371"], taille: [2.2, 3.6] },
      { forme: diff(inter(F.corps, ellipse(90, 90, 24, 18, -.35)), F.aile, ellipse(106, 58, 10, 8)), fond: R.creme, grandes: 3, fleurs: [R.creme, R.rose, R.azur], coeurs: ["743", "3852"], taille: [2.7, 4.8], feuilles: R.sauge },
      { forme: diff(F.tete, ellipse(106, 58, 10, 8)), fond: R.marine, fleurs: [R.azur, R.bleu], coeurs: ["743"], taille: [1.9, 3.4] },
    ],
  }));
}
/** La sittelle des bois — dos bleu ardoise fleuri, ventre pêche, trait noir sur l'œil. */
export function sittelleDesBois(t: Toile) {
  dessiner(t, base(8, {
    fondCorps: R.ardoise, plumes: ["3753", "3752", "932", "3768", "924"], plumesQueue: ["932", "3768", "924", "3799"], bec: [[[112, 42], [131, 45], [112, 49]], "3799", "414"], branche: BRANCHE, bourgeons: [R.peche, "356"],
    couvertures: { forme: (_x, y) => y < 80, fond: R.ardoise, fleurs: [R.creme, R.lavande, R.azur], coeurs: ["743"], taille: [2.2, 3.9] },
    dos: { fleurs: [R.azur, R.creme, R.lavande], coeurs: ["743"], taille: [2.2, 3.6] },
    zones: F => [
      { forme: diff(union(ellipse(90, 90, 26, 22, -.25), inter(F.tete, (_x, y) => y > 50)), F.aile), fond: R.peche, grandes: 5, fleurs: [R.peche, R.creme, R.corail], coeurs: ["3852", "3781"], taille: [3.0, 5.3], feuilles: R.sauge, points: ["350"] },
      { forme: inter(F.tete, path([[84, 44], [100, 44], [112, 44]], 3)), fond: ["3799", "3371", "310"] },
      { forme: diff(inter(F.tete, (_x, y) => y <= 50), path([[84, 44], [100, 44], [112, 44]], 3)), fond: R.ardoise, fleurs: [R.azur, R.creme], coeurs: ["743"], taille: [2.2, 3.6] },
    ],
  }));
}

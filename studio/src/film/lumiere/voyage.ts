/**
 * LUMIERE — le clip complet de « La Fleur du Ciel » (4 min 13) : le voyage.
 * Le temps du récit EST le temps du morceau (t = 0 → 253 s). Les charnières sont des repères mesurés dans le WAV original :
 *  00:08.25 la lumière naît · 01:12.25 on entre dans le ciel · 01:52.25 → 02:40.25 la nuit tombe · 03:06.25 l'eau de la nuit ·
 *  03:14.25 la goutte · 03:16.275 le creux · 03:16.775 la chute · 03:18.255 L'IMPACT (canonique) : l'onde en arc-en-ciel ·
 *  03:20.25 on traverse l'arc-en-ciel · 03:26.25 la Terre vue du ciel · 03:34.25 la descente · 03:46.25 le Disque dans l'herbe ·
 *  03:56–03:58 le quasi-silence · 04:02.75 le grave revient : la goutte touche le Disque, la Perle s'allume · 04:13 la fin.
 * Entre 03:06.25 et 03:26.25, l'eau, la goutte et l'impact sont ceux de l'animatique (même moteur, même repère).
 */
import { scene, type Scene, type Voyage } from "./partition";

const cl = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const l = (a: number, b: number, t: number) => { const x = cl((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const exp = (a: number, b: number, u: number) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * cl(u));
const ANIM = 184.25;   // le début de l'animatique dans le morceau

export const REPERES_VOYAGE = { lumiere: 8.25, ciel: 72.25, crepuscule: 112.25, nuit: 160.25, eau: 186.25, goutte: 194.25, creux: 196.275, chute: 196.775,
  impact: 198.255, arc: 200.25, terre: 206.25, descente: 214.25, disque: 226.25, silence: 236.25, goutteDisque: 240.25, perle: 242.75, fin: 253 } as const;
const R = REPERES_VOYAGE;

const neutre = (t: number): Scene => ({
  t: -100, etoiles: 0, nuages: 0, defilement: 0, brume: 0, perle: { x: .5, y: .5, r: .02, eclat: 1, visible: 0 }, goutte: 0, eau: 0, horizon: .42, plongee: 0,
  depuisContact: -1, ripple: 0, reperes: 0, positions: 0, grille: 0, carres: 0, disque: 0, repli: 0, blanc: 0, gel: 0, son: 1 - l(R.fin - 1.5, R.fin, t),
});

export function sceneVoyage(t: number): Scene {
  /* l'eau de la nuit, la goutte, l'impact : la scène de l'animatique, sans la caméra qui s'élève (on traverse l'arc-en-ciel) */
  const fenetre = t >= R.eau && t < R.terre + .5;
  const s: Scene = fenetre ? { ...scene(t - ANIM) } : neutre(t);
  if (fenetre) Object.assign(s, { plongee: 0, ripple: 0, reperes: 0, positions: 0, grille: 0, carres: 0, disque: 0, repli: 0, blanc: 0, son: 1, etoiles: 0 });

  /* la perle : une étoile qui naît au centre, grandit pendant le voyage, flotte au-dessus des nuages */
  const avantGoutte = t < R.goutte;
  if (avantGoutte) {
    s.perle = { x: .5, y: .5 + .006 * Math.sin(t * .45) * l(R.ciel, R.ciel + 8, t), r: .0035 + .0165 * l(R.lumiere + 2, 64, t), eclat: 1 + .2 * l(R.nuit, R.eau, t), visible: l(R.lumiere - .3, R.lumiere + 1.6, t) };
    s.goutte = 0;
  }
  /* les nuages de la nuit (on y descend), puis l'eau */
  s.nuages = Math.max(fenetre ? 0 : 0, l(R.nuit, R.nuit + 6, t) * (1 - l(R.eau - 2, R.eau + 3, t)));
  s.defilement = l(R.nuit, R.eau + 4, t);
  s.brume = Math.max(l(170, R.eau, t) * (1 - l(R.arc, R.terre, t)), fenetre ? s.brume * .6 : 0);
  if (fenetre && t < R.goutte) { s.eau = l(R.eau, R.eau + 5, t); s.nuages = s.nuages * (1 - s.eau); }
  s.etoiles = 1 - l(66, 76, t);   /* le cosmos est là dès la première image (l'attente du Play EST cette image) */

  const terre = l(R.terre - .6, R.terre + .4, t);
  const altitude = t < R.descente ? exp(30, 18, (t - R.terre) / (R.descente - R.terre)) : t < R.disque ? exp(18, .6, (t - R.descente) / (R.disque - R.descente)) : t < R.perle ? exp(.6, .3, (t - R.disque) / (R.perle - R.disque)) : exp(.3, .27, (t - R.perle) / (R.fin - R.perle));
  const vitesse = (x: number) => 1.4 * (1 - l(R.disque - 4, R.disque + 4, x));
  let avanceSol = 0; for (let x = R.terre; x < Math.min(t, R.disque + 4); x += .5) avanceSol += vitesse(x) * .5 * .05;
  const activation = l(R.perle, R.perle + 2.2, t);
  const v: Voyage = {
    galaxie: l(2, 14, t) * (1 - l(66, 76, t)),
    avance: Math.max(0, t - R.lumiere) * .55,
    ciel: l(68, 78, t) * (1 - (fenetre ? s.eau : 0)) * (1 - terre) + terre,
    crepuscule: l(R.crepuscule, 136, t) * (1 - terre),
    nuit: l(134, R.nuit, t) * (1 - terre),
    mer: l(74, 82, t) * (1 - l(R.nuit - 2, R.nuit + 8, t)),
    arc: l(R.impact, R.impact + 1.2, t) * (1 - l(R.terre - 1, R.terre + .5, t)),
    traverse: t < R.arc ? 0 : t < R.terre ? cl((t - R.arc) / (R.terre - R.arc)) : 1 + l(R.terre, R.terre + 3, t),   /* > 1 : le voile du jour se retire, la Terre apparaît */
    terre, altitude, plongeeSol: l(R.descente - 1, R.disque - 1, t), avanceSol,
    disqueSol: l(R.disque - 3, R.disque + 3, t),
    rDisque: Math.min(.36, .3 * (.3 / altitude)),
    goutteDisque: t < R.goutteDisque || t > R.perle ? 0 : cl((t - R.goutteDisque) / (R.perle - R.goutteDisque)),
    activation,
  };
  s.voyage = v;
  if (terre > .99) { s.plongee = 1; s.eau = 0; s.nuages = 0; s.perle = { ...s.perle, visible: 0 }; s.t = -100; s.depuisContact = -1; }   /* au-dessus de la Terre : le centre de l'écran est celui du Disque */
  s.repli = l(R.fin - 3.6, R.fin - 2.8, t);   /* la Perle du Disque devient le Point (il rejoindra la Première rencontre) */
  s.blanc = l(R.fin - 3.5, R.fin - .2, t);
  s.son = 1 - l(R.fin - 1.5, R.fin, t);
  return s;
}

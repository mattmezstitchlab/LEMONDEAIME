/**
 * Le calendrier radial : DES CHIFFRES, DES POINTS, UN CERCLE. Le noyau, sans dessin (fonction pure, testée).
 *
 * Une période choisie (au centre) et ses voisines (sur la bague) à la même échelle :
 *   année (les années) → mois (les 12 mois) → jour (les jours du mois) → heure (24 heures) → moment (les éléments de l'heure).
 *   semaine : les semaines du mois (repérées par leur lundi), à côté de jour.
 * Les éléments gardent leur précision réelle : une date au mois près n'est jamais posée sur un jour ; un élément sans date
 * n'est sur aucune bague (il est listé à part). Les clés tiennent dans une adresse (lettres minuscules, chiffres, tirets).
 * Le temps est celui de l'appareil (heure locale), sans fuseau.
 */
import type { Element, Precision } from "../present/projets";

export type Echelle = "annee" | "mois" | "semaine" | "jour" | "heure" | "moment";
export const ECHELLES: Echelle[] = ["annee", "mois", "semaine", "jour", "heure", "moment"];
export const NOM_ECHELLE: Record<Echelle, string> = { annee: "Année", mois: "Mois", semaine: "Semaine", jour: "Jour", heure: "Heure", moment: "Moment" };
export interface Periode { echelle: Echelle; cle: string }
export interface Item { cle: string; chiffre: string; nom: string; compte: number }

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const z = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
const jourDe = (cle: string) => { const [a, m, j] = cle.split("-").map(Number); return new Date(a, m - 1, j); };
const nbJours = (a: number, m: number) => new Date(a, m, 0).getDate();
const lundi = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

/** la date d'un élément, découpée : ce qui est connu seulement */
function parties(e: Element) {
  if (!e.date || e.precision === "aucune") return null;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?(?:T(\d{2}):(\d{2}))?$/.exec(e.date); if (!m) return null;
  const p = e.precision, a = +m[1], mo = m[2] && p !== "annee" ? +m[2] : undefined, j = m[3] && (p === "jour" || p === "minute") ? +m[3] : undefined;
  const h = m[4] && p === "minute" ? +m[4] : undefined, mi = m[5] && p === "minute" ? +m[5] : undefined;
  return { a, mo, j, h, mi };
}
/** la précision la plus fine qu'il faut pour être posé sur une bague de cette échelle */
const BESOIN: Record<Echelle, Precision[]> = { annee: ["annee", "mois", "jour", "minute"], mois: ["mois", "jour", "minute"], semaine: ["jour", "minute"], jour: ["jour", "minute"], heure: ["minute"], moment: ["minute"] };

/** l'élément appartient-il à cette période, au niveau de précision de son échelle ? */
export function dans(e: Element, p: Periode): boolean {
  const d = parties(e); if (!d || !BESOIN[p.echelle].includes(e.precision)) return false;
  if (p.echelle === "moment") return e.id === p.cle.slice(2);
  const [a, mo, j] = p.cle.split("-").map(Number);
  if (d.a !== a) return false;
  if (p.echelle === "annee") return true;
  if (d.mo !== mo) { if (p.echelle !== "semaine") return false; }
  if (p.echelle === "mois") return true;
  if (p.echelle === "semaine") { if (d.mo === undefined || d.j === undefined) return false; const l = jourDe(p.cle), x = new Date(d.a, d.mo - 1, d.j); return x >= l && x.getTime() < l.getTime() + 7 * 864e5; }
  if (d.j !== j) return false;
  if (p.echelle === "jour") return true;
  return d.h === Number(p.cle.split("-h")[1]);
}
/** les éléments qui touchent la période sans pouvoir y être posés précisément (ex. « octobre 2026 » quand on regarde le 30) */
export function approximatifs(elements: Element[], p: Periode): Element[] {
  const plusLarge: Periode | null = p.echelle === "moment" || p.echelle === "heure" ? { echelle: "jour", cle: p.cle.slice(0, 10) } : p.echelle === "jour" || p.echelle === "semaine" ? { echelle: "mois", cle: p.cle.slice(0, 7) } : p.echelle === "mois" ? { echelle: "annee", cle: p.cle.slice(0, 4) } : null;
  if (!plusLarge) return [];
  return elements.filter(e => !dans(e, p) && e.precision !== "aucune" && BESOIN[plusLarge.echelle].includes(e.precision) && !BESOIN[p.echelle].includes(e.precision) && dans(e, plusLarge));
}
export const sansDate = (elements: Element[]) => elements.filter(e => !e.date || e.precision === "aucune");

/** le nom d'une période, en entier (dit au lecteur d'écran, montré au centre) */
export function nomPeriode(p: Periode, elements: Element[] = []): string {
  if (p.echelle === "annee") return p.cle;
  if (p.echelle === "moment") { const e = elements.find(x => x.id === p.cle.slice(2)); return e ? `${e.date?.slice(11, 16) ?? ""} · ${e.titre}` : "un moment"; }
  const [a, mo] = p.cle.split("-").map(Number);
  if (p.echelle === "mois") return `${MOIS[mo - 1]} ${a}`;
  const d = jourDe(p.cle.slice(0, 10));
  if (p.echelle === "semaine") return `semaine du ${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  const jour = `${JOURS[d.getDay()]} ${d.getDate() === 1 ? "1er" : d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
  return p.echelle === "jour" ? jour : `${jour}, ${Number(p.cle.split("-h")[1])} h`;
}

/** la période de cette échelle qui contient (ou commence) la période donnée ; `aujourdhui` sert quand rien d'autre ne guide */
export function vers(p: Periode, echelle: Echelle, elements: Element[], aujourdhui: Date): Periode {
  if (p.echelle === echelle) return p;
  const jour = p.cle.length >= 10 ? p.cle.slice(0, 10) : null;
  const ref = jour ? jourDe(jour) : p.cle.length >= 7 ? new Date(+p.cle.slice(0, 4), +p.cle.slice(5, 7) - 1, 1) : new Date(+p.cle.slice(0, 4), 0, 1);
  if (p.echelle === "moment") { const e = elements.find(x => x.id === p.cle.slice(2)); if (e?.date) return vers({ echelle: "heure", cle: e.date.slice(0, 10) + "-h" + e.date.slice(11, 13) }, echelle, elements, aujourdhui); }
  /* en descendant, on va là où sont les éléments (le premier de la période), sinon au début de la période */
  const premier = (pp: Periode, fine: Echelle) => anneau(pp, elements, aujourdhui, fine).find(i => i.compte > 0);
  switch (echelle) {
    case "annee": return { echelle, cle: String(ref.getFullYear()) };
    case "mois": { const pp = { echelle, cle: `${ref.getFullYear()}-${z(ref.getMonth() + 1)}` }; if (p.echelle !== "annee") return pp; const i = premier({ echelle: "annee", cle: p.cle }, "mois"); return i ? { echelle, cle: i.cle } : pp; }
    case "semaine": return { echelle, cle: ymd(lundi(jour ? ref : premierJour(p, elements, ref))) };
    case "jour": return { echelle, cle: jour ?? ymd(premierJour(p, elements, ref)) };
    case "heure": { const d = jour ?? ymd(premierJour(p, elements, ref)); const e = elements.filter(x => x.precision === "minute" && x.date?.startsWith(d)).sort((a, b) => (a.date! < b.date! ? -1 : 1))[0]; return { echelle, cle: `${d}-h${e ? e.date!.slice(11, 13) : "00"}` }; }
    case "moment": { const h = p.echelle === "heure" ? p : vers(p, "heure", elements, aujourdhui); const e = elements.filter(x => dans(x, h)).sort((a, b) => (a.date! < b.date! ? -1 : 1))[0]; return e ? { echelle, cle: "m-" + e.id } : h; }
  }
}
function premierJour(p: Periode, elements: Element[], ref: Date): Date {
  const avec = elements.filter(e => BESOIN.jour.includes(e.precision) && dans(e, { echelle: p.echelle === "semaine" ? "semaine" : p.echelle === "mois" ? "mois" : "annee", cle: p.cle })).map(e => e.date!.slice(0, 10)).sort();
  return avec[0] ? jourDe(avec[0]) : ref;
}

/** la bague : les voisines de la période à son échelle (ou à l'échelle `fine` pour les enfants), avec le compte d'éléments posés */
export function anneau(p: Periode, elements: Element[], aujourdhui: Date, fine: Echelle = p.echelle): Item[] {
  const avec = (cle: string, chiffre: string, e: Echelle): Item => { const per = { echelle: e, cle }; return { cle, chiffre, nom: nomPeriode(per, elements), compte: elements.filter(x => dans(x, per)).length }; };
  const a = +p.cle.slice(0, 4), mo = p.cle.length >= 7 ? +p.cle.slice(5, 7) : 1;
  switch (fine) {
    case "annee": {
      const ans = elements.map(e => parties(e)?.a).filter((x): x is number => !!x).concat(aujourdhui.getFullYear(), a);
      let de = Math.min(...ans) - 1, a2 = Math.max(...ans) + 1; while (a2 - de + 1 < 5) { de--; a2++; } if (a2 - de + 1 > 12) de = a2 - 11;
      return Array.from({ length: a2 - de + 1 }, (_, i) => avec(String(de + i), String(de + i), "annee"));
    }
    case "mois": return Array.from({ length: 12 }, (_, i) => avec(`${a}-${z(i + 1)}`, String(i + 1), "mois"));
    case "jour": return Array.from({ length: nbJours(a, mo) }, (_, i) => avec(`${a}-${z(mo)}-${z(i + 1)}`, String(i + 1), "jour"));
    case "semaine": {
      const l = lundi(new Date(a, mo - 1, 1)), fin = new Date(a, mo - 1, nbJours(a, mo)), r: Item[] = [];
      for (let d = l; d <= fin; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) r.push(avec(ymd(d), String(d.getDate()), "semaine"));
      return r;
    }
    case "heure": { const j = p.cle.slice(0, 10); return Array.from({ length: 24 }, (_, h) => avec(`${j}-h${z(h)}`, String(h), "heure")); }
    case "moment": {
      const h = p.echelle === "moment" ? vers(p, "heure", elements, aujourdhui) : p;
      return elements.filter(e => dans(e, h)).sort((x, y) => (x.date! < y.date! ? -1 : 1)).map(e => ({ cle: "m-" + e.id, chiffre: e.date!.slice(11, 16), nom: `${e.date!.slice(11, 16)} · ${e.titre}`, compte: 1 }));
    }
  }
}

/** les échelles voisines : vers le plus fin (Entrée) et vers le plus large (Échap) */
export const plusFine: Record<Echelle, Echelle | null> = { annee: "mois", mois: "jour", semaine: "jour", jour: "heure", heure: "moment", moment: null };
export const plusLarge: Record<Echelle, Echelle | null> = { annee: null, mois: "annee", semaine: "mois", jour: "mois", heure: "jour", moment: "heure" };

/** une période depuis l'adresse (f.e, f.t), ou null si elle n'est pas lisible */
export function lirePeriode(e?: string, t?: string): Periode | null {
  if (!e || !t || !(ECHELLES as string[]).includes(e)) return null;
  const ok: Record<Echelle, RegExp> = { annee: /^\d{4}$/, mois: /^\d{4}-\d{2}$/, semaine: /^\d{4}-\d{2}-\d{2}$/, jour: /^\d{4}-\d{2}-\d{2}$/, heure: /^\d{4}-\d{2}-\d{2}-h\d{2}$/, moment: /^m-[a-z0-9-]{1,38}$/ };
  return ok[e as Echelle].test(t) ? { echelle: e as Echelle, cle: t } : null;
}

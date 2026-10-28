import { computeStats, type Pattern, type Session } from "./pattern";
export function sessionSummary(p: Pattern) {
  const sessions = p.sessions ?? [], seconds = sessions.reduce((n, s) => n + s.seconds, 0), cells = sessions.reduce((n, s) => n + s.cells, 0);
  const days = [...new Set(sessions.filter((s) => s.seconds > 0).map((s) => s.date))].sort();
  let longest = 0, chain = 0, previous = 0;
  for (const date of days) { const time = Date.parse(`${date}T12:00:00Z`); chain = time - previous === 86400000 ? chain + 1 : 1; previous = time; longest = Math.max(longest, chain); }
  const { totals } = computeStats(p), remaining = totals.contentCells - totals.doneCells;
  const perMinute = seconds > 0 ? cells / seconds * 60 : 0;
  const activeDays = Math.max(1, days.length), perDay = cells / activeDays;
  const eta = perDay > 0 && days.length >= 3 ? new Date(Date.now() + Math.ceil(remaining / perDay) * 86400000).toLocaleDateString("fr-FR") : null;
  return { longest, activeDays: days.length, perMinute, eta };
}

/** Clé de date locale, identique à celle employée par le journal de l'atelier. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface ActivityDay {
  date: string;
  seconds: number;
  cells: number;
  /** 0 = rien, 1 à 4 = quartiles du meilleur jour affiché. */
  level: 0 | 1 | 2 | 3 | 4;
  today: boolean;
  /** 0 = lundi, comme l'affichage. */
  weekday: number;
  /** Jour de calage, avant la fenêtre demandée : il porte quand même ses vraies données. */
  padding: boolean;
}

export interface ActivityGrid {
  days: ActivityDay[];
  /** Nombre de colonnes de la grille, une par semaine. */
  weeks: number;
  /** Meilleure journée affichée : c'est elle qui fixe l'échelle des niveaux. */
  peak: number;
  activeDays: number;
  totalCells: number;
  totalMinutes: number;
}

/**
 * Calendrier d'activité des derniers jours.
 *
 * Le journal existe déjà dans le fichier projet (`sessions`, une entrée par
 * date) ; il n'était lisible qu'en chiffres. La fenêtre est recalée sur un
 * lundi pour que chaque colonne soit une semaine complète, et les jours de
 * calage portent leurs vraies données plutôt que d'être coloriés comme des
 * jours sans broderie.
 *
 * Les dates sont locales : le journal de l'atelier est tenu en date locale, et
 * une grille en UTC décalerait d'un jour les soirées d'une brodeuse européenne.
 */
export function activityGrid(sessions: Session[], days = 91, now = new Date()): ActivityGrid {
  const byDate = new Map(sessions.map((s) => [s.date, s]));
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = new Date(end);
  from.setDate(from.getDate() - (days - 1));
  const shift = (from.getDay() + 6) % 7; // jours de calage, lundi = 0
  const start = new Date(from);
  start.setDate(start.getDate() - shift);
  const todayKey = dateKey(end);

  const read: { date: string; seconds: number; cells: number; weekday: number; padding: boolean }[] = [];
  for (let i = 0; i < shift + days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = dateKey(d);
    const s = byDate.get(key);
    read.push({ date: key, seconds: s?.seconds ?? 0, cells: s?.cells ?? 0, weekday: (d.getDay() + 6) % 7, padding: i < shift });
  }
  const peak = read.reduce((m, d) => Math.max(m, d.cells), 0);
  const level = (cells: number): ActivityDay["level"] => {
    if (cells <= 0 || !peak) return 0;
    const ratio = cells / peak;
    return ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;
  };

  return {
    days: read.map((d) => ({ ...d, level: level(d.cells), today: d.date === todayKey })),
    weeks: Math.ceil(read.length / 7),
    peak,
    activeDays: read.filter((d) => d.seconds > 0 || d.cells > 0).length,
    totalCells: read.reduce((n, d) => n + d.cells, 0),
    totalMinutes: Math.round(read.reduce((n, d) => n + d.seconds, 0) / 60),
  };
}

/** Meilleure journée enregistrée, toutes dates confondues. */
export function bestDay(sessions: Session[]): Session | null {
  let best: Session | null = null;
  for (const s of sessions) if (!best || s.cells > best.cells) best = s;
  return best;
}

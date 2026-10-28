import { describe, expect, it } from "vitest";
import { activityGrid, bestDay, dateKey } from "../lib/sessionStats";
import type { Session } from "../lib/pattern";

/**
 * Journal de bord : le calendrier d'activité.
 *
 * Les dates sont construites en local, comme le fait l'atelier — une grille en
 * UTC décalerait d'un jour les soirées européennes.
 */

/** Mardi 13 octobre 2026, en local. */
const NOW = new Date(2026, 9, 13);
const day = (offset: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
};
const session = (offset: number, seconds: number, cells: number): Session => ({ date: day(offset), seconds, cells });

describe("Calendrier d'activité", () => {
  it("recadre la fenêtre sur un lundi et s'arrête aujourd'hui", () => {
    const grid = activityGrid([], 91, NOW);
    expect(grid.days[0].weekday).toBe(0);
    expect(grid.days[0].padding).toBe(true);
    expect(grid.days.at(-1)!.date).toBe(day(0));
    expect(grid.days.at(-1)!.today).toBe(true);
    expect(grid.days.at(-1)!.weekday).toBe(1); // mardi
    // 91 jours demandés, plus le calage de la première semaine.
    expect(grid.days.length).toBeGreaterThanOrEqual(91);
    expect(grid.days.length).toBeLessThan(91 + 7);
    expect(grid.weeks).toBe(Math.ceil(grid.days.length / 7));
    expect(grid.peak).toBe(0);
    expect(grid.activeDays).toBe(0);
    expect(grid.days.every((d) => d.level === 0)).toBe(true);
  });

  it("place chaque journée à sa place, avec ses vraies données", () => {
    const grid = activityGrid([session(0, 1800, 120), session(-1, 600, 40)], 91, NOW);
    const today = grid.days.find((d) => d.today)!;
    expect(today.cells).toBe(120);
    expect(today.seconds).toBe(1800);
    expect(today.level).toBe(4);
    const yesterday = grid.days.find((d) => d.date === day(-1))!;
    expect(yesterday.cells).toBe(40);
    // 40 / 120 = 0,33 : deuxième quartile de la meilleure journée affichée.
    expect(yesterday.level).toBe(2);
    expect(grid.peak).toBe(120);
    expect(grid.activeDays).toBe(2);
    expect(grid.totalCells).toBe(160);
    expect(grid.totalMinutes).toBe(40);
  });

  it("échelle relative : les niveaux sont les quartiles du meilleur jour", () => {
    const peak = session(0, 3600, 200);
    const grid = activityGrid(
      [peak, session(-1, 60, 50), session(-2, 60, 100), session(-3, 60, 150), session(-4, 60, 200)],
      91,
      NOW,
    );
    const level = (offset: number) => grid.days.find((d) => d.date === day(offset))!.level;
    expect(level(-1)).toBe(1); // 50 / 200 = 0,25
    expect(level(-2)).toBe(2); // 0,50
    expect(level(-3)).toBe(3); // 0,75
    expect(level(-4)).toBe(4); // 1,00
    expect(level(0)).toBe(4); // la meilleure journée, deux fois
    expect(grid.peak).toBe(200);
  });

  it("ignore les journées hors de la fenêtre", () => {
    const grid = activityGrid([session(-400, 3600, 900), session(-1, 60, 10)], 91, NOW);
    expect(grid.peak).toBe(10);
    expect(grid.totalCells).toBe(10);
    expect(grid.activeDays).toBe(1);
    expect(grid.days.some((d) => d.cells === 900)).toBe(false);
  });

  it("les jours de calage ne mentent pas sur une journée brodée", () => {
    // Un samedi précédant la fenêtre de 91 jours : il est affiché dans la
    // première colonne, il doit porter ses cases.
    const grid = activityGrid([], 91, NOW);
    const padding = grid.days.filter((d) => d.padding);
    expect(padding.length).toBeGreaterThan(0);
    expect(padding.every((d) => d.weekday < 1 + padding.length)).toBe(true);

    const withPadding = activityGrid(padding.map((d) => ({ date: d.date, seconds: 300, cells: 12 })), 91, NOW);
    for (const d of withPadding.days.filter((v) => v.padding)) {
      expect(d.cells).toBe(12);
      expect(d.seconds).toBe(300);
      expect(d.level).toBe(4);
    }
    expect(withPadding.activeDays).toBe(padding.length);
  });

  it("numérote les jours de la semaine du lundi au dimanche", () => {
    const grid = activityGrid([], 28, NOW);
    const column = grid.days.slice(0, 7).map((d) => d.weekday);
    expect(column).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("une fenêtre plus courte reste alignée", () => {
    const grid = activityGrid([], 7, NOW);
    expect(grid.days.filter((d) => !d.padding)).toHaveLength(7);
    expect(grid.days.at(-1)!.today).toBe(true);
    expect(grid.days[0].weekday).toBe(0);
  });

  it("meilleure journée enregistrée", () => {
    expect(bestDay([])).toBeNull();
    const sessions = [session(-5, 600, 30), session(-2, 3600, 250), session(0, 900, 80)];
    expect(bestDay(sessions)!.cells).toBe(250);
    expect(bestDay(sessions)!.date).toBe(day(-2));
  });

  it("la clé de date suit le calendrier local, pas UTC", () => {
    // 23 h 30 locales : en UTC ce serait déjà le lendemain en Europe.
    const late = new Date(2026, 9, 13, 23, 30);
    expect(dateKey(late)).toBe("2026-10-13");
    const early = new Date(2026, 0, 5, 0, 15);
    expect(dateKey(early)).toBe("2026-01-05");
  });
});

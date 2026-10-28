import { describe,expect,it } from "vitest";
import { ARTISTS, GAME_SIZE, bestMove, clearGroup, finalScore, matchingGroup, newGame, portraitCells, revealPercent, usePower } from "../lib/confettiGame";
describe("CONFETTI 30 — moteur de jeu natif",()=>{
 it("construit cinq portraits fictifs déterministes",()=>{
  expect(ARTISTS).toHaveLength(5);
  const a=portraitCells(0),b=portraitCells(1);
  expect(a.length).toBe(GAME_SIZE*GAME_SIZE);
  expect(a).not.toEqual(b);
  expect(portraitCells(0)).toEqual(a);
 });
 it("recrée la même grille de confettis à partir de la même graine",()=>{
  expect(newGame(2,12345)).toEqual(newGame(2,12345));
  expect(newGame(2,12345).confetti).not.toEqual(newGame(2,12346).confetti);
 });
 it("efface uniquement le groupe connecté sans écraser les pixels du portrait",()=>{
  const start=newGame(0,90),best=bestMove(start),group=matchingGroup(start,best);
  expect(group.length).toBeGreaterThan(1);
  const done=clearGroup(start,best);
  expect(done.score).toBeGreaterThan(start.score);
  expect(done.cleared).toBe(start.cleared+group.length);
  expect(done.portrait).toEqual(start.portrait);
  expect(start.confetti[best]).toBeGreaterThanOrEqual(0);
  expect(done.confetti[best]).toBe(-1);
  expect(revealPercent(done)).toBeGreaterThanOrEqual(revealPercent(start));
 });
 it("ignore les zones vides et plafonne le score à un résultat calculé",()=>{
  const start=newGame(0,11);
  const missing=start.confetti.findIndex(x=>x===-1);
  expect(clearGroup(start,missing)).toBe(start);
  const score=finalScore(start,10);
  expect(score).toBe(start.score+120);
 });
 it("rend les pouvoirs vérifiables par un gain effectif",()=>{
  const start=newGame(1,26),where=bestMove(start);
  const after=usePower(start,"wave",where);
  expect(after.cleared).toBeGreaterThan(start.cleared);
  expect(after.powerUses).toBe(1);
  expect(usePower(start,"focus",where)).toBe(start);
 });
});

import {describe,expect,it} from "vitest";
import {createPattern,ensurePalette} from "../lib/pattern";
import {playableFromPattern} from "../lib/gameFromPattern";
import {GAME_SIZE,newGame,clearGroup,bestMove} from "../lib/confettiGame";

describe("POINTZERO · pont broderie vers Studio Game",()=>{
 it("convertit un motif existant en niveau jouable sans modifier son original",()=>{
  const pattern=createPattern("Rose",24,24,14,2);
  pattern.cross.fill(-1);
  for(let y=5;y<20;y++)for(let x=7;x<17;x++)pattern.cross[y*24+x]=12;
  ensurePalette(pattern,12);
  const snapshot=pattern.cross.slice();
  const playable=playableFromPattern(pattern);
  expect(playable?.name).toBe("Rose");
  expect(playable?.portrait.length).toBe(GAME_SIZE*GAME_SIZE);
  expect(playable?.colors.length).toBe(6);
  expect(pattern.cross).toEqual(snapshot);
  const board={...newGame(0,5),portrait:playable!.portrait};
  const after=clearGroup(board,bestMove(board));
  expect(after.portrait).toEqual(board.portrait);
  expect(pattern.cross).toEqual(snapshot);
 });
 it("refuse un patron vide",()=>{
  const pattern=createPattern("Vide",16,16);
  expect(playableFromPattern(pattern)).toBeNull();
 });
});
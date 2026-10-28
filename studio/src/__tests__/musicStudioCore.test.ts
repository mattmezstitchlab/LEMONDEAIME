import { describe,expect,it } from "vitest";
import {
 MUSIC_SECONDS, EMOTIONS, GESTURES, emptyMusicScore, makeMusicNote, makeMusicScore, formatMusicTime,
 intentionGesture, musicEvents, musicToMidi, safeMusicScore, snapMusicTime
} from "../lib/musicStudioCore";
describe("POINTZERO Studio Musique inclusive",()=>{
 it("associe un DMC au timbre d'une note et à son export, en conservant les anciennes partitions",()=>{
   const score=emptyMusicScore(),note=makeMusicNote("point",2,1,"Sérénité");
   const uncolored=musicEvents({...score,notes:[note]})[0];
   const withDMC={...note,dmcCode:"820"};
   expect(safeMusicScore({...score,notes:[withDMC]})).not.toBeNull();
   expect(safeMusicScore({...score,notes:[{...note,dmcCode:"javascript:evil"}]})).toBeNull();
   expect(safeMusicScore({...score,notes:[note]})).not.toBeNull();
   const colorful=musicEvents({...score,notes:[withDMC]})[0];
   expect(colorful.midi).not.toBe(uncolored.midi);
   expect(musicToMidi({...score,notes:[withDMC]})).not.toEqual(musicToMidi({...score,notes:[note]}));
 });
 it("garde des gestes universels et une palette sémantique lisible",()=>{
  expect(GESTURES.map(g=>g.id)).toEqual(["point","circle","square","line","wave","group","star","text"]);
  expect(new Set(EMOTIONS.map(e=>e.hex)).size).toBe(9);
  expect(formatMusicTime(225)).toBe("3:45");
  expect(snapMusicTime(225)).toBeLessThan(MUSIC_SECONDS);
 });
 it("produit une partition de démonstration indépendante d'une prétendue session en direct",()=>{
  const s=makeMusicScore();
  expect(s.notes.length).toBeGreaterThan(12);
  expect(safeMusicScore(JSON.parse(JSON.stringify(s)))).not.toBeNull();
  expect(emptyMusicScore().notes).toHaveLength(0);
  expect(s.notes.every(n=>n.time>=0&&n.time<MUSIC_SECONDS)).toBe(true);
 });
 it("convertit les gestes en événements pentatoniques et conserve les textes silencieux",()=>{
  const score=emptyMusicScore();
  score.notes=[
   makeMusicNote("point",8,0,"Joie"),
   makeMusicNote("circle",23,1,"Sérénité"),
   makeMusicNote("square",40,2,"Énergie"),
   makeMusicNote("line",60,1,"Nature"),
   makeMusicNote("wave",80,1,"Amour"),
   makeMusicNote("group",100,2,"Courage"),
   makeMusicNote("star",110,0,"Mystère"),
   makeMusicNote("text",120,1,"Tristesse","","Souvenir")
  ];
  const events=musicEvents(score);
  expect(events.length).toBeGreaterThan(score.notes.length);
  expect(events.some(e=>e.noteId===score.notes[7].id)).toBe(false);
  expect(events.every(e=>e.time>=0&&e.time<MUSIC_SECONDS&&e.duration>0)).toBe(true);
  expect(events.some(e=>e.voice==="drum")).toBe(true);
 });
 it("transforme une intention en geste local, non en réponse IA prétendue",()=>{
  expect(intentionGesture("Le souvenir de ma grand-mère","Amour",20).gesture).toBe("wave");
  expect(intentionGesture("Nous sommes ensemble en chorale","Joie",50).gesture).toBe("group");
  expect(intentionGesture("Danse et énergie","Énergie",70).gesture).toBe("square");
 });
 it("rejette les importations invalides et les volumes excessifs",()=>{
  const s=makeMusicScore();
  expect(safeMusicScore({...s,tempo:600})).toBeNull();
  expect(safeMusicScore({...s,notes:[{...s.notes[0],time:-1}]})).toBeNull();
  expect(safeMusicScore({...s,notes:[s.notes[0],s.notes[0]]})).toBeNull();
  expect(safeMusicScore({...s,notes:Array.from({length:151},(_,i)=>({...s.notes[0],id:String(i)}))})).toBeNull();
 });
 it("exporte un vrai fichier MIDI avec en-tête 6 octets et événements musicaux",()=>{
  const score=emptyMusicScore();
  score.notes=[makeMusicNote("circle",2,1,"Sérénité")];
  const midi=musicToMidi(score);
  expect(String.fromCharCode(...midi.slice(0,4))).toBe("MThd");
  expect([...midi.slice(4,8)]).toEqual([0,0,0,6]);
  expect([...midi.slice(8,14)]).toEqual([0,0,0,1,1,224]);
  expect(String.fromCharCode(...midi.slice(14,18))).toBe("MTrk");
  expect(midi.includes(0x90)).toBe(true);
  expect(midi.includes(0x80)).toBe(true);
 });
});
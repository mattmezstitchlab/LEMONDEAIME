import { describe,expect,it } from "vitest";
import {
 addRequest,eventPlaylist,guestEnvelope,guestToRequest,labelCSV,makeMusicLabel,matchTrack,
 musicCSV,newArtist,newMusicEvent,newMusicRequest,newTrack,safeGuestEnvelope,safeMusicLabel
} from "../lib/musicLabelCore";
import { presetEQ,writeWav } from "../lib/musicMastering";
describe("POINTZERO Music — canonical repertoire and event playlist",()=>{
 it("reuses artists and titles by normalised names",()=>{
  const s=makeMusicLabel(),artist=newArtist("Matt Mez"),track=newTrack("Imagine","Matt Mez");
  track.artistId=artist.id;
  s.artists=[artist];s.tracks=[track];
  expect(matchTrack(s,"  IMAGINE ","matt mez")?.id).toBe(track.id);
  expect(safeMusicLabel(s)).not.toBeNull();
  expect(safeMusicLabel({...s,tracks:[track,track]})).toBeNull();
  expect(safeMusicLabel({...s,tracks:[{...track,artistId:"missing"}]})).toBeNull();
 });
 it("accepts a guest title once per moment/event and preserves the source event",()=>{
  const s=makeMusicLabel(),event=newMusicEvent("Mariage de Camille et Gabriel","2027-05-22");
  s.events=[event];
  const req=newMusicRequest(event.id,"Imagine","John Lennon","Sophie","cocktail");
  const a=addRequest(s,req);expect(a.added).toBe(true);
  expect(addRequest(a.store,newMusicRequest(event.id," imagine ","JOHN LENNON","Marc","cocktail")).added).toBe(false);
  const other=addRequest(a.store,newMusicRequest(event.id,"Imagine","John Lennon","Marc","soirée"));
  expect(other.added).toBe(true);
  expect(eventPlaylist(a.store,event.id)).toHaveLength(0);
  const approved={...a.store,requests:a.store.requests.map(r=>r.id===req.id?{...r,status:"approved" as const}:r)};
  expect(eventPlaylist(approved,event.id)).toHaveLength(1);
  expect(musicCSV(approved,event.id)).toContain("Imagine");
  expect(musicCSV(approved,event.id)).toContain("À vérifier");
 });
 it("encodes a portable guest request with event validation",()=>{
  const e=newMusicEvent("Mariage","2027-05-22"),r=newMusicRequest(e.id,"Time","Hans Zimmer","Lucie","cérémonie");
  const envelope=guestEnvelope(e,r);
  expect(safeGuestEnvelope(JSON.parse(JSON.stringify(envelope)))).not.toBeNull();
  expect(guestToRequest(envelope,e)).toMatchObject({eventId:e.id,title:"Time"});
  expect(safeGuestEnvelope({...envelope,kind:"injection"})).toBeNull();
  expect(safeGuestEnvelope({...envelope,title:""})).toBeNull();
  expect(safeGuestEnvelope({...envelope,moment:"administration"})).toBeNull();
 });
 it("generates quote-safe label CSV and strictly validates IDs, dates and rights",()=>{
  const s=makeMusicLabel(),t=newTrack('Mon "premier" titre',"Un groupe");
  s.tracks.push(t);
  expect(labelCSV(s)).toContain('""premier""');
  expect(safeMusicLabel({...s,tracks:[{...t,rights:"stolen"}]})).toBeNull();
  expect(safeMusicLabel({...s,events:[newMusicEvent("Événement","2026-88-99")]})).toBeNull();
 });
 it("returns controlled EQ settings for pre-master presets",()=>{
  expect(presetEQ({preset:"transparent",intensity:0}).low).toBe(0);
  expect(presetEQ({preset:"warm",intensity:1}).low).toBeGreaterThan(0);
  expect(presetEQ({preset:"bright",intensity:1}).high).toBeGreaterThan(0);
 });
 it("writes an actual RIFF PCM wave with a valid sample count",()=>{
  const buffer={numberOfChannels:1,length:4,sampleRate:44100,getChannelData:()=>new Float32Array([0,.25,-.5,0])} as unknown as AudioBuffer;
  const wav=writeWav(buffer);expect(wav.type).toBe("audio/wav");
  expect(wav.size).toBe(52);
 });
});

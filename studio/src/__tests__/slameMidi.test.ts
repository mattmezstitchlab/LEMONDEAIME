import { describe, expect, it } from "vitest";
import { slameToMidi } from "../lib/slameMidi";
import type { MusicStep } from "../lib/slame";

const note: MusicStep = { x: 0, y: 0, code: "321", hex: "#d34f52", kind: "cross", midi: 60, velocity: .7, duration: 1 };
const silence: MusicStep = { x: 1, y: 0, code: null, hex: "#222731", kind: "silence", midi: null, velocity: 0, duration: 1 };
const signature = (bytes: Uint8Array, from = 0, until = from + 4) => String.fromCharCode(...bytes.slice(from, until));
describe("SLÂME export MIDI", () => {
  it("produit un Standard MIDI File format 0 avec piste et tempo", () => {
    const data = slameToMidi([note, silence, { ...note, midi: 67 }], 120);
    expect(signature(data)).toBe("MThd");
    expect([...data.slice(4, 14)]).toEqual([0,0,0,6,0,0,0,1,1,224]);
    expect(signature(data, 14, 18)).toBe("MTrk");
    const trackLength = (((data[18] << 24) >>> 0) + (data[19] << 16) + (data[20] << 8) + data[21]) >>> 0;
    expect(data.length).toBe(22 + trackLength);
    expect([...data].filter(b => b === 0x90)).toHaveLength(2);
    expect([...data.slice(-3)]).toEqual([0xff,0x2f,0]);
  });
  it("exporte le silence sans inventer de note", () => {
    const data = slameToMidi([silence], 96);
    expect([...data]).not.toContain(0x90);
  });
  it("refuse un tempo invalide", () => {
    expect(() => slameToMidi([note], 0)).toThrow(RangeError);
  });
});

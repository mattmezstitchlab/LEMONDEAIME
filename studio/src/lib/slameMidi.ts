import type { MusicStep } from "./slame";

/**
 * Minimal Standard MIDI File (format 0, single track).
 * SLÂME musical gestures are exported as notes; speech stays in the JSON project.
 * No external MIDI library required. PPQ = 480 ticks / quarter note.
 */
const PPQ = 480;
const ascii = (str: string) => [...str].map(c => c.charCodeAt(0));
const uint32 = (v: number) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
const uint16 = (v: number) => [(v >>> 8) & 255, v & 255];
function variableLength(value: number): number[] {
  let n = Math.max(0, Math.min(0x0fffffff, Math.round(value)));
  const out = [n & 0x7f];
  while ((n >>>= 7) > 0) out.unshift((n & 0x7f) | 0x80);
  return out;
}

/** Renders note/rest gestures at an explicit tempo, without altering their meaning. */
export function slameToMidi(steps: MusicStep[], bpm = 96): Uint8Array {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new RangeError("Invalid BPM");
  const microsecondsPerQuarter = Math.max(1, Math.min(0xffffff, Math.round(60000000 / bpm)));
  const track: number[] = [
    ...variableLength(0), 0xff, 0x51, 0x03,
    (microsecondsPerQuarter >>> 16) & 255, (microsecondsPerQuarter >>> 8) & 255, microsecondsPerQuarter & 255,
    ...variableLength(0), 0xc0, 0x00, // Acoustic Grand Piano (program 0), channel 1
  ];
  let pending = 0;
  for (const step of steps.slice(0, 16384)) {
    const ticks = Math.max(1, Math.round(Math.max(.05, step.duration) * PPQ));
    if (step.midi === null || !Number.isFinite(step.midi)) { pending += ticks; continue; }
    const midi = Math.max(0, Math.min(127, Math.round(step.midi)));
    const velocity = Math.max(1, Math.min(127, Math.round(step.velocity * 127)));
    const held = Math.max(1, Math.round(ticks * .86));
    track.push(...variableLength(pending), 0x90, midi, velocity);
    track.push(...variableLength(held), 0x80, midi, 0);
    pending = ticks - held;
  }
  track.push(...variableLength(pending), 0xff, 0x2f, 0x00);
  return new Uint8Array([
    ...ascii("MThd"), ...uint32(6), ...uint16(0), ...uint16(1), ...uint16(PPQ),
    ...ascii("MTrk"), ...uint32(track.length), ...track,
  ]);
}

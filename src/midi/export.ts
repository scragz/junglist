import type { Pattern, SliceCell, SliceCellObject } from "../engine/types";
import { createRng } from "../gen/rng";
import { encodeSmf, type MidiNote } from "./smf";

export interface PatternMidiOptions {
  rootNote?: number;
  ppq?: number;
  seed?: number;
}

function normalizeSlice(raw: SliceCell): SliceCellObject | null {
  if (raw == null || raw === 0) return null;
  return typeof raw === "number" ? { slice: raw } : raw;
}

export function patternToMidi(pattern: Pattern, options: PatternMidiOptions = {}): Uint8Array {
  const root = options.rootNote ?? 36;
  const ppq = options.ppq ?? 480;
  const rng = createRng(options.seed ?? `${pattern.id}:midi`);
  const stepTicks = (ppq * 4) / pattern.stepsPerBar;
  const ticksPerSecond = (pattern.bpm / 60) * ppq;
  const notes: MidiNote[] = [];

  for (const lane of pattern.lanes) {
    if (lane.type !== "slice") continue;
    for (let step = 0; step < lane.steps.length; step++) {
      const cell = normalizeSlice(lane.steps[step]);
      if (!cell) continue;
      if ((cell.prob ?? 1) < 1 && rng.next() >= (cell.prob ?? 1)) continue;
      const ratchet = Math.max(1, Math.round(cell.ratchet ?? 1));
      const ratchetTicks = stepTicks / ratchet;
      const gateTicks =
        cell.gate == null ? ratchetTicks * 0.82 : Math.max(1, cell.gate * ticksPerSecond);
      const timingTicks = (cell.timing ?? 0) * ticksPerSecond;
      for (let r = 0; r < ratchet; r++) {
        notes.push({
          tick: step * stepTicks + timingTicks + r * ratchetTicks,
          duration: Math.min(ratchetTicks, gateTicks),
          note: root + Math.max(1, Math.min(44, Math.round(cell.slice))) - 1,
          velocity: Math.max(1, Math.min(127, Math.round((cell.gain ?? 1) * 127))),
        });
      }
    }
  }

  return encodeSmf(notes, { bpm: pattern.bpm, ppq, trackName: pattern.name });
}

export function downloadPatternMidi(pattern: Pattern, seed: number): void {
  const bytes = patternToMidi(pattern, { seed });
  const data = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(data).set(bytes);
  const blob = new Blob([data], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${pattern.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.mid`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

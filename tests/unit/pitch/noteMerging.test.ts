import { describe, expect, it } from "vitest";
import { mergePitchFramesToNotes } from "@/lib/analysis/pitch/noteMerging";
import type { PitchFrame } from "@/lib/analysis/pitch/pitchTrack";

const FRAME_DURATION = 1024 / 44100;

function frame(timeSeconds: number, frequencyHz: number | null, confidence = 0.9, rms = 0.1): PitchFrame {
  return { timeSeconds, frequencyHz, confidence, rms };
}

describe("mergePitchFramesToNotes", () => {
  it("merges a steady run of compatible frames into a single note", () => {
    const frames: PitchFrame[] = Array.from({ length: 10 }, (_, i) => frame(i * FRAME_DURATION, 110));
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION);
    expect(notes).toHaveLength(1);
    expect(notes[0].noteName).toBe("A");
    expect(notes[0].octave).toBe(2);
  });

  it("splits into separate notes when the pitch changes materially", () => {
    const frames: PitchFrame[] = [
      ...Array.from({ length: 6 }, (_, i) => frame(i * FRAME_DURATION, 110)),
      ...Array.from({ length: 6 }, (_, i) => frame((i + 6) * FRAME_DURATION, 146.83)),
    ];
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION);
    expect(notes).toHaveLength(2);
    expect(notes[0].noteName).toBe("A");
    expect(notes[1].noteName).toBe("D");
  });

  it("ends a note on silence and does not bridge across a gap", () => {
    const frames: PitchFrame[] = [
      ...Array.from({ length: 5 }, (_, i) => frame(i * FRAME_DURATION, 220)),
      frame(5 * FRAME_DURATION, null, 0),
      frame(6 * FRAME_DURATION, null, 0),
      ...Array.from({ length: 5 }, (_, i) => frame((i + 7) * FRAME_DURATION, 220)),
    ];
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION);
    expect(notes).toHaveLength(2);
  });

  it("corrects an isolated octave jump instead of splitting the note", () => {
    const frames: PitchFrame[] = [
      frame(0, 220),
      frame(1 * FRAME_DURATION, 220),
      frame(2 * FRAME_DURATION, 440), // octave jump for one frame
      frame(3 * FRAME_DURATION, 220),
      frame(4 * FRAME_DURATION, 220),
    ];
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION);
    expect(notes).toHaveLength(1);
    expect(notes[0].noteName).toBe("A");
    expect(notes[0].octave).toBe(3);
  });

  it("discards notes shorter than the minimum duration", () => {
    const frames: PitchFrame[] = [frame(0, 110)];
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION, { minNoteDurationSeconds: 0.5 });
    expect(notes).toHaveLength(0);
  });

  it("discards low-confidence frames as unvoiced", () => {
    const frames: PitchFrame[] = Array.from({ length: 10 }, (_, i) => frame(i * FRAME_DURATION, 110, 0.1));
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION);
    expect(notes).toHaveLength(0);
  });

  it("rejects frequencies outside the configured guitar range", () => {
    const frames: PitchFrame[] = Array.from({ length: 10 }, (_, i) => frame(i * FRAME_DURATION, 3000));
    const notes = mergePitchFramesToNotes(frames, FRAME_DURATION);
    expect(notes).toHaveLength(0);
  });
});

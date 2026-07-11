import { describe, expect, it } from "vitest";
import { detectNoteClarityIssues } from "@/lib/analysis/noteClarity/noteClarityHeuristic";
import type { NoteDetection } from "@/lib/types";

const SAMPLE_RATE = 44100;

function makeNote(overrides: Partial<NoteDetection> = {}): NoteDetection {
  return {
    id: "note-1",
    startTime: 0,
    endTime: 0.4,
    frequencyHz: 220,
    midiNote: 57,
    noteName: "A",
    octave: 3,
    centsOffset: 0,
    confidence: 0.9,
    rms: 0.3,
    pitchStability: 0.9,
    ...overrides,
  };
}

function cleanDecaySamples(frequencyHz: number, durationSeconds: number): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    samples[i] = Math.sin(2 * Math.PI * frequencyHz * t) * Math.exp(-t * 8) * 0.8;
  }
  return samples;
}

describe("detectNoteClarityIssues", () => {
  it("does not flag a clean, stable, sustained note", () => {
    const note = makeNote();
    const events = detectNoteClarityIssues([note], cleanDecaySamples(220, 0.4), SAMPLE_RATE);
    expect(events).toHaveLength(0);
  });

  it("flags a very short note as an unclear attack", () => {
    const note = makeNote({ endTime: 0.05 });
    const events = detectNoteClarityIssues([note], cleanDecaySamples(220, 0.4), SAMPLE_RATE);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("unclear_attack");
  });

  it("flags a note with unstable pitch confidence", () => {
    const note = makeNote({ confidence: 0.2 });
    const events = detectNoteClarityIssues([note], cleanDecaySamples(220, 0.4), SAMPLE_RATE);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("unclear_attack");
  });

  it("flags a note with weak harmonic structure as possibly muted", () => {
    const noise = new Float32Array(Math.floor(0.4 * SAMPLE_RATE)).map(() => (Math.random() * 2 - 1) * 0.6);
    const note = makeNote();
    const events = detectNoteClarityIssues([note], noise, SAMPLE_RATE);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("muted_note");
  });

  it("always includes at least one plain-language reason", () => {
    const note = makeNote({ endTime: 0.05 });
    const events = detectNoteClarityIssues([note], cleanDecaySamples(220, 0.4), SAMPLE_RATE);
    expect((events[0].metadata.reasons as string[]).length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { detectPossibleFretBuzz } from "@/lib/analysis/fretBuzz/fretBuzzHeuristic";
import type { NoteDetection } from "@/lib/types";

const SAMPLE_RATE = 44100;

function makeNote(startTime: number, endTime: number, frequencyHz: number): NoteDetection {
  return {
    id: `note-${startTime}`,
    startTime,
    endTime,
    frequencyHz,
    midiNote: 57,
    noteName: "A",
    octave: 3,
    centsOffset: 0,
    confidence: 0.9,
    rms: 0.3,
    pitchStability: 0.9,
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

function buzzySamples(frequencyHz: number, durationSeconds: number): Float32Array {
  // A quiet, quickly-decaying fundamental with substantial broadband noise
  // dominating the post-attack window — a stand-in for the "elevated
  // high-frequency, inharmonic energy after the attack" signature the
  // heuristic looks for, not a claim this proves real-world buzz accuracy.
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const tone = Math.sin(2 * Math.PI * frequencyHz * t) * Math.exp(-t * 4) * 0.15;
    samples[i] = tone + (Math.random() * 2 - 1) * 0.9;
  }
  return samples;
}

describe("detectPossibleFretBuzz", () => {
  it("does not flag a clean decaying note", () => {
    const note = makeNote(0, 0.4, 220);
    const { detections } = detectPossibleFretBuzz([note], cleanDecaySamples(220, 0.4), SAMPLE_RATE);
    expect(detections).toHaveLength(0);
  });

  it("flags a note with noisy, bursty post-attack content as possible fret buzz", () => {
    const note = makeNote(0, 0.4, 220);
    const { detections, events } = detectPossibleFretBuzz([note], buzzySamples(220, 0.4), SAMPLE_RATE);
    expect(detections.length).toBeGreaterThan(0);
    expect(detections[0].confidence).toBeGreaterThan(0.5);
    expect(detections[0].reasons.length).toBeGreaterThan(0);
    expect(events[0].category).toBe("possible_fret_buzz");
  });

  it("respects a stricter minConfidenceToReport threshold", () => {
    const note = makeNote(0, 0.4, 220);
    const { detections } = detectPossibleFretBuzz([note], buzzySamples(220, 0.4), SAMPLE_RATE, {
      minConfidenceToReport: 0.99,
    });
    expect(detections).toHaveLength(0);
  });
});

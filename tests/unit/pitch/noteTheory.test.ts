import { describe, expect, it } from "vitest";
import {
  centsOffsetFromNearestSemitone,
  describeFrequency,
  frequencyToMidi,
  midiToFrequency,
  midiToNoteName,
} from "@/lib/analysis/pitch/noteTheory";

describe("frequencyToMidi / midiToFrequency", () => {
  it("maps A4 (440Hz) to MIDI 69", () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 5);
  });

  it("round-trips MIDI -> frequency -> MIDI", () => {
    for (const midi of [40, 52, 57, 62, 67, 71, 76]) {
      expect(frequencyToMidi(midiToFrequency(midi))).toBeCloseTo(midi, 5);
    }
  });
});

describe("midiToNoteName", () => {
  it("names MIDI 69 as A4", () => {
    expect(midiToNoteName(69)).toEqual({ name: "A", octave: 4 });
  });

  it("names MIDI 60 as C4 (middle C)", () => {
    expect(midiToNoteName(60)).toEqual({ name: "C", octave: 4 });
  });

  it("names MIDI 40 as E2 (guitar low E)", () => {
    expect(midiToNoteName(40)).toEqual({ name: "E", octave: 2 });
  });
});

describe("centsOffsetFromNearestSemitone", () => {
  it("is 0 for an exact semitone", () => {
    expect(centsOffsetFromNearestSemitone(69)).toBe(0);
  });

  it("is positive when sharp of the nearest semitone", () => {
    expect(centsOffsetFromNearestSemitone(69.2)).toBeGreaterThan(0);
  });

  it("is negative when flat of the nearest semitone", () => {
    expect(centsOffsetFromNearestSemitone(68.8)).toBeLessThan(0);
  });
});

describe("describeFrequency", () => {
  it("describes 440Hz as A4 with 0 cents offset", () => {
    const described = describeFrequency(440);
    expect(described.noteName).toBe("A");
    expect(described.octave).toBe(4);
    expect(described.centsOffset).toBe(0);
  });

  it("describes a slightly sharp E2 (guitar low E) correctly", () => {
    const described = describeFrequency(82.41 * Math.pow(2, 10 / 1200));
    expect(described.noteName).toBe("E");
    expect(described.octave).toBe(2);
    expect(described.centsOffset).toBeGreaterThan(5);
    expect(described.centsOffset).toBeLessThan(15);
  });
});

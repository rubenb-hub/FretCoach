import { describe, expect, it } from "vitest";
import { computeChromaVector } from "@/lib/analysis/chords/chroma";

const SAMPLE_RATE = 44100;
const FFT_SIZE = 8192;

function binForFrequency(hz: number): number {
  return Math.round((hz * FFT_SIZE) / SAMPLE_RATE);
}

function magnitudesWithPeaksAt(frequencies: number[], amplitude = 1): Float32Array {
  const magnitudes = new Float32Array(FFT_SIZE / 2);
  for (const hz of frequencies) {
    magnitudes[binForFrequency(hz)] = amplitude;
  }
  return magnitudes;
}

describe("computeChromaVector", () => {
  it("concentrates energy at the pitch classes of a C major triad (C4, E4, G4)", () => {
    const magnitudes = magnitudesWithPeaksAt([261.63, 329.63, 392.0]);
    const chroma = computeChromaVector(magnitudes, SAMPLE_RATE, FFT_SIZE);

    const cIndex = 0;
    const eIndex = 4;
    const gIndex = 7;
    const otherIndices = [1, 2, 3, 5, 6, 8, 9, 10, 11];

    expect(chroma[cIndex]).toBeGreaterThan(0.2);
    expect(chroma[eIndex]).toBeGreaterThan(0.2);
    expect(chroma[gIndex]).toBeGreaterThan(0.2);
    for (const i of otherIndices) {
      expect(chroma[i]).toBeLessThan(0.05);
    }
  });

  it("sums to 1 (normalised) when there is any energy", () => {
    const magnitudes = magnitudesWithPeaksAt([220]);
    const chroma = computeChromaVector(magnitudes, SAMPLE_RATE, FFT_SIZE);
    const total = chroma.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("returns an all-zero vector for a silent spectrum", () => {
    const magnitudes = new Float32Array(FFT_SIZE / 2);
    const chroma = computeChromaVector(magnitudes, SAMPLE_RATE, FFT_SIZE);
    expect(chroma.every((v) => v === 0)).toBe(true);
  });

  it("ignores energy far outside the guitar-relevant frequency range", () => {
    const magnitudes = magnitudesWithPeaksAt([20, 261.63, 15000]);
    const chroma = computeChromaVector(magnitudes, SAMPLE_RATE, FFT_SIZE);
    // Only the in-range C4 peak should contribute.
    expect(chroma[0]).toBeCloseTo(1, 5);
  });
});

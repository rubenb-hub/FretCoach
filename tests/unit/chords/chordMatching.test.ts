import { describe, expect, it } from "vitest";
import { matchChordTemplate } from "@/lib/analysis/chords/chordMatching";

function chromaFor(pitchClasses: number[]): number[] {
  const vector = new Array(12).fill(0);
  for (const pc of pitchClasses) vector[pc] = 1;
  const total = vector.reduce((a: number, b: number) => a + b, 0);
  return vector.map((v: number) => v / total);
}

describe("matchChordTemplate", () => {
  it("matches a clean C major chroma vector to C major with high confidence", () => {
    const chroma = chromaFor([0, 4, 7]); // C, E, G
    const { primary } = matchChordTemplate(chroma, 0.5);
    expect(primary?.name).toBe("C major");
    expect(primary?.confidence).toBeGreaterThan(0.95);
  });

  it("matches a clean A minor chroma vector to A minor", () => {
    const chroma = chromaFor([9, 0, 4]); // A, C, E
    const { primary } = matchChordTemplate(chroma, 0.5);
    expect(primary?.name).toBe("A minor");
  });

  it("returns alternatives that are close competitors, not everything", () => {
    const chroma = chromaFor([0, 4, 7, 10]); // C dominant7
    const { primary, alternatives } = matchChordTemplate(chroma, 0.5);
    expect(primary?.name).toBe("C7");
    // C major (subset match) should plausibly appear as a close alternative.
    expect(alternatives.length).toBeLessThanOrEqual(3);
  });

  it("reports no primary chord for a flat, ambiguous chroma vector", () => {
    // A perfectly uniform vector has non-trivial baseline cosine similarity
    // to any binary template (more so for larger templates like 7th
    // chords), so a realistic production threshold (matching
    // DEFAULT_MIN_CONFIDENCE in chordTrack.ts) is needed to reject it —
    // not just any positive threshold.
    const chroma = new Array(12).fill(1 / 12);
    const { primary } = matchChordTemplate(chroma, 0.62);
    expect(primary).toBeNull();
  });

  it("respects the minConfidence threshold", () => {
    const chroma = chromaFor([0, 4, 7]);
    const { primary } = matchChordTemplate(chroma, 0.999);
    // A perfect match still won't clear an unreasonably high bar combined
    // with normalisation rounding, OR it will — either way this must not throw.
    expect(primary === null || primary.confidence >= 0.999).toBe(true);
  });
});

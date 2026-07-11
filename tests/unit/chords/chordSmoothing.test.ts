import { describe, expect, it } from "vitest";
import { smoothAndMergeChords } from "@/lib/analysis/chords/chordSmoothing";
import type { ChordWindow } from "@/lib/analysis/chords/chordTrack";

const DURATION = 0.2;

function windowWith(timeSeconds: number, name: string | null, confidence = 0.8): ChordWindow {
  return {
    timeSeconds,
    durationSeconds: DURATION,
    primary: name ? { name, confidence, pitchClasses: new Array(12).fill(0) } : null,
    alternatives: [],
    rms: 0.1,
  };
}

describe("smoothAndMergeChords", () => {
  it("merges a steady run of the same chord into one ChordDetection", () => {
    const windows = Array.from({ length: 10 }, (_, i) => windowWith(i * DURATION, "G major"));
    const detections = smoothAndMergeChords(windows);
    expect(detections).toHaveLength(1);
    expect(detections[0].primary.name).toBe("G major");
    expect(detections[0].startTime).toBeCloseTo(0, 5);
    expect(detections[0].endTime).toBeCloseTo(10 * DURATION, 5);
  });

  it("smooths a single noisy window rather than splitting the region", () => {
    const windows = [
      windowWith(0, "G major"),
      windowWith(DURATION, "G major"),
      windowWith(2 * DURATION, "D major"), // one noisy frame
      windowWith(3 * DURATION, "G major"),
      windowWith(4 * DURATION, "G major"),
      windowWith(5 * DURATION, "G major"),
    ];
    const detections = smoothAndMergeChords(windows, { smoothingRadius: 2 });
    expect(detections).toHaveLength(1);
    expect(detections[0].primary.name).toBe("G major");
  });

  it("produces separate regions for a real chord change", () => {
    const windows = [
      ...Array.from({ length: 6 }, (_, i) => windowWith(i * DURATION, "G major")),
      ...Array.from({ length: 6 }, (_, i) => windowWith((i + 6) * DURATION, "D major")),
    ];
    const detections = smoothAndMergeChords(windows, { smoothingRadius: 1 });
    expect(detections.map((d) => d.primary.name)).toEqual(["G major", "D major"]);
  });

  it("drops regions with no confident chord match", () => {
    const windows = Array.from({ length: 6 }, (_, i) => windowWith(i * DURATION, null));
    const detections = smoothAndMergeChords(windows);
    expect(detections).toHaveLength(0);
  });

  it("discards regions shorter than the minimum duration", () => {
    const windows = [windowWith(0, "C major")];
    const detections = smoothAndMergeChords(windows, { minRegionDurationSeconds: 5 });
    expect(detections).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { compareToReferenceMaterial } from "@/lib/analysis/reference/referenceComparisonProvider";
import type { ChordDetection, MusicAnalysisResult, ReferenceMaterial } from "@/lib/types";

function chord(name: string, startTime: number, endTime: number): ChordDetection {
  return { id: `${name}-${startTime}`, startTime, endTime, primary: { name, confidence: 0.8, pitchClasses: [] }, alternatives: [] };
}

function emptyAnalysis(overrides: Partial<MusicAnalysisResult> = {}): MusicAnalysisResult {
  return {
    notes: [],
    chords: [],
    events: [],
    issues: [],
    fretBuzz: [],
    truncated: false,
    analysedDurationSeconds: 10,
    processingTimeMs: 0,
    ...overrides,
  };
}

describe("compareToReferenceMaterial", () => {
  it("reports a full match for a chord progression detected in the right order", () => {
    const material: ReferenceMaterial = { title: "test", chordProgression: "G | D | Em | C" };
    const analysis = emptyAnalysis({
      chords: [chord("G major", 0, 2), chord("D major", 2, 4), chord("E minor", 4, 6), chord("C major", 6, 8)],
    });
    const result = compareToReferenceMaterial(material, analysis);
    expect(result.comparable).toBe(true);
    expect(result.chordMatches?.every((m) => m.matched)).toBe(true);
  });

  it("reports partial matches when some expected chords are missing", () => {
    const material: ReferenceMaterial = { title: "test", chordProgression: "G | D | Em | C" };
    const analysis = emptyAnalysis({
      chords: [chord("G major", 0, 2), chord("C major", 2, 4)], // D and Em missing
    });
    const result = compareToReferenceMaterial(material, analysis);
    expect(result.chordMatches?.filter((m) => m.matched)).toHaveLength(2);
    expect(result.chordMatches?.find((m) => m.expected === "D major")?.matched).toBe(false);
  });

  it("still credits an out-of-order match via longest-common-subsequence", () => {
    const material: ReferenceMaterial = { title: "test", chordProgression: "G | D" };
    const analysis = emptyAnalysis({
      chords: [chord("D major", 0, 2), chord("G major", 2, 4)], // reversed order
    });
    const result = compareToReferenceMaterial(material, analysis);
    // Only one of the two can be part of the longest common subsequence given the reversal.
    expect(result.chordMatches?.filter((m) => m.matched)).toHaveLength(1);
  });

  it("is not comparable when no reference material was entered", () => {
    const result = compareToReferenceMaterial({ title: "test" }, emptyAnalysis());
    expect(result.comparable).toBe(false);
  });

  it("is not comparable when reference material exists but nothing was detected", () => {
    const material: ReferenceMaterial = { title: "test", chordProgression: "G | D" };
    const result = compareToReferenceMaterial(material, emptyAnalysis());
    expect(result.comparable).toBe(false);
  });

  it("compares a note sequence the same way", () => {
    const material: ReferenceMaterial = { title: "test", noteSequence: "E3, G3, A3" };
    const analysis = emptyAnalysis({
      notes: [
        { id: "1", startTime: 0, endTime: 0.3, frequencyHz: 164.81, midiNote: 52, noteName: "E", octave: 3, centsOffset: 0, confidence: 0.9, rms: 0.3 },
        { id: "2", startTime: 0.5, endTime: 0.8, frequencyHz: 196, midiNote: 55, noteName: "G", octave: 3, centsOffset: 0, confidence: 0.9, rms: 0.3 },
        { id: "3", startTime: 1, endTime: 1.3, frequencyHz: 220, midiNote: 57, noteName: "A", octave: 3, confidence: 0.9, rms: 0.3, centsOffset: 0 },
      ],
    });
    const result = compareToReferenceMaterial(material, analysis);
    expect(result.noteMatches?.every((m) => m.matched)).toBe(true);
  });
});

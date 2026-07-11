import { describe, expect, it } from "vitest";
import { compareRetryToOriginal } from "@/lib/analysis/issues/retryComparisonService";
import type { MusicAnalysisResult, NoteDetection, PracticeIssue } from "@/lib/types";

function note(overrides: Partial<NoteDetection>): NoteDetection {
  return {
    id: `note-${Math.random()}`,
    startTime: 0,
    endTime: 0.3,
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

function emptyAnalysis(overrides: Partial<MusicAnalysisResult> = {}): MusicAnalysisResult {
  return {
    notes: [],
    chords: [],
    events: [],
    issues: [],
    fretBuzz: [],
    truncated: false,
    analysedDurationSeconds: 5,
    processingTimeMs: 0,
    ...overrides,
  };
}

function makeIssue(overrides: Partial<PracticeIssue> = {}): PracticeIssue {
  return {
    id: "issue-1",
    startTime: 0,
    endTime: 2,
    playbackStartTime: 0,
    playbackEndTime: 2,
    category: "fret_buzz",
    severity: "medium",
    confidence: 0.6,
    title: "Possible fret buzz",
    explanation: "test",
    tips: [],
    contributingEventIds: [],
    ...overrides,
  };
}

describe("compareRetryToOriginal", () => {
  it("reports an improvement when the retry's pitch stability is clearly better", () => {
    const original = emptyAnalysis({
      notes: [note({ startTime: 0.1, pitchStability: 0.3 }), note({ startTime: 0.4, pitchStability: 0.3 })],
    });
    const retry = emptyAnalysis({
      notes: [note({ startTime: 0.1, pitchStability: 0.95 }), note({ startTime: 0.4, pitchStability: 0.95 })],
    });
    const result = compareRetryToOriginal(original, makeIssue(), retry);
    const stability = result.metrics.find((m) => m.label === "Pitch stability")!;
    expect(stability.comparable).toBe(true);
    expect(stability.originalWording).toBe("inconsistent");
    expect(stability.retryWording).toBe("improved");
  });

  it("reports 'about the same' when pitch stability barely changes", () => {
    const original = emptyAnalysis({ notes: [note({ pitchStability: 0.7 })] });
    const retry = emptyAnalysis({ notes: [note({ pitchStability: 0.72 })] });
    const result = compareRetryToOriginal(original, makeIssue(), retry);
    const stability = result.metrics.find((m) => m.label === "Pitch stability")!;
    expect(stability.retryWording).toBe("about the same");
  });

  it("marks timing variation as not comparable with too few notes", () => {
    const original = emptyAnalysis({ notes: [note({ startTime: 0.1 })] });
    const retry = emptyAnalysis({ notes: [note({ startTime: 0.1 })] });
    const result = compareRetryToOriginal(original, makeIssue(), retry);
    const timing = result.metrics.find((m) => m.label === "Timing variation")!;
    expect(timing.comparable).toBe(false);
  });

  it("always reports note clarity, chord confidence, buzz confidence, and issue count even with no data", () => {
    const original = emptyAnalysis();
    const retry = emptyAnalysis();
    const result = compareRetryToOriginal(original, makeIssue(), retry);
    expect(result.metrics.find((m) => m.label === "Note clarity")?.comparable).toBe(true);
    expect(result.metrics.find((m) => m.label === "Likely chord confidence")?.originalWording).toBe("none detected");
    expect(result.metrics.find((m) => m.label === "Possible buzz confidence")?.originalWording).toBe("none detected");
    expect(result.metrics.find((m) => m.label === "Detected issue count")?.originalWording).toBe("0");
  });

  it("is overall comparable if at least one metric is comparable", () => {
    const original = emptyAnalysis({ notes: [note({ pitchStability: 0.5 })] });
    const retry = emptyAnalysis({ notes: [note({ pitchStability: 0.9 })] });
    const result = compareRetryToOriginal(original, makeIssue(), retry);
    expect(result.comparable).toBe(true);
  });

  it("only counts original-side notes/chords/buzz that overlap the issue's time range", () => {
    const original = emptyAnalysis({
      notes: [note({ startTime: 100, endTime: 100.3, pitchStability: 0.1 })], // far outside issue range
    });
    const retry = emptyAnalysis({ notes: [note({ pitchStability: 0.9 })] });
    const result = compareRetryToOriginal(original, makeIssue({ startTime: 0, endTime: 2 }), retry);
    const stability = result.metrics.find((m) => m.label === "Pitch stability")!;
    // Original has no notes *within range*, so this should not be comparable.
    expect(stability.comparable).toBe(false);
  });
});

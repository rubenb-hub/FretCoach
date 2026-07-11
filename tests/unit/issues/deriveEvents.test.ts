import { describe, expect, it } from "vitest";
import {
  derivePitchInstabilityEvents,
  deriveTimingInconsistencyEvents,
  deriveChordTransitionEvents,
} from "@/lib/analysis/issues/deriveEvents";
import type { ChordDetection, NoteDetection, PracticeAnalysis } from "@/lib/types";
import { makeAnalysis } from "../../fixtures/analysisFixtures";

function makeNote(overrides: Partial<NoteDetection>): NoteDetection {
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

describe("derivePitchInstabilityEvents", () => {
  it("flags notes below the pitch-stability threshold", () => {
    const events = derivePitchInstabilityEvents([makeNote({ pitchStability: 0.2 })]);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("pitch_instability");
  });

  it("does not flag stable notes", () => {
    const events = derivePitchInstabilityEvents([makeNote({ pitchStability: 0.9 })]);
    expect(events).toHaveLength(0);
  });
});

describe("deriveTimingInconsistencyEvents", () => {
  it("derives an event from the analysis's weakest segment when timing is not already consistent", () => {
    const analysis: PracticeAnalysis = makeAnalysis({
      timing: {
        score: 50,
        confidence: 0.8,
        weakestSegment: { startSeconds: 10, endSeconds: 14 },
        firstHalfScore: 60,
        secondHalfScore: 40,
      },
    });
    const events = deriveTimingInconsistencyEvents(analysis);
    expect(events).toHaveLength(1);
    expect(events[0].startTime).toBe(10);
  });

  it("returns nothing when timing is already consistent", () => {
    const analysis: PracticeAnalysis = makeAnalysis({
      timing: {
        score: 90,
        confidence: 0.8,
        weakestSegment: { startSeconds: 10, endSeconds: 14 },
        firstHalfScore: 90,
        secondHalfScore: 90,
      },
    });
    expect(deriveTimingInconsistencyEvents(analysis)).toHaveLength(0);
  });

  it("returns nothing when there is no reliable timing score", () => {
    expect(deriveTimingInconsistencyEvents(null)).toHaveLength(0);
  });
});

describe("deriveChordTransitionEvents", () => {
  function chord(id: string, startTime: number, endTime: number, name: string): ChordDetection {
    return { id, startTime, endTime, primary: { name, confidence: 0.8, pitchClasses: [] }, alternatives: [] };
  }

  it("flags a mid-length gap between two chords as a possible rough transition", () => {
    const chords = [chord("a", 0, 2, "G major"), chord("b", 2.4, 4, "D major")];
    const events = deriveChordTransitionEvents(chords);
    expect(events).toHaveLength(1);
    expect(events[0].category).toBe("chord_transition");
  });

  it("does not flag an immediate, clean transition", () => {
    const chords = [chord("a", 0, 2, "G major"), chord("b", 2.02, 4, "D major")];
    expect(deriveChordTransitionEvents(chords)).toHaveLength(0);
  });

  it("does not flag a long gap (likely an intentional pause, not a fumble)", () => {
    const chords = [chord("a", 0, 2, "G major"), chord("b", 6, 8, "D major")];
    expect(deriveChordTransitionEvents(chords)).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { aggregateIssues } from "@/lib/analysis/issues/issueAggregator";
import type { AnalysisEvent } from "@/lib/types";

function event(overrides: Partial<AnalysisEvent> & Pick<AnalysisEvent, "startTime" | "endTime" | "category">): AnalysisEvent {
  return {
    id: `${overrides.category}-${overrides.startTime}`,
    confidence: 0.7,
    metadata: {},
    ...overrides,
  };
}

describe("aggregateIssues", () => {
  it("merges nearby events from different categories into one combined issue", () => {
    const events = [
      event({ startTime: 35.2, endTime: 35.6, category: "possible_fret_buzz", confidence: 0.7 }),
      event({ startTime: 35.7, endTime: 36.0, category: "unclear_attack", confidence: 0.6 }),
    ];
    const issues = aggregateIssues(events, 60);
    expect(issues).toHaveLength(1);
    expect(issues[0].title.toLowerCase()).toContain("fret buzz");
    expect(issues[0].title.toLowerCase()).toContain("note clarity");
    expect(issues[0].contributingEventIds).toHaveLength(2);
  });

  it("keeps distant events as separate issues", () => {
    const events = [
      event({ startTime: 5, endTime: 5.3, category: "possible_fret_buzz" }),
      event({ startTime: 40, endTime: 40.3, category: "possible_fret_buzz" }),
    ];
    const issues = aggregateIssues(events, 60);
    expect(issues).toHaveLength(2);
  });

  it("adds playback context padding clamped to the recording duration", () => {
    const events = [event({ startTime: 0.2, endTime: 0.5, category: "possible_fret_buzz" })];
    const issues = aggregateIssues(events, 60, { contextBeforeSeconds: 1, contextAfterSeconds: 1 });
    expect(issues[0].playbackStartTime).toBe(0); // clamped, can't go negative
    expect(issues[0].playbackEndTime).toBeCloseTo(1.5, 5);
  });

  it("clamps playback context to the end of a short recording", () => {
    const events = [event({ startTime: 4.5, endTime: 4.8, category: "unclear_attack" })];
    const issues = aggregateIssues(events, 5, { contextAfterSeconds: 1 });
    expect(issues[0].playbackEndTime).toBe(5);
  });

  it("drops events below the confidence threshold", () => {
    const events = [event({ startTime: 1, endTime: 1.3, category: "possible_fret_buzz", confidence: 0.2 })];
    const issues = aggregateIssues(events, 60, { minConfidence: 0.5 });
    expect(issues).toHaveLength(0);
  });

  it("drops events that don't map to a coaching category (note/chord)", () => {
    const events = [event({ startTime: 1, endTime: 1.3, category: "note" })];
    const issues = aggregateIssues(events, 60);
    expect(issues).toHaveLength(0);
  });

  it("caps the number of issues returned and ranks by severity/confidence", () => {
    const events = Array.from({ length: 20 }, (_, i) =>
      event({ startTime: i * 5, endTime: i * 5 + 0.3, category: "possible_fret_buzz", confidence: 0.5 + (i % 5) * 0.1 })
    );
    const issues = aggregateIssues(events, 200, { maxIssues: 5 });
    expect(issues.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < issues.length; i++) {
      expect(issues[i - 1].confidence).toBeGreaterThanOrEqual(issues[i].confidence - 1e-9);
    }
  });

  it("bumps severity when corroborated by multiple categories", () => {
    const singleCategory = aggregateIssues(
      [event({ startTime: 0, endTime: 0.3, category: "possible_fret_buzz", confidence: 0.62 })],
      60
    );
    const multiCategory = aggregateIssues(
      [
        event({ startTime: 0, endTime: 0.3, category: "possible_fret_buzz", confidence: 0.62 }),
        event({ startTime: 0.3, endTime: 0.5, category: "unclear_attack", confidence: 0.62 }),
      ],
      60
    );
    expect(singleCategory[0].severity).toBe("medium");
    expect(multiCategory[0].severity).toBe("high");
  });
});

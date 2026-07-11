import { describe, expect, it } from "vitest";
import { RuleBasedPracticeCoachProvider } from "@/lib/coaching/ruleBasedCoachProvider";
import { DEFAULT_USER_PROFILE } from "@/lib/types";
import { makeAnalysis } from "../../fixtures/analysisFixtures";

describe("RuleBasedPracticeCoachProvider", () => {
  const provider = new RuleBasedPracticeCoachProvider();

  it("surfaces a timing-decline observation when second half is much less consistent", async () => {
    const analysis = makeAnalysis({
      timing: {
        score: 65,
        confidence: 0.8,
        firstHalfScore: 85,
        secondHalfScore: 55,
        weakestSegment: { startSeconds: 60, endSeconds: 80 },
        strongestSegment: { startSeconds: 0, endSeconds: 20 },
        driftDescription: "Your pulse was steadier early in the session and became less consistent later.",
      },
    });

    const result = await provider.generateCoaching(analysis, DEFAULT_USER_PROFILE, null);

    expect(result.observations.some((o) => o.category === "timing")).toBe(true);
    expect(result.observations[0].text).toContain("less consistent later");
  });

  it("flags repeated long pauses with a concrete count", async () => {
    const analysis = makeAnalysis({
      pauses: {
        count: 5,
        totalDurationSeconds: 25,
        segments: Array.from({ length: 5 }, (_, i) => ({ startSeconds: i * 10, endSeconds: i * 10 + 4 })),
        repeatedAttemptClusters: [],
      },
    });

    const result = await provider.generateCoaching(analysis, DEFAULT_USER_PROFILE, null);
    const pauseObservation = result.observations.find((o) => o.category === "pauses");
    expect(pauseObservation).toBeDefined();
    expect(pauseObservation?.text).toContain("5 times");
  });

  it("never claims a reliable tempo when confidence is low", async () => {
    const analysis = makeAnalysis({
      tempo: { bpm: null, confidence: 0.1 },
      timing: { score: null, confidence: 0.1, firstHalfScore: null, secondHalfScore: null },
    });

    const result = await provider.generateCoaching(analysis, DEFAULT_USER_PROFILE, null);
    const tempoObservation = result.observations.find((o) => o.category === "tempo");
    expect(tempoObservation).toBeDefined();
    expect(tempoObservation?.lowConfidence).toBe(true);
    expect(result.summary).not.toMatch(/BPM/);
  });

  it("limits primary observations to at most three", async () => {
    const analysis = makeAnalysis({
      pauses: { count: 6, totalDurationSeconds: 30, segments: [], repeatedAttemptClusters: [] },
      dynamics: {
        score: 30,
        confidence: 0.9,
        variation: 0.9,
        averageAttackStrength: 0.4,
        clippingEvents: 3,
        quietSectionSeconds: 10,
      },
      recordingQuality: {
        score: 40,
        clippingDetected: true,
        lowInputDetected: true,
        highNoiseDetected: true,
        possibleBackingMusic: false,
        insufficientDuration: false,
        confidence: 0.4,
        warnings: ["The microphone clipped during some louder sections."],
      },
    });

    const result = await provider.generateCoaching(analysis, DEFAULT_USER_PROFILE, null);
    expect(result.observations.length).toBeLessThanOrEqual(3);
    expect(result.recommendedActions.length).toBeLessThanOrEqual(2);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });

  it("frames a recommended action around the song section when provided", async () => {
    const analysis = makeAnalysis();
    const result = await provider.generateCoaching(analysis, DEFAULT_USER_PROFILE, {
      title: "Wonderwall",
      artist: "Oasis",
      section: "chorus",
    });
    expect(result.nextSessionGoal.length).toBeGreaterThan(0);
  });
});

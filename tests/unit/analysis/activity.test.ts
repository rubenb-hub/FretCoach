import { describe, expect, it } from "vitest";
import { extractFrameFeatures } from "@/lib/analysis/frames";
import { detectActivity } from "@/lib/analysis/activity";
import { generateClickTrackWithPauses, generateSilence, TEST_SAMPLE_RATE } from "../../fixtures/syntheticAudio";

describe("activity and pause detection", () => {
  it("detects a long pause inserted into a click track", () => {
    const samples = generateClickTrackWithPauses({
      bpm: 100,
      durationSeconds: 20,
      pauses: [{ atSeconds: 8, durationSeconds: 5 }],
    });
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const activity = detectActivity(frames, hopSize / sampleRate, 3, "standard");

    expect(activity.pauseSegments.length).toBeGreaterThanOrEqual(1);
    const pause = activity.pauseSegments[0];
    expect(pause.startSeconds).toBeGreaterThan(6.5);
    expect(pause.startSeconds).toBeLessThan(9.5);
    expect(pause.endSeconds - pause.startSeconds).toBeGreaterThanOrEqual(3);
  });

  it("treats a fully silent recording as having no active regions", () => {
    const samples = generateSilence(10);
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const activity = detectActivity(frames, hopSize / sampleRate, 3, "standard");

    expect(activity.activeRegions.length).toBe(0);
  });

  it("does not flag pauses shorter than the configured threshold", () => {
    const samples = generateClickTrackWithPauses({
      bpm: 100,
      durationSeconds: 15,
      pauses: [{ atSeconds: 6, durationSeconds: 1 }],
    });
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const activity = detectActivity(frames, hopSize / sampleRate, 3, "standard");

    expect(activity.pauseSegments.length).toBe(0);
  });
});

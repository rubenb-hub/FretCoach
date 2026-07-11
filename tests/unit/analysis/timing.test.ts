import { describe, expect, it } from "vitest";
import { extractFrameFeatures } from "@/lib/analysis/frames";
import { detectOnsets } from "@/lib/analysis/onsets";
import { estimateTempo } from "@/lib/analysis/tempo";
import { analyseTiming } from "@/lib/analysis/timing";
import { generateClickTrack, TEST_SAMPLE_RATE } from "../../fixtures/syntheticAudio";

function runPipeline(samples: Float32Array, durationSeconds: number) {
  const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
  const onsets = detectOnsets(frames, hopSize / sampleRate);
  const tempo = estimateTempo(onsets);
  const timing = analyseTiming(onsets, tempo, durationSeconds);
  return { onsets, tempo, timing };
}

describe("timing consistency scoring", () => {
  it("scores a perfectly steady click track as highly consistent", () => {
    const duration = 20;
    const samples = generateClickTrack({ bpm: 96, durationSeconds: duration });
    const { timing } = runPipeline(samples, duration);

    expect(timing.score).not.toBeNull();
    expect(timing.score as number).toBeGreaterThan(75);
  });

  it("scores a click track with gradual drift lower than a steady one", () => {
    const duration = 24;
    const steady = generateClickTrack({ bpm: 100, durationSeconds: duration });
    const drifting = generateClickTrack({ bpm: 100, durationSeconds: duration, driftPerSecond: 1.5 });

    const steadyResult = runPipeline(steady, duration);
    const driftingResult = runPipeline(drifting, duration);

    expect(steadyResult.timing.score).not.toBeNull();
    expect(driftingResult.timing.score).not.toBeNull();
    expect(driftingResult.timing.score as number).toBeLessThan(steadyResult.timing.score as number);
  });

  it("returns a null score with a low-confidence explanation for silence", () => {
    const duration = 10;
    const samples = new Float32Array(TEST_SAMPLE_RATE * duration);
    const { timing } = runPipeline(samples, duration);

    expect(timing.score).toBeNull();
    expect(timing.driftDescription).toBeDefined();
  });
});

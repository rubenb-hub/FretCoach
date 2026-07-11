import { describe, expect, it } from "vitest";
import { extractFrameFeatures } from "@/lib/analysis/frames";
import { detectActivity } from "@/lib/analysis/activity";
import { detectOnsets } from "@/lib/analysis/onsets";
import { analyseDynamics } from "@/lib/analysis/dynamics";
import { generateClickTrack, TEST_SAMPLE_RATE } from "../../fixtures/syntheticAudio";

function runPipeline(samples: Float32Array) {
  const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
  const hopSizeSeconds = hopSize / sampleRate;
  const activity = detectActivity(frames, hopSizeSeconds, 3, "standard");
  const onsets = detectOnsets(frames, hopSizeSeconds);
  const dynamics = analyseDynamics(onsets, frames, activity.activeRegions);
  return dynamics;
}

describe("dynamics scoring", () => {
  it("scores even attack strength as more consistent than jittery attack strength", () => {
    const even = generateClickTrack({ bpm: 100, durationSeconds: 20, amplitudeJitter: 0 });
    const uneven = generateClickTrack({ bpm: 100, durationSeconds: 20, amplitudeJitter: 1.2 });

    const evenResult = runPipeline(even);
    const unevenResult = runPipeline(uneven);

    expect(evenResult.score).toBeGreaterThan(unevenResult.score);
  });

  it("counts clipping events for a hard-limited signal", () => {
    const samples = generateClickTrack({ bpm: 90, durationSeconds: 10, amplitude: 1.6 });
    for (let i = 0; i < samples.length; i++) samples[i] = Math.max(-1, Math.min(1, samples[i]));

    const dynamics = runPipeline(samples);
    expect(dynamics.clippingEvents).toBeGreaterThan(0);
  });
});

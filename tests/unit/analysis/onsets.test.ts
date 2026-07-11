import { describe, expect, it } from "vitest";
import { extractFrameFeatures } from "@/lib/analysis/frames";
import { detectOnsets } from "@/lib/analysis/onsets";
import { generateClickTrack, generateSilence, TEST_SAMPLE_RATE } from "../../fixtures/syntheticAudio";

describe("onset detection", () => {
  it("finds roughly the expected number of onsets for a steady click track", () => {
    const durationSeconds = 15;
    const bpm = 100;
    const samples = generateClickTrack({ bpm, durationSeconds });
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const onsets = detectOnsets(frames, hopSize / sampleRate);

    const expectedClicks = Math.floor((durationSeconds * bpm) / 60);
    expect(onsets.length).toBeGreaterThan(expectedClicks * 0.7);
    expect(onsets.length).toBeLessThan(expectedClicks * 1.3);
  });

  it("enforces a minimum gap between detected onsets", () => {
    const samples = generateClickTrack({ bpm: 180, durationSeconds: 10 });
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const onsets = detectOnsets(frames, hopSize / sampleRate);

    for (let i = 1; i < onsets.length; i++) {
      expect(onsets[i].timeSeconds - onsets[i - 1].timeSeconds).toBeGreaterThanOrEqual(0.099);
    }
  });

  it("finds almost no onsets in near-silence", () => {
    const samples = generateSilence(8);
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const onsets = detectOnsets(frames, hopSize / sampleRate);
    expect(onsets.length).toBeLessThan(5);
  });
});

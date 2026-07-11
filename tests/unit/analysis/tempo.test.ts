import { describe, expect, it } from "vitest";
import { extractFrameFeatures } from "@/lib/analysis/frames";
import { detectOnsets } from "@/lib/analysis/onsets";
import { estimateTempo } from "@/lib/analysis/tempo";
import { generateClickTrack, TEST_SAMPLE_RATE } from "../../fixtures/syntheticAudio";

describe("tempo estimation", () => {
  it("detects a steady 80 BPM click track within a small tolerance", () => {
    const samples = generateClickTrack({ bpm: 80, durationSeconds: 20 });
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const onsets = detectOnsets(frames, hopSize / sampleRate);
    const tempo = estimateTempo(onsets);

    expect(tempo.bpm).not.toBeNull();
    expect(Math.abs((tempo.bpm ?? 0) - 80)).toBeLessThanOrEqual(3);
    expect(tempo.confidence).toBeGreaterThan(0.35);
  });

  it("detects a steady 120 BPM click track within a small tolerance", () => {
    const samples = generateClickTrack({ bpm: 120, durationSeconds: 16 });
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const onsets = detectOnsets(frames, hopSize / sampleRate);
    const tempo = estimateTempo(onsets);

    expect(tempo.bpm).not.toBeNull();
    expect(Math.abs((tempo.bpm ?? 0) - 120)).toBeLessThanOrEqual(3);
  });

  it("returns low/no confidence for near-silent audio", () => {
    const samples = new Float32Array(TEST_SAMPLE_RATE * 10);
    const { frames, hopSize, sampleRate } = extractFrameFeatures(samples, TEST_SAMPLE_RATE);
    const onsets = detectOnsets(frames, hopSize / sampleRate);
    const tempo = estimateTempo(onsets);

    expect(tempo.bpm === null || tempo.confidence < 0.35).toBe(true);
  });
});

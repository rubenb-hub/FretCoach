import { describe, expect, it } from "vitest";
import { analyzeMusicSession, MAX_MUSIC_ANALYSIS_SECONDS } from "@/lib/providers/musicAnalysisProvider";

const SAMPLE_RATE = 44100;

function makeMonoBuffer(samples: Float32Array, sampleRate = SAMPLE_RATE): AudioBuffer {
  return {
    numberOfChannels: 1,
    length: samples.length,
    sampleRate,
    duration: samples.length / sampleRate,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

function sineSamples(frequencyHz: number, durationSeconds: number, amplitude = 0.7): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin((2 * Math.PI * frequencyHz * i) / SAMPLE_RATE) * amplitude;
  }
  return samples;
}

describe("analyzeMusicSession", () => {
  it("produces notes, no chords, and no issues for a simple clean sustained note", async () => {
    const buffer = makeMonoBuffer(sineSamples(220, 1.5));
    const stages: string[] = [];
    const result = await analyzeMusicSession(buffer, null, { onStage: (s) => stages.push(s) });

    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
    expect(result.analysedDurationSeconds).toBeCloseTo(1.5, 1);
    expect(stages).toEqual(["detecting-notes", "detecting-chords", "detecting-technique", "aggregating-issues"]);
  });

  it("truncates a recording longer than the configured analysis limit", async () => {
    const buffer = makeMonoBuffer(sineSamples(220, 1), SAMPLE_RATE);
    const result = await analyzeMusicSession(buffer, null, { maxAnalysisSeconds: 0.5 });
    expect(result.truncated).toBe(true);
    expect(result.analysedDurationSeconds).toBeCloseTo(0.5, 1);
  });

  it("does not truncate when the recording is within the default limit", () => {
    expect(MAX_MUSIC_ANALYSIS_SECONDS).toBeGreaterThan(60);
  });

  it("returns empty results for a silent recording without throwing", async () => {
    const buffer = makeMonoBuffer(new Float32Array(SAMPLE_RATE));
    const result = await analyzeMusicSession(buffer, null);
    expect(result.notes).toHaveLength(0);
    expect(result.chords).toHaveLength(0);
    expect(result.issues).toHaveLength(0);
  });
});

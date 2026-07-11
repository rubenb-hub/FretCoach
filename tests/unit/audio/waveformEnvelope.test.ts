import { describe, expect, it } from "vitest";
import { computeWaveformEnvelope } from "@/lib/audio/waveformEnvelope";

function makeMonoBuffer(samples: number[]): AudioBuffer {
  const data = new Float32Array(samples);
  return {
    numberOfChannels: 1,
    length: data.length,
    sampleRate: 44100,
    duration: data.length / 44100,
    getChannelData: (channel: number) => {
      if (channel !== 0) throw new Error("mono buffer only");
      return data;
    },
  } as unknown as AudioBuffer;
}

describe("computeWaveformEnvelope", () => {
  it("returns a bucket per requested count, with peak amplitude per bucket", () => {
    const samples = new Array(1000).fill(0);
    samples[10] = 0.9;
    samples[500] = -0.4;
    const buffer = makeMonoBuffer(samples);

    const envelope = computeWaveformEnvelope(buffer, 10);
    expect(envelope.length).toBe(10);
    expect(envelope[0]).toBeCloseTo(0.9, 5);
    expect(envelope[5]).toBeCloseTo(0.4, 5);
  });

  it("returns an all-zero envelope for silence", () => {
    const buffer = makeMonoBuffer(new Array(500).fill(0));
    const envelope = computeWaveformEnvelope(buffer, 5);
    expect(Array.from(envelope)).toEqual([0, 0, 0, 0, 0]);
  });

  it("handles an empty buffer without throwing", () => {
    const buffer = makeMonoBuffer([]);
    const envelope = computeWaveformEnvelope(buffer, 20);
    expect(envelope.length).toBe(20);
  });
});

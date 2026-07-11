import { describe, expect, it } from "vitest";
import { LocalChordDetectionProvider } from "@/lib/providers/chordDetectionProvider";

const SAMPLE_RATE = 44100;

function makeMonoBuffer(samples: Float32Array): AudioBuffer {
  return {
    numberOfChannels: 1,
    length: samples.length,
    sampleRate: SAMPLE_RATE,
    duration: samples.length / SAMPLE_RATE,
    getChannelData: () => samples,
  } as unknown as AudioBuffer;
}

function chordSamples(frequencies: number[], durationSeconds: number, amplitude = 0.25): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let value = 0;
    for (const hz of frequencies) value += Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE);
    samples[i] = value * amplitude;
  }
  return samples;
}

describe("LocalChordDetectionProvider", () => {
  it("identifies a sustained A minor triad (A3, C4, E4)", async () => {
    const buffer = makeMonoBuffer(chordSamples([220, 261.63, 329.63], 2.5));
    const provider = new LocalChordDetectionProvider();
    const detections = await provider.detectChords(buffer);

    expect(detections.length).toBeGreaterThan(0);
    const longest = detections.reduce((a, b) => (b.endTime - b.startTime > a.endTime - a.startTime ? b : a));
    expect(longest.primary.name).toBe("A minor");
    expect(longest.primary.confidence).toBeGreaterThan(0.6);
  });

  it("identifies a sustained G major triad (G3, B3, D4)", async () => {
    const buffer = makeMonoBuffer(chordSamples([196.0, 246.94, 293.66], 2.5));
    const provider = new LocalChordDetectionProvider();
    const detections = await provider.detectChords(buffer);

    expect(detections.length).toBeGreaterThan(0);
    const longest = detections.reduce((a, b) => (b.endTime - b.startTime > a.endTime - a.startTime ? b : a));
    expect(longest.primary.name).toBe("G major");
  });

  it("returns no chord detections for silence", async () => {
    const buffer = makeMonoBuffer(new Float32Array(SAMPLE_RATE * 2));
    const provider = new LocalChordDetectionProvider();
    const detections = await provider.detectChords(buffer);
    expect(detections).toHaveLength(0);
  });
});

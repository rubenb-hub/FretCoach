import { describe, expect, it } from "vitest";
import { LocalPitchDetectionProvider } from "@/lib/providers/pitchDetectionProvider";

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

function sineSamples(frequencyHz: number, durationSeconds: number, amplitude = 0.7): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    samples[i] = Math.sin((2 * Math.PI * frequencyHz * i) / SAMPLE_RATE) * amplitude;
  }
  return samples;
}

describe("LocalPitchDetectionProvider", () => {
  it("detects a single sustained note from a synthetic sine-wave recording", async () => {
    const buffer = makeMonoBuffer(sineSamples(196, 1.2)); // G3
    const provider = new LocalPitchDetectionProvider();
    const notes = await provider.detectNotes(buffer);

    expect(notes.length).toBeGreaterThan(0);
    const dominant = notes.reduce((best, n) => (n.endTime - n.startTime > best.endTime - best.startTime ? n : best));
    expect(dominant.noteName).toBe("G");
    expect(dominant.octave).toBe(3);
    expect(Math.abs(dominant.centsOffset)).toBeLessThan(25);
  });

  it("returns no notes for a silent recording", async () => {
    const buffer = makeMonoBuffer(new Float32Array(SAMPLE_RATE)); // 1s of silence
    const provider = new LocalPitchDetectionProvider();
    const notes = await provider.detectNotes(buffer);
    expect(notes).toHaveLength(0);
  });
});

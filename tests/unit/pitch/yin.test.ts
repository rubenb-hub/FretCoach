import { describe, expect, it } from "vitest";
import { detectPitchYin } from "@/lib/analysis/pitch/yin";

const SAMPLE_RATE = 44100;
const FRAME_SIZE = 2048;

function generateSineFrame(frequencyHz: number, sampleRate = SAMPLE_RATE, frameSize = FRAME_SIZE): Float32Array {
  const frame = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    frame[i] = Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate) * 0.8;
  }
  return frame;
}

describe("detectPitchYin", () => {
  const targets: { note: string; hz: number }[] = [
    { note: "E2", hz: 82.41 },
    { note: "A2", hz: 110 },
    { note: "D3", hz: 146.83 },
    { note: "G3", hz: 196 },
    { note: "B3", hz: 246.94 },
    { note: "E4", hz: 329.63 },
    { note: "A4", hz: 440 },
  ];

  for (const { note, hz } of targets) {
    it(`detects a pure ${note} sine wave (${hz}Hz) within 1%`, () => {
      const frame = generateSineFrame(hz);
      const result = detectPitchYin(frame, SAMPLE_RATE);
      expect(result.frequencyHz).not.toBeNull();
      expect(result.frequencyHz as number).toBeCloseTo(hz, 0);
      expect(Math.abs((result.frequencyHz as number) - hz) / hz).toBeLessThan(0.01);
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  }

  it("rejects silence with low confidence", () => {
    const frame = new Float32Array(FRAME_SIZE); // all zeros
    const result = detectPitchYin(frame, SAMPLE_RATE);
    expect(result.confidence).toBeLessThan(0.3);
  });

  it("rejects low-level room noise with low confidence", () => {
    const frame = new Float32Array(FRAME_SIZE).map(() => (Math.random() * 2 - 1) * 0.01);
    const result = detectPitchYin(frame, SAMPLE_RATE);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("stays within the configured min/max frequency search range", () => {
    // A sine well above maxFrequencyHz should not be reported as a low note.
    const frame = generateSineFrame(2000);
    const result = detectPitchYin(frame, SAMPLE_RATE, { minFrequencyHz: 70, maxFrequencyHz: 1400 });
    if (result.frequencyHz !== null) {
      expect(result.frequencyHz).toBeGreaterThanOrEqual(70 * 0.9);
    }
  });
});

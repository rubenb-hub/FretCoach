import { describe, expect, it } from "vitest";
import { computePostAttackFeatures } from "@/lib/analysis/fretBuzz/postAttackFeatures";

const SAMPLE_RATE = 44100;

function cleanDecaySamples(frequencyHz: number, durationSeconds: number): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const decay = Math.exp(-t * 8);
    samples[i] = Math.sin(2 * Math.PI * frequencyHz * t) * decay * 0.8;
  }
  return samples;
}

function noisyPostAttackSamples(frequencyHz: number, durationSeconds: number): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / SAMPLE_RATE;
    const decay = Math.exp(-t * 8);
    const tone = Math.sin(2 * Math.PI * frequencyHz * t) * decay * 0.5;
    // Bursty broadband noise re-triggering periodically, simulating buzz.
    const burstEnvelope = Math.abs(Math.sin(2 * Math.PI * 35 * t)) > 0.85 ? 1 : 0.15;
    const noise = (Math.random() * 2 - 1) * 0.6 * burstEnvelope;
    samples[i] = tone + noise;
  }
  return samples;
}

function whiteNoiseSamples(durationSeconds: number): Float32Array {
  const length = Math.floor(durationSeconds * SAMPLE_RATE);
  const samples = new Float32Array(length);
  for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * 0.7;
  return samples;
}

describe("computePostAttackFeatures", () => {
  it("reports high harmonicity and a smoother decay for a clean decaying tone", () => {
    const samples = cleanDecaySamples(220, 0.4);
    const features = computePostAttackFeatures(samples, SAMPLE_RATE, 0, 0.4, 220);
    expect(features).not.toBeNull();
    expect(features!.harmonicity).toBeGreaterThan(0.5);
    expect(features!.highFrequencyEnergyRatio).toBeLessThan(0.3);
  });

  it("reports lower harmonicity and more high-frequency energy for a noisy/bursty post-attack signal", () => {
    const clean = computePostAttackFeatures(cleanDecaySamples(220, 0.4), SAMPLE_RATE, 0, 0.4, 220)!;
    const noisy = computePostAttackFeatures(noisyPostAttackSamples(220, 0.4), SAMPLE_RATE, 0, 0.4, 220)!;
    expect(noisy.harmonicity).toBeLessThan(clean.harmonicity);
    expect(noisy.highFrequencyEnergyRatio).toBeGreaterThan(clean.highFrequencyEnergyRatio);
  });

  it("reports near-zero harmonicity and high spectral flatness for pure white noise", () => {
    const features = computePostAttackFeatures(whiteNoiseSamples(0.4), SAMPLE_RATE, 0, 0.4, 220);
    expect(features).not.toBeNull();
    expect(features!.harmonicity).toBeLessThan(0.3);
    expect(features!.spectralFlatness).toBeGreaterThan(0.2);
  });

  it("returns null when the note is too short to analyse a post-attack window", () => {
    const samples = cleanDecaySamples(220, 0.4);
    const features = computePostAttackFeatures(samples, SAMPLE_RATE, 0, 0.02, 220);
    expect(features).toBeNull();
  });
});

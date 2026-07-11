import { createHannWindow, magnitudeSpectrum } from "./fft";

/**
 * Frame size and hop size chosen for guitar-range analysis:
 *  - 2048 samples (~46ms @ 44.1kHz) gives frequency resolution of
 *    ~21.5Hz/bin, enough to estimate spectral centroid for guitar's
 *    fundamental + harmonic range.
 *  - 512 sample hop (~11.6ms @ 44.1kHz, 75% overlap) gives enough time
 *    resolution to catch strum/pick attacks for onset detection, while
 *    keeping the total frame count for a multi-minute recording tractable
 *    for real-time-ish in-browser processing.
 */
export const FRAME_SIZE = 2048;
export const HOP_SIZE = 512;

export interface FrameFeatures {
  timeSeconds: number;
  rms: number;
  peak: number;
  zeroCrossingRate: number;
  spectralCentroidHz: number;
  spectralFlux: number;
}

export interface FrameFeatureSet {
  frames: FrameFeatures[];
  sampleRate: number;
  frameSize: number;
  hopSize: number;
}

/**
 * Runs the frame-based feature extraction pass over mono samples.
 * This is the single source of truth other analysis stages build on:
 * activity/pause detection, onset detection, tempo, timing and dynamics
 * all consume this frame array rather than re-reading raw samples.
 */
export function extractFrameFeatures(samples: Float32Array, sampleRate: number): FrameFeatureSet {
  const window = createHannWindow(FRAME_SIZE);
  const realScratch = new Float32Array(FRAME_SIZE);
  const imagScratch = new Float32Array(FRAME_SIZE);
  const frame = new Float32Array(FRAME_SIZE);

  const frameCount = Math.max(0, Math.floor((samples.length - FRAME_SIZE) / HOP_SIZE) + 1);
  const frames: FrameFeatures[] = [];
  let previousMagnitudes: Float32Array | null = null;

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const start = frameIndex * HOP_SIZE;
    frame.set(samples.subarray(start, start + FRAME_SIZE));

    let sumSquares = 0;
    let peak = 0;
    let zeroCrossings = 0;
    for (let i = 0; i < FRAME_SIZE; i++) {
      const value = frame[i];
      sumSquares += value * value;
      const abs = Math.abs(value);
      if (abs > peak) peak = abs;
      if (i > 0 && frame[i - 1] >= 0 !== value >= 0) zeroCrossings++;
    }
    const rms = Math.sqrt(sumSquares / FRAME_SIZE);
    const zeroCrossingRate = zeroCrossings / FRAME_SIZE;

    const magnitudes = magnitudeSpectrum(frame, window, realScratch, imagScratch);

    let weightedFreqSum = 0;
    let magnitudeSum = 0;
    for (let bin = 0; bin < magnitudes.length; bin++) {
      const freq = (bin * sampleRate) / FRAME_SIZE;
      weightedFreqSum += freq * magnitudes[bin];
      magnitudeSum += magnitudes[bin];
    }
    const spectralCentroidHz = magnitudeSum > 0 ? weightedFreqSum / magnitudeSum : 0;

    let spectralFlux = 0;
    if (previousMagnitudes) {
      for (let bin = 0; bin < magnitudes.length; bin++) {
        const diff = magnitudes[bin] - previousMagnitudes[bin];
        if (diff > 0) spectralFlux += diff;
      }
    }
    previousMagnitudes = magnitudes;

    frames.push({
      timeSeconds: start / sampleRate,
      rms,
      peak,
      zeroCrossingRate,
      spectralCentroidHz,
      spectralFlux,
    });
  }

  return { frames, sampleRate, frameSize: FRAME_SIZE, hopSize: HOP_SIZE };
}

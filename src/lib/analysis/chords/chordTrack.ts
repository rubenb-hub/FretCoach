import { createHannWindow, magnitudeSpectrum } from "@/lib/analysis/fft";
import { computeChromaVector } from "./chroma";
import { matchChordTemplate } from "./chordMatching";
import type { ChordCandidate } from "@/lib/types";

/** Large enough for ~5Hz bin resolution at 44.1kHz (needed to tell
 * adjacent semitones apart down near the guitar's low E), while still a
 * power of two the shared FFT implementation can transform quickly. */
export const CHORD_FFT_SIZE = 8192;
export const CHORD_HOP_SIZE = 4096;

export interface ChordWindow {
  timeSeconds: number;
  durationSeconds: number;
  primary: ChordCandidate | null;
  alternatives: ChordCandidate[];
  rms: number;
}

export interface ChordTrackOptions {
  minConfidence?: number;
  minRms?: number;
  onProgress?: (ratio: number) => void | Promise<void>;
  yieldEveryFrames?: number;
}

const DEFAULT_MIN_CONFIDENCE = 0.62;
const DEFAULT_MIN_RMS = 0.01;

/**
 * Slides an FFT window across the mono signal, computing a chroma vector
 * and matching it against chord templates per window. This is a raw,
 * per-window track — see chordSmoothing.ts for the temporal smoothing and
 * merge into user-facing ChordDetection regions.
 */
export async function trackChords(
  samples: Float32Array,
  sampleRate: number,
  options: ChordTrackOptions = {}
): Promise<ChordWindow[]> {
  const {
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    minRms = DEFAULT_MIN_RMS,
    onProgress,
    yieldEveryFrames = 10,
  } = options;

  const window = createHannWindow(CHORD_FFT_SIZE);
  const realScratch = new Float32Array(CHORD_FFT_SIZE);
  const imagScratch = new Float32Array(CHORD_FFT_SIZE);
  const frame = new Float32Array(CHORD_FFT_SIZE);

  const frameCount = Math.max(0, Math.floor((samples.length - CHORD_FFT_SIZE) / CHORD_HOP_SIZE) + 1);
  const windows: ChordWindow[] = [];
  const durationSeconds = CHORD_HOP_SIZE / sampleRate;

  for (let i = 0; i < frameCount; i++) {
    const start = i * CHORD_HOP_SIZE;
    frame.set(samples.subarray(start, start + CHORD_FFT_SIZE));

    let sumSquares = 0;
    for (let j = 0; j < CHORD_FFT_SIZE; j++) sumSquares += frame[j] * frame[j];
    const rms = Math.sqrt(sumSquares / CHORD_FFT_SIZE);
    const timeSeconds = start / sampleRate;

    if (rms < minRms) {
      windows.push({ timeSeconds, durationSeconds, primary: null, alternatives: [], rms });
    } else {
      const magnitudes = magnitudeSpectrum(frame, window, realScratch, imagScratch);
      const chroma = computeChromaVector(magnitudes, sampleRate, CHORD_FFT_SIZE);
      const { primary, alternatives } = matchChordTemplate(chroma, minConfidence);
      windows.push({ timeSeconds, durationSeconds, primary, alternatives, rms });
    }

    if (onProgress && i % yieldEveryFrames === 0) {
      await onProgress(frameCount > 0 ? i / frameCount : 1);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  await onProgress?.(1);
  return windows;
}

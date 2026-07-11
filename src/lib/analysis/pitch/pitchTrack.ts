import { detectPitchYin, DEFAULT_YIN_OPTIONS, type YinOptions } from "./yin";
import { DEFAULT_GUITAR_RANGE_HZ } from "./noteTheory";

/** Larger than the shared frame-feature grid (frames.ts) because YIN
 * needs enough samples to cover several periods of the guitar's lowest
 * note (E2 ≈ 82Hz, period ≈ 535 samples @44.1kHz) for a stable estimate.
 * The coarser 1024-sample hop (vs. 512 elsewhere) halves the frame count
 * for this — by far the most expensive — detector, since note-level
 * timing doesn't need the same time resolution as onset detection. */
export const PITCH_FRAME_SIZE = 2048;
export const PITCH_HOP_SIZE = 1024;

export interface PitchFrame {
  timeSeconds: number;
  frequencyHz: number | null;
  confidence: number;
  rms: number;
}

export interface PitchTrackOptions extends Partial<YinOptions> {
  /** Frames quieter than this RMS are skipped without running YIN at all. */
  minRms?: number;
  /** Optional cooperative-yield hook so long recordings don't block the
   * main thread for their whole analysis; called periodically with a
   * 0-1 progress ratio. Awaiting it lets the browser repaint/respond. */
  onProgress?: (ratio: number) => void | Promise<void>;
  /** How many frames to process between yields. */
  yieldEveryFrames?: number;
}

const DEFAULT_MIN_RMS = 0.006;

/**
 * Runs YIN pitch detection across overlapping frames of a mono signal.
 * Silent/very quiet frames are skipped cheaply (a plain RMS check) before
 * ever running the more expensive YIN search, and frame results outside
 * the configured guitar frequency range are discarded — this is what
 * keeps a multi-minute recording tractable in-browser.
 */
export async function trackPitch(
  samples: Float32Array,
  sampleRate: number,
  options: PitchTrackOptions = {}
): Promise<PitchFrame[]> {
  const {
    minRms = DEFAULT_MIN_RMS,
    onProgress,
    yieldEveryFrames = 40,
    minFrequencyHz = DEFAULT_GUITAR_RANGE_HZ.minHz,
    maxFrequencyHz = DEFAULT_GUITAR_RANGE_HZ.maxHz,
    threshold = DEFAULT_YIN_OPTIONS.threshold,
  } = options;

  const frameCount = Math.max(0, Math.floor((samples.length - PITCH_FRAME_SIZE) / PITCH_HOP_SIZE) + 1);
  const results: PitchFrame[] = [];
  const scratch = new Float32Array(PITCH_FRAME_SIZE);

  for (let i = 0; i < frameCount; i++) {
    const start = i * PITCH_HOP_SIZE;
    scratch.set(samples.subarray(start, start + PITCH_FRAME_SIZE));

    let sumSquares = 0;
    for (let j = 0; j < PITCH_FRAME_SIZE; j++) sumSquares += scratch[j] * scratch[j];
    const rms = Math.sqrt(sumSquares / PITCH_FRAME_SIZE);
    const timeSeconds = start / sampleRate;

    if (rms < minRms) {
      results.push({ timeSeconds, frequencyHz: null, confidence: 0, rms });
    } else {
      const { frequencyHz, confidence } = detectPitchYin(scratch, sampleRate, {
        minFrequencyHz,
        maxFrequencyHz,
        threshold,
      });
      results.push({ timeSeconds, frequencyHz, confidence, rms });
    }

    if (onProgress && i % yieldEveryFrames === 0) {
      await onProgress(frameCount > 0 ? i / frameCount : 1);
      // Yield to the event loop so the UI can repaint between chunks.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  await onProgress?.(1);
  return results;
}

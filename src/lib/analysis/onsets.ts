import type { FrameFeatures } from "./frames";
import type { OnsetEvidence } from "@/lib/types";

const MIN_ONSET_GAP_SECONDS = 0.1;

/**
 * Detects note/strum attack times from the spectral-flux curve using
 * adaptive thresholding, a standard and practical approach for
 * percussive/plucked onsets (Bello et al.). This will not identify pitch
 * or which string/fret was played — only "something was struck here".
 */
export function detectOnsets(frames: FrameFeatures[], hopSizeSeconds: number): OnsetEvidence[] {
  if (frames.length === 0) return [];

  const flux = frames.map((f) => f.spectralFlux);

  // Smooth flux with a small moving average to reduce spurious peaks from
  // frame-to-frame noise.
  const smoothingWindow = 3;
  const smoothed = flux.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = i - smoothingWindow; j <= i + smoothingWindow; j++) {
      if (j >= 0 && j < flux.length) {
        sum += flux[j];
        count++;
      }
    }
    return sum / count;
  });

  // Adaptive threshold: local mean + k * local std over a ~1s window,
  // so onset sensitivity adapts to how "busy" a section of the recording
  // is rather than using one global cutoff.
  const adaptiveWindowFrames = Math.max(4, Math.round(1 / hopSizeSeconds));
  const threshold: number[] = new Array(smoothed.length);
  for (let i = 0; i < smoothed.length; i++) {
    const lo = Math.max(0, i - adaptiveWindowFrames);
    const hi = Math.min(smoothed.length, i + adaptiveWindowFrames);
    let sum = 0;
    for (let j = lo; j < hi; j++) sum += smoothed[j];
    const mean = sum / (hi - lo);
    let variance = 0;
    for (let j = lo; j < hi; j++) variance += (smoothed[j] - mean) ** 2;
    const std = Math.sqrt(variance / (hi - lo));
    threshold[i] = mean + 1.5 * std;
  }

  // Relative (mean+k*std) thresholding alone can't tell a true attack from
  // ordinary noise fluctuation, since noise has "peaks" relative to itself
  // too. We additionally require the frame to carry real energy above the
  // recording's own noise floor, so a near-silent recording doesn't
  // produce a stream of false onsets.
  const rmsValues = frames.map((f) => f.rms).slice().sort((a, b) => a - b);
  const noiseFloorRms = rmsValues[Math.floor(rmsValues.length * 0.15)] ?? 0;
  const minEnergyForOnset = Math.max(noiseFloorRms * 3, 0.006);

  const onsets: OnsetEvidence[] = [];
  let lastOnsetTime = -Infinity;
  const maxFlux = Math.max(...smoothed, 1e-9);

  for (let i = 1; i < smoothed.length - 1; i++) {
    const isLocalPeak = smoothed[i] > smoothed[i - 1] && smoothed[i] >= smoothed[i + 1];
    const exceedsThreshold = smoothed[i] > threshold[i] && smoothed[i] > 0;
    const hasRealEnergy = frames[i].rms > minEnergyForOnset;
    const time = frames[i].timeSeconds;
    if (isLocalPeak && exceedsThreshold && hasRealEnergy && time - lastOnsetTime >= MIN_ONSET_GAP_SECONDS) {
      const marginAboveThreshold = smoothed[i] - threshold[i];
      const confidence = Math.max(0, Math.min(1, marginAboveThreshold / (maxFlux * 0.5)));
      onsets.push({
        timeSeconds: time,
        strength: frames[i].peak,
        confidence,
      });
      lastOnsetTime = time;
    }
  }

  return onsets;
}

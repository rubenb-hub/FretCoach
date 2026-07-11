/**
 * YIN pitch detection (de Cheveigné & Kawahara, 2002) for a single frame
 * of audio. This is the standard autocorrelation-family method used for
 * monophonic pitch tracking; it is not attempted on polyphonic material
 * (chords use a separate chroma/template approach — see lib/analysis/chords).
 *
 * Steps, per the paper:
 *  1. Difference function d(tau) = sum (x[j] - x[j+tau])^2
 *  2. Cumulative mean normalized difference function (CMNDF)
 *  3. Absolute threshold: first tau where CMNDF dips below `threshold`
 *  4. Parabolic interpolation around that tau for sub-sample precision
 *  5. confidence = 1 - CMNDF(tau) ("aperiodicity" -> higher is more tonal)
 */
export interface YinResult {
  frequencyHz: number | null;
  /** 0-1; 1 - the cumulative mean normalized difference at the chosen lag. */
  confidence: number;
}

export interface YinOptions {
  /** Only search lags corresponding to frequencies at or above this. */
  minFrequencyHz: number;
  /** Only search lags corresponding to frequencies at or below this. */
  maxFrequencyHz: number;
  /** CMNDF absolute threshold (de Cheveigné & Kawahara suggest ~0.1-0.15). */
  threshold: number;
}

export const DEFAULT_YIN_OPTIONS: YinOptions = {
  minFrequencyHz: 70,
  maxFrequencyHz: 1400,
  threshold: 0.15,
};

/**
 * Runs YIN on one frame. `frame.length` should be at least ~2x the period
 * of `minFrequencyHz` at the given sample rate for a reliable estimate.
 */
export function detectPitchYin(frame: Float32Array, sampleRate: number, options: Partial<YinOptions> = {}): YinResult {
  const { minFrequencyHz, maxFrequencyHz, threshold } = { ...DEFAULT_YIN_OPTIONS, ...options };

  const maxTau = Math.min(Math.floor(frame.length / 2), Math.ceil(sampleRate / minFrequencyHz));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequencyHz));
  if (maxTau <= minTau) return { frequencyHz: null, confidence: 0 };

  // Step 1: difference function, only over the tau range we actually care
  // about (restricting to the guitar's practical frequency range keeps
  // this from being the O(W^2) full-range computation).
  const diff = new Float32Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau++) {
    let sum = 0;
    const limit = frame.length - tau;
    for (let j = 0; j < limit; j++) {
      const delta = frame[j] - frame[j + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: cumulative mean normalized difference function.
  const cmndf = new Float32Array(maxTau + 1);
  cmndf[minTau] = 1;
  let runningSum = diff[minTau];
  for (let tau = minTau + 1; tau <= maxTau; tau++) {
    runningSum += diff[tau];
    const meanSoFar = runningSum / (tau - minTau + 1);
    cmndf[tau] = meanSoFar > 0 ? diff[tau] / meanSoFar : 1;
  }

  // Step 3: absolute threshold — first local minimum under `threshold`.
  let chosenTau = -1;
  for (let tau = minTau + 1; tau < maxTau; tau++) {
    if (cmndf[tau] < threshold) {
      // Descend to the actual local minimum rather than stopping at the
      // first sample under threshold.
      let t = tau;
      while (t + 1 <= maxTau && cmndf[t + 1] < cmndf[t]) t++;
      chosenTau = t;
      break;
    }
  }

  if (chosenTau === -1) {
    // No lag cleared the threshold: fall back to the global minimum, but
    // report low confidence since this is a much weaker signal.
    let bestTau = minTau;
    let bestValue = cmndf[minTau];
    for (let tau = minTau + 1; tau <= maxTau; tau++) {
      if (cmndf[tau] < bestValue) {
        bestValue = cmndf[tau];
        bestTau = tau;
      }
    }
    chosenTau = bestTau;
  }

  // Step 4: parabolic interpolation around chosenTau for sub-sample precision.
  const interpolatedTau = parabolicInterpolate(cmndf, chosenTau, minTau, maxTau);
  const frequencyHz = sampleRate / interpolatedTau;
  const confidence = Math.max(0, Math.min(1, 1 - cmndf[chosenTau]));

  return { frequencyHz, confidence };
}

function parabolicInterpolate(values: Float32Array, tau: number, minTau: number, maxTau: number): number {
  if (tau <= minTau || tau >= maxTau) return tau;
  const s0 = values[tau - 1];
  const s1 = values[tau];
  const s2 = values[tau + 1];
  const denominator = 2 * s1 - s2 - s0;
  if (denominator === 0) return tau;
  const shift = (s2 - s0) / (2 * denominator);
  return tau + shift;
}

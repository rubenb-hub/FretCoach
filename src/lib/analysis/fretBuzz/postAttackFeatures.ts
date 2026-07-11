import { createHannWindow, magnitudeSpectrum } from "@/lib/analysis/fft";

/**
 * Shared feature extraction for the post-attack portion of a detected
 * note, used by both the possible-fret-buzz detector and the note-clarity
 * heuristics. Deliberately skips the initial pick/pluck attack transient
 * (which is legitimately loud and broadband for *every* note, clean or
 * not) and only looks at what happens after it — fret buzz and muting
 * problems show up in the sustain/decay, not the attack itself.
 */
export interface PostAttackFeatures {
  highFrequencyEnergyRatio: number;
  spectralFlatness: number;
  zeroCrossingRate: number;
  /** 0-1; energy concentrated at the note's harmonic series vs. total energy. */
  harmonicity: number;
  /** 0-1; 1 = smooth monotonic decay, lower = bumpy/re-energised decay. */
  decayScore: number;
  rms: number;
  analysedDurationSeconds: number;
}

const ATTACK_SKIP_SECONDS = 0.015;
const MAX_ANALYSIS_WINDOW_SECONDS = 0.25;
const MIN_ANALYSIS_WINDOW_SECONDS = 0.02;
const HIGH_FREQUENCY_THRESHOLD_HZ = 3000;
const SPECTRAL_ANALYSIS_MIN_HZ = 60;
const SPECTRAL_ANALYSIS_MAX_HZ = 8000;
const ANALYSIS_FFT_SIZE = 2048;
const DECAY_SUBFRAME_SIZE = 256;
const HARMONIC_COUNT = 8;
/** Fraction of a harmonic's frequency treated as "on that harmonic" — wide
 * enough to tolerate slight detuning/inharmonicity of real strings. */
const HARMONIC_TOLERANCE_RATIO = 0.03;

export function computePostAttackFeatures(
  samples: Float32Array,
  sampleRate: number,
  noteStartTime: number,
  noteEndTime: number,
  fundamentalHz: number
): PostAttackFeatures | null {
  const windowStart = noteStartTime + ATTACK_SKIP_SECONDS;
  const windowEnd = Math.min(noteEndTime, windowStart + MAX_ANALYSIS_WINDOW_SECONDS);
  if (windowEnd - windowStart < MIN_ANALYSIS_WINDOW_SECONDS) return null;

  const startSample = Math.round(windowStart * sampleRate);
  const endSample = Math.min(samples.length, Math.round(windowEnd * sampleRate));
  if (endSample - startSample < MIN_ANALYSIS_WINDOW_SECONDS * sampleRate) return null;

  const segment = samples.subarray(startSample, endSample);

  // RMS-envelope decay smoothness.
  const rmsSeries: number[] = [];
  for (let i = 0; i < segment.length; i += DECAY_SUBFRAME_SIZE) {
    const sub = segment.subarray(i, Math.min(segment.length, i + DECAY_SUBFRAME_SIZE));
    let sumSquares = 0;
    for (let j = 0; j < sub.length; j++) sumSquares += sub[j] * sub[j];
    rmsSeries.push(Math.sqrt(sumSquares / sub.length));
  }
  let bumps = 0;
  for (let i = 1; i < rmsSeries.length; i++) {
    if (rmsSeries[i] > rmsSeries[i - 1] * 1.15) bumps++;
  }
  const decayScore = rmsSeries.length > 1 ? Math.max(0, 1 - bumps / (rmsSeries.length - 1)) : 1;

  // Zero-crossing rate over the whole segment.
  let zeroCrossings = 0;
  for (let i = 1; i < segment.length; i++) {
    if (segment[i - 1] >= 0 !== segment[i] >= 0) zeroCrossings++;
  }
  const zeroCrossingRate = zeroCrossings / segment.length;

  let sumSquares = 0;
  for (let i = 0; i < segment.length; i++) sumSquares += segment[i] * segment[i];
  const rms = Math.sqrt(sumSquares / segment.length);

  // Spectral features from a single FFT frame covering the window
  // (zero-padded if the note's post-attack portion is shorter).
  const frame = new Float32Array(ANALYSIS_FFT_SIZE);
  frame.set(segment.subarray(0, Math.min(segment.length, ANALYSIS_FFT_SIZE)));
  const hann = createHannWindow(ANALYSIS_FFT_SIZE);
  const realScratch = new Float32Array(ANALYSIS_FFT_SIZE);
  const imagScratch = new Float32Array(ANALYSIS_FFT_SIZE);
  const magnitudes = magnitudeSpectrum(frame, hann, realScratch, imagScratch);

  let totalEnergy = 0;
  let highFrequencyEnergy = 0;
  let logSum = 0;
  let linearSum = 0;
  let bandBinCount = 0;
  const eps = 1e-9;

  for (let bin = 1; bin < magnitudes.length; bin++) {
    const frequency = (bin * sampleRate) / ANALYSIS_FFT_SIZE;
    if (frequency < SPECTRAL_ANALYSIS_MIN_HZ || frequency > SPECTRAL_ANALYSIS_MAX_HZ) continue;
    const energy = magnitudes[bin] * magnitudes[bin];
    totalEnergy += energy;
    if (frequency >= HIGH_FREQUENCY_THRESHOLD_HZ) highFrequencyEnergy += energy;
    logSum += Math.log(magnitudes[bin] + eps);
    linearSum += magnitudes[bin] + eps;
    bandBinCount++;
  }

  const highFrequencyEnergyRatio = totalEnergy > 0 ? highFrequencyEnergy / totalEnergy : 0;
  const geometricMean = bandBinCount > 0 ? Math.exp(logSum / bandBinCount) : 0;
  const arithmeticMean = bandBinCount > 0 ? linearSum / bandBinCount : 0;
  const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

  let harmonicEnergy = 0;
  if (fundamentalHz > 0) {
    for (let h = 1; h <= HARMONIC_COUNT; h++) {
      const targetFrequency = fundamentalHz * h;
      if (targetFrequency > SPECTRAL_ANALYSIS_MAX_HZ) break;
      const targetBin = Math.round((targetFrequency * ANALYSIS_FFT_SIZE) / sampleRate);
      const tolBins = Math.max(1, Math.round((targetFrequency * HARMONIC_TOLERANCE_RATIO * ANALYSIS_FFT_SIZE) / sampleRate));
      for (let bin = Math.max(0, targetBin - tolBins); bin <= Math.min(magnitudes.length - 1, targetBin + tolBins); bin++) {
        harmonicEnergy += magnitudes[bin] * magnitudes[bin];
      }
    }
  }
  const harmonicity = totalEnergy > 0 ? Math.max(0, Math.min(1, harmonicEnergy / totalEnergy)) : 0;

  return {
    highFrequencyEnergyRatio,
    spectralFlatness,
    zeroCrossingRate,
    harmonicity,
    decayScore,
    rms,
    analysedDurationSeconds: windowEnd - windowStart,
  };
}

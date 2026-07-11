import { frequencyToMidi } from "@/lib/analysis/pitch/noteTheory";

/** Ignore content outside this range when building chroma: below is
 * mostly room rumble/handling noise, above is dominated by inharmonic
 * pick/fret noise rather than pitch content useful for chord identity. */
const CHROMA_MIN_HZ = 60;
const CHROMA_MAX_HZ = 5000;

/**
 * Folds an FFT magnitude spectrum into a 12-bin chroma (pitch-class
 * profile): each bin's energy is assigned to the pitch class of its
 * nearest equal-tempered note, octave-independent. This intentionally
 * also captures harmonics (a plucked string's overtones), which is
 * standard practice for chroma/HPCP features and reinforces chord tones
 * rather than confusing them, since low-order harmonics of a note fall on
 * consonant scale degrees.
 */
export function computeChromaVector(magnitudes: Float32Array, sampleRate: number, fftSize: number): number[] {
  const chroma = new Array(12).fill(0);

  for (let bin = 1; bin < magnitudes.length; bin++) {
    const frequency = (bin * sampleRate) / fftSize;
    if (frequency < CHROMA_MIN_HZ || frequency > CHROMA_MAX_HZ) continue;
    const midi = frequencyToMidi(frequency);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pitchClass] += magnitudes[bin] * magnitudes[bin]; // energy, not raw magnitude
  }

  const total = chroma.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return chroma;
  return chroma.map((v) => v / total);
}

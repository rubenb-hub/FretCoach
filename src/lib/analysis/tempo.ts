import type { OnsetEvidence, TempoEstimate } from "@/lib/types";

const MIN_BPM = 50;
const MAX_BPM = 200;
const BPM_STEP = 1;
const MIN_ONSETS_FOR_TEMPO = 8;

/**
 * Estimates a single tempo (in BPM) from onset timestamps by scoring
 * candidate beat periods against the observed inter-onset intervals: for
 * each candidate period, IOIs that land close to an integer multiple of
 * that period contribute score, weighted by their onset confidence and by
 * how tightly they cluster (a soft Gaussian tolerance). This tolerates
 * syncopation and subdivisions without assuming every note is on the beat.
 */
export function estimateTempo(onsets: OnsetEvidence[]): TempoEstimate {
  if (onsets.length < MIN_ONSETS_FOR_TEMPO) {
    return { bpm: null, confidence: 0 };
  }

  const iois: { interval: number; weight: number }[] = [];
  for (let i = 1; i < onsets.length; i++) {
    const interval = onsets[i].timeSeconds - onsets[i - 1].timeSeconds;
    if (interval > 0.08 && interval < 4) {
      iois.push({ interval, weight: (onsets[i].confidence + onsets[i - 1].confidence) / 2 + 0.1 });
    }
  }
  if (iois.length < MIN_ONSETS_FOR_TEMPO - 1) {
    return { bpm: null, confidence: 0 };
  }

  const candidateScores: { bpm: number; score: number }[] = [];
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += BPM_STEP) {
    const period = 60 / bpm;
    let score = 0;
    for (const { interval, weight } of iois) {
      for (let multiple = 1; multiple <= 4; multiple++) {
        const target = period * multiple;
        const deviation = Math.abs(interval - target) / target;
        // Soft Gaussian-like tolerance: within ~8% of a beat multiple
        // contributes strongly, falling off smoothly beyond that.
        const match = Math.exp(-(deviation * deviation) / (2 * 0.08 * 0.08));
        score += (match * weight) / multiple; // favour matching the fundamental over higher multiples
      }
    }
    candidateScores.push({ bpm, score });
  }

  candidateScores.sort((a, b) => b.score - a.score);
  const best = candidateScores[0];
  const totalWeight = iois.reduce((sum, i) => sum + i.weight, 0);
  const confidence = totalWeight > 0 ? Math.max(0, Math.min(1, best.score / (totalWeight * 1.2))) : 0;

  // Find well-scoring alternates that are roughly half or double the best
  // guess, a classic tempo-octave ambiguity.
  const alternates = candidateScores
    .filter((c) => c.bpm !== best.bpm && c.score > best.score * 0.75)
    .filter((c) => Math.abs(c.bpm / best.bpm - 2) < 0.1 || Math.abs(c.bpm / best.bpm - 0.5) < 0.1)
    .slice(0, 2)
    .map((c) => c.bpm);

  return {
    bpm: best.bpm,
    confidence,
    alternateBpm: alternates.length > 0 ? alternates : undefined,
  };
}

export const TEMPO_CONFIDENCE_THRESHOLD = 0.35;

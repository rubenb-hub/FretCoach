import type { NoteDetection, FretBuzzDetection, AnalysisEvent } from "@/lib/types";
import { computePostAttackFeatures, type PostAttackFeatures } from "./postAttackFeatures";

/**
 * Conservative, experimental possible-fret-buzz heuristic. This is NOT a
 * machine-learned classifier — it's a documented, tunable combination of
 * spectral/decay features computed on the post-attack portion of each
 * detected note (see postAttackFeatures.ts). It is deliberately biased
 * toward under-reporting: a normal pick attack, a clean bright tone, an
 * intentional slide, or palm-muted playing should not trigger this, and
 * every detection is labelled "possible" and carries a confidence score.
 *
 * Thresholds are configuration, not hard-coded magic numbers, precisely
 * so they can be tuned as real-world feedback comes in (see
 * LocalFeedbackRepository) without changing the detection logic itself.
 */
export interface FretBuzzThresholds {
  /** Minimum high-frequency energy ratio required before buzz is even considered. */
  minHighFrequencyEnergyRatio: number;
  /** Spectral flatness above this looks noise-like rather than tonal. */
  flatnessConcernThreshold: number;
  /** Harmonicity below this suggests inharmonic/noisy content. */
  harmonicityConcernThreshold: number;
  /** Decay smoothness below this suggests a bumpy, re-energised decay. */
  decayConcernThreshold: number;
  /** Combined weighted score required before reporting a detection at all. */
  minConfidenceToReport: number;
}

export const DEFAULT_FRET_BUZZ_THRESHOLDS: FretBuzzThresholds = {
  minHighFrequencyEnergyRatio: 0.12,
  flatnessConcernThreshold: 0.25,
  harmonicityConcernThreshold: 0.45,
  decayConcernThreshold: 0.6,
  minConfidenceToReport: 0.55,
};

function scoreFeatures(features: PostAttackFeatures, thresholds: FretBuzzThresholds): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const hfExcess = Math.max(0, features.highFrequencyEnergyRatio - thresholds.minHighFrequencyEnergyRatio);
  score += Math.min(1, hfExcess / 0.25) * 0.35;
  if (features.highFrequencyEnergyRatio > thresholds.minHighFrequencyEnergyRatio) {
    reasons.push("Elevated high-frequency energy continued after the attack.");
  }

  if (features.spectralFlatness > thresholds.flatnessConcernThreshold) {
    score += Math.min(1, (features.spectralFlatness - thresholds.flatnessConcernThreshold) / 0.3) * 0.25;
    reasons.push("The post-attack spectrum looked noise-like rather than tonal.");
  }

  if (features.harmonicity < thresholds.harmonicityConcernThreshold) {
    score += Math.min(1, (thresholds.harmonicityConcernThreshold - features.harmonicity) / 0.45) * 0.25;
    reasons.push("Weak harmonic structure detected after the note started.");
  }

  if (features.decayScore < thresholds.decayConcernThreshold) {
    score += Math.min(1, (thresholds.decayConcernThreshold - features.decayScore) / 0.6) * 0.15;
    reasons.push("The note's decay had one or more irregular bursts rather than a smooth fade.");
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

/**
 * Runs the possible-fret-buzz heuristic over a set of detected notes.
 * Requires BOTH a minimum high-frequency energy ratio (the core buzz
 * signature) AND the combined weighted score to clear the confidence
 * threshold — a single elevated feature alone (e.g. a naturally bright
 * clean tone) should not be enough on its own.
 */
export function detectPossibleFretBuzz(
  notes: NoteDetection[],
  samples: Float32Array,
  sampleRate: number,
  thresholds: Partial<FretBuzzThresholds> = {}
): { detections: FretBuzzDetection[]; events: AnalysisEvent[] } {
  const opts = { ...DEFAULT_FRET_BUZZ_THRESHOLDS, ...thresholds };
  const detections: FretBuzzDetection[] = [];
  const events: AnalysisEvent[] = [];

  for (const note of notes) {
    const features = computePostAttackFeatures(samples, sampleRate, note.startTime, note.endTime, note.frequencyHz);
    if (!features) continue;
    if (features.highFrequencyEnergyRatio < opts.minHighFrequencyEnergyRatio) continue;

    const { score, reasons } = scoreFeatures(features, opts);
    if (score < opts.minConfidenceToReport) continue;

    detections.push({
      startTime: note.startTime,
      endTime: note.endTime,
      confidence: score,
      reasons,
      features: {
        highFrequencyEnergyRatio: features.highFrequencyEnergyRatio,
        spectralFlatness: features.spectralFlatness,
        zeroCrossingRate: features.zeroCrossingRate,
        harmonicity: features.harmonicity,
        decayScore: features.decayScore,
      },
    });

    events.push({
      id: `${note.id}-buzz`,
      startTime: note.startTime,
      endTime: note.endTime,
      category: "possible_fret_buzz",
      confidence: score,
      metadata: {
        noteId: note.id,
        noteName: `${note.noteName}${note.octave}`,
        reasons,
        highFrequencyEnergyRatio: features.highFrequencyEnergyRatio,
        spectralFlatness: features.spectralFlatness,
        harmonicity: features.harmonicity,
        decayScore: features.decayScore,
      },
    });
  }

  return { detections, events };
}

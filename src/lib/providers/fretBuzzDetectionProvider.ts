import type { NoteDetection, FretBuzzDetection, AnalysisEvent } from "@/lib/types";
import { detectPossibleFretBuzz, type FretBuzzThresholds } from "@/lib/analysis/fretBuzz/fretBuzzHeuristic";

export interface FretBuzzDetectionResult {
  detections: FretBuzzDetection[];
  events: AnalysisEvent[];
}

/**
 * Provider interface for the experimental possible-fret-buzz heuristic,
 * replaceable later with a model trained on real user feedback (see
 * LocalFeedbackRepository) without touching the rest of the pipeline.
 */
export interface FretBuzzDetectionProvider {
  detect(
    notes: NoteDetection[],
    samples: Float32Array,
    sampleRate: number,
    thresholds?: Partial<FretBuzzThresholds>
  ): FretBuzzDetectionResult;
}

export class LocalFretBuzzDetectionProvider implements FretBuzzDetectionProvider {
  detect(
    notes: NoteDetection[],
    samples: Float32Array,
    sampleRate: number,
    thresholds?: Partial<FretBuzzThresholds>
  ): FretBuzzDetectionResult {
    return detectPossibleFretBuzz(notes, samples, sampleRate, thresholds);
  }
}

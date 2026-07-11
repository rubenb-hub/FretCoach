import type { NoteDetection, AnalysisEvent } from "@/lib/types";
import { detectNoteClarityIssues, type NoteClarityThresholds } from "@/lib/analysis/noteClarity/noteClarityHeuristic";

/** Provider interface for note-clarity / possible-muted-string heuristics. */
export interface NoteClarityProvider {
  detect(
    notes: NoteDetection[],
    samples: Float32Array,
    sampleRate: number,
    thresholds?: Partial<NoteClarityThresholds>
  ): AnalysisEvent[];
}

export class LocalNoteClarityProvider implements NoteClarityProvider {
  detect(
    notes: NoteDetection[],
    samples: Float32Array,
    sampleRate: number,
    thresholds?: Partial<NoteClarityThresholds>
  ): AnalysisEvent[] {
    return detectNoteClarityIssues(notes, samples, sampleRate, thresholds);
  }
}

import type { NoteDetection, AnalysisEvent } from "@/lib/types";
import { computePostAttackFeatures } from "@/lib/analysis/fretBuzz/postAttackFeatures";

/**
 * Conservative note-clarity / possible-muted-string heuristics. Like the
 * fret-buzz detector, this never claims to know which finger, fret, or
 * string was involved — it only reports measurable weakness in a note's
 * attack, sustain, or harmonic content. See product wording rules: use
 * "sounded less clear" / "may have been partially muted", never a
 * definitive claim.
 */
export interface NoteClarityThresholds {
  /** Notes shorter than this are flagged as having low sustain. */
  shortNoteDurationSeconds: number;
  /** YIN confidence below this suggests an unstable/noisy pitch track through the note. */
  unstablePitchConfidence: number;
  /** Harmonicity below this suggests a weak/muted harmonic structure. */
  weakHarmonicityThreshold: number;
  /** Pitch stability below this suggests the note wavered rather than held steady. */
  lowPitchStabilityThreshold: number;
}

export const DEFAULT_NOTE_CLARITY_THRESHOLDS: NoteClarityThresholds = {
  shortNoteDurationSeconds: 0.09,
  unstablePitchConfidence: 0.55,
  weakHarmonicityThreshold: 0.3,
  lowPitchStabilityThreshold: 0.4,
};

/**
 * Evaluates each detected note for clarity concerns. A single note can
 * produce at most one clarity event (the strongest applicable reason),
 * to avoid stacking multiple near-duplicate warnings on the same note.
 */
export function detectNoteClarityIssues(
  notes: NoteDetection[],
  samples: Float32Array,
  sampleRate: number,
  thresholds: Partial<NoteClarityThresholds> = {}
): AnalysisEvent[] {
  const opts = { ...DEFAULT_NOTE_CLARITY_THRESHOLDS, ...thresholds };
  const events: AnalysisEvent[] = [];

  for (const note of notes) {
    const duration = note.endTime - note.startTime;
    const features = computePostAttackFeatures(samples, sampleRate, note.startTime, note.endTime, note.frequencyHz);

    const reasons: string[] = [];
    let category: "unclear_attack" | "muted_note" | null = null;
    let confidence = 0;

    const lowStability = (note.pitchStability ?? 1) < opts.lowPitchStabilityThreshold;
    const unstableConfidence = note.confidence < opts.unstablePitchConfidence;
    const short = duration < opts.shortNoteDurationSeconds;
    const weakHarmonics = (features?.harmonicity ?? 1) < opts.weakHarmonicityThreshold;

    if (weakHarmonics) {
      category = "muted_note";
      reasons.push("A weak or short harmonic structure was detected — a string may have been partially muted.");
      confidence = 1 - (features?.harmonicity ?? 0) / opts.weakHarmonicityThreshold;
    } else if (short || unstableConfidence || lowStability) {
      category = "unclear_attack";
      if (short) reasons.push("This note's attack was very brief.");
      if (unstableConfidence) reasons.push("The pitch track was unstable during this note.");
      if (lowStability) reasons.push("Pitch wavered rather than holding steady.");
      confidence = Math.max(
        short ? 0.5 : 0,
        unstableConfidence ? 1 - note.confidence : 0,
        lowStability ? 1 - (note.pitchStability ?? 1) : 0
      );
    }

    if (!category) continue;
    confidence = Math.max(0.3, Math.min(1, confidence));

    events.push({
      id: `${note.id}-clarity`,
      startTime: note.startTime,
      endTime: note.endTime,
      category,
      confidence,
      metadata: {
        noteId: note.id,
        noteName: `${note.noteName}${note.octave}`,
        reasons,
        durationSeconds: duration,
        pitchStability: note.pitchStability,
        harmonicity: features?.harmonicity,
      },
    });
  }

  return events;
}

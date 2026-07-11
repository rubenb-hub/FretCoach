import type { AnalysisEvent, ChordDetection, NoteDetection, PracticeAnalysis } from "@/lib/types";

/**
 * Note: `string_noise` is a defined AnalysisEventCategory (see
 * lib/types/musicAnalysis.ts) but has no dedicated detector yet — there is
 * currently no code path that emits it. It's reserved for a future
 * detector rather than removed, so the aggregator/UI already know how to
 * handle it once one exists. Do not treat its absence from this file as a
 * bug; it is a deliberately unimplemented placeholder.
 */

const LOW_PITCH_STABILITY_THRESHOLD = 0.45;
const CHORD_TRANSITION_MIN_GAP_SECONDS = 0.15;
const CHORD_TRANSITION_MAX_GAP_SECONDS = 2;

/** Sustained pitch wobble within an otherwise-detected note — distinct
 * from note-clarity's attack/mute concerns, this is about the note not
 * holding steady once it speaks. */
export function derivePitchInstabilityEvents(notes: NoteDetection[]): AnalysisEvent[] {
  return notes
    .filter((note) => (note.pitchStability ?? 1) < LOW_PITCH_STABILITY_THRESHOLD)
    .map((note) => ({
      id: `${note.id}-instability`,
      startTime: note.startTime,
      endTime: note.endTime,
      category: "pitch_instability" as const,
      confidence: Math.max(0.3, Math.min(1, 1 - (note.pitchStability ?? 0))),
      metadata: {
        noteId: note.id,
        noteName: `${note.noteName}${note.octave}`,
        pitchStability: note.pitchStability,
      },
    }));
}

/** Reuses the existing timing-consistency analysis's weakest segment
 * (see lib/analysis/timing.ts) rather than re-deriving timing from
 * scratch — the original pipeline already does this measurement. */
export function deriveTimingInconsistencyEvents(analysis: PracticeAnalysis | null): AnalysisEvent[] {
  if (!analysis?.timing.weakestSegment || analysis.timing.score === null) return [];
  const { weakestSegment, score, confidence } = analysis.timing;
  if (score >= 65) return []; // already "consistent" or better; not worth flagging
  return [
    {
      id: "timing-weakest-segment",
      startTime: weakestSegment.startSeconds,
      endTime: weakestSegment.endSeconds,
      category: "timing_inconsistency",
      confidence,
      metadata: { timingScore: score },
    },
  ];
}

/** A gap between two confidently-detected chord regions — long enough to
 * suggest a fumbled change, short enough that it isn't just a rest/pause
 * — is flagged as a possible rough chord transition. Conservative: exact
 * gap-length heuristics, not fingering analysis. */
export function deriveChordTransitionEvents(chords: ChordDetection[]): AnalysisEvent[] {
  const events: AnalysisEvent[] = [];
  for (let i = 1; i < chords.length; i++) {
    const prev = chords[i - 1];
    const next = chords[i];
    const gap = next.startTime - prev.endTime;
    if (gap >= CHORD_TRANSITION_MIN_GAP_SECONDS && gap <= CHORD_TRANSITION_MAX_GAP_SECONDS) {
      const confidence = Math.max(0.3, Math.min(0.9, gap / CHORD_TRANSITION_MAX_GAP_SECONDS));
      events.push({
        id: `chord-transition-${prev.id}-${next.id}`,
        startTime: prev.endTime,
        endTime: next.startTime,
        category: "chord_transition",
        confidence,
        metadata: { fromChord: prev.primary.name, toChord: next.primary.name, gapSeconds: gap },
      });
    }
  }
  return events;
}

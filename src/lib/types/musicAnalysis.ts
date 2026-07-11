/**
 * Domain types for the note/chord/issue-level analysis pipeline
 * (src/lib/analysis/pitch, /chords, /fretBuzz, /noteClarity, /issues).
 *
 * These are deliberately separate from the original timing/dynamics
 * `PracticeAnalysis` (lib/types/analysis.ts) rather than bolted onto it:
 * they come from different detectors, evolve independently, and are
 * optional on a session (older sessions simply won't have them). See
 * docs/audio-analysis-architecture.md for how everything fits together.
 *
 * Every detection type below carries a `confidence` (0-1). Nothing here
 * should ever be presented to the user as certain — the UI layer is
 * responsible for translating confidence into hedged language ("likely",
 * "possible") rather than displaying raw numbers as the primary copy.
 */

/** A single detected monophonic note event (see docs: monophonic pitch detection only). */
export interface NoteDetection {
  id: string;
  startTime: number;
  endTime: number;
  frequencyHz: number;
  midiNote: number;
  noteName: string;
  octave: number;
  /** Cents sharp (+) or flat (-) relative to the nearest equal-tempered pitch. */
  centsOffset: number;
  confidence: number;
  rms: number;
  /** 0-1, higher = steadier pitch across the note's duration. */
  pitchStability?: number;
}

export interface ChordCandidate {
  /** e.g. "A minor", "E7", "D sus4" */
  name: string;
  confidence: number;
  /** 12-length pitch-class energy vector (chroma), for debugging/dev mode. */
  pitchClasses: number[];
}

export interface ChordDetection {
  id: string;
  startTime: number;
  endTime: number;
  primary: ChordCandidate;
  alternatives: ChordCandidate[];
}

/** A single analysis frame's extracted features, used by the note/chord/buzz/clarity detectors. */
export interface AudioFeatureFrame {
  timestamp: number;
  duration: number;
  rms: number;
  zeroCrossingRate?: number;
  spectralCentroid?: number;
  spectralFlatness?: number;
  highFrequencyEnergyRatio?: number;
  harmonicity?: number;
  transientStrength?: number;
}

export type AnalysisEventCategory =
  | "note"
  | "chord"
  | "pitch_instability"
  | "timing_inconsistency"
  | "possible_fret_buzz"
  | "unclear_attack"
  | "muted_note"
  | "string_noise"
  | "chord_transition";

/** A raw, frame-level detection. Multiple AnalysisEvents get merged by the
 * IssueAggregator into a smaller number of user-facing PracticeIssues. */
export interface AnalysisEvent {
  id: string;
  startTime: number;
  endTime: number;
  category: AnalysisEventCategory;
  confidence: number;
  metadata: Record<string, unknown>;
}

export type PracticeIssueCategory =
  | "fret_buzz"
  | "timing"
  | "pitch"
  | "note_clarity"
  | "chord_transition"
  | "string_noise";

export type IssueSeverity = "low" | "medium" | "high";

/** A user-facing, aggregated coaching section. `playbackStartTime` /
 * `playbackEndTime` include padding context around the raw detection
 * window (`startTime` / `endTime`), clamped to the recording duration. */
export interface PracticeIssue {
  id: string;
  startTime: number;
  endTime: number;
  playbackStartTime: number;
  playbackEndTime: number;
  category: PracticeIssueCategory;
  severity: IssueSeverity;
  confidence: number;
  title: string;
  explanation: string;
  tips: string[];
  contributingEventIds: string[];
}

export type FeedbackResponse = "correct" | "incorrect" | "unsure";

/** User feedback on a specific detection/issue, stored locally only
 * (see LocalFeedbackRepository). Never uploaded in this version. */
export interface UserDetectionFeedback {
  issueId: string;
  response: FeedbackResponse;
  createdAt: string;
}

export interface FretBuzzFeatures {
  highFrequencyEnergyRatio?: number;
  spectralFlatness?: number;
  zeroCrossingRate?: number;
  harmonicity?: number;
  decayScore?: number;
}

export interface FretBuzzDetection {
  startTime: number;
  endTime: number;
  confidence: number;
  reasons: string[];
  features: FretBuzzFeatures;
}

/** The combined output of the note/chord/buzz/clarity pipeline for one
 * recording. Optional on a PracticeSession — analysing for this is a
 * separate, heavier pass from the original timing/dynamics analysis and
 * a session can exist without it (e.g. before this feature existed, or if
 * the recording exceeds the analysis duration cap). */
export interface MusicAnalysisResult {
  notes: NoteDetection[];
  chords: ChordDetection[];
  events: AnalysisEvent[];
  issues: PracticeIssue[];
  fretBuzz: FretBuzzDetection[];
  /** True if the recording was too long and only a leading portion was analysed. */
  truncated: boolean;
  analysedDurationSeconds: number;
  processingTimeMs: number;
}

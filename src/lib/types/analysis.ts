/**
 * Types describing the output of the local audio-analysis engine.
 *
 * These types intentionally avoid any claim of exact musical knowledge
 * (notes, chords, song identity). Everything here is a measurable,
 * evidence-backed observation with an attached confidence value.
 */

export interface TimeSegment {
  startSeconds: number;
  endSeconds: number;
}

/** A single piece of evidence a coaching observation can point back to. */
export interface AnalysisEvidence {
  id: string;
  label: string;
  detail: string;
  /** Optional time range in the recording this evidence relates to. */
  segment?: TimeSegment;
}

export interface AnalysedSegment extends TimeSegment {
  index: number;
  activePlayingRatio: number;
  onsetDensity: number;
  timingConsistency: number | null;
  dynamicConsistency: number;
  noiseQuality: number;
  pauseCount: number;
  averageRms: number;
  peakRms: number;
}

export interface RecordingQuality {
  /** 0-100, higher is better. */
  score: number;
  clippingDetected: boolean;
  lowInputDetected: boolean;
  highNoiseDetected: boolean;
  possibleBackingMusic: boolean;
  insufficientDuration: boolean;
  /** 0-1 */
  confidence: number;
  warnings: string[];
}

export interface TempoEstimate {
  bpm: number | null;
  /** 0-1 */
  confidence: number;
  alternateBpm?: number[];
}

export interface TimingAnalysis {
  /** 0-100, higher = more consistent. Null when confidence is too low to report. */
  score: number | null;
  /** 0-1 */
  confidence: number;
  strongestSegment?: TimeSegment;
  weakestSegment?: TimeSegment;
  driftDescription?: string;
  firstHalfScore: number | null;
  secondHalfScore: number | null;
}

export interface DynamicsAnalysis {
  /** 0-100, higher = more even attack strength. */
  score: number;
  /** 0-1 */
  confidence: number;
  /** coefficient of variation of onset peak strength */
  variation: number;
  averageAttackStrength: number;
  clippingEvents: number;
  quietSectionSeconds: number;
}

export interface PauseInfo {
  count: number;
  totalDurationSeconds: number;
  segments: TimeSegment[];
  /** Conservative approximation of repeated-attempt clusters. */
  repeatedAttemptClusters: TimeSegment[];
}

export interface OnsetEvidence {
  timeSeconds: number;
  strength: number;
  confidence: number;
}

export interface PracticeAnalysis {
  durationSeconds: number;
  activePlayingSeconds: number;
  activePlayingRatio: number;
  recordingQuality: RecordingQuality;
  tempo: TempoEstimate;
  timing: TimingAnalysis;
  dynamics: DynamicsAnalysis;
  pauses: PauseInfo;
  segments: AnalysedSegment[];
  evidence: AnalysisEvidence[];
  /** Raw onset timestamps, primarily surfaced in developer mode. */
  onsets: OnsetEvidence[];
  /** Diagnostic info surfaced only in developer mode. */
  diagnostics: {
    frameCount: number;
    frameSizeSamples: number;
    hopSizeSamples: number;
    sampleRate: number;
    noiseFloorRms: number;
    processingTimeMs: number;
  };
}

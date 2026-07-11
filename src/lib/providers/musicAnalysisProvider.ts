import type { MusicAnalysisResult, PracticeAnalysis } from "@/lib/types";
import { toMonoSamples } from "@/lib/analysis/decode";
import { truncateAudioBuffer } from "@/lib/analysis/truncateAudioBuffer";
import {
  derivePitchInstabilityEvents,
  deriveTimingInconsistencyEvents,
  deriveChordTransitionEvents,
} from "@/lib/analysis/issues/deriveEvents";
import { aggregateIssues } from "@/lib/analysis/issues/issueAggregator";
import { LocalPitchDetectionProvider, type PitchDetectionProvider } from "./pitchDetectionProvider";
import { LocalChordDetectionProvider, type ChordDetectionProvider } from "./chordDetectionProvider";
import { LocalFretBuzzDetectionProvider, type FretBuzzDetectionProvider } from "./fretBuzzDetectionProvider";
import { LocalNoteClarityProvider, type NoteClarityProvider } from "./noteClarityProvider";

export type MusicAnalysisStage = "detecting-notes" | "detecting-chords" | "detecting-technique" | "aggregating-issues";

/** A recording longer than this only has its leading portion analysed
 * for notes/chords/technique (the original timing/dynamics analysis and
 * full audio playback are unaffected) — see FEATURE 17. */
export const MAX_MUSIC_ANALYSIS_SECONDS = 180;

export interface MusicAnalysisProviders {
  pitch: PitchDetectionProvider;
  chords: ChordDetectionProvider;
  fretBuzz: FretBuzzDetectionProvider;
  noteClarity: NoteClarityProvider;
}

export interface MusicAnalysisOptions {
  maxAnalysisSeconds?: number;
  onStage?: (stage: MusicAnalysisStage) => void;
  providers?: Partial<MusicAnalysisProviders>;
}

/**
 * Orchestrates the note/chord/technique pipeline (Phases B-D) into one
 * MusicAnalysisResult, reusing the already-computed timing/dynamics
 * PracticeAnalysis for the timing_inconsistency signal rather than
 * re-deriving it. Each detector stays independently swappable via the
 * `providers` option — nothing here is hard-wired to one implementation.
 */
export async function analyzeMusicSession(
  audioBuffer: AudioBuffer,
  existingAnalysis: PracticeAnalysis | null,
  options: MusicAnalysisOptions = {}
): Promise<MusicAnalysisResult> {
  const startTime = performance.now();
  const maxAnalysisSeconds = options.maxAnalysisSeconds ?? MAX_MUSIC_ANALYSIS_SECONDS;
  const { buffer, truncated } = truncateAudioBuffer(audioBuffer, maxAnalysisSeconds);

  const pitchProvider = options.providers?.pitch ?? new LocalPitchDetectionProvider();
  const chordProvider = options.providers?.chords ?? new LocalChordDetectionProvider();
  const fretBuzzProvider = options.providers?.fretBuzz ?? new LocalFretBuzzDetectionProvider();
  const noteClarityProvider = options.providers?.noteClarity ?? new LocalNoteClarityProvider();

  options.onStage?.("detecting-notes");
  const notes = await pitchProvider.detectNotes(buffer);

  options.onStage?.("detecting-chords");
  const chords = await chordProvider.detectChords(buffer);

  options.onStage?.("detecting-technique");
  const samples = toMonoSamples(buffer);
  const { detections: fretBuzz, events: buzzEvents } = fretBuzzProvider.detect(notes, samples, buffer.sampleRate);
  const clarityEvents = noteClarityProvider.detect(notes, samples, buffer.sampleRate);
  const pitchInstabilityEvents = derivePitchInstabilityEvents(notes);
  const timingEvents = deriveTimingInconsistencyEvents(existingAnalysis);
  const chordTransitionEvents = deriveChordTransitionEvents(chords);

  options.onStage?.("aggregating-issues");
  const events = [...buzzEvents, ...clarityEvents, ...pitchInstabilityEvents, ...timingEvents, ...chordTransitionEvents];
  const issues = aggregateIssues(events, buffer.duration);

  return {
    notes,
    chords,
    events,
    issues,
    fretBuzz,
    truncated,
    analysedDurationSeconds: buffer.duration,
    processingTimeMs: performance.now() - startTime,
  };
}

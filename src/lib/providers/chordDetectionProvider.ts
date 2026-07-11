import type { ChordDetection } from "@/lib/types";
import { toMonoSamples } from "@/lib/analysis/decode";
import { trackChords, type ChordTrackOptions } from "@/lib/analysis/chords/chordTrack";
import { smoothAndMergeChords, type ChordSmoothingOptions } from "@/lib/analysis/chords/chordSmoothing";

export interface ChordDetectionOptions extends ChordTrackOptions, Partial<ChordSmoothingOptions> {}

/**
 * Provider interface for chord estimation, kept separate from note/pitch
 * detection and replaceable with a future specialist model without
 * touching the rest of the analysis pipeline.
 *
 * See docs/audio-analysis-architecture.md for documented limitations:
 * this conservative template-matching approach is measurably less
 * reliable with distortion/heavy effects, room noise, incomplete
 * voicings, alternate tunings, capo use, fast arpeggios, backing music,
 * and phone-microphone compression.
 */
export interface ChordDetectionProvider {
  detectChords(audioBuffer: AudioBuffer, options?: ChordDetectionOptions): Promise<ChordDetection[]>;
}

/** Real chroma/template-matching chord estimation — see lib/analysis/chords/. */
export class LocalChordDetectionProvider implements ChordDetectionProvider {
  async detectChords(audioBuffer: AudioBuffer, options: ChordDetectionOptions = {}): Promise<ChordDetection[]> {
    const samples = toMonoSamples(audioBuffer);
    const windows = await trackChords(samples, audioBuffer.sampleRate, options);
    return smoothAndMergeChords(windows, options);
  }
}

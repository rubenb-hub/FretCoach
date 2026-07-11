import type { NoteDetection } from "@/lib/types";
import { toMonoSamples } from "@/lib/analysis/decode";
import { trackPitch, PITCH_HOP_SIZE, type PitchTrackOptions } from "@/lib/analysis/pitch/pitchTrack";
import { mergePitchFramesToNotes, type NoteMergingOptions } from "@/lib/analysis/pitch/noteMerging";

export interface PitchDetectionOptions extends PitchTrackOptions, Partial<Omit<NoteMergingOptions, "frameDurationSeconds">> {}

/**
 * Provider interface for monophonic note detection, kept separate from
 * chord/fret-buzz/note-clarity detection so any of them can be swapped for
 * a specialist model later without touching the others (see
 * lib/providers/musicTranscriptionProvider.ts for the longer-term
 * polyphonic-transcription placeholder this is a practical first step
 * toward).
 */
export interface PitchDetectionProvider {
  detectNotes(audioBuffer: AudioBuffer, options?: PitchDetectionOptions): Promise<NoteDetection[]>;
}

/** Real YIN-based monophonic pitch detection — see lib/analysis/pitch/. */
export class LocalPitchDetectionProvider implements PitchDetectionProvider {
  async detectNotes(audioBuffer: AudioBuffer, options: PitchDetectionOptions = {}): Promise<NoteDetection[]> {
    const samples = toMonoSamples(audioBuffer);
    const frames = await trackPitch(samples, audioBuffer.sampleRate, options);
    const frameDurationSeconds = PITCH_HOP_SIZE / audioBuffer.sampleRate;
    return mergePitchFramesToNotes(frames, frameDurationSeconds, options);
  }
}

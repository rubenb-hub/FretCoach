/**
 * Interface for a future specialist music-transcription model (e.g. a
 * server-side Basic Pitch pipeline, or an on-device Core ML / TensorFlow
 * model). Not implemented in this version — FretCoach never claims to
 * know exact notes, chords, or fret positions unless a real model
 * genuinely produced that result.
 */
export interface NoteEvent {
  startSeconds: number;
  durationSeconds: number;
  /** MIDI note number, when a real transcription model provides one. */
  midiNote: number;
  confidence: number;
}

export interface MusicTranscriptionResult {
  notes: NoteEvent[];
  confidence: number;
  providerName: string;
}

export interface MusicTranscriptionProvider {
  transcribe(audio: Blob): Promise<MusicTranscriptionResult>;
}

/**
 * Placeholder that makes the disabled state explicit rather than silently
 * returning empty/fake data. Throwing here (instead of returning a fake
 * empty result) prevents any caller from accidentally treating "not
 * implemented" as "detected zero notes".
 */
export class DisabledMusicTranscriptionProvider implements MusicTranscriptionProvider {
  async transcribe(): Promise<MusicTranscriptionResult> {
    throw new Error(
      "Music transcription is not available in this version of FretCoach. This is a placeholder for a future specialist model (e.g. Basic Pitch or a Core ML/TensorFlow model)."
    );
  }
}

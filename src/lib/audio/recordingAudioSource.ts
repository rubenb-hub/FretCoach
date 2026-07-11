import { decodeAudioBlob, AudioDecodeError } from "@/lib/analysis/decode";

/**
 * Preserves everything downstream features (segment playback, timeline,
 * note/chord/issue analysis) need from a single recorded Blob, decoded
 * exactly once and cached for the lifetime of the source. This is what
 * Feature 1 ("recording preservation") and Feature 2 ("segment playback")
 * both build on — neither the object URL nor the decoded AudioBuffer are
 * thrown away after the first analysis pass.
 *
 * Callers must call `dispose()` when finished (component unmount, session
 * deleted, or a new recording replaces this one) to revoke the object URL
 * and release the decoded buffer.
 */
export class RecordingAudioSource {
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly createdAt: number;

  private disposed = false;
  private decodePromise: Promise<AudioBuffer> | null = null;
  private decodedBuffer: AudioBuffer | null = null;

  constructor(blob: Blob, createdAt: number = Date.now()) {
    this.blob = blob;
    this.objectUrl = URL.createObjectURL(blob);
    this.createdAt = createdAt;
  }

  /** Decodes on first call and caches the result; safe to call repeatedly/concurrently. */
  async getAudioBuffer(): Promise<AudioBuffer> {
    if (this.disposed) {
      throw new AudioDecodeError("This recording's audio source has already been released.");
    }
    if (this.decodedBuffer) return this.decodedBuffer;
    if (!this.decodePromise) {
      this.decodePromise = decodeAudioBlob(this.blob).then((buffer) => {
        this.decodedBuffer = buffer;
        return buffer;
      });
    }
    return this.decodePromise;
  }

  /** Synchronous accessor for when the buffer is already known to be decoded. */
  get cachedAudioBuffer(): AudioBuffer | null {
    return this.decodedBuffer;
  }

  get durationSeconds(): number | null {
    return this.decodedBuffer?.duration ?? null;
  }

  get sampleRate(): number | null {
    return this.decodedBuffer?.sampleRate ?? null;
  }

  get numberOfChannels(): number | null {
    return this.decodedBuffer?.numberOfChannels ?? null;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    URL.revokeObjectURL(this.objectUrl);
    this.decodedBuffer = null;
    this.decodePromise = null;
  }
}

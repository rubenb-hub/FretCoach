import { getSupportedMimeTypes } from "@/lib/capability/browserCapabilities";
import { mapGetUserMediaError, RecordingError } from "./errors";

export interface RecordedSessionAudio {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

/**
 * Abstraction over microphone capture so the UI never touches
 * MediaRecorder/getUserMedia directly. This makes it straightforward to
 * mock in tests and keeps codec/browser quirks in one place.
 */
export interface AudioRecorderService {
  requestPermission(): Promise<void>;
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): Promise<RecordedSessionAudio>;
  cancel(): Promise<void>;
  getState(): RecorderState;
  /** Exposes the live stream so the caller can build a metering analyser. */
  getStream(): MediaStream | null;
}

export class MediaRecorderAudioService implements AudioRecorderService {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private state: RecorderState = "idle";
  private mimeType: string | null = null;

  private startedAt = 0;
  private accumulatedMs = 0;
  private pausedAt = 0;

  async requestPermission(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      throw new RecordingError(
        "This browser does not support microphone recording.",
        "unsupported-browser"
      );
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      // We only needed this to confirm permission; stop it immediately so
      // the mic indicator doesn't stay active before recording starts.
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      throw mapGetUserMediaError(error);
    }
  }

  getState(): RecorderState {
    return this.state;
  }

  getStream(): MediaStream | null {
    return this.stream;
  }

  async start(): Promise<void> {
    if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
      throw new RecordingError(
        "This browser does not support audio recording.",
        "unsupported-browser"
      );
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (error) {
      throw mapGetUserMediaError(error);
    }

    const supported = getSupportedMimeTypes();
    this.mimeType = supported[0] ?? "";

    try {
      this.recorder = this.mimeType
        ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
        : new MediaRecorder(this.stream);
    } catch {
      // Fall back to browser default if the chosen mimeType is rejected.
      this.recorder = new MediaRecorder(this.stream);
      this.mimeType = this.recorder.mimeType || "";
    }

    this.chunks = [];
    this.recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };

    this.recorder.start(250);
    this.state = "recording";
    this.startedAt = performance.now();
    this.accumulatedMs = 0;
  }

  pause(): void {
    if (this.state !== "recording" || !this.recorder) return;
    this.recorder.pause();
    this.state = "paused";
    this.pausedAt = performance.now();
    this.accumulatedMs += this.pausedAt - this.startedAt;
  }

  resume(): void {
    if (this.state !== "paused" || !this.recorder) return;
    this.recorder.resume();
    this.state = "recording";
    this.startedAt = performance.now();
  }

  async stop(): Promise<RecordedSessionAudio> {
    if (!this.recorder || this.state === "idle" || this.state === "stopped") {
      throw new RecordingError("Recording was not active.", "recording-interrupted");
    }

    const durationMs =
      this.state === "recording" ? this.accumulatedMs + (performance.now() - this.startedAt) : this.accumulatedMs;

    const recorder = this.recorder;
    const finalBlob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const mimeType = this.mimeType || recorder.mimeType || "audio/webm";
          resolve(new Blob(this.chunks, { type: mimeType }));
        } catch (error) {
          reject(error);
        }
      };
      recorder.onerror = (event) => {
        reject(
          new RecordingError("Recording was interrupted unexpectedly.", "recording-interrupted", event)
        );
      };
      recorder.stop();
    });

    this.releaseStream();
    this.state = "stopped";

    return {
      blob: finalBlob,
      mimeType: this.mimeType || finalBlob.type || "audio/webm",
      durationSeconds: durationMs / 1000,
    };
  }

  async cancel(): Promise<void> {
    if (this.recorder && (this.state === "recording" || this.state === "paused")) {
      try {
        this.recorder.stop();
      } catch {
        // ignore; we are discarding this recording anyway
      }
    }
    this.releaseStream();
    this.chunks = [];
    this.state = "idle";
  }

  private releaseStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}

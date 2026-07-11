export type RecordingErrorKind =
  | "permission-denied"
  | "no-microphone"
  | "unsupported-browser"
  | "recording-interrupted"
  | "unknown";

export class RecordingError extends Error {
  constructor(message: string, public readonly kind: RecordingErrorKind, public readonly cause?: unknown) {
    super(message);
    this.name = "RecordingError";
  }
}

/** Maps a getUserMedia rejection to a user-facing recording error. */
export function mapGetUserMediaError(error: unknown): RecordingError {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return new RecordingError(
        "Microphone access was denied. Enable microphone permission for this site in Settings and try again.",
        "permission-denied",
        error
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return new RecordingError(
        "No microphone was found on this device.",
        "no-microphone",
        error
      );
    default:
      return new RecordingError(
        "Could not access the microphone. Please check your device and try again.",
        "unknown",
        error
      );
  }
}

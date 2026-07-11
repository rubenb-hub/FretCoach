/** Central place to probe browser capabilities so the rest of the app never
 * has to guess. Every check is defensive: missing APIs return `false`
 * rather than throwing, since this runs on a range of mobile Safari
 * versions with partial support. */

export interface BrowserCapabilities {
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  hasAudioContext: boolean;
  hasIndexedDb: boolean;
  isSecureContext: boolean;
  supportedMimeTypes: string[];
  preferredMimeType: string | null;
}

/** Formats we try, in preference order. Safari (incl. iOS) only supports
 * audio/mp4; Chrome/Firefox generally support audio/webm variants. */
const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg;codecs=opus",
];

export function getSupportedMimeTypes(): string[] {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return [];
  return CANDIDATE_MIME_TYPES.filter((type) => {
    try {
      return MediaRecorder.isTypeSupported(type);
    } catch {
      return false;
    }
  });
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  const hasMediaDevices = typeof navigator !== "undefined" && !!navigator.mediaDevices;
  const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
  const hasMediaRecorder = typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";
  const AudioContextCtor =
    typeof window !== "undefined"
      ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  const hasAudioContext = !!AudioContextCtor;
  const hasIndexedDb = typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
  const isSecureContext = typeof window !== "undefined" ? window.isSecureContext : false;
  const supportedMimeTypes = getSupportedMimeTypes();

  return {
    hasMediaDevices,
    hasGetUserMedia,
    hasMediaRecorder,
    hasAudioContext,
    hasIndexedDb,
    isSecureContext,
    supportedMimeTypes,
    preferredMimeType: supportedMimeTypes[0] ?? null,
  };
}

export function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

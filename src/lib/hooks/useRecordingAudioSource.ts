"use client";

import { useEffect, useRef, useState } from "react";
import { RecordingAudioSource } from "@/lib/audio/recordingAudioSource";
import { AudioDecodeError } from "@/lib/analysis/decode";

interface UseRecordingAudioSourceResult {
  source: RecordingAudioSource | null;
  audioBuffer: AudioBuffer | null;
  decoding: boolean;
  error: string | null;
}

/**
 * Owns a RecordingAudioSource for the given Blob: creates the object URL
 * immediately, decodes the AudioBuffer once, and disposes both when the
 * Blob changes or the component unmounts. This is the shared entry point
 * for anything needing the preserved recording — playback, timeline,
 * note/chord/issue analysis — so decoding never happens more than once
 * per recording.
 */
export function useRecordingAudioSource(blob: Blob | null): UseRecordingAudioSourceResult {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<RecordingAudioSource | null>(null);
  const [source, setSource] = useState<RecordingAudioSource | null>(null);

  useEffect(() => {
    // This effect exists to synchronize with an external resource (an
    // object URL + decoded AudioBuffer that must be created/disposed in
    // lockstep with the `blob` prop) — the setState calls below are the
    // React-visible half of that synchronization, not incidental state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAudioBuffer(null);
    setError(null);
    sourceRef.current?.dispose();

    if (!blob) {
      sourceRef.current = null;
      setSource(null);
      return;
    }

    const next = new RecordingAudioSource(blob);
    sourceRef.current = next;
    setSource(next);
    setDecoding(true);

    let cancelled = false;
    next
      .getAudioBuffer()
      .then((buffer) => {
        if (!cancelled) setAudioBuffer(buffer);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof AudioDecodeError ? e.message : "This recording could not be decoded.");
        }
      })
      .finally(() => {
        if (!cancelled) setDecoding(false);
      });

    return () => {
      cancelled = true;
    };
  }, [blob]);

  // Release the object URL/decoded buffer on unmount.
  useEffect(() => {
    return () => sourceRef.current?.dispose();
  }, []);

  return { source, audioBuffer, decoding, error };
}

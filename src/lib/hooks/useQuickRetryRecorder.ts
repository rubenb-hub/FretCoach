"use client";

import { useEffect, useState } from "react";
import { MediaRecorderAudioService, type RecordedSessionAudio } from "@/lib/recording/audioRecorderService";
import { RecordingError } from "@/lib/recording/errors";

export type QuickRetryState = "idle" | "recording" | "stopped" | "error";

interface UseQuickRetryRecorderResult {
  state: QuickRetryState;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<RecordedSessionAudio | null>;
  cancel: () => Promise<void>;
}

/**
 * A minimal start/stop recorder for the "record another attempt" retry
 * flow in the practice-section panel — deliberately simpler than the
 * main recording screen's state machine (no pause/resume, no live
 * meter): a retry take is meant to be short and quick. Reuses the same
 * MediaRecorderAudioService as the main flow rather than a second
 * recording implementation.
 */
export function useQuickRetryRecorder(): UseQuickRetryRecorderResult {
  const [recorder] = useState(() => new MediaRecorderAudioService());
  const [state, setState] = useState<QuickRetryState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      void recorder.cancel();
    };
  }, [recorder]);

  const start = async () => {
    setError(null);
    try {
      await recorder.start();
      setState("recording");
    } catch (e) {
      setError(e instanceof RecordingError ? e.message : "Could not start the retry recording.");
      setState("error");
    }
  };

  const stop = async (): Promise<RecordedSessionAudio | null> => {
    try {
      const audio = await recorder.stop();
      setState("stopped");
      return audio;
    } catch (e) {
      setError(e instanceof RecordingError ? e.message : "Could not finish the retry recording.");
      setState("error");
      return null;
    }
  };

  const cancel = async () => {
    await recorder.cancel();
    setState("idle");
  };

  return { state, error, start, stop, cancel };
}

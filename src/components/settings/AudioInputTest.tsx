"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LevelMeter } from "@/components/recording/LevelMeter";
import { LiveInputMeter } from "@/lib/recording/liveInputMeter";
import { mapGetUserMediaError } from "@/lib/recording/errors";

/** Lets a user confirm their microphone works and see live levels without starting a real recording. */
export function AudioInputTest() {
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meter] = useState(() => new LiveInputMeter());
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      meter.attach(stream);
      await meter.ensureResumed();
      setTesting(true);
    } catch (e) {
      setError(mapGetUserMediaError(e).message);
    }
  };

  const stop = () => {
    meter.detach();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTesting(false);
  };

  return (
    <div className="flex flex-col gap-3">
      {testing && <LevelMeter meter={meter} active={testing} />}
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button variant="secondary" onClick={testing ? stop : start}>
        {testing ? "Stop test" : "Test microphone"}
      </Button>
    </div>
  );
}

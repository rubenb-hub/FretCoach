"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { LiveInputMeter } from "@/lib/recording/liveInputMeter";
import { mapGetUserMediaError } from "@/lib/recording/errors";
import { useProfile } from "@/lib/state/ProfileProvider";

type CalibrationStep = "idle" | "measuring-noise" | "waiting-for-play" | "measuring-input" | "complete" | "error";

const SAMPLE_DURATION_MS = 2500;
const SAMPLE_INTERVAL_MS = 50;

async function sampleFor(meter: LiveInputMeter, durationMs: number): Promise<{ avgRms: number; peak: number }> {
  const readings: { rms: number; peak: number }[] = [];
  const start = performance.now();
  while (performance.now() - start < durationMs) {
    const reading = meter.read();
    if (reading) readings.push({ rms: reading.rms, peak: reading.peak });
    await new Promise((resolve) => setTimeout(resolve, SAMPLE_INTERVAL_MS));
  }
  if (readings.length === 0) return { avgRms: 0, peak: 0 };
  const avgRms = readings.reduce((sum, r) => sum + r.rms, 0) / readings.length;
  const peak = Math.max(...readings.map((r) => r.peak));
  return { avgRms, peak };
}

/**
 * Guided microphone calibration (FEATURE 15): measure room noise, then
 * measure input level while the user plays, and translate both into
 * plain-language guidance plus a suggested analysis-sensitivity setting.
 * This never enables aggressive noise suppression — it only informs the
 * existing sensitivity setting the analysis engine already respects.
 */
export function MicrophoneCalibration() {
  const { updateProfile } = useProfile();
  const [step, setStep] = useState<CalibrationStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const meterRef = useRef<LiveInputMeter | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    meterRef.current?.detach();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    setError(null);
    setMessages([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const meter = new LiveInputMeter();
      meter.attach(stream);
      await meter.ensureResumed();
      meterRef.current = meter;

      setStep("measuring-noise");
      const noise = await sampleFor(meter, SAMPLE_DURATION_MS);

      setStep("waiting-for-play");
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setStep("measuring-input");
      const input = await sampleFor(meter, SAMPLE_DURATION_MS);

      const results: string[] = [];
      if (noise.avgRms > 0.03) {
        results.push("The room is quite noisy. A quieter space will give more reliable results.");
      } else {
        results.push("Background noise looks fine.");
      }

      if (input.peak >= 0.97) {
        results.push("The microphone signal is clipping. Move the phone a little farther away.");
      } else if (input.peak < 0.12) {
        results.push("The input level looks quiet. Try moving the phone slightly closer to the guitar.");
      } else {
        results.push("Input level looks good.");
      }

      // Suggest (but don't silently force) an analysis-sensitivity setting.
      const suggestedSensitivity = noise.avgRms > 0.03 ? "low" : input.peak < 0.12 ? "high" : "standard";
      updateProfile({ analysisSensitivity: suggestedSensitivity });
      results.push(`Analysis sensitivity has been set to "${suggestedSensitivity}" based on this test.`);

      setMessages(results);
      setStep("complete");
    } catch (e) {
      setError(mapGetUserMediaError(e).message);
      setStep("error");
    } finally {
      cleanup();
    }
  };

  const stepLabel: Record<CalibrationStep, string> = {
    idle: "",
    "measuring-noise": "Stay quiet for a couple of seconds…",
    "waiting-for-play": "Now play one normal note or chord…",
    "measuring-input": "Measuring your input level…",
    complete: "Calibration complete",
    error: "Calibration could not complete",
  };

  return (
    <div className="flex flex-col gap-3">
      {step !== "idle" && step !== "complete" && step !== "error" && (
        <p role="status" aria-live="polite" className="text-sm font-medium">
          {stepLabel[step]}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {messages.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm text-foreground-muted">
          {messages.map((m) => (
            <li key={m}>• {m}</li>
          ))}
        </ul>
      )}
      <Button
        variant="secondary"
        onClick={start}
        disabled={step === "measuring-noise" || step === "waiting-for-play" || step === "measuring-input"}
      >
        {step === "idle" || step === "complete" || step === "error" ? "Start microphone calibration" : "Calibrating…"}
      </Button>
    </div>
  );
}

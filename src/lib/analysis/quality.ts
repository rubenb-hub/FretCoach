import type { RecordingQuality, TimeSegment } from "@/lib/types";
import type { FrameFeatures } from "./frames";

const MIN_ACTIVE_SECONDS_FOR_CONFIDENCE = 15;

export interface QualityInput {
  frames: FrameFeatures[];
  activePlayingSeconds: number;
  noiseFloorRms: number;
  pauseSegments: TimeSegment[];
}

/** Derives recording-quality flags the coaching engine can reference honestly. */
export function assessRecordingQuality(input: QualityInput): RecordingQuality {
  const { frames, activePlayingSeconds, noiseFloorRms, pauseSegments } = input;
  const warnings: string[] = [];

  if (frames.length === 0) {
    return {
      score: 0,
      clippingDetected: false,
      lowInputDetected: true,
      highNoiseDetected: false,
      possibleBackingMusic: false,
      insufficientDuration: true,
      confidence: 0,
      warnings: ["No audio was detected in this recording."],
    };
  }

  const peak = Math.max(...frames.map((f) => f.peak));
  const clippedFrameCount = frames.filter((f) => f.peak >= 0.985).length;
  const clippingDetected = clippedFrameCount > frames.length * 0.005;

  const avgRms = frames.reduce((s, f) => s + f.rms, 0) / frames.length;
  const lowInputDetected = peak < 0.05 || avgRms < 0.01;

  const highNoiseDetected = noiseFloorRms > 0.03 && noiseFloorRms / Math.max(avgRms, 1e-6) > 0.4;

  // Conservative heuristic: if frames classified as "pauses" still show
  // meaningfully elevated broadband energy relative to the true minimum,
  // there may be backing music or ambient sound rather than true silence.
  // This is intentionally cautious and only ever surfaced as a possibility.
  let possibleBackingMusic = false;
  if (pauseSegments.length > 0) {
    const pauseFrames = frames.filter((f) =>
      pauseSegments.some((p) => f.timeSeconds >= p.startSeconds && f.timeSeconds < p.endSeconds)
    );
    if (pauseFrames.length > 0) {
      const pauseAvgRms = pauseFrames.reduce((s, f) => s + f.rms, 0) / pauseFrames.length;
      const minRms = Math.min(...frames.map((f) => f.rms));
      possibleBackingMusic = pauseAvgRms > minRms * 4 && pauseAvgRms > 0.015;
    }
  }

  const insufficientDuration = activePlayingSeconds < MIN_ACTIVE_SECONDS_FOR_CONFIDENCE;

  if (clippingDetected) warnings.push("The microphone clipped during some louder sections.");
  if (lowInputDetected) warnings.push("The input level was very quiet, which may reduce analysis reliability.");
  if (highNoiseDetected) warnings.push("Background noise was relatively high, so timing results may be less reliable.");
  if (possibleBackingMusic) warnings.push("There may be backing music or ambient sound between playing sections.");
  if (insufficientDuration) warnings.push("Only a short amount of active playing was detected, so results have low confidence.");

  let score = 100;
  if (clippingDetected) score -= 25;
  if (lowInputDetected) score -= 30;
  if (highNoiseDetected) score -= 20;
  if (possibleBackingMusic) score -= 10;
  if (insufficientDuration) score -= 20;
  score = Math.max(0, Math.min(100, score));

  const confidence = Math.max(0, Math.min(1, score / 100));

  return {
    score,
    clippingDetected,
    lowInputDetected,
    highNoiseDetected,
    possibleBackingMusic,
    insufficientDuration,
    confidence,
    warnings,
  };
}

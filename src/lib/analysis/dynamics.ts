import type { OnsetEvidence, DynamicsAnalysis, TimeSegment } from "@/lib/types";
import type { FrameFeatures } from "./frames";

/** Coefficient of variation above which we treat dynamics as "highly varied". */
const VARIATION_SCALE = 0.85;

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function analyseDynamics(
  onsets: OnsetEvidence[],
  frames: FrameFeatures[],
  activeRegions: TimeSegment[]
): DynamicsAnalysis {
  if (onsets.length < 4) {
    return {
      score: 0,
      confidence: 0,
      variation: 0,
      averageAttackStrength: 0,
      clippingEvents: 0,
      quietSectionSeconds: 0,
    };
  }

  const strengths = onsets.map((o) => o.strength);
  const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  const variation = mean > 0 ? stdDev(strengths) / mean : 0;
  const score = Math.round(Math.max(0, Math.min(100, 100 * (1 - variation / VARIATION_SCALE))));

  const clippingEvents = frames.filter((f) => f.peak >= 0.985).length;

  const activeAvgRms =
    frames.reduce((sum, f) => sum + f.rms, 0) / Math.max(1, frames.length) || 1e-6;
  let quietSectionSeconds = 0;
  for (const region of activeRegions) {
    const regionFrames = frames.filter(
      (f) => f.timeSeconds >= region.startSeconds && f.timeSeconds < region.endSeconds
    );
    if (regionFrames.length === 0) continue;
    const regionAvg = regionFrames.reduce((s, f) => s + f.rms, 0) / regionFrames.length;
    if (regionAvg < activeAvgRms * 0.35) {
      quietSectionSeconds += region.endSeconds - region.startSeconds;
    }
  }

  const confidence = Math.max(0, Math.min(1, onsets.length / 40));

  return {
    score,
    confidence,
    variation,
    averageAttackStrength: mean,
    clippingEvents,
    quietSectionSeconds,
  };
}

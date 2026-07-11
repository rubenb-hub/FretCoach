import type {
  AnalysedSegment,
  OnsetEvidence,
  TempoEstimate,
  TimeSegment,
} from "@/lib/types";
import type { FrameFeatures } from "./frames";
import { computeBeatDeviations, scoreFromDeviationFraction } from "./timing";

const SEGMENT_LENGTH_SECONDS = 20;

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export interface SegmentAnalysisInput {
  durationSeconds: number;
  frames: FrameFeatures[];
  activeRegions: TimeSegment[];
  pauseSegments: TimeSegment[];
  onsets: OnsetEvidence[];
  tempo: TempoEstimate;
  noiseFloorRms: number;
}

export interface SegmentAnalysisResult {
  segments: AnalysedSegment[];
  longestUninterruptedSection?: TimeSegment;
  highestEnergySection?: TimeSegment;
}

/** Splits the session into fixed-length windows and scores each independently. */
export function analyseSegments(input: SegmentAnalysisInput): SegmentAnalysisResult {
  const { durationSeconds, frames, activeRegions, pauseSegments, onsets, tempo, noiseFloorRms } = input;
  if (durationSeconds <= 0) return { segments: [] };

  const deviations = computeBeatDeviations(onsets, tempo);
  const segmentCount = Math.max(1, Math.ceil(durationSeconds / SEGMENT_LENGTH_SECONDS));
  const segments: AnalysedSegment[] = [];

  for (let index = 0; index < segmentCount; index++) {
    const startSeconds = index * SEGMENT_LENGTH_SECONDS;
    const endSeconds = Math.min(durationSeconds, startSeconds + SEGMENT_LENGTH_SECONDS);
    const segFrames = frames.filter((f) => f.timeSeconds >= startSeconds && f.timeSeconds < endSeconds);

    const activeSeconds = activeRegions.reduce((sum, region) => {
      const overlapStart = Math.max(region.startSeconds, startSeconds);
      const overlapEnd = Math.min(region.endSeconds, endSeconds);
      return sum + Math.max(0, overlapEnd - overlapStart);
    }, 0);
    const activePlayingRatio = (endSeconds - startSeconds) > 0 ? activeSeconds / (endSeconds - startSeconds) : 0;

    const segOnsetIndices: number[] = [];
    onsets.forEach((o, i) => {
      if (o.timeSeconds >= startSeconds && o.timeSeconds < endSeconds) segOnsetIndices.push(i);
    });
    const onsetDensity = segOnsetIndices.length / Math.max(1, endSeconds - startSeconds);

    let timingConsistency: number | null = null;
    if (deviations && segOnsetIndices.length >= 4) {
      const segDeviations = segOnsetIndices.map((i) => deviations[i]);
      timingConsistency = scoreFromDeviationFraction(stdDev(segDeviations));
    }

    const segStrengths = segOnsetIndices.map((i) => onsets[i].strength);
    let dynamicConsistency = 50;
    if (segStrengths.length >= 3) {
      const mean = segStrengths.reduce((a, b) => a + b, 0) / segStrengths.length;
      const variation = mean > 0 ? stdDev(segStrengths) / mean : 0;
      dynamicConsistency = Math.round(Math.max(0, Math.min(100, 100 * (1 - variation / 0.85))));
    }

    const avgRms = segFrames.length ? segFrames.reduce((s, f) => s + f.rms, 0) / segFrames.length : 0;
    const peakRms = segFrames.length ? Math.max(...segFrames.map((f) => f.rms)) : 0;
    const noiseQuality = Math.round(Math.max(0, Math.min(100, 100 * (1 - noiseFloorRms / Math.max(avgRms, 1e-6)))));

    const pauseCount = pauseSegments.filter(
      (p) => p.startSeconds >= startSeconds && p.startSeconds < endSeconds
    ).length;

    segments.push({
      index,
      startSeconds,
      endSeconds,
      activePlayingRatio,
      onsetDensity,
      timingConsistency,
      dynamicConsistency,
      noiseQuality,
      pauseCount,
      averageRms: avgRms,
      peakRms,
    });
  }

  const longestUninterruptedSection =
    activeRegions.length > 0
      ? activeRegions.reduce((longest, region) =>
          region.endSeconds - region.startSeconds > longest.endSeconds - longest.startSeconds ? region : longest
        )
      : undefined;

  const highestEnergySection =
    segments.length > 0
      ? (() => {
          const best = segments.reduce((b, s) => (s.averageRms > b.averageRms ? s : b));
          return { startSeconds: best.startSeconds, endSeconds: best.endSeconds };
        })()
      : undefined;

  return { segments, longestUninterruptedSection, highestEnergySection };
}

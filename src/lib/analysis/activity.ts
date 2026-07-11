import type { FrameFeatures } from "./frames";
import type { TimeSegment } from "@/lib/types";

export interface ActivityResult {
  /** Per-frame active/inactive flag, aligned with the input frame array. */
  activeFlags: boolean[];
  activeRegions: TimeSegment[];
  pauseSegments: TimeSegment[];
  noiseFloorRms: number;
  /** Conservative approximation of clusters of short repeated attempts. */
  repeatedAttemptClusters: TimeSegment[];
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.floor(p * (sortedValues.length - 1))));
  return sortedValues[index];
}

/**
 * Classifies each frame as active playing or silence/noise, using a
 * threshold derived from the recording's own noise floor rather than a
 * fixed amplitude — a quiet bedroom recording and a loud amp recording
 * need very different absolute thresholds.
 */
export function detectActivity(
  frames: FrameFeatures[],
  hopSizeSeconds: number,
  longPauseThresholdSeconds: number,
  sensitivity: "low" | "standard" | "high" = "standard"
): ActivityResult {
  if (frames.length === 0) {
    return {
      activeFlags: [],
      activeRegions: [],
      pauseSegments: [],
      noiseFloorRms: 0,
      repeatedAttemptClusters: [],
    };
  }

  const rmsValues = frames.map((f) => f.rms).sort((a, b) => a - b);
  // Noise floor: 15th percentile of frame RMS approximates ambient/room
  // noise, since most of a practice recording is expected to contain some
  // silence or low-level noise between phrases.
  const noiseFloorRms = percentile(rmsValues, 0.15);
  const peakRms = percentile(rmsValues, 0.98) || noiseFloorRms + 1e-6;

  // Sensitivity shifts how far above the noise floor a frame must be to
  // count as "active". Lower sensitivity = require a stronger signal.
  const sensitivityMultiplier = sensitivity === "high" ? 1.5 : sensitivity === "low" ? 3.5 : 2.2;
  const threshold = noiseFloorRms + sensitivityMultiplier * Math.max(noiseFloorRms, (peakRms - noiseFloorRms) * 0.05);

  const rawActive = frames.map((f) => f.rms > threshold);

  // Hysteresis: bridge short gaps (<300ms) so a single quiet frame inside a
  // phrase doesn't fragment an active region, and require a short minimum
  // run before flipping state.
  const bridgeFrames = Math.max(1, Math.round(0.3 / hopSizeSeconds));
  const activeFlags = rawActive.slice();
  let gapStart = -1;
  for (let i = 0; i < activeFlags.length; i++) {
    if (!activeFlags[i]) {
      if (gapStart === -1) gapStart = i;
    } else if (gapStart !== -1) {
      const gapLength = i - gapStart;
      if (gapLength <= bridgeFrames) {
        for (let j = gapStart; j < i; j++) activeFlags[j] = true;
      }
      gapStart = -1;
    }
  }

  const activeRegions: TimeSegment[] = [];
  const pauseSegments: TimeSegment[] = [];
  let regionStart = 0;
  let regionActive = activeFlags[0];
  const frameTime = (index: number) => frames[index].timeSeconds;
  const endTime = (index: number) => frames[index].timeSeconds + hopSizeSeconds;

  for (let i = 1; i <= activeFlags.length; i++) {
    const isLast = i === activeFlags.length;
    const current = isLast ? !regionActive : activeFlags[i];
    if (isLast || current !== regionActive) {
      const segment: TimeSegment = {
        startSeconds: frameTime(regionStart),
        endSeconds: isLast ? endTime(i - 1) : frameTime(i),
      };
      if (regionActive) {
        activeRegions.push(segment);
      } else if (segment.endSeconds - segment.startSeconds >= longPauseThresholdSeconds) {
        pauseSegments.push(segment);
      }
      regionStart = i;
      regionActive = current;
    }
  }

  // Conservative "repeated attempt" approximation: three or more short
  // active regions (<10s) separated by pauses, within a 45s window, is
  // flagged as a likely practice-loop cluster. This is intentionally
  // cautious — we do not claim to recognise the same passage was replayed.
  const repeatedAttemptClusters: TimeSegment[] = [];
  const shortRegions = activeRegions.filter((r) => r.endSeconds - r.startSeconds < 10);
  let clusterStart = 0;
  while (clusterStart < shortRegions.length) {
    let clusterEnd = clusterStart;
    while (
      clusterEnd + 1 < shortRegions.length &&
      shortRegions[clusterEnd + 1].startSeconds - shortRegions[clusterStart].startSeconds <= 45
    ) {
      clusterEnd++;
    }
    if (clusterEnd - clusterStart + 1 >= 3) {
      repeatedAttemptClusters.push({
        startSeconds: shortRegions[clusterStart].startSeconds,
        endSeconds: shortRegions[clusterEnd].endSeconds,
      });
      clusterStart = clusterEnd + 1;
    } else {
      clusterStart++;
    }
  }

  return { activeFlags, activeRegions, pauseSegments, noiseFloorRms, repeatedAttemptClusters };
}

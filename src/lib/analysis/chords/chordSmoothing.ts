import { v4 as uuidv4 } from "uuid";
import type { ChordDetection } from "@/lib/types";
import type { ChordWindow } from "./chordTrack";

export interface ChordSmoothingOptions {
  /** Sliding-window radius (in windows) for the majority filter; window size = 2*radius+1. */
  smoothingRadius: number;
  /** Merged regions shorter than this are dropped as likely transient/ambiguous blips. */
  minRegionDurationSeconds: number;
}

export const DEFAULT_CHORD_SMOOTHING_OPTIONS: ChordSmoothingOptions = {
  smoothingRadius: 2,
  minRegionDurationSeconds: 0.35,
};

/** Applies a sliding majority filter to the per-window chord-name labels
 * so a single noisy/ambiguous window doesn't split an otherwise-stable
 * chord region, or flicker the display between near-tied templates. */
function smoothLabels(labels: (string | null)[], radius: number): (string | null)[] {
  if (radius <= 0) return labels;
  return labels.map((_, i) => {
    const counts = new Map<string | null, number>();
    for (let j = Math.max(0, i - radius); j <= Math.min(labels.length - 1, i + radius); j++) {
      const label = labels[j];
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    let bestLabel = labels[i];
    let bestCount = -1;
    for (const [label, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestLabel = label;
      }
    }
    return bestLabel;
  });
}

/**
 * Smooths the raw per-window chord track and merges consecutive windows
 * sharing a (smoothed) chord label into user-facing ChordDetection
 * regions. Windows with no confident match (`primary: null`) become gaps
 * rather than being forced into a neighbouring chord's region.
 */
export function smoothAndMergeChords(
  windows: ChordWindow[],
  options: Partial<ChordSmoothingOptions> = {}
): ChordDetection[] {
  const opts = { ...DEFAULT_CHORD_SMOOTHING_OPTIONS, ...options };
  if (windows.length === 0) return [];

  const labels = windows.map((w) => w.primary?.name ?? null);
  const smoothed = smoothLabels(labels, opts.smoothingRadius);

  const detections: ChordDetection[] = [];
  let regionStart = 0;

  const closeRegion = (endIndexExclusive: number) => {
    const label = smoothed[regionStart];
    if (label !== null) {
      const regionWindows = windows.slice(regionStart, endIndexExclusive);
      const startTime = regionWindows[0].timeSeconds;
      const endTime = regionWindows[regionWindows.length - 1].timeSeconds + regionWindows[regionWindows.length - 1].durationSeconds;

      if (endTime - startTime >= opts.minRegionDurationSeconds) {
        const withMatch = regionWindows.filter((w) => w.primary?.name === label);
        const best = withMatch.reduce((a, b) => ((b.primary?.confidence ?? 0) > (a.primary?.confidence ?? 0) ? b : a));
        const avgConfidence = withMatch.reduce((sum, w) => sum + (w.primary?.confidence ?? 0), 0) / withMatch.length;

        detections.push({
          id: uuidv4(),
          startTime,
          endTime,
          primary: {
            name: label,
            confidence: avgConfidence,
            pitchClasses: best.primary?.pitchClasses ?? new Array(12).fill(0),
          },
          alternatives: best.alternatives,
        });
      }
    }
    regionStart = endIndexExclusive;
  };

  for (let i = 1; i <= smoothed.length; i++) {
    if (i === smoothed.length || smoothed[i] !== smoothed[regionStart]) {
      closeRegion(i);
    }
  }

  return detections;
}

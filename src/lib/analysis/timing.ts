import type { OnsetEvidence, TimeSegment, TimingAnalysis, TempoEstimate } from "@/lib/types";
import { TEMPO_CONFIDENCE_THRESHOLD } from "./tempo";

/**
 * Fraction of a beat period that we treat as the boundary of "highly
 * consistent" timing. Deviations are expressed as a fraction of the beat
 * period so the same tolerance is meaningful whether the pulse is slow or
 * fast. This value is a judgement call, documented here for transparency,
 * not a measured musical constant.
 */
const CONSISTENCY_TOLERANCE_FRACTION = 0.16;

function wrappedDeviation(time: number, phase: number, period: number): number {
  let delta = (time - phase) % period;
  if (delta > period / 2) delta -= period;
  if (delta < -period / 2) delta += period;
  return delta;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function scoreFromDeviationFraction(fractionStdDev: number): number {
  const normalised = fractionStdDev / CONSISTENCY_TOLERANCE_FRACTION;
  return Math.round(Math.max(0, Math.min(100, 100 * (1 - normalised))));
}

export function computeBeatDeviations(onsets: OnsetEvidence[], tempo: TempoEstimate): number[] | null {
  if (!tempo.bpm || onsets.length === 0) return null;
  const period = 60 / tempo.bpm;
  const phase = onsets[0].timeSeconds;
  return onsets.map((o) => wrappedDeviation(o.timeSeconds, phase, period) / period);
}

export function analyseTiming(
  onsets: OnsetEvidence[],
  tempo: TempoEstimate,
  durationSeconds: number
): TimingAnalysis {
  if (!tempo.bpm || tempo.confidence < TEMPO_CONFIDENCE_THRESHOLD || onsets.length < 8) {
    return {
      score: null,
      confidence: tempo.confidence,
      firstHalfScore: null,
      secondHalfScore: null,
      driftDescription:
        "A reliable pulse could not be identified, so timing consistency isn't reported for this session. This is common with free-time playing, quiet recordings, or a lot of background noise.",
    };
  }

  const period = 60 / tempo.bpm;
  const phase = onsets[0].timeSeconds;
  const deviations = onsets.map((o) => wrappedDeviation(o.timeSeconds, phase, period) / period);

  const overallScore = scoreFromDeviationFraction(stdDev(deviations));

  const midpoint = durationSeconds / 2;
  const firstHalf = onsets
    .map((o, i) => ({ o, d: deviations[i] }))
    .filter((x) => x.o.timeSeconds < midpoint);
  const secondHalf = onsets
    .map((o, i) => ({ o, d: deviations[i] }))
    .filter((x) => x.o.timeSeconds >= midpoint);

  const firstHalfScore = firstHalf.length >= 4 ? scoreFromDeviationFraction(stdDev(firstHalf.map((x) => x.d))) : null;
  const secondHalfScore =
    secondHalf.length >= 4 ? scoreFromDeviationFraction(stdDev(secondHalf.map((x) => x.d))) : null;

  // Rolling 20s windows to find the most / least locally consistent stretch.
  const windowSeconds = 20;
  const windows: { segment: TimeSegment; score: number }[] = [];
  for (let start = 0; start < durationSeconds; start += windowSeconds / 2) {
    const end = Math.min(durationSeconds, start + windowSeconds);
    const inWindow = onsets
      .map((o, i) => ({ o, d: deviations[i] }))
      .filter((x) => x.o.timeSeconds >= start && x.o.timeSeconds < end);
    if (inWindow.length >= 4) {
      windows.push({
        segment: { startSeconds: start, endSeconds: end },
        score: scoreFromDeviationFraction(stdDev(inWindow.map((x) => x.d))),
      });
    }
  }

  let strongestSegment: TimeSegment | undefined;
  let weakestSegment: TimeSegment | undefined;
  if (windows.length > 0) {
    strongestSegment = windows.reduce((best, w) => (w.score > best.score ? w : best)).segment;
    weakestSegment = windows.reduce((worst, w) => (w.score < worst.score ? w : worst)).segment;
  }

  let driftDescription: string | undefined;
  if (firstHalfScore !== null && secondHalfScore !== null) {
    const delta = secondHalfScore - firstHalfScore;
    if (delta <= -12) {
      driftDescription =
        "Your pulse was steadier early in the session and became less consistent later. Fatigue or a harder passage may have contributed.";
    } else if (delta >= 12) {
      driftDescription = "Your timing became noticeably more consistent as the session progressed.";
    } else {
      driftDescription = "Timing consistency stayed fairly stable across the session.";
    }
  }

  return {
    score: overallScore,
    confidence: tempo.confidence,
    strongestSegment,
    weakestSegment,
    driftDescription,
    firstHalfScore,
    secondHalfScore,
  };
}

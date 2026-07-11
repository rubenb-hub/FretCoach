import type { MusicAnalysisResult, PracticeIssue } from "@/lib/types";

export interface ComparisonMetric {
  label: string;
  originalWording: string;
  retryWording: string;
  comparable: boolean;
}

export interface RetryComparisonResult {
  /** True if at least one metric could be meaningfully compared. */
  comparable: boolean;
  metrics: ComparisonMetric[];
  summary: string;
}

const MIN_NOTES_FOR_TIMING_VARIATION = 3;
const NOISE_FLOOR = 0.08; // below this, a delta is "about the same" rather than a claimed improvement

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function coefficientOfVariation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = average(values) ?? 0;
  if (mean <= 0) return null;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

function pitchStabilityWording(value: number | null): string {
  if (value === null) return "not enough data";
  if (value >= 0.8) return "very steady";
  if (value >= 0.6) return "steady";
  if (value >= 0.4) return "developing";
  return "inconsistent";
}

function timingVariationWording(cv: number | null): string {
  if (cv === null) return "not enough data";
  if (cv <= 0.08) return "very steady";
  if (cv <= 0.18) return "steady";
  if (cv <= 0.3) return "developing";
  return "inconsistent";
}

function confidenceWording(value: number | null): string {
  if (value === null) return "none detected";
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "moderate";
  return "low";
}

/** `deltaFavorable` should already be signed so that positive = better
 * (steadier). Both metrics this is used for are "how steady" measures,
 * so the decline wording ("less steady") applies to either. */
function directionalWording(deltaFavorable: number): string {
  if (Math.abs(deltaFavorable) < NOISE_FLOOR) return "about the same";
  return deltaFavorable > 0 ? "improved" : "less steady";
}

function overlaps(a: { startTime: number; endTime: number }, b: { startTime: number; endTime: number }): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Compares a retry recording against the specific section of the original
 * recording it was meant to fix. Only ever compares measurable properties
 * — never invents an "improvement score". Any metric without enough data
 * on either side is reported as such rather than guessed at.
 */
export function compareRetryToOriginal(
  originalAnalysis: MusicAnalysisResult,
  issue: PracticeIssue,
  retryAnalysis: MusicAnalysisResult
): RetryComparisonResult {
  const range = { startTime: issue.startTime, endTime: issue.endTime };
  const originalNotes = originalAnalysis.notes.filter((n) => overlaps(n, range));
  const originalChords = originalAnalysis.chords.filter((c) => overlaps(c, range));
  const originalFretBuzz = originalAnalysis.fretBuzz.filter((b) => overlaps(b, range));
  const originalIssueCount = originalAnalysis.issues.filter((i) => overlaps(i, range)).length;

  const metrics: ComparisonMetric[] = [];

  // Pitch stability.
  const originalStability = average(originalNotes.map((n) => n.pitchStability ?? NaN).filter((v) => !Number.isNaN(v)));
  const retryStability = average(retryAnalysis.notes.map((n) => n.pitchStability ?? NaN).filter((v) => !Number.isNaN(v)));
  const stabilityComparable = originalStability !== null && retryStability !== null;
  metrics.push({
    label: "Pitch stability",
    originalWording: pitchStabilityWording(originalStability),
    retryWording: stabilityComparable
      ? directionalWording(retryStability! - originalStability!)
      : pitchStabilityWording(retryStability),
    comparable: stabilityComparable,
  });

  // Timing variation (coefficient of variation of inter-note-onset intervals).
  const originalIntervals = intervalsOf(originalNotes.map((n) => n.startTime));
  const retryIntervals = intervalsOf(retryAnalysis.notes.map((n) => n.startTime));
  const originalCv = originalNotes.length >= MIN_NOTES_FOR_TIMING_VARIATION ? coefficientOfVariation(originalIntervals) : null;
  const retryCv = retryAnalysis.notes.length >= MIN_NOTES_FOR_TIMING_VARIATION ? coefficientOfVariation(retryIntervals) : null;
  const timingComparable = originalCv !== null && retryCv !== null;
  metrics.push({
    label: "Timing variation",
    originalWording: timingVariationWording(originalCv),
    // Lower coefficient of variation is steadier, so the sign is flipped
    // here to keep "positive delta = improvement" consistent across metrics.
    retryWording: timingComparable
      ? directionalWording(originalCv! - retryCv!)
      : timingVariationWording(retryCv),
    comparable: timingComparable,
  });

  // Note clarity (count of clarity-related events).
  const originalClarityCount = originalAnalysis.events.filter(
    (e) => overlaps(e, range) && (e.category === "unclear_attack" || e.category === "muted_note")
  ).length;
  const retryClarityCount = retryAnalysis.events.filter(
    (e) => e.category === "unclear_attack" || e.category === "muted_note"
  ).length;
  metrics.push({
    label: "Note clarity",
    originalWording: originalClarityCount === 0 ? "no issues noted" : `${originalClarityCount} note(s) flagged`,
    retryWording: retryClarityCount === 0 ? "no issues noted" : `${retryClarityCount} note(s) flagged`,
    comparable: true,
  });

  // Likely chord confidence.
  const originalChordConfidence = average(originalChords.map((c) => c.primary.confidence));
  const retryChordConfidence = average(retryAnalysis.chords.map((c) => c.primary.confidence));
  metrics.push({
    label: "Likely chord confidence",
    originalWording: confidenceWording(originalChordConfidence),
    retryWording: confidenceWording(retryChordConfidence),
    comparable: true,
  });

  // Possible buzz confidence.
  const originalBuzzConfidence = average(originalFretBuzz.map((b) => b.confidence));
  const retryBuzzConfidence = average(retryAnalysis.fretBuzz.map((b) => b.confidence));
  metrics.push({
    label: "Possible buzz confidence",
    originalWording: confidenceWording(originalBuzzConfidence),
    retryWording: confidenceWording(retryBuzzConfidence),
    comparable: true,
  });

  // Detected issue count.
  metrics.push({
    label: "Detected issue count",
    originalWording: `${originalIssueCount}`,
    retryWording: `${retryAnalysis.issues.length}`,
    comparable: true,
  });

  const comparable = metrics.some((m) => m.comparable);
  const summary = comparable
    ? "Here's how the measurable parts of your retry compare to the original section."
    : "The retry could not be compared confidently — try a slightly longer retry with a bit more playing before and after the section.";

  return { comparable, metrics, summary };
}

function intervalsOf(times: number[]): number[] {
  const sorted = [...times].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) intervals.push(sorted[i] - sorted[i - 1]);
  return intervals;
}

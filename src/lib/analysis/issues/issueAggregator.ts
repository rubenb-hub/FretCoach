import { v4 as uuidv4 } from "uuid";
import type { AnalysisEvent, IssueSeverity, PracticeIssue, PracticeIssueCategory } from "@/lib/types";
import { EVENT_TO_ISSUE_CATEGORY, ISSUE_COPY } from "./issueCopy";

export interface IssueAggregatorOptions {
  /** Events within this many seconds of each other are merged into one issue. */
  mergeGapSeconds: number;
  contextBeforeSeconds: number;
  contextAfterSeconds: number;
  minConfidence: number;
  minDurationSeconds: number;
  /** Caps how many issues are surfaced — avoids flooding the user with
   * low-value warnings even on a recording with many raw detections. */
  maxIssues: number;
}

export const DEFAULT_ISSUE_AGGREGATOR_OPTIONS: IssueAggregatorOptions = {
  mergeGapSeconds: 0.6,
  contextBeforeSeconds: 0.75,
  contextAfterSeconds: 0.75,
  minConfidence: 0.5,
  minDurationSeconds: 0.15,
  maxIssues: 8,
};

interface Cluster {
  events: AnalysisEvent[];
  startTime: number;
  endTime: number;
}

function severityFromScore(score: number, categoryCount: number): IssueSeverity {
  let severity: IssueSeverity = score >= 0.8 ? "high" : score >= 0.6 ? "medium" : "low";
  // Corroborating evidence across more than one category is treated as
  // more coaching-worthy, per the spec's "group simultaneous related
  // problems" requirement — bump severity up one level, capped at high.
  if (categoryCount > 1) {
    if (severity === "low") severity = "medium";
    else severity = "high";
  }
  return severity;
}

function titleFor(categories: PracticeIssueCategory[]): string {
  const titles = categories.map((c) => ISSUE_COPY[c].title);
  if (titles.length === 1) return titles[0];
  const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
  if (titles.length === 2) return `${titles[0]} and ${lowerFirst(titles[1])}`;
  return `${titles.slice(0, -1).join(", ")}, and ${lowerFirst(titles[titles.length - 1])}`;
}

function explanationFor(events: AnalysisEvent[]): string {
  const sentences: string[] = [];
  for (const event of events) {
    const reasons = event.metadata.reasons as string[] | undefined;
    if (reasons && reasons.length > 0) {
      sentences.push(reasons[0]);
    } else if (event.category === "timing_inconsistency") {
      sentences.push("Timing became less steady through this section.");
    } else if (event.category === "chord_transition") {
      const from = event.metadata.fromChord as string | undefined;
      const to = event.metadata.toChord as string | undefined;
      sentences.push(
        from && to
          ? `There was a noticeable gap changing from the likely ${from} shape to ${to}.`
          : "There was a noticeable gap during this chord change."
      );
    } else if (event.category === "pitch_instability") {
      sentences.push("This note's pitch wavered rather than holding steady.");
    }
  }
  // De-duplicate near-identical sentences while preserving order.
  const seen = new Set<string>();
  const unique = sentences.filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
  return unique.slice(0, 2).join(" ");
}

function tipsFor(categories: PracticeIssueCategory[]): string[] {
  const tips: string[] = [];
  for (const category of categories) {
    for (const tip of ISSUE_COPY[category].tips) {
      if (!tips.includes(tip)) tips.push(tip);
    }
  }
  return tips.slice(0, 5);
}

/**
 * Converts frame/note-level AnalysisEvents into a small number of
 * user-facing PracticeIssues: nearby, related detections are merged
 * (avoiding duplicate near-identical warnings), each issue gets ~0.5-1s of
 * playback context clamped to the recording, and issues are ranked by a
 * combination of confidence and severity so the most coaching-valuable
 * sections surface first rather than every low-value blip.
 */
export function aggregateIssues(
  events: AnalysisEvent[],
  recordingDurationSeconds: number,
  options: Partial<IssueAggregatorOptions> = {}
): PracticeIssue[] {
  const opts = { ...DEFAULT_ISSUE_AGGREGATOR_OPTIONS, ...options };

  const relevant = events
    .filter((e) => EVENT_TO_ISSUE_CATEGORY[e.category] !== null)
    .filter((e) => e.confidence >= opts.minConfidence)
    .sort((a, b) => a.startTime - b.startTime);

  const clusters: Cluster[] = [];
  for (const event of relevant) {
    const last = clusters[clusters.length - 1];
    if (last && event.startTime <= last.endTime + opts.mergeGapSeconds) {
      last.events.push(event);
      last.endTime = Math.max(last.endTime, event.endTime);
    } else {
      clusters.push({ events: [event], startTime: event.startTime, endTime: event.endTime });
    }
  }

  const issues: PracticeIssue[] = clusters
    .filter((cluster) => cluster.endTime - cluster.startTime >= opts.minDurationSeconds)
    .map((cluster) => {
      const categories = Array.from(
        new Set(cluster.events.map((e) => EVENT_TO_ISSUE_CATEGORY[e.category]).filter((c): c is PracticeIssueCategory => c !== null))
      );
      const baseConfidence = Math.max(...cluster.events.map((e) => e.confidence));
      const corroborationBonus = Math.min(0.15, 0.05 * (categories.length - 1));
      const confidence = Math.min(1, baseConfidence + corroborationBonus);
      const severity = severityFromScore(confidence, categories.length);
      const primaryCategory = categories[0];

      const playbackStartTime = Math.max(0, cluster.startTime - opts.contextBeforeSeconds);
      const playbackEndTime = Math.min(recordingDurationSeconds, cluster.endTime + opts.contextAfterSeconds);

      return {
        id: uuidv4(),
        startTime: cluster.startTime,
        endTime: cluster.endTime,
        playbackStartTime,
        playbackEndTime,
        category: primaryCategory,
        severity,
        confidence,
        title: titleFor(categories),
        explanation: explanationFor(cluster.events) || ISSUE_COPY[primaryCategory].title,
        tips: tipsFor(categories),
        contributingEventIds: cluster.events.map((e) => e.id),
      } satisfies PracticeIssue;
    });

  const severityWeight: Record<IssueSeverity, number> = { low: 1, medium: 2, high: 3 };
  return issues
    .sort((a, b) => severityWeight[b.severity] * b.confidence - severityWeight[a.severity] * a.confidence)
    .slice(0, opts.maxIssues);
}

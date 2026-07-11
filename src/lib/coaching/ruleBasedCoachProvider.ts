import type {
  CoachingObservation,
  CoachingResult,
  PracticeAction,
  PracticeAnalysis,
  SongInfo,
  UserPracticeProfile,
} from "@/lib/types";
import { formatSegmentLabel, timingLabel } from "./formatTime";

/**
 * Interface future AI-driven coaching (an LLM or specialist model) can
 * implement as a drop-in replacement for the deterministic engine below.
 * Both take the same measured PracticeAnalysis so no provider ever needs
 * to invent facts about the recording.
 */
export interface AIPracticeCoachProvider {
  generateCoaching(
    analysis: PracticeAnalysis,
    profile: UserPracticeProfile,
    song?: SongInfo | null
  ): Promise<CoachingResult>;
}

let observationSeq = 0;
function nextId(prefix: string): string {
  observationSeq += 1;
  return `${prefix}-${observationSeq}`;
}

interface ScoredObservation {
  observation: CoachingObservation;
  severity: number; // higher = more important to surface first
}

/**
 * Deterministic, rule-based coaching engine. Every observation cites the
 * measured evidence it came from; nothing here is randomised or invented.
 * This is intentionally conservative about claims per the product's
 * honesty requirement — it never asserts song/chord/note identity.
 */
export class RuleBasedPracticeCoachProvider implements AIPracticeCoachProvider {
  async generateCoaching(
    analysis: PracticeAnalysis,
    profile: UserPracticeProfile,
    song?: SongInfo | null
  ): Promise<CoachingResult> {
    const candidates: ScoredObservation[] = [];

    // --- Timing ---
    if (analysis.timing.score !== null) {
      const { score, firstHalfScore, secondHalfScore, weakestSegment, strongestSegment, driftDescription } =
        analysis.timing;
      if (firstHalfScore !== null && secondHalfScore !== null && secondHalfScore - firstHalfScore <= -12) {
        candidates.push({
          severity: 90,
          observation: {
            id: nextId("timing"),
            category: "timing",
            text: driftDescription ?? "Your timing became less consistent in the second half of the session.",
            evidenceIds: ["tempo"],
          },
        });
      } else if (score < 50 && weakestSegment) {
        candidates.push({
          severity: 70,
          observation: {
            id: nextId("timing"),
            category: "timing",
            text: `Your least consistent stretch was around ${formatSegmentLabel(
              weakestSegment.startSeconds,
              weakestSegment.endSeconds
            )}. Overall timing consistency is ${timingLabel(score)} (${score}/100).`,
            evidenceIds: ["tempo"],
          },
        });
      } else if (strongestSegment) {
        candidates.push({
          severity: 30,
          observation: {
            id: nextId("timing"),
            category: "timing",
            text: `Your strongest rhythmic section was around ${formatSegmentLabel(
              strongestSegment.startSeconds,
              strongestSegment.endSeconds
            )}. Overall timing consistency is ${timingLabel(score)} (${score}/100).`,
            evidenceIds: ["tempo"],
          },
        });
      }
    } else if (analysis.tempo.confidence < 0.2) {
      candidates.push({
        severity: 40,
        observation: {
          id: nextId("tempo"),
          category: "tempo",
          text: "I could not identify a reliable pulse in this recording. This often happens with free-time playing, quiet recordings, or backing tracks.",
          evidenceIds: [],
          lowConfidence: true,
        },
      });
    }

    // --- Pauses ---
    if (analysis.pauses.count >= 1) {
      const severity = analysis.pauses.count >= 5 ? 95 : analysis.pauses.count >= 3 ? 75 : 45;
      candidates.push({
        severity,
        observation: {
          id: nextId("pauses"),
          category: "pauses",
          text: `You stopped for more than ${profile.longPauseThresholdSeconds} seconds ${analysis.pauses.count} time${
            analysis.pauses.count === 1 ? "" : "s"
          }.${
            analysis.pauses.count >= 3
              ? " Try isolating one difficult transition and looping it rather than restarting the whole section."
              : " This may have been an intentional pause to reset or think through a passage."
          }`,
          evidenceIds: analysis.pauses.segments.map((_, i) => `pause-${i}`),
        },
      });
    }

    // --- Dynamics ---
    if (analysis.dynamics.confidence >= 0.3) {
      if (analysis.dynamics.score < 55) {
        candidates.push({
          severity: 60,
          observation: {
            id: nextId("dynamics"),
            category: "dynamics",
            text: "Your picking or strumming intensity varied considerably during this session. Some of this may be expressive, but practising one section at a deliberately even volume could improve control.",
            evidenceIds: [],
          },
        });
      }
    }
    if (analysis.dynamics.clippingEvents > 0) {
      candidates.push({
        severity: 55,
        observation: {
          id: nextId("clipping"),
          category: "recordingQuality",
          text: "The microphone clipped during several louder sections. Move the phone a bit farther from the amp or guitar next time for a cleaner recording.",
          evidenceIds: [],
        },
      });
    }

    // --- Recording quality ---
    // Skip any warning already covered by the dedicated clipping
    // observation above, so the same fact isn't surfaced twice.
    const remainingQualityWarnings = analysis.recordingQuality.warnings.filter(
      (w) => !(analysis.dynamics.clippingEvents > 0 && /clip/i.test(w))
    );
    if (remainingQualityWarnings.length > 0 && analysis.recordingQuality.score < 70) {
      candidates.push({
        severity: 50,
        observation: {
          id: nextId("quality"),
          category: "recordingQuality",
          text: remainingQualityWarnings[0],
          evidenceIds: [],
          lowConfidence: true,
        },
      });
    }

    candidates.sort((a, b) => b.severity - a.severity);
    const observations = candidates.slice(0, 3).map((c) => c.observation);

    const recommendedActions = buildRecommendedActions(analysis, candidates, song);
    const nextSessionGoal = buildNextSessionGoal(analysis, candidates, song);
    const headline = buildHeadline(analysis);
    const summary = buildSummary(analysis);

    const lowConfidenceAreas: string[] = [];
    if (analysis.tempo.confidence < 0.35) lowConfidenceAreas.push("tempo");
    if (analysis.recordingQuality.confidence < 0.5) lowConfidenceAreas.push("recording quality");
    const confidenceNote =
      lowConfidenceAreas.length > 0
        ? `Confidence was limited for: ${lowConfidenceAreas.join(", ")}. Treat related observations as approximate.`
        : undefined;

    return {
      headline,
      summary,
      observations,
      recommendedActions,
      nextSessionGoal,
      confidenceNote,
    };
  }
}

function buildHeadline(analysis: PracticeAnalysis): string {
  const minutes = Math.round(analysis.activePlayingSeconds / 60);
  if (analysis.activePlayingSeconds < 30) return "A short but recorded session";
  if (minutes >= 1) return `${minutes} minute${minutes === 1 ? "" : "s"} of focused playing`;
  return "A brief practice session";
}

function buildSummary(analysis: PracticeAnalysis): string {
  const parts: string[] = [];
  parts.push(
    `${Math.round(analysis.activePlayingSeconds)}s of active playing out of ${Math.round(
      analysis.durationSeconds
    )}s recorded (${Math.round(analysis.activePlayingRatio * 100)}%).`
  );
  if (analysis.tempo.bpm && analysis.tempo.confidence >= 0.35) {
    parts.push(`A pulse near ${analysis.tempo.bpm} BPM was detected.`);
  }
  return parts.join(" ");
}

function buildRecommendedActions(
  analysis: PracticeAnalysis,
  candidates: ScoredObservation[],
  song?: SongInfo | null
): PracticeAction[] {
  const actions: PracticeAction[] = [];
  const topCategories = new Set(candidates.slice(0, 2).map((c) => c.observation.category));

  if (topCategories.has("timing") && analysis.timing.weakestSegment) {
    const label = formatSegmentLabel(
      analysis.timing.weakestSegment.startSeconds,
      analysis.timing.weakestSegment.endSeconds
    );
    actions.push({
      id: nextId("action"),
      category: "timing",
      text: song?.section
        ? `Loop the ${song.section} around ${label} at a slower tempo, then build back up.`
        : `Loop your most inconsistent section (around ${label}) at a slower pace, then build the tempo back up.`,
    });
  }

  if (topCategories.has("pauses") && analysis.pauses.count >= 3) {
    actions.push({
      id: nextId("action"),
      category: "pauses",
      text: "Pick one transition that keeps causing a stop and practice it in isolation for two minutes before playing the full section again.",
    });
  }

  if (topCategories.has("dynamics")) {
    actions.push({
      id: nextId("action"),
      category: "dynamics",
      text: "Play one section at a deliberately even volume, focusing only on consistent attack strength.",
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: nextId("action"),
      category: "general",
      text: "Keep playing through the full piece — this session didn't show a single clear weak point to target.",
    });
  }

  return actions.slice(0, 2);
}

function buildNextSessionGoal(
  analysis: PracticeAnalysis,
  candidates: ScoredObservation[],
  song?: SongInfo | null
): string {
  const top = candidates[0];
  if (!top) return "Record another session and compare your consistency scores.";

  switch (top.observation.category) {
    case "timing":
      return analysis.timing.weakestSegment
        ? `Next session, spend the first five minutes looping the section around ${formatSegmentLabel(
            analysis.timing.weakestSegment.startSeconds,
            analysis.timing.weakestSegment.endSeconds
          )} before playing straight through.`
        : "Next session, try playing with a metronome to build a steadier internal pulse.";
    case "pauses":
      return song?.section
        ? `Next session, aim for fewer stops in the ${song.section} by isolating the hardest transition first.`
        : "Next session, aim to reduce long pauses by isolating the hardest transition before a full run-through.";
    case "dynamics":
      return "Next session, focus on even attack strength through one full section rather than the whole piece.";
    case "recordingQuality":
    case "tempo":
      return "Next session, try recording a little closer to your guitar in a quieter room for more reliable feedback.";
    default:
      return "Record another session and compare your consistency scores.";
  }
}

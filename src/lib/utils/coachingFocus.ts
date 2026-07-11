import type { CoachingCategory, PracticeSession } from "@/lib/types";

export const COACHING_CATEGORY_LABELS: Record<CoachingCategory, string> = {
  timing: "Timing",
  pauses: "Pauses & restarts",
  dynamics: "Dynamics",
  recordingQuality: "Recording quality",
  tempo: "Tempo",
  general: "General",
};

/** The primary coaching focus for a session, derived from its top observation. */
export function mainCoachingFocus(session: PracticeSession): CoachingCategory | null {
  return session.coaching?.observations[0]?.category ?? null;
}

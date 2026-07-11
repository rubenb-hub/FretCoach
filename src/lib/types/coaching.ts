/** Types describing the deterministic coaching engine's output. */

export type CoachingCategory =
  | "timing"
  | "pauses"
  | "dynamics"
  | "recordingQuality"
  | "tempo"
  | "general";

export interface CoachingObservation {
  id: string;
  category: CoachingCategory;
  /** Short evidence-linked statement, e.g. "You stopped for more than three seconds five times." */
  text: string;
  /** IDs of AnalysisEvidence entries this observation is derived from. */
  evidenceIds: string[];
  /** Whether the underlying measurement had low confidence. */
  lowConfidence?: boolean;
}

export interface PracticeAction {
  id: string;
  text: string;
  category: CoachingCategory;
}

export interface CoachingResult {
  headline: string;
  summary: string;
  observations: CoachingObservation[];
  recommendedActions: PracticeAction[];
  nextSessionGoal: string;
  confidenceNote?: string;
}

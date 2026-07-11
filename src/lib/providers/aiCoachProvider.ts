import type { CoachingResult, PracticeAnalysis, SongInfo, UserPracticeProfile } from "@/lib/types";
import type { AIPracticeCoachProvider } from "@/lib/coaching/ruleBasedCoachProvider";

export type { AIPracticeCoachProvider };

/**
 * Placeholder for a future LLM-generated coaching provider. It must
 * consume the same measured PracticeAnalysis as the rule-based engine —
 * an LLM should phrase and prioritise observations, not invent new
 * "facts" about the recording. Disabled by default; the app runs fully
 * without it.
 */
export class DisabledLLMCoachProvider implements AIPracticeCoachProvider {
  /* eslint-disable @typescript-eslint/no-unused-vars -- signature must match AIPracticeCoachProvider */
  async generateCoaching(
    _analysis: PracticeAnalysis,
    _profile: UserPracticeProfile,
    _song?: SongInfo | null
  ): Promise<CoachingResult> {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    throw new Error(
      "AI-generated coaching is not enabled in this version of FretCoach. This is a placeholder for an opt-in LLM integration."
    );
  }
}

/**
 * Placeholder for a future server-side Python analysis pipeline (e.g.
 * librosa/madmom based tempo & onset detection) that could eventually
 * replace or augment the in-browser engine for higher accuracy.
 */
export class DisabledServerAudioAnalysisProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- placeholder keeps the real method shape
  async analyze(_audio: Blob): Promise<never> {
    throw new Error(
      "Server-side audio analysis is not enabled in this version of FretCoach. This is a placeholder for a future opt-in backend pipeline."
    );
  }
}

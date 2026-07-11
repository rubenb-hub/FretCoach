import type { PracticeAnalysis, UserPracticeProfile } from "@/lib/types";
import { analyzeSession, type AnalysisStage } from "@/lib/analysis/analyzeSession";

export interface AudioAnalysisProvider {
  analyze(
    audio: Blob,
    profile: Pick<UserPracticeProfile, "longPauseThresholdSeconds" | "analysisSensitivity">,
    onStage?: (stage: AnalysisStage) => void
  ): Promise<PracticeAnalysis>;
}

/** Default, always-available analysis provider: runs entirely in-browser. */
export class LocalAudioAnalysisProvider implements AudioAnalysisProvider {
  async analyze(
    audio: Blob,
    profile: Pick<UserPracticeProfile, "longPauseThresholdSeconds" | "analysisSensitivity">,
    onStage?: (stage: AnalysisStage) => void
  ): Promise<PracticeAnalysis> {
    return analyzeSession(audio, profile, onStage);
  }
}

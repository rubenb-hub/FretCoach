import type { AnalysisEvidence, PracticeAnalysis, UserPracticeProfile } from "@/lib/types";
import { decodeAudioBlob, toMonoSamples, AudioDecodeError } from "./decode";
import { extractFrameFeatures } from "./frames";
import { detectActivity } from "./activity";
import { detectOnsets } from "./onsets";
import { estimateTempo } from "./tempo";
import { analyseTiming } from "./timing";
import { analyseDynamics } from "./dynamics";
import { analyseSegments } from "./segments";
import { assessRecordingQuality } from "./quality";

export type AnalysisStage =
  | "preparing-audio"
  | "detecting-activity"
  | "estimating-pulse"
  | "measuring-consistency"
  | "generating-notes";

export const ANALYSIS_STAGES: { stage: AnalysisStage; label: string }[] = [
  { stage: "preparing-audio", label: "Preparing audio" },
  { stage: "detecting-activity", label: "Detecting active playing" },
  { stage: "estimating-pulse", label: "Estimating pulse" },
  { stage: "measuring-consistency", label: "Measuring consistency" },
  { stage: "generating-notes", label: "Generating session notes" },
];

export class SessionAnalysisError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "SessionAnalysisError";
  }
}

/**
 * Runs the full local analysis pipeline described in the architecture docs:
 * decode -> mono -> frame features -> activity/pause detection -> onset
 * detection -> tempo -> timing/dynamics scoring -> segment scoring ->
 * quality assessment. Each stage is synchronous CPU work; `onStage` lets
 * the UI reflect genuine progress rather than a fake delay.
 */
export async function analyzeSession(
  blob: Blob,
  profile: Pick<UserPracticeProfile, "longPauseThresholdSeconds" | "analysisSensitivity">,
  onStage?: (stage: AnalysisStage) => void
): Promise<PracticeAnalysis> {
  const startTime = performance.now();

  onStage?.("preparing-audio");
  let audioBuffer;
  try {
    audioBuffer = await decodeAudioBlob(blob);
  } catch (error) {
    if (error instanceof AudioDecodeError) throw new SessionAnalysisError(error.message, error);
    throw new SessionAnalysisError("The recording could not be prepared for analysis.", error);
  }
  const samples = toMonoSamples(audioBuffer);
  const durationSeconds = audioBuffer.duration;
  const { frames, sampleRate, frameSize, hopSize } = extractFrameFeatures(samples, audioBuffer.sampleRate);
  const hopSizeSeconds = hopSize / sampleRate;

  onStage?.("detecting-activity");
  const activity = detectActivity(
    frames,
    hopSizeSeconds,
    profile.longPauseThresholdSeconds,
    profile.analysisSensitivity
  );
  const activePlayingSeconds = activity.activeRegions.reduce(
    (sum, r) => sum + (r.endSeconds - r.startSeconds),
    0
  );

  onStage?.("estimating-pulse");
  const onsets = detectOnsets(frames, hopSizeSeconds);
  const tempo = estimateTempo(onsets);

  onStage?.("measuring-consistency");
  const timing = analyseTiming(onsets, tempo, durationSeconds);
  const dynamics = analyseDynamics(onsets, frames, activity.activeRegions);
  const { segments } = analyseSegments({
    durationSeconds,
    frames,
    activeRegions: activity.activeRegions,
    pauseSegments: activity.pauseSegments,
    onsets,
    tempo,
    noiseFloorRms: activity.noiseFloorRms,
  });
  const recordingQuality = assessRecordingQuality({
    frames,
    activePlayingSeconds,
    noiseFloorRms: activity.noiseFloorRms,
    pauseSegments: activity.pauseSegments,
  });

  onStage?.("generating-notes");
  const evidence: AnalysisEvidence[] = [];
  evidence.push({
    id: "active-ratio",
    label: "Active playing",
    detail: `${Math.round(activePlayingSeconds)}s of ${Math.round(durationSeconds)}s contained detected playing.`,
  });
  if (tempo.bpm && tempo.confidence >= 0.35) {
    evidence.push({
      id: "tempo",
      label: "Estimated tempo",
      detail: `A pulse near ${tempo.bpm} BPM was detected with ${Math.round(tempo.confidence * 100)}% confidence.`,
    });
  }
  activity.pauseSegments.forEach((segment, i) => {
    evidence.push({
      id: `pause-${i}`,
      label: "Long pause",
      detail: `Paused for ${(segment.endSeconds - segment.startSeconds).toFixed(1)}s.`,
      segment,
    });
  });

  const processingTimeMs = performance.now() - startTime;

  return {
    durationSeconds,
    activePlayingSeconds,
    activePlayingRatio: durationSeconds > 0 ? activePlayingSeconds / durationSeconds : 0,
    recordingQuality,
    tempo,
    timing,
    dynamics,
    pauses: {
      count: activity.pauseSegments.length,
      totalDurationSeconds: activity.pauseSegments.reduce((s, p) => s + (p.endSeconds - p.startSeconds), 0),
      segments: activity.pauseSegments,
      repeatedAttemptClusters: activity.repeatedAttemptClusters,
    },
    segments,
    evidence,
    onsets,
    diagnostics: {
      frameCount: frames.length,
      frameSizeSamples: frameSize,
      hopSizeSamples: hopSize,
      sampleRate,
      noiseFloorRms: activity.noiseFloorRms,
      processingTimeMs,
    },
  };
}

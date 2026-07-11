import { v4 as uuidv4 } from "uuid";
import type { PracticeSession, UserPracticeProfile } from "@/lib/types";
import { analyzeSession } from "@/lib/analysis/analyzeSession";
import { RuleBasedPracticeCoachProvider } from "@/lib/coaching/ruleBasedCoachProvider";
import { encodeWavMono } from "./wavEncoder";
import {
  DEMO_SAMPLE_RATE,
  generateClickTrack,
  generateClickTrackWithPauses,
  generateClippedClickTrack,
} from "./syntheticAudio";

interface DemoScenario {
  title: string;
  intention: PracticeSession["intention"];
  buildSamples: () => Float32Array;
  /** How many days before now this session should appear to have happened,
   * so demo data shows a realistic spread across the progress trends
   * instead of five sessions all stamped with the same instant. */
  daysAgo: number;
}

const SCENARIOS: DemoScenario[] = [
  {
    title: "Demo: steady strumming",
    intention: "timing",
    buildSamples: () => generateClickTrack({ bpm: 92, durationSeconds: 45, amplitudeJitter: 0.15 }),
    daysAgo: 0,
  },
  {
    title: "Demo: inconsistent timing",
    intention: "songPractice",
    buildSamples: () => generateClickTrack({ bpm: 100, durationSeconds: 45, driftPerSecond: 0.9, amplitudeJitter: 0.3 }),
    daysAgo: 4,
  },
  {
    title: "Demo: frequent pauses",
    intention: "chordChanges",
    buildSamples: () =>
      generateClickTrackWithPauses({
        bpm: 88,
        durationSeconds: 50,
        amplitudeJitter: 0.2,
        pauses: [
          { atSeconds: 10, durationSeconds: 4 },
          { atSeconds: 22, durationSeconds: 5 },
          { atSeconds: 34, durationSeconds: 4.5 },
        ],
      }),
    daysAgo: 9,
  },
  {
    title: "Demo: uneven dynamics",
    intention: "picking",
    buildSamples: () => generateClickTrack({ bpm: 96, durationSeconds: 45, amplitudeJitter: 1.3 }),
    daysAgo: 16,
  },
  {
    title: "Demo: poor recording quality",
    intention: "general",
    buildSamples: () => generateClippedClickTrack({ bpm: 90, durationSeconds: 40, amplitudeJitter: 0.4 }),
    daysAgo: 23,
  },
];

/**
 * Builds demo sessions by running fully synthetic audio through the same
 * analysis + coaching pipeline as a real recording (nothing here is
 * hand-authored to look good) — useful for exercising the app end-to-end
 * without microphone access, e.g. in CI or a browser without a mic.
 */
export async function generateDemoSessions(
  profile: Pick<UserPracticeProfile, "longPauseThresholdSeconds" | "analysisSensitivity">
): Promise<PracticeSession[]> {
  const coach = new RuleBasedPracticeCoachProvider();
  const sessions: PracticeSession[] = [];

  for (const scenario of SCENARIOS) {
    const samples = scenario.buildSamples();
    const blob = encodeWavMono(samples, DEMO_SAMPLE_RATE);
    const analysis = await analyzeSession(blob, profile);
    const coaching = await coach.generateCoaching(analysis, {
      ...profile,
      recordingQuality: "standard",
      excludeMetronomeOrBackingTrack: false,
      developerMode: false,
    });

    const createdAt = Date.now() - scenario.daysAgo * 24 * 60 * 60 * 1000;
    sessions.push({
      id: uuidv4(),
      title: scenario.title,
      createdAt,
      updatedAt: createdAt,
      durationSeconds: analysis.durationSeconds,
      intention: scenario.intention,
      song: null,
      notes: "",
      audioBlob: blob,
      audioMimeType: "audio/wav",
      analysis,
      coaching,
      isDemo: true,
    });
  }

  return sessions;
}

import type { PracticeAnalysis, PracticeSession } from "@/lib/types";

export function makeAnalysis(overrides: Partial<PracticeAnalysis> = {}): PracticeAnalysis {
  return {
    durationSeconds: 120,
    activePlayingSeconds: 100,
    activePlayingRatio: 100 / 120,
    recordingQuality: {
      score: 90,
      clippingDetected: false,
      lowInputDetected: false,
      highNoiseDetected: false,
      possibleBackingMusic: false,
      insufficientDuration: false,
      confidence: 0.9,
      warnings: [],
    },
    tempo: { bpm: 96, confidence: 0.8 },
    timing: {
      score: 80,
      confidence: 0.8,
      firstHalfScore: 85,
      secondHalfScore: 75,
      strongestSegment: { startSeconds: 0, endSeconds: 20 },
      weakestSegment: { startSeconds: 80, endSeconds: 100 },
      driftDescription: "Timing consistency stayed fairly stable across the session.",
    },
    dynamics: {
      score: 70,
      confidence: 0.7,
      variation: 0.3,
      averageAttackStrength: 0.5,
      clippingEvents: 0,
      quietSectionSeconds: 0,
    },
    pauses: { count: 1, totalDurationSeconds: 4, segments: [{ startSeconds: 40, endSeconds: 44 }], repeatedAttemptClusters: [] },
    segments: [],
    evidence: [],
    onsets: [],
    diagnostics: {
      frameCount: 1000,
      frameSizeSamples: 2048,
      hopSizeSamples: 512,
      sampleRate: 44100,
      noiseFloorRms: 0.01,
      processingTimeMs: 50,
    },
    ...overrides,
  };
}

export function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "test-session-1",
    title: "Test Session",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationSeconds: 120,
    intention: "general",
    song: null,
    notes: "",
    audioBlob: null,
    audioMimeType: null,
    analysis: null,
    coaching: null,
    isDemo: false,
    ...overrides,
  };
}

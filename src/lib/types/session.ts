import type { PracticeAnalysis } from "./analysis";
import type { CoachingResult } from "./coaching";

export type PracticeIntention =
  | "timing"
  | "chordChanges"
  | "improvisation"
  | "songPractice"
  | "picking"
  | "general";

export const PRACTICE_INTENTIONS: { value: PracticeIntention; label: string }[] = [
  { value: "timing", label: "Timing" },
  { value: "chordChanges", label: "Chord changes" },
  { value: "improvisation", label: "Improvisation" },
  { value: "songPractice", label: "Song practice" },
  { value: "picking", label: "Picking" },
  { value: "general", label: "General practice" },
];

export interface SongInfo {
  title?: string;
  artist?: string;
  section?: string;
  /** 1-5 */
  difficulty?: number;
  goal?: string;
  referenceUrl?: string;
}

export type RecordingQualitySetting = "standard" | "high";

export interface PracticeSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  durationSeconds: number;
  intention: PracticeIntention | null;
  song: SongInfo | null;
  notes: string;
  /** Audio recording, stored as a Blob in IndexedDB. Absent if audio was discarded. */
  audioBlob: Blob | null;
  audioMimeType: string | null;
  analysis: PracticeAnalysis | null;
  coaching: CoachingResult | null;
  isDemo: boolean;
}

export interface UserPracticeProfile {
  longPauseThresholdSeconds: number;
  analysisSensitivity: "low" | "standard" | "high";
  recordingQuality: RecordingQualitySetting;
  excludeMetronomeOrBackingTrack: boolean;
  developerMode: boolean;
}

export const DEFAULT_USER_PROFILE: UserPracticeProfile = {
  longPauseThresholdSeconds: 3,
  analysisSensitivity: "standard",
  recordingQuality: "standard",
  excludeMetronomeOrBackingTrack: false,
  developerMode: false,
};

import type { PracticeAnalysis } from "./analysis";
import type { CoachingResult } from "./coaching";
import type { MusicAnalysisResult } from "./musicAnalysis";
import type { ReferenceMaterial } from "./referenceMaterial";
import type { SpotifyReference } from "./spotifyReference";

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

/**
 * Free Practice: the app has no expected musical reference and only
 * describes what it measured ("likely note", "possible chord").
 * Reference Practice: the user has manually supplied expected material
 * (see ReferenceMaterial) that detected playing can be compared against,
 * still only ever approximately.
 */
export type PracticeMode = "free" | "reference";

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

  /** Defaults to "free" for sessions created before this field existed. */
  practiceMode?: PracticeMode;
  referenceMaterial?: ReferenceMaterial | null;
  spotifyReference?: SpotifyReference | null;
  /** Note/chord/issue-level analysis (separate, heavier pass — see MusicAnalysisResult). */
  musicAnalysis?: MusicAnalysisResult | null;
  /** If this session was recorded as a retry of a specific practice issue,
   * the id of the session it was retried from, for RetryComparisonService. */
  retryOfSessionId?: string | null;
  /** The specific issue id (within the original session) this retry targets. */
  retryOfIssueId?: string | null;
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

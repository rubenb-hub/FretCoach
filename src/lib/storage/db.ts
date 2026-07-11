import Dexie, { type Table } from "dexie";
import type {
  PracticeAnalysis,
  CoachingResult,
  PracticeIntention,
  SongInfo,
  PracticeMode,
  ReferenceMaterial,
  SpotifyReference,
  MusicAnalysisResult,
  UserDetectionFeedback,
} from "@/lib/types";

/**
 * The row shape stored in IndexedDB. This mirrors PracticeSession but keeps
 * the audio Blob and JSON-shaped fields flat so Dexie can index the columns
 * we actually query on (createdAt, intention).
 */
export interface PracticeSessionRow {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  durationSeconds: number;
  intention: PracticeIntention | null;
  song: SongInfo | null;
  notes: string;
  audioBlob: Blob | null;
  audioMimeType: string | null;
  analysis: PracticeAnalysis | null;
  coaching: CoachingResult | null;
  isDemo: boolean;
  practiceMode?: PracticeMode;
  referenceMaterial?: ReferenceMaterial | null;
  spotifyReference?: SpotifyReference | null;
  musicAnalysis?: MusicAnalysisResult | null;
  retryOfSessionId?: string | null;
  retryOfIssueId?: string | null;
}

/** issueId is the primary key: feedback is a per-issue toggle ("yes" /
 * "no" / "unsure"), not an append-only log, so a new response for the
 * same issue simply replaces the old one. */
export type FeedbackRow = UserDetectionFeedback;

class FretCoachDatabase extends Dexie {
  sessions!: Table<PracticeSessionRow, string>;
  feedback!: Table<FeedbackRow, string>;

  constructor() {
    super("fretcoach");
    this.version(1).stores({
      // id is the primary key; createdAt/intention/isDemo are indexed for
      // history filtering and progress aggregation.
      sessions: "id, createdAt, intention, isDemo",
    });
    this.version(2).stores({
      sessions: "id, createdAt, intention, isDemo",
      feedback: "issueId, createdAt",
    });
  }
}

let dbInstance: FretCoachDatabase | null = null;

/** Lazily construct the Dexie database. Guards against SSR (no `indexedDB`). */
export function getDb(): FretCoachDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment.");
  }
  if (!dbInstance) {
    dbInstance = new FretCoachDatabase();
  }
  return dbInstance;
}

export function isIndexedDbAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

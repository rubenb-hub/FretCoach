import Dexie, { type Table } from "dexie";
import type {
  PracticeAnalysis,
  CoachingResult,
  PracticeIntention,
  SongInfo,
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
}

class FretCoachDatabase extends Dexie {
  sessions!: Table<PracticeSessionRow, string>;

  constructor() {
    super("fretcoach");
    this.version(1).stores({
      // id is the primary key; createdAt/intention/isDemo are indexed for
      // history filtering and progress aggregation.
      sessions: "id, createdAt, intention, isDemo",
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

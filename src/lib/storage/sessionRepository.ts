import type { PracticeSession } from "@/lib/types";
import { getDb, isIndexedDbAvailable, type PracticeSessionRow } from "./db";

/** Storage-layer errors are wrapped so the UI can show recovery guidance. */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly kind: "unavailable" | "quota" | "corrupt" | "unknown" = "unknown"
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export interface SessionRepository {
  create(session: PracticeSession): Promise<void>;
  update(session: PracticeSession): Promise<void>;
  getById(id: string): Promise<PracticeSession | null>;
  list(): Promise<PracticeSession[]>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
}

function toRow(session: PracticeSession): PracticeSessionRow {
  return { ...session };
}

function toSession(row: PracticeSessionRow): PracticeSession {
  return { ...row };
}

function wrapError(error: unknown): StorageError {
  if (error instanceof StorageError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/quota/i.test(message)) {
    return new StorageError(
      "Storage quota exceeded. Free up space by deleting old sessions.",
      error,
      "quota"
    );
  }
  return new StorageError("A local storage error occurred.", error, "unknown");
}

class DexieSessionRepository implements SessionRepository {
  async create(session: PracticeSession): Promise<void> {
    if (!isIndexedDbAvailable()) {
      throw new StorageError("Local storage is not available in this browser.", undefined, "unavailable");
    }
    try {
      await getDb().sessions.add(toRow(session));
    } catch (error) {
      throw wrapError(error);
    }
  }

  async update(session: PracticeSession): Promise<void> {
    try {
      await getDb().sessions.put(toRow(session));
    } catch (error) {
      throw wrapError(error);
    }
  }

  async getById(id: string): Promise<PracticeSession | null> {
    try {
      const row = await getDb().sessions.get(id);
      return row ? toSession(row) : null;
    } catch (error) {
      throw wrapError(error);
    }
  }

  async list(): Promise<PracticeSession[]> {
    try {
      const rows = await getDb().sessions.orderBy("createdAt").reverse().toArray();
      return rows.map(toSession);
    } catch (error) {
      throw wrapError(error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await getDb().sessions.delete(id);
    } catch (error) {
      throw wrapError(error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await getDb().sessions.clear();
    } catch (error) {
      throw wrapError(error);
    }
  }
}

let repositoryInstance: SessionRepository | null = null;

export function getSessionRepository(): SessionRepository {
  if (!repositoryInstance) {
    repositoryInstance = new DexieSessionRepository();
  }
  return repositoryInstance;
}

import type { UserDetectionFeedback, FeedbackResponse } from "@/lib/types";
import { getDb } from "@/lib/storage/db";

/**
 * Stores user feedback on individual detections (fret-buzz, note-clarity,
 * etc.) locally only — see FEATURE 6/18: nothing here is uploaded. This
 * exists specifically so thresholds can eventually be tuned against real
 * feedback (see TrainingDataUploadProvider below for the deliberately
 * disabled future opt-in path).
 */
export interface LocalFeedbackRepository {
  recordFeedback(issueId: string, response: FeedbackResponse): Promise<void>;
  getFeedback(issueId: string): Promise<UserDetectionFeedback | null>;
  listFeedback(): Promise<UserDetectionFeedback[]>;
  clearAll(): Promise<void>;
}

class DexieFeedbackRepository implements LocalFeedbackRepository {
  async recordFeedback(issueId: string, response: FeedbackResponse): Promise<void> {
    await getDb().feedback.put({ issueId, response, createdAt: new Date().toISOString() });
  }

  async getFeedback(issueId: string): Promise<UserDetectionFeedback | null> {
    const row = await getDb().feedback.get(issueId);
    return row ?? null;
  }

  async listFeedback(): Promise<UserDetectionFeedback[]> {
    return getDb().feedback.toArray();
  }

  async clearAll(): Promise<void> {
    await getDb().feedback.clear();
  }
}

let repositoryInstance: LocalFeedbackRepository | null = null;

export function getFeedbackRepository(): LocalFeedbackRepository {
  if (!repositoryInstance) repositoryInstance = new DexieFeedbackRepository();
  return repositoryInstance;
}

/**
 * Deliberately disabled placeholder for a possible future opt-in path
 * where a user could choose to contribute anonymised feedback/features
 * (never raw audio) to help tune detection thresholds. Not implemented,
 * not called anywhere, and must stay that way unless a real opt-in flow
 * and backend are built — see FEATURE 6 / FEATURE 18.
 */
export interface TrainingDataUploadProvider {
  uploadAnonymisedFeedback(): Promise<void>;
}

export class DisabledTrainingDataUploadProvider implements TrainingDataUploadProvider {
  async uploadAnonymisedFeedback(): Promise<void> {
    throw new Error(
      "Training-data upload is not implemented. FretCoach does not upload recordings or feedback in this version."
    );
  }
}

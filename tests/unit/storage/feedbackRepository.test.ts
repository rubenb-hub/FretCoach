import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getFeedbackRepository } from "@/lib/feedback/feedbackRepository";
import { getDb } from "@/lib/storage/db";

describe("LocalFeedbackRepository", () => {
  beforeEach(async () => {
    await getDb().feedback.clear();
  });
  afterEach(async () => {
    await getDb().feedback.clear();
  });

  it("records and retrieves feedback for an issue", async () => {
    const repo = getFeedbackRepository();
    await repo.recordFeedback("issue-1", "correct");
    const feedback = await repo.getFeedback("issue-1");
    expect(feedback?.response).toBe("correct");
    expect(feedback?.issueId).toBe("issue-1");
  });

  it("returns null for an issue with no feedback", async () => {
    const repo = getFeedbackRepository();
    expect(await repo.getFeedback("nonexistent")).toBeNull();
  });

  it("overwrites previous feedback for the same issue rather than appending", async () => {
    const repo = getFeedbackRepository();
    await repo.recordFeedback("issue-1", "correct");
    await repo.recordFeedback("issue-1", "incorrect");
    const all = await repo.listFeedback();
    expect(all.filter((f) => f.issueId === "issue-1")).toHaveLength(1);
    expect((await repo.getFeedback("issue-1"))?.response).toBe("incorrect");
  });

  it("lists feedback across multiple issues", async () => {
    const repo = getFeedbackRepository();
    await repo.recordFeedback("issue-1", "correct");
    await repo.recordFeedback("issue-2", "unsure");
    const all = await repo.listFeedback();
    expect(all).toHaveLength(2);
  });

  it("clears all feedback", async () => {
    const repo = getFeedbackRepository();
    await repo.recordFeedback("issue-1", "correct");
    await repo.clearAll();
    expect(await repo.listFeedback()).toHaveLength(0);
  });
});

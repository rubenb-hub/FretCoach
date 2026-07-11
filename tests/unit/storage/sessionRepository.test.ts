import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { getDb } from "@/lib/storage/db";
import { makeSession } from "../../fixtures/analysisFixtures";

describe("SessionRepository (Dexie/IndexedDB)", () => {
  beforeEach(async () => {
    await getDb().sessions.clear();
  });

  afterEach(async () => {
    await getDb().sessions.clear();
  });

  it("creates and retrieves a session by id", async () => {
    const repo = getSessionRepository();
    const session = makeSession({ id: "s1", title: "Morning practice" });
    await repo.create(session);

    const fetched = await repo.getById("s1");
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Morning practice");
  });

  it("lists sessions newest first", async () => {
    const repo = getSessionRepository();
    await repo.create(makeSession({ id: "a", createdAt: 1000 }));
    await repo.create(makeSession({ id: "b", createdAt: 3000 }));
    await repo.create(makeSession({ id: "c", createdAt: 2000 }));

    const sessions = await repo.list();
    expect(sessions.map((s) => s.id)).toEqual(["b", "c", "a"]);
  });

  it("updates a session's notes and title", async () => {
    const repo = getSessionRepository();
    const session = makeSession({ id: "s1" });
    await repo.create(session);

    await repo.update({ ...session, title: "Renamed", notes: "Focus on the bridge" });
    const fetched = await repo.getById("s1");
    expect(fetched?.title).toBe("Renamed");
    expect(fetched?.notes).toBe("Focus on the bridge");
  });

  it("deletes a session", async () => {
    const repo = getSessionRepository();
    await repo.create(makeSession({ id: "s1" }));
    await repo.delete("s1");
    expect(await repo.getById("s1")).toBeNull();
  });

  it("clears all sessions", async () => {
    const repo = getSessionRepository();
    await repo.create(makeSession({ id: "s1" }));
    await repo.create(makeSession({ id: "s2" }));
    await repo.clearAll();
    expect(await repo.list()).toHaveLength(0);
  });

  it("persists an audio blob alongside metadata", async () => {
    const repo = getSessionRepository();
    const blob = new Blob(["fake audio bytes"], { type: "audio/webm" });
    await repo.create(makeSession({ id: "s1", audioBlob: blob, audioMimeType: "audio/webm" }));

    const fetched = await repo.getById("s1");
    expect(fetched?.audioBlob).not.toBeNull();
    expect(fetched?.audioMimeType).toBe("audio/webm");
  });
});

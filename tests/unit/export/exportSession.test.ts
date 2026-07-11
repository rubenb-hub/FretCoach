import { describe, expect, it } from "vitest";
import { sessionToMetadataJson, allSessionsToMetadataJson } from "@/lib/export/exportSession";
import { makeSession } from "../../fixtures/analysisFixtures";

describe("session export", () => {
  it("excludes the audio blob from a single session's exported JSON", () => {
    const session = makeSession({ audioBlob: new Blob(["audio"], { type: "audio/webm" }) });
    const json = sessionToMetadataJson(session);
    const parsed = JSON.parse(json);
    expect(parsed.audioBlob).toBeUndefined();
    expect(parsed.id).toBe(session.id);
    expect(parsed.title).toBe(session.title);
  });

  it("excludes audio blobs from every session in a bulk export", () => {
    const sessions = [
      makeSession({ id: "a", audioBlob: new Blob(["1"]) }),
      makeSession({ id: "b", audioBlob: new Blob(["2"]) }),
    ];
    const parsed = JSON.parse(allSessionsToMetadataJson(sessions));
    expect(parsed).toHaveLength(2);
    expect(parsed.every((s: Record<string, unknown>) => s.audioBlob === undefined)).toBe(true);
    expect(parsed.map((s: Record<string, unknown>) => s.id)).toEqual(["a", "b"]);
  });
});

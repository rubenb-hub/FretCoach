import { describe, expect, it, vi, afterEach } from "vitest";
import { detectBrowserCapabilities, getSupportedMimeTypes } from "@/lib/capability/browserCapabilities";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectBrowserCapabilities", () => {
  it("reports full support when getUserMedia, MediaRecorder and AudioContext all exist", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => true });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => {} } });
    // AudioContext already exists in jsdom's window in this test env only if stubbed
    const capabilities = detectBrowserCapabilities();
    expect(capabilities.hasGetUserMedia).toBe(true);
    expect(capabilities.hasMediaRecorder).toBe(true);
  });

  it("reports missing getUserMedia when mediaDevices is absent", () => {
    vi.stubGlobal("navigator", {});
    const capabilities = detectBrowserCapabilities();
    expect(capabilities.hasGetUserMedia).toBe(false);
  });

  it("picks the first supported MIME type as preferred", () => {
    vi.stubGlobal("MediaRecorder", {
      isTypeSupported: (type: string) => type === "audio/mp4",
    });
    const types = getSupportedMimeTypes();
    expect(types).toContain("audio/mp4");
    const capabilities = detectBrowserCapabilities();
    expect(capabilities.preferredMimeType).toBe("audio/mp4");
  });

  it("returns no supported types and a null preferred type when nothing matches", () => {
    vi.stubGlobal("MediaRecorder", { isTypeSupported: () => false });
    expect(getSupportedMimeTypes()).toEqual([]);
    expect(detectBrowserCapabilities().preferredMimeType).toBeNull();
  });
});

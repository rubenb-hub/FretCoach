import { describe, expect, it, vi, beforeEach } from "vitest";
import { MediaRecorderAudioService } from "@/lib/recording/audioRecorderService";
import { RecordingError } from "@/lib/recording/errors";

class FakeTrack {
  stopped = false;
  stop() {
    this.stopped = true;
  }
}

class FakeStream {
  tracks: FakeTrack[];
  constructor() {
    this.tracks = [new FakeTrack()];
  }
  getTracks() {
    return this.tracks;
  }
}

class FakeMediaRecorder {
  static isTypeSupported = vi.fn(() => true);
  state: "inactive" | "recording" | "paused" = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;

  constructor(public stream: FakeStream) {}

  start() {
    this.state = "recording";
    this.ondataavailable?.({ data: new Blob(["chunk"], { type: "audio/webm" }) });
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

beforeEach(() => {
  vi.stubGlobal("MediaRecorder", FakeMediaRecorder as unknown as typeof MediaRecorder);
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn(async () => new FakeStream() as unknown as MediaStream),
    },
  });
});

describe("MediaRecorderAudioService", () => {
  it("transitions idle -> recording -> paused -> recording -> stopped", async () => {
    const service = new MediaRecorderAudioService();
    expect(service.getState()).toBe("idle");

    await service.start();
    expect(service.getState()).toBe("recording");

    service.pause();
    expect(service.getState()).toBe("paused");

    service.resume();
    expect(service.getState()).toBe("recording");

    const result = await service.stop();
    expect(service.getState()).toBe("stopped");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.mimeType).toBe("audio/webm;codecs=opus");
  });

  it("releases all media tracks when stopped", async () => {
    const service = new MediaRecorderAudioService();
    await service.start();
    const stream = service.getStream() as unknown as FakeStream;
    await service.stop();
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
  });

  it("releases tracks and resets state on cancel", async () => {
    const service = new MediaRecorderAudioService();
    await service.start();
    const stream = service.getStream() as unknown as FakeStream;
    await service.cancel();
    expect(stream.tracks.every((t) => t.stopped)).toBe(true);
    expect(service.getState()).toBe("idle");
  });

  it("maps a permission-denied getUserMedia rejection to a friendly RecordingError", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw new DOMException("denied", "NotAllowedError");
        }),
      },
    });
    const service = new MediaRecorderAudioService();
    await expect(service.start()).rejects.toMatchObject({
      kind: "permission-denied",
    } satisfies Partial<RecordingError>);
  });

  it("maps a no-microphone getUserMedia rejection to a friendly RecordingError", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn(async () => {
          throw new DOMException("none", "NotFoundError");
        }),
      },
    });
    const service = new MediaRecorderAudioService();
    await expect(service.start()).rejects.toMatchObject({ kind: "no-microphone" });
  });

  it("throws stopping when never started", async () => {
    const service = new MediaRecorderAudioService();
    await expect(service.stop()).rejects.toBeInstanceOf(RecordingError);
  });
});

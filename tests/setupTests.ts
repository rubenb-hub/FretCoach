import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Vitest doesn't expose `afterEach` as a true global unless test.globals is
// set, which is what React Testing Library's auto-cleanup relies on. Wiring
// it up explicitly here keeps every component test isolated without
// changing the project's test API surface.
afterEach(() => {
  cleanup();
});

// jsdom doesn't implement real media playback; stub these so component
// tests that render an <audio> element don't spam "not implemented"
// warnings or throw on play()/pause() calls.
if (typeof window !== "undefined" && window.HTMLMediaElement) {
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLMediaElement.prototype.pause = () => {};
}


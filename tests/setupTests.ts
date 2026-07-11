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

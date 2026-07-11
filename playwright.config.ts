import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      // A hand-set iPhone-sized viewport + Safari UA rather than the
      // `devices["iPhone 13"]` preset: that preset's isMobile/hasTouch
      // emulation triggers a CDP code path some older Chromium builds
      // (as pinned in sandboxed/offline environments) close on immediately.
      // The viewport/UA combination below still exercises the app's
      // mobile-first layout without depending on that emulation mode.
      name: "mobile-safari-viewport",
      use: {
        viewport: { width: 390, height: 844 },
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
        },
      },
    },
  ],
});

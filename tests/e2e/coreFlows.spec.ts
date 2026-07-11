import { test, expect } from "@playwright/test";

test.describe("FretCoach core flows", () => {
  test("home page loads with the primary call to action", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "FretCoach" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Start Practice Session/i })).toBeVisible();
  });

  test("bottom navigation reaches every primary screen", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await nav.getByRole("link", { name: "History" }).click();
    await expect(page).toHaveURL(/\/history/);
    await nav.getByRole("link", { name: "Progress" }).click();
    await expect(page).toHaveURL(/\/progress/);
    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page).toHaveURL(/\/settings/);
    await nav.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("demo mode populates history, home, and progress without a microphone", async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Load demo sessions" }).click();
    await expect(page.getByRole("button", { name: "Remove demo sessions" })).toBeVisible({ timeout: 60_000 });

    await page.goto("/history");
    await expect(page.getByText(/Demo:/).first()).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("Last session")).toBeVisible();

    await page.goto("/progress");
    await expect(page.getByText("Practice time per week")).toBeVisible();
  });

  test("a full recording session can be recorded, analysed, and saved", async ({ page, context }) => {
    await context.grantPermissions(["microphone"]);
    await page.goto("/record");

    await page.getByRole("button", { name: /Begin Recording/i }).click();
    await expect(page.getByText("Recording")).toBeVisible();

    // Let a few seconds of fake audio accumulate before finishing.
    await page.waitForTimeout(3000);
    await page.getByRole("button", { name: "Finish Session" }).click();

    await expect(page.getByRole("button", { name: "Save to practice diary" })).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Save to practice diary" }).click();

    await expect(page).toHaveURL(/\/session\//);
    await expect(page.getByRole("button", { name: "Delete session" })).toBeVisible();
  });

  test("privacy and install information is reachable from settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText(/Recordings and analysis stay on this device/)).toBeVisible();
    await page.getByRole("link", { name: /Install FretCoach/i }).click();
    await expect(page).toHaveURL(/\/install/);
    await expect(page.getByText(/Add to Home Screen/)).toBeVisible();
  });
});

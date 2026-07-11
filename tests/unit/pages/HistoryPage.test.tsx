import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPage from "@/app/history/page";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { getDb } from "@/lib/storage/db";
import { makeSession } from "../../fixtures/analysisFixtures";

describe("HistoryPage", () => {
  beforeEach(async () => {
    await getDb().sessions.clear();
  });
  afterEach(async () => {
    await getDb().sessions.clear();
  });

  it("shows a helpful empty state with no saved sessions", async () => {
    render(<HistoryPage />);
    expect(await screen.findByText("No sessions yet")).toBeInTheDocument();
  });

  it("lists saved sessions once loaded", async () => {
    const repo = getSessionRepository();
    await repo.create(makeSession({ id: "s1", title: "Morning practice", intention: "timing" }));
    await repo.create(makeSession({ id: "s2", title: "Evening practice", intention: "picking" }));

    render(<HistoryPage />);
    expect(await screen.findByText("Morning practice")).toBeInTheDocument();
    expect(screen.getByText("Evening practice")).toBeInTheDocument();
  });

  it("filters sessions by practice intention", async () => {
    const repo = getSessionRepository();
    await repo.create(makeSession({ id: "s1", title: "Morning practice", intention: "timing" }));
    await repo.create(makeSession({ id: "s2", title: "Evening practice", intention: "picking" }));

    render(<HistoryPage />);
    await screen.findByText("Morning practice");

    const intentionSelect = screen.getByLabelText("Intention");
    await userEvent.selectOptions(intentionSelect, "Picking");

    expect(screen.queryByText("Morning practice")).not.toBeInTheDocument();
    expect(screen.getByText("Evening practice")).toBeInTheDocument();
  });

  it("deletes a session after confirming", async () => {
    const repo = getSessionRepository();
    await repo.create(makeSession({ id: "s1", title: "Morning practice" }));

    render(<HistoryPage />);
    await screen.findByText("Morning practice");

    await userEvent.click(screen.getByRole("button", { name: /Delete Morning practice/i }));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Morning practice")).not.toBeInTheDocument());
    expect(await repo.getById("s1")).toBeNull();
  });
});

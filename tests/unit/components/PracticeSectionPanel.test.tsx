import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PracticeSectionPanel } from "@/components/practice/PracticeSectionPanel";
import type { PracticeIssue } from "@/lib/types";

const issue: PracticeIssue = {
  id: "issue-1",
  startTime: 10,
  endTime: 12,
  playbackStartTime: 9.5,
  playbackEndTime: 12.5,
  category: "note_clarity",
  severity: "medium",
  confidence: 0.6,
  title: "Reduced note clarity",
  explanation: "This note sounded less clear than the rest.",
  tips: ["Play the note alone, slowly.", "Check finger placement."],
  contributingEventIds: [],
};

beforeEach(() => {
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn(async () => {
        throw new DOMException("no mic in this test environment", "NotFoundError");
      }),
    },
  });
  vi.stubGlobal("MediaRecorder", class {
    static isTypeSupported = () => true;
  });
});

describe("PracticeSectionPanel", () => {
  it("renders the original attempt player, coaching tips, and a retry button", () => {
    render(
      <PracticeSectionPanel issue={issue} originalAudioUrl="blob:fake" originalMusicAnalysis={null} onClose={() => {}} />
    );
    expect(screen.getByText("Reduced note clarity")).toBeInTheDocument();
    expect(screen.getByText(issue.explanation)).toBeInTheDocument();
    expect(screen.getByText("Play the note alone, slowly.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record another attempt" })).toBeInTheDocument();
  });

  it("calls onClose when the close button is pressed", async () => {
    const onClose = vi.fn();
    render(
      <PracticeSectionPanel issue={issue} originalAudioUrl="blob:fake" originalMusicAnalysis={null} onClose={onClose} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Close practice section" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a friendly error rather than crashing when the microphone is unavailable", async () => {
    render(
      <PracticeSectionPanel issue={issue} originalAudioUrl="blob:fake" originalMusicAnalysis={null} onClose={() => {}} />
    );
    // Uncheck count-in so we don't wait on the (unmocked) Web Audio count-in path.
    await userEvent.click(screen.getByLabelText("Enable count-in before retry recording"));
    await userEvent.click(screen.getByRole("button", { name: "Record another attempt" }));
    expect(await screen.findByText(/no microphone was found/i)).toBeInTheDocument();
  });
});

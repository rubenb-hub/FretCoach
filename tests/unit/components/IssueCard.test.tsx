import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IssueCard } from "@/components/issues/IssueCard";
import type { PracticeIssue } from "@/lib/types";

function makeIssue(overrides: Partial<PracticeIssue> = {}): PracticeIssue {
  return {
    id: "issue-1",
    startTime: 35.2,
    endTime: 39.8,
    playbackStartTime: 34.5,
    playbackEndTime: 40.5,
    category: "fret_buzz",
    severity: "medium",
    confidence: 0.65,
    title: "Possible fret buzz",
    explanation: "A brief metallic sound continued after the attack.",
    tips: ["Try playing each string individually.", "Check finger placement.", "Add a bit more pressure."],
    contributingEventIds: ["e1"],
    ...overrides,
  };
}

describe("IssueCard", () => {
  it("renders title, time range, confidence wording, explanation and tips", () => {
    render(
      <IssueCard
        issue={makeIssue()}
        selected={false}
        dismissed={false}
        feedback={null}
        onSelectAndPlay={() => {}}
        onSelectAndLoop={() => {}}
        onPractice={() => {}}
        onDismiss={() => {}}
        onFeedback={() => {}}
      />
    );
    expect(screen.getByText("Possible fret buzz")).toBeInTheDocument();
    expect(screen.getByText("Moderate confidence")).toBeInTheDocument();
    expect(screen.getByText(/metallic sound/)).toBeInTheDocument();
    expect(screen.getByText(/Try playing each string individually/)).toBeInTheDocument();
    expect(screen.queryByText("0.65")).not.toBeInTheDocument();
  });

  it("renders nothing when dismissed", () => {
    const { container } = render(
      <IssueCard
        issue={makeIssue()}
        selected={false}
        dismissed
        feedback={null}
        onSelectAndPlay={() => {}}
        onSelectAndLoop={() => {}}
        onPractice={() => {}}
        onDismiss={() => {}}
        onFeedback={() => {}}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("calls the play/loop/practice/dismiss handlers", async () => {
    const onSelectAndPlay = vi.fn();
    const onSelectAndLoop = vi.fn();
    const onPractice = vi.fn();
    const onDismiss = vi.fn();
    render(
      <IssueCard
        issue={makeIssue()}
        selected={false}
        dismissed={false}
        feedback={null}
        onSelectAndPlay={onSelectAndPlay}
        onSelectAndLoop={onSelectAndLoop}
        onPractice={onPractice}
        onDismiss={onDismiss}
        onFeedback={() => {}}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    await userEvent.click(screen.getByRole("button", { name: "Loop" }));
    await userEvent.click(screen.getByRole("button", { name: "Practise this section" }));
    await userEvent.click(screen.getByRole("button", { name: /Dismiss/ }));
    expect(onSelectAndPlay).toHaveBeenCalled();
    expect(onSelectAndLoop).toHaveBeenCalled();
    expect(onPractice).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("reports feedback responses", async () => {
    const onFeedback = vi.fn();
    render(
      <IssueCard
        issue={makeIssue()}
        selected={false}
        dismissed={false}
        feedback={null}
        onSelectAndPlay={() => {}}
        onSelectAndLoop={() => {}}
        onPractice={() => {}}
        onDismiss={() => {}}
        onFeedback={onFeedback}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Detection incorrect" }));
    expect(onFeedback).toHaveBeenCalledWith("incorrect");
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachingPanel } from "@/components/result/CoachingPanel";
import type { CoachingResult } from "@/lib/types";

const coaching: CoachingResult = {
  headline: "2 minutes of focused playing",
  summary: "60s of active playing out of 120s recorded (50%).",
  observations: [
    { id: "o1", category: "timing", text: "Your strongest section was around 0:10-0:30.", evidenceIds: [] },
  ],
  recommendedActions: [{ id: "a1", category: "timing", text: "Loop the weakest section slowly." }],
  nextSessionGoal: "Try a metronome next time.",
  confidenceNote: "Confidence was limited for: tempo.",
};

describe("CoachingPanel", () => {
  it("renders headline, observations, recommended actions and the next goal", () => {
    render(<CoachingPanel coaching={coaching} />);
    expect(screen.getByText(coaching.headline)).toBeInTheDocument();
    expect(screen.getByText(coaching.observations[0].text)).toBeInTheDocument();
    expect(screen.getByText(coaching.recommendedActions[0].text)).toBeInTheDocument();
    expect(screen.getByText(/Try a metronome next time\./)).toBeInTheDocument();
    expect(screen.getByText(coaching.confidenceNote as string)).toBeInTheDocument();
  });

  it("marks low-confidence observations", () => {
    render(
      <CoachingPanel
        coaching={{
          ...coaching,
          observations: [{ id: "o2", category: "tempo", text: "No reliable pulse found.", evidenceIds: [], lowConfidence: true }],
        }}
      />
    );
    expect(screen.getByText(/low confidence/)).toBeInTheDocument();
  });
});

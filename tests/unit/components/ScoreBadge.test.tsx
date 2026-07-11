import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

describe("ScoreBadge", () => {
  it("renders a plain-language descriptor alongside the numeric score", () => {
    render(<ScoreBadge label="Timing consistency" score={92} descriptor="highly consistent" />);
    expect(screen.getByText("Timing consistency")).toBeInTheDocument();
    expect(screen.getByText("highly consistent")).toBeInTheDocument();
    expect(screen.getByText("92/100")).toBeInTheDocument();
  });

  it("does not render a numeric score when the score is null", () => {
    render(<ScoreBadge label="Timing consistency" score={null} descriptor="not measured" />);
    expect(screen.getByText("not measured")).toBeInTheDocument();
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });
});

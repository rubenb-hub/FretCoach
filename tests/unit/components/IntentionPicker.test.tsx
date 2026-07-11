import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntentionPicker } from "@/components/recording/IntentionPicker";

describe("IntentionPicker", () => {
  it("renders all practice intentions as toggle chips", () => {
    render(<IntentionPicker value={null} onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Timing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Picking" })).toBeInTheDocument();
  });

  it("calls onChange with the selected value when a chip is tapped", async () => {
    const onChange = vi.fn();
    render(<IntentionPicker value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Timing" }));
    expect(onChange).toHaveBeenCalledWith("timing");
  });

  it("calls onChange with null when tapping the already-selected chip (deselect)", async () => {
    const onChange = vi.fn();
    render(<IntentionPicker value="timing" onChange={onChange} />);
    const button = screen.getByRole("button", { name: "Timing" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

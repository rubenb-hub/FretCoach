import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AudioSegmentPlayer } from "@/components/audio/AudioSegmentPlayer";

describe("AudioSegmentPlayer", () => {
  it("renders playback speed options and marks 1x as selected by default", () => {
    render(<AudioSegmentPlayer audioSource="blob:fake" startTime={35.2} endTime={39.8} />);
    const oneX = screen.getByRole("button", { name: "1x" });
    expect(oneX).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "0.5x" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the selected playback speed on tap", async () => {
    render(<AudioSegmentPlayer audioSource="blob:fake" startTime={0} endTime={10} />);
    await userEvent.click(screen.getByRole("button", { name: "0.75x" }));
    expect(screen.getByRole("button", { name: "0.75x" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "1x" })).toHaveAttribute("aria-pressed", "false");
  });

  it("toggles the loop switch", async () => {
    render(<AudioSegmentPlayer audioSource="blob:fake" startTime={0} endTime={10} loop={false} />);
    const loopSwitch = screen.getByRole("switch", { name: "Loop this section" });
    expect(loopSwitch).toHaveAttribute("aria-checked", "false");
    await userEvent.click(loopSwitch);
    expect(loopSwitch).toHaveAttribute("aria-checked", "true");
  });

  it("exposes a seek slider clamped to the section (plus any context padding)", () => {
    render(
      <AudioSegmentPlayer
        audioSource="blob:fake"
        startTime={35.2}
        endTime={39.8}
        contextBeforeSeconds={1}
        contextAfterSeconds={0.5}
      />
    );
    const slider = screen.getByRole("slider", { name: "Seek within section" });
    expect(slider).toHaveAttribute("min", "34.2");
    expect(slider).toHaveAttribute("max", "40.3");
  });

  it("toggles between Play and Pause labels", async () => {
    render(<AudioSegmentPlayer audioSource="blob:fake" startTime={0} endTime={5} />);
    const playButton = screen.getByRole("button", { name: "Play section" });
    await userEvent.click(playButton);
    expect(await screen.findByRole("button", { name: "Pause section" })).toBeInTheDocument();
  });
});

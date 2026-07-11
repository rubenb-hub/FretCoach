import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { RecordingErrorKind } from "@/lib/recording/errors";

interface RecordingErrorPanelProps {
  kind: RecordingErrorKind;
  message: string;
  onRetry: () => void;
}

const recoveryTips: Record<RecordingErrorKind, string[]> = {
  "permission-denied": [
    'Open iPhone Settings → Safari → Microphone (or tap the "aA" icon in the address bar) and allow access for this site.',
    "Reload the page after granting permission.",
  ],
  "no-microphone": [
    "Check that a microphone is connected or that this device has one built in.",
    "If you're using external audio hardware, confirm it's selected as the input device.",
  ],
  "unsupported-browser": [
    "Try the latest version of Safari (iPhone) or Chrome/Firefox/Edge (desktop).",
    "FretCoach needs microphone recording support, which some in-app browsers (e.g. within social apps) don't provide.",
  ],
  "recording-interrupted": [
    "This can happen if another app took over the microphone. Try again.",
    "Avoid switching apps while recording.",
  ],
  unknown: ["Try again. If the problem continues, restart your browser."],
};

export function RecordingErrorPanel({ kind, message, onRetry }: RecordingErrorPanelProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl" aria-hidden="true">
        🎤
      </div>
      <h2 className="text-lg font-semibold">Microphone unavailable</h2>
      <p className="max-w-xs text-sm text-foreground-muted">{message}</p>
      <ul className="max-w-xs list-disc space-y-1 pl-5 text-left text-xs text-foreground-muted">
        {recoveryTips[kind].map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={onRetry}>Try again</Button>
        <Link href="/" className="text-center text-sm text-foreground-muted">
          Back to home
        </Link>
      </div>
    </div>
  );
}

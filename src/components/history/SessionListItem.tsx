import Link from "next/link";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { timingLabel } from "@/lib/coaching/formatTime";
import { mainCoachingFocus, COACHING_CATEGORY_LABELS } from "@/lib/utils/coachingFocus";
import type { PracticeSession } from "@/lib/types";

export function SessionListItem({ session, onDelete }: { session: PracticeSession; onDelete: (id: string) => void }) {
  const focus = mainCoachingFocus(session);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <Link href={`/session/${session.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">{session.title}</span>
          <span className="shrink-0 text-xs text-foreground-muted">{formatDate(session.createdAt)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-muted">
          <span>{formatDuration(session.durationSeconds)}</span>
          {focus && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 font-medium">
              {COACHING_CATEGORY_LABELS[focus]}
            </span>
          )}
          {session.isDemo && <span className="rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">Demo</span>}
        </div>
        {session.analysis && (
          <span className="text-xs text-foreground-muted">Timing: {timingLabel(session.analysis.timing.score)}</span>
        )}
      </Link>
      <button
        onClick={() => onDelete(session.id)}
        aria-label={`Delete ${session.title}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground-muted active:bg-surface-muted"
      >
        🗑️
      </button>
    </li>
  );
}

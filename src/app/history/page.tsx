"use client";

import { useMemo, useState } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SessionListItem } from "@/components/history/SessionListItem";
import { useSessions } from "@/lib/hooks/useSessions";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { PRACTICE_INTENTIONS } from "@/lib/types";
import { COACHING_CATEGORY_LABELS, mainCoachingFocus } from "@/lib/utils/coachingFocus";

type DateFilter = "all" | "week" | "month";

export default function HistoryPage() {
  const { sessions, loading, error, refresh } = useSessions();
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [intentionFilter, setIntentionFilter] = useState<string>("all");
  const [focusFilter, setFocusFilter] = useState<string>("all");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // Captured once per mount via a lazy initializer rather than read fresh
  // on every render — "now" only needs to be roughly current for these
  // relative date filters, and reading it directly during render would be
  // an impure render (a fresh Date.now() every render).
  const [now] = useState(() => Date.now());

  const filtered = useMemo(() => {
    const cutoffs: Record<DateFilter, number> = {
      all: 0,
      week: now - 7 * 24 * 60 * 60 * 1000,
      month: now - 30 * 24 * 60 * 60 * 1000,
    };
    return sessions.filter((s) => {
      if (s.createdAt < cutoffs[dateFilter]) return false;
      if (intentionFilter !== "all" && s.intention !== intentionFilter) return false;
      if (focusFilter !== "all" && mainCoachingFocus(s) !== focusFilter) return false;
      return true;
    });
  }, [sessions, dateFilter, intentionFilter, focusFilter, now]);

  const handleDelete = async (id: string) => {
    await getSessionRepository().delete(id);
    await refresh();
  };

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Practice history</h1>
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Date"
          value={dateFilter}
          onChange={(v) => setDateFilter(v as DateFilter)}
          options={[
            { value: "all", label: "All time" },
            { value: "week", label: "Last 7 days" },
            { value: "month", label: "Last 30 days" },
          ]}
        />
        <FilterSelect
          label="Intention"
          value={intentionFilter}
          onChange={setIntentionFilter}
          options={[{ value: "all", label: "Any intention" }, ...PRACTICE_INTENTIONS]}
        />
        <FilterSelect
          label="Focus"
          value={focusFilter}
          onChange={setFocusFilter}
          options={[
            { value: "all", label: "Any focus" },
            ...Object.entries(COACHING_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="🗂️"
          title={sessions.length === 0 ? "No sessions yet" : "No sessions match these filters"}
          description={
            sessions.length === 0
              ? "Recorded sessions will appear here so you can revisit recordings and coaching notes."
              : "Try broadening your filters to see more sessions."
          }
        />
      )}

      {filtered.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filtered.map((session) => (
            <SessionListItem key={session.id} session={session} onDelete={setPendingDelete} />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this session?"
        description="This permanently removes the recording, analysis, and notes from this device."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (pendingDelete) void handleDelete(pendingDelete);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </PageContainer>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-border bg-surface px-2 text-xs text-foreground"
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

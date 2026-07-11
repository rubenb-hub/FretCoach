"use client";

import Link from "next/link";
import { useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useSessions } from "@/lib/hooks/useSessions";
import { computeStreak, totalPracticeSecondsThisWeek } from "@/lib/utils/stats";
import { formatDate, formatMinutes } from "@/lib/utils/format";
import { timingLabel } from "@/lib/coaching/formatTime";
import { PRACTICE_INTENTIONS } from "@/lib/types";
import { generateDemoSessions } from "@/lib/demo/demoSessions";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { useProfile } from "@/lib/state/ProfileProvider";
import { useState } from "react";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const { sessions, loading, error, refresh } = useSessions();
  const { profile } = useProfile();
  const [loadingDemo, setLoadingDemo] = useState(false);

  const loadDemo = async () => {
    setLoadingDemo(true);
    try {
      const demoSessions = await generateDemoSessions(profile);
      const repo = getSessionRepository();
      for (const session of demoSessions) await repo.create(session);
      await refresh();
    } finally {
      setLoadingDemo(false);
    }
  };

  const stats = useMemo(() => {
    const streak = computeStreak(sessions);
    const weekSeconds = totalPracticeSecondsThisWeek(sessions);
    const latest = sessions[0] ?? null;
    return { streak, weekSeconds, latest };
  }, [sessions]);

  const intentionLabel = (value: string | null) =>
    PRACTICE_INTENTIONS.find((i) => i.value === value)?.label ?? null;

  return (
    <PageContainer>
      <header className="flex flex-col gap-1 pt-2">
        <p className="text-sm font-medium text-foreground-muted">{greeting()}</p>
        <h1 className="text-3xl font-semibold tracking-tight">FretCoach</h1>
        <p className="text-sm text-foreground-muted">
          Play the songs you love. Get honest, evidence-based feedback on how the session actually went.
        </p>
      </header>

      {error && <ErrorBanner message={error} />}

      <Link href="/record" className="block">
        <Button size="lg" className="w-full text-lg shadow-lg shadow-primary/20">
          <span aria-hidden="true">🎙️</span> Start Practice Session
        </Button>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">Streak</span>
          <span className="text-2xl font-semibold">
            {stats.streak} day{stats.streak === 1 ? "" : "s"}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">This week</span>
          <span className="text-2xl font-semibold">{formatMinutes(stats.weekSeconds)}</span>
        </Card>
      </div>

      {!loading && !stats.latest && (
        <EmptyState
          icon="🎸"
          title="No sessions yet"
          description="Record your first practice session to start building your diary and get your first coaching notes."
          action={
            <Button variant="secondary" onClick={loadDemo} disabled={loadingDemo}>
              {loadingDemo ? "Loading demo…" : "Try demo mode instead"}
            </Button>
          }
        />
      )}

      {stats.latest && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Last session</h2>
            <span className="text-xs text-foreground-muted">{formatDate(stats.latest.createdAt)}</span>
          </div>
          <p className="text-sm">{stats.latest.title}</p>
          {stats.latest.analysis && (
            <p className="text-sm text-foreground-muted">
              Timing was {timingLabel(stats.latest.analysis.timing.score)}
              {stats.latest.coaching ? ` — ${stats.latest.coaching.headline.toLowerCase()}.` : "."}
            </p>
          )}
          {intentionLabel(stats.latest.intention) && (
            <span className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-medium">
              Focus: {intentionLabel(stats.latest.intention)}
            </span>
          )}
          <Link href={`/session/${stats.latest.id}`} className="text-sm font-medium text-primary">
            View session details →
          </Link>
        </Card>
      )}

      <Link href="/history" className="text-center text-sm font-medium text-primary">
        View all practice history →
      </Link>
    </PageContainer>
  );
}

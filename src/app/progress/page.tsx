"use client";

import { useMemo } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { WeeklyTimeChart } from "@/components/progress/WeeklyTimeChart";
import { TrendLineChart } from "@/components/progress/TrendLineChart";
import { useSessions } from "@/lib/hooks/useSessions";
import { computeStreak, computeWeeklyTrends, mostCommonIntention } from "@/lib/utils/stats";
import { formatMinutes } from "@/lib/utils/format";
import { PRACTICE_INTENTIONS } from "@/lib/types";

const MIN_SESSIONS_FOR_TRENDS = 3;

export default function ProgressPage() {
  const { sessions, loading } = useSessions();

  const { trends, streak, avgSessionSeconds, commonIntentionLabel, avgPauseCount } = useMemo(() => {
    const trends = computeWeeklyTrends(sessions);
    const streak = computeStreak(sessions);
    const avgSessionSeconds = sessions.length
      ? sessions.reduce((sum, s) => sum + s.durationSeconds, 0) / sessions.length
      : 0;
    const commonIntention = mostCommonIntention(sessions);
    const commonIntentionLabel = PRACTICE_INTENTIONS.find((i) => i.value === commonIntention)?.label ?? null;
    const pauseCounts = sessions.map((s) => s.analysis?.pauses.count ?? 0);
    const avgPauseCount = pauseCounts.length ? pauseCounts.reduce((a, b) => a + b, 0) / pauseCounts.length : 0;
    return { trends, streak, avgSessionSeconds, commonIntentionLabel, avgPauseCount };
  }, [sessions]);

  if (!loading && sessions.length < MIN_SESSIONS_FOR_TRENDS) {
    return (
      <PageContainer>
        <h1 className="text-2xl font-semibold">Progress</h1>
        <EmptyState
          icon="📈"
          title="Not enough sessions yet"
          description={`Record at least ${MIN_SESSIONS_FOR_TRENDS} sessions to see meaningful trends. You have ${sessions.length} so far — trends need a few data points to say anything reliable.`}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-2xl font-semibold">Progress</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">Streak</span>
          <span className="text-2xl font-semibold">
            {streak} day{streak === 1 ? "" : "s"}
          </span>
        </Card>
        <Card className="flex flex-col gap-1 p-4">
          <span className="text-xs uppercase tracking-wide text-foreground-muted">Avg. session</span>
          <span className="text-2xl font-semibold">{formatMinutes(avgSessionSeconds)}</span>
        </Card>
      </div>

      {commonIntentionLabel && (
        <Card className="p-4 text-sm">
          Your most common practice focus has been <strong>{commonIntentionLabel}</strong>.
        </Card>
      )}

      <Card>
        <WeeklyTimeChart points={trends.map((t) => ({ label: t.weekLabel, totalSeconds: t.totalSeconds }))} />
      </Card>

      <Card>
        <TrendLineChart
          title="Timing consistency trend"
          points={trends.map((t) => ({ label: t.weekLabel, value: t.averageTimingScore }))}
          unit=" / 100"
          emptyMessage="Timing consistency needs a reliably detected pulse across a few sessions before a trend can be shown."
        />
      </Card>

      <Card>
        <TrendLineChart
          title="Dynamic consistency trend"
          points={trends.map((t) => ({ label: t.weekLabel, value: t.averageDynamicsScore }))}
          unit=" / 100"
        />
      </Card>

      <Card className="p-4 text-sm text-foreground-muted">
        Average long pauses per session: <strong className="text-foreground">{avgPauseCount.toFixed(1)}</strong>
      </Card>
    </PageContainer>
  );
}

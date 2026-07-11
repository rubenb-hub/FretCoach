import type { PracticeSession } from "@/lib/types";

function startOfDay(timestamp: number): number {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Consecutive-day practice streak, counting today or yesterday as the anchor. */
export function computeStreak(sessions: PracticeSession[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map((s) => startOfDay(s.createdAt)));
  const oneDay = 24 * 60 * 60 * 1000;
  let cursor = startOfDay(Date.now());

  if (!days.has(cursor)) {
    cursor -= oneDay;
    if (!days.has(cursor)) return 0;
  }

  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor -= oneDay;
  }
  return streak;
}

export function totalPracticeSecondsThisWeek(sessions: PracticeSession[]): number {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // Monday = 0
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - dayOfWeek);

  return sessions
    .filter((s) => s.createdAt >= weekStart.getTime())
    .reduce((sum, s) => sum + s.durationSeconds, 0);
}

export function mostCommonIntention(sessions: PracticeSession[]): string | null {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (!s.intention) continue;
    counts.set(s.intention, (counts.get(s.intention) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [intention, count] of counts) {
    if (count > bestCount) {
      best = intention;
      bestCount = count;
    }
  }
  return best;
}

export interface WeeklyTrendPoint {
  weekLabel: string;
  weekStart: number;
  totalSeconds: number;
  sessionCount: number;
  averageTimingScore: number | null;
  averagePauseCount: number;
  averageDynamicsScore: number | null;
}

export function computeWeeklyTrends(sessions: PracticeSession[], weeks = 6): WeeklyTrendPoint[] {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const thisWeekStart = new Date(now);
  thisWeekStart.setHours(0, 0, 0, 0);
  thisWeekStart.setDate(now.getDate() - dayOfWeek);

  const points: WeeklyTrendPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart);
    start.setDate(thisWeekStart.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const weekSessions = sessions.filter((s) => s.createdAt >= start.getTime() && s.createdAt < end.getTime());
    const timingScores = weekSessions
      .map((s) => s.analysis?.timing.score)
      .filter((v): v is number => typeof v === "number");
    const dynamicsScores = weekSessions
      .map((s) => s.analysis?.dynamics.score)
      .filter((v): v is number => typeof v === "number");
    const pauseCounts = weekSessions.map((s) => s.analysis?.pauses.count ?? 0);

    points.push({
      weekLabel: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weekStart: start.getTime(),
      totalSeconds: weekSessions.reduce((sum, s) => sum + s.durationSeconds, 0),
      sessionCount: weekSessions.length,
      averageTimingScore: timingScores.length ? Math.round(average(timingScores)) : null,
      averagePauseCount: pauseCounts.length ? Math.round(average(pauseCounts) * 10) / 10 : 0,
      averageDynamicsScore: dynamicsScores.length ? Math.round(average(dynamicsScores)) : null,
    });
  }
  return points;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

import { Card } from "@/components/ui/Card";
import type { CoachingResult } from "@/lib/types";

export function CoachingPanel({ coaching }: { coaching: CoachingResult }) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">{coaching.headline}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{coaching.summary}</p>
      </div>

      {coaching.observations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Observations</h3>
          <ul className="flex flex-col gap-2">
            {coaching.observations.map((observation) => (
              <li key={observation.id} className="rounded-2xl bg-surface-muted p-3 text-sm">
                {observation.text}
                {observation.lowConfidence && (
                  <span className="ml-2 text-xs text-foreground-muted">(low confidence)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {coaching.recommendedActions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Try this next</h3>
          <ul className="flex flex-col gap-2">
            {coaching.recommendedActions.map((action) => (
              <li key={action.id} className="flex gap-2 rounded-2xl border border-accent/30 bg-accent/5 p-3 text-sm">
                <span aria-hidden="true">🎯</span>
                {action.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl bg-primary/10 p-3 text-sm text-primary">
        <span className="font-semibold">Next session goal: </span>
        {coaching.nextSessionGoal}
      </div>

      {coaching.confidenceNote && <p className="text-xs text-foreground-muted">{coaching.confidenceNote}</p>}
    </Card>
  );
}

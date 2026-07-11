interface ScoreBadgeProps {
  label: string;
  score: number | null;
  descriptor: string;
}

function colorForScore(score: number | null): string {
  if (score === null) return "bg-surface-muted text-foreground-muted";
  if (score >= 85) return "bg-accent/15 text-accent";
  if (score >= 65) return "bg-accent/10 text-accent";
  if (score >= 40) return "bg-primary/10 text-primary";
  return "bg-primary/15 text-primary";
}

/** Shows a plain-language descriptor rather than a bare number so scores never read as judgmental. */
export function ScoreBadge({ label, score, descriptor }: ScoreBadgeProps) {
  return (
    <div className="flex flex-col gap-1" role="group" aria-label={`${label}: ${descriptor}`}>
      <span className="text-xs uppercase tracking-wide text-foreground-muted">{label}</span>
      <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-semibold ${colorForScore(score)}`}>
        {descriptor}
        {score !== null && <span className="ml-1.5 font-normal opacity-70">{score}/100</span>}
      </span>
    </div>
  );
}

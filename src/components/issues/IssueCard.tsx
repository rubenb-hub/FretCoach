import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { confidenceWording } from "@/lib/analysis/issues/issueCopy";
import { ISSUE_CATEGORY_VISUALS } from "@/lib/analysis/issues/issueVisuals";
import { formatSegmentLabel } from "@/lib/coaching/formatTime";
import type { FeedbackResponse, PracticeIssue } from "@/lib/types";

interface IssueCardProps {
  issue: PracticeIssue;
  selected: boolean;
  dismissed: boolean;
  feedback: FeedbackResponse | null;
  onSelectAndPlay: () => void;
  onSelectAndLoop: () => void;
  onPractice: () => void;
  onDismiss: () => void;
  onFeedback: (response: FeedbackResponse) => void;
}

export function IssueCard({
  issue,
  selected,
  dismissed,
  feedback,
  onSelectAndPlay,
  onSelectAndLoop,
  onPractice,
  onDismiss,
  onFeedback,
}: IssueCardProps) {
  if (dismissed) return null;
  const visuals = ISSUE_CATEGORY_VISUALS[issue.category];

  return (
    <Card className={`flex flex-col gap-3 ${selected ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: `${visuals.color}22`, color: visuals.color }}
          >
            {visuals.glyph}
          </span>
          <div>
            <h3 className="font-semibold leading-tight">{issue.title}</h3>
            <p className="text-xs text-foreground-muted">{formatSegmentLabel(issue.startTime, issue.endTime)}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground-muted">
          {confidenceWording(issue.confidence)}
        </span>
      </div>

      <p className="text-sm">{issue.explanation}</p>

      {issue.tips.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm text-foreground-muted">
          {issue.tips.slice(0, 3).map((tip) => (
            <li key={tip} className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              {tip}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="md" variant="secondary" onClick={onSelectAndPlay}>
          Play
        </Button>
        <Button size="md" variant="secondary" onClick={onSelectAndLoop}>
          Loop
        </Button>
        <Button size="md" onClick={onPractice}>
          Practise this section
        </Button>
        <Button size="md" variant="ghost" onClick={onDismiss} aria-label={`Dismiss ${issue.title}`}>
          Dismiss
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
        <span className="text-foreground-muted">Was this right?</span>
        <button
          type="button"
          aria-pressed={feedback === "correct"}
          onClick={() => onFeedback("correct")}
          className={`min-h-[32px] rounded-full border px-2.5 ${feedback === "correct" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-muted"}`}
        >
          Yes
        </button>
        <button
          type="button"
          aria-pressed={feedback === "incorrect"}
          onClick={() => onFeedback("incorrect")}
          className={`min-h-[32px] rounded-full border px-2.5 ${feedback === "incorrect" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-muted"}`}
        >
          Detection incorrect
        </button>
        <button
          type="button"
          aria-pressed={feedback === "unsure"}
          onClick={() => onFeedback("unsure")}
          className={`min-h-[32px] rounded-full border px-2.5 ${feedback === "unsure" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-muted"}`}
        >
          Not sure
        </button>
      </div>
    </Card>
  );
}

import { ANALYSIS_STAGES, type AnalysisStage } from "@/lib/analysis/analyzeSession";

interface ProcessingViewProps {
  /** Null before the first stage starts, "complete" once analysis has finished. */
  currentStage: AnalysisStage | "complete" | null;
}

/** Reflects genuine pipeline stages as they complete — no artificial delay is added. */
export function ProcessingView({ currentStage }: ProcessingViewProps) {
  const currentIndex =
    currentStage && currentStage !== "complete" ? ANALYSIS_STAGES.findIndex((s) => s.stage === currentStage) : -1;
  const allComplete = currentStage === "complete";

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-surface-muted border-t-primary" aria-hidden="true" />
      <div className="w-full max-w-xs" role="status" aria-live="polite">
        <h2 className="mb-4 text-center text-lg font-semibold">Analysing your session</h2>
        <ol className="flex flex-col gap-3">
          {ANALYSIS_STAGES.map((stage, index) => {
            const done = allComplete || currentIndex > index;
            const active = !allComplete && index === currentIndex;
            return (
              <li key={stage.stage} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                    done ? "bg-accent text-accent-foreground" : active ? "bg-primary text-primary-foreground" : "bg-surface-muted text-foreground-muted"
                  }`}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className={active || done ? "text-foreground" : "text-foreground-muted"}>{stage.label}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

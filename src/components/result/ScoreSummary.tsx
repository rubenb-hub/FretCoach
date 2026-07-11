import { Card } from "@/components/ui/Card";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { timingLabel, dynamicsLabel, formatSegmentLabel } from "@/lib/coaching/formatTime";
import { formatDuration } from "@/lib/utils/format";
import type { PracticeAnalysis } from "@/lib/types";

export function ScoreSummary({ analysis }: { analysis: PracticeAnalysis }) {
  return (
    <Card className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Duration" value={formatDuration(analysis.durationSeconds)} />
        <Stat label="Active playing" value={formatDuration(analysis.activePlayingSeconds)} />
        <Stat
          label="Tempo"
          value={
            analysis.tempo.bpm && analysis.tempo.confidence >= 0.35
              ? `~${analysis.tempo.bpm} BPM`
              : "Not reliable"
          }
        />
        <Stat label="Long pauses" value={`${analysis.pauses.count}`} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <ScoreBadge label="Timing consistency" score={analysis.timing.score} descriptor={timingLabel(analysis.timing.score)} />
        <ScoreBadge label="Dynamic consistency" score={analysis.dynamics.score} descriptor={dynamicsLabel(analysis.dynamics.score)} />
      </div>

      {(analysis.timing.strongestSegment || analysis.timing.weakestSegment) && (
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {analysis.timing.strongestSegment && (
            <p className="rounded-2xl bg-accent/10 px-3 py-2 text-accent">
              Strongest section: {formatSegmentLabel(analysis.timing.strongestSegment.startSeconds, analysis.timing.strongestSegment.endSeconds)}
            </p>
          )}
          {analysis.timing.weakestSegment && (
            <p className="rounded-2xl bg-primary/10 px-3 py-2 text-primary">
              Least consistent: {formatSegmentLabel(analysis.timing.weakestSegment.startSeconds, analysis.timing.weakestSegment.endSeconds)}
            </p>
          )}
        </div>
      )}

      {analysis.recordingQuality.warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl bg-surface-muted p-3 text-xs text-foreground-muted">
          {analysis.recordingQuality.warnings.map((warning) => (
            <p key={warning}>⚠ {warning}</p>
          ))}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-foreground-muted">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

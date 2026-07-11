"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AudioSegmentPlayer } from "@/components/audio/AudioSegmentPlayer";
import { RecordingTimeline, type TimelineMarker, type TimelineRegion } from "@/components/timeline/RecordingTimeline";
import { IssueCard } from "./IssueCard";
import { PracticeSectionPanel } from "@/components/practice/PracticeSectionPanel";
import { useRecordingAudioSource } from "@/lib/hooks/useRecordingAudioSource";
import { analyzeMusicSession, type MusicAnalysisStage } from "@/lib/providers/musicAnalysisProvider";
import { getFeedbackRepository } from "@/lib/feedback/feedbackRepository";
import { ISSUE_CATEGORY_VISUALS } from "@/lib/analysis/issues/issueVisuals";
import type { FeedbackResponse, MusicAnalysisResult, PracticeIssue, PracticeSession } from "@/lib/types";

interface MusicAnalysisPanelProps {
  session: PracticeSession;
  onMusicAnalysisComputed: (result: MusicAnalysisResult) => void;
}

const STAGE_LABELS: Record<MusicAnalysisStage, string> = {
  "detecting-notes": "Detecting likely notes…",
  "detecting-chords": "Estimating likely chords…",
  "detecting-technique": "Checking for possible technique issues…",
  "aggregating-issues": "Preparing coaching sections…",
};

/**
 * The note/chord/technique analysis surface for a saved recording: a
 * timeline with detected note/chord regions and issue markers, a
 * segment player for the selected issue, and the ranked issue-card list.
 * Analysis is opt-in (a button) rather than automatic, both because it's
 * a heavier pass than the original timing/dynamics analysis and so a
 * session that already has `musicAnalysis` (cached) never re-runs it.
 */
export function MusicAnalysisPanel({ session, onMusicAnalysisComputed }: MusicAnalysisPanelProps) {
  const { source, audioBuffer, decoding } = useRecordingAudioSource(session.audioBlob);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState<MusicAnalysisStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [loopSelected, setLoopSelected] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [feedbackByIssue, setFeedbackByIssue] = useState<Record<string, FeedbackResponse>>({});
  const [practicingIssue, setPracticingIssue] = useState<PracticeIssue | null>(null);

  const musicAnalysis = session.musicAnalysis ?? null;

  const runAnalysis = async () => {
    if (!audioBuffer) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeMusicSession(audioBuffer, session.analysis, { onStage: setStage });
      onMusicAnalysisComputed(result);
    } catch {
      setError("Note/chord analysis could not complete for this recording.");
    } finally {
      setAnalyzing(false);
      setStage(null);
    }
  };

  const handleFeedback = (issueId: string, response: FeedbackResponse) => {
    setFeedbackByIssue((prev) => ({ ...prev, [issueId]: response }));
    void getFeedbackRepository().recordFeedback(issueId, response);
  };

  const selectedIssue = musicAnalysis?.issues.find((i) => i.id === selectedIssueId) ?? null;

  const markers: TimelineMarker[] = useMemo(
    () =>
      (musicAnalysis?.issues ?? [])
        .filter((issue) => !dismissedIds.has(issue.id))
        .map((issue) => ({
          id: issue.id,
          startTime: issue.startTime,
          endTime: issue.endTime,
          glyph: ISSUE_CATEGORY_VISUALS[issue.category].glyph,
          label: issue.title,
          color: ISSUE_CATEGORY_VISUALS[issue.category].color,
          selected: issue.id === selectedIssueId,
        })),
    [musicAnalysis, dismissedIds, selectedIssueId]
  );

  const regions: TimelineRegion[] = useMemo(() => {
    const chordRegions: TimelineRegion[] = (musicAnalysis?.chords ?? []).map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      color: "rgba(63,108,94,0.6)",
    }));
    return chordRegions;
  }, [musicAnalysis]);

  if (decoding) {
    return <Card className="text-sm text-foreground-muted">Preparing audio…</Card>;
  }

  if (!musicAnalysis) {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Notes, chords &amp; technique</h2>
        <p className="text-sm text-foreground-muted">
          Run a deeper, local analysis pass to estimate individual notes, likely chords, timing/pitch stability, and
          possible fret buzz or unclear notes. This is heavier than the main session summary, so it only runs when you
          ask for it.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button onClick={runAnalysis} disabled={analyzing || !audioBuffer}>
          {analyzing ? (stage ? STAGE_LABELS[stage] : "Analysing…") : "Analyse notes, chords & technique"}
        </Button>
      </Card>
    );
  }

  const visibleIssues = musicAnalysis.issues.filter((i) => !dismissedIds.has(i.id));

  return (
    <div className="flex flex-col gap-4">
      {musicAnalysis.truncated && (
        <p className="rounded-2xl bg-surface-muted p-3 text-xs text-foreground-muted">
          This recording was longer than the analysis limit, so only the first part was analysed for notes, chords,
          and technique.
        </p>
      )}

      <RecordingTimeline
        audioBuffer={audioBuffer}
        durationSeconds={audioBuffer?.duration ?? 0}
        currentTime={selectedIssue?.playbackStartTime ?? 0}
        regions={regions}
        markers={markers}
        loopStart={selectedIssue?.playbackStartTime}
        loopEnd={loopSelected ? selectedIssue?.playbackEndTime : undefined}
        onMarkerSelect={(id) => setSelectedIssueId(id === selectedIssueId ? null : id)}
      />

      {selectedIssue && source && (
        <AudioSegmentPlayer
          audioSource={source.objectUrl}
          startTime={selectedIssue.playbackStartTime}
          endTime={selectedIssue.playbackEndTime}
          loop={loopSelected}
          label={selectedIssue.title}
        />
      )}

      {visibleIssues.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No confident issues to show"
          description="Nothing cleared the confidence threshold for this recording — that's a good sign, or the recording may need to be a bit longer/cleaner for reliable detection."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visibleIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              selected={issue.id === selectedIssueId}
              dismissed={false}
              feedback={feedbackByIssue[issue.id] ?? null}
              onSelectAndPlay={() => {
                setSelectedIssueId(issue.id);
                setLoopSelected(false);
              }}
              onSelectAndLoop={() => {
                setSelectedIssueId(issue.id);
                setLoopSelected(true);
              }}
              onPractice={() => setPracticingIssue(issue)}
              onDismiss={() => setDismissedIds((prev) => new Set(prev).add(issue.id))}
              onFeedback={(response) => handleFeedback(issue.id, response)}
            />
          ))}
        </div>
      )}

      {practicingIssue && source && (
        <PracticeSectionPanel
          issue={practicingIssue}
          originalAudioUrl={source.objectUrl}
          originalMusicAnalysis={musicAnalysis}
          onClose={() => setPracticingIssue(null)}
        />
      )}
    </div>
  );
}

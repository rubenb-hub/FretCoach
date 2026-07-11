"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AudioSegmentPlayer } from "@/components/audio/AudioSegmentPlayer";
import { useQuickRetryRecorder } from "@/lib/hooks/useQuickRetryRecorder";
import { useRecordingAudioSource } from "@/lib/hooks/useRecordingAudioSource";
import { analyzeMusicSession, type MusicAnalysisStage } from "@/lib/providers/musicAnalysisProvider";
import { compareRetryToOriginal, type RetryComparisonResult } from "@/lib/analysis/issues/retryComparisonService";
import { formatSegmentLabel } from "@/lib/coaching/formatTime";
import type { MusicAnalysisResult, PracticeIssue } from "@/lib/types";

interface PracticeSectionPanelProps {
  issue: PracticeIssue;
  originalAudioUrl: string;
  originalMusicAnalysis: MusicAnalysisResult | null;
  onClose: () => void;
}

const STAGE_LABELS: Record<MusicAnalysisStage, string> = {
  "detecting-notes": "Detecting notes…",
  "detecting-chords": "Detecting chords…",
  "detecting-technique": "Checking technique…",
  "aggregating-issues": "Finishing up…",
};

/**
 * Focused single-issue practice screen: original section playback (with
 * loop/speed), the issue's coaching tips, a "record another attempt"
 * retry flow, and a measurable-only comparison between the two. Rendered
 * as an in-page panel rather than a separate route — the session detail
 * page already holds the original recording's decoded audio and analysis
 * in memory, and a route change would mean re-fetching/re-decoding it.
 */
export function PracticeSectionPanel({ issue, originalAudioUrl, originalMusicAnalysis, onClose }: PracticeSectionPanelProps) {
  const retryRecorder = useQuickRetryRecorder();
  const [retryBlob, setRetryBlob] = useState<Blob | null>(null);
  const [countInEnabled, setCountInEnabled] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState<MusicAnalysisStage | null>(null);
  const [retryAnalysis, setRetryAnalysis] = useState<MusicAnalysisResult | null>(null);
  const [comparison, setComparison] = useState<RetryComparisonResult | null>(null);

  const { source: retrySource, audioBuffer: retryBuffer } = useRecordingAudioSource(retryBlob);

  const handleStartRetry = async () => {
    setRetryBlob(null);
    setRetryAnalysis(null);
    setComparison(null);
    await retryRecorder.start();
  };

  const handleStopRetry = async () => {
    const audio = await retryRecorder.stop();
    if (audio) setRetryBlob(audio.blob);
  };

  const handleAnalyzeRetry = async () => {
    if (!retryBuffer) return;
    setAnalyzing(true);
    try {
      const result = await analyzeMusicSession(retryBuffer, null, { onStage: setAnalysisStage });
      setRetryAnalysis(result);
      if (originalMusicAnalysis) {
        setComparison(compareRetryToOriginal(originalMusicAnalysis, issue, result));
      }
    } finally {
      setAnalyzing(false);
      setAnalysisStage(null);
    }
  };

  const handleRetryAgain = () => {
    setRetryBlob(null);
    setRetryAnalysis(null);
    setComparison(null);
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background">
      <div className="safe-top flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold">Practise this section</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close practice section"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-lg"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 pb-10">
        <Card className="flex flex-col gap-2">
          <h3 className="font-semibold">{issue.title}</h3>
          <p className="text-xs text-foreground-muted">{formatSegmentLabel(issue.startTime, issue.endTime)}</p>
        </Card>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-foreground-muted">Original attempt</h3>
          <AudioSegmentPlayer
            audioSource={originalAudioUrl}
            startTime={issue.playbackStartTime}
            endTime={issue.playbackEndTime}
            loop
          />
        </div>

        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Coaching</h3>
          <p className="text-sm">{issue.explanation}</p>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground-muted">
            {issue.tips.map((tip) => (
              <li key={tip} className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Retry</h3>

          {!retryBlob && (
            <Card className="flex flex-col gap-3">
              <label className="flex items-center justify-between text-sm">
                Count-in before recording
                <input
                  type="checkbox"
                  checked={countInEnabled}
                  onChange={(e) => setCountInEnabled(e.target.checked)}
                  className="h-5 w-5"
                  aria-label="Enable count-in before retry recording"
                />
              </label>

              {retryRecorder.state !== "recording" ? (
                <Button
                  size="lg"
                  onClick={async () => {
                    if (countInEnabled) {
                      const { playCountIn } = await import("@/lib/audio/countInClicker");
                      await playCountIn(4, 80);
                    }
                    await handleStartRetry();
                  }}
                >
                  Record another attempt
                </Button>
              ) : (
                <Button size="lg" variant="danger" onClick={handleStopRetry}>
                  Stop recording
                </Button>
              )}
              {retryRecorder.error && <p className="text-sm text-danger">{retryRecorder.error}</p>}
            </Card>
          )}

          {retryBlob && retrySource && (
            <div className="flex flex-col gap-3">
              <AudioSegmentPlayer
                audioSource={retrySource.objectUrl}
                startTime={0}
                endTime={retryBuffer?.duration ?? 0.1}
                label="Your retry"
              />
              <div className="flex gap-2">
                {!retryAnalysis && (
                  <Button onClick={handleAnalyzeRetry} disabled={analyzing || !retryBuffer}>
                    {analyzing ? analysisStage ? STAGE_LABELS[analysisStage] : "Analysing…" : "Analyse retry"}
                  </Button>
                )}
                <Button variant="secondary" onClick={handleRetryAgain}>
                  Retry again
                </Button>
              </div>
            </div>
          )}
        </div>

        {comparison && (
          <Card className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">Comparison</h3>
            <p className="text-sm text-foreground-muted">{comparison.summary}</p>
            {comparison.comparable && (
              <div className="flex flex-col gap-2">
                {comparison.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl bg-surface-muted p-3 text-sm">
                    <p className="font-medium">{metric.label}</p>
                    {metric.comparable ? (
                      <p className="text-foreground-muted">
                        Original: {metric.originalWording} · New attempt: {metric.retryWording}
                      </p>
                    ) : (
                      <p className="text-foreground-muted">Not enough data to compare this metric.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

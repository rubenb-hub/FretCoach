"use client";

import { useEffect, useMemo, useRef } from "react";
import { computeWaveformEnvelope } from "@/lib/audio/waveformEnvelope";
import { formatDuration } from "@/lib/utils/format";

export interface TimelineMarker {
  id: string;
  startTime: number;
  endTime: number;
  /** Short glyph shown on the marker so category is never colour-only. */
  glyph: string;
  label: string;
  color: string;
  selected?: boolean;
}

export interface TimelineRegion {
  startTime: number;
  endTime: number;
  color: string;
}

interface RecordingTimelineProps {
  audioBuffer: AudioBuffer | null;
  durationSeconds: number;
  currentTime?: number;
  /** e.g. detected note or chord regions, drawn as thin bands under the waveform. */
  regions?: TimelineRegion[];
  markers?: TimelineMarker[];
  loopStart?: number;
  loopEnd?: number;
  onSeek?: (time: number) => void;
  onMarkerSelect?: (markerId: string) => void;
}

/**
 * Mobile-friendly amplitude-envelope timeline. The whole waveform strip is
 * one large tap/drag target for seeking (no precision-mouse requirement),
 * and markers are rendered as touch-sized buttons below it rather than
 * tiny hit targets on the waveform itself.
 */
export function RecordingTimeline({
  audioBuffer,
  durationSeconds,
  currentTime = 0,
  regions = [],
  markers = [],
  loopStart,
  loopEnd,
  onSeek,
  onMarkerSelect,
}: RecordingTimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const envelope = useMemo(() => {
    if (!audioBuffer) return null;
    return computeWaveformEnvelope(audioBuffer, 300);
  }, [audioBuffer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Loop region background.
    if (loopStart !== undefined && loopEnd !== undefined && durationSeconds > 0) {
      const x1 = (loopStart / durationSeconds) * width;
      const x2 = (loopEnd / durationSeconds) * width;
      ctx.fillStyle = "rgba(63,108,94,0.15)";
      ctx.fillRect(x1, 0, x2 - x1, height);
    }

    // Waveform bars.
    if (envelope) {
      const barCount = envelope.length;
      const barWidth = width / barCount;
      for (let i = 0; i < barCount; i++) {
        const value = Math.max(0.02, envelope[i]);
        const barHeight = value * height * 0.9;
        const x = i * barWidth;
        const y = (height - barHeight) / 2;
        ctx.fillStyle = "rgba(181,101,44,0.6)";
        ctx.fillRect(x, y, Math.max(1, barWidth - 1), barHeight);
      }
    }

    // Region bands (notes/chords) drawn as a thin strip along the bottom.
    if (durationSeconds > 0) {
      for (const region of regions) {
        const x1 = (region.startTime / durationSeconds) * width;
        const x2 = (region.endTime / durationSeconds) * width;
        ctx.fillStyle = region.color;
        ctx.fillRect(x1, height - 4, Math.max(1, x2 - x1), 4);
      }
    }

    // Playback cursor (matches the --danger token; canvas can't read CSS vars directly).
    if (durationSeconds > 0) {
      const x = (currentTime / durationSeconds) * width;
      ctx.fillStyle = "#e0432b";
      ctx.fillRect(x, 0, Math.max(1, 2 * dpr), height);
    }
  }, [envelope, durationSeconds, currentTime, regions, loopStart, loopEnd]);

  const seekFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el || !onSeek || durationSeconds <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * durationSeconds);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="relative h-24 w-full touch-none overflow-hidden rounded-2xl bg-surface-muted"
        role="slider"
        aria-label="Recording timeline"
        aria-valuemin={0}
        aria-valuemax={durationSeconds}
        aria-valuenow={currentTime}
        aria-valuetext={formatDuration(currentTime)}
        tabIndex={0}
        onClick={(e) => seekFromClientX(e.clientX)}
        onKeyDown={(e) => {
          if (!onSeek) return;
          if (e.key === "ArrowRight") onSeek(Math.min(durationSeconds, currentTime + 1));
          if (e.key === "ArrowLeft") onSeek(Math.max(0, currentTime - 1));
        }}
      >
        <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      </div>

      {markers.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Detected issues on this recording">
          {markers.map((marker) => (
            <button
              key={marker.id}
              type="button"
              onClick={() => onMarkerSelect?.(marker.id)}
              aria-pressed={marker.selected}
              aria-label={`${marker.label}, ${formatDuration(marker.startTime)} to ${formatDuration(marker.endTime)}`}
              className={`flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-xs font-medium ${
                marker.selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-foreground-muted"
              }`}
            >
              <span aria-hidden="true">{marker.glyph}</span>
              {formatDuration(marker.startTime)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

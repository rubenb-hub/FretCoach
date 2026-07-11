"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { playCountIn } from "@/lib/audio/countInClicker";
import { formatDuration } from "@/lib/utils/format";

export const PLAYBACK_RATES = [0.5, 0.75, 1] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export interface AudioSegmentPlayerProps {
  /** A playable URL — typically a RecordingAudioSource's objectUrl. */
  audioSource: string;
  startTime: number;
  endTime: number;
  loop?: boolean;
  playbackRate?: PlaybackRate;
  /** Extra seconds of audio to include before `startTime` for musical context. */
  contextBeforeSeconds?: number;
  /** Extra seconds of audio to include after `endTime` for musical context. */
  contextAfterSeconds?: number;
  /** If set, plays a short click count-in before the segment starts. */
  countInBeats?: number;
  countInBpm?: number;
  onEnded?: () => void;
  className?: string;
  label?: string;
}

/**
 * Reusable section player: plays only [startTime, endTime] (plus optional
 * context padding) of a longer recording, with loop and 0.5x/0.75x/1x
 * playback rate. Built on a plain <audio> element rather than raw Web
 * Audio buffer nodes — HTMLMediaElement's native `playbackRate` and
 * `currentTime` seeking are well supported on iOS Safari and far simpler
 * to keep correct than hand-rolled AudioBufferSourceNode scrubbing, which
 * cannot change the playback rate of an already-scheduled buffer without
 * being re-created. The original recording is never modified — this only
 * ever reads from `audioSource`.
 *
 * Starting playback happens only inside this component's own button
 * `onClick` handlers, since iOS Safari requires media playback to start
 * from a direct user gesture.
 */
export function AudioSegmentPlayer({
  audioSource,
  startTime,
  endTime,
  loop = false,
  playbackRate = 1,
  contextBeforeSeconds = 0,
  contextAfterSeconds = 0,
  countInBeats,
  countInBpm = 80,
  onEnded,
  className = "",
  label,
}: AudioSegmentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(loop);
  const [rate, setRate] = useState<PlaybackRate>(playbackRate);
  const [currentTime, setCurrentTime] = useState(startTime);
  const [duration, setDuration] = useState<number | null>(null);
  const [countingIn, setCountingIn] = useState(false);

  const effectiveStart = Math.max(0, startTime - contextBeforeSeconds);
  const effectiveEnd = useMemo(() => {
    const desired = endTime + contextAfterSeconds;
    return duration !== null ? Math.min(duration, desired) : desired;
  }, [endTime, contextAfterSeconds, duration]);

  // Re-sync when the target segment changes (a different issue selected).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    audio.currentTime = effectiveStart;
    setCurrentTime(effectiveStart);
    // effectiveStart intentionally omitted: it derives from startTime/contextBeforeSeconds already in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSource, startTime, endTime]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    if (audio.currentTime >= effectiveEnd) {
      if (isLooping) {
        audio.currentTime = effectiveStart;
      } else {
        audio.pause();
        audio.currentTime = effectiveStart;
        setCurrentTime(effectiveStart);
        setIsPlaying(false);
        onEnded?.();
      }
    }
  };

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime < effectiveStart || audio.currentTime >= effectiveEnd) {
      audio.currentTime = effectiveStart;
    }
    if (countInBeats && countInBeats > 0) {
      setCountingIn(true);
      await playCountIn(countInBeats, countInBpm);
      setCountingIn(false);
    }
    await audio.play();
    setIsPlaying(true);
  };

  const pause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = effectiveStart;
    setCurrentTime(effectiveStart);
    setIsPlaying(false);
  };

  const handleSeek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.min(effectiveEnd, Math.max(effectiveStart, value));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>}

      <audio
        ref={audioRef}
        src={audioSource}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={handleTimeUpdate}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex items-center justify-between text-xs text-foreground-muted">
        <span>{formatDuration(effectiveStart)}</span>
        <span aria-hidden="true">{countingIn ? "Counting in…" : ""}</span>
        <span>{formatDuration(effectiveEnd)}</span>
      </div>

      <input
        type="range"
        aria-label="Seek within section"
        min={effectiveStart}
        max={effectiveEnd}
        step={0.05}
        value={Math.min(Math.max(currentTime, effectiveStart), effectiveEnd)}
        onChange={(e) => handleSeek(Number(e.target.value))}
        className="w-full accent-primary"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="md"
          onClick={() => (isPlaying ? pause() : void play())}
          aria-label={isPlaying ? "Pause section" : "Play section"}
          disabled={countingIn}
        >
          {isPlaying ? "Pause" : countingIn ? "Counting in…" : "Play"}
        </Button>
        <Button size="md" variant="secondary" onClick={stop} aria-label="Stop and return to section start">
          Stop
        </Button>
        <button
          type="button"
          role="switch"
          aria-checked={isLooping}
          aria-label="Loop this section"
          onClick={() => setIsLooping((v) => !v)}
          className={`min-h-[40px] rounded-full border px-3.5 text-sm font-medium ${
            isLooping ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-muted text-foreground-muted"
          }`}
        >
          Loop
        </button>
      </div>

      <div role="group" aria-label="Playback speed" className="flex gap-2">
        {PLAYBACK_RATES.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={rate === r}
            onClick={() => setRate(r)}
            className={`min-h-[40px] flex-1 rounded-xl border text-sm font-medium ${
              rate === r ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface-muted text-foreground-muted"
            }`}
          >
            {r}x
          </button>
        ))}
      </div>
    </div>
  );
}

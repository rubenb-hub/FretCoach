"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LevelMeter } from "@/components/recording/LevelMeter";
import { IntentionPicker } from "@/components/recording/IntentionPicker";
import { RecordingErrorPanel } from "@/components/recording/RecordingErrorPanel";
import { ProcessingView } from "@/components/processing/ProcessingView";
import { SessionResultView } from "@/components/result/SessionResultView";
import { SongInfoEditor } from "@/components/result/SongInfoEditor";
import { PracticeModeToggle } from "@/components/reference/PracticeModeToggle";
import { ReferenceMaterialEditor } from "@/components/reference/ReferenceMaterialEditor";
import { SpotifyReferencePanel } from "@/components/spotify/SpotifyReferencePanel";
import { MediaRecorderAudioService } from "@/lib/recording/audioRecorderService";
import { LiveInputMeter } from "@/lib/recording/liveInputMeter";
import { RecordingError } from "@/lib/recording/errors";
import { detectBrowserCapabilities } from "@/lib/capability/browserCapabilities";
import { analyzeSession, SessionAnalysisError, type AnalysisStage } from "@/lib/analysis/analyzeSession";
import { RuleBasedPracticeCoachProvider } from "@/lib/coaching/ruleBasedCoachProvider";
import { getSessionRepository } from "@/lib/storage/sessionRepository";
import { useProfile } from "@/lib/state/ProfileProvider";
import { formatDuration } from "@/lib/utils/format";
import type {
  PracticeIntention,
  PracticeMode,
  PracticeSession,
  ReferenceMaterial,
  SongInfo,
  SpotifyReference,
} from "@/lib/types";

type Phase = "setup" | "starting" | "recording" | "paused" | "processing" | "result" | "error";

const MIN_RECORDING_SECONDS = 2;

export default function RecordPage() {
  const router = useRouter();
  const { profile } = useProfile();

  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("");
  const [intention, setIntention] = useState<PracticeIntention | null>(null);
  const [song, setSong] = useState<SongInfo | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>("free");
  const [referenceMaterial, setReferenceMaterial] = useState<ReferenceMaterial | null>(null);
  const [spotifyReference, setSpotifyReference] = useState<SpotifyReference | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<RecordingError | { message: string; kind: "unknown" } | null>(null);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage | "complete" | null>(null);
  const [resultSession, setResultSession] = useState<PracticeSession | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(null);

  useEffect(() => {
    // Feature detection depends on `navigator`/`window`, which don't exist
    // during server rendering; detectBrowserCapabilities() returns
    // conservative defaults there. Applying the real client capabilities
    // only after mount (rather than in a useState initializer) is what
    // keeps this render in sync with the server-rendered HTML.
    const capabilities = detectBrowserCapabilities();
    if (!capabilities.hasGetUserMedia || !capabilities.hasMediaRecorder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnsupportedReason("This browser does not support audio recording. Try the latest Safari or Chrome.");
    } else if (!capabilities.isSecureContext) {
      setUnsupportedReason("Microphone access requires a secure (HTTPS) connection or localhost. Recording will likely fail here.");
    }
  }, []);

  // Lazily construct these singleton service instances once per mount.
  // They are stateful but never trigger re-renders themselves, so a plain
  // useState (never calling its setter) avoids reading/writing a ref
  // during render.
  const [recorder] = useState(() => new MediaRecorderAudioService());
  const [meter] = useState(() => new LiveInputMeter());

  // Timer only advances while actively recording (not while paused).
  useEffect(() => {
    if (phase !== "recording") return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 0.25), 250);
    return () => clearInterval(interval);
  }, [phase]);

  // Warn before an accidental refresh/close while a recording is in progress.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (phase === "recording" || phase === "paused" || phase === "processing") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // Release the microphone/audio graph if the user navigates away mid-flow,
  // and guard against setting state after unmount (e.g. analysis finishing
  // just after the user backs out of the screen).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void recorder.cancel();
      meter.detach();
    };
  }, [recorder, meter]);

  const beginRecording = async () => {
    const capabilities = detectBrowserCapabilities();
    if (!capabilities.hasGetUserMedia || !capabilities.hasMediaRecorder) {
      setError(new RecordingError("This browser does not support audio recording.", "unsupported-browser"));
      setPhase("error");
      return;
    }
    setPhase("starting");
    try {
      await recorder.start();
      const stream = recorder.getStream();
      if (stream) {
        meter.attach(stream);
        await meter.ensureResumed();
      }
      setElapsedSeconds(0);
      setPhase("recording");
    } catch (e) {
      setError(e instanceof RecordingError ? e : new RecordingError("Could not start recording.", "unknown", e));
      setPhase("error");
    }
  };

  const pause = () => {
    recorder.pause();
    setPhase("paused");
  };

  const resume = () => {
    recorder.resume();
    setPhase("recording");
  };

  const finish = async () => {
    setPhase("processing");
    setAnalysisStage(null);
    try {
      const audio = await recorder.stop();
      meter.detach();
      if (!mountedRef.current) return;

      if (audio.durationSeconds < MIN_RECORDING_SECONDS) {
        setError({ message: "This recording was too short to analyse. Try recording for at least a few seconds.", kind: "unknown" });
        setPhase("error");
        return;
      }

      const analysis = await analyzeSession(audio.blob, profile, (stage) => mountedRef.current && setAnalysisStage(stage));
      if (!mountedRef.current) return;
      const coaching = await new RuleBasedPracticeCoachProvider().generateCoaching(analysis, profile, song);
      if (!mountedRef.current) return;
      setAnalysisStage("complete");

      const session: PracticeSession = {
        id: uuidv4(),
        title: title.trim() || defaultTitle(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        durationSeconds: audio.durationSeconds,
        intention,
        song,
        notes: "",
        audioBlob: audio.blob,
        audioMimeType: audio.mimeType,
        analysis,
        coaching,
        isDemo: false,
        practiceMode,
        referenceMaterial,
        spotifyReference,
      };
      setResultSession(session);
      setPhase("result");
    } catch (e) {
      if (!mountedRef.current) return;
      const message =
        e instanceof SessionAnalysisError
          ? e.message
          : "Something went wrong while analysing this recording. The audio itself was not lost, but analysis could not complete.";
      setError({ message, kind: "unknown" });
      setPhase("error");
    }
  };

  const cancelRecording = async () => {
    await recorder.cancel();
    meter.detach();
    router.replace("/");
  };

  const saveSession = async () => {
    if (!resultSession) return;
    await getSessionRepository().create(resultSession);
    router.replace(`/session/${resultSession.id}`);
  };

  const discardSession = () => {
    router.replace("/");
  };

  if (phase === "error" && error) {
    const kind = "kind" in error ? error.kind : "unknown";
    return (
      <div className="flex min-h-dvh flex-col">
        <RecordingErrorPanel kind={kind as never} message={error.message} onRetry={() => setPhase("setup")} />
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="flex min-h-dvh flex-col">
        <ProcessingView currentStage={analysisStage} />
      </div>
    );
  }

  if (phase === "result" && resultSession) {
    return (
      <div className="safe-top mx-auto w-full max-w-lg flex-1 px-4 pb-8 pt-6">
        <SessionResultView
          session={resultSession}
          mode="unsaved"
          developerMode={profile.developerMode}
          onChange={(patch) => setResultSession((s) => (s ? { ...s, ...patch } : s))}
          onSave={saveSession}
          onDiscard={discardSession}
        />
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="safe-top flex min-h-dvh flex-col px-5 pb-8 pt-6">
        <button onClick={() => router.back()} className="mb-4 w-fit text-sm text-foreground-muted" aria-label="Cancel and go back">
          ← Cancel
        </button>
        <h1 className="text-2xl font-semibold">New practice session</h1>
        <p className="mt-1 text-sm text-foreground-muted">
          Add an optional title and focus, then begin recording when you&apos;re ready to play.
        </p>

        <label className="mt-6 flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Session title (optional)
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaultTitle()}
            className="h-12 rounded-xl border border-border bg-surface px-3 text-base font-normal normal-case outline-none focus-visible:outline-2 focus-visible:outline-primary"
          />
        </label>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">What&apos;s your focus?</p>
          <IntentionPicker value={intention} onChange={setIntention} />
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted">Practice mode</p>
          <PracticeModeToggle value={practiceMode} onChange={setPracticeMode} />
        </div>

        {practiceMode === "reference" && (
          <div className="mt-5">
            <ReferenceMaterialEditor material={referenceMaterial} onChange={setReferenceMaterial} />
          </div>
        )}

        <div className="mt-5">
          <SongInfoEditor song={song} onChange={setSong} />
        </div>

        <div className="mt-5">
          <SpotifyReferencePanel reference={spotifyReference} onChange={setSpotifyReference} />
        </div>

        <div className="flex-1" />

        {unsupportedReason && (
          <p role="alert" className="mb-3 rounded-2xl bg-danger/10 p-3 text-sm text-danger">
            {unsupportedReason}
          </p>
        )}

        <Button size="lg" className="w-full text-lg" onClick={beginRecording} disabled={!!unsupportedReason}>
          <span aria-hidden="true">🎙️</span> Begin Recording
        </Button>
      </div>
    );
  }

  // starting / recording / paused
  return (
    <div className="safe-top flex min-h-dvh flex-col px-5 pb-8 pt-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setConfirmingCancel(true)}
          aria-label="Cancel session"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-lg"
        >
          ✕
        </button>
        <div className="flex items-center gap-2" role="status">
          <span
            aria-hidden="true"
            className={`h-3 w-3 rounded-full bg-recording ${phase === "recording" ? "recording-pulse" : ""}`}
          />
          <span className="text-sm font-medium">
            {phase === "starting" && "Requesting microphone…"}
            {phase === "recording" && "Recording"}
            {phase === "paused" && "Paused"}
          </span>
        </div>
        <div className="w-11" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <div className="text-center">
          <p className="font-mono text-5xl font-semibold tabular-nums">{formatDuration(elapsedSeconds)}</p>
          <p className="mt-1 text-sm text-foreground-muted">elapsed time</p>
        </div>

        <div className="w-full max-w-sm">
          <LevelMeter meter={meter} active={phase === "recording"} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          variant="secondary"
          className="w-full"
          onClick={phase === "recording" ? pause : resume}
          disabled={phase === "starting"}
        >
          {phase === "recording" ? "Pause" : "Resume"}
        </Button>
        <Button size="lg" className="w-full text-lg" onClick={finish} disabled={phase === "starting"}>
          Finish Session
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel this session?"
        description="Your recording so far will be discarded and not saved to your practice diary."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setConfirmingCancel(false);
          void cancelRecording();
        }}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  );
}

function defaultTitle(): string {
  const now = new Date();
  return `Practice session — ${now.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

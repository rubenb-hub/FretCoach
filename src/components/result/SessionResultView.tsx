"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PlaybackPlayer } from "./PlaybackPlayer";
import { ScoreSummary } from "./ScoreSummary";
import { CoachingPanel } from "./CoachingPanel";
import { SongInfoEditor } from "./SongInfoEditor";
import { NotesEditor } from "./NotesEditor";
import { DevPanel } from "./DevPanel";
import { MusicAnalysisPanel } from "@/components/issues/MusicAnalysisPanel";
import { PracticeModeToggle } from "@/components/reference/PracticeModeToggle";
import { ReferenceMaterialEditor } from "@/components/reference/ReferenceMaterialEditor";
import { ReferenceComparisonPanel } from "@/components/reference/ReferenceComparisonPanel";
import { SpotifyReferencePanel } from "@/components/spotify/SpotifyReferencePanel";
import { IntentionPicker } from "@/components/recording/IntentionPicker";
import { formatDate, formatDuration } from "@/lib/utils/format";
import type { PracticeSession } from "@/lib/types";

interface SessionResultViewProps {
  session: PracticeSession;
  mode: "unsaved" | "saved";
  developerMode: boolean;
  onChange: (patch: Partial<PracticeSession>) => void;
  onSave?: () => Promise<void> | void;
  onDiscard?: () => void;
  onDelete?: () => Promise<void> | void;
}

export function SessionResultView({
  session,
  mode,
  developerMode,
  onChange,
  onSave,
  onDiscard,
  onDelete,
}: SessionResultViewProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        {session.isDemo && (
          <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
            Demo session
          </span>
        )}
        {editingTitle ? (
          <input
            autoFocus
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xl font-semibold outline-none focus-visible:outline-2 focus-visible:outline-primary"
            value={session.title}
            onChange={(e) => onChange({ title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="flex items-center gap-2 text-left text-xl font-semibold"
            aria-label="Rename session"
          >
            {session.title || "Untitled session"}
            <span aria-hidden="true" className="text-sm text-foreground-muted">
              ✎
            </span>
          </button>
        )}
        <p className="text-sm text-foreground-muted">
          {formatDate(session.createdAt)} · {formatDuration(session.durationSeconds)}
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Practice intention</h3>
        <IntentionPicker value={session.intention} onChange={(intention) => onChange({ intention })} />
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recording</h3>
        <PlaybackPlayer blob={session.audioBlob} />
      </div>

      {session.analysis && <ScoreSummary analysis={session.analysis} />}
      {session.coaching && <CoachingPanel coaching={session.coaching} />}

      {session.audioBlob && (
        <MusicAnalysisPanel session={session} onMusicAnalysisComputed={(musicAnalysis) => onChange({ musicAnalysis })} />
      )}

      <Card className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Practice mode</h3>
        <PracticeModeToggle value={session.practiceMode ?? "free"} onChange={(practiceMode) => onChange({ practiceMode })} />
      </Card>

      {(session.practiceMode ?? "free") === "reference" && (
        <ReferenceMaterialEditor
          material={session.referenceMaterial ?? null}
          onChange={(referenceMaterial) => onChange({ referenceMaterial })}
        />
      )}

      {session.practiceMode === "reference" && session.referenceMaterial && session.musicAnalysis && (
        <ReferenceComparisonPanel material={session.referenceMaterial} analysis={session.musicAnalysis} />
      )}

      <SongInfoEditor song={session.song} onChange={(song) => onChange({ song })} />

      <SpotifyReferencePanel
        reference={session.spotifyReference ?? null}
        onChange={(spotifyReference) => onChange({ spotifyReference })}
      />

      <NotesEditor value={session.notes} onChange={(notes) => onChange({ notes })} />

      {developerMode && session.analysis && <DevPanel analysis={session.analysis} sessionId={session.id} />}

      <div className="flex flex-col gap-2 pb-4">
        {mode === "unsaved" && (
          <>
            <Button size="lg" onClick={() => void onSave?.()}>
              Save to practice diary
            </Button>
            <Button variant="secondary" onClick={onDiscard}>
              Discard session
            </Button>
          </>
        )}
        {mode === "saved" && (
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            Delete session
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this session?"
        description="This permanently removes the recording, analysis, and notes from this device. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          setConfirmingDelete(false);
          void onDelete?.();
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { SongInfo } from "@/lib/types";

interface SongInfoEditorProps {
  song: SongInfo | null;
  onChange: (song: SongInfo | null) => void;
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary";

export function SongInfoEditor({ song, onChange }: SongInfoEditorProps) {
  const [expanded, setExpanded] = useState(!!song?.title);

  const update = (patch: Partial<SongInfo>) => {
    onChange({ ...(song ?? {}), ...patch });
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="min-h-[44px] w-full rounded-2xl border border-dashed border-border text-sm font-medium text-foreground-muted"
      >
        + Add song details (title, section, goal)
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Song</h3>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Title
        <input
          className={inputClass}
          value={song?.title ?? ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Wonderwall"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Artist
        <input
          className={inputClass}
          value={song?.artist ?? ""}
          onChange={(e) => update({ artist: e.target.value })}
          placeholder="e.g. Oasis"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Section being practised
        <input
          className={inputClass}
          value={song?.section ?? ""}
          onChange={(e) => update({ section: e.target.value })}
          placeholder="e.g. chorus, bridge, intro riff"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Current goal
        <input
          className={inputClass}
          value={song?.goal ?? ""}
          onChange={(e) => update({ goal: e.target.value })}
          placeholder="e.g. clean chord changes at full tempo"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Difficulty (1-5)
        <input
          type="range"
          min={1}
          max={5}
          value={song?.difficulty ?? 3}
          onChange={(e) => update({ difficulty: Number(e.target.value) })}
          className="h-11"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Reference link (optional)
        <input
          className={inputClass}
          value={song?.referenceUrl ?? ""}
          onChange={(e) => update({ referenceUrl: e.target.value })}
          placeholder="Link to a video or tab you're using"
        />
      </label>
    </Card>
  );
}

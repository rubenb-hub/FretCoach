"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import type { ReferenceMaterial } from "@/lib/types";

interface ReferenceMaterialEditorProps {
  material: ReferenceMaterial | null;
  onChange: (material: ReferenceMaterial | null) => void;
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary";

/**
 * Manual entry for Reference Practice mode's "expected material" (FEATURE
 * 12). Everything here is typed in by the user — nothing is scraped or
 * auto-generated, and no copyrighted tablature is stored or reproduced.
 */
export function ReferenceMaterialEditor({ material, onChange }: ReferenceMaterialEditorProps) {
  const [expanded, setExpanded] = useState(!!material);

  const update = (patch: Partial<ReferenceMaterial>) => {
    onChange({ title: "", ...material, ...patch });
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="min-h-[44px] w-full rounded-2xl border border-dashed border-border text-sm font-medium text-foreground-muted"
      >
        + Add expected chords or notes (Reference Practice)
      </button>
    );
  }

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Reference material</h3>
      <p className="text-xs text-foreground-muted">
        Typed in by you, never scraped or auto-generated. Comparisons against this are always approximate.
      </p>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Exercise title
        <input
          className={inputClass}
          value={material?.title ?? ""}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Verse chord progression"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Expected chord progression
        <input
          className={inputClass}
          value={material?.chordProgression ?? ""}
          onChange={(e) => update({ chordProgression: e.target.value })}
          placeholder="e.g. G | D | Em | C"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Expected note sequence
        <input
          className={inputClass}
          value={material?.noteSequence ?? ""}
          onChange={(e) => update({ noteSequence: e.target.value })}
          placeholder="e.g. E3, G3, A3, B3"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
          Expected tempo (BPM)
          <input
            type="number"
            className={inputClass}
            value={material?.expectedTempoBpm ?? ""}
            onChange={(e) => update({ expectedTempoBpm: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
          Time signature
          <input
            className={inputClass}
            value={material?.timeSignature ?? ""}
            onChange={(e) => update({ timeSignature: e.target.value })}
            placeholder="4/4"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
          Capo fret
          <input
            type="number"
            min={0}
            max={12}
            className={inputClass}
            value={material?.capoFret ?? ""}
            onChange={(e) => update({ capoFret: e.target.value ? Number(e.target.value) : undefined })}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
          Tuning
          <input
            className={inputClass}
            value={material?.tuning ?? ""}
            onChange={(e) => update({ tuning: e.target.value })}
            placeholder="Standard (EADGBE)"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-foreground-muted">
        Instructions (optional)
        <textarea
          className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
          rows={2}
          value={material?.instructions ?? ""}
          onChange={(e) => update({ instructions: e.target.value })}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          onChange(null);
          setExpanded(false);
        }}
        className="text-left text-xs font-medium text-danger"
      >
        Remove reference material
      </button>
    </Card>
  );
}

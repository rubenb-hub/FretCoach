"use client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { downloadTextFile } from "@/lib/export/exportSession";
import { detectBrowserCapabilities } from "@/lib/capability/browserCapabilities";
import type { PracticeAnalysis } from "@/lib/types";

/** Developer mode: raw analysis internals, useful for testing/improving the listening engine. */
export function DevPanel({ analysis, sessionId }: { analysis: PracticeAnalysis; sessionId: string }) {
  const capabilities = typeof window !== "undefined" ? detectBrowserCapabilities() : null;

  const exportJson = () => {
    downloadTextFile(`fretcoach-analysis-${sessionId}.json`, JSON.stringify(analysis, null, 2));
  };

  return (
    <Card className="flex flex-col gap-3 border-dashed">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Developer mode</h3>
        <Button variant="secondary" size="md" onClick={exportJson}>
          Export analysis JSON
        </Button>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <DevRow label="Frame count" value={analysis.diagnostics.frameCount} />
        <DevRow label="Frame size (samples)" value={analysis.diagnostics.frameSizeSamples} />
        <DevRow label="Hop size (samples)" value={analysis.diagnostics.hopSizeSamples} />
        <DevRow label="Sample rate" value={analysis.diagnostics.sampleRate} />
        <DevRow label="Noise floor (RMS)" value={analysis.diagnostics.noiseFloorRms.toFixed(4)} />
        <DevRow label="Processing time" value={`${analysis.diagnostics.processingTimeMs.toFixed(0)}ms`} />
        <DevRow label="Onset count" value={analysis.onsets.length} />
        <DevRow label="Tempo confidence" value={analysis.tempo.confidence.toFixed(2)} />
        <DevRow label="Clipping events" value={analysis.dynamics.clippingEvents} />
        {capabilities && (
          <>
            <DevRow label="Preferred MIME type" value={capabilities.preferredMimeType ?? "n/a"} />
            <DevRow label="Secure context" value={String(capabilities.isSecureContext)} />
          </>
        )}
      </dl>
      <details>
        <summary className="cursor-pointer text-xs font-medium text-foreground-muted">
          Raw onset timestamps ({analysis.onsets.length})
        </summary>
        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl bg-surface-muted p-2 font-mono text-[11px]">
          {analysis.onsets.map((onset, i) => (
            <div key={i}>
              {onset.timeSeconds.toFixed(3)}s — strength {onset.strength.toFixed(2)}, confidence {onset.confidence.toFixed(2)}
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}

function DevRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col rounded-lg bg-surface-muted px-2 py-1.5">
      <dt className="text-foreground-muted">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

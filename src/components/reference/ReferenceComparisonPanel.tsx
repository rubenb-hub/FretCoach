import { Card } from "@/components/ui/Card";
import { compareToReferenceMaterial } from "@/lib/analysis/reference/referenceComparisonProvider";
import type { MusicAnalysisResult, ReferenceMaterial } from "@/lib/types";

interface ReferenceComparisonPanelProps {
  material: ReferenceMaterial;
  analysis: MusicAnalysisResult;
}

/** Shown only in Reference Practice mode once both reference material and
 * a music-analysis pass exist. Every comparison here is approximate —
 * see compareToReferenceMaterial's docs. */
export function ReferenceComparisonPanel({ material, analysis }: ReferenceComparisonPanelProps) {
  const result = compareToReferenceMaterial(material, analysis);

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        Reference comparison (approximate)
      </h3>
      <p className="text-sm text-foreground-muted">{result.summary}</p>

      {result.chordMatches && (
        <div className="flex flex-wrap gap-2">
          {result.chordMatches.map((m, i) => (
            <span
              key={`${m.expected}-${i}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                m.matched ? "bg-accent/15 text-accent" : "bg-surface-muted text-foreground-muted"
              }`}
            >
              {m.expected} {m.matched ? "✓" : "?"}
            </span>
          ))}
        </div>
      )}

      {result.noteMatches && (
        <div className="flex flex-wrap gap-2">
          {result.noteMatches.map((m, i) => (
            <span
              key={`${m.expected}-${i}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                m.matched ? "bg-accent/15 text-accent" : "bg-surface-muted text-foreground-muted"
              }`}
            >
              {m.expected} {m.matched ? "✓" : "?"}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

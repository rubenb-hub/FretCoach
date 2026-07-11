import { CHORD_TEMPLATES } from "./chordTemplates";
import type { ChordCandidate } from "@/lib/types";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface ChordMatchResult {
  primary: ChordCandidate | null;
  alternatives: ChordCandidate[];
}

/**
 * Scores a chroma vector against every chord template (Fujishima-style
 * cosine similarity) and returns the best match plus a small number of
 * close alternatives. Returns `primary: null` when even the best match is
 * below `minConfidence` — an ambiguous or silent window should not be
 * forced into a chord label.
 */
export function matchChordTemplate(chroma: number[], minConfidence: number, maxAlternatives = 3): ChordMatchResult {
  const scored = CHORD_TEMPLATES.map((template) => ({
    name: template.name,
    confidence: cosineSimilarity(chroma, template.vector),
    pitchClasses: chroma,
  })).sort((a, b) => b.confidence - a.confidence);

  const best = scored[0];
  if (!best || best.confidence < minConfidence) {
    return { primary: null, alternatives: [] };
  }

  const alternatives = scored
    .slice(1, 1 + maxAlternatives)
    .filter((candidate) => candidate.confidence >= best.confidence * 0.75);

  return { primary: best, alternatives };
}

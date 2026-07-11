/**
 * Manually user-entered "expected material" for Reference Practice mode
 * (see docs/audio-analysis-architecture.md). This is never scraped,
 * scraped from tab sites, or auto-generated — the user types it in
 * themselves, and the app treats any comparison against it as approximate.
 */
export interface ReferenceMaterial {
  title: string;
  expectedTempoBpm?: number;
  timeSignature?: string;
  /** e.g. "G | D | Em | C" */
  chordProgression?: string;
  /** e.g. "E3, G3, A3, B3" */
  noteSequence?: string;
  capoFret?: number;
  tuning?: string;
  instructions?: string;
}

/** Parsed, ready-to-compare form of a ReferenceMaterial's chord/note text fields. */
export interface ParsedReferenceMaterial {
  chords: string[];
  notes: string[];
}

const CHORD_SEPARATOR = /[|,]/;

/** Splits "G | D | Em | C" or "G, D, Em, C" into ["G","D","Em","C"]. Purely
 * textual — this does not validate that a string is a real chord name. */
export function parseChordProgression(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(CHORD_SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Splits "E3, G3, A3, B3" into ["E3","G3","A3","B3"]. */
export function parseNoteSequence(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseReferenceMaterial(material: ReferenceMaterial): ParsedReferenceMaterial {
  return {
    chords: parseChordProgression(material.chordProgression),
    notes: parseNoteSequence(material.noteSequence),
  };
}

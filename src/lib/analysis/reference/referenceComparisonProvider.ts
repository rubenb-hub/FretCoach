import type { ChordDetection, MusicAnalysisResult, ReferenceMaterial } from "@/lib/types";
import { parseChordProgression, parseNoteSequence } from "@/lib/types/referenceMaterial";
import { normalizeChordShorthand, normalizeNoteName } from "./chordShorthand";

export interface SequenceMatchItem {
  expected: string;
  matched: boolean;
}

export interface ReferenceComparisonResult {
  comparable: boolean;
  summary: string;
  chordMatches?: SequenceMatchItem[];
  noteMatches?: SequenceMatchItem[];
}

/** Longest-common-subsequence match count: how many `expected` items
 * appear, in order (not necessarily adjacent), within `detected`. This is
 * intentionally a loose/approximate comparison — it does not require
 * exact timing alignment, matching the product requirement that
 * reference comparison "must be treated as approximate". */
function longestCommonSubsequenceMask(expected: string[], detected: string[]): boolean[] {
  const n = expected.length;
  const m = detected.length;
  const table: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      table[i][j] = expected[i - 1] === detected[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }

  const matched = new Array(n).fill(false);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (expected[i - 1] === detected[j - 1]) {
      matched[i - 1] = true;
      i--;
      j--;
    } else if (table[i - 1][j] >= table[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return matched;
}

function dedupeConsecutive(names: string[]): string[] {
  const result: string[] = [];
  for (const name of names) {
    if (result[result.length - 1] !== name) result.push(name);
  }
  return result;
}

function detectedChordSequence(chords: ChordDetection[]): string[] {
  return dedupeConsecutive([...chords].sort((a, b) => a.startTime - b.startTime).map((c) => c.primary.name));
}

/**
 * Conservatively compares detected playing against manually-entered
 * reference material (Reference Practice mode only — see FEATURE 12).
 * Never claims exact alignment: matches are order-based (an expected
 * chord "counts" if it appears anywhere in the right relative order,
 * not at an exact timestamp), and anything with too little data on
 * either side is reported as not comparable rather than guessed at.
 */
export function compareToReferenceMaterial(
  material: ReferenceMaterial,
  analysis: MusicAnalysisResult
): ReferenceComparisonResult {
  const expectedChords = parseChordProgression(material.chordProgression)
    .map(normalizeChordShorthand)
    .filter((c): c is string => c !== null);
  const expectedNotes = parseNoteSequence(material.noteSequence)
    .map(normalizeNoteName)
    .filter((n): n is string => n !== null);

  if (expectedChords.length === 0 && expectedNotes.length === 0) {
    return {
      comparable: false,
      summary: "No usable chord progression or note sequence was entered to compare against.",
    };
  }

  let chordMatches: SequenceMatchItem[] | undefined;
  let noteMatches: SequenceMatchItem[] | undefined;
  let anyComparable = false;

  if (expectedChords.length > 0) {
    const detected = detectedChordSequence(analysis.chords);
    if (detected.length > 0) {
      const mask = longestCommonSubsequenceMask(expectedChords, detected);
      chordMatches = expectedChords.map((expected, i) => ({ expected, matched: mask[i] }));
      anyComparable = true;
    } else {
      chordMatches = expectedChords.map((expected) => ({ expected, matched: false }));
    }
  }

  if (expectedNotes.length > 0) {
    const detected = dedupeConsecutive(
      [...analysis.notes].sort((a, b) => a.startTime - b.startTime).map((n) => `${n.noteName}${n.octave}`)
    );
    if (detected.length > 0) {
      const mask = longestCommonSubsequenceMask(expectedNotes, detected);
      noteMatches = expectedNotes.map((expected, i) => ({ expected, matched: mask[i] }));
      anyComparable = true;
    } else {
      noteMatches = expectedNotes.map((expected) => ({ expected, matched: false }));
    }
  }

  if (!anyComparable) {
    return {
      comparable: false,
      summary: "Not enough was detected in this recording to compare against the reference material.",
    };
  }

  const chordSummary = chordMatches
    ? `${chordMatches.filter((m) => m.matched).length} of ${chordMatches.length} expected chords were plausibly detected, in roughly the right order.`
    : null;
  const noteSummary = noteMatches
    ? `${noteMatches.filter((m) => m.matched).length} of ${noteMatches.length} expected notes were plausibly detected, in roughly the right order.`
    : null;

  return {
    comparable: true,
    summary: [chordSummary, noteSummary].filter(Boolean).join(" "),
    chordMatches,
    noteMatches,
  };
}

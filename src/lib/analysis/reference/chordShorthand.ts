import { NOTE_NAMES, chordName, type ChordQuality } from "@/lib/analysis/chords/chordTemplates";

const ROOT_PATTERN = /^([A-G])([#b]?)/;

/** Longest/most specific suffixes first — "maj7" and "m7" both contain an
 * "m", so they must be checked before the bare minor-third shorthand "m". */
const SUFFIX_TO_QUALITY: [string, ChordQuality][] = [
  ["maj7", "major7"],
  ["m7", "minor7"],
  ["sus2", "sus2"],
  ["sus4", "sus4"],
  ["dim", "minor"], // no dedicated diminished template yet; minor is the closest supported quality
  ["m", "minor"],
  ["7", "dominant7"],
  ["5", "power"],
  ["", "major"],
];

/**
 * Parses common chord shorthand ("G", "Em", "C7", "Dsus4", "F#m7", "Bb")
 * as typed in a manual chord progression, and re-renders it using the
 * same naming convention the chord detector uses ("G major", "E minor",
 * "C7", ...) so the two are directly comparable. Returns null for text
 * that doesn't parse as a chord — this is deliberately simple shorthand
 * parsing, not a general chord-notation grammar.
 */
export function normalizeChordShorthand(input: string): string | null {
  const trimmed = input.trim();
  const rootMatch = ROOT_PATTERN.exec(trimmed);
  if (!rootMatch) return null;

  const [, letter, accidental] = rootMatch;
  const naturalIndex: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pitchClass = naturalIndex[letter];
  if (accidental === "#") pitchClass = (pitchClass + 1) % 12;
  if (accidental === "b") pitchClass = (pitchClass + 11) % 12;

  const suffix = trimmed.slice(rootMatch[0].length).trim();
  const match = SUFFIX_TO_QUALITY.find(([pattern]) => suffix.toLowerCase() === pattern);
  if (!match) return null;

  return chordName(pitchClass, match[1]);
}

export function normalizeNoteName(input: string): string | null {
  const trimmed = input.trim();
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(trimmed);
  if (!match) return null;
  const [, letter, accidental, octaveStr] = match;
  const naturalIndex: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let pitchClass = naturalIndex[letter];
  if (accidental === "#") pitchClass = (pitchClass + 1) % 12;
  if (accidental === "b") pitchClass = (pitchClass + 11) % 12;
  return `${NOTE_NAMES[pitchClass]}${octaveStr}`;
}

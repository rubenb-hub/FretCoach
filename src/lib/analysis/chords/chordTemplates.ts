/**
 * Binary chord templates (Fujishima-style pitch-class-profile matching):
 * each template marks which of the 12 pitch classes are chord tones,
 * relative to a root of pitch-class 0. Matching rotates each template to
 * all 12 roots and compares against a window's chroma vector via cosine
 * similarity (see chordMatching.ts).
 *
 * Only the qualities explicitly listed in the product spec are supported.
 * This is a conservative first pass, not a general chord-recognition
 * system — see docs/audio-analysis-architecture.md for limitations
 * (distortion, incomplete voicings, alternate tunings, capo, backing
 * music, phone mic compression all reduce reliability).
 */
export type ChordQuality =
  | "major"
  | "minor"
  | "power"
  | "dominant7"
  | "major7"
  | "minor7"
  | "sus2"
  | "sus4";

export const CHORD_QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  power: [0, 7],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
};

export const CHORD_QUALITY_LABELS: Record<ChordQuality, string> = {
  major: "",
  minor: "m",
  power: "5",
  dominant7: "7",
  major7: "maj7",
  minor7: "m7",
  sus2: "sus2",
  sus4: "sus4",
};

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export interface ChordTemplate {
  name: string;
  root: number;
  quality: ChordQuality;
  /** 12-length binary vector, pitch class 0 = C. */
  vector: number[];
}

function rotateVector(intervals: number[], root: number): number[] {
  const vector = new Array(12).fill(0);
  for (const interval of intervals) {
    vector[(root + interval) % 12] = 1;
  }
  return vector;
}

/** Same naming convention used by the chord-detection templates, also
 * reused by the reference-material chord-shorthand parser so a
 * user-typed "Em" and a detected "E minor" chord are directly comparable. */
export function chordName(root: number, quality: ChordQuality): string {
  const rootName = NOTE_NAMES[root];
  if (quality === "major") return `${rootName} major`;
  if (quality === "minor") return `${rootName} minor`;
  if (quality === "power") return `${rootName}5`;
  if (quality === "dominant7") return `${rootName}7`;
  if (quality === "major7") return `${rootName}maj7`;
  if (quality === "minor7") return `${rootName}m7`;
  if (quality === "sus2") return `${rootName}sus2`;
  return `${rootName}sus4`;
}

/** All 12 roots x 8 qualities = 96 templates, generated once at module load. */
export const CHORD_TEMPLATES: ChordTemplate[] = (() => {
  const templates: ChordTemplate[] = [];
  for (let root = 0; root < 12; root++) {
    for (const quality of Object.keys(CHORD_QUALITY_INTERVALS) as ChordQuality[]) {
      templates.push({
        name: chordName(root, quality),
        root,
        quality,
        vector: rotateVector(CHORD_QUALITY_INTERVALS[quality], root),
      });
    }
  }
  return templates;
})();

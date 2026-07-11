import type { PracticeIssueCategory } from "@/lib/types";

/** Category -> glyph + colour, shared between timeline markers and issue
 * cards so identity is never colour-only (each category also gets a
 * distinct glyph and text label everywhere it's shown). */
export const ISSUE_CATEGORY_VISUALS: Record<PracticeIssueCategory, { glyph: string; color: string }> = {
  fret_buzz: { glyph: "◈", color: "#b5652c" },
  note_clarity: { glyph: "◐", color: "#3f6c5e" },
  pitch: { glyph: "〜", color: "#7a5cb5" },
  timing: { glyph: "◷", color: "#c1442a" },
  chord_transition: { glyph: "⇄", color: "#2c6fb5" },
  string_noise: { glyph: "≈", color: "#6b6259" },
};

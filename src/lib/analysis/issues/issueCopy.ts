import type { AnalysisEventCategory, PracticeIssueCategory } from "@/lib/types";

/** Maps a raw detector category onto the coarser PracticeIssue category
 * used for grouping/UI. `string_noise` is included for completeness even
 * though nothing currently emits it (see deriveEvents.ts). */
export const EVENT_TO_ISSUE_CATEGORY: Record<AnalysisEventCategory, PracticeIssueCategory | null> = {
  note: null,
  chord: null,
  pitch_instability: "pitch",
  timing_inconsistency: "timing",
  possible_fret_buzz: "fret_buzz",
  unclear_attack: "note_clarity",
  muted_note: "note_clarity",
  string_noise: "string_noise",
  chord_transition: "chord_transition",
};

interface IssueCopyTemplate {
  title: string;
  tips: string[];
}

export const ISSUE_COPY: Record<PracticeIssueCategory, IssueCopyTemplate> = {
  fret_buzz: {
    title: "Possible fret buzz",
    tips: [
      "Try playing each string individually and place the fretting finger just behind the fret.",
      "Check whether a neighbouring finger is lightly touching this string.",
      "A little more pressure right behind the fret wire (not on top of it) often clears buzz.",
    ],
  },
  note_clarity: {
    title: "Reduced note clarity",
    tips: [
      "Play this note alone, slowly, and check where each finger lands.",
      "Make sure no other finger is resting against this string.",
      "Try a firmer, more deliberate attack and let the note ring fully.",
    ],
  },
  pitch: {
    title: "Pitch appeared unstable",
    tips: [
      "Hold the note longer and listen for any drift as it rings out.",
      "Check that the fretting finger isn't shifting position while the note sustains.",
      "Try holding the string with slightly more even pressure along its length.",
    ],
  },
  timing: {
    title: "Timing varied in this section",
    tips: [
      "Loop this section with a metronome at a slower tempo.",
      "Isolate just the beat before and after the transition that feels rushed or dragged.",
      "Build the tempo back up gradually once it feels steady.",
    ],
  },
  chord_transition: {
    title: "This chord change had a rough transition",
    tips: [
      "Practise just the two chord shapes, back and forth, slowly.",
      "Look for a finger you can leave in place between the two shapes.",
      "Lift only the fingers that need to move, not the whole hand.",
    ],
  },
  string_noise: {
    title: "Possible string noise",
    tips: [
      "Check whether an open or unused string is ringing between notes.",
      "Try lightly muting strings you aren't playing with your fretting-hand fingers.",
    ],
  },
};

/** Converts a 0-1 confidence into the plain-language wording the product
 * spec requires ("Low confidence" / "Moderate confidence" / "High
 * confidence") — never a bare decimal as the primary copy. */
export function confidenceWording(confidence: number): "Low confidence" | "Moderate confidence" | "High confidence" {
  if (confidence >= 0.75) return "High confidence";
  if (confidence >= 0.5) return "Moderate confidence";
  return "Low confidence";
}

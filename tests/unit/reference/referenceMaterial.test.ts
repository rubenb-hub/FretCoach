import { describe, expect, it } from "vitest";
import { parseChordProgression, parseNoteSequence, parseReferenceMaterial } from "@/lib/types/referenceMaterial";

describe("reference material parsing", () => {
  it("parses a pipe-separated chord progression", () => {
    expect(parseChordProgression("G | D | Em | C")).toEqual(["G", "D", "Em", "C"]);
  });

  it("parses a comma-separated chord progression", () => {
    expect(parseChordProgression("G, D, Em, C")).toEqual(["G", "D", "Em", "C"]);
  });

  it("parses a comma-separated note sequence", () => {
    expect(parseNoteSequence("E3, G3, A3, B3")).toEqual(["E3", "G3", "A3", "B3"]);
  });

  it("returns an empty array for undefined or blank input", () => {
    expect(parseChordProgression(undefined)).toEqual([]);
    expect(parseNoteSequence("")).toEqual([]);
  });

  it("parses a full ReferenceMaterial object", () => {
    const parsed = parseReferenceMaterial({
      title: "Verse practice",
      chordProgression: "G | D | Em | C",
      noteSequence: "E3, G3, A3",
    });
    expect(parsed.chords).toEqual(["G", "D", "Em", "C"]);
    expect(parsed.notes).toEqual(["E3", "G3", "A3"]);
  });
});

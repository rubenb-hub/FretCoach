import { describe, expect, it } from "vitest";
import { normalizeChordShorthand, normalizeNoteName } from "@/lib/analysis/reference/chordShorthand";

describe("normalizeChordShorthand", () => {
  it("parses a bare major chord", () => {
    expect(normalizeChordShorthand("G")).toBe("G major");
  });

  it("parses a minor chord", () => {
    expect(normalizeChordShorthand("Em")).toBe("E minor");
  });

  it("parses a dominant 7th chord", () => {
    expect(normalizeChordShorthand("C7")).toBe("C7");
  });

  it("parses a major 7th chord distinctly from a bare 7th", () => {
    expect(normalizeChordShorthand("Cmaj7")).toBe("Cmaj7");
  });

  it("parses a minor 7th chord", () => {
    expect(normalizeChordShorthand("Am7")).toBe("Am7");
  });

  it("parses sus2/sus4 chords", () => {
    expect(normalizeChordShorthand("Dsus4")).toBe("Dsus4");
    expect(normalizeChordShorthand("Asus2")).toBe("Asus2");
  });

  it("handles sharps and flats", () => {
    expect(normalizeChordShorthand("F#")).toBe("F# major");
    expect(normalizeChordShorthand("Bb")).toBe("A# major");
  });

  it("returns null for unparseable input", () => {
    expect(normalizeChordShorthand("")).toBeNull();
    expect(normalizeChordShorthand("H")).toBeNull();
    expect(normalizeChordShorthand("Gxyz")).toBeNull();
  });
});

describe("normalizeNoteName", () => {
  it("normalises a plain note name", () => {
    expect(normalizeNoteName("E3")).toBe("E3");
  });

  it("normalises a flat to its sharp equivalent", () => {
    expect(normalizeNoteName("Bb3")).toBe("A#3");
  });

  it("returns null for unparseable input", () => {
    expect(normalizeNoteName("not a note")).toBeNull();
  });
});

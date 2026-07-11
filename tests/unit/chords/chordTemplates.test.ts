import { describe, expect, it } from "vitest";
import { CHORD_TEMPLATES } from "@/lib/analysis/chords/chordTemplates";

function templateFor(name: string) {
  const template = CHORD_TEMPLATES.find((t) => t.name === name);
  if (!template) throw new Error(`No template named ${name}`);
  return template;
}

describe("chord templates", () => {
  it("has 96 templates (12 roots x 8 qualities)", () => {
    expect(CHORD_TEMPLATES).toHaveLength(96);
  });

  it("builds a correct C major template (root, major third, fifth)", () => {
    expect(templateFor("C major").vector).toEqual([1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0]);
  });

  it("builds a correct A minor template (root, minor third, fifth)", () => {
    // A=9, C=0, E=4
    const vector = templateFor("A minor").vector;
    expect(vector[9]).toBe(1);
    expect(vector[0]).toBe(1);
    expect(vector[4]).toBe(1);
    expect(vector.reduce((a: number, b: number) => a + b, 0)).toBe(3);
  });

  it("builds a power chord with just root and fifth", () => {
    const vector = templateFor("E5").vector;
    expect(vector.reduce((a: number, b: number) => a + b, 0)).toBe(2);
    expect(vector[4]).toBe(1); // E
    expect(vector[11]).toBe(1); // B (fifth of E)
  });

  it("builds dominant7/major7/minor7 with the correct seventh", () => {
    expect(templateFor("C7").vector[10]).toBe(1); // flat 7 (Bb)
    expect(templateFor("Cmaj7").vector[11]).toBe(1); // major 7 (B)
    expect(templateFor("Cm7").vector[10]).toBe(1); // flat 7 (Bb)
    expect(templateFor("Cm7").vector[3]).toBe(1); // minor third (Eb)
  });

  it("builds sus2 and sus4 without a third", () => {
    const sus2 = templateFor("Csus2").vector;
    const sus4 = templateFor("Csus4").vector;
    expect(sus2[4]).toBe(0);
    expect(sus2[3]).toBe(0);
    expect(sus2[2]).toBe(1); // D
    expect(sus4[4]).toBe(0);
    expect(sus4[3]).toBe(0);
    expect(sus4[5]).toBe(1); // F
  });
});

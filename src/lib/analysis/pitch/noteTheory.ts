/**
 * Pure equal-temperament note-naming utilities. A4 = 440Hz = MIDI 69,
 * standard scientific pitch notation (C4 = middle C = MIDI 60).
 */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const A4_MIDI = 69;
const A4_FREQUENCY = 440;

export function frequencyToMidi(frequencyHz: number): number {
  return A4_MIDI + 12 * Math.log2(frequencyHz / A4_FREQUENCY);
}

export function midiToFrequency(midiNote: number): number {
  return A4_FREQUENCY * 2 ** ((midiNote - A4_MIDI) / 12);
}

export function midiToNoteName(midiNote: number): { name: string; octave: number } {
  const rounded = Math.round(midiNote);
  const name = NOTE_NAMES[((rounded % 12) + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave };
}

/** Cents offset of a real-valued MIDI number from its nearest integer semitone. */
export function centsOffsetFromNearestSemitone(midiNote: number): number {
  const nearest = Math.round(midiNote);
  return Math.round((midiNote - nearest) * 100);
}

/** Convenience: frequency -> {noteName, octave, centsOffset, nearestMidi}. */
export function describeFrequency(frequencyHz: number): {
  midiNote: number;
  nearestMidi: number;
  noteName: string;
  octave: number;
  centsOffset: number;
} {
  const midiNote = frequencyToMidi(frequencyHz);
  const nearestMidi = Math.round(midiNote);
  const { name, octave } = midiToNoteName(midiNote);
  return {
    midiNote,
    nearestMidi,
    noteName: name,
    octave,
    centsOffset: centsOffsetFromNearestSemitone(midiNote),
  };
}

/** Standard 6-string guitar range, low E2 to a generous high fret ceiling
 * (E6, three octaves above open low E). Detections outside this range are
 * treated as spurious (e.g. octave errors, room noise) rather than real
 * notes. Configurable per Feature 4's requirement. */
export const DEFAULT_GUITAR_RANGE_HZ = {
  minHz: 73.4, // D2, a semitone below standard low E2, to tolerate drop tunings
  maxHz: 1400, // roughly E6 plus headroom
};

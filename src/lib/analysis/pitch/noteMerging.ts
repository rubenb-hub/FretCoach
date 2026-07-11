import { v4 as uuidv4 } from "uuid";
import type { NoteDetection } from "@/lib/types";
import { describeFrequency, DEFAULT_GUITAR_RANGE_HZ } from "./noteTheory";
import type { PitchFrame } from "./pitchTrack";

export interface NoteMergingOptions {
  /** Frames below this YIN confidence are treated as unvoiced/silent. */
  minConfidence: number;
  /** How far (in cents) a frame's pitch can drift from the current note's
   * running average and still be considered "the same note" (natural
   * vibrato/bend tolerance). */
  maxCentsDeviation: number;
  /** Notes shorter than this are discarded as likely noise/transients. */
  minNoteDurationSeconds: number;
  minFrequencyHz: number;
  maxFrequencyHz: number;
  /** Seconds each pitch frame covers, for the final note's end-time. */
  frameDurationSeconds: number;
}

export const DEFAULT_NOTE_MERGING_OPTIONS: Omit<NoteMergingOptions, "frameDurationSeconds"> = {
  minConfidence: 0.5,
  maxCentsDeviation: 50,
  minNoteDurationSeconds: 0.06,
  minFrequencyHz: DEFAULT_GUITAR_RANGE_HZ.minHz,
  maxFrequencyHz: DEFAULT_GUITAR_RANGE_HZ.maxHz,
};

interface RunFrame {
  timeSeconds: number;
  frequencyHz: number;
  confidence: number;
  rms: number;
}

/**
 * Corrects an apparent octave jump: if `frequencyHz` is ~1 or 2 octaves
 * above or below `referenceHz` (within `toleranceCents`), returns the
 * frequency folded into the reference's octave. YIN occasionally locks
 * onto a harmonic or sub-harmonic for a frame or two; this is a cheap,
 * effective fix rather than a more expensive multi-candidate search.
 */
function correctOctaveJump(frequencyHz: number, referenceHz: number, toleranceCents = 65): number {
  const centsFromReference = 1200 * Math.log2(frequencyHz / referenceHz);
  for (const octaveShift of [-2, -1, 1, 2]) {
    const target = octaveShift * 1200;
    if (Math.abs(centsFromReference - target) <= toleranceCents) {
      return frequencyHz / 2 ** octaveShift;
    }
  }
  return frequencyHz;
}

function finalizeNote(frames: RunFrame[], options: NoteMergingOptions): NoteDetection | null {
  const startTime = frames[0].timeSeconds;
  const endTime = frames[frames.length - 1].timeSeconds + options.frameDurationSeconds;
  if (endTime - startTime < options.minNoteDurationSeconds) return null;

  const referenceHz = frames[0].frequencyHz;
  const centsOffsetPerFrame = frames.map((f) => 1200 * Math.log2(f.frequencyHz / referenceHz));
  const totalWeight = frames.reduce((sum, f) => sum + f.confidence, 0) || 1;
  const meanCents = frames.reduce((sum, f, i) => sum + f.confidence * centsOffsetPerFrame[i], 0) / totalWeight;
  const frequencyHz = referenceHz * 2 ** (meanCents / 1200);

  const confidence = frames.reduce((sum, f) => sum + f.confidence, 0) / frames.length;
  const rms = frames.reduce((sum, f) => sum + f.rms * f.confidence, 0) / totalWeight;

  const centsVariance =
    frames.reduce((sum, f, i) => sum + f.confidence * (centsOffsetPerFrame[i] - meanCents) ** 2, 0) / totalWeight;
  const centsStdDev = Math.sqrt(Math.max(0, centsVariance));
  // 30 cents of wobble or more is treated as "not stable at all"; this
  // threshold is a documented judgement call, not a measured constant.
  const pitchStability = Math.max(0, Math.min(1, 1 - centsStdDev / 30));

  if (frequencyHz < options.minFrequencyHz || frequencyHz > options.maxFrequencyHz) return null;

  const described = describeFrequency(frequencyHz);
  return {
    id: uuidv4(),
    startTime,
    endTime,
    frequencyHz,
    midiNote: described.nearestMidi,
    noteName: described.noteName,
    octave: described.octave,
    centsOffset: described.centsOffset,
    confidence,
    rms,
    pitchStability,
  };
}

/**
 * Merges a stream of per-frame YIN pitch estimates into discrete
 * NoteDetection events: consecutive confident, pitch-compatible frames
 * become one note; silence, a confidence drop, or a real pitch change
 * ends the current run. This is monophonic note detection — it will not
 * separate simultaneous notes in a chord (see lib/analysis/chords for
 * that case).
 */
export function mergePitchFramesToNotes(
  frames: PitchFrame[],
  frameDurationSeconds: number,
  options: Partial<Omit<NoteMergingOptions, "frameDurationSeconds">> = {}
): NoteDetection[] {
  const opts: NoteMergingOptions = { ...DEFAULT_NOTE_MERGING_OPTIONS, ...options, frameDurationSeconds };
  const notes: NoteDetection[] = [];
  let run: RunFrame[] = [];

  const closeRun = () => {
    if (run.length === 0) return;
    const note = finalizeNote(run, opts);
    if (note) notes.push(note);
    run = [];
  };

  for (const frame of frames) {
    const voiced =
      frame.frequencyHz !== null &&
      frame.confidence >= opts.minConfidence &&
      frame.frequencyHz >= opts.minFrequencyHz &&
      frame.frequencyHz <= opts.maxFrequencyHz;

    if (!voiced) {
      closeRun();
      continue;
    }

    const frequencyHz = frame.frequencyHz as number;

    if (run.length === 0) {
      run.push({ timeSeconds: frame.timeSeconds, frequencyHz, confidence: frame.confidence, rms: frame.rms });
      continue;
    }

    const referenceHz = run[run.length - 1].frequencyHz;
    const corrected = correctOctaveJump(frequencyHz, referenceHz);
    const centsFromRun = 1200 * Math.log2(corrected / referenceHz);

    if (Math.abs(centsFromRun) <= opts.maxCentsDeviation) {
      run.push({ timeSeconds: frame.timeSeconds, frequencyHz: corrected, confidence: frame.confidence, rms: frame.rms });
    } else {
      closeRun();
      run.push({ timeSeconds: frame.timeSeconds, frequencyHz, confidence: frame.confidence, rms: frame.rms });
    }
  }
  closeRun();

  return notes;
}

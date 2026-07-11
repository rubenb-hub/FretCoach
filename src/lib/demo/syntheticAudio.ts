/** Synthetic audio generators used to give the analysis engine deterministic,
 * known-answer signals for demo sessions and tests, instead of relying on real guitar recordings. */

export const DEMO_SAMPLE_RATE = 44100;

function makeBuffer(durationSeconds: number, sampleRate = DEMO_SAMPLE_RATE): Float32Array {
  return new Float32Array(Math.floor(durationSeconds * sampleRate));
}

/** Adds a decaying "click" (broadband burst plus a short resonant tail) at a
 * given time, simulating a strum/pick attack. The tail is long enough that
 * a steady stream of clicks reads as continuous playing (bridging the
 * activity detector's gap tolerance) rather than isolated percussive
 * blips, which is a closer approximation of a real strummed/picked note. */
function addClick(
  buffer: Float32Array,
  timeSeconds: number,
  sampleRate: number,
  amplitude: number,
  clickDurationSeconds = 0.35
) {
  const startSample = Math.floor(timeSeconds * sampleRate);
  const lengthSamples = Math.floor(clickDurationSeconds * sampleRate);
  for (let i = 0; i < lengthSamples; i++) {
    const idx = startSample + i;
    if (idx < 0 || idx >= buffer.length) continue;
    // Two separate envelopes: a brief broadband noise burst for the
    // spectral-flux onset detector to latch onto (real pick/strum attacks
    // are noisy for only the first few milliseconds), and a slower
    // harmonic decay for the sustain — this keeps the sustained portion
    // dominated by stable harmonic content, which the pitch/chord
    // detectors (added after the original timing/dynamics engine) need to
    // see something resembling a real held note rather than continuous
    // noise.
    const sustainDecay = Math.exp(-i / (lengthSamples * 0.35));
    const attackNoiseDecay = Math.exp(-i / (sampleRate * 0.005));
    const t = i / sampleRate;
    // Weights sum to 0.9 even in the (rare) worst-case where every term
    // peaks simultaneously, leaving headroom below the clipping threshold
    // for every scenario except the dedicated clipped-signal generator.
    const harmonicTone =
      Math.sin(2 * Math.PI * 220 * t) * 0.4 +
      Math.sin(2 * Math.PI * 440 * t) * 0.18 +
      Math.sin(2 * Math.PI * 660 * t) * 0.1;
    const attackNoise = (Math.random() * 2 - 1) * 0.22;
    buffer[idx] += (harmonicTone * sustainDecay + attackNoise * attackNoiseDecay) * amplitude;
  }
}

function addAmbientNoise(buffer: Float32Array, amplitude: number) {
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] += (Math.random() * 2 - 1) * amplitude;
  }
}

export interface ClickTrackOptions {
  bpm: number;
  durationSeconds: number;
  sampleRate?: number;
  amplitude?: number;
  noiseAmplitude?: number;
  /** BPM drift applied linearly across the track, in BPM per second. */
  driftPerSecond?: number;
  /** Attack amplitude jitter, 0 = perfectly even, 1 = highly uneven. */
  amplitudeJitter?: number;
}

/** A steady (or drifting) click track standing in for consistent strumming. */
export function generateClickTrack(options: ClickTrackOptions): Float32Array {
  const {
    bpm,
    durationSeconds,
    sampleRate = DEMO_SAMPLE_RATE,
    amplitude = 0.8,
    noiseAmplitude = 0.002,
    driftPerSecond = 0,
    amplitudeJitter = 0,
  } = options;
  const buffer = makeBuffer(durationSeconds, sampleRate);
  addAmbientNoise(buffer, noiseAmplitude);

  let t = 0;
  let currentBpm = bpm;
  while (t < durationSeconds) {
    const jitter = 1 - amplitudeJitter / 2 + Math.random() * amplitudeJitter;
    addClick(buffer, t, sampleRate, amplitude * jitter);
    currentBpm = bpm + driftPerSecond * t;
    t += 60 / currentBpm;
  }
  return buffer;
}

/** A click track with one or more long silent gaps inserted. */
export function generateClickTrackWithPauses(
  options: ClickTrackOptions & { pauses: { atSeconds: number; durationSeconds: number }[] }
): Float32Array {
  const { pauses, ...rest } = options;
  const base = generateClickTrack({ ...rest, durationSeconds: rest.durationSeconds + pauses.length * 0 });
  const sampleRate = options.sampleRate ?? DEMO_SAMPLE_RATE;

  // Build an output buffer by copying `base` but silencing (zeroing, plus
  // a tiny noise floor) the requested pause windows.
  const output = base.slice();
  for (const pause of pauses) {
    const start = Math.floor(pause.atSeconds * sampleRate);
    const end = Math.floor((pause.atSeconds + pause.durationSeconds) * sampleRate);
    for (let i = start; i < end && i < output.length; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.001;
    }
  }
  return output;
}

export function generateSilence(durationSeconds: number, sampleRate = DEMO_SAMPLE_RATE): Float32Array {
  const buffer = makeBuffer(durationSeconds, sampleRate);
  addAmbientNoise(buffer, 0.001);
  return buffer;
}

/** A signal that clips (hard-limited near full scale) for part of its duration. */
export function generateClippedClickTrack(options: ClickTrackOptions): Float32Array {
  const buffer = generateClickTrack({ ...options, amplitude: 1.5 });
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = Math.max(-1, Math.min(1, buffer[i]));
  }
  return buffer;
}

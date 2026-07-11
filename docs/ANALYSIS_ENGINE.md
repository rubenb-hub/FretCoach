# The local analysis engine

Everything here runs synchronously in the browser (`src/lib/analysis/`),
orchestrated by `analyzeSession()`. There is no server round-trip and no
external model. The goal is **measurable, honest observations** — never a
claim about song, chord, note, or technique identity.

## Pipeline

```
Blob
  -> decodeAudioBlob()        Web Audio decodeAudioData, wrapped for friendly errors
  -> toMonoSamples()          downmix all channels by averaging
  -> extractFrameFeatures()   RMS, peak, ZCR, spectral centroid, spectral flux per frame
  -> detectActivity()         active/silence classification, pause segments
  -> detectOnsets()           attack timestamps from spectral flux
  -> estimateTempo()          BPM candidate scoring from onset intervals
  -> analyseTiming()          consistency score, strongest/weakest segment, first/second-half drift
  -> analyseDynamics()        attack-strength evenness, clipping, quiet sections
  -> analyseSegments()        ~20s window breakdown of all of the above
  -> assessRecordingQuality() clipping / low input / high noise / short-duration flags
  -> PracticeAnalysis
```

`analyzeSession()` accepts an `onStage` callback fired once per pipeline
stage (`preparing-audio`, `detecting-activity`, `estimating-pulse`,
`measuring-consistency`, `generating-notes`) — this drives the Processing
screen's progress list. There is no artificial delay; the stages are real
compute boundaries.

## Frame parameters (`lib/analysis/frames.ts`)

- **Frame size: 2048 samples** (~46ms at 44.1kHz) — enough frequency
  resolution (~21.5Hz/bin) to estimate spectral centroid across the guitar's
  fundamental + harmonic range.
- **Hop size: 512 samples** (~11.6ms, 75% overlap) — enough time resolution
  to localize strum/pick attacks for onset detection, while keeping the
  total frame count for a multi-minute recording tractable for in-browser
  processing (a 3-minute recording is ~15,500 frames).
- A **Hann window** is applied before each frame's FFT to reduce spectral
  leakage. The FFT itself (`lib/analysis/fft.ts`) is a small hand-written
  iterative radix-2 implementation — this avoids pulling in an external DSP
  dependency for what's ultimately one fixed-size real-input magnitude
  spectrum per frame.

## Active playing / pause detection (`lib/analysis/activity.ts`)

The noise floor is estimated as the **15th percentile of frame RMS** across
the whole recording, not a fixed absolute threshold — a quiet bedroom
recording and a loud amp recording need very different absolute cutoffs.
The active-frame threshold is `noiseFloor + sensitivityMultiplier × max(noiseFloor, (peak - noiseFloor) × 0.05)`,
where `sensitivityMultiplier` comes from the user's analysis-sensitivity
setting (low/standard/high). A short (300ms) hysteresis bridge prevents a
single quiet frame inside a phrase from fragmenting one active region into
many.

**Pauses** are inactive regions at or above the configurable long-pause
threshold (default 3s). **Repeated-attempt clusters** are a *conservative
approximation*: three or more active regions under 10 seconds, clustered
within a 45-second window. This is explicitly labelled as approximate in
the UI/coaching copy — the app does not claim to recognise that the same
musical passage was replayed, only that short attempts clustered together.

## Onset detection (`lib/analysis/onsets.ts`)

Standard spectral-flux-based onset detection (Bello et al.): flux is
smoothed with a small moving average, then compared against a
locally-adaptive threshold (`local mean + 1.5 × local std` over a ~1s
window) so sensitivity adapts to how "busy" a section is rather than using
one global cutoff. A local peak above threshold, at least 100ms after the
previous onset, counts as an onset. Each onset also has to clear an
absolute energy floor (`3× the recording's own noise-floor RMS`) — relative
thresholding alone can't distinguish a real attack from noise that happens
to have "peaks" relative to itself, which is why a near-silent recording
doesn't produce a stream of false onsets (see `tests/unit/analysis/onsets.test.ts`).

This works reasonably for acoustic guitar, clean electric, basic strumming,
and single-note picking. It's less reliable for heavy distortion, loud
backing tracks, drums, vocals, or noisy rooms — which is why
`recordingQuality` carries explicit warnings for those conditions.

## Tempo estimation (`lib/analysis/tempo.ts`)

For each candidate BPM (50–200), every inter-onset interval is scored
against how well it matches an integer multiple (1–4) of that candidate's
beat period, using a soft Gaussian tolerance (~8%) rather than a hard
cutoff — this tolerates syncopation and subdivisions without assuming every
note lands exactly on the beat. Confidence is the winning candidate's score
normalized against the total onset weight. Tempo is only reported
(`tempo.bpm`) above a confidence threshold (`TEMPO_CONFIDENCE_THRESHOLD =
0.35`); below that, the app says so explicitly rather than guessing.
Half/double-tempo ambiguity is surfaced via `alternateBpm` when a nearby
octave-related candidate scores almost as well.

## Timing consistency (`lib/analysis/timing.ts`)

Only computed when tempo confidence clears the threshold above — otherwise
`timing.score` is `null` with a plain-language explanation. Given the
tempo's beat period, each onset's deviation from the nearest beat-grid line
(anchored to the first onset) is expressed as a **fraction of the beat
period**, so the same tolerance is meaningful whether the pulse is slow or
fast. The overall score is `100 × (1 - stddev(deviations) / 0.16)`,
clamped to 0–100 — the `0.16` tolerance is a documented judgement call, not
a measured constant. First-half vs. second-half scores are compared to
describe drift ("became less consistent later"); rolling 20-second windows
identify the strongest/weakest stretch.

## Dynamics (`lib/analysis/dynamics.ts`)

Uses each onset's frame-peak amplitude as its "attack strength." The score
is `100 × (1 - coefficient_of_variation / 0.85)` — again a documented
calibration choice. Clipping events count frames whose peak sample is
≥0.985. Quiet sections are active regions whose average RMS falls below
35% of the overall active-region average. The coaching copy is
deliberately worded to avoid framing variation as inherently a mistake
("some of this may be expressive").

## Segments & quality (`lib/analysis/segments.ts`, `lib/analysis/quality.ts`)

The session is split into fixed ~20-second windows, each independently
scored on activity ratio, onset density, timing/dynamic consistency, noise
quality, and pause count — this is what powers "strongest section" /
"least consistent section" and the developer-mode segment boundaries.
`assessRecordingQuality()` flags clipping, low input, high background
noise, possible backing music (a conservative heuristic: elevated energy
during otherwise-silent pause windows), and insufficient active duration —
each with a warning string surfaced directly in the UI.

## What this engine deliberately does not do

It never identifies a song, chord, note, or fret position, and never
claims a pause was intentional or unintentional — it reports the
measurement (a pause of N seconds) and lets the coaching copy soften the
interpretation ("this may have been intentional"). Anywhere confidence is
low, the UI says so in plain language rather than presenting a number
without context.

# Note/chord/technique analysis architecture

This document covers the **second, heavier analysis pass** added on top of
FretCoach's original timing/dynamics engine (see
[`ANALYSIS_ENGINE.md`](./ANALYSIS_ENGINE.md) for that one): monophonic note
detection, conservative chord estimation, possible-fret-buzz and
note-clarity heuristics, and the issue-aggregation/coaching layer built on
top of them.

Everything here runs locally in the browser. Nothing is uploaded, and
every claim is qualified by a measured confidence value — see
[Honesty rules](#honesty-rules) at the end.

## Processing pipeline

```
AudioBuffer (already decoded once, cached by RecordingAudioSource)
  -> truncateAudioBuffer()          bounds cost on very long recordings (MAX_MUSIC_ANALYSIS_SECONDS)
  -> LocalPitchDetectionProvider    YIN pitch tracking -> NoteDetection[]
  -> LocalChordDetectionProvider    chroma + template matching -> ChordDetection[]
  -> LocalFretBuzzDetectionProvider  post-attack features -> FretBuzzDetection[] + AnalysisEvent[]
  -> LocalNoteClarityProvider        post-attack features -> AnalysisEvent[]
  -> deriveEvents.ts                 pitch_instability / timing_inconsistency / chord_transition events
  -> aggregateIssues()                merges events -> ranked PracticeIssue[]
  -> MusicAnalysisResult
```

Orchestrated by `analyzeMusicSession()` in
`lib/providers/musicAnalysisProvider.ts`, which reports stage progress
(`detecting-notes`, `detecting-chords`, `detecting-technique`,
`aggregating-issues`) and keeps every detector swappable via a
`providers` option — nothing is hard-wired to one implementation.

This pass is **opt-in** (a button on the session detail screen), not run
automatically alongside the original timing/dynamics analysis, since it's
significantly more CPU-intensive; once computed, the result is cached on
the session (`PracticeSession.musicAnalysis`) so it never re-runs
unnecessarily.

## Algorithms selected

### Monophonic pitch detection — YIN

`lib/analysis/pitch/yin.ts` implements YIN (de Cheveigné & Kawahara,
2002): a difference function, its cumulative-mean normalization, absolute
thresholding, and parabolic interpolation for sub-sample precision.
Confidence is `1 - CMNDF(chosen lag)` — the standard YIN "aperiodicity"
measure.

- **Frame size: 2048 samples** (~46ms @44.1kHz, ~3.8 periods of the
  guitar's lowest practical note, E2 ≈ 82Hz) — enough periods for a
  reliable autocorrelation-style estimate.
- **Hop size: 1024 samples** (50% overlap) — coarser than the original
  engine's 512-sample hop, since note-level timing doesn't need the same
  resolution as onset detection, and this is by far the most expensive
  detector (see [Performance](#performance-decisions)).
- The tau (lag) search range is restricted to the guitar's practical
  frequency range (default 70–1400Hz, configurable) rather than the full
  0..frameSize/2 range YIN normally searches — this alone is what keeps a
  multi-minute recording tractable in-browser.
- Frames below a minimum RMS are skipped without running YIN at all
  (silence/room noise rejection).

Consecutive voiced, pitch-compatible frames are merged into
`NoteDetection` events (`lib/analysis/pitch/noteMerging.ts`):
- Compatibility tolerance: ±50 cents from the run's running average
  (natural vibrato/bend tolerance).
- Octave-jump correction: an isolated frame ~1 or 2 octaves from its
  neighbours (within ±65 cents of exactly 1200/2400 cents) is folded into
  the neighbouring octave rather than splitting the note or reporting a
  wrong register — YIN occasionally locks onto a harmonic for a frame or
  two.
- Notes shorter than 60ms are discarded as likely transients/noise.
- `pitchStability` is `1 - stddev(cents)/30`, clamped 0–1 — another
  documented calibration choice, not a measured constant.

This is explicitly **monophonic** detection. It will not separate
simultaneous notes in a chord, and does not attempt polyphonic
transcription — see `lib/providers/musicTranscriptionProvider.ts` for the
(disabled) placeholder for a future specialist model that could.

### Chord estimation — chroma + template matching

`lib/analysis/chords/` implements a first-pass, Fujishima-style
pitch-class-profile (chroma) chord recognizer:

- **FFT size: 8192 samples**, hop **4096** (~93ms/window @44.1kHz) — a
  much larger window than pitch detection needs, because chord
  recognition needs enough frequency resolution to separate semitones
  near the guitar's low E (~5Hz/bin at this size; a semitone near 82Hz is
  only ~5Hz wide).
- Each window's magnitude spectrum is folded into a 12-bin chroma vector
  (`chroma.ts`), restricted to 60–5000Hz and including harmonics (a
  plucked note's overtones reinforce chord-consonant pitch classes,
  which is standard chroma practice, not a bug).
- 96 binary templates (12 roots × major/minor/power/dominant7/major7/
  minor7/sus2/sus4) are compared via cosine similarity
  (`chordMatching.ts`); the best match must clear a confidence threshold
  (default 0.62) or no chord is reported for that window at all.
- A sliding majority filter (`chordSmoothing.ts`, radius 2 windows)
  smooths flickering labels before merging consecutive same-label windows
  into a `ChordDetection` region (minimum 0.35s).

**Limitations** (documented here and in the settings/coaching copy):
distortion/heavy effects, room noise, incomplete voicings (partial
strums), alternate tunings, capo use, fast arpeggios, backing music, and
phone-microphone compression all measurably reduce chord-recognition
reliability. This is a conservative first pass, not a general chord
transcription system.

### Possible fret buzz — conservative post-attack heuristic

`lib/analysis/fretBuzz/postAttackFeatures.ts` extracts features from the
**post-attack** portion of each detected note (skipping the first 15ms —
every pick/strum attack is legitimately loud and broadband, clean or
not):
- High-frequency energy ratio (above 3000Hz).
- Spectral flatness (geometric/arithmetic mean ratio of the magnitude
  spectrum) — noise-like vs. tonal.
- Harmonicity — energy at the note's own harmonic series (first 8
  harmonics, ±3% tolerance) vs. total energy.
- A decay-smoothness score from the RMS envelope in ~5.8ms sub-frames —
  counts "bumps" (re-increases beyond a 15% tolerance) as evidence of a
  bumpy, re-energised decay rather than a clean fade.

`fretBuzzHeuristic.ts` combines these into a weighted score (documented
weights: 0.35 high-frequency energy, 0.25 spectral flatness, 0.25
harmonicity, 0.15 decay smoothness) and **requires both** a minimum
absolute high-frequency-energy ratio (0.12) **and** the combined score to
clear a confidence threshold (0.55) before reporting anything — a single
elevated feature (e.g. a naturally bright clean tone) is not enough on
its own. Every detection carries human-readable `reasons[]` and is always
labelled "possible fret buzz", never a definitive claim.

### Note clarity / possible muting

`lib/analysis/noteClarity/noteClarityHeuristic.ts` reuses the same
post-attack features to flag (at most one reason per note, the strongest
applicable):
- Weak harmonic structure (harmonicity < 0.3) → "a string may have been
  partially muted".
- Very short notes (<90ms), unstable YIN confidence (<0.55 average across
  the note), or low pitch stability (<0.4) → "this note's attack was
  unclear".

Never claims to know which finger, fret, or string was involved.

## Confidence calculation

Every detector returns an explicit confidence in [0,1]:
- YIN: `1 - CMNDF` at the chosen lag.
- Chord templates: cosine similarity between the window's chroma and the
  best-matching template.
- Fret buzz / note clarity: a weighted combination of the features above,
  documented per-detector rather than a single global formula.

The UI never shows a raw decimal as primary copy — `issueCopy.ts`'s
`confidenceWording()` translates it to "Low confidence" / "Moderate
confidence" / "High confidence" (thresholds: <0.5 low, 0.5–0.75 moderate,
≥0.75 high).

## Issue aggregation

`lib/analysis/issues/issueAggregator.ts`:
1. Drops events below a minimum confidence (0.5) or that don't map to a
   coaching category (raw `note`/`chord` events are informational, not
   issues).
2. Clusters events within 0.6s of each other (across categories) into one
   issue — this is what produces combined titles like "Possible fret buzz
   and reduced note clarity" from two co-located detections.
3. Adds 0.5–1s (configurable, default 0.75s) of playback context before
   and after, clamped to `[0, recordingDuration]`.
4. Severity is confidence-based (high ≥0.8, medium ≥0.6, else low), bumped
   one level when more than one category corroborates the same section.
5. Ranked by `severityWeight × confidence` and capped (default 8 issues)
   — deliberately avoiding "hundreds of low-value warnings".

`string_noise` is a defined category with **no detector implemented
yet** — it's reserved for a future detector, not silently dropped; this
is called out explicitly in `deriveEvents.ts` rather than left
unexplained.

## Retry comparison

`lib/analysis/issues/retryComparisonService.ts` compares a retry
recording against the *specific section* of the original recording an
issue covers — never the whole original session. Metrics compared:
pitch stability (average `pitchStability` of notes overlapping the
issue's range vs. the retry's notes), timing variation (coefficient of
variation of inter-note-onset intervals, needs ≥3 notes on both sides or
it's reported as not comparable), note-clarity issue count, likely-chord
confidence, possible-buzz confidence, and total issue count. A metric
without enough data on either side is explicitly marked "not comparable"
— there is no invented improvement score anywhere in this path.

## Performance decisions

- **Analysis-duration cap**: `MAX_MUSIC_ANALYSIS_SECONDS = 180`. Longer
  recordings only have their leading 3 minutes analysed for
  notes/chords/technique (the original timing/dynamics analysis and full
  audio playback are unaffected); the result is marked `truncated: true`
  and the UI says so.
- **Cheap gating before expensive work**: both pitch and chord tracking
  check frame RMS against a floor before running YIN or an FFT at all,
  so silent stretches cost almost nothing.
- **Cooperative yielding**: `trackPitch()` and `trackChords()` await a
  `setTimeout(0)` every ~10–40 frames so a long recording doesn't freeze
  the tab for its entire analysis duration in one synchronous block.
- **Not yet done**: this pass does **not** currently run in a Web Worker.
  Given the yielding above, the main thread stays responsive between
  chunks, but a worker would remove even that periodic pause — this is
  the clearest next performance improvement (see Roadmap in the main
  README) rather than something silently skipped.
- Analysis results are cached on the session (keyed by the session
  simply already having a `musicAnalysis` value) so re-opening a session
  never silently re-runs this pass.

## Known limitations

See also the per-detector limitation notes above. In summary: this is
monophonic note detection (not polyphonic transcription), a conservative
first-pass chord recognizer (not a general chord-ID system), and
experimental, intentionally conservative fret-buzz/clarity heuristics —
none of this is a substitute for a trained ear, and all of it degrades
with distortion, heavy backing tracks, unusual tunings/capo, and noisy
rooms. The app says so via recording-quality warnings and hedged language
rather than presenting numbers without context.

## Future specialist-model integration points

Every detector sits behind a small interface
(`PitchDetectionProvider`, `ChordDetectionProvider`,
`FretBuzzDetectionProvider`, `NoteClarityProvider`,
`ReferenceMediaProvider`) with only a local implementation registered by
default. A future on-device model (e.g. Core ML/TensorFlow.js) or
server-side pipeline (e.g. a Basic Pitch-based transcription service)
can implement the same interface and be swapped in without touching the
UI, issue aggregation, or coaching copy. `LocalFeedbackRepository`
already collects per-issue user feedback (correct/incorrect/unsure)
locally as the first step toward an eventual opt-in, anonymised
training-data path — `DisabledTrainingDataUploadProvider` documents that
boundary in code and is intentionally not implemented or called anywhere
in this version.

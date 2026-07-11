# Data model

All types live in `src/lib/types/`. This is the persisted/central shape of
the app's data — everything else derives from it.

## `PracticeSession` (`lib/types/session.ts`)

The top-level record. One row per recorded (or demo) practice session,
stored in IndexedDB via `SessionRepository`.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID v4 |
| `title` | `string` | User-editable; defaults to "Practice session — <date>" |
| `createdAt` / `updatedAt` | `number` | Epoch ms |
| `durationSeconds` | `number` | Full recording length |
| `intention` | `PracticeIntention \| null` | timing / chordChanges / improvisation / songPractice / picking / general |
| `song` | `SongInfo \| null` | title, artist, section, difficulty (1-5), goal, referenceUrl — all optional, user-entered, never inferred |
| `notes` | `string` | Free-text personal notes |
| `audioBlob` | `Blob \| null` | The recording itself |
| `audioMimeType` | `string \| null` | e.g. `audio/webm;codecs=opus`, `audio/mp4` |
| `analysis` | `PracticeAnalysis \| null` | Output of the local analysis engine |
| `coaching` | `CoachingResult \| null` | Output of the coaching engine |
| `isDemo` | `boolean` | True for demo-mode sessions; always shown with a "Demo" badge |

## `PracticeAnalysis` (`lib/types/analysis.ts`)

Everything the analysis engine measured. See `docs/ANALYSIS_ENGINE.md` for
how each field is computed. Every measurement that can be unreliable
carries an explicit `confidence` (0–1) alongside it, and `tempo.bpm` /
`timing.score` are `null` — not a guessed value — when confidence is too
low to report honestly.

Key shape:

```ts
interface PracticeAnalysis {
  durationSeconds: number;
  activePlayingSeconds: number;
  activePlayingRatio: number;
  recordingQuality: { score, clippingDetected, lowInputDetected, highNoiseDetected,
                       possibleBackingMusic, insufficientDuration, confidence, warnings[] };
  tempo: { bpm: number | null; confidence: number; alternateBpm?: number[] };
  timing: { score: number | null; confidence; strongestSegment?; weakestSegment?;
            driftDescription?; firstHalfScore; secondHalfScore };
  dynamics: { score; confidence; variation; averageAttackStrength; clippingEvents; quietSectionSeconds };
  pauses: { count; totalDurationSeconds; segments[]; repeatedAttemptClusters[] };
  segments: AnalysedSegment[];       // ~20s windows, each independently scored
  evidence: AnalysisEvidence[];      // human-readable facts the coaching engine cites
  onsets: OnsetEvidence[];           // raw attack timestamps (developer mode only)
  diagnostics: { frameCount, frameSizeSamples, hopSizeSamples, sampleRate,
                 noiseFloorRms, processingTimeMs };  // developer mode only
}
```

## `CoachingResult` (`lib/types/coaching.ts`)

```ts
interface CoachingResult {
  headline: string;
  summary: string;
  observations: CoachingObservation[];      // max 3, each tagged with a category and evidence IDs
  recommendedActions: PracticeAction[];     // max 2
  nextSessionGoal: string;
  confidenceNote?: string;
}
```

Every `CoachingObservation` carries `evidenceIds` pointing back into
`PracticeAnalysis.evidence` (or is explicitly empty when the observation is
a general statement rather than a specific timestamped fact) and an
optional `lowConfidence` flag. The UI renders low-confidence observations
with a visible "(low confidence)" label — never silently.

## `UserPracticeProfile` (`lib/types/session.ts`)

Local settings, persisted to `localStorage` (not IndexedDB — this is
configuration, not diary data):

```ts
interface UserPracticeProfile {
  longPauseThresholdSeconds: number;   // default 3
  analysisSensitivity: "low" | "standard" | "high";
  recordingQuality: "standard" | "high";
  excludeMetronomeOrBackingTrack: boolean;
  developerMode: boolean;
}
```

## Storage layer

`src/lib/storage/db.ts` defines a single Dexie table:

```
sessions: "id, createdAt, intention, isDemo"
```

`id` is the primary key; `createdAt`, `intention`, and `isDemo` are indexed
because history filtering and progress aggregation query on them. The
`audioBlob` is stored as a native `Blob` — IndexedDB supports this
directly, so there's no base64 encoding overhead.

`SessionRepository` (`lib/storage/sessionRepository.ts`) is the only code
that touches the Dexie table directly:

```ts
interface SessionRepository {
  create(session: PracticeSession): Promise<void>;
  update(session: PracticeSession): Promise<void>;
  getById(id: string): Promise<PracticeSession | null>;
  list(): Promise<PracticeSession[]>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
}
```

Errors are wrapped in `StorageError` with a `kind` (`"unavailable"`,
`"quota"`, `"corrupt"`, `"unknown"`) so the UI can show recovery guidance
instead of a raw exception.

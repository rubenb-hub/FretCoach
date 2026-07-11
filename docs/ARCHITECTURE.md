# Architecture

FretCoach is a Next.js (App Router) + TypeScript PWA. Everything — recording,
analysis, coaching, and storage — runs in the browser. There is no required
backend.

## Module map

```
src/
  app/                     Routes (App Router). Thin: fetch/compose, no business logic.
    page.tsx               Home
    record/page.tsx         Recording -> processing -> unsaved result (single stateful flow)
    session/[id]/page.tsx    Saved session detail (also used right after saving)
    history/page.tsx        Session history + filters
    progress/page.tsx        Trends across sessions
    settings/page.tsx        Settings, demo mode, data export/delete
    install/page.tsx         Add-to-Home-Screen instructions

  components/              Presentational + light-stateful UI, grouped by feature
    ui/                    Generic primitives (Button, Card, ConfirmDialog, BottomNav, ...)
    recording/             Recording-screen widgets (LevelMeter, IntentionPicker, ...)
    processing/            ProcessingView (staged progress)
    result/                Session result widgets (ScoreSummary, CoachingPanel, PlaybackPlayer, DevPanel, ...)
    history/                SessionListItem
    progress/               Chart components
    settings/               AudioInputTest, SettingRow

  lib/
    types/                 Shared TypeScript types (PracticeSession, PracticeAnalysis, CoachingResult, ...)
    recording/              AudioRecorderService (MediaRecorder wrapper), LiveInputMeter (AnalyserNode wrapper), errors
    analysis/               The local audio-analysis pipeline (see docs/ANALYSIS_ENGINE.md)
    coaching/               Deterministic rule-based coaching engine
    providers/              Pluggable-provider interfaces + disabled placeholders for future AI/server integrations
    storage/                Dexie (IndexedDB) wrapper + SessionRepository
    demo/                   Synthetic audio generation + WAV encoding for demo mode
    capability/             Browser feature detection (getUserMedia, MediaRecorder, mime types, secure context)
    state/                  React context providers (theme, user profile/settings)
    hooks/                  useSessions (loads/refreshes the session list)
    utils/                  Formatting, streak/trend statistics, coaching-focus helpers
    export/                 JSON export helpers

tests/
  unit/                    Vitest + React Testing Library (analysis engine, coaching rules, storage, components)
  e2e/                     Playwright (full user flows against a running build)
  fixtures/                Synthetic audio + analysis/session fixtures shared across tests
```

## Design principles

**Business logic never lives in components.** Recording, analysis, and
coaching are plain TypeScript modules with no React dependency. Components
call them and render the result. This is what makes the analysis engine
independently unit-testable with synthetic audio (see
`tests/unit/analysis/*`).

**One recording flow, three phases, no lost state.** `app/record/page.tsx`
is a single client component that moves through
`setup → starting → recording ⇄ paused → processing → result → error`
entirely in local state. The alternative — separate routes per phase —
would require smuggling a live `MediaStream`/`Blob` across navigations,
which is awkward and fragile. Once a session is saved, it's handed off to
`session/[id]`, which is also used for viewing any historical session.

**Providers, not hard-coded calls.** `lib/providers/` defines interfaces
(`AudioAnalysisProvider`, `AIPracticeCoachProvider`, `MusicTranscriptionProvider`)
with local, always-available default implementations
(`LocalAudioAnalysisProvider`, `RuleBasedPracticeCoachProvider`) and disabled
placeholder classes for future integrations. Swapping in a server-side
analysis pipeline or an LLM-based coach later means implementing one of
these interfaces — nothing else in the app needs to change.

**Storage is an abstraction, not a Dexie call scattered everywhere.**
`SessionRepository` (backed by Dexie/IndexedDB) is the only thing that
touches the database. Everything else — including tests — goes through it.

## State management

There is no global store (Redux/Zustand/etc.) — the app doesn't need one:

- **Theme** and **user profile/settings** are small, cross-cutting, and live
  in React Context (`lib/state/`), persisted to `localStorage`.
- **Session data** is not cached in a client-side store; `useSessions()` reads
  from IndexedDB on mount and exposes a `refresh()` used after writes. This
  keeps IndexedDB as the single source of truth and avoids sync bugs between
  a cache and the database.
- **The record flow's in-progress state** (recorder, timer, unsaved session)
  is local `useState` inside `record/page.tsx` — it doesn't need to be
  shared anywhere else, and keeping it local avoids a global "current
  recording" concept that would leak into every other screen.

## Rendering & rendering constraints

Every screen that touches `MediaRecorder`, `AudioContext`, `IndexedDB`, or
`localStorage` is a client component (`"use client"`). Next.js still
server-renders the initial HTML for these; browser-only state (theme
preference, capability checks, standalone-mode detection) is deliberately
applied in a `useEffect` *after* mount rather than in a lazy `useState`
initializer, specifically to avoid hydration mismatches — the server can't
know these values, so applying them post-hydration is the correct fix, not
a workaround (see the inline comments next to each of these effects).

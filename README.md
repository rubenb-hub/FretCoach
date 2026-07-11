# FretCoach

FretCoach is an AI-assisted guitar practice diary. Record a practice
session on your phone, and get evidence-based coaching notes about your
timing, dynamics, pauses, recording quality, likely notes/chords, and
possible technique issues (fret buzz, unclear attacks) — nothing more than
what was actually measured.

It's a mobile-first Progressive Web App (works great on iPhone Safari, and
in any modern desktop browser). Recording, audio analysis, and coaching all
run **locally in the browser** — no account, no server, no upload.

> **Honesty by design:** FretCoach never *definitively* claims to know the
> exact song, chord, note, or fret position you played, and never asserts
> a pause was intentional. It reports **likely notes** and **possible
> chords/fret buzz** with an explicit confidence, and when confidence is
> too low, it says so instead of guessing. In **Free Practice** mode there
> is no "correct answer" to compare against — only measured observations.
> In **Reference Practice** mode, you can manually supply expected
> chords/notes and get an approximate comparison (never from a Spotify
> link — see [Spotify integration](#spotify-integration) below).

## Contents

- [Quick start](#quick-start)
- [Testing](#testing)
- [Testing from an iPhone on your local network](#testing-from-an-iphone-on-your-local-network)
- [Deployment](#deployment)
- [What FretCoach does](#what-fretcoach-does)
- [Free Practice vs. Reference Practice](#free-practice-vs-reference-practice)
- [Spotify integration](#spotify-integration)
- [Documentation](#documentation)
- [Browser compatibility](#browser-compatibility)
- [Privacy](#privacy)
- [Limitations](#limitations)
- [Roadmap](#roadmap)

## Quick start

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables are required (see
`.env.example` — it documents optional future integration points only).

Other commands:

```bash
npm run build     # production build
npm start         # serve the production build (after npm run build)
npm run lint      # ESLint
```

## Testing

```bash
npm run test          # Vitest: unit tests for the analysis engine, coaching
                       # rules, storage layer, and key components
npm run test:watch    # same, in watch mode

npm run build && npm run test:e2e
                       # Playwright end-to-end tests. These start the app
                       # with `npm run start` automatically (see
                       # playwright.config.ts), so build first.
```

The unit test suite includes synthetic audio fixtures generated on the fly
(`tests/fixtures/`, shared with demo mode) — steady click tracks at a known
BPM, tracks with gradual tempo drift, tracks with inserted long pauses,
uneven attack strength, near-silence, and hard-clipped signals — and
asserts the analysis engine's output behaves sensibly against each, not
just that it returns *a* value.

**Note on Playwright's browser:** if your environment pins a Chromium
build that doesn't match the installed `@playwright/test` version, point
Playwright at it explicitly:

```bash
PLAYWRIGHT_CHROMIUM_PATH=/path/to/chromium npm run test:e2e
```

## Testing from an iPhone on your local network

1. Find your computer's local network IP address (e.g. on macOS:
   **System Settings → Wi-Fi → Details → TCP/IP**, or run `ipconfig getifaddr en0`).
2. Start the dev server bound to your network, not just localhost:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```
3. On your iPhone, join the **same Wi-Fi network** as your computer, then
   open Safari and go to `http://<your-computer-ip>:3000`.

**Microphone access requires a secure context.** Safari on iOS only grants
`getUserMedia` on `https://` origins or on `localhost` — a plain
`http://192.168.x.x:3000` URL will let you browse the app but the
recording screen will report that the microphone is unavailable. To
actually test recording from an iPhone, do one of:

- **Deploy to Vercel** (see below) and open the `https://` deployment URL
  in Safari — the simplest option.
- **Use a local HTTPS tunnel**, e.g. [ngrok](https://ngrok.com/) or
  [Tailscale Funnel](https://tailscale.com/kb/1223/funnel), pointed at
  `localhost:3000`, and open the resulting `https://` URL on your iPhone.
- Run a local HTTPS dev proxy (e.g. `mkcert` + a reverse proxy) in front of
  `next dev` if you'd rather stay fully offline.

Once you're on an `https://` (or `localhost`) origin, tap **Add to Home
Screen** from Safari's share sheet to install it as a PWA (also documented
in-app at **Settings → Install FretCoach**).

## Deployment

### Vercel

```bash
npx vercel
```

Or connect the repository in the Vercel dashboard — it auto-detects
Next.js, no configuration needed. No environment variables are required
for the default local-only experience.

### Netlify

FretCoach is a standard Next.js App Router project, so the
[`@netlify/plugin-nextjs`](https://docs.netlify.com/frameworks/next-js/overview/)
build plugin works out of the box:

```bash
npm install -D @netlify/plugin-nextjs
```

Add a `netlify.toml`:

```toml
[build]
  command = "npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

Then deploy via the Netlify CLI or dashboard. The `session/[id]` route uses
server-side rendering (it reads the recording ID from the URL); everything
else is static. No custom server code or environment variables are
required.

## What FretCoach does

- **Record** a practice session with a live level meter, waveform, pause/resume, and one-handed Finish control. The original recording (Blob, object URL, decoded AudioBuffer) stays available for the whole session — analysis never destroys or replaces it.
- **Analyse timing & dynamics** locally: active-playing detection, tempo estimation, timing consistency, dynamic (attack-strength) consistency, long-pause detection, and recording-quality checks (clipping, low input, background noise).
- **Analyse notes, chords & technique** (opt-in, heavier pass): monophonic note detection (YIN pitch tracking), conservative chord estimation (chroma + template matching), and experimental "possible fret buzz" / note-clarity heuristics — merged into a small, ranked list of coaching-worthy sections rather than a wall of warnings. See [`docs/audio-analysis-architecture.md`](docs/audio-analysis-architecture.md) for exactly how.
- **Let you replay, loop, and slow down** any detected section (0.5x/0.75x/1x) via a reusable segment player, then **record a retry** and get a measurable-only comparison against the original — never an invented "improvement score".
- **Coach**, deterministically: 2–3 evidence-linked observations, 1–2 concrete practice actions, and one goal for next time — never more, and never invented.
- **Remember**: every session (recording, analysis, coaching, notes, optional song/reference info) is saved locally and browsable in History, with trends in Progress.
- **Work without a microphone**: Demo mode generates five labelled sample sessions (steady strumming, inconsistent timing, frequent pauses, uneven dynamics, poor recording quality) from synthetic audio, run through the exact same analysis pipeline as a real recording.
- **Install as a PWA**: home-screen icon, standalone display, offline app shell for previously visited screens (audio is never cached by the service worker — it only touches the static app shell).

## Free Practice vs. Reference Practice

FretCoach distinguishes two practice modes, chosen per session:

- **Free Practice** (default): the app has no idea what you intended to
  play. It only ever reports what it measured — likely notes, possible
  chords, tuning/pitch stability, tempo/rhythmic consistency, possible
  fret buzz, note clarity, dynamics — and will never state that a note or
  chord was "wrong", because there's no expected reference to be wrong
  *against*.
- **Reference Practice**: you manually type in expected material — a
  chord progression (`G | D | Em | C`), a note sequence (`E3, G3, A3,
  B3`), tempo, time signature, capo fret, tuning, or free-text
  instructions. FretCoach then shows an **approximate** comparison
  (order-based, not exact-timing) between what was detected and what was
  expected. A Spotify link (see below) is never used as a source for this
  — it carries no notes, chords, timing, or tab data.

## Spotify integration

You can optionally paste a Spotify track/album/playlist link to associate
a session with a song, purely as a **separate listening reference**:

- Only Spotify's own official embed player and an "Open in Spotify" link
  are ever shown, in a distinct panel with the disclosure text *"Spotify
  is provided as a separate listening reference. FretCoach does not
  analyse or copy Spotify audio."*
- FretCoach **never** downloads, streams into Web Audio, records,
  analyses, transcribes, or mixes Spotify audio with your own recording —
  the microphone analysis pipeline has no code path that touches Spotify
  at all.
- URLs are validated against Spotify's own domain/URI scheme
  (`lib/providers/spotifyEmbedReferenceProvider.ts`); anything else
  (including `javascript:` URIs or other hosts) is rejected.
- No Spotify authentication, Web Playback SDK, or API secrets are used —
  just the public embed and a link out.

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module map and the reasoning behind the main structural decisions.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — `PracticeSession`, `PracticeAnalysis`, `CoachingResult`, and the IndexedDB schema.
- [`docs/ANALYSIS_ENGINE.md`](docs/ANALYSIS_ENGINE.md) — exactly how tempo, timing, dynamics, pauses, and quality are computed, including the frame/hop sizes and every calibration constant.
- [`docs/audio-analysis-architecture.md`](docs/audio-analysis-architecture.md) — the note/chord/technique pipeline: algorithms, frame/hop sizes, thresholds, confidence calculation, issue aggregation, retry comparison, performance decisions, and future model-integration points.

## Browser compatibility

| Feature | iOS Safari | Chrome / Edge | Firefox |
|---|---|---|---|
| Recording (`MediaRecorder`) | `audio/mp4` | `audio/webm;codecs=opus` | `audio/ogg;codecs=opus` or `audio/webm` |
| Live level meter (Web Audio `AnalyserNode`) | ✅ (after a user-gesture `resume()`) | ✅ | ✅ |
| IndexedDB persistence | ✅ | ✅ | ✅ |
| PWA install | Share sheet → Add to Home Screen | Address-bar install icon | Limited/manual |
| Microphone access | Requires `https://` or `localhost` | Requires `https://` or `localhost` | Requires `https://` or `localhost` |

FretCoach detects the best supported recording MIME type at runtime
(`lib/capability/browserCapabilities.ts`) rather than assuming Chrome-only
codecs, and resumes the `AudioContext` only after a user gesture (tapping
"Begin Recording"), which iOS Safari requires.

## Privacy

- Recordings and analysis stay on your device by default. Nothing is uploaded anywhere.
- Deleting a session immediately removes its audio from local storage.
- Demo sessions are synthetic audio, clearly labelled, and behave identically to real sessions in every other respect.
- Please don't record other people without their permission.
- If a cloud or AI integration is ever added, it will be strictly opt-in (see Roadmap).

## Limitations

- FretCoach does not perform polyphonic transcription. Note detection is
  **monophonic** (isolated notes/single-note melodies); chord estimation
  is a conservative first pass (chroma + template matching over 8 chord
  qualities), not a general chord-ID system. Both are heuristics, clearly
  labelled as "likely"/"possible", not reliable ground truth.
  See [`docs/audio-analysis-architecture.md`](docs/audio-analysis-architecture.md).
- "Possible fret buzz" is an experimental, deliberately conservative
  heuristic based on post-attack spectral features — it is not a
  calibrated instrument-diagnostic tool, and is always labelled
  "possible", never a definitive claim about your guitar.
- Tempo/timing analysis assumes a reasonably steady underlying pulse; free-time
  playing, rubato, or heavy syncopation will often (correctly) report low
  confidence rather than a number.
- Best results (for both the timing/dynamics engine and the note/chord/
  technique pass) come from acoustic guitar, clean electric, and simple
  strumming/picking in a reasonably quiet room. Heavy distortion, loud
  backing tracks, drums, unusual tunings, capo use, fast arpeggios, and
  phone-microphone compression all measurably reduce reliability, and the
  app tries to say so via recording-quality warnings.
- Reference Practice comparisons are **order-based, not timing-based** —
  an expected chord "counts" as detected if it appears anywhere in
  roughly the right relative order, not at an exact timestamp.
- "Repeated attempt" detection is a conservative approximation (clustered
  short takes), not real audio-fingerprint matching.
- The note/chord/technique pass currently only analyses the leading 3
  minutes of a longer recording (configurable, see
  `MAX_MUSIC_ANALYSIS_SECONDS`) and does not yet run in a Web Worker — it
  yields to the browser periodically during analysis instead, which keeps
  the tab responsive but is a documented, not-yet-optimal choice.
- If a browser tab is closed mid-recording, the in-progress recording is
  lost (there's a "leave page?" warning, but no crash-recovery buffer).
  Saved sessions are unaffected.
- Playwright end-to-end tests currently target Chromium with mobile
  viewport/UA emulation rather than WebKit, to match what's reliably
  available in a sandboxed CI environment; the iPhone testing steps above
  are how to verify real Safari behavior.

## Roadmap

The next three highest-value improvements, in priority order:

1. **Move the note/chord/technique pass to a Web Worker** and/or an
   FFT-accelerated YIN implementation, so long recordings analyse without
   any main-thread pausing at all (today it yields cooperatively, which
   helps but isn't as good as off-thread execution).
2. **A trained fret-buzz/note-clarity classifier**, using the
   already-collected local user feedback (`LocalFeedbackRepository`) as
   an opt-in, anonymised training signal — the abstraction for this
   exists (`DisabledTrainingDataUploadProvider`) but upload is
   intentionally not implemented yet.
3. **Opt-in LLM-generated coaching** behind the existing
   `AIPracticeCoachProvider` interface — same measured analysis in,
   richer/more personalized phrasing out, still evidence-linked.

FretCoach is designed so all three can be added as new provider
implementations without touching the recording, analysis, or storage
abstractions already in place.

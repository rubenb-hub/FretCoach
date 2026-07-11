# FretCoach

FretCoach is an AI-assisted guitar practice diary. Record a practice
session on your phone, and get evidence-based coaching notes about your
timing, dynamics, pauses, and recording quality — nothing more than what
was actually measured.

It's a mobile-first Progressive Web App (works great on iPhone Safari, and
in any modern desktop browser). Recording, audio analysis, and coaching all
run **locally in the browser** — no account, no server, no upload.

> **Honesty by design:** FretCoach never claims to know the song, chords,
> notes, or fret positions you played, and never asserts a pause was
> intentional. Every coaching note is tied to a measured fact, and when
> confidence is low, the app says so instead of guessing.

## Contents

- [Quick start](#quick-start)
- [Testing](#testing)
- [Testing from an iPhone on your local network](#testing-from-an-iphone-on-your-local-network)
- [Deployment](#deployment)
- [What FretCoach does](#what-fretcoach-does)
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

- **Record** a practice session with a live level meter, waveform, pause/resume, and one-handed Finish control.
- **Analyse** the recording locally: active-playing detection, tempo estimation, timing consistency, dynamic (attack-strength) consistency, long-pause detection, and recording-quality checks (clipping, low input, background noise).
- **Coach**, deterministically: 2–3 evidence-linked observations, 1–2 concrete practice actions, and one goal for next time — never more, and never invented.
- **Remember**: every session (recording, analysis, coaching, notes, optional song info) is saved locally and browsable in History, with trends in Progress.
- **Work without a microphone**: Demo mode generates five labelled sample sessions (steady strumming, inconsistent timing, frequent pauses, uneven dynamics, poor recording quality) from synthetic audio, run through the exact same analysis pipeline as a real recording.
- **Install as a PWA**: home-screen icon, standalone display, offline app shell for previously visited screens (audio is never cached by the service worker — it only touches the static app shell).

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module map and the reasoning behind the main structural decisions.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — `PracticeSession`, `PracticeAnalysis`, `CoachingResult`, and the IndexedDB schema.
- [`docs/ANALYSIS_ENGINE.md`](docs/ANALYSIS_ENGINE.md) — exactly how tempo, timing, dynamics, pauses, and quality are computed, including the frame/hop sizes and every calibration constant.

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

- The analysis engine measures rhythm/dynamics/activity — it does not
  transcribe notes, chords, or identify a song. This is deliberate (see the
  honesty note at the top), not a missing feature to "fix" carelessly.
- Tempo/timing analysis assumes a reasonably steady underlying pulse; free-time
  playing, rubato, or heavy syncopation will often (correctly) report low
  confidence rather than a number.
- Best results come from acoustic guitar, clean electric, and simple
  strumming/picking in a reasonably quiet room. Heavy distortion, loud
  backing tracks, drums, and background noise reduce reliability, and the
  app tries to say so via recording-quality warnings.
- "Repeated attempt" detection is a conservative approximation (clustered
  short takes), not real audio-fingerprint matching.
- If a browser tab is closed mid-recording, the in-progress recording is
  lost (there's a "leave page?" warning, but no crash-recovery buffer).
  Saved sessions are unaffected.
- Playwright end-to-end tests currently target Chromium with mobile
  viewport/UA emulation rather than WebKit, to match what's reliably
  available in a sandboxed CI environment; the iPhone testing steps above
  are how to verify real Safari behavior.

## Roadmap

The next three highest-value improvements, in priority order:

1. **Server-side or on-device specialist analysis** (e.g. a Basic Pitch /
   librosa pipeline, or a Core ML model) behind the existing
   `AudioAnalysisProvider` interface, to improve tempo/onset accuracy on
   harder material (distortion, backing tracks) without changing any UI code.
2. **Opt-in LLM-generated coaching** behind the existing
   `AIPracticeCoachProvider` interface — same measured `PracticeAnalysis`
   in, richer/more personalized phrasing out, still evidence-linked.
3. **Cloud sync** (opt-in) so a practice diary can follow a player across
   devices, likely via Supabase, without changing the local-first default.

FretCoach is designed so all three can be added as new provider
implementations without touching the recording, analysis, or storage
abstractions already in place.

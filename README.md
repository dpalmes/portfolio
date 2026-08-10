# Portfolio

Dann Vincent Palmes — software engineer, backend Java and real-time data.

The site is a Next.js application, and it is also one of the things it presents.
Alongside it are three Java backend repositories, each with its own case study
here:

| Repository | What it demonstrates | Tests |
|---|---|---|
| [`stream-processor`](../stream-processor) | Kafka Streams: event-time windowing, de-duplication, dead-lettering | 23 |
| [`integration-gateway`](../integration-gateway) | Apache Camel: REST-to-SOAP middleware, retry policy, idempotency | 26 |
| [`secure-api`](../secure-api) | Spring Security: object-level authorization, field encryption, rate limiting | 38 |

And three interactive audio demos in this repository, each backed by an
algorithm written from scratch and covered by unit tests:

- **Tuner** — real-time pitch detection using a from-scratch YIN implementation
- **Sequencer** — a step sequencer with sample-accurate, drift-free timing
- **Fretboard** — chord fingerings derived by searching the neck, in any tuning

Next.js 16, React 19, TypeScript, Tailwind 4, Vitest. No audio or music-theory
dependencies — that is the point.

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

The tuner needs microphone permission. Browsers only grant it on a secure
origin, which `localhost` counts as — but a deployment must be served over
HTTPS or the tuner will report that it cannot open the microphone.

## Scripts

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Development server                                    |
| `npm run build`     | Production build — every route prerenders to static   |
| `npm run test`      | Unit tests (Vitest, Node — no browser needed)         |
| `npm run typecheck` | `tsc --noEmit`                                        |
| `npm run lint`      | ESLint                                                |
| `npm run verify`    | Typecheck, lint and test in one go                    |
| `npm run coverage`  | Test coverage for `src/lib`                           |
| `npm run stats`     | Prints the figures quoted on the site (see below)     |

## Content

Everything personal lives in two files. Nothing else needs editing.

**`src/content/site.ts`** — name, role, intro, bio, skills, experience,
education, email and social links. Experience and education come from the CV.
Any section backed by an empty array simply does not render, and social links
with an empty `href` are hidden, so trimming is safe.

**`src/content/projects.ts`** — the three case studies, plus an
`externalProjects` array holding entries for **BeatRoad** and **AI Guitar
Teacher**. Those two were written from what was visible in the neighbouring
repositories and are marked "In progress" — correct them, add links, or delete
the array and the section disappears.

### The live API demo

`/lab/secure-api` calls a deployed instance of the `secure-api` service and
shows the real HTTP traffic. Point it at one by setting, in `.env.local`:

```
NEXT_PUBLIC_SECURE_API_URL=https://your-service-url
```

and set `SECURITY_CORS_ALLOWED_ORIGINS` on the service to this site's origin —
both sides have to name each other or the browser refuses the call. See
`secure-api/deploy/README.md`.

Without that variable the page explains that no service is configured and the
case study still shows a captured transcript, so nothing looks broken when the
deployment is asleep or gone.

### Still to fill in

- `site.url` — set to the real domain before deploying. It is the base for the
  canonical URLs, the sitemap and the Open Graph tags.
- `site.socials` — the GitHub entry has an empty `href` and is therefore hidden.
- **Job title at Vocus** — the current one is inferred from the job description,
  not from an offer letter. See the `TODO` on that role.
- **Vocus achievements** — that entry is written as scope rather than results,
  because the role started in July 2026. Swap in concrete, measurable outcomes
  as they land, matching the style of the Globe Telecom entry.
- `site.phone` — left empty deliberately. A mobile number on a public page
  mostly attracts spam; the CV carries it where it belongs. Fill it in if you
  want it shown, and add it to the footer.

### The numbers on the site

The test counts quoted in the copy live in `src/content/stats.ts` and are
imported wherever they appear, so they are written once. After adding tests, run
`npm run stats` and paste in the values it prints.

## How it is put together

```
src/
  lib/
    audio/
      yin.ts          YIN pitch detection — pure, no DOM
      scheduler.ts    Step timing — pure, driven by an injected clock
      voices.ts       Synthesised drums and plucked strings
      ticker.ts       Worker-backed timer that survives background tabs
      engine.ts       AudioContext lifecycle
      mic.ts          Microphone capture and its failure modes
      patterns.ts     Drum patterns, written as strings
    music/
      notes.ts        MIDI/frequency/cents, note-name parsing
      scales.ts       Scale definitions, modes, degree labelling
      chords.ts       Chord construction and recognition
      fretboard.ts    Tunings, geometry, chord-shape search
  components/
    lab/              The three demos
    ui.tsx            Shared primitives
  content/            All copy and configuration
  app/                Routes
```

The organising rule is that the interesting logic does not know the browser
exists. Pitch detection takes a `Float32Array` and a sample rate. The sequencer's
clock is told what time it is and asked what is due. Neither touches an
`AudioContext`, which is why the whole of `src/lib` is testable in Node in under
a second rather than through a headless browser.

Web Audio itself is covered too, by a recording fake `AudioContext`
(`src/lib/audio/fake-audio-context.ts`) that captures which nodes were created,
how they were connected, and what automation was scheduled on each parameter.
A test cannot listen to a kick drum, but it can assert that the pitch sweeps
from 150 Hz to 48 Hz and that the envelope never ramps exponentially to zero.

### Three decisions worth knowing about

**The hero graphic is generated, not drawn.** It is a server component that runs
the pitch detector over a synthetic A3 at build time and serialises the
resulting difference curve into the markup. No chart library ships to the
client, and if the detector changed, the picture would change with it. Same for
the Open Graph image.

**The sequencer's timer lives in a Web Worker.** Browsers clamp background
timers to roughly one second. With a 120 ms scheduling window, a `setInterval`
on the main thread would starve the scheduler the moment the tab lost focus and
the pattern would stutter. Worker timers are not clamped. There is a
`setInterval` fallback for environments where a Content Security Policy blocks
constructing a worker from a blob URL.

**The microphone opens with all the speech processing turned off.** Echo
cancellation, noise suppression and automatic gain control are on by default and
each one damages a pitch measurement — noise suppression treats a sustained note
as stationary noise and attenuates it.

## Accessibility

Every control is a real button or input with a label. The sequencer grid is
navigable by keyboard, with `aria-pressed` on each step. The tuner announces the
detected note through a polite live region and nothing else — announcing the
frequency would fire continuously and make a screen reader unusable. Colour is
never the only signal: the tuner says "Sharp — tune down" as well as moving the
needle. Animation is decorative throughout and is disabled under
`prefers-reduced-motion`.

## Deploying

`npm run build` prerenders every route to static HTML, so the output can be
hosted anywhere — Vercel, Netlify, Cloudflare Pages, or any static host. There is
no server-side runtime, no database and no API key.

Serve it over HTTPS, or the microphone will not open.

## Licence

Not currently licensed for reuse. Add one if you want that to change.

/**
 * Project and case-study content.
 *
 * The three lab projects describe code that is actually in this repository, so
 * every claim here is checkable against `src/lib` and the test suite. The
 * "elsewhere" entries are stubs for work that lives in other repos — fill in or
 * delete them.
 */

import { backendProjects } from "./backend-projects";
import { productProjects } from "./product-projects";
import { stats } from "./stats";

export interface CaseStudySection {
  heading: string;
  body: string[];
  /** Optional pull-out, rendered as a bordered aside. */
  note?: string;
}

export type ProjectKind = "backend" | "product" | "lab";

export interface Project {
  slug: string;
  title: string;
  tagline: string;
  /**
   * Backend work runs on a server and is read as code; lab work runs in the
   * browser and is read by pressing buttons. The distinction drives what the
   * cards offer and how the pages are ordered.
   */
  kind: ProjectKind;
  /** Short label for the card, e.g. "Web Audio · DSP". */
  domain: string;
  stack: string[];
  /** Route to the live demo, for anything that has one. */
  demoHref?: string;
  /**
   * Where the code lives.
   *
   * TODO: replace these with GitHub URLs once the repositories are pushed —
   * `repoHref` turns the label into a link when it is set.
   */
  repo?: string;
  repoHref?: string;
  /** Test count for the repository, shown on the case study. */
  testCount?: number;
  /** One-paragraph summary for the card. */
  summary: string;
  /** Three or four bullets, the bit people actually read. */
  highlights: string[];
  /** Source files worth pointing at, relative to the repo root. */
  sources: string[];
  sections: CaseStudySection[];
}

export const projects: Project[] = [
  {
    slug: "tuner",
    kind: "lab",
    title: "Tuner",
    tagline: "Real-time pitch detection from the microphone",
    domain: "Web Audio · DSP",
    stack: ["Web Audio API", "TypeScript", "Canvas"],
    demoHref: "/lab/tuner",
    summary:
      "A chromatic instrument tuner that listens through the microphone and reports the note and its deviation in cents. The pitch detection is a from-scratch implementation of the YIN algorithm — no library — and it is accurate to under a cent on synthetic signals.",
    highlights: [
      "YIN autocorrelation with cumulative mean normalisation, implemented from the 2002 paper",
      "Parabolic interpolation recovers sub-sample periods: 4 cents of rounding error becomes under 0.5",
      "Correctly tracks a fundamental that is quieter than its harmonics, and one that is missing entirely",
      `${stats.pitchTests} unit tests drive the detector with synthetic tones in Node — no browser, no microphone, no flake`,
    ],
    sources: ["src/lib/audio/yin.ts", "src/lib/audio/yin.test.ts"],
    sections: [
      {
        heading: "Why not just take the biggest FFT peak",
        body: [
          "The obvious approach to pitch detection is to run an FFT and find the tallest peak. It works on a flute and falls apart on a guitar. On a plucked low string the second and third harmonics are routinely louder than the fundamental, so the tallest peak sits an octave or a twelfth above the note actually being played — and a tuner that jumps between E2 and E3 while you turn the peg is useless.",
          "The deeper problem is that pitch is not the same thing as spectral energy. A note whose fundamental has been filtered out entirely is still heard at that pitch; this is the missing fundamental, and it is why a small phone speaker can play a bass line it cannot physically reproduce. Any detector that reasons about where the energy is will get that case wrong.",
        ],
      },
      {
        heading: "How YIN works",
        body: [
          "YIN works in the time domain and asks a different question: at what delay does the signal most resemble itself? It computes the squared difference between the signal and a copy of itself shifted by a lag, for every lag in the search range. A periodic signal is nearly identical to itself one period later, so that curve dips sharply at the period.",
          "The step that makes it reliable is the cumulative mean normalisation. The raw difference function always has its global minimum at zero lag and drifts downward at long lags, which biases a naive search toward wrong answers. Dividing by the running mean of the curve so far flattens that trend, and turns a single absolute threshold into a decision that means the same thing across the whole lag range.",
          "The last refinement is arithmetic rather than signal processing. At 44.1 kHz the period of A4 is 100.2 samples, so picking the nearest whole sample reports 441 Hz — about 4 cents sharp, which is visible on a tuner display. Fitting a parabola through the minimum and its two neighbours recovers the fractional part and takes the error below half a cent.",
        ],
        note: "Preferring the first dip below the threshold rather than the deepest one is what prevents octave errors: a periodic signal is exactly as self-similar at two periods as at one, so the deepest dip is often at twice the true period.",
      },
      {
        heading: "Making it behave on real input",
        body: [
          "A correct detector still makes a bad tuner if you wire it straight to the display. Microphone input between notes is noise, and noise produces a stream of unrelated estimates that make the needle twitch continuously.",
          "Two things fix it. Readings below a clarity floor are discarded outright, so silence cannot move the display. Accepted readings are then blended in the log-frequency domain, where a fixed smoothing weight corresponds to a fixed number of cents regardless of register — the same responsiveness at E2 as at E5. A jump of more than a fifth re-seeds the filter instead of gliding, because a leap that large is a new note or an octave error, never a slide.",
          "Building the detector to run on a plain array of samples rather than on an AudioContext is what makes all of this testable. The suite feeds it synthetic tones, harmonic stacks with a deliberately weak fundamental, added noise, and a DC offset, then asserts the answer in cents — in Node, in about a fifth of a second.",
        ],
      },
      {
        heading: "What I would do differently at scale",
        body: [
          "The analysis runs on the main thread inside a requestAnimationFrame loop. That is fine for one 2048-sample buffer per frame, and it keeps the demo simple to read, but the correct home for it is an AudioWorklet: guaranteed cadence on the audio thread, immune to layout and garbage collection.",
          "The difference function is also the naive O(n·τ) double loop. YIN can be computed via autocorrelation using two FFTs, which matters if the window grows or several detectors run at once.",
        ],
      },
    ],
  },
  {
    slug: "sequencer",
    kind: "lab",
    title: "Sequencer",
    tagline: "Sample-accurate drum machine with synthesised voices",
    domain: "Web Audio · Timing",
    stack: ["Web Audio API", "TypeScript", "React"],
    demoHref: "/lab/sequencer",
    summary:
      "A step sequencer whose timing does not drift, does not stutter under load, and does not fall apart in a background tab. Every drum sound is synthesised from oscillators and shaped noise, so the whole instrument ships as zero bytes of audio assets.",
    highlights: [
      "Two-clock scheduling: a coarse timer schedules ahead, the audio clock places the notes",
      "Verified drift-free over 200 deliberately irregular polling intervals, to nine decimal places",
      "Swing shifts reported times without touching the underlying grid, so it cannot accumulate error",
      "Kick, snare, hats, clap and toms synthesised from oscillators and filtered noise — no samples",
    ],
    sources: [
      "src/lib/audio/scheduler.ts",
      "src/lib/audio/scheduler.test.ts",
      "src/lib/audio/voices.ts",
    ],
    sections: [
      {
        heading: "setInterval is not a musical clock",
        body: [
          "The naive drum machine calls setInterval at the step duration and triggers a sound in the callback. It sounds wrong immediately. Timers fire late under layout and garbage collection, they are throttled hard in background tabs, and every late callback is a note that lands late — the errors accumulate rather than cancelling.",
          "Worse, the lateness is variable. Constant lag would be inaudible; jitter of a few milliseconds that changes bar to bar is exactly what the ear is most sensitive to in rhythm.",
        ],
      },
      {
        heading: "Two clocks",
        body: [
          "The fix is the arrangement Chris Wilson described in 'A Tale of Two Clocks'. A coarse timer wakes up frequently and looks a short distance into the future. Every note falling inside that window is handed to the Web Audio API with an explicit start time, and the audio hardware places it exactly.",
          "This inverts the reliability requirement in a useful way. The timer no longer has to be punctual — it only has to wake up more often than the lookahead window is long. A callback that arrives 40 ms late costs nothing when the scheduler is already 100 ms ahead. The audio clock, which runs on its own thread and is sample-accurate by construction, does the part that needs precision.",
        ],
        note: "The scheduling window is a latency-versus-robustness dial. Longer windows survive worse main-thread stalls; shorter windows make a tempo change take effect sooner. 100 ms of lookahead polled every 25 ms is comfortable on both counts.",
      },
      {
        heading: "Timing you can unit-test",
        body: [
          "The timing arithmetic is separated from Web Audio entirely. The clock holds no timer and calls nothing: something else tells it what time it is and asks what is due. That one decision makes the hardest part of the system the easiest part to test.",
          "The suite drives it with a fake clock through 200 deliberately uneven wake-ups — 1 ms here, 200 ms there, mimicking a throttled tab — and asserts that every emitted step time is exactly its index times the step duration, to nine decimal places. Drift is not sampled for; it is proven absent.",
          "Swing gets the same treatment. It displaces the reported time of the off-beats without touching the underlying grid, so the on-beats stay locked no matter how long the pattern runs. That is asserted directly: with swing at maximum, the on-beats still land on exact multiples of the beat after four seconds of playback.",
        ],
      },
      {
        heading: "Drums from first principles",
        body: [
          "Every voice is synthesised. A kick is a sine whose frequency drops from 150 Hz to 50 Hz in about 40 ms, with an amplitude envelope that decays a little more slowly — the pitch drop is what the ear reads as the beater strike. A snare is band-passed white noise plus a short tone body. Hats are high-passed noise with a very fast decay, closed and open differing only in envelope length.",
          "It is a real constraint that pays off twice: the demo loads instantly with no audio files to fetch, and the parameters stay open to the interface, so tuning a drum is a slider rather than a new asset.",
        ],
      },
    ],
  },
  {
    slug: "fretboard",
    kind: "lab",
    title: "Fretboard",
    tagline: "Chord shapes derived, not tabulated",
    domain: "Search · Music theory",
    stack: ["TypeScript", "SVG", "Web Audio"],
    demoHref: "/lab/fretboard",
    summary:
      "An interactive fretboard that finds playable fingerings for any chord in any tuning by searching the neck under physical constraints. It ships no chord dictionary, which is why it works in tunings nobody has tabulated.",
    highlights: [
      "Constraint search over hand positions, pruned by which chord tones remain reachable",
      "Independently derives the shapes guitarists actually use: x32010, 133211, x02210",
      "Works unchanged in DADGAD, open G, and on a reentrant-tuned ukulele",
      "Chord recognition in the other direction: an unordered set of notes back to a name",
    ],
    sources: [
      "src/lib/music/fretboard.ts",
      "src/lib/music/chords.ts",
      "src/lib/music/fretboard.test.ts",
    ],
    sections: [
      {
        heading: "Why not ship a chord dictionary",
        body: [
          "Almost every chord app is a lookup table: a few thousand hand-entered diagrams, keyed by root and quality. It works, it is fast, and it stops dead the moment you drop the low E to D. Alternate tunings are exactly where a player most wants help, and exactly where a table has nothing to say.",
          "Deriving the shapes instead means the tuning is an input rather than an assumption. The same code handles DADGAD, open G, a bass, and a ukulele whose fourth string is tuned above its third — none of which required a single new line.",
        ],
      },
      {
        heading: "The search",
        body: [
          "A fingering is a choice per string: mute it, play it open, or fret it somewhere the hand can reach. Fixing a hand position bounds the fretted options to a span of four frets, which turns the problem into a depth-first walk over the strings with a handful of choices each, repeated for each position on the neck.",
          "Two prunings keep it cheap. Only frets that actually sound a chord tone are ever considered, which removes most of the branching before the search starts. And a branch is abandoned as soon as the strings still to come cannot supply the chord tones still missing. Twelve roots' worth of shapes is comfortably under a frame.",
          "Ranking is where the musical judgement lives. Covering every chord tone dominates; after that the score rewards full voicings, open strings and the root in the bass, and penalises stretches and the number of fretted notes. It is a heuristic, not a theorem — so the test for it is that the shapes guitarists actually play come out on top.",
        ],
        note: "The strongest evidence that the ranking is right: asked for C major in standard tuning, the search returns x32010 — the first shape most players learn — without ever having been told it exists.",
      },
      {
        heading: "The other direction",
        body: [
          "Naming a chord from a set of notes is the harder problem, because the answer is not unique. C-E-G-A is both C6 and Am7, and both are correct; which one you mean depends on the bass and on context.",
          "The recogniser scores every root against every quality: chord tones present earn credit, missing tones and notes the chord cannot explain both cost. That produces a fit score that stays honest — an exact match is always exactly 1 — and leaves preference to the tiebreaks, where the bass note settles it. Under an A it reports Am7; under a C, C6; under an E, a slash chord. The score is unchanged across all three, because the fit genuinely is.",
        ],
      },
    ],
  },
];

/** Lab demos, in the order they appear on /lab. */
export const labProjects = projects;

/**
 * Everything, backend work first.
 *
 * The ordering is the point: someone hiring a Java engineer should meet the
 * Java work before the audio demos, however much more fun the demos are to
 * click on.
 */
export const allProjects: Project[] = [
  ...backendProjects,
  ...productProjects,
  ...projects,
];

export function getProject(slug: string): Project | undefined {
  return allProjects.find((project) => project.slug === slug);
}

/**
 * Work that lives in other repositories.
 *
 * TODO: these are stubs describing projects found alongside this one. Correct
 * the descriptions, add links, or delete the array — the section disappears
 * when it is empty.
 */
export interface ExternalProject {
  title: string;
  description: string;
  stack: string[];
  status: string;
  href?: string;
}

// Empty for now, so the "Also building" section does not render. Add entries
// here to bring it back — BeatRoad and the guitar-teacher tool came out until
// there is something worth pointing at.
export const externalProjects: ExternalProject[] = [];

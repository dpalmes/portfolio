/**
 * Figures quoted on the site.
 *
 * These are claims about the code, so they live in one place rather than being
 * retyped into copy. Refresh with `npm run stats`, which prints the current
 * numbers straight from the test run.
 */

export const stats = {
  /** Total test cases across the suite. */
  tests: 199,
  /** Tests covering the pitch detector specifically. */
  pitchTests: 33,
  /** Tests covering the sequencer's timing. */
  timingTests: 22,
  /** Tests covering the fretboard search and chord recognition. */
  theoryTests: 77,
  /** Runtime dependencies used for audio or music theory. */
  audioDependencies: 0,
} as const;

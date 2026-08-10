/**
 * Figures quoted on the site.
 *
 * These are claims about the code, so they live in one place rather than being
 * retyped into copy. Refresh the browser-side numbers with `npm run stats`; the
 * Java counts come from `mvn test` in each of the three backend repositories.
 */

export const stats = {
  /** Test cases in this repository — the audio and music-theory work. */
  tests: 351,
  /** Tests covering the pitch detector specifically. */
  pitchTests: 33,
  /** Tests covering the sequencer's timing. */
  timingTests: 22,
  /** Tests covering the fretboard search and chord recognition. */
  theoryTests: 77,
  /** Runtime dependencies used for audio or music theory. */
  audioDependencies: 0,

  /** Tests covering the three product engines. */
  bookingTests: 33,
  diningTests: 31,
  inventoryTests: 33,
  crmTests: 55,

  /** Tests across the three Java backend repositories. */
  javaTests: 87,
  streamProcessorTests: 23,
  integrationGatewayTests: 26,
  secureApiTests: 38,
} as const;

/** Everything, across every repository. */
export const totalTests = stats.tests + stats.javaTests;

/**
 * Chord construction and recognition.
 *
 * Construction is the easy direction: a quality is a list of semitone offsets,
 * so a chord is `root + offsets`. Recognition is the interesting one — given an
 * unordered set of pitch classes, which chord is it? That is a search, because
 * the same set of notes can be named several ways (C6 and Am7 are the same four
 * notes) and real input is rarely a clean textbook voicing.
 */

import {
  SEMITONES_PER_OCTAVE,
  mod,
  pitchClassName,
  type Accidental,
  type PitchClass,
} from "./notes";

export interface ChordQuality {
  id: string;
  /** Suffix appended to the root name, e.g. "m7" in "Am7". */
  symbol: string;
  name: string;
  /** Semitone offsets from the root. */
  intervals: readonly number[];
  /**
   * Preference weight used to break ties during recognition. Higher wins.
   * Plain triads should beat exotic spellings of the same pitch set.
   */
  priority: number;
}

function quality(
  id: string,
  symbol: string,
  name: string,
  intervals: readonly number[],
  priority: number,
): ChordQuality {
  return { id, symbol, name, intervals, priority };
}

export const CHORD_QUALITIES: readonly ChordQuality[] = [
  quality("major", "", "major", [0, 4, 7], 100),
  quality("minor", "m", "minor", [0, 3, 7], 100),
  quality("diminished", "dim", "diminished", [0, 3, 6], 80),
  quality("augmented", "aug", "augmented", [0, 4, 8], 75),
  quality("sus2", "sus2", "suspended 2nd", [0, 2, 7], 70),
  quality("sus4", "sus4", "suspended 4th", [0, 5, 7], 70),
  quality("power", "5", "power chord", [0, 7], 60),
  quality("major7", "maj7", "major 7th", [0, 4, 7, 11], 90),
  quality("dominant7", "7", "dominant 7th", [0, 4, 7, 10], 95),
  quality("minor7", "m7", "minor 7th", [0, 3, 7, 10], 92),
  quality("minorMajor7", "mMaj7", "minor major 7th", [0, 3, 7, 11], 60),
  quality("halfDiminished", "m7b5", "half-diminished", [0, 3, 6, 10], 70),
  quality("diminished7", "dim7", "diminished 7th", [0, 3, 6, 9], 68),
  quality("major6", "6", "major 6th", [0, 4, 7, 9], 74),
  quality("minor6", "m6", "minor 6th", [0, 3, 7, 9], 72),
  quality("dominant9", "9", "dominant 9th", [0, 4, 7, 10, 14], 66),
  quality("major9", "maj9", "major 9th", [0, 4, 7, 11, 14], 64),
  quality("minor9", "m9", "minor 9th", [0, 3, 7, 10, 14], 64),
  quality("add9", "add9", "added 9th", [0, 4, 7, 14], 62),
  quality("dominant7sharp9", "7#9", "dominant 7th #9", [0, 4, 7, 10, 15], 50),
  quality("dominant7flat9", "7b9", "dominant 7th b9", [0, 4, 7, 10, 13], 50),
  quality("dominant13", "13", "dominant 13th", [0, 4, 7, 10, 14, 21], 48),
];

const QUALITIES_BY_ID = new Map(CHORD_QUALITIES.map((q) => [q.id, q]));

export function getChordQuality(id: string): ChordQuality | undefined {
  return QUALITIES_BY_ID.get(id);
}

/** MIDI notes for a chord voiced from the root upwards. */
export function chordNotes(rootMidi: number, q: ChordQuality): number[] {
  return q.intervals.map((interval) => rootMidi + interval);
}

/** The pitch classes a chord contains, order-independent. */
export function chordPitchClasses(
  root: PitchClass,
  q: ChordQuality,
): Set<PitchClass> {
  return new Set(
    q.intervals.map((interval) => mod(root + interval, SEMITONES_PER_OCTAVE)),
  );
}

export function chordSymbol(
  root: PitchClass,
  q: ChordQuality,
  accidental: Accidental = "sharp",
): string {
  return `${pitchClassName(root, accidental)}${q.symbol}`;
}

export interface ChordMatch {
  root: PitchClass;
  quality: ChordQuality;
  /** Full symbol including any slash bass, e.g. "C/E". */
  symbol: string;
  /** Bass pitch class when it is not the root, otherwise null. */
  bass: PitchClass | null;
  /**
   * 0-1. Exact match of every chord tone with nothing left over scores 1.
   * Missing chord tones and unexplained extra notes both cost.
   */
  score: number;
  /** Chord tones the input did not contain. */
  missing: number[];
  /** Input pitch classes the chord does not account for. */
  extra: PitchClass[];
}

/**
 * Identify the chords that best explain a set of pitch classes.
 *
 * Scoring is deliberately simple and explainable rather than clever: every
 * chord tone the input covers earns credit, every chord tone it lacks and every
 * note the chord cannot explain costs. Ties break on `quality.priority`, which
 * is what makes an ambiguous C-E-G-A read as C6 before Am7 — both are correct,
 * one is the more common reading.
 *
 * @param pitchClasses Notes present, in any order, duplicates allowed.
 * @param bass Lowest sounding pitch class, if known. Enables slash-chord names.
 */
export function detectChords(
  pitchClasses: Iterable<number>,
  options: { bass?: number | null; limit?: number; accidental?: Accidental } = {},
): ChordMatch[] {
  const { bass = null, limit = 5, accidental = "sharp" } = options;

  const bassPc = bass === null ? null : mod(bass, SEMITONES_PER_OCTAVE);

  const present = new Set<PitchClass>();
  for (const pc of pitchClasses) present.add(mod(pc, SEMITONES_PER_OCTAVE));
  // A bass note is a sounding note; callers should not have to list it twice.
  if (bassPc !== null) present.add(bassPc);
  if (present.size === 0) return [];

  const matches: ChordMatch[] = [];

  for (let root = 0; root < SEMITONES_PER_OCTAVE; root++) {
    for (const q of CHORD_QUALITIES) {
      const tones = chordPitchClasses(root, q);

      let covered = 0;
      for (const pc of tones) if (present.has(pc)) covered += 1;
      // A chord that explains none of the input is not a candidate at all.
      if (covered === 0) continue;

      // Reported as intervals rather than pitch classes so a UI can say
      // "no 5th" instead of "no G".
      const missing = q.intervals.filter(
        (interval) => !present.has(mod(root + interval, SEMITONES_PER_OCTAVE)),
      );

      const extra: PitchClass[] = [];
      for (const pc of present) if (!tones.has(pc)) extra.push(pc);

      // The root carries the identity of a chord, so losing it costs more than
      // losing a colour tone. Extra notes cost slightly more than missing ones:
      // an incomplete voicing is common, an unexplained note is a wrong guess.
      const penalty =
        missing.length + extra.length * 1.2 + (missing.includes(0) ? 1.5 : 0);

      const score = covered / (covered + penalty);

      const useSlash = bassPc !== null && bassPc !== root && tones.has(bassPc);
      const base = chordSymbol(root, q, accidental);

      matches.push({
        root,
        quality: q,
        bass: useSlash ? bassPc : null,
        symbol: useSlash
          ? `${base}/${pitchClassName(bassPc, accidental)}`
          : base,
        score,
        missing,
        extra,
      });
    }
  }

  // `score` measures fit and nothing else, so an exact match is always exactly
  // 1. Everything else that shapes the ranking is applied as a tiebreak, which
  // keeps the number meaningful for a UI to display.
  const bassMatch = (match: ChordMatch) =>
    bassPc !== null && match.root === bassPc ? 1 : 0;

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // The lowest note is the strongest cue for the root: A-C-E-G is Am7 under
    // an A and C6 under a C, and both readings fit the notes equally well.
    if (bassMatch(b) !== bassMatch(a)) return bassMatch(b) - bassMatch(a);
    if (b.quality.priority !== a.quality.priority) {
      return b.quality.priority - a.quality.priority;
    }
    // Final tiebreak keeps output stable across runs.
    return a.quality.intervals.length - b.quality.intervals.length;
  });

  return matches.slice(0, limit);
}

/** Convenience wrapper for the common "just tell me the chord" case. */
export function detectChord(
  pitchClasses: Iterable<number>,
  options: { bass?: number | null; accidental?: Accidental } = {},
): ChordMatch | null {
  return detectChords(pitchClasses, { ...options, limit: 1 })[0] ?? null;
}

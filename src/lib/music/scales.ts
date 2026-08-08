/**
 * Scales, expressed as semitone offsets from the root.
 *
 * Storing intervals rather than note names means a scale definition is
 * transposition-independent: the same array works for every key, and modes fall
 * out of rotating it.
 */

import { SEMITONES_PER_OCTAVE, mod, type PitchClass } from "./notes";

export interface ScaleDefinition {
  id: string;
  name: string;
  /** Semitone offsets from the root, ascending, starting at 0. */
  intervals: readonly number[];
  /**
   * Degree names as commonly written, aligned with `intervals`. Used for the
   * fretboard overlay so a b3 reads as "b3" rather than "3 semitones".
   */
  degrees: readonly string[];
}

function scale(
  id: string,
  name: string,
  intervals: readonly number[],
  degrees: readonly string[],
): ScaleDefinition {
  return { id, name, intervals, degrees };
}

export const SCALES: readonly ScaleDefinition[] = [
  scale(
    "major",
    "Major (Ionian)",
    [0, 2, 4, 5, 7, 9, 11],
    ["1", "2", "3", "4", "5", "6", "7"],
  ),
  scale(
    "natural-minor",
    "Natural minor (Aeolian)",
    [0, 2, 3, 5, 7, 8, 10],
    ["1", "2", "b3", "4", "5", "b6", "b7"],
  ),
  scale(
    "harmonic-minor",
    "Harmonic minor",
    [0, 2, 3, 5, 7, 8, 11],
    ["1", "2", "b3", "4", "5", "b6", "7"],
  ),
  scale(
    "melodic-minor",
    "Melodic minor",
    [0, 2, 3, 5, 7, 9, 11],
    ["1", "2", "b3", "4", "5", "6", "7"],
  ),
  scale(
    "dorian",
    "Dorian",
    [0, 2, 3, 5, 7, 9, 10],
    ["1", "2", "b3", "4", "5", "6", "b7"],
  ),
  scale(
    "phrygian",
    "Phrygian",
    [0, 1, 3, 5, 7, 8, 10],
    ["1", "b2", "b3", "4", "5", "b6", "b7"],
  ),
  scale(
    "lydian",
    "Lydian",
    [0, 2, 4, 6, 7, 9, 11],
    ["1", "2", "3", "#4", "5", "6", "7"],
  ),
  scale(
    "mixolydian",
    "Mixolydian",
    [0, 2, 4, 5, 7, 9, 10],
    ["1", "2", "3", "4", "5", "6", "b7"],
  ),
  scale(
    "locrian",
    "Locrian",
    [0, 1, 3, 5, 6, 8, 10],
    ["1", "b2", "b3", "4", "b5", "b6", "b7"],
  ),
  scale(
    "major-pentatonic",
    "Major pentatonic",
    [0, 2, 4, 7, 9],
    ["1", "2", "3", "5", "6"],
  ),
  scale(
    "minor-pentatonic",
    "Minor pentatonic",
    [0, 3, 5, 7, 10],
    ["1", "b3", "4", "5", "b7"],
  ),
  scale(
    "blues",
    "Blues",
    [0, 3, 5, 6, 7, 10],
    ["1", "b3", "4", "b5", "5", "b7"],
  ),
  scale(
    "whole-tone",
    "Whole tone",
    [0, 2, 4, 6, 8, 10],
    ["1", "2", "3", "#4", "#5", "b7"],
  ),
  scale(
    "chromatic",
    "Chromatic",
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"],
  ),
];

const SCALES_BY_ID = new Map(SCALES.map((s) => [s.id, s]));

export function getScale(id: string): ScaleDefinition | undefined {
  return SCALES_BY_ID.get(id);
}

/** The set of pitch classes a scale covers in a given key. */
export function scalePitchClasses(
  root: PitchClass,
  definition: ScaleDefinition,
): PitchClass[] {
  return definition.intervals.map((interval) =>
    mod(root + interval, SEMITONES_PER_OCTAVE),
  );
}

/**
 * Map every pitch class to its degree name within a scale, for the pitch
 * classes the scale contains. Lets the fretboard label a note "b7" in one
 * moment and "3" in another, purely by changing the key.
 */
export function degreeByPitchClass(
  root: PitchClass,
  definition: ScaleDefinition,
): Map<PitchClass, string> {
  const result = new Map<PitchClass, string>();
  definition.intervals.forEach((interval, index) => {
    const pc = mod(root + interval, SEMITONES_PER_OCTAVE);
    // First spelling wins — relevant only for the blues scale, where b5 and 5
    // are adjacent and both belong.
    if (!result.has(pc)) result.set(pc, definition.degrees[index]);
  });
  return result;
}

/**
 * Rotate a scale to its nth mode. Mode 0 is the scale itself; mode 1 of the
 * major scale is Dorian, and so on. Intervals are re-based so the new root
 * sits at 0.
 */
export function modeOf(
  definition: ScaleDefinition,
  degree: number,
): number[] {
  const { intervals } = definition;
  const size = intervals.length;
  const start = mod(degree, size);
  const offset = intervals[start];

  return Array.from({ length: size }, (_, i) => {
    const index = (start + i) % size;
    // Wrapping past the top of the scale adds an octave.
    const raw = intervals[index] + (start + i >= size ? SEMITONES_PER_OCTAVE : 0);
    return raw - offset;
  });
}

/** MIDI notes for one ascending octave of a scale from a given starting note. */
export function scaleNotes(rootMidi: number, definition: ScaleDefinition): number[] {
  return definition.intervals.map((interval) => rootMidi + interval);
}

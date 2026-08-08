/**
 * Pitch primitives.
 *
 * Everything downstream — scales, chords, the fretboard, the tuner readout —
 * is expressed in MIDI note numbers. MIDI is a good internal currency: it is an
 * integer, it is linear in semitones, and it converts to and from frequency
 * with a single exponential.
 *
 * Note *names* are deliberately kept at the edges. A pitch class is a number
 * from 0-11; whether 3 is spelled D# or Eb is a question about the key you are
 * in, not about the sound, so spelling is resolved as late as possible.
 */

export const SEMITONES_PER_OCTAVE = 12;

/** Concert pitch. Configurable because early-music and orchestral tuning differ. */
export const DEFAULT_A4 = 440;

/** MIDI note number of A4, the reference pitch. */
export const A4_MIDI = 69;

export const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type PitchClass = number; // 0-11, C = 0

export type Accidental = "sharp" | "flat";

/** A pitch resolved from a measured frequency. */
export interface DetectedPitch {
  /** Nearest MIDI note number. */
  midi: number;
  /** Scientific pitch notation, e.g. "A4". */
  name: string;
  /** Pitch class 0-11. */
  pitchClass: PitchClass;
  octave: number;
  /**
   * Signed distance from the nearest equal-tempered note, in cents.
   * Range (-50, 50]. Negative means flat.
   */
  cents: number;
  /** The exact frequency of the nearest equal-tempered note. */
  targetFrequency: number;
}

/**
 * True modulo. JavaScript's `%` keeps the sign of the dividend, which is wrong
 * for pitch-class arithmetic: (-1) % 12 must be 11, not -1.
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function midiToFrequency(midi: number, a4: number = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - A4_MIDI) / SEMITONES_PER_OCTAVE);
}

/**
 * Frequency to a *fractional* MIDI number. The fractional part is what makes a
 * tuner possible: 69.25 is a quarter-semitone (25 cents) sharp of A4.
 */
export function frequencyToMidi(
  frequency: number,
  a4: number = DEFAULT_A4,
): number {
  if (frequency <= 0) return Number.NaN;
  return A4_MIDI + SEMITONES_PER_OCTAVE * Math.log2(frequency / a4);
}

export function pitchClassOf(midi: number): PitchClass {
  return mod(Math.round(midi), SEMITONES_PER_OCTAVE);
}

/** Scientific pitch notation octave: C4 is middle C, MIDI 60. */
export function octaveOf(midi: number): number {
  return Math.floor(Math.round(midi) / SEMITONES_PER_OCTAVE) - 1;
}

export function pitchClassName(
  pitchClass: PitchClass,
  accidental: Accidental = "sharp",
): string {
  const table = accidental === "flat" ? FLAT_NAMES : SHARP_NAMES;
  return table[mod(pitchClass, SEMITONES_PER_OCTAVE)];
}

export function midiToName(
  midi: number,
  accidental: Accidental = "sharp",
): string {
  const rounded = Math.round(midi);
  return `${pitchClassName(pitchClassOf(rounded), accidental)}${octaveOf(rounded)}`;
}

const NAME_PATTERN = /^([A-Ga-g])([#b♯♭x]*)(-?\d+)$/;

const NATURAL_PITCH_CLASSES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Parse scientific pitch notation into a MIDI number. Accepts ASCII (`C#4`,
 * `Bb3`) and Unicode (`C♯4`, `B♭3`) accidentals, repeated for double
 * accidentals, plus `x` for a double sharp.
 *
 * Returns null rather than throwing — callers are usually parsing user input,
 * and a null is easier to thread through a UI than an exception.
 */
export function nameToMidi(name: string): number | null {
  const match = NAME_PATTERN.exec(name.trim());
  if (!match) return null;

  const [, letter, accidentals, octaveText] = match;
  const natural = NATURAL_PITCH_CLASSES[letter.toUpperCase()];
  if (natural === undefined) return null;

  let offset = 0;
  for (const char of accidentals) {
    if (char === "#" || char === "♯") offset += 1;
    else if (char === "b" || char === "♭") offset -= 1;
    else if (char === "x") offset += 2;
  }

  const octave = Number.parseInt(octaveText, 10);
  return (octave + 1) * SEMITONES_PER_OCTAVE + natural + offset;
}

/** Cents between two frequencies. Positive means `frequency` is above `reference`. */
export function centsBetween(frequency: number, reference: number): number {
  return 1200 * Math.log2(frequency / reference);
}

/**
 * Resolve a raw frequency into the nearest equal-tempered note plus its
 * deviation in cents — the whole job of a tuner, once you have the frequency.
 */
export function describeFrequency(
  frequency: number,
  options: { a4?: number; accidental?: Accidental } = {},
): DetectedPitch | null {
  const { a4 = DEFAULT_A4, accidental = "sharp" } = options;
  if (!Number.isFinite(frequency) || frequency <= 0) return null;

  const fractionalMidi = frequencyToMidi(frequency, a4);
  const midi = Math.round(fractionalMidi);
  const targetFrequency = midiToFrequency(midi, a4);

  return {
    midi,
    name: midiToName(midi, accidental),
    pitchClass: pitchClassOf(midi),
    octave: octaveOf(midi),
    // Equivalent to centsBetween(frequency, targetFrequency), but derived from
    // the fractional MIDI value we already computed.
    cents: (fractionalMidi - midi) * 100,
    targetFrequency,
  };
}

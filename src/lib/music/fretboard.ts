/**
 * Fretboard geometry and chord-shape search.
 *
 * A fretboard is a nice problem because the mapping from notes to positions is
 * many-to-many: the same pitch appears in several places, and any given chord
 * has dozens of valid fingerings. Finding good ones is a constrained search
 * rather than a lookup, so this file does not ship a table of chord diagrams —
 * it derives them, which means it works for any tuning, including ones nobody
 * tabulated.
 */

import {
  SEMITONES_PER_OCTAVE,
  midiToName,
  mod,
  nameToMidi,
  pitchClassOf,
  type PitchClass,
} from "./notes";
import { chordPitchClasses, type ChordQuality } from "./chords";

export interface Tuning {
  id: string;
  name: string;
  /** Open-string MIDI notes, lowest-pitched string first. */
  strings: readonly number[];
  fretCount: number;
}

function tuning(
  id: string,
  name: string,
  noteNames: readonly string[],
  fretCount = 15,
): Tuning {
  const strings = noteNames.map((n) => {
    const midi = nameToMidi(n);
    if (midi === null) throw new Error(`Invalid tuning note "${n}" in ${id}`);
    return midi;
  });
  return { id, name, strings, fretCount };
}

export const TUNINGS: readonly Tuning[] = [
  tuning("standard", "Standard (EADGBE)", ["E2", "A2", "D3", "G3", "B3", "E4"]),
  tuning("drop-d", "Drop D (DADGBE)", ["D2", "A2", "D3", "G3", "B3", "E4"]),
  tuning("dadgad", "DADGAD", ["D2", "A2", "D3", "G3", "A3", "D4"]),
  tuning("open-g", "Open G (DGDGBD)", ["D2", "G2", "D3", "G3", "B3", "D4"]),
  tuning("half-step-down", "Half step down (Eb)", [
    "Eb2",
    "Ab2",
    "Db3",
    "Gb3",
    "Bb3",
    "Eb4",
  ]),
  tuning("bass", "Bass (EADG)", ["E1", "A1", "D2", "G2"], 12),
  tuning("ukulele", "Ukulele (GCEA)", ["G4", "C4", "E4", "A4"], 12),
];

const TUNINGS_BY_ID = new Map(TUNINGS.map((t) => [t.id, t]));

export function getTuning(id: string): Tuning | undefined {
  return TUNINGS_BY_ID.get(id);
}

export interface FretPosition {
  /** 0 is the lowest-pitched string. */
  string: number;
  /** 0 is an open string. */
  fret: number;
  midi: number;
  pitchClass: PitchClass;
  name: string;
}

export function fretMidi(t: Tuning, string: number, fret: number): number {
  return t.strings[string] + fret;
}

export function fretPosition(
  t: Tuning,
  string: number,
  fret: number,
): FretPosition {
  const midi = fretMidi(t, string, fret);
  return {
    string,
    fret,
    midi,
    pitchClass: pitchClassOf(midi),
    name: midiToName(midi),
  };
}

/** Every position on the neck whose pitch class is in `pitchClasses`. */
export function findPositions(
  t: Tuning,
  pitchClasses: Iterable<number>,
  options: { maxFret?: number } = {},
): FretPosition[] {
  const maxFret = options.maxFret ?? t.fretCount;
  const wanted = new Set<PitchClass>();
  for (const pc of pitchClasses) wanted.add(mod(pc, SEMITONES_PER_OCTAVE));

  const results: FretPosition[] = [];
  for (let string = 0; string < t.strings.length; string++) {
    for (let fret = 0; fret <= maxFret; fret++) {
      const pos = fretPosition(t, string, fret);
      if (wanted.has(pos.pitchClass)) results.push(pos);
    }
  }
  return results;
}

/**
 * One fingering. `frets[i]` is the fret played on string i, or `MUTED`.
 */
export const MUTED = -1;

export interface ChordShape {
  /** Aligned with `tuning.strings`: fret number, or MUTED. */
  frets: number[];
  /** Lowest fret that is actually fretted (0 if the shape is all open). */
  baseFret: number;
  /** Fret span of the fretted notes. */
  span: number;
  /** Sounding notes, low to high. */
  notes: FretPosition[];
  /** Pitch class of the lowest sounding note. */
  bass: PitchClass;
  /** True when the lowest sounding note is the chord root. */
  rootPosition: boolean;
  /** Higher is more playable. See `scoreShape`. */
  score: number;
}

export interface ChordShapeOptions {
  /** Maximum fret span a hand is asked to cover. */
  maxSpan?: number;
  maxFret?: number;
  /** Minimum sounding strings. */
  minStrings?: number;
  /** Allow shapes whose bass note is not the root. */
  allowInversions?: boolean;
  /** Allow a muted string between two sounding strings. */
  allowInnerMutes?: boolean;
  limit?: number;
}

/**
 * Heuristic playability score, roughly in the order a guitarist would rank
 * fingerings: cover the chord, keep the root in the bass, use as few fingers
 * and as small a stretch as possible, and prefer open strings.
 */
function scoreShape(shape: Omit<ChordShape, "score">, tonesNeeded: number): number {
  const sounding = shape.notes.length;
  const fretted = shape.frets.filter((f) => f > 0).length;
  const open = shape.frets.filter((f) => f === 0).length;
  const distinctTones = new Set(shape.notes.map((n) => n.pitchClass)).size;

  let score = 0;
  score += distinctTones * 12; // covering the chord matters most
  score += sounding * 4; // fuller voicings sound better
  score += open * 3; // open strings are free
  score -= shape.span * 5; // stretches hurt
  score -= fretted * 1.5; // fewer fingers is easier
  score -= shape.baseFret * 0.4; // low positions are marginally preferred
  if (shape.rootPosition) score += 15;
  if (distinctTones < tonesNeeded) score -= 30; // incomplete chord

  return score;
}

/**
 * Search the neck for playable fingerings of a chord.
 *
 * The search walks one hand position at a time. Within a position each string
 * may be muted, played open, or fretted inside the span, and a depth-first walk
 * over the strings enumerates the combinations. Pruning is what keeps this
 * cheap: a branch is abandoned as soon as the strings that remain cannot supply
 * the chord tones still missing.
 */
export function findChordShapes(
  t: Tuning,
  root: PitchClass,
  q: ChordQuality,
  options: ChordShapeOptions = {},
): ChordShape[] {
  const {
    maxSpan = 4,
    maxFret = Math.min(t.fretCount, 12),
    minStrings = Math.min(3, t.strings.length),
    allowInversions = true,
    allowInnerMutes = false,
    limit = 8,
  } = options;

  const rootPc = mod(root, SEMITONES_PER_OCTAVE);
  const tones = chordPitchClasses(rootPc, q);
  const stringCount = t.strings.length;

  const shapes: ChordShape[] = [];
  const seen = new Set<string>();

  for (let windowStart = 1; windowStart <= maxFret - maxSpan + 1; windowStart++) {
    // Candidate frets per string for this hand position: muted, open, or one of
    // the frets under the hand.
    const candidates: number[][] = [];
    for (let s = 0; s < stringCount; s++) {
      const choices: number[] = [MUTED, 0];
      for (let f = windowStart; f < windowStart + maxSpan && f <= maxFret; f++) {
        choices.push(f);
      }
      // Only frets that actually produce a chord tone are worth exploring.
      candidates.push(
        choices.filter(
          (f) => f === MUTED || tones.has(pitchClassOf(fretMidi(t, s, f))),
        ),
      );
    }

    const frets = new Array<number>(stringCount).fill(MUTED);

    const walk = (string: number, covered: Set<PitchClass>) => {
      if (string === stringCount) {
        if (covered.size !== tones.size) return;
        const shape = buildShape(t, frets, rootPc);
        if (!shape) return;
        if (shape.notes.length < minStrings) return;
        if (shape.span > maxSpan) return;
        if (!allowInversions && !shape.rootPosition) return;
        if (!allowInnerMutes && hasInnerMute(shape.frets)) return;

        const key = shape.frets.join(",");
        if (seen.has(key)) return;
        seen.add(key);
        shapes.push({ ...shape, score: scoreShape(shape, tones.size) });
        return;
      }

      // Prune: if every remaining string cannot possibly supply the tones we
      // are still missing, abandon this branch.
      const remaining = stringCount - string;
      if (tones.size - covered.size > remaining) return;

      for (const fret of candidates[string]) {
        if (fret === MUTED) {
          frets[string] = MUTED;
          walk(string + 1, covered);
          continue;
        }
        const pc = pitchClassOf(fretMidi(t, string, fret));
        const added = !covered.has(pc);
        if (added) covered.add(pc);
        frets[string] = fret;
        walk(string + 1, covered);
        if (added) covered.delete(pc);
      }
      frets[string] = MUTED;
    };

    walk(0, new Set<PitchClass>());
  }

  // Open-position shapes live outside the sliding window (their fretted notes
  // may sit at frets 1-4 alongside open strings), so the window starting at 1
  // already covers them. Sorting is what surfaces them first.
  shapes.sort((a, b) => b.score - a.score);
  return shapes.slice(0, limit);
}

function hasInnerMute(frets: readonly number[]): boolean {
  const first = frets.findIndex((f) => f !== MUTED);
  const last = frets.length - 1 - [...frets].reverse().findIndex((f) => f !== MUTED);
  if (first < 0) return false;
  for (let i = first; i <= last; i++) if (frets[i] === MUTED) return true;
  return false;
}

function buildShape(
  t: Tuning,
  frets: readonly number[],
  rootPc: PitchClass,
): Omit<ChordShape, "score"> | null {
  const notes: FretPosition[] = [];
  for (let s = 0; s < frets.length; s++) {
    if (frets[s] === MUTED) continue;
    notes.push(fretPosition(t, s, frets[s]));
  }
  if (notes.length === 0) return null;

  notes.sort((a, b) => a.midi - b.midi);
  const frettedFrets = frets.filter((f) => f > 0);
  const baseFret = frettedFrets.length ? Math.min(...frettedFrets) : 0;
  const topFret = frettedFrets.length ? Math.max(...frettedFrets) : 0;

  return {
    frets: [...frets],
    baseFret,
    span: frettedFrets.length ? topFret - baseFret + 1 : 0,
    notes,
    bass: notes[0].pitchClass,
    rootPosition: notes[0].pitchClass === rootPc,
  };
}

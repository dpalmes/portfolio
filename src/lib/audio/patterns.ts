/**
 * Drum patterns, written as strings so they can be read at a glance.
 *
 * `x` is a hit, `.` is a rest, one character per sixteenth note. Keeping the
 * notation this terse means a pattern in source looks like a pattern on the
 * screen, which makes a typo obvious.
 */

import type { DrumId } from "./voices";

export const STEPS_PER_BAR = 16;

export type Pattern = Partial<Record<DrumId, boolean[]>>;

export function parseRow(row: string): boolean[] {
  const cells = row.replace(/[\s|]/g, "");
  return Array.from(
    { length: STEPS_PER_BAR },
    (_, index) => cells[index] === "x" || cells[index] === "X",
  );
}

function pattern(rows: Partial<Record<DrumId, string>>): Pattern {
  const result: Pattern = {};
  for (const [id, row] of Object.entries(rows)) {
    result[id as DrumId] = parseRow(row);
  }
  return result;
}

export interface PatternPreset {
  id: string;
  name: string;
  bpm: number;
  swing: number;
  pattern: Pattern;
}

export const PRESETS: readonly PatternPreset[] = [
  {
    id: "four-on-the-floor",
    name: "Four on the floor",
    bpm: 124,
    swing: 0,
    pattern: pattern({
      kick: "x...x...x...x...",
      clap: "....x.......x...",
      hatClosed: "..x...x...x...x.",
      hatOpen: "......x.......x.",
    }),
  },
  {
    id: "boom-bap",
    name: "Boom bap",
    bpm: 92,
    swing: 0.24,
    pattern: pattern({
      kick: "x.......x.x.....",
      snare: "....x.......x...",
      hatClosed: "x.x.x.x.x.x.x.x.",
      rim: "..............x.",
    }),
  },
  {
    id: "breakbeat",
    name: "Breakbeat",
    bpm: 168,
    swing: 0,
    pattern: pattern({
      kick: "x.....x.....x...",
      snare: "....x.......x...",
      hatClosed: "x.x.x.x.x.x.x.x.",
      tom: "...........x....",
    }),
  },
  {
    id: "half-time",
    name: "Half time",
    bpm: 76,
    swing: 0.12,
    pattern: pattern({
      kick: "x.......x.......",
      snare: "........x.......",
      clap: "........x.......",
      hatClosed: "x..x..x..x..x..x",
    }),
  },
];

export function emptyPattern(ids: readonly DrumId[]): Pattern {
  const result: Pattern = {};
  for (const id of ids) result[id] = new Array<boolean>(STEPS_PER_BAR).fill(false);
  return result;
}

/** Immutable toggle, so React state updates stay predictable. */
export function toggleStep(
  current: Pattern,
  id: DrumId,
  step: number,
): Pattern {
  const row = current[id] ?? new Array<boolean>(STEPS_PER_BAR).fill(false);
  const next = [...row];
  next[step] = !next[step];
  return { ...current, [id]: next };
}

export function isActive(pattern: Pattern, id: DrumId, step: number): boolean {
  return pattern[id]?.[step] ?? false;
}

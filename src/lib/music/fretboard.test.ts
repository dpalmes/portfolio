import { describe, expect, it } from "vitest";
import {
  MUTED,
  TUNINGS,
  findChordShapes,
  findPositions,
  fretMidi,
  fretPosition,
  getTuning,
} from "./fretboard";
import { getChordQuality } from "./chords";
import { midiToName, nameToMidi, pitchClassOf } from "./notes";

const standard = getTuning("standard")!;

describe("tunings", () => {
  it("have unique ids and parse their open strings", () => {
    expect(new Set(TUNINGS.map((t) => t.id)).size).toBe(TUNINGS.length);
    for (const t of TUNINGS) {
      expect(t.strings.length).toBeGreaterThan(0);
      expect(t.strings.every((m) => Number.isInteger(m))).toBe(true);
    }
  });

  it("spells standard tuning low to high", () => {
    expect(standard.strings.map((m) => midiToName(m))).toEqual([
      "E2",
      "A2",
      "D3",
      "G3",
      "B3",
      "E4",
    ]);
  });

  it("puts the ukulele's 4th string above its 3rd (reentrant tuning)", () => {
    const uke = getTuning("ukulele")!;
    expect(uke.strings[0]).toBeGreaterThan(uke.strings[1]);
  });
});

describe("fret geometry", () => {
  it("adds one semitone per fret", () => {
    expect(fretMidi(standard, 0, 0)).toBe(nameToMidi("E2"));
    expect(fretMidi(standard, 0, 5)).toBe(nameToMidi("A2"));
    expect(fretMidi(standard, 0, 12)).toBe(nameToMidi("E3"));
  });

  it("matches the classic tuning reference points", () => {
    // 5th fret of each string equals the next open string, except G->B.
    for (const string of [0, 1, 2]) {
      expect(fretMidi(standard, string, 5)).toBe(standard.strings[string + 1]);
    }
    expect(fretMidi(standard, 3, 4)).toBe(standard.strings[4]);
    expect(fretMidi(standard, 4, 5)).toBe(standard.strings[5]);
  });

  it("describes a position fully", () => {
    const position = fretPosition(standard, 5, 3);
    expect(position).toMatchObject({
      string: 5,
      fret: 3,
      name: "G4",
      pitchClass: 7,
    });
  });
});

describe("findPositions", () => {
  it("finds every C on the neck", () => {
    const positions = findPositions(standard, [0], { maxFret: 12 });
    expect(positions.length).toBeGreaterThan(5);
    expect(positions.every((p) => p.pitchClass === 0)).toBe(true);
    // The open A string's 3rd fret is a C.
    expect(positions).toContainEqual(
      expect.objectContaining({ string: 1, fret: 3, name: "C3" }),
    );
  });

  it("includes open strings", () => {
    const positions = findPositions(standard, [4], { maxFret: 3 });
    expect(positions.some((p) => p.fret === 0 && p.string === 0)).toBe(true);
  });

  it("returns nothing for an empty request", () => {
    expect(findPositions(standard, [])).toEqual([]);
  });

  it("respects maxFret", () => {
    const positions = findPositions(standard, [0, 4, 7], { maxFret: 5 });
    expect(positions.every((p) => p.fret <= 5)).toBe(true);
  });
});

describe("findChordShapes", () => {
  const major = getChordQuality("major")!;
  const minor = getChordQuality("minor")!;

  it("finds shapes that actually contain the chord", () => {
    const shapes = findChordShapes(standard, 0, major);
    expect(shapes.length).toBeGreaterThan(0);

    for (const shape of shapes) {
      const tones = new Set(shape.notes.map((n) => n.pitchClass));
      expect([...tones].sort((a, b) => a - b)).toEqual([0, 4, 7]);
    }
  });

  it("derives the open C major shape", () => {
    const shapes = findChordShapes(standard, 0, major, { limit: 40 });
    // x32010 — the first shape most guitarists learn.
    expect(shapes.map((s) => s.frets.join(","))).toContain(
      [MUTED, 3, 2, 0, 1, 0].join(","),
    );
  });

  it("derives the E-shape barre for F major", () => {
    const shapes = findChordShapes(standard, 5, major, { limit: 60 });
    expect(shapes.map((s) => s.frets.join(","))).toContain(
      [1, 3, 3, 2, 1, 1].join(","),
    );
  });

  it("derives the open A minor shape", () => {
    const shapes = findChordShapes(standard, 9, minor, { limit: 40 });
    expect(shapes.map((s) => s.frets.join(","))).toContain(
      [MUTED, 0, 2, 2, 1, 0].join(","),
    );
  });

  it("reports geometry consistent with the frets", () => {
    for (const shape of findChordShapes(standard, 2, major, { limit: 20 })) {
      const fretted = shape.frets.filter((f) => f > 0);
      if (fretted.length === 0) {
        expect(shape.span).toBe(0);
        continue;
      }
      expect(shape.baseFret).toBe(Math.min(...fretted));
      expect(shape.span).toBe(Math.max(...fretted) - Math.min(...fretted) + 1);
      expect(shape.notes).toHaveLength(
        shape.frets.filter((f) => f !== MUTED).length,
      );
    }
  });

  it("identifies the bass note and root position correctly", () => {
    for (const shape of findChordShapes(standard, 7, major, { limit: 20 })) {
      const lowest = shape.notes[0];
      expect(shape.bass).toBe(lowest.pitchClass);
      expect(shape.rootPosition).toBe(lowest.pitchClass === 7);
      // notes are sorted low to high
      for (let i = 1; i < shape.notes.length; i++) {
        expect(shape.notes[i].midi).toBeGreaterThanOrEqual(
          shape.notes[i - 1].midi,
        );
      }
    }
  });

  it("honours the span limit", () => {
    for (const shape of findChordShapes(standard, 3, major, { maxSpan: 3 })) {
      expect(shape.span).toBeLessThanOrEqual(3);
    }
  });

  it("honours the minimum string count", () => {
    for (const shape of findChordShapes(standard, 0, major, { minStrings: 5 })) {
      expect(shape.notes.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("can require root position", () => {
    const shapes = findChordShapes(standard, 0, major, {
      allowInversions: false,
      limit: 30,
    });
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes.every((s) => s.rootPosition)).toBe(true);
  });

  it("excludes inner mutes by default and allows them on request", () => {
    const strict = findChordShapes(standard, 0, major, { limit: 60 });
    const hasInnerMute = (frets: number[]) => {
      const first = frets.findIndex((f) => f !== MUTED);
      const last = frets.length - 1 - [...frets].reverse().findIndex((f) => f !== MUTED);
      return frets.slice(first, last + 1).some((f) => f === MUTED);
    };
    expect(strict.some((s) => hasInnerMute(s.frets))).toBe(false);

    const loose = findChordShapes(standard, 0, major, {
      allowInnerMutes: true,
      limit: 200,
    });
    expect(loose.length).toBeGreaterThanOrEqual(strict.length);
  });

  it("ranks the shape a guitarist would actually reach for first", () => {
    // The real test of the scoring heuristic. None of these fingerings are
    // stored anywhere — each is the top result of a fresh search — so if the
    // ranking drifts, this is what catches it.
    const canonical: Array<[number, string, number[]]> = [
      [0, "major", [MUTED, 3, 2, 0, 1, 0]], // open C
      [7, "major", [3, 2, 0, 0, 0, 3]], // open G
      [9, "minor", [MUTED, 0, 2, 2, 1, 0]], // open Am
      [4, "minor", [0, 2, 2, 0, 0, 0]], // open Em
      [2, "minor7", [MUTED, MUTED, 0, 2, 1, 1]], // open Dm7
    ];

    for (const [root, qualityId, expected] of canonical) {
      const [best] = findChordShapes(standard, root, getChordQuality(qualityId)!);
      expect(best.frets, `${root} ${qualityId}`).toEqual(expected);
    }
  });

  it("does not let open strings drag a high-position shape to the top", () => {
    // Open strings ring wherever the hand is, so a search that rewards them
    // too heavily will surface odd hybrids — frets at the 8th position with
    // open strings mixed in — above the shapes people actually play.
    const [best] = findChordShapes(standard, 0, major);
    const openStrings = best.frets.filter((fret) => fret === 0).length;
    if (openStrings > 0) expect(best.baseFret).toBeLessThanOrEqual(3);
  });

  it("ranks its first suggestion as playable", () => {
    const [best] = findChordShapes(standard, 7, major);
    expect(best.span).toBeLessThanOrEqual(4);
    expect(best.notes.length).toBeGreaterThanOrEqual(4);
    expect(best.rootPosition).toBe(true);
  });

  it("works in an alternate tuning it was never tabulated for", () => {
    const dadgad = getTuning("dadgad")!;
    const shapes = findChordShapes(dadgad, 2, major, { limit: 10 });
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      for (const note of shape.notes) {
        expect([2, 6, 9]).toContain(note.pitchClass); // D F# A
      }
    }
  });

  it("works on an instrument with a different string count", () => {
    const uke = getTuning("ukulele")!;
    const shapes = findChordShapes(uke, 0, major, { minStrings: 4, limit: 10 });
    expect(shapes.length).toBeGreaterThan(0);
    expect(shapes[0].frets).toHaveLength(4);
  });

  it("returns an empty list rather than throwing when nothing fits", () => {
    const shapes = findChordShapes(standard, 0, major, {
      maxFret: 2,
      maxSpan: 1,
      minStrings: 6,
    });
    expect(Array.isArray(shapes)).toBe(true);
  });

  it("returns results quickly enough for interactive use", () => {
    const started = performance.now();
    for (let root = 0; root < 12; root++) {
      findChordShapes(standard, root, major);
    }
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it("never reports a fret outside the requested range", () => {
    for (const shape of findChordShapes(standard, 4, minor, { maxFret: 7 })) {
      for (const fret of shape.frets) {
        expect(fret === MUTED || (fret >= 0 && fret <= 7)).toBe(true);
      }
    }
  });

  it("agrees with fretPosition about what each fret sounds", () => {
    for (const shape of findChordShapes(standard, 5, major, { limit: 10 })) {
      shape.frets.forEach((fret, string) => {
        if (fret === MUTED) return;
        const note = shape.notes.find(
          (n) => n.string === string && n.fret === fret,
        );
        expect(note).toBeDefined();
        expect(note!.pitchClass).toBe(pitchClassOf(fretMidi(standard, string, fret)));
      });
    }
  });
});

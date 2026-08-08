import { describe, expect, it } from "vitest";
import {
  SCALES,
  degreeByPitchClass,
  getScale,
  modeOf,
  scaleNotes,
  scalePitchClasses,
} from "./scales";
import { midiToName, nameToMidi } from "./notes";

describe("scale definitions", () => {
  it("are internally consistent", () => {
    for (const scale of SCALES) {
      expect(scale.intervals.length, `${scale.id} degree count`).toBe(
        scale.degrees.length,
      );
      expect(scale.intervals[0], `${scale.id} starts on the root`).toBe(0);
      expect(scale.intervals.every((i) => i >= 0 && i < 12)).toBe(true);

      const ascending = scale.intervals.every(
        (interval, index) => index === 0 || interval > scale.intervals[index - 1],
      );
      expect(ascending, `${scale.id} is ascending`).toBe(true);
    }
  });

  it("have unique ids", () => {
    expect(new Set(SCALES.map((s) => s.id)).size).toBe(SCALES.length);
  });

  it("are retrievable by id", () => {
    expect(getScale("major")?.name).toBe("Major (Ionian)");
    expect(getScale("nope")).toBeUndefined();
  });
});

describe("scalePitchClasses", () => {
  it("spells C major on the white notes", () => {
    expect(scalePitchClasses(0, getScale("major")!)).toEqual([
      0, 2, 4, 5, 7, 9, 11,
    ]);
  });

  it("wraps past the octave", () => {
    // A natural minor is also the white notes, rotated.
    expect(scalePitchClasses(9, getScale("natural-minor")!).sort((a, b) => a - b))
      .toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("gives every relative major/minor pair the same notes", () => {
    for (let root = 0; root < 12; root++) {
      const major = scalePitchClasses(root, getScale("major")!).sort((a, b) => a - b);
      const relativeMinor = scalePitchClasses(
        (root + 9) % 12,
        getScale("natural-minor")!,
      ).sort((a, b) => a - b);
      expect(relativeMinor).toEqual(major);
    }
  });
});

describe("modeOf", () => {
  const major = getScale("major")!;

  it("returns the scale itself at degree 0", () => {
    expect(modeOf(major, 0)).toEqual([...major.intervals]);
  });

  it("derives the classical modes from the major scale", () => {
    expect(modeOf(major, 1)).toEqual(getScale("dorian")!.intervals);
    expect(modeOf(major, 2)).toEqual(getScale("phrygian")!.intervals);
    expect(modeOf(major, 3)).toEqual(getScale("lydian")!.intervals);
    expect(modeOf(major, 4)).toEqual(getScale("mixolydian")!.intervals);
    expect(modeOf(major, 5)).toEqual(getScale("natural-minor")!.intervals);
    expect(modeOf(major, 6)).toEqual(getScale("locrian")!.intervals);
  });

  it("wraps around and accepts negative degrees", () => {
    expect(modeOf(major, 7)).toEqual([...major.intervals]);
    expect(modeOf(major, -1)).toEqual(getScale("locrian")!.intervals);
  });
});

describe("degreeByPitchClass", () => {
  it("labels the notes of a key by function", () => {
    const map = degreeByPitchClass(7, getScale("major")!); // G major
    expect(map.get(7)).toBe("1");
    expect(map.get(11)).toBe("3");
    expect(map.get(6)).toBe("7"); // F#
    expect(map.has(5)).toBe(false); // F natural is outside the key
  });

  it("keeps both the b5 and the 5 of the blues scale", () => {
    const map = degreeByPitchClass(0, getScale("blues")!);
    expect(map.get(6)).toBe("b5");
    expect(map.get(7)).toBe("5");
  });
});

describe("scaleNotes", () => {
  it("spells a C major scale from middle C", () => {
    const notes = scaleNotes(nameToMidi("C4")!, getScale("major")!);
    expect(notes.map((n) => midiToName(n))).toEqual([
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
      "A4",
      "B4",
    ]);
  });

  it("stays ascending across an octave boundary", () => {
    const notes = scaleNotes(nameToMidi("A3")!, getScale("natural-minor")!);
    expect(notes.map((n) => midiToName(n))).toEqual([
      "A3",
      "B3",
      "C4",
      "D4",
      "E4",
      "F4",
      "G4",
    ]);
  });
});

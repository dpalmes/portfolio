import { describe, expect, it } from "vitest";
import {
  CHORD_QUALITIES,
  chordNotes,
  chordPitchClasses,
  chordSymbol,
  detectChord,
  detectChords,
  getChordQuality,
} from "./chords";
import { midiToName, nameToMidi } from "./notes";

const pcs = (...names: string[]) =>
  names.map((n) => nameToMidi(`${n}4`) ?? nameToMidi(n)!).map((m) => m % 12);

describe("chord quality definitions", () => {
  it("have unique ids and start on the root", () => {
    expect(new Set(CHORD_QUALITIES.map((q) => q.id)).size).toBe(
      CHORD_QUALITIES.length,
    );
    for (const q of CHORD_QUALITIES) {
      expect(q.intervals[0], `${q.id}`).toBe(0);
      expect(q.intervals.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("are retrievable by id", () => {
    expect(getChordQuality("minor7")?.symbol).toBe("m7");
    expect(getChordQuality("nope")).toBeUndefined();
  });
});

describe("chordNotes", () => {
  it("spells a C major triad from middle C", () => {
    const notes = chordNotes(nameToMidi("C4")!, getChordQuality("major")!);
    expect(notes.map((n) => midiToName(n))).toEqual(["C4", "E4", "G4"]);
  });

  it("spells an A minor 7th", () => {
    const notes = chordNotes(nameToMidi("A3")!, getChordQuality("minor7")!);
    expect(notes.map((n) => midiToName(n))).toEqual(["A3", "C4", "E4", "G4"]);
  });

  it("voices extensions above the octave", () => {
    const notes = chordNotes(nameToMidi("C3")!, getChordQuality("dominant9")!);
    expect(notes.map((n) => midiToName(n))).toEqual([
      "C3",
      "E3",
      "G3",
      "A#3",
      "D4",
    ]);
  });
});

describe("chordPitchClasses", () => {
  it("collapses extensions into the octave", () => {
    expect([...chordPitchClasses(0, getChordQuality("dominant9")!)].sort((a, b) => a - b))
      .toEqual([0, 2, 4, 7, 10]);
  });
});

describe("chordSymbol", () => {
  it("joins root and suffix", () => {
    expect(chordSymbol(0, getChordQuality("major")!)).toBe("C");
    expect(chordSymbol(9, getChordQuality("minor")!)).toBe("Am");
    expect(chordSymbol(7, getChordQuality("dominant7")!)).toBe("G7");
    expect(chordSymbol(10, getChordQuality("major7")!, "flat")).toBe("Bbmaj7");
  });
});

describe("detectChord on unambiguous input", () => {
  const cases: Array<[string[], string]> = [
    [["C", "E", "G"], "C"],
    [["A", "C", "E"], "Am"],
    [["G", "B", "D", "F"], "G7"],
    [["C", "E", "G", "B"], "Cmaj7"],
    [["D", "F", "A", "C"], "Dm7"],
    [["B", "D", "F"], "Bdim"],
    [["C", "E", "G#"], "Caug"],
    [["C", "F", "G"], "Csus4"],
    [["C", "D", "G"], "Csus2"],
    [["C", "G"], "C5"],
  ];

  it.each(cases)("names %j as %s", (names, expected) => {
    expect(detectChord(pcs(...names))?.symbol).toBe(expected);
  });

  it("is order independent", () => {
    expect(detectChord(pcs("G", "C", "E"))?.symbol).toBe("C");
    expect(detectChord(pcs("E", "G", "C"))?.symbol).toBe("C");
  });

  it("ignores duplicated notes and octaves", () => {
    expect(detectChord([0, 4, 7, 12, 16, 24])?.symbol).toBe("C");
  });

  it("scores an exact match at 1", () => {
    expect(detectChord(pcs("C", "E", "G"))?.score).toBe(1);
  });
});

describe("detectChord on inversions", () => {
  it("names a first inversion as a slash chord", () => {
    expect(detectChord(pcs("C", "E", "G"), { bass: 4 })?.symbol).toBe("C/E");
  });

  it("names a second inversion as a slash chord", () => {
    expect(detectChord(pcs("C", "E", "G"), { bass: 7 })?.symbol).toBe("C/G");
  });

  it("omits the slash when the bass is the root", () => {
    expect(detectChord(pcs("C", "E", "G"), { bass: 0 })?.symbol).toBe("C");
  });

  it("treats the bass as a sounding note even if not listed", () => {
    const match = detectChord([4, 7], { bass: 0 })!;
    expect(match.symbol).toBe("C");
  });
});

describe("detectChord on ambiguous input", () => {
  it("offers both readings of C-E-G-A and ranks the commoner one first", () => {
    // Am7 and C6 are the same four notes. With no bass to go on, the ranking
    // falls back to which spelling is seen more often.
    const matches = detectChords(pcs("C", "E", "G", "A"));
    const symbols = matches.map((m) => m.symbol);
    expect(symbols[0]).toBe("Am7");
    expect(symbols).toContain("C6");
    // Neither reading fits the notes better than the other, and the score says
    // so — the preference is a tiebreak, not a claim about fit.
    expect(matches[0].score).toBe(1);
    expect(matches.find((m) => m.symbol === "C6")!.score).toBe(1);
  });

  it("lets the bass note pick between two equally good readings", () => {
    expect(detectChord(pcs("C", "E", "G", "A"), { bass: 9 })?.symbol).toBe("Am7");
    expect(detectChord(pcs("C", "E", "G", "A"), { bass: 0 })?.symbol).toBe("C6");
    // The bass overrides the default preference without inventing a better fit.
    expect(detectChord(pcs("C", "E", "G", "A"), { bass: 0 })?.score).toBe(1);
  });

  it("names a genuine inversion with a slash", () => {
    // E in the bass is not a chord root here, so the slash notation applies.
    expect(detectChord(pcs("C", "E", "G", "A"), { bass: 4 })?.symbol).toMatch(
      /\/E$/,
    );
  });

  it("names the symmetric diminished 7th consistently", () => {
    const match = detectChord(pcs("C", "D#", "F#", "A"))!;
    expect(match.quality.id).toBe("diminished7");
    expect(match.score).toBe(1);
  });
});

describe("detectChord on partial and messy input", () => {
  it("reports the missing tone of an incomplete voicing", () => {
    // A rootless Cmaj7 shell: E, G, B. It is a real candidate, but a weak one —
    // several complete chords explain these notes better, so it ranks below
    // them rather than being discarded.
    const matches = detectChords(pcs("E", "G", "B"), { limit: 20 });
    const cmaj7 = matches.find((m) => m.symbol === "Cmaj7");
    expect(cmaj7).toBeDefined();
    expect(cmaj7!.missing).toEqual([0]);
    expect(cmaj7!.score).toBeLessThan(1);
    // Em is the complete explanation and should outrank the rootless guess.
    expect(matches[0].symbol).toBe("Em");
  });

  it("penalises notes the chord cannot explain", () => {
    const clean = detectChord(pcs("C", "E", "G"))!;
    const withStranger = detectChords(pcs("C", "E", "G", "C#")).find(
      (m) => m.symbol === "C",
    )!;
    expect(withStranger.extra).toEqual([1]);
    expect(withStranger.score).toBeLessThan(clean.score);
  });

  it("returns nothing for an empty input", () => {
    expect(detectChords([])).toEqual([]);
    expect(detectChord([])).toBeNull();
  });

  it("still answers for a single note", () => {
    const match = detectChord([0])!;
    expect(match.root).toBe(0);
    expect(match.score).toBeGreaterThan(0);
  });

  it("respects the result limit", () => {
    expect(detectChords(pcs("C", "E", "G"), { limit: 3 })).toHaveLength(3);
  });

  it("is deterministic", () => {
    const first = detectChords(pcs("C", "E", "G", "A#")).map((m) => m.symbol);
    const second = detectChords(pcs("A#", "G", "E", "C")).map((m) => m.symbol);
    expect(second).toEqual(first);
  });
});

describe("detectChord round trip", () => {
  it("recovers every quality from its own pitch classes in every key", () => {
    for (const q of CHORD_QUALITIES) {
      for (let root = 0; root < 12; root++) {
        const match = detectChord(chordPitchClasses(root, q))!;
        expect(match.score, `${chordSymbol(root, q)}`).toBe(1);
        // The exact spelling may differ where two qualities share a pitch set
        // (C6 / Am7, and the symmetric dim7 and augmented chords), so assert
        // the sound rather than the name.
        expect(
          [...chordPitchClasses(match.root, match.quality)].sort((a, b) => a - b),
        ).toEqual([...chordPitchClasses(root, q)].sort((a, b) => a - b));
      }
    }
  });
});

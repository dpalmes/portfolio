import { describe, expect, it } from "vitest";
import {
  centsBetween,
  describeFrequency,
  frequencyToMidi,
  midiToFrequency,
  midiToName,
  mod,
  nameToMidi,
  octaveOf,
  pitchClassOf,
} from "./notes";

describe("mod", () => {
  it("returns a non-negative result for negative input", () => {
    expect(mod(-1, 12)).toBe(11);
    expect(mod(-13, 12)).toBe(11);
    expect(mod(0, 12)).toBe(0);
  });
});

describe("midiToFrequency", () => {
  it("anchors on A4 = 440 Hz", () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  it("doubles frequency per octave", () => {
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
    expect(midiToFrequency(57)).toBeCloseTo(220, 6);
  });

  it("matches published values for standard guitar strings", () => {
    // E2 A2 D3 G3 B3 E4
    const expected: Array<[number, number]> = [
      [40, 82.4069],
      [45, 110.0],
      [50, 146.8324],
      [55, 195.9977],
      [59, 246.9417],
      [64, 329.6276],
    ];
    for (const [midi, hz] of expected) {
      expect(midiToFrequency(midi)).toBeCloseTo(hz, 3);
    }
  });

  it("respects a non-standard concert pitch", () => {
    expect(midiToFrequency(69, 432)).toBe(432);
    expect(midiToFrequency(81, 432)).toBeCloseTo(864, 6);
  });
});

describe("frequencyToMidi", () => {
  it("inverts midiToFrequency", () => {
    for (let midi = 21; midi <= 108; midi++) {
      expect(frequencyToMidi(midiToFrequency(midi))).toBeCloseTo(midi, 9);
    }
  });

  it("returns a fractional value between notes", () => {
    const quarterToneAboveA4 = 440 * Math.pow(2, 0.5 / 12);
    expect(frequencyToMidi(quarterToneAboveA4)).toBeCloseTo(69.5, 6);
  });

  it("is NaN for non-positive frequencies", () => {
    expect(frequencyToMidi(0)).toBeNaN();
    expect(frequencyToMidi(-100)).toBeNaN();
  });
});

describe("naming", () => {
  it("uses scientific pitch notation", () => {
    expect(midiToName(60)).toBe("C4");
    expect(midiToName(69)).toBe("A4");
    expect(midiToName(21)).toBe("A0");
    expect(midiToName(108)).toBe("C8");
  });

  it("spells with sharps or flats on request", () => {
    expect(midiToName(61, "sharp")).toBe("C#4");
    expect(midiToName(61, "flat")).toBe("Db4");
  });

  it("computes octave and pitch class", () => {
    expect(octaveOf(60)).toBe(4);
    expect(octaveOf(59)).toBe(3);
    expect(pitchClassOf(60)).toBe(0);
    expect(pitchClassOf(71)).toBe(11);
  });
});

describe("nameToMidi", () => {
  it("round-trips with midiToName", () => {
    for (let midi = 12; midi <= 108; midi++) {
      expect(nameToMidi(midiToName(midi))).toBe(midi);
    }
  });

  it("accepts flats, unicode accidentals and double accidentals", () => {
    expect(nameToMidi("Db4")).toBe(61);
    expect(nameToMidi("C♯4")).toBe(61);
    expect(nameToMidi("B♭3")).toBe(58);
    expect(nameToMidi("C##4")).toBe(62);
    expect(nameToMidi("Cx4")).toBe(62);
  });

  it("is case insensitive and tolerates surrounding space", () => {
    expect(nameToMidi("  a4 ")).toBe(69);
  });

  it("handles negative octaves", () => {
    expect(nameToMidi("C-1")).toBe(0);
  });

  it("returns null for input that is not a note name", () => {
    expect(nameToMidi("H4")).toBeNull();
    expect(nameToMidi("")).toBeNull();
    expect(nameToMidi("C")).toBeNull();
    expect(nameToMidi("4C")).toBeNull();
  });
});

describe("centsBetween", () => {
  it("is 100 cents per semitone", () => {
    expect(centsBetween(midiToFrequency(70), midiToFrequency(69))).toBeCloseTo(
      100,
      6,
    );
  });

  it("is 1200 cents per octave and signed", () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
    expect(centsBetween(220, 440)).toBeCloseTo(-1200, 6);
  });
});

describe("describeFrequency", () => {
  it("reports an exact note with zero deviation", () => {
    const result = describeFrequency(440);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("A4");
    expect(result!.midi).toBe(69);
    expect(result!.cents).toBeCloseTo(0, 9);
    expect(result!.targetFrequency).toBeCloseTo(440, 9);
  });

  it("reports a sharp reading as positive cents", () => {
    const result = describeFrequency(445)!;
    expect(result.name).toBe("A4");
    expect(result.cents).toBeGreaterThan(0);
    expect(result.cents).toBeCloseTo(19.56, 1);
  });

  it("reports a flat reading as negative cents", () => {
    const result = describeFrequency(435)!;
    expect(result.name).toBe("A4");
    expect(result.cents).toBeCloseTo(-19.79, 1);
  });

  it("snaps to the nearer neighbour past the halfway point", () => {
    // 51 cents above A4 belongs to A#4, one cent flat.
    const justOverHalfway = 440 * Math.pow(2, 0.51 / 12);
    const result = describeFrequency(justOverHalfway)!;
    expect(result.name).toBe("A#4");
    expect(result.cents).toBeCloseTo(-49, 0);
  });

  it("keeps cents within half a semitone across the range", () => {
    for (let hz = 70; hz < 1200; hz += 3.7) {
      const result = describeFrequency(hz)!;
      expect(Math.abs(result.cents)).toBeLessThanOrEqual(50.000001);
    }
  });

  it("returns null for unusable input", () => {
    expect(describeFrequency(0)).toBeNull();
    expect(describeFrequency(-1)).toBeNull();
    expect(describeFrequency(Number.NaN)).toBeNull();
    expect(describeFrequency(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

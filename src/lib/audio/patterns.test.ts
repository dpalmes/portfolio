import { describe, expect, it } from "vitest";
import {
  PRESETS,
  STEPS_PER_BAR,
  emptyPattern,
  isActive,
  parseRow,
  toggleStep,
} from "./patterns";
import { DRUMS, type DrumId } from "./voices";

const ALL_IDS = DRUMS.map((drum) => drum.id);

describe("parseRow", () => {
  it("reads x as a hit and everything else as a rest", () => {
    expect(parseRow("x...x...x...x...")).toEqual([
      true, false, false, false,
      true, false, false, false,
      true, false, false, false,
      true, false, false, false,
    ]);
  });

  it("accepts an upper-case X", () => {
    expect(parseRow("X...............")[0]).toBe(true);
  });

  it("ignores spaces and bar lines, so patterns can be written readably", () => {
    expect(parseRow("x... x... x... x...")).toEqual(parseRow("x...x...x...x..."));
    expect(parseRow("x...|x...|x...|x...")).toEqual(parseRow("x...x...x...x..."));
  });

  it("always returns a full bar, padding a short row with rests", () => {
    const row = parseRow("x.x.");
    expect(row).toHaveLength(STEPS_PER_BAR);
    expect(row.slice(4).every((step) => step === false)).toBe(true);
  });

  it("truncates a row that is too long rather than overflowing the bar", () => {
    expect(parseRow("x".repeat(40))).toHaveLength(STEPS_PER_BAR);
  });

  it("handles an empty row", () => {
    expect(parseRow("")).toEqual(new Array(STEPS_PER_BAR).fill(false));
  });
});

describe("presets", () => {
  it("have unique ids and sane tempos", () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(PRESETS.length);
    for (const preset of PRESETS) {
      expect(preset.bpm, preset.id).toBeGreaterThanOrEqual(60);
      expect(preset.bpm, preset.id).toBeLessThanOrEqual(190);
      expect(preset.swing, preset.id).toBeGreaterThanOrEqual(0);
      expect(preset.swing, preset.id).toBeLessThan(1);
    }
  });

  it("only reference drums that exist", () => {
    for (const preset of PRESETS) {
      for (const id of Object.keys(preset.pattern)) {
        expect(ALL_IDS, `${preset.id} references ${id}`).toContain(id as DrumId);
      }
    }
  });

  it("are all exactly one bar long", () => {
    for (const preset of PRESETS) {
      for (const [id, row] of Object.entries(preset.pattern)) {
        expect(row, `${preset.id}/${id}`).toHaveLength(STEPS_PER_BAR);
      }
    }
  });

  it("all actually play something", () => {
    for (const preset of PRESETS) {
      const hits = Object.values(preset.pattern)
        .flat()
        .filter(Boolean).length;
      expect(hits, preset.id).toBeGreaterThan(3);
    }
  });

  it("put a kick on the downbeat, as every one of these styles does", () => {
    for (const preset of PRESETS) {
      expect(preset.pattern.kick?.[0], preset.id).toBe(true);
    }
  });
});

describe("emptyPattern", () => {
  it("creates a silent row for every drum", () => {
    const pattern = emptyPattern(ALL_IDS);
    expect(Object.keys(pattern)).toHaveLength(ALL_IDS.length);
    for (const id of ALL_IDS) {
      expect(pattern[id]).toHaveLength(STEPS_PER_BAR);
      expect(pattern[id]!.some(Boolean)).toBe(false);
    }
  });

  it("does not share row arrays between drums", () => {
    const pattern = emptyPattern(ALL_IDS);
    pattern.kick![0] = true;
    expect(pattern.snare![0]).toBe(false);
  });
});

describe("toggleStep", () => {
  it("flips a step on and back off", () => {
    const start = emptyPattern(ALL_IDS);
    const on = toggleStep(start, "kick", 4);
    expect(isActive(on, "kick", 4)).toBe(true);
    expect(isActive(toggleStep(on, "kick", 4), "kick", 4)).toBe(false);
  });

  it("does not mutate the pattern it was given", () => {
    const start = emptyPattern(ALL_IDS);
    const next = toggleStep(start, "kick", 4);
    expect(isActive(start, "kick", 4)).toBe(false);
    expect(next).not.toBe(start);
    expect(next.kick).not.toBe(start.kick);
  });

  it("leaves every other step and track alone", () => {
    const start = PRESETS[0].pattern;
    const next = toggleStep(start, "snare", 7);

    for (const id of ALL_IDS) {
      for (let step = 0; step < STEPS_PER_BAR; step++) {
        if (id === "snare" && step === 7) continue;
        expect(isActive(next, id, step), `${id}/${step}`).toBe(
          isActive(start, id, step),
        );
      }
    }
  });

  it("can add a track the pattern did not previously contain", () => {
    // Presets only list the drums they use, so toggling a silent track has to
    // create its row rather than fail.
    const preset = PRESETS[0].pattern;
    expect(preset.tom).toBeUndefined();
    const next = toggleStep(preset, "tom", 2);
    expect(isActive(next, "tom", 2)).toBe(true);
    expect(next.tom).toHaveLength(STEPS_PER_BAR);
  });
});

describe("isActive", () => {
  it("is false for a track the pattern does not contain", () => {
    expect(isActive({}, "kick", 0)).toBe(false);
  });

  it("is false outside the bar rather than throwing", () => {
    expect(isActive(PRESETS[0].pattern, "kick", 99)).toBe(false);
    expect(isActive(PRESETS[0].pattern, "kick", -1)).toBe(false);
  });
});

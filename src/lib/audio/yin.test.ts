import { describe, expect, it } from "vitest";
import {
  PitchSmoother,
  cumulativeMeanNormalizedDifference,
  detectPitch,
  parabolicInterpolation,
  rootMeanSquare,
} from "./yin";
import { centsBetween, midiToFrequency } from "../music/notes";

const SAMPLE_RATE = 44100;

/** A pure tone. */
function sine(
  frequency: number,
  length: number,
  sampleRate = SAMPLE_RATE,
  amplitude = 0.5,
  phase = 0,
): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * (i / sampleRate) + phase);
  }
  return buffer;
}

/**
 * A tone built from a fundamental plus harmonics, with per-harmonic gains. The
 * interesting cases are the ones where the fundamental is *weaker* than its
 * harmonics, which is what a real plucked low string looks like and what breaks
 * naive spectral-peak detectors.
 */
function harmonic(
  fundamental: number,
  gains: number[],
  length: number,
  sampleRate = SAMPLE_RATE,
): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;
    gains.forEach((gain, index) => {
      const partial = index + 1;
      // Offset phases so partials do not all start aligned, as in a real tone.
      sample += gain * Math.sin(2 * Math.PI * fundamental * partial * t + partial);
    });
    buffer[i] = sample;
  }
  return buffer;
}

function whiteNoise(length: number, seed = 1, amplitude = 0.5): Float32Array {
  // Deterministic LCG so the test cannot flake.
  let state = seed >>> 0;
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    buffer[i] = ((state / 0xffffffff) * 2 - 1) * amplitude;
  }
  return buffer;
}

function centsError(measured: number | null, expected: number): number {
  expect(measured).not.toBeNull();
  return Math.abs(centsBetween(measured!, expected));
}

describe("rootMeanSquare", () => {
  it("is amplitude/sqrt(2) for a sine", () => {
    expect(rootMeanSquare(sine(440, 4096, SAMPLE_RATE, 1))).toBeCloseTo(
      1 / Math.SQRT2,
      2,
    );
  });

  it("is zero for silence", () => {
    expect(rootMeanSquare(new Float32Array(1024))).toBe(0);
  });
});

describe("cumulativeMeanNormalizedDifference", () => {
  it("starts at 1 by definition", () => {
    const curve = cumulativeMeanNormalizedDifference(sine(440, 4096), 512);
    expect(curve[0]).toBe(1);
  });

  it("dips near zero at the period of a periodic signal", () => {
    const frequency = 220;
    const curve = cumulativeMeanNormalizedDifference(sine(frequency, 4096), 1024);
    const period = Math.round(SAMPLE_RATE / frequency); // 200 samples

    expect(curve[period]).toBeLessThan(0.02);
    // ...and stays high away from multiples of the period.
    expect(curve[Math.round(period * 0.5)]).toBeGreaterThan(0.5);
  });

  it("does not dip for noise", () => {
    const curve = cumulativeMeanNormalizedDifference(whiteNoise(4096), 1024);
    let minimum = Infinity;
    for (let tau = 2; tau < curve.length; tau++) {
      minimum = Math.min(minimum, curve[tau]);
    }
    expect(minimum).toBeGreaterThan(0.3);
  });

  it("returns 1 everywhere for digital silence rather than dividing by zero", () => {
    const curve = cumulativeMeanNormalizedDifference(new Float32Array(2048), 256);
    for (const value of curve) expect(value).toBe(1);
  });
});

describe("parabolicInterpolation", () => {
  it("returns the vertex of a symmetric minimum unchanged", () => {
    const curve = Float32Array.from([1, 0.5, 0.1, 0.5, 1]);
    expect(parabolicInterpolation(curve, 2)).toBeCloseTo(2, 9);
  });

  it("shifts toward the lower neighbour", () => {
    const curve = Float32Array.from([1, 0.3, 0.1, 0.6, 1]);
    expect(parabolicInterpolation(curve, 2)).toBeLessThan(2);
  });

  it("leaves the boundaries alone", () => {
    const curve = Float32Array.from([0.1, 0.5, 1]);
    expect(parabolicInterpolation(curve, 0)).toBe(0);
    expect(parabolicInterpolation(curve, 2)).toBe(2);
  });

  it("declines to move on a flat neighbourhood", () => {
    const curve = Float32Array.from([0.5, 0.5, 0.5]);
    expect(parabolicInterpolation(curve, 1)).toBe(1);
  });
});

describe("detectPitch on pure tones", () => {
  it("is accurate to within a cent across the guitar range", () => {
    // E2 (82 Hz) to E6 (1319 Hz), stepping by semitones.
    for (let midi = 40; midi <= 88; midi++) {
      const frequency = midiToFrequency(midi);
      const result = detectPitch(sine(frequency, 8192), SAMPLE_RATE);
      expect(centsError(result.frequency, frequency)).toBeLessThan(1);
    }
  });

  it("reports high clarity for a clean tone", () => {
    const result = detectPitch(sine(440, 4096), SAMPLE_RATE);
    expect(result.clarity).toBeGreaterThan(0.95);
  });

  it("is insensitive to phase", () => {
    for (const phase of [0, 0.7, 1.9, 3.0, 4.4]) {
      const result = detectPitch(sine(329.63, 8192, SAMPLE_RATE, 0.5, phase), SAMPLE_RATE);
      expect(centsError(result.frequency, 329.63)).toBeLessThan(1);
    }
  });

  it("is insensitive to level above the noise gate", () => {
    for (const amplitude of [0.02, 0.1, 0.5, 0.95]) {
      const result = detectPitch(
        sine(196, 8192, SAMPLE_RATE, amplitude),
        SAMPLE_RATE,
      );
      expect(centsError(result.frequency, 196)).toBeLessThan(1);
    }
  });

  it("works at other sample rates", () => {
    for (const rate of [22050, 48000, 96000]) {
      const result = detectPitch(sine(440, 8192, rate), rate, {});
      expect(centsError(result.frequency, 440)).toBeLessThan(1.5);
    }
  });

  it("beats naive rounding to the nearest sample", () => {
    // A4 at 44.1 kHz has a period of 100.227 samples. Rounding to 100 would
    // report 441 Hz, about 4 cents sharp; interpolation must do far better.
    const result = detectPitch(sine(440, 8192), SAMPLE_RATE);
    expect(centsError(result.frequency, 440)).toBeLessThan(0.5);
    expect(Math.abs(centsBetween(SAMPLE_RATE / 100, 440))).toBeGreaterThan(3);
  });
});

describe("detectPitch on realistic tones", () => {
  it("finds a fundamental that is quieter than its harmonics", () => {
    // The classic octave-error trap: 2nd and 3rd partials dominate.
    const buffer = harmonic(110, [0.15, 0.6, 0.5, 0.3, 0.2, 0.1], 8192);
    const result = detectPitch(buffer, SAMPLE_RATE);
    expect(centsError(result.frequency, 110)).toBeLessThan(2);
  });

  it("finds a missing fundamental", () => {
    // No energy at all at 147 Hz; the ear still hears D3, and so should YIN.
    const buffer = harmonic(146.83, [0, 0.5, 0.4, 0.3, 0.25, 0.2], 8192);
    const result = detectPitch(buffer, SAMPLE_RATE);
    expect(centsError(result.frequency, 146.83)).toBeLessThan(5);
  });

  it("tolerates added noise", () => {
    const tone = sine(220, 8192, SAMPLE_RATE, 0.5);
    const noise = whiteNoise(8192, 7, 0.08);
    const mixed = Float32Array.from(tone, (value, i) => value + noise[i]);
    const result = detectPitch(mixed, SAMPLE_RATE);
    expect(centsError(result.frequency, 220)).toBeLessThan(5);
  });

  it("tolerates a DC offset", () => {
    const buffer = Float32Array.from(sine(220, 8192), (value) => value + 0.3);
    const result = detectPitch(buffer, SAMPLE_RATE);
    expect(centsError(result.frequency, 220)).toBeLessThan(2);
  });
});

describe("detectPitch rejection", () => {
  it("reports silence as unvoiced", () => {
    const result = detectPitch(new Float32Array(4096), SAMPLE_RATE);
    expect(result.frequency).toBeNull();
    expect(result.clarity).toBe(0);
    expect(result.rms).toBe(0);
  });

  it("reports a signal below the noise gate as unvoiced", () => {
    const result = detectPitch(sine(440, 4096, SAMPLE_RATE, 0.001), SAMPLE_RATE);
    expect(result.frequency).toBeNull();
  });

  it("refuses to name a pitch for noise, and says why via clarity", () => {
    const result = detectPitch(whiteNoise(8192), SAMPLE_RATE);
    expect(result.frequency).toBeNull();
    expect(result.clarity).toBeLessThan(0.5);
    // The level was fine — it is the periodicity that failed, and the caller
    // can tell the two apart.
    expect(result.rms).toBeGreaterThan(0.1);
  });

  it("respects the frequency bounds", () => {
    const result = detectPitch(sine(440, 8192), SAMPLE_RATE, {
      minFrequency: 500,
      maxFrequency: 1000,
    });
    expect(result.frequency).toBeNull();
  });

  it("does not dress up a fallback guess as a confident reading", () => {
    // Nothing here crosses the YIN threshold, so the detector falls back to the
    // global minimum. That guess must clear the clarity floor to be returned.
    const noise = whiteNoise(8192, 99);
    expect(detectPitch(noise, SAMPLE_RATE, { fallbackClarity: 0.9 }).frequency)
      .toBeNull();
    // Lowering the floor lets the same guess through, which is the knob a
    // caller wanting maximum sensitivity would reach for.
    expect(detectPitch(noise, SAMPLE_RATE, { fallbackClarity: 0 }).frequency)
      .not.toBeNull();
  });

  it("handles a buffer too short to analyse", () => {
    expect(detectPitch(Float32Array.from([0.5, -0.5]), SAMPLE_RATE).frequency).toBeNull();
    expect(detectPitch(new Float32Array(0), SAMPLE_RATE).frequency).toBeNull();
  });
});

describe("PitchSmoother", () => {
  const reading = (frequency: number | null, clarity = 0.95) => ({
    frequency,
    clarity,
    rms: 0.2,
    tau: frequency === null ? null : SAMPLE_RATE / frequency,
  });

  it("adopts the first confident reading immediately", () => {
    const smoother = new PitchSmoother();
    expect(smoother.push(reading(440))).toBe(440);
  });

  it("converges toward a steady input", () => {
    const smoother = new PitchSmoother(0.3);
    smoother.push(reading(440));
    let value = 440;
    for (let i = 0; i < 40; i++) value = smoother.push(reading(442))!;
    expect(value).toBeCloseTo(442, 3);
  });

  it("moves gradually rather than snapping", () => {
    const smoother = new PitchSmoother(0.25);
    smoother.push(reading(440));
    const next = smoother.push(reading(446))!;
    expect(next).toBeGreaterThan(440);
    expect(next).toBeLessThan(446);
  });

  it("ignores readings below the clarity floor", () => {
    const smoother = new PitchSmoother(0.25, 0.6);
    smoother.push(reading(440));
    smoother.push(reading(880, 0.2));
    expect(smoother.current).toBe(440);
  });

  it("re-seeds instead of sliding when the pitch leaps", () => {
    const smoother = new PitchSmoother(0.25);
    smoother.push(reading(440));
    // An octave jump is a new note (or an octave error), not a glide.
    expect(smoother.push(reading(880))).toBe(880);
  });

  it("drops the reading after sustained silence", () => {
    const smoother = new PitchSmoother(0.25, 0.6, 3);
    smoother.push(reading(440));
    smoother.push(reading(null));
    expect(smoother.current).toBe(440);
    smoother.push(reading(null));
    smoother.push(reading(null));
    expect(smoother.current).toBeNull();
  });

  it("resets on demand", () => {
    const smoother = new PitchSmoother();
    smoother.push(reading(440));
    smoother.reset();
    expect(smoother.current).toBeNull();
  });
});

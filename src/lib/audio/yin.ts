/**
 * Monophonic pitch detection using the YIN algorithm.
 *
 * Reference: A. de Cheveigné and H. Kawahara, "YIN, a fundamental frequency
 * estimator for speech and music", JASA 111 (4), 2002.
 *
 * Why YIN and not an FFT peak? At A2 (110 Hz) the harmonics of a guitar string
 * are often louder than the fundamental, so the tallest spectral peak is
 * frequently the 2nd or 3rd harmonic and a naive detector reports a note an
 * octave or a twelfth too high. YIN works in the time domain on self-similarity
 * instead, and its cumulative-mean normalisation is specifically the step that
 * suppresses those octave errors. The whole thing is also easier to reason
 * about: five clearly separated steps, each testable on its own.
 *
 * This module is deliberately free of Web Audio types. It takes a Float32Array
 * and a sample rate, which is what makes it testable against synthetic signals
 * in Node with no browser involved.
 */

export interface YinOptions {
  /**
   * Threshold on the normalised difference below which a dip counts as a
   * period. Lower is stricter. 0.1-0.15 is the range the paper recommends;
   * plucked strings tolerate slightly higher.
   */
  threshold?: number;
  /** Lowest frequency to look for. Bounds the search, so it also bounds cost. */
  minFrequency?: number;
  /** Highest frequency to look for. */
  maxFrequency?: number;
  /**
   * Signals quieter than this RMS are treated as silence and reported as
   * unvoiced, rather than producing a confident reading of the room tone.
   */
  rmsThreshold?: number;
  /**
   * When no dip crosses `threshold`, the detector falls back to the global
   * minimum. That guess is only returned if its clarity reaches this floor —
   * otherwise the frame is reported unvoiced. Without this, noise and
   * out-of-range input yield a plausible-looking frequency with no periodicity
   * behind it.
   */
  fallbackClarity?: number;
}

export interface PitchResult {
  /** Estimated fundamental in Hz, or null when no pitch was found. */
  frequency: number | null;
  /**
   * 0-1 confidence, defined as 1 - d'(τ) at the chosen lag. Above ~0.9 is a
   * clean sustained note; below ~0.5 is usually noise or a decaying tail.
   */
  clarity: number;
  /** RMS amplitude of the analysed window, 0-1. */
  rms: number;
  /** Lag in samples that produced the estimate, after interpolation. */
  tau: number | null;
}

const UNVOICED: PitchResult = {
  frequency: null,
  clarity: 0,
  rms: 0,
  tau: null,
};

export function rootMeanSquare(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}

/**
 * Steps 1 and 2 of the paper, fused.
 *
 * Step 1 is the squared difference function
 *   d(τ) = Σ (x[j] - x[j+τ])²
 * Step 2 divides it by its running mean
 *   d'(τ) = d(τ) / ((1/τ) Σ_{j=1..τ} d(j))
 *
 * That division is the part that earns its keep. Raw d(τ) always has its global
 * minimum at τ=0 and tends to shrink at long lags, which biases a naive search
 * toward wrong answers; normalising by the running mean flattens that trend and
 * makes a single absolute threshold meaningful across the whole lag range.
 *
 * Exported because it is worth testing directly: the shape of this curve is the
 * algorithm.
 */
export function cumulativeMeanNormalizedDifference(
  buffer: Float32Array,
  maxTau: number,
): Float32Array {
  const result = new Float32Array(maxTau);
  // Half the buffer is the analysis window; the other half supplies the lag.
  const windowSize = Math.floor(buffer.length / 2);

  result[0] = 1;

  let runningSum = 0;
  for (let tau = 1; tau < maxTau; tau++) {
    let difference = 0;
    for (let j = 0; j < windowSize; j++) {
      const delta = buffer[j] - buffer[j + tau];
      difference += delta * delta;
    }
    runningSum += difference;
    // runningSum is never 0 for a real signal, but a digitally silent buffer
    // would divide by zero, so fall back to the "no periodicity" value of 1.
    result[tau] = runningSum === 0 ? 1 : (difference * tau) / runningSum;
  }

  return result;
}

/**
 * Step 3: absolute threshold.
 *
 * Take the *first* dip below the threshold, not the deepest one. The deepest
 * dip is often at twice the true period — a periodic signal is just as
 * self-similar at two periods as at one — so preferring the earliest qualifying
 * dip is what keeps the detector from reporting an octave too low. Having found
 * one, walk down to the bottom of that dip.
 */
function absoluteThreshold(
  curve: Float32Array,
  minTau: number,
  maxTau: number,
  threshold: number,
): number | null {
  for (let tau = minTau; tau < maxTau; tau++) {
    if (curve[tau] >= threshold) continue;
    let best = tau;
    while (best + 1 < maxTau && curve[best + 1] < curve[best]) best += 1;
    // Running off the end of the search window while still descending means
    // the real minimum lies beyond it — see `isBoundaryArtifact`.
    return best === maxTau - 1 && isBoundaryArtifact(curve, best, maxTau)
      ? null
      : best;
  }
  return null;
}

/**
 * True when a candidate lag sits on the edge of the search window with the
 * curve still falling, i.e. the actual minimum is outside the window.
 *
 * This matters whenever `minFrequency` is raised: capping the lag search can
 * cut off the true period, leaving the deepest *reachable* point at the very
 * edge. That point is a fraction of a period, not a period, and reporting it
 * yields a confident-sounding frequency that is simply wrong. Requiring a
 * genuine interior minimum turns that failure into an honest "no pitch".
 */
function isBoundaryArtifact(
  curve: Float32Array,
  tau: number,
  maxTau: number,
): boolean {
  if (tau >= maxTau - 1) {
    return tau > 0 && curve[tau] < curve[tau - 1];
  }
  return false;
}

/**
 * Step 4: parabolic interpolation.
 *
 * The true period is almost never an exact number of samples. At 44.1 kHz the
 * lag for A4 is 100.2 samples, so rounding to 100 puts the reading ~4 cents
 * sharp — visible on a tuner. Fitting a parabola through the minimum and its
 * two neighbours recovers the fractional part and takes that error to well
 * under a cent.
 */
export function parabolicInterpolation(
  curve: Float32Array,
  tau: number,
): number {
  if (tau <= 0 || tau >= curve.length - 1) return tau;

  const previous = curve[tau - 1];
  const current = curve[tau];
  const next = curve[tau + 1];

  const denominator = 2 * (2 * current - next - previous);
  if (denominator === 0) return tau;

  const shift = (next - previous) / denominator;
  // A well-formed minimum shifts by less than half a sample. Anything larger
  // means the neighbours were not a clean parabola; trust the integer lag.
  return Math.abs(shift) > 1 ? tau : tau + shift;
}

/**
 * Estimate the fundamental frequency of a buffer of mono samples.
 *
 * @param buffer Time-domain samples, nominally in [-1, 1].
 * @param sampleRate Samples per second, e.g. 44100.
 */
export function detectPitch(
  buffer: Float32Array,
  sampleRate: number,
  options: YinOptions = {},
): PitchResult {
  const {
    threshold = 0.12,
    minFrequency = 60,
    maxFrequency = 1400,
    rmsThreshold = 0.008,
    fallbackClarity = 0.5,
  } = options;

  const rms = rootMeanSquare(buffer);
  if (rms < rmsThreshold) return { ...UNVOICED, rms };

  const windowSize = Math.floor(buffer.length / 2);
  if (windowSize < 2) return { ...UNVOICED, rms };

  // Long lags need samples on both sides, so the lowest detectable frequency is
  // bounded by the buffer as well as by the caller's floor.
  const maxTau = Math.min(windowSize, Math.floor(sampleRate / minFrequency) + 1);
  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequency));
  if (minTau >= maxTau) return { ...UNVOICED, rms };

  const curve = cumulativeMeanNormalizedDifference(buffer, maxTau);

  const crossing = absoluteThreshold(curve, minTau, maxTau, threshold);

  let tau = crossing;
  if (tau === null) {
    // Nothing crossed the threshold. Rather than give up, fall back to the
    // global minimum — a decaying or quiet note is still worth reporting.
    let best = minTau;
    for (let i = minTau + 1; i < maxTau; i++) {
      if (curve[i] < curve[best]) best = i;
    }
    if (isBoundaryArtifact(curve, best, maxTau)) {
      return { frequency: null, clarity: 0, rms, tau: null };
    }
    tau = best;
  }

  const clarity = Math.max(0, Math.min(1, 1 - curve[tau]));

  // The fallback will always produce *some* lag, even for white noise or for a
  // tone outside the requested range, so it has to justify itself. Without this
  // gate the detector reports a confident-looking frequency backed by no
  // periodicity at all.
  if (crossing === null && clarity < fallbackClarity) {
    return { frequency: null, clarity, rms, tau: null };
  }

  const refinedTau = parabolicInterpolation(curve, tau);
  const frequency = sampleRate / refinedTau;
  if (frequency < minFrequency || frequency > maxFrequency) {
    return { frequency: null, clarity, rms, tau: null };
  }

  return { frequency, clarity, rms, tau: refinedTau };
}

/**
 * Smooths a stream of estimates so a tuner needle settles instead of twitching.
 *
 * Two ideas do the work. Readings are only accepted above a clarity floor, so
 * the noise between notes cannot move the display. Accepted readings are then
 * blended geometrically — in the log-frequency domain, where a fixed weight
 * means a fixed number of cents regardless of register, which is how pitch
 * actually behaves.
 */
export class PitchSmoother {
  private value: number | null = null;
  private misses = 0;

  constructor(
    private readonly weight = 0.25,
    private readonly clarityFloor = 0.6,
    /** Consecutive unusable frames before the reading is dropped. */
    private readonly patience = 6,
  ) {}

  push(result: PitchResult): number | null {
    if (result.frequency === null || result.clarity < this.clarityFloor) {
      this.misses += 1;
      if (this.misses >= this.patience) this.value = null;
      return this.value;
    }

    this.misses = 0;
    if (this.value === null) {
      this.value = result.frequency;
      return this.value;
    }

    // A jump of more than a fifth is far more likely to be an octave error than
    // a real leap, so re-seed rather than sliding through the notes between.
    const ratio = result.frequency / this.value;
    if (ratio > 1.5 || ratio < 1 / 1.5) {
      this.value = result.frequency;
      return this.value;
    }

    this.value = Math.exp(
      Math.log(this.value) * (1 - this.weight) +
        Math.log(result.frequency) * this.weight,
    );
    return this.value;
  }

  reset(): void {
    this.value = null;
    this.misses = 0;
  }

  get current(): number | null {
    return this.value;
  }
}

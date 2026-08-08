/**
 * Sample-accurate step sequencing.
 *
 * The problem this solves: `setInterval` is not a musical clock. It drifts, it
 * is throttled in background tabs, and it is at the mercy of layout and GC — so
 * triggering notes directly from a timer callback produces audible jitter.
 *
 * The fix is the standard two-clock arrangement (Chris Wilson, "A Tale of Two
 * Clocks"): a coarse timer wakes up often enough to look a little way into the
 * future, and every note it finds is handed to the audio clock with an explicit
 * start time. The timer only has to be roughly on time; the audio hardware
 * places the notes exactly. A late wake-up costs nothing as long as it is
 * shorter than the lookahead window.
 *
 * This file holds only the timing arithmetic — no Web Audio, no timers — so it
 * can be driven by a fake clock in tests and asserted to the microsecond.
 */

export interface ScheduledStep {
  /** Step index within the pattern, already wrapped. */
  step: number;
  /** Absolute time on the audio clock, in seconds. */
  time: number;
  /** How many times the pattern has looped since start. */
  bar: number;
}

export interface StepClockOptions {
  bpm?: number;
  /** Steps in one loop of the pattern. 16 is one bar of sixteenth notes. */
  steps?: number;
  /** Steps per beat. 4 means each step is a sixteenth note. */
  stepsPerBeat?: number;
  /**
   * Swing amount, 0-1. Delays every second step by this fraction of the gap to
   * the next one; 0 is straight, ~0.3 is a typical shuffle. A value of 1 would
   * collide with the following step, so it is clamped below that.
   */
  swing?: number;
}

/**
 * Generates step times on demand. It holds no timer of its own: something else
 * calls `collect` periodically and gets back everything due before the horizon.
 */
export class StepClock {
  private bpm: number;
  private stepsValue: number;
  private stepsPerBeat: number;
  private swingValue: number;

  /** Time of the next step that has not been emitted yet. */
  private nextTime = 0;
  private index = 0;
  private running = false;
  /** Steps emitted since `start`, used to derive the bar count. */
  private totalSteps = 0;

  constructor(options: StepClockOptions = {}) {
    const {
      bpm = 120,
      steps = 16,
      stepsPerBeat = 4,
      swing = 0,
    } = options;

    this.bpm = bpm;
    this.stepsValue = steps;
    this.stepsPerBeat = stepsPerBeat;
    this.swingValue = swing;
  }

  /** Duration of one unswung step, in seconds. */
  get stepDuration(): number {
    return 60 / this.bpm / this.stepsPerBeat;
  }

  get steps(): number {
    return this.stepsValue;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Time the next step will fire. Useful for a playhead that must not lag. */
  get nextStepTime(): number {
    return this.nextTime;
  }

  start(atTime: number): void {
    this.running = true;
    this.index = 0;
    this.totalSteps = 0;
    this.nextTime = atTime;
  }

  stop(): void {
    this.running = false;
  }

  /**
   * Tempo can change while running. Because the next step's time is already
   * fixed, the change takes effect from the step after it — which is what makes
   * a tempo slider feel continuous rather than lurching.
   */
  setBpm(bpm: number): void {
    this.bpm = Math.max(20, Math.min(300, bpm));
  }

  setSwing(swing: number): void {
    this.swingValue = Math.max(0, Math.min(0.9, swing));
  }

  setSteps(steps: number): void {
    this.stepsValue = Math.max(1, Math.floor(steps));
    this.index %= this.stepsValue;
  }

  /**
   * Emit every step falling before `currentTime + horizon`, advancing internal
   * state past them.
   *
   * @param currentTime Reading of the audio clock, in seconds.
   * @param horizon How far ahead to schedule. Must exceed the interval between
   *   calls, or steps will be emitted late.
   */
  collect(currentTime: number, horizon: number): ScheduledStep[] {
    if (!this.running) return [];

    const due: ScheduledStep[] = [];
    const limit = currentTime + horizon;

    // Guard against a pathological horizon or a clock that jumped forward, so a
    // single call cannot emit an unbounded number of steps.
    let budget = 512;

    while (this.nextTime < limit && budget-- > 0) {
      due.push({
        step: this.index,
        time: this.nextTime + this.swingOffset(this.index),
        bar: Math.floor(this.totalSteps / this.stepsValue),
      });

      this.nextTime += this.stepDuration;
      this.index = (this.index + 1) % this.stepsValue;
      this.totalSteps += 1;
    }

    return due;
  }

  /**
   * Swing displaces the off-beats only. Note that this shifts the *reported*
   * time without changing the underlying grid, so swing never accumulates drift
   * the way an adjusted step duration would.
   */
  private swingOffset(step: number): number {
    if (this.swingValue === 0) return 0;
    const isOffBeat = step % 2 === 1;
    return isOffBeat ? this.swingValue * this.stepDuration : 0;
  }
}

/**
 * Given a step's scheduled time and the current clock reading, how far through
 * the step are we? Drives a playhead that moves smoothly rather than jumping
 * once per step.
 */
export function stepProgress(
  currentTime: number,
  stepStart: number,
  stepDuration: number,
): number {
  if (stepDuration <= 0) return 0;
  return Math.max(0, Math.min(1, (currentTime - stepStart) / stepDuration));
}

/**
 * Which step is sounding right now, derived from the audio clock rather than
 * from a React state update. Visuals stay locked to the audio even when the
 * main thread stutters.
 */
export function currentStepAt(
  currentTime: number,
  startTime: number,
  stepDuration: number,
  steps: number,
): number {
  if (stepDuration <= 0 || currentTime < startTime) return 0;
  const elapsed = Math.floor((currentTime - startTime) / stepDuration);
  return ((elapsed % steps) + steps) % steps;
}

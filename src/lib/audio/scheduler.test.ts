import { describe, expect, it } from "vitest";
import { StepClock, currentStepAt, stepProgress } from "./scheduler";

/**
 * A stand-in for `AudioContext.currentTime`. Driving the clock by hand is the
 * whole reason the timing logic is separated from Web Audio: every assertion
 * below is exact, with no sleeping and no flakiness.
 */
class FakeClock {
  constructor(public time = 0) {}
  advance(seconds: number) {
    this.time += seconds;
  }
}

describe("StepClock timing", () => {
  it("computes step duration from tempo and subdivision", () => {
    expect(new StepClock({ bpm: 120, stepsPerBeat: 4 }).stepDuration).toBeCloseTo(
      0.125,
      12,
    );
    expect(new StepClock({ bpm: 60, stepsPerBeat: 4 }).stepDuration).toBeCloseTo(
      0.25,
      12,
    );
    expect(new StepClock({ bpm: 120, stepsPerBeat: 1 }).stepDuration).toBeCloseTo(
      0.5,
      12,
    );
  });

  it("emits nothing before it is started", () => {
    const clock = new StepClock();
    expect(clock.collect(0, 1)).toEqual([]);
    expect(clock.isRunning).toBe(false);
  });

  it("emits only steps inside the lookahead horizon", () => {
    const clock = new StepClock({ bpm: 120, stepsPerBeat: 4 }); // 0.125s steps
    clock.start(0);

    // A 0.3s horizon covers steps at 0, 0.125 and 0.25.
    const due = clock.collect(0, 0.3);
    expect(due.map((d) => d.step)).toEqual([0, 1, 2]);
    expect(due.map((d) => d.time)).toEqual([0, 0.125, 0.25]);
  });

  it("does not re-emit steps already collected", () => {
    const clock = new StepClock({ bpm: 120 });
    clock.start(0);
    clock.collect(0, 0.3);
    expect(clock.collect(0, 0.3)).toEqual([]);
  });

  it("keeps perfect time across many calls at an irregular cadence", () => {
    const clock = new StepClock({ bpm: 137, steps: 16, stepsPerBeat: 4 });
    const fake = new FakeClock(0);
    clock.start(0);

    const times: number[] = [];
    // Deliberately ragged wake-ups, as a throttled timer would produce.
    const jitters = [0.02, 0.09, 0.005, 0.15, 0.03, 0.11, 0.001, 0.2];
    for (let i = 0; i < 200; i++) {
      fake.advance(jitters[i % jitters.length]);
      for (const step of clock.collect(fake.time, 0.25)) times.push(step.time);
    }

    const expectedStep = 60 / 137 / 4;
    expect(times.length).toBeGreaterThan(100);
    times.forEach((time, index) => {
      // No accumulated drift, however uneven the polling was.
      expect(time).toBeCloseTo(index * expectedStep, 9);
    });
  });

  it("wraps the step index and counts bars", () => {
    const clock = new StepClock({ bpm: 240, steps: 4, stepsPerBeat: 4 });
    clock.start(0);
    const due = clock.collect(0, 1); // 0.0625s per step -> 16 steps in 1s

    expect(due.slice(0, 4).map((d) => d.step)).toEqual([0, 1, 2, 3]);
    expect(due.slice(4, 8).map((d) => d.step)).toEqual([0, 1, 2, 3]);
    expect(due.slice(0, 4).every((d) => d.bar === 0)).toBe(true);
    expect(due.slice(4, 8).every((d) => d.bar === 1)).toBe(true);
  });

  it("starts at an arbitrary point on the clock", () => {
    const clock = new StepClock({ bpm: 120 });
    clock.start(10.5);
    expect(clock.collect(10.5, 0.13).map((d) => d.time)).toEqual([10.5, 10.625]);
  });

  it("exposes the next step time for a playhead", () => {
    const clock = new StepClock({ bpm: 120 });
    clock.start(0);
    expect(clock.nextStepTime).toBe(0);
    clock.collect(0, 0.13);
    expect(clock.nextStepTime).toBeCloseTo(0.25, 12);
  });

  it("stops emitting after stop()", () => {
    const clock = new StepClock({ bpm: 120 });
    clock.start(0);
    clock.collect(0, 0.13);
    clock.stop();
    expect(clock.collect(1, 1)).toEqual([]);
  });

  it("restarts from step zero", () => {
    const clock = new StepClock({ bpm: 120, steps: 4 });
    clock.start(0);
    clock.collect(0, 0.4);
    clock.start(5);
    expect(clock.collect(5, 0.01)).toEqual([{ step: 0, time: 5, bar: 0 }]);
  });

  it("cannot be made to emit unboundedly by a huge horizon", () => {
    const clock = new StepClock({ bpm: 300, steps: 16 });
    clock.start(0);
    expect(clock.collect(0, 10_000).length).toBeLessThanOrEqual(512);
  });
});

describe("StepClock tempo changes", () => {
  it("applies a new tempo from the following step", () => {
    const clock = new StepClock({ bpm: 120, stepsPerBeat: 4 });
    clock.start(0);
    expect(clock.collect(0, 0.01).map((d) => d.time)).toEqual([0]);

    clock.setBpm(60); // step duration 0.125 -> 0.25
    // The step already queued at 0.125 keeps its time; the one after moves.
    expect(clock.collect(0, 0.2).map((d) => d.time)).toEqual([0.125]);
    expect(clock.collect(0.3, 0.2).map((d) => d.time)).toEqual([0.375]);
  });

  it("clamps tempo to a musically sane range", () => {
    const clock = new StepClock({ bpm: 120 });
    clock.setBpm(5);
    expect(clock.stepDuration).toBeCloseTo(60 / 20 / 4, 12);
    clock.setBpm(10_000);
    expect(clock.stepDuration).toBeCloseTo(60 / 300 / 4, 12);
  });

  it("changes pattern length without losing its place", () => {
    const clock = new StepClock({ bpm: 240, steps: 16, stepsPerBeat: 4 });
    clock.start(0);
    clock.collect(0, 0.4); // consume a few steps
    clock.setSteps(8);
    expect(clock.steps).toBe(8);
    for (const step of clock.collect(0.4, 0.5)) {
      expect(step.step).toBeLessThan(8);
    }
  });
});

describe("StepClock swing", () => {
  it("is straight by default", () => {
    const clock = new StepClock({ bpm: 120, stepsPerBeat: 4 });
    clock.start(0);
    expect(clock.collect(0, 0.3).map((d) => d.time)).toEqual([0, 0.125, 0.25]);
  });

  it("delays the off-beats only", () => {
    const clock = new StepClock({ bpm: 120, stepsPerBeat: 4, swing: 0.5 });
    clock.start(0);
    const times = clock.collect(0, 0.5).map((d) => d.time);

    // On-beats stay on the grid; off-beats move late by half a step.
    expect(times[0]).toBeCloseTo(0, 12);
    expect(times[1]).toBeCloseTo(0.125 + 0.0625, 12);
    expect(times[2]).toBeCloseTo(0.25, 12);
    expect(times[3]).toBeCloseTo(0.375 + 0.0625, 12);
  });

  it("never accumulates drift, because it shifts reported times only", () => {
    const clock = new StepClock({ bpm: 120, stepsPerBeat: 4, swing: 0.6 });
    clock.start(0);
    const times = clock.collect(0, 4).map((d) => d.time);
    const onBeats = times.filter((_, index) => index % 2 === 0);
    onBeats.forEach((time, index) => {
      expect(time).toBeCloseTo(index * 0.25, 9);
    });
  });

  it("clamps swing below a full step so notes cannot collide", () => {
    const clock = new StepClock({ bpm: 120, stepsPerBeat: 4 });
    clock.setSwing(5);
    clock.start(0);
    const times = clock.collect(0, 0.3).map((d) => d.time);
    expect(times[1]).toBeLessThan(times[2]);

    clock.setSwing(-1);
    clock.start(0);
    expect(clock.collect(0, 0.3).map((d) => d.time)).toEqual([0, 0.125, 0.25]);
  });
});

describe("playhead helpers", () => {
  it("reports progress through a step", () => {
    expect(stepProgress(0, 0, 0.125)).toBe(0);
    expect(stepProgress(0.0625, 0, 0.125)).toBeCloseTo(0.5, 12);
    expect(stepProgress(0.125, 0, 0.125)).toBe(1);
  });

  it("clamps progress outside the step", () => {
    expect(stepProgress(-1, 0, 0.125)).toBe(0);
    expect(stepProgress(99, 0, 0.125)).toBe(1);
    expect(stepProgress(1, 0, 0)).toBe(0);
  });

  it("derives the sounding step from the audio clock", () => {
    expect(currentStepAt(0, 0, 0.125, 16)).toBe(0);
    expect(currentStepAt(0.3, 0, 0.125, 16)).toBe(2);
    expect(currentStepAt(2.0, 0, 0.125, 16)).toBe(0); // exactly one loop later
    expect(currentStepAt(2.2, 0, 0.125, 16)).toBe(1);
  });

  it("handles a clock reading before the start time", () => {
    expect(currentStepAt(-5, 0, 0.125, 16)).toBe(0);
    expect(currentStepAt(1, 2, 0.125, 16)).toBe(0);
  });
});

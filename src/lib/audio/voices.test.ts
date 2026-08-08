import { beforeEach, describe, expect, it } from "vitest";
import {
  DRUMS,
  clap,
  hat,
  kick,
  pluck,
  rimshot,
  snare,
  tom,
} from "./voices";
import {
  FakeAudioContext,
  FakeNode,
  asAudioContext,
  asAudioNode,
  type FakeParam,
} from "./fake-audio-context";

const TIME = 2.5;

let fake: FakeAudioContext;
let output: FakeNode;

function voice(velocity = 1) {
  return {
    ctx: asAudioContext(fake),
    destination: asAudioNode(output),
    time: TIME,
    velocity,
  };
}

beforeEach(() => {
  fake = new FakeAudioContext(48000);
  output = new FakeNode();
});

/** Everything a voice creates must end up routed to the destination it was given. */
function expectAllRouted() {
  const sources = [...fake.oscillators, ...fake.bufferSources];
  expect(sources.length).toBeGreaterThan(0);
  for (const source of sources) {
    expect(source.reaches(output)).toBe(true);
  }
}

/** No automation may be written before the requested start time. */
function expectNothingEarly() {
  const params: FakeParam[] = [
    ...fake.gains.map((node) => node.gain),
    ...fake.oscillators.map((node) => node.frequency),
    ...fake.filters.map((node) => node.frequency),
  ];
  for (const param of params) {
    for (const event of param.events) {
      expect(event.time).toBeGreaterThanOrEqual(TIME);
    }
  }
}

describe("kick", () => {
  it("sweeps the pitch down, which is what reads as the beater strike", () => {
    kick(voice());
    const [oscillator] = fake.oscillators;

    expect(fake.oscillators).toHaveLength(1);
    expect(oscillator.type).toBe("sine");

    const [start, end] = oscillator.frequency.events;
    expect(start.value).toBe(150);
    expect(end.value).toBe(48);
    expect(end.time).toBeGreaterThan(start.time);
  });

  it("shapes an envelope that decays rather than cutting off", () => {
    kick(voice());
    const [gain] = fake.gains;
    const events = gain.gain.events;

    // Rises to a peak, then falls back to near-silence.
    expect(events.length).toBeGreaterThanOrEqual(3);
    expect(gain.gain.peakValue).toBeGreaterThan(0.5);
    expect(gain.gain.finalValue).toBeLessThan(0.001);

    // Never ramps exponentially to exactly zero, which is silently ignored by
    // the real API and leaves the note ringing.
    for (const event of events) {
      if (event.type === "exponential") expect(event.value).toBeGreaterThan(0);
    }
  });

  it("scales with velocity", () => {
    kick(voice(1));
    const loud = fake.gains[0].gain.peakValue;

    fake = new FakeAudioContext();
    kick(voice(0.4));
    const soft = fake.gains[0].gain.peakValue;

    expect(soft).toBeLessThan(loud);
  });

  it("stops the oscillator it started", () => {
    kick(voice());
    const [oscillator] = fake.oscillators;
    expect(oscillator.startedAt).toBe(TIME);
    expect(oscillator.stoppedAt).toBeGreaterThan(TIME);
  });

  it("routes to the given destination and schedules nothing early", () => {
    kick(voice());
    expectAllRouted();
    expectNothingEarly();
  });
});

describe("snare", () => {
  it("layers noise over a tuned body", () => {
    snare(voice());
    // One noise source for the snares, one oscillator for the drum body.
    expect(fake.bufferSources).toHaveLength(1);
    expect(fake.oscillators).toHaveLength(1);
  });

  it("band-passes the noise rather than leaving it full-range", () => {
    snare(voice());
    const [filter] = fake.filters;
    expect(filter.type).toBe("bandpass");
    expect(filter.frequency.value).toBeGreaterThan(1000);
  });

  it("routes both layers to the destination", () => {
    snare(voice());
    expectAllRouted();
    expectNothingEarly();
  });
});

describe("hats", () => {
  it("high-passes noise, with no oscillator involved", () => {
    hat(voice());
    expect(fake.oscillators).toHaveLength(0);
    expect(fake.bufferSources).toHaveLength(1);
    expect(fake.filters[0].type).toBe("highpass");
    expect(fake.filters[0].frequency.value).toBeGreaterThan(5000);
  });

  it("differs between open and closed only in envelope length", () => {
    hat(voice(), false);
    const closedEnd = fake.gains[0].gain.events.at(-1)!.time;
    const closedFilter = fake.filters[0].frequency.value;

    fake = new FakeAudioContext();
    hat(voice(), true);
    const openEnd = fake.gains[0].gain.events.at(-1)!.time;
    const openFilter = fake.filters[0].frequency.value;

    expect(openEnd).toBeGreaterThan(closedEnd);
    expect(openFilter).toBe(closedFilter);
  });

  it("routes to the destination", () => {
    hat(voice(), true);
    expectAllRouted();
    expectNothingEarly();
  });
});

describe("clap", () => {
  it("is several bursts offset in time, not one envelope", () => {
    clap(voice());
    // Three fast bursts plus a longer tail.
    expect(fake.bufferSources).toHaveLength(4);

    const starts = fake.bufferSources
      .map((source) => source.startedAt!)
      .sort((a, b) => a - b);
    expect(new Set(starts).size).toBeGreaterThan(1);
    // The bursts are milliseconds apart, not tens of milliseconds.
    expect(starts.at(-1)! - starts[0]).toBeLessThan(0.06);
  });

  it("shares one band-pass across the bursts", () => {
    clap(voice());
    expect(fake.filters).toHaveLength(1);
    expect(fake.filters[0].type).toBe("bandpass");
  });

  it("routes every burst to the destination", () => {
    clap(voice());
    expectAllRouted();
    expectNothingEarly();
  });
});

describe("tom and rimshot", () => {
  it("pitches the tom where asked and sweeps down", () => {
    tom(voice(), 220);
    const [oscillator] = fake.oscillators;
    expect(oscillator.frequency.events[0].value).toBe(220);
    expect(oscillator.frequency.events.at(-1)!.value).toBeLessThan(220);
  });

  it("gives the rimshot a short, filtered click", () => {
    rimshot(voice());
    const [oscillator] = fake.oscillators;
    const [gain] = fake.gains;
    expect(oscillator.type).toBe("square");
    expect(fake.filters[0].type).toBe("bandpass");
    // Very short: the whole envelope is done well inside 100 ms.
    expect(gain.gain.events.at(-1)!.time - TIME).toBeLessThan(0.1);
  });

  it("routes to the destination", () => {
    tom(voice());
    expectAllRouted();
    expectNothingEarly();
  });
});

describe("pluck", () => {
  it("detunes two sawtooths against each other", () => {
    pluck(voice(), 440);
    expect(fake.oscillators).toHaveLength(2);
    for (const oscillator of fake.oscillators) {
      expect(oscillator.type).toBe("sawtooth");
      expect(oscillator.frequency.value).toBe(440);
    }
    const detunes = fake.oscillators.map((o) => o.detune.value);
    expect(detunes[0]).not.toBe(detunes[1]);
  });

  it("closes the filter as the note decays, so harmonics die first", () => {
    pluck(voice(), 220);
    const [filter] = fake.filters;
    expect(filter.type).toBe("lowpass");

    const [open, closed] = filter.frequency.events;
    expect(open.value).toBeGreaterThan(closed.value);
    expect(closed.time).toBeGreaterThan(open.time);
  });

  it("keeps the filter above the fundamental even for high notes", () => {
    // A cutoff below the fundamental would silence the note entirely.
    for (const frequency of [82.41, 220, 440, 1318.51]) {
      fake = new FakeAudioContext();
      pluck(voice(), frequency);
      for (const event of fake.filters[0].frequency.events) {
        expect(event.value).toBeGreaterThan(frequency);
      }
    }
  });

  it("respects the requested duration", () => {
    pluck(voice(), 440, 3);
    const [gain] = fake.gains;
    expect(gain.gain.events.at(-1)!.time).toBeCloseTo(TIME + 3, 6);
  });

  it("routes both oscillators to the destination", () => {
    pluck(voice(), 440);
    expectAllRouted();
    expectNothingEarly();
  });
});

describe("the drum kit", () => {
  it("exposes unique ids and labels", () => {
    expect(new Set(DRUMS.map((drum) => drum.id)).size).toBe(DRUMS.length);
    expect(new Set(DRUMS.map((drum) => drum.short)).size).toBe(DRUMS.length);
  });

  it("makes every voice produce a routed, non-silent hit", () => {
    for (const drum of DRUMS) {
      fake = new FakeAudioContext();
      output = new FakeNode();
      drum.trigger(voice());

      expect(
        fake.oscillators.length + fake.bufferSources.length,
        `${drum.id} produced no sound source`,
      ).toBeGreaterThan(0);

      for (const gain of fake.gains) {
        expect(gain.gain.peakValue, `${drum.id} envelope`).toBeGreaterThan(0.01);
      }

      expectAllRouted();
      expectNothingEarly();
    }
  });
});

/**
 * A recording stand-in for the Web Audio API, used by the voice tests.
 *
 * Web Audio produces sound, which is not something a unit test can assert on.
 * What a test *can* assert is the graph and the schedule: which nodes were
 * created, how they were wired, and what automation was written onto each
 * parameter at what time. That is where the bugs live — an envelope that ramps
 * to zero, a filter that never opens, a note scheduled in the past.
 *
 * Only the surface the voices actually touch is implemented. This is a test
 * double, not a polyfill.
 */

export interface AutomationEvent {
  type: "set" | "exponential" | "linear" | "target";
  value: number;
  time: number;
}

export class FakeParam {
  readonly events: AutomationEvent[] = [];
  value = 0;

  setValueAtTime(value: number, time: number): this {
    this.events.push({ type: "set", value, time });
    return this;
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    this.events.push({ type: "exponential", value, time });
    return this;
  }

  linearRampToValueAtTime(value: number, time: number): this {
    this.events.push({ type: "linear", value, time });
    return this;
  }

  setTargetAtTime(value: number, time: number): this {
    this.events.push({ type: "target", value, time });
    return this;
  }

  /** Last value the parameter was told to reach. */
  get finalValue(): number | undefined {
    return this.events.at(-1)?.value;
  }

  get peakValue(): number {
    return this.events.reduce((max, event) => Math.max(max, event.value), 0);
  }
}

export class FakeNode {
  readonly outputs: FakeNode[] = [];

  connect<T extends FakeNode>(target: T): T {
    this.outputs.push(target);
    return target;
  }

  disconnect(): void {
    this.outputs.length = 0;
  }

  /** Whether a path exists from this node to `target`. */
  reaches(target: FakeNode): boolean {
    const seen = new Set<FakeNode>();
    const stack: FakeNode[] = [this];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node === target) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push(...node.outputs);
    }
    return false;
  }
}

export class FakeOscillator extends FakeNode {
  type = "sine";
  readonly frequency = new FakeParam();
  readonly detune = new FakeParam();
  startedAt: number | null = null;
  stoppedAt: number | null = null;

  start(time: number): void {
    this.startedAt = time;
  }

  stop(time: number): void {
    this.stoppedAt = time;
  }
}

export class FakeGain extends FakeNode {
  readonly gain = new FakeParam();
}

export class FakeBiquadFilter extends FakeNode {
  type = "lowpass";
  readonly frequency = new FakeParam();
  readonly Q = new FakeParam();
}

export class FakeBufferSource extends FakeNode {
  buffer: FakeBuffer | null = null;
  loop = false;
  startedAt: number | null = null;
  startOffset: number | null = null;
  stoppedAt: number | null = null;

  start(time: number, offset?: number): void {
    this.startedAt = time;
    this.startOffset = offset ?? 0;
  }

  stop(time: number): void {
    this.stoppedAt = time;
  }
}

export class FakeBuffer {
  readonly duration: number;
  private readonly data: Float32Array;

  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.duration = length / sampleRate;
    this.data = new Float32Array(length);
  }

  getChannelData(): Float32Array {
    return this.data;
  }
}

export class FakeAudioContext {
  currentTime = 0;
  readonly destination = new FakeNode();

  readonly oscillators: FakeOscillator[] = [];
  readonly gains: FakeGain[] = [];
  readonly filters: FakeBiquadFilter[] = [];
  readonly bufferSources: FakeBufferSource[] = [];

  constructor(readonly sampleRate = 48000) {}

  createOscillator(): FakeOscillator {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node;
  }

  createGain(): FakeGain {
    const node = new FakeGain();
    this.gains.push(node);
    return node;
  }

  createBiquadFilter(): FakeBiquadFilter {
    const node = new FakeBiquadFilter();
    this.filters.push(node);
    return node;
  }

  createBufferSource(): FakeBufferSource {
    const node = new FakeBufferSource();
    this.bufferSources.push(node);
    return node;
  }

  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    return new FakeBuffer(channels, length, sampleRate);
  }
}

/**
 * The voices are typed against the real API. Casting in one place here keeps
 * the assertion `as unknown as` out of every test.
 */
export function asAudioContext(fake: FakeAudioContext): AudioContext {
  return fake as unknown as AudioContext;
}

export function asAudioNode(fake: FakeNode): AudioNode {
  return fake as unknown as AudioNode;
}

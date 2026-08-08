/**
 * A timer that keeps running when the tab is in the background.
 *
 * The two-clock scheduler only works while something wakes it up more often
 * than its lookahead window is long. `setInterval` on the main thread does not
 * qualify: browsers clamp background timers to roughly one second, so a hidden
 * tab would starve the scheduler and the pattern would stutter or stop.
 *
 * Timers inside a dedicated worker are not clamped that way, so the interval
 * lives there and posts a message back. The worker does no work beyond
 * counting — all scheduling stays on the main thread, where the AudioContext
 * is.
 *
 * The worker is built from a blob rather than a separate file so it needs no
 * extra network request and survives static export unchanged.
 */

const WORKER_SOURCE = `
let timer = null;
self.onmessage = (event) => {
  const data = event.data || {};
  if (data.type === "start") {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(() => self.postMessage("tick"), data.interval);
  } else if (data.type === "stop") {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }
};
`;

export interface Ticker {
  start(intervalMs: number, onTick: () => void): void;
  stop(): void;
  dispose(): void;
  /** Whether the background-safe path is in use. Surfaced in the UI. */
  readonly usesWorker: boolean;
}

class WorkerTicker implements Ticker {
  readonly usesWorker = true;
  private readonly worker: Worker;
  private readonly url: string;
  private onTick: (() => void) | null = null;

  constructor() {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    this.url = URL.createObjectURL(blob);
    this.worker = new Worker(this.url);
    this.worker.onmessage = () => this.onTick?.();
  }

  start(intervalMs: number, onTick: () => void): void {
    this.onTick = onTick;
    this.worker.postMessage({ type: "start", interval: intervalMs });
  }

  stop(): void {
    this.worker.postMessage({ type: "stop" });
    this.onTick = null;
  }

  dispose(): void {
    this.stop();
    this.worker.terminate();
    URL.revokeObjectURL(this.url);
  }
}

class IntervalTicker implements Ticker {
  readonly usesWorker = false;
  private handle: number | null = null;

  start(intervalMs: number, onTick: () => void): void {
    this.stop();
    this.handle = window.setInterval(onTick, intervalMs);
  }

  stop(): void {
    if (this.handle !== null) {
      window.clearInterval(this.handle);
      this.handle = null;
    }
  }

  dispose(): void {
    this.stop();
  }
}

export function createTicker(): Ticker {
  // Workers are blocked outright by some strict content security policies, and
  // constructing one from a blob URL is exactly the case such policies target.
  // Falling back keeps the sequencer working in the foreground rather than
  // failing outright.
  if (typeof Worker !== "undefined") {
    try {
      return new WorkerTicker();
    } catch {
      return new IntervalTicker();
    }
  }
  return new IntervalTicker();
}

/**
 * AudioContext lifecycle.
 *
 * Browsers refuse to start audio without a user gesture, and a context created
 * before one arrives is born suspended. Rather than scatter `resume()` calls
 * through the components, everything goes through here: one lazily created
 * context per page, resumed on demand.
 */

let context: AudioContext | null = null;

type AudioContextConstructor = typeof AudioContext;

function getConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext ??
    null
  );
}

export function isAudioSupported(): boolean {
  return getConstructor() !== null;
}

/**
 * Returns the shared context, creating it on first call. Must be called from a
 * user gesture the first time, or the context will exist but stay suspended.
 */
export async function getAudioContext(): Promise<AudioContext> {
  const Constructor = getConstructor();
  if (!Constructor) throw new Error("Web Audio is not available in this browser");

  if (!context) context = new Constructor();
  // Safari in particular suspends the context when a tab is backgrounded, so
  // this is not only a first-run concern.
  if (context.state === "suspended") await context.resume();

  return context;
}

/** The context if one already exists, without creating or resuming it. */
export function peekAudioContext(): AudioContext | null {
  return context;
}

/**
 * Shared noise source.
 *
 * Every percussive voice needs noise, and generating two seconds of it costs
 * enough to be worth doing once. The buffer is looped and re-read at random
 * offsets so repeated hits do not sound identical.
 */
let noiseBuffer: AudioBuffer | null = null;

export function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;

  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  noiseBuffer = buffer;
  return buffer;
}

/**
 * Releases the shared context. Used when a demo unmounts, so a page with audio
 * on it does not hold the device open indefinitely.
 */
export async function closeAudioContext(): Promise<void> {
  if (!context) return;
  const closing = context;
  context = null;
  noiseBuffer = null;
  if (closing.state !== "closed") await closing.close();
}

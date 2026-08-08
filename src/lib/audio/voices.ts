/**
 * Synthesised percussion and tones.
 *
 * No samples. Every sound here is built from oscillators, filtered noise and
 * envelopes, which is a real constraint with two payoffs: the page loads with
 * nothing to fetch, and every parameter of every drum stays open to the
 * interface instead of being baked into a file.
 *
 * All voices are fire-and-forget: they create their nodes, schedule an
 * envelope, and stop themselves. Web Audio garbage-collects a node once it has
 * finished and nothing references it, so there is no cleanup to track.
 */

import { getNoiseBuffer } from "./engine";

export interface VoiceContext {
  ctx: AudioContext;
  destination: AudioNode;
  /** Absolute time on the audio clock at which the hit should sound. */
  time: number;
  /** 0-1. */
  velocity?: number;
}

/**
 * Exponential decay to near-silence.
 *
 * `exponentialRampToValueAtTime` cannot ramp to zero, so the target is a small
 * epsilon followed by a hard stop. Using an exponential rather than a linear
 * ramp matters: amplitude is perceived roughly logarithmically, so a linear
 * fade sounds like it hangs and then vanishes.
 */
function decay(
  gain: GainNode,
  time: number,
  peak: number,
  seconds: number,
  attack = 0.001,
): void {
  const parameter = gain.gain;
  parameter.setValueAtTime(0.0001, time);
  parameter.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
  parameter.exponentialRampToValueAtTime(0.0001, time + attack + seconds);
}

function noiseSource(ctx: AudioContext, time: number, duration: number) {
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);
  source.loop = true;
  // Random offset so consecutive hits are not bit-identical.
  const offset = Math.random() * (source.buffer.duration - duration - 0.01);
  source.start(time, Math.max(0, offset));
  source.stop(time + duration + 0.02);
  return source;
}

export function kick({ ctx, destination, time, velocity = 1 }: VoiceContext): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  // The pitch drop is what the ear reads as the beater hitting the skin; a
  // steady 50 Hz sine just sounds like a hum.
  oscillator.frequency.setValueAtTime(150, time);
  oscillator.frequency.exponentialRampToValueAtTime(48, time + 0.11);

  decay(gain, time, 0.9 * velocity, 0.4);

  oscillator.connect(gain).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + 0.5);
}

export function snare({ ctx, destination, time, velocity = 1 }: VoiceContext): void {
  // Two layers: a noise "rattle" for the snares, and a short tone for the body
  // of the drum. Either alone sounds wrong.
  const noise = noiseSource(ctx, time, 0.2);
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 1800;
  noiseFilter.Q.value = 0.7;

  const noiseGain = ctx.createGain();
  decay(noiseGain, time, 0.55 * velocity, 0.18);
  noise.connect(noiseFilter).connect(noiseGain).connect(destination);

  const body = ctx.createOscillator();
  body.type = "triangle";
  body.frequency.setValueAtTime(190, time);
  body.frequency.exponentialRampToValueAtTime(120, time + 0.1);

  const bodyGain = ctx.createGain();
  decay(bodyGain, time, 0.35 * velocity, 0.11);
  body.connect(bodyGain).connect(destination);
  body.start(time);
  body.stop(time + 0.25);
}

export function hat(
  { ctx, destination, time, velocity = 1 }: VoiceContext,
  open = false,
): void {
  // Closed and open hats differ only in how long the envelope runs — which is
  // very nearly true of the real instrument.
  const duration = open ? 0.32 : 0.055;
  const noise = noiseSource(ctx, time, duration + 0.05);

  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 7800;

  const gain = ctx.createGain();
  decay(gain, time, (open ? 0.3 : 0.34) * velocity, duration);

  noise.connect(highpass).connect(gain).connect(destination);
}

export function clap({ ctx, destination, time, velocity = 1 }: VoiceContext): void {
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1100;
  filter.Q.value = 1.2;
  filter.connect(destination);

  // A clap is several hands slightly out of sync. Three fast bursts plus a
  // longer tail is the standard trick, and it is much more convincing than one
  // envelope.
  const offsets = [0, 0.011, 0.023];
  for (const offset of offsets) {
    const gain = ctx.createGain();
    decay(gain, time + offset, 0.4 * velocity, 0.035);
    noiseSource(ctx, time + offset, 0.06).connect(gain).connect(filter);
  }

  const tail = ctx.createGain();
  decay(tail, time + 0.03, 0.3 * velocity, 0.2);
  noiseSource(ctx, time + 0.03, 0.25).connect(tail).connect(filter);
}

export function tom(
  { ctx, destination, time, velocity = 1 }: VoiceContext,
  frequency = 160,
): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, time + 0.25);

  const gain = ctx.createGain();
  decay(gain, time, 0.6 * velocity, 0.32);

  oscillator.connect(gain).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + 0.45);
}

export function rimshot({ ctx, destination, time, velocity = 1 }: VoiceContext): void {
  const oscillator = ctx.createOscillator();
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(420, time);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 3;

  const gain = ctx.createGain();
  decay(gain, time, 0.35 * velocity, 0.05);

  oscillator.connect(filter).connect(gain).connect(destination);
  oscillator.start(time);
  oscillator.stop(time + 0.1);
}

export type DrumId = "kick" | "snare" | "clap" | "hatClosed" | "hatOpen" | "tom" | "rim";

export interface DrumDefinition {
  id: DrumId;
  label: string;
  /** Short label for the compact grid on narrow screens. */
  short: string;
  trigger: (voice: VoiceContext) => void;
}

export const DRUMS: readonly DrumDefinition[] = [
  { id: "kick", label: "Kick", short: "BD", trigger: kick },
  { id: "snare", label: "Snare", short: "SD", trigger: snare },
  { id: "clap", label: "Clap", short: "CP", trigger: clap },
  {
    id: "hatClosed",
    label: "Closed hat",
    short: "CH",
    trigger: (voice) => hat(voice, false),
  },
  {
    id: "hatOpen",
    label: "Open hat",
    short: "OH",
    trigger: (voice) => hat(voice, true),
  },
  { id: "tom", label: "Tom", short: "TM", trigger: (voice) => tom(voice, 180) },
  { id: "rim", label: "Rim", short: "RS", trigger: rimshot },
];

/**
 * A plucked-string tone, used by the fretboard to play chords.
 *
 * Two detuned sawtooths through a lowpass that closes as the note decays —
 * a crude but recognisable model of a string, where the high harmonics die
 * away faster than the fundamental.
 */
export function pluck(
  { ctx, destination, time, velocity = 1 }: VoiceContext,
  frequency: number,
  duration = 1.6,
): void {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(0.16 * velocity, time + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(frequency * 9, 9000), time);
  filter.frequency.exponentialRampToValueAtTime(
    Math.max(frequency * 2, 220),
    time + duration * 0.7,
  );
  filter.Q.value = 0.6;

  for (const detune of [-4, 4]) {
    const oscillator = ctx.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    oscillator.connect(filter);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.05);
  }

  filter.connect(gain).connect(destination);
}

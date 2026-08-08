"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { closeAudioContext } from "@/lib/audio/engine";
import {
  MicrophoneError,
  startMicrophone,
  type MicrophoneSession,
} from "@/lib/audio/mic";
import { PitchSmoother, detectPitch } from "@/lib/audio/yin";
import { TUNINGS } from "@/lib/music/fretboard";
import {
  DEFAULT_A4,
  describeFrequency,
  midiToName,
  type DetectedPitch,
} from "@/lib/music/notes";

/** Within this many cents counts as in tune. */
const IN_TUNE_CENTS = 5;

interface Reading {
  pitch: DetectedPitch;
  frequency: number;
  clarity: number;
}

export function Tuner() {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reading, setReading] = useState<Reading | null>(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [a4, setA4] = useState(DEFAULT_A4);
  const [tuningId, setTuningId] = useState("standard");

  const sessionRef = useRef<MicrophoneSession | null>(null);
  const frameRef = useRef<number | null>(null);
  const smootherRef = useRef(new PitchSmoother());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Read inside the animation loop, which must not be torn down and rebuilt
  // every time the reference pitch changes. Synced on commit rather than during
  // render, which is not safe under concurrent rendering.
  const a4Ref = useRef(a4);
  useEffect(() => {
    a4Ref.current = a4;
  }, [a4]);

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    sessionRef.current?.stop();
    sessionRef.current = null;
    smootherRef.current.reset();
    setListening(false);
    setReading(null);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      const session = await startMicrophone();
      sessionRef.current = session;
      smootherRef.current.reset();
      setListening(true);

      const loop = () => {
        const current = sessionRef.current;
        if (!current) return;

        current.analyser.getFloatTimeDomainData(current.buffer);
        const result = detectPitch(current.buffer, current.context.sampleRate, {
          // A guitar's lowest note is E2 at 82 Hz; a little headroom below that
          // keeps a slack low string detectable without opening the search up
          // to mains hum.
          minFrequency: 65,
          maxFrequency: 1200,
        });

        const smoothed = smootherRef.current.push(result);
        setLevel(result.rms);
        setReading(
          smoothed === null
            ? null
            : {
                pitch: describeFrequency(smoothed, { a4: a4Ref.current })!,
                frequency: smoothed,
                clarity: result.clarity,
              },
        );

        drawScope(canvasRef.current, current.buffer);
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    } catch (cause) {
      setError(
        cause instanceof MicrophoneError
          ? cause.message
          : "Could not start the microphone.",
      );
      stop();
    } finally {
      setStarting(false);
    }
  }, [stop]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      sessionRef.current?.stop();
      sessionRef.current = null;
      void closeAudioContext();
    };
  }, []);

  const tuning = TUNINGS.find((item) => item.id === tuningId) ?? TUNINGS[0];
  const cents = reading?.pitch.cents ?? 0;
  const inTune = reading !== null && Math.abs(cents) <= IN_TUNE_CENTS;

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4 sm:p-5">
        <Button
          onClick={() => (listening ? stop() : void start())}
          disabled={starting}
          aria-pressed={listening}
          className="min-w-40"
        >
          {starting
            ? "Starting…"
            : listening
              ? "Stop listening"
              : "Start listening"}
        </Button>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
              Tuning
            </span>
            <select
              value={tuningId}
              onChange={(event) => setTuningId(event.target.value)}
              className="rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              {TUNINGS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
              A4
            </span>
            <input
              type="number"
              min={415}
              max={465}
              step={1}
              value={a4}
              onChange={(event) => setA4(Number(event.target.value) || DEFAULT_A4)}
              className="tabular w-20 rounded border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <CentsMeter cents={cents} active={reading !== null} inTune={inTune} />

          <div className="mt-8 flex items-end justify-between gap-6">
            <div>
              {/*
                Only the note name is announced. A live region that updated with
                the frequency would fire continuously and make a screen reader
                unusable; the name changes at most a few times per second and is
                the part that matters.
              */}
              <p
                aria-live="polite"
                aria-atomic="true"
                className={`font-display text-6xl leading-none font-semibold transition-colors sm:text-7xl ${
                  reading === null
                    ? "text-ink-faint"
                    : inTune
                      ? "text-good"
                      : "text-ink"
                }`}
              >
                {reading ? reading.pitch.name : "—"}
              </p>
              <p className="mt-3 text-sm text-ink-muted">
                {reading
                  ? inTune
                    ? "In tune"
                    : cents > 0
                      ? "Sharp — tune down"
                      : "Flat — tune up"
                  : listening
                    ? "Listening — play a note"
                    : "Not listening"}
              </p>
            </div>

            <dl className="space-y-2 text-right">
              <Readout
                label="Frequency"
                value={reading ? `${reading.frequency.toFixed(2)} Hz` : "—"}
              />
              <Readout
                label="Deviation"
                value={
                  reading
                    ? `${cents > 0 ? "+" : ""}${cents.toFixed(1)} ¢`
                    : "—"
                }
              />
              <Readout
                label="Clarity"
                value={reading ? `${Math.round(reading.clarity * 100)}%` : "—"}
              />
            </dl>
          </div>

          <div className="mt-8">
            <canvas
              ref={canvasRef}
              width={900}
              height={110}
              aria-hidden="true"
              className="h-[70px] w-full rounded border border-line bg-raised/40"
            />
            <LevelBar level={level} />
          </div>
        </div>

        <StringGuide
          tuning={tuning}
          a4={a4}
          detectedMidi={reading?.pitch.midi ?? null}
        />
      </div>

      {error ? (
        <p role="alert" className="border-t border-line px-5 py-3 text-sm text-bad">
          {error}
        </p>
      ) : (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
          Audio is analysed in the page and never leaves your device. Headphones
          recommended, so the speakers do not feed the microphone.
        </p>
      )}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-end gap-3">
      <dt className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="tabular w-28 text-sm text-ink">{value}</dd>
    </div>
  );
}

/**
 * The cents meter. The scale is linear from -50 to +50 cents, which is exactly
 * one semitone wide — so the needle hitting an end means the next note begins.
 */
function CentsMeter({
  cents,
  active,
  inTune,
}: {
  cents: number;
  active: boolean;
  inTune: boolean;
}) {
  const clamped = Math.max(-50, Math.min(50, cents));
  const position = 50 + clamped; // 0-100

  return (
    <div
      role="meter"
      aria-valuemin={-50}
      aria-valuemax={50}
      aria-valuenow={active ? Math.round(cents) : 0}
      aria-label="Deviation in cents"
      className="relative h-24 select-none"
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line" />

      {/* The in-tune window, drawn to scale rather than as a fixed pixel band. */}
      <div
        aria-hidden="true"
        className={`absolute top-1/2 h-12 -translate-y-1/2 rounded-sm border-x transition-colors ${
          inTune ? "border-good bg-good/12" : "border-line bg-transparent"
        }`}
        style={{
          left: `${50 - IN_TUNE_CENTS}%`,
          width: `${IN_TUNE_CENTS * 2}%`,
        }}
      />

      {[-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50].map((tick) => (
        <div
          key={tick}
          aria-hidden="true"
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${50 + tick}%` }}
        >
          <div
            className={`mx-auto w-px ${
              tick === 0 ? "h-14 bg-ink-muted" : "h-6 bg-line"
            }`}
          />
          {tick % 20 === 0 ? (
            <span className="absolute top-9 left-1/2 -translate-x-1/2 font-mono text-[10px] text-ink-faint">
              {tick > 0 ? `+${tick}` : tick}
            </span>
          ) : null}
        </div>
      ))}

      <div
        aria-hidden="true"
        className={`absolute top-1/2 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded transition-all duration-100 ease-out ${
          active ? (inTune ? "h-20 bg-good" : "h-20 bg-accent") : "h-0 bg-transparent"
        }`}
        style={{ left: `${position}%` }}
      />
    </div>
  );
}

function LevelBar({ level }: { level: number }) {
  // RMS is small even for a loud signal, so the bar is scaled to a useful range
  // rather than to full scale.
  const percent = Math.min(100, Math.round(level * 320));
  return (
    <div className="mt-3 flex items-center gap-3">
      <span className="font-mono text-[10px] tracking-[0.12em] text-ink-faint uppercase">
        Input
      </span>
      <div className="h-1 flex-1 overflow-hidden rounded bg-raised">
        <div
          className="h-full rounded bg-accent transition-[width] duration-75"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Which string you are closest to, and how far off. Turns the chromatic reading
 * into the answer a guitarist actually wants.
 */
function StringGuide({
  tuning,
  a4,
  detectedMidi,
}: {
  tuning: (typeof TUNINGS)[number];
  a4: number;
  detectedMidi: number | null;
}) {
  return (
    <div className="rounded-lg border border-line bg-raised/40 p-5">
      <h2 className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
        {tuning.name}
      </h2>
      <ol className="mt-4 space-y-1">
        {[...tuning.strings]
          .map((midi, index) => ({ midi, index }))
          .reverse()
          .map(({ midi, index }) => {
            const isTarget = detectedMidi === midi;
            return (
              <li
                key={`${midi}-${index}`}
                className={`flex items-center justify-between rounded px-3 py-2 transition-colors ${
                  isTarget ? "bg-accent-soft text-accent" : "text-ink-muted"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-ink-faint">
                    {index + 1}
                  </span>
                  <span className="font-display text-lg font-semibold">
                    {midiToName(midi)}
                  </span>
                </span>
                <span className="tabular text-xs">
                  {(a4 * Math.pow(2, (midi - 69) / 12)).toFixed(1)} Hz
                </span>
              </li>
            );
          })}
      </ol>
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        Strings are listed highest first, as they sit under your hand. The row
        lights when the detected note matches.
      </p>
    </div>
  );
}

/**
 * A plain oscilloscope of the analysed buffer. It exists to make it obvious the
 * page is really listening — a silent number that occasionally changes is much
 * harder to trust than a moving trace.
 */
function drawScope(canvas: HTMLCanvasElement | null, buffer: Float32Array): void {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas;
  const styles = getComputedStyle(canvas);
  context.clearRect(0, 0, width, height);

  context.strokeStyle = styles.getPropertyValue("--color-accent").trim() || "#e8a33d";
  context.lineWidth = 1.5;
  context.beginPath();

  // Only the first portion is drawn: at 48 kHz the whole 4096-sample buffer is
  // 85 ms, which is far too many cycles to read as a waveform.
  const visible = Math.min(buffer.length, 1200);
  for (let i = 0; i < visible; i++) {
    const x = (i / (visible - 1)) * width;
    const y = height / 2 - buffer[i] * (height / 2) * 0.9;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
}

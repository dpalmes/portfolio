"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui";
import {
  closeAudioContext,
  getAudioContext,
  isAudioSupported,
} from "@/lib/audio/engine";
import {
  PRESETS,
  STEPS_PER_BAR,
  emptyPattern,
  isActive,
  toggleStep,
  type Pattern,
} from "@/lib/audio/patterns";
import { StepClock, type ScheduledStep } from "@/lib/audio/scheduler";
import { createTicker, type Ticker } from "@/lib/audio/ticker";
import { DRUMS, type DrumId } from "@/lib/audio/voices";

/** How far ahead notes are scheduled, and how often we look. */
const LOOKAHEAD_SECONDS = 0.12;
const TIMER_MS = 25;

const DRUM_IDS = DRUMS.map((drum) => drum.id);

export function Sequencer() {
  const [pattern, setPattern] = useState<Pattern>(PRESETS[0].pattern);
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [bpm, setBpm] = useState(PRESETS[0].bpm);
  const [swing, setSwing] = useState(PRESETS[0].swing);
  const [volume, setVolume] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  // Capability detection is external state, and it never changes for a given
  // page. The server snapshot assumes support so the markup matches the common
  // case and no flash occurs on hydration.
  const supported = useSyncExternalStore(
    () => () => {},
    isAudioSupported,
    () => true,
  );

  const clockRef = useRef<StepClock | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const tickerRef = useRef<Ticker | null>(null);
  const frameRef = useRef<number | null>(null);
  /**
   * Steps already handed to the audio clock but not yet heard. The playhead is
   * driven by draining this against `currentTime`, so what you see is what has
   * actually sounded — not what React last re-rendered.
   */
  const queueRef = useRef<ScheduledStep[]>([]);
  // The scheduler runs on a timer and must always see the latest pattern
  // without being torn down and rebuilt on every edit. Synced in an effect
  // rather than during render: a ref write during render is not safe under
  // concurrent rendering, and the scheduler only ever reads this on a later
  // tick, so a commit-time update is soon enough.
  const patternRef = useRef(pattern);
  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  if (clockRef.current === null) {
    clockRef.current = new StepClock({
      bpm: PRESETS[0].bpm,
      steps: STEPS_PER_BAR,
      stepsPerBeat: 4,
      swing: PRESETS[0].swing,
    });
  }

  const stop = useCallback(() => {
    tickerRef.current?.stop();
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    clockRef.current?.stop();
    queueRef.current = [];
    setPlaying(false);
    setCurrentStep(-1);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const ctx = await getAudioContext();
      ctxRef.current = ctx;

      if (!masterRef.current) {
        const master = ctx.createGain();
        master.connect(ctx.destination);
        masterRef.current = master;
      }
      masterRef.current.gain.value = volume;

      const clock = clockRef.current!;
      clock.setBpm(bpm);
      clock.setSwing(swing);
      // A moment of headroom so the first step is scheduled rather than fired
      // late — starting exactly at currentTime is already too late.
      clock.start(ctx.currentTime + 0.08);
      queueRef.current = [];

      const tick = () => {
        const master = masterRef.current;
        if (!master) return;
        for (const step of clock.collect(ctx.currentTime, LOOKAHEAD_SECONDS)) {
          queueRef.current.push(step);
          for (const drum of DRUMS) {
            if (!isActive(patternRef.current, drum.id, step.step)) continue;
            drum.trigger({
              ctx,
              destination: master,
              time: step.time,
              // A touch more weight on the downbeat, which is enough to stop a
              // pattern sounding mechanical.
              velocity: step.step % 4 === 0 ? 1 : 0.86,
            });
          }
        }
      };

      tick();
      if (!tickerRef.current) tickerRef.current = createTicker();
      tickerRef.current.start(TIMER_MS, tick);

      // The playhead is a separate concern from the audio. It runs on
      // requestAnimationFrame, which stops entirely in a hidden tab — that is
      // correct, since there is nothing to draw. When the tab comes back, the
      // drain below skips straight to the step that is sounding now, so the
      // display re-synchronises rather than replaying a backlog.
      const drawPlayhead = () => {
        const now = ctx.currentTime;
        const queue = queueRef.current;
        let latest: number | null = null;
        while (queue.length > 0 && queue[0].time <= now) {
          latest = queue.shift()!.step;
        }
        if (latest !== null) setCurrentStep(latest);
        frameRef.current = requestAnimationFrame(drawPlayhead);
      };
      frameRef.current = requestAnimationFrame(drawPlayhead);

      setPlaying(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not start audio in this browser.",
      );
      stop();
    }
  }, [bpm, swing, volume, stop]);

  // Tear everything down on unmount, including the context — a page that had
  // audio on it should not keep the device open after you navigate away.
  useEffect(() => {
    return () => {
      tickerRef.current?.dispose();
      tickerRef.current = null;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      masterRef.current = null;
      ctxRef.current = null;
      void closeAudioContext();
    };
  }, []);

  useEffect(() => {
    clockRef.current?.setBpm(bpm);
  }, [bpm]);

  useEffect(() => {
    clockRef.current?.setSwing(swing);
  }, [swing]);

  useEffect(() => {
    const master = masterRef.current;
    const ctx = ctxRef.current;
    if (!master || !ctx) return;
    // Ramp rather than jump, so dragging the slider does not click.
    master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
  }, [volume]);

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((item) => item.id === id);
    if (!preset) return;
    setPresetId(preset.id);
    setPattern(preset.pattern);
    setBpm(preset.bpm);
    setSwing(preset.swing);
  };

  const toggle = (id: DrumId, step: number) => {
    setPattern((current) => toggleStep(current, id, step));
    setPresetId("");
  };

  // Space is the universal transport key; ignore it while a control has focus
  // so it does not fight the buttons and sliders.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "BUTTON" ||
          target.tagName === "INPUT" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      if (playing) stop();
      else void start();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playing, start, stop]);

  if (!supported) {
    return (
      <div className="panel p-6">
        <p className="text-ink-muted">
          This browser does not support the Web Audio API, so the sequencer
          cannot run here.
        </p>
      </div>
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-line p-4 sm:p-5">
        <Button
          onClick={() => (playing ? stop() : void start())}
          className="min-w-28"
          aria-pressed={playing}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? "Stop" : "Play"}
        </Button>

        <Slider
          label="Tempo"
          value={bpm}
          min={60}
          max={190}
          step={1}
          suffix=" BPM"
          onChange={setBpm}
        />

        <Slider
          label="Swing"
          value={Math.round(swing * 100)}
          min={0}
          max={70}
          step={1}
          suffix="%"
          onChange={(next) => setSwing(next / 100)}
        />

        <Slider
          label="Volume"
          value={Math.round(volume * 100)}
          min={0}
          max={100}
          step={1}
          suffix="%"
          onChange={(next) => setVolume(next / 100)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3 sm:px-5">
        <span className="mr-1 font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          Patterns
        </span>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.id)}
            aria-pressed={presetId === preset.id}
            className={`rounded border px-2.5 py-1 text-xs transition-colors ${
              presetId === preset.id
                ? "border-accent-line bg-accent-soft text-accent"
                : "border-line text-ink-muted hover:border-accent-line hover:text-ink"
            }`}
          >
            {preset.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPattern(emptyPattern(DRUM_IDS));
            setPresetId("");
          }}
          className="rounded border border-line px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-accent-line hover:text-ink"
        >
          Clear
        </button>
      </div>

      <div className="overflow-x-auto p-4 sm:p-5">
        <div className="min-w-[34rem]">
          <StepRuler current={playing ? currentStep : -1} />
          {DRUMS.map((drum) => (
            <div key={drum.id} className="mt-1.5 flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm text-ink-muted">
                {drum.label}
              </span>
              <div
                role="group"
                aria-label={`${drum.label} pattern`}
                className="grid flex-1 grid-cols-16 gap-1"
              >
                {Array.from({ length: STEPS_PER_BAR }, (_, step) => {
                  const on = isActive(pattern, drum.id, step);
                  const isPlayhead = playing && step === currentStep;
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => toggle(drum.id, step)}
                      aria-pressed={on}
                      aria-label={`${drum.label}, step ${step + 1}`}
                      className={`h-7 rounded-[3px] border transition-colors duration-75 ${
                        on
                          ? "border-accent bg-accent"
                          : step % 4 === 0
                            ? "border-line bg-raised hover:border-accent-line"
                            : "border-line/60 bg-transparent hover:border-accent-line"
                      } ${isPlayhead ? "ring-2 ring-ink/70 ring-offset-0" : ""}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="border-t border-line px-5 py-3 text-sm text-bad">
          {error}
        </p>
      ) : (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
          Click the grid to edit. Space plays and stops.
        </p>
      )}
    </div>
  );
}

function StepRuler({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0" />
      <div className="grid flex-1 grid-cols-16 gap-1">
        {Array.from({ length: STEPS_PER_BAR }, (_, step) => (
          <span
            key={step}
            aria-hidden="true"
            className={`text-center font-mono text-[10px] transition-colors ${
              step === current
                ? "text-accent"
                : step % 4 === 0
                  ? "text-ink-faint"
                  : "text-transparent"
            }`}
          >
            {step % 4 === 0 ? step / 4 + 1 : "·"}
          </span>
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex min-w-40 flex-1 flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          {label}
        </span>
        <span className="tabular text-xs text-ink">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-accent"
      />
    </label>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
      <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5">
      <path d="M4 3h3v10H4V3Zm5 0h3v10H9V3Z" fill="currentColor" />
    </svg>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui";
import { ChordDiagram } from "./chord-diagram";
import { Neck, type NeckMarker } from "./neck";
import { closeAudioContext, getAudioContext } from "@/lib/audio/engine";
import { pluck } from "@/lib/audio/voices";
import {
  CHORD_QUALITIES,
  chordSymbol,
  detectChords,
  getChordQuality,
} from "@/lib/music/chords";
import {
  MUTED,
  TUNINGS,
  findChordShapes,
  fretMidi,
  getTuning,
} from "@/lib/music/fretboard";
import {
  SHARP_NAMES,
  midiToFrequency,
  pitchClassName,
  pitchClassOf,
} from "@/lib/music/notes";
import { SCALES, degreeByPitchClass, getScale } from "@/lib/music/scales";

type Mode = "chords" | "scales";

const FRET_COUNT = 15;

export function Fretboard() {
  const [mode, setMode] = useState<Mode>("chords");
  const [root, setRoot] = useState(0);
  const [qualityId, setQualityId] = useState("major");
  const [scaleId, setScaleId] = useState("major-pentatonic");
  const [tuningId, setTuningId] = useState("standard");
  const [shapeIndex, setShapeIndex] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const masterRef = useRef<GainNode | null>(null);

  const tuning = getTuning(tuningId) ?? TUNINGS[0];
  const quality = getChordQuality(qualityId) ?? CHORD_QUALITIES[0];
  const scale = getScale(scaleId) ?? SCALES[0];

  // The search is cheap but not free, and it runs on every render otherwise.
  const shapes = useMemo(
    () =>
      findChordShapes(tuning, root, quality, {
        maxFret: FRET_COUNT,
        limit: 8,
      }),
    [tuning, root, quality],
  );

  // A new search invalidates the selected index; clamp rather than reset, so
  // stepping through qualities keeps you at roughly the same position.
  const activeIndex = Math.min(shapeIndex, Math.max(0, shapes.length - 1));
  const shape = shapes[activeIndex];

  const markers = useMemo<NeckMarker[]>(() => {
    if (mode === "scales") {
      const degrees = degreeByPitchClass(root, scale);
      const result: NeckMarker[] = [];
      for (let string = 0; string < tuning.strings.length; string++) {
        for (let fret = 0; fret <= FRET_COUNT; fret++) {
          const pitchClass = pitchClassOf(fretMidi(tuning, string, fret));
          const degree = degrees.get(pitchClass);
          if (!degree) continue;
          result.push({
            string,
            fret,
            label: degree,
            emphasis: pitchClass === root ? "root" : "normal",
          });
        }
      }
      return result;
    }

    if (!shape) return [];
    return shape.notes.map((note) => ({
      string: note.string,
      fret: note.fret,
      label: pitchClassName(note.pitchClass),
      emphasis: note.pitchClass === root ? "root" : "normal",
    }));
  }, [mode, root, scale, shape, tuning]);

  const mutedStrings = useMemo(() => {
    if (mode === "scales" || !shape) return [];
    return shape.frets
      .map((fret, index) => (fret === MUTED ? index : -1))
      .filter((index) => index >= 0);
  }, [mode, shape]);

  // What the selected voicing is actually called, computed from its notes
  // rather than from the request — which is how a slash chord gets named.
  const detected = useMemo(() => {
    if (!shape) return null;
    return detectChords(
      shape.notes.map((note) => note.pitchClass),
      { bass: shape.bass, limit: 1 },
    )[0];
  }, [shape]);

  const ensureMaster = useCallback(async () => {
    const ctx = await getAudioContext();
    if (!masterRef.current) {
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      masterRef.current = master;
    }
    return { ctx, master: masterRef.current };
  }, []);

  const playNote = useCallback(
    async (midi: number) => {
      try {
        const { ctx, master } = await ensureMaster();
        pluck({ ctx, destination: master, time: ctx.currentTime + 0.01 }, midiToFrequency(midi));
      } catch {
        setAudioError("Could not start audio in this browser.");
      }
    },
    [ensureMaster],
  );

  const strum = useCallback(async () => {
    if (!shape) return;
    try {
      const { ctx, master } = await ensureMaster();
      const start = ctx.currentTime + 0.02;
      shape.notes.forEach((note, index) => {
        // A real strum is not simultaneous; ~22 ms between strings is what
        // makes it sound like one gesture rather than a block chord.
        pluck(
          {
            ctx,
            destination: master,
            time: start + index * 0.022,
            velocity: 1 - index * 0.04,
          },
          midiToFrequency(note.midi),
        );
      });
    } catch {
      setAudioError("Could not start audio in this browser.");
    }
  }, [shape, ensureMaster]);

  useEffect(() => {
    return () => {
      masterRef.current = null;
      void closeAudioContext();
    };
  }, []);

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-end gap-4 border-b border-line p-4 sm:p-5">
        <Field label="Mode">
          <div className="flex rounded-md border border-line p-0.5">
            {(["chords", "scales"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                aria-pressed={mode === option}
                className={`rounded px-3 py-1.5 text-sm capitalize transition-colors ${
                  mode === option
                    ? "bg-accent-soft text-accent"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Root">
          <div className="flex flex-wrap gap-1">
            {SHARP_NAMES.map((name, pitchClass) => (
              <button
                key={name}
                type="button"
                onClick={() => setRoot(pitchClass)}
                aria-pressed={root === pitchClass}
                className={`h-8 w-9 rounded border font-mono text-xs transition-colors ${
                  root === pitchClass
                    ? "border-accent bg-accent text-canvas"
                    : "border-line text-ink-muted hover:border-accent-line hover:text-ink"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </Field>

        {mode === "chords" ? (
          <Field label="Quality">
            <Select
              value={qualityId}
              onChange={(value) => {
                setQualityId(value);
                setShapeIndex(0);
              }}
              options={CHORD_QUALITIES.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Field>
        ) : (
          <Field label="Scale">
            <Select
              value={scaleId}
              onChange={setScaleId}
              options={SCALES.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Field>
        )}

        <Field label="Tuning">
          <Select
            value={tuningId}
            onChange={(value) => {
              setTuningId(value);
              setShapeIndex(0);
            }}
            options={TUNINGS.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {mode === "chords"
              ? chordSymbol(root, quality)
              : `${pitchClassName(root)} ${scale.name}`}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {mode === "chords"
              ? shape
                ? `${shapes.length} shape${shapes.length === 1 ? "" : "s"} found · showing ${activeIndex + 1}`
                : "No playable shape found in this tuning within reach."
              : `${scale.intervals.length} notes · ${markers.length} positions on the neck`}
          </p>
        </div>

        {mode === "chords" && shape ? (
          <div className="flex items-center gap-3">
            {detected && detected.symbol !== chordSymbol(root, quality) ? (
              <p className="text-sm text-ink-muted">
                Recognised as{" "}
                <span className="font-mono text-accent">{detected.symbol}</span>
              </p>
            ) : null}
            <Button onClick={() => void strum()}>Strum</Button>
          </div>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <Neck
          tuning={tuning}
          markers={markers}
          fretCount={FRET_COUNT}
          mutedStrings={mutedStrings}
          onSelect={(string, fret) =>
            void playNote(fretMidi(tuning, string, fret))
          }
        />
      </div>

      {mode === "chords" && shapes.length > 0 ? (
        <div className="border-t border-line p-4 sm:p-5">
          <p className="mb-3 font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Voicings, best first
          </p>
          <div className="flex flex-wrap gap-2">
            {shapes.map((item, index) => (
              <div key={item.frets.join(",")} className="w-[104px]">
                <ChordDiagram
                  tuning={tuning}
                  shape={item}
                  selected={index === activeIndex}
                  onSelect={() => setShapeIndex(index)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {audioError ? (
        <p role="alert" className="border-t border-line px-5 py-3 text-sm text-bad">
          {audioError}
        </p>
      ) : (
        <p className="border-t border-line px-5 py-3 text-xs text-ink-muted">
          {mode === "chords"
            ? "Nothing here is looked up — every shape is searched for on the neck. Click a note to hear it, or strum the whole voicing."
            : `Labels are scale degrees, so the same shape reads differently in a different key. Click any note to hear it.`}
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 rounded border border-line bg-surface px-2 text-sm text-ink"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

"use client";

import { MUTED, type ChordShape, type Tuning } from "@/lib/music/fretboard";

/**
 * A conventional vertical chord diagram: strings run top to bottom as columns,
 * frets as rows, lowest-pitched string on the left.
 *
 * Deliberately drawn from the shape data rather than from an image, so it works
 * for whatever the search returns — including tunings and voicings no chord
 * book contains.
 */
export function ChordDiagram({
  tuning,
  shape,
  selected = false,
  onSelect,
  size = 92,
}: {
  tuning: Tuning;
  shape: ChordShape;
  selected?: boolean;
  onSelect?: () => void;
  size?: number;
}) {
  const strings = tuning.strings.length;
  const frets = 5;

  const padX = 10;
  const padTop = 16;
  const padBottom = 6;
  const width = size;
  const height = size * 1.15;

  const gridWidth = width - padX * 2;
  const gridHeight = height - padTop - padBottom;
  const stringGap = gridWidth / (strings - 1);
  const fretGap = gridHeight / frets;

  // Open-position shapes are drawn against the nut; anything higher is drawn as
  // a window with a fret number beside it.
  const openPosition = shape.baseFret <= 1;
  const startFret = openPosition ? 1 : shape.baseFret;

  const stringX = (index: number) => padX + index * stringGap;
  const fretY = (offset: number) => padTop + offset * fretGap;

  const label = shape.frets
    .map((fret) => (fret === MUTED ? "x" : fret))
    .join(" ");

  const content = (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Fingering ${label}`}
    >
      {/* Nut, or the fret number when the shape sits up the neck. */}
      {openPosition ? (
        <rect
          x={padX - 1}
          y={padTop - 3}
          width={gridWidth + 2}
          height={3}
          fill="currentColor"
          opacity="0.85"
        />
      ) : (
        <text
          x={padX - 4}
          y={fretY(0.72)}
          textAnchor="end"
          fontSize="8"
          className="font-mono"
          fill="var(--color-ink-faint)"
        >
          {startFret}
        </text>
      )}

      {Array.from({ length: frets + 1 }, (_, row) => (
        <line
          key={`fret-${row}`}
          x1={padX}
          x2={padX + gridWidth}
          y1={fretY(row)}
          y2={fretY(row)}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
      ))}

      {Array.from({ length: strings }, (_, index) => (
        <line
          key={`string-${index}`}
          x1={stringX(index)}
          x2={stringX(index)}
          y1={fretY(0)}
          y2={fretY(frets)}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
      ))}

      {shape.frets.map((fret, index) => {
        const x = stringX(index);

        if (fret === MUTED) {
          return (
            <g
              key={index}
              stroke="var(--color-ink-faint)"
              strokeWidth="1.3"
              strokeLinecap="round"
            >
              <line x1={x - 3} x2={x + 3} y1={padTop - 10} y2={padTop - 4} />
              <line x1={x - 3} x2={x + 3} y1={padTop - 4} y2={padTop - 10} />
            </g>
          );
        }

        if (fret === 0) {
          return (
            <circle
              key={index}
              cx={x}
              cy={padTop - 7}
              r="2.8"
              fill="none"
              stroke="var(--color-ink-muted)"
              strokeWidth="1.2"
            />
          );
        }

        return (
          <circle
            key={index}
            cx={x}
            cy={fretY(fret - startFret + 0.5)}
            r={stringGap * 0.3}
            fill="var(--color-accent)"
          />
        );
      })}
    </svg>
  );

  if (!onSelect) {
    return <div className="text-ink">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-lg border p-2 text-ink transition-colors ${
        selected
          ? "border-accent bg-accent-soft"
          : "border-line hover:border-accent-line"
      }`}
    >
      {content}
      <span className="mt-1 block text-center font-mono text-[10px] text-ink-faint">
        {label}
      </span>
    </button>
  );
}

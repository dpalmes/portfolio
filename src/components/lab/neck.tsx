"use client";

import { MUTED, type Tuning } from "@/lib/music/fretboard";

export interface NeckMarker {
  string: number;
  fret: number;
  /** Text inside the dot: a note name or a scale degree. */
  label: string;
  /** Roots are filled; other notes are outlined. */
  emphasis: "root" | "normal" | "muted";
}

const INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_INLAY_FRETS = [12, 24];

/**
 * The full neck, drawn horizontally with the highest-pitched string on top —
 * the orientation you see looking down at the instrument in your lap, which is
 * the one players read fastest.
 */
export function Neck({
  tuning,
  markers,
  fretCount,
  onSelect,
  mutedStrings = [],
}: {
  tuning: Tuning;
  markers: NeckMarker[];
  fretCount: number;
  onSelect?: (string: number, fret: number) => void;
  mutedStrings?: number[];
}) {
  const stringCount = tuning.strings.length;

  const padLeft = 44;
  const padRight = 18;
  const padTop = 26;
  // Deep enough that the fret numbers clear the note markers on the lowest
  // string, which sit 11px below its line.
  const padBottom = 36;
  const stringGap = 30;
  const fretWidth = 58;

  const width = padLeft + fretWidth * fretCount + padRight;
  const height = padTop + stringGap * (stringCount - 1) + padBottom;

  // Strings are indexed low-to-high but drawn high-to-low.
  const stringY = (index: number) =>
    padTop + (stringCount - 1 - index) * stringGap;
  const fretLineX = (fret: number) => padLeft + fret * fretWidth;
  const noteX = (fret: number) =>
    fret === 0 ? padLeft - 22 : fretLineX(fret) - fretWidth / 2;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ minWidth: `${width * 0.62}px` }}
        className="w-full text-ink"
        role="img"
        aria-label={`Fretboard in ${tuning.name} showing ${markers.length} positions`}
      >
        {/* Fret numbers. */}
        {Array.from({ length: fretCount }, (_, index) => index + 1).map((fret) => (
          <text
            key={`num-${fret}`}
            x={noteX(fret)}
            y={height - 8}
            textAnchor="middle"
            fontSize="10"
            className="font-mono"
            fill="var(--color-ink-faint)"
          >
            {fret}
          </text>
        ))}

        {/* Position inlays, drawn behind the strings. */}
        {INLAY_FRETS.filter((fret) => fret <= fretCount).map((fret) => (
          <circle
            key={`inlay-${fret}`}
            cx={noteX(fret)}
            cy={padTop + (stringGap * (stringCount - 1)) / 2}
            r="5"
            fill="var(--color-line)"
          />
        ))}
        {DOUBLE_INLAY_FRETS.filter((fret) => fret <= fretCount).map((fret) => (
          <g key={`inlay2-${fret}`} fill="var(--color-line)">
            <circle
              cx={noteX(fret)}
              cy={padTop + stringGap * (stringCount - 1) * 0.25}
              r="5"
            />
            <circle
              cx={noteX(fret)}
              cy={padTop + stringGap * (stringCount - 1) * 0.75}
              r="5"
            />
          </g>
        ))}

        {/* The nut is thicker than the frets, as on the instrument. */}
        <rect
          x={fretLineX(0) - 3}
          y={padTop - 6}
          width={4}
          height={stringGap * (stringCount - 1) + 12}
          fill="var(--color-ink-muted)"
        />

        {Array.from({ length: fretCount }, (_, index) => index + 1).map((fret) => (
          <line
            key={`fret-${fret}`}
            x1={fretLineX(fret)}
            x2={fretLineX(fret)}
            y1={padTop - 6}
            y2={padTop + stringGap * (stringCount - 1) + 6}
            stroke="var(--color-line)"
            strokeWidth="1.5"
          />
        ))}

        {Array.from({ length: stringCount }, (_, index) => (
          <line
            key={`string-${index}`}
            x1={fretLineX(0)}
            x2={fretLineX(fretCount)}
            y1={stringY(index)}
            y2={stringY(index)}
            stroke="var(--color-ink-faint)"
            // Thicker strings for the lower courses, as they look on the neck.
            strokeWidth={0.7 + (stringCount - 1 - index) * 0.22}
            opacity="0.6"
          />
        ))}

        {/* Muted-string crosses, to the left of the nut. */}
        {mutedStrings.map((index) => (
          <g
            key={`mute-${index}`}
            stroke="var(--color-ink-faint)"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <line
              x1={padLeft - 28}
              x2={padLeft - 18}
              y1={stringY(index) - 5}
              y2={stringY(index) + 5}
            />
            <line
              x1={padLeft - 28}
              x2={padLeft - 18}
              y1={stringY(index) + 5}
              y2={stringY(index) - 5}
            />
          </g>
        ))}

        {markers.map((marker) => {
          const cx = noteX(marker.fret);
          const cy = stringY(marker.string);
          const isRoot = marker.emphasis === "root";
          const interactive = Boolean(onSelect);

          return (
            <g
              key={`${marker.string}-${marker.fret}`}
              onClick={
                onSelect ? () => onSelect(marker.string, marker.fret) : undefined
              }
              style={interactive ? { cursor: "pointer" } : undefined}
            >
              <circle
                cx={cx}
                cy={cy}
                r="11"
                fill={isRoot ? "var(--color-accent)" : "var(--color-surface)"}
                stroke={
                  isRoot ? "var(--color-accent)" : "var(--color-accent-line)"
                }
                strokeWidth="1.5"
              />
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize="9.5"
                className="font-mono"
                fill={isRoot ? "var(--color-canvas)" : "var(--color-ink)"}
              >
                {marker.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export { MUTED };

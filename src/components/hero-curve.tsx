import {
  cumulativeMeanNormalizedDifference,
  detectPitch,
} from "@/lib/audio/yin";
import { describeFrequency } from "@/lib/music/notes";

const SAMPLE_RATE = 44100;
const FREQUENCY = 220; // A3
const LAGS = 420; // enough to show two dips

/**
 * The hero graphic is not an illustration of the algorithm — it *is* the
 * algorithm's output.
 *
 * This is a server component, so the curve is computed at build time by the
 * same code the tuner runs, on a synthetic A3, and serialised straight into the
 * markup. Nothing ships to the client: no chart library, no data file, and no
 * JavaScript. If the detector ever changed, this picture would change with it.
 */
export function HeroCurve({ className = "" }: { className?: string }) {
  const buffer = new Float32Array(2048);
  for (let i = 0; i < buffer.length; i++) {
    // Two partials, so the curve looks like an instrument rather than a
    // textbook sine.
    const t = i / SAMPLE_RATE;
    buffer[i] =
      0.5 * Math.sin(2 * Math.PI * FREQUENCY * t) +
      0.22 * Math.sin(2 * Math.PI * FREQUENCY * 2 * t + 1);
  }

  const curve = cumulativeMeanNormalizedDifference(buffer, LAGS);
  const detected = detectPitch(buffer, SAMPLE_RATE);
  const note = detected.frequency ? describeFrequency(detected.frequency) : null;

  const width = 720;
  const height = 170;
  const padding = { top: 16, right: 14, bottom: 22, left: 14 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Scale to the data rather than to a guessed ceiling, so the peaks never
  // clip flat.
  let maxValue = 1;
  for (let lag = 1; lag < LAGS; lag++) maxValue = Math.max(maxValue, curve[lag]);
  maxValue *= 1.05;

  const x = (lag: number) => padding.left + (lag / (LAGS - 1)) * plotWidth;
  // Zero sits on the baseline, so the dips read as dips.
  const y = (value: number) =>
    height - padding.bottom - (value / maxValue) * plotHeight;

  const points: string[] = [];
  for (let lag = 1; lag < LAGS; lag++) {
    points.push(`${x(lag).toFixed(2)},${y(curve[lag]).toFixed(2)}`);
  }

  const periodLag = detected.tau ?? SAMPLE_RATE / FREQUENCY;

  return (
    <figure className={`panel bg-surface/60 p-5 sm:p-6 ${className}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`The YIN difference curve for a synthetic ${FREQUENCY} hertz tone, dipping sharply to near zero at a lag of ${Math.round(periodLag)} samples, which the detector reports as ${note?.name ?? "A3"}.`}
      >
        {/* Baseline and threshold guides. */}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={y(0)}
          y2={y(0)}
          stroke="var(--color-line)"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={y(0.12)}
          y2={y(0.12)}
          stroke="var(--color-accent-line)"
          strokeWidth="1"
          strokeDasharray="3 4"
        />

        {/* The detected period. */}
        <line
          x1={x(periodLag)}
          x2={x(periodLag)}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="var(--color-accent)"
          strokeWidth="1"
          strokeOpacity="0.5"
        />
        <circle cx={x(periodLag)} cy={y(0)} r="3.5" fill="var(--color-accent)" />

        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeOpacity="0.75"
        />

        <text
          x={x(periodLag) + 8}
          y={y(0) - 10}
          fill="var(--color-accent)"
          className="font-mono"
          fontSize="11"
        >
          τ = {periodLag.toFixed(1)} samples
        </text>
        <text
          x={padding.left}
          y={height - 6}
          fill="var(--color-ink-faint)"
          className="font-mono"
          fontSize="10"
        >
          lag →
        </text>
        <text
          x={width - padding.right}
          y={height - 6}
          textAnchor="end"
          fill="var(--color-ink-faint)"
          className="font-mono"
          fontSize="10"
        >
          {detected.frequency?.toFixed(2)} Hz → {note?.name}
        </text>
      </svg>
      <figcaption className="mt-3 text-xs text-ink-muted">
        The YIN difference curve, computed at build time by{" "}
        <code className="font-mono text-ink">src/lib/audio/yin.ts</code> on a
        synthetic A3. The dip is the period; the dashed line is the detection
        threshold.
      </figcaption>
    </figure>
  );
}

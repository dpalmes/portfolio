import { ImageResponse } from "next/og";
import { cumulativeMeanNormalizedDifference } from "@/lib/audio/yin";
import { displayName, site } from "@/content/site";

export const alt = `${displayName} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The social card, drawn from the same YIN curve as the hero.
 *
 * Satori renders a subset of CSS rather than arbitrary SVG, so the curve is
 * plotted as a row of flex columns instead of a path — same data, expressed in
 * the primitives available. Generated at build time, so it costs nothing at
 * request time.
 */
export default function OpengraphImage() {
  const sampleRate = 44100;
  const frequency = 220;

  const buffer = new Float32Array(2048);
  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    buffer[i] =
      0.5 * Math.sin(2 * Math.PI * frequency * t) +
      0.22 * Math.sin(2 * Math.PI * frequency * 2 * t + 1);
  }

  const curve = cumulativeMeanNormalizedDifference(buffer, 420);
  const bars = 84;
  const step = Math.floor(curve.length / bars);
  const values = Array.from({ length: bars }, (_, i) => curve[i * step + 1] ?? 1);
  const peak = Math.max(...values, 1);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0b0c0e",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              letterSpacing: 6,
              color: "#f0a94c",
              textTransform: "uppercase",
            }}
          >
            Web Audio · DSP · TypeScript
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 104,
              fontWeight: 700,
              color: "#ece9e4",
              marginTop: 24,
            }}
          >
            {displayName}.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 38,
              color: "#9ba1aa",
              marginTop: 12,
            }}
          >
            {site.role}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            height: 190,
            gap: 4,
          }}
        >
          {values.map((value, index) => {
            const height = Math.max(3, (value / peak) * 190);
            // The dips are the interesting part, so they get the accent.
            const isDip = value < 0.25;
            return (
              <div
                key={index}
                style={{
                  width: 8,
                  height,
                  backgroundColor: isDip ? "#f0a94c" : "#292d34",
                  borderRadius: 2,
                }}
              />
            );
          })}
        </div>
      </div>
    ),
    size,
  );
}

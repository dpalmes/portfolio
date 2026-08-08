import type { Metadata } from "next";
import { DemoPage } from "@/components/lab/demo-page";
import { Fretboard } from "@/components/lab/fretboard";

export const metadata: Metadata = {
  title: "Fretboard",
  description:
    "An interactive fretboard that derives playable chord shapes for any chord in any tuning by searching the neck under physical constraints.",
};

export default function FretboardPage() {
  return (
    <DemoPage
      slug="fretboard"
      notes={
        <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            There is no chord dictionary behind this. Every fingering is found by
            searching the neck one hand position at a time, keeping only the
            combinations that cover the chord and fit under four frets, then
            ranking what survives by how playable it is.
          </p>
          <p>
            That is why the tuning selector works on chords nobody has tabulated.
            Switch to DADGAD or the ukulele and the same code answers, because
            the tuning is an input rather than an assumption.
          </p>
        </div>
      }
    >
      <Fretboard />
    </DemoPage>
  );
}

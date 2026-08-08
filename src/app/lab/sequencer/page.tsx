import type { Metadata } from "next";
import { DemoPage } from "@/components/lab/demo-page";
import { Sequencer } from "@/components/lab/sequencer";

export const metadata: Metadata = {
  title: "Sequencer",
  description:
    "A sample-accurate step sequencer built on the Web Audio clock, with every drum sound synthesised from oscillators and filtered noise.",
};

export default function SequencerPage() {
  return (
    <DemoPage
      slug="sequencer"
      notes={
        <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            Nothing here is a sample. The kick is a sine sweeping from 150 Hz to
            48 Hz, the snare is band-passed noise over a short triangle body, and
            the clap is three noise bursts a few milliseconds apart with a longer
            tail — which is what a clap physically is.
          </p>
          <p>
            The swing control delays every second step. It shifts when a note is
            reported, not the grid it sits on, so the downbeats stay exactly
            where they were no matter how long you leave it running.
          </p>
        </div>
      }
    >
      <Sequencer />
    </DemoPage>
  );
}

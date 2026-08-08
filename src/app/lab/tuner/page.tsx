import type { Metadata } from "next";
import { DemoPage } from "@/components/lab/demo-page";
import { Tuner } from "@/components/lab/tuner";

export const metadata: Metadata = {
  title: "Tuner",
  description:
    "A chromatic tuner using a from-scratch implementation of the YIN pitch-detection algorithm, running entirely in the browser.",
};

export default function TunerPage() {
  return (
    <DemoPage
      slug="tuner"
      notes={
        <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
          <p>
            The microphone is opened with echo cancellation, noise suppression
            and automatic gain explicitly disabled. Those defaults are tuned for
            speech and all three actively damage a pitch measurement — noise
            suppression in particular treats a sustained note as stationary noise
            and attenuates it.
          </p>
          <p>
            The needle is smoothed in the log-frequency domain, so it settles at
            the same rate on a low E as on a high one. A jump of more than a
            fifth re-seeds it instead of gliding, because a leap that large is a
            new note rather than a slide.
          </p>
        </div>
      }
    >
      <Tuner />
    </DemoPage>
  );
}

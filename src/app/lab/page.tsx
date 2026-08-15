import type { Metadata } from "next";
import { ProjectCard } from "@/components/project-card";
import { Container, Eyebrow } from "@/components/ui";
import { labProjects } from "@/content/projects";
import { productProjects } from "@/content/product-projects";

export const metadata: Metadata = {
  title: "Lab",
  description:
    "Interactive audio demos that run entirely in the browser: a pitch-detecting tuner, a sample-accurate step sequencer, and a fretboard that derives chord shapes by search.",
};

export default function LabPage() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Lab</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Things you can play with
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Everything here runs in your browser — no server, no database, no
          account. The tuner needs microphone permission, requested only when
          you press start, and the audio never leaves the page.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
          Products
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {productProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
          Browser audio
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {labProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </section>
      <p className="mt-10 text-sm text-ink-muted">
        Audio requires a user gesture to start, so nothing plays until you press
        a button. Best with headphones for the tuner, to keep the speakers out
        of the microphone.
      </p>
    </Container>
  );
}

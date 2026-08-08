import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, Container, Eyebrow, Tag } from "@/components/ui";
import { externalProjects, projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies on building a pitch detector, a drift-free sequencer, and a chord-shape search engine from the algorithms up.",
};

export default function WorkPage() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Work</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">Case studies</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Three problems where the off-the-shelf answer was wrong, and what it
          took to do them properly.
        </p>
      </div>

      <ol className="mt-14 space-y-14">
        {projects.map((project, index) => (
          <li
            key={project.slug}
            className="border-t border-line pt-8 first:border-t-0 first:pt-0"
          >
            <article className="grid gap-6 md:grid-cols-[7rem_1fr]">
              <p className="font-mono text-xs tracking-[0.12em] text-ink-faint uppercase">
                {String(index + 1).padStart(2, "0")} · {project.domain}
              </p>

              <div>
                <h2 className="font-display text-2xl font-semibold">
                  <Link
                    href={`/work/${project.slug}`}
                    className="transition-colors hover:text-accent"
                  >
                    {project.title}
                  </Link>
                </h2>
                <p className="mt-1 text-ink-muted">{project.tagline}</p>

                <p className="mt-4 max-w-2xl leading-relaxed text-ink-muted">
                  {project.summary}
                </p>

                <ul className="mt-5 space-y-2">
                  {project.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-3 text-sm text-ink-muted"
                    >
                      <span aria-hidden="true" className="mt-2 h-px w-4 shrink-0 bg-accent" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <ul className="mt-5 flex flex-wrap gap-1.5">
                  {project.stack.map((item) => (
                    <li key={item}>
                      <Tag>{item}</Tag>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <Link
                    href={`/work/${project.slug}`}
                    className="inline-flex items-center gap-1.5 font-medium text-accent"
                  >
                    Read the case study
                    <ArrowIcon />
                  </Link>
                  <Link
                    href={project.demoHref}
                    className="inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
                  >
                    Open the demo
                    <ArrowIcon />
                  </Link>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>

      {externalProjects.length > 0 ? (
        <section className="mt-20 border-t border-line pt-10">
          <h2 className="font-display text-xl font-semibold">Elsewhere</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {externalProjects.map((project) => (
              <li key={project.title} className="panel p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-lg font-semibold">
                    {project.title}
                  </h3>
                  <span className="font-mono text-[11px] text-ink-faint">
                    {project.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  {project.description}
                </p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {project.stack.map((item) => (
                    <li key={item}>
                      <Tag>{item}</Tag>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}

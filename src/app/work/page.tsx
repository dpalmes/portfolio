import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon, Container, Eyebrow, Tag } from "@/components/ui";
import {
  externalProjects,
  labProjects,
  type Project,
} from "@/content/projects";
import { backendProjects } from "@/content/backend-projects";

export const metadata: Metadata = {
  title: "Work",
  description:
    "Case studies on Kafka stream processing, SOAP/REST middleware, API security, and a set of browser audio demos built from the algorithms up.",
};

export default function WorkPage() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>Work</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">Case studies</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-muted">
          Problems where the off-the-shelf answer was wrong, and what it took to
          do them properly. Each one links to a repository you can build and
          test.
        </p>
      </div>

      <Section
        eyebrow="Backend"
        title="Java services"
        description="Streaming, middleware and API security — the work closest to what I do professionally."
        projects={backendProjects}
        startIndex={0}
      />

      <Section
        eyebrow="Lab"
        title="Browser audio"
        description="Real-time problems taken apart in the browser, where you can hear the result."
        projects={labProjects}
        startIndex={backendProjects.length}
      />

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

function Section({
  eyebrow,
  title,
  description,
  projects,
  startIndex,
}: {
  eyebrow: string;
  title: string;
  description: string;
  projects: Project[];
  startIndex: number;
}) {
  return (
    <section className="mt-16">
      <div className="max-w-2xl border-b border-line pb-5">
        <p className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-ink-muted">{description}</p>
      </div>

      <ol className="mt-10 space-y-14">
        {projects.map((project, index) => (
          <li key={project.slug}>
            <article className="grid gap-6 md:grid-cols-[10rem_1fr]">
              <p className="font-mono text-xs tracking-[0.12em] text-ink-faint uppercase">
                {String(startIndex + index + 1).padStart(2, "0")} ·{" "}
                {project.domain}
              </p>

              <div>
                <h3 className="font-display text-2xl font-semibold">
                  <Link
                    href={`/work/${project.slug}`}
                    className="transition-colors hover:text-accent"
                  >
                    {project.title}
                  </Link>
                </h3>
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
                      <span
                        aria-hidden="true"
                        className="mt-2 h-px w-4 shrink-0 bg-accent"
                      />
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
                  {project.demoHref ? (
                    <Link
                      href={project.demoHref}
                      className="inline-flex items-center gap-1.5 text-ink-muted transition-colors hover:text-ink"
                    >
                      Open the demo
                      <ArrowIcon />
                    </Link>
                  ) : null}
                  {project.testCount ? (
                    <span className="tabular text-ink-faint">
                      {project.testCount} tests
                    </span>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}

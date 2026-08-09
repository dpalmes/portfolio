import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowIcon, ButtonLink, Container, Eyebrow, Tag } from "@/components/ui";
import { allProjects, getProject } from "@/content/projects";

export function generateStaticParams() {
  return allProjects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata(
  props: PageProps<"/work/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: project.title,
    description: project.summary,
    openGraph: {
      title: `${project.title} — ${project.tagline}`,
      description: project.summary,
    },
  };
}

export default async function CaseStudyPage(props: PageProps<"/work/[slug]">) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = allProjects.findIndex((item) => item.slug === slug);
  const next = allProjects[(index + 1) % allProjects.length];

  return (
    <article className="py-16 sm:py-20">
      <Container>
        <Link
          href="/work"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowIcon className="rotate-180" />
          All case studies
        </Link>

        <header className="mt-8 max-w-3xl">
          <Eyebrow>{project.domain}</Eyebrow>
          <h1 className="text-3xl font-semibold sm:text-5xl">{project.title}</h1>
          <p className="mt-3 text-lg text-ink-muted">{project.tagline}</p>
          <p className="mt-6 leading-relaxed text-ink-muted">{project.summary}</p>

          <ul className="mt-6 flex flex-wrap gap-1.5">
            {project.stack.map((item) => (
              <li key={item}>
                <Tag>{item}</Tag>
              </li>
            ))}
          </ul>

          {project.demoHref ? (
            <div className="mt-8">
              <ButtonLink href={project.demoHref}>
                Open the demo
                <ArrowIcon />
              </ButtonLink>
            </div>
          ) : project.repo ? (
            <p className="mt-8 font-mono text-sm text-ink-muted">
              Repository:{" "}
              {project.repoHref ? (
                <a
                  href={project.repoHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-accent underline decoration-line underline-offset-4"
                >
                  {project.repo}
                </a>
              ) : (
                <span className="text-ink">{project.repo}</span>
              )}
            </p>
          ) : null}
        </header>

        <section className="mt-14 max-w-3xl border-y border-line py-8">
          <h2 className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
            In short
          </h2>
          <ul className="mt-5 space-y-3">
            {project.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-3 text-ink-muted">
                <span
                  aria-hidden="true"
                  className="mt-2.5 h-px w-4 shrink-0 bg-accent"
                />
                <span className="leading-relaxed">{highlight}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-14 max-w-3xl space-y-14">
          {project.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-2xl font-semibold">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="leading-relaxed text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.note ? (
                <aside className="mt-6 border-l-2 border-accent bg-accent-soft/60 py-4 pr-4 pl-5">
                  <p className="text-sm leading-relaxed text-ink">
                    {section.note}
                  </p>
                </aside>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-14 max-w-3xl">
          <h2 className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
            Source
          </h2>
          <ul className="mt-4 space-y-1.5">
            {project.sources.map((source) => (
              <li key={source} className="font-mono text-sm text-ink-muted">
                {source}
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-20 border-t border-line pt-8" aria-label="Case studies">
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            Next
          </p>
          <Link
            href={`/work/${next.slug}`}
            className="group mt-2 inline-flex items-baseline gap-2 font-display text-2xl font-semibold transition-colors hover:text-accent"
          >
            {next.title}
            <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-1 text-sm text-ink-muted">{next.tagline}</p>
        </nav>
      </Container>
    </article>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon, Container, Eyebrow } from "@/components/ui";
import { getProject } from "@/content/projects";

/**
 * Shared chrome for the three demo pages: heading, the demo itself, then the
 * explanation underneath. Putting the interactive thing above the prose is
 * deliberate — people came to press the button.
 */
export function DemoPage({
  slug,
  children,
  notes,
}: {
  slug: string;
  children: ReactNode;
  notes?: ReactNode;
}) {
  const project = getProject(slug);
  if (!project) return null;

  return (
    <Container className="py-12 sm:py-16">
      <Link
        href="/lab"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowIcon className="rotate-180" />
        Lab
      </Link>

      <header className="mt-6 max-w-2xl">
        <Eyebrow>{project.domain}</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">{project.title}</h1>
        <p className="mt-3 text-lg text-ink-muted">{project.tagline}</p>
      </header>

      <div className="mt-10">{children}</div>

      {notes ? <div className="mt-10 max-w-2xl">{notes}</div> : null}

      <section className="mt-14 max-w-2xl border-t border-line pt-8">
        <h2 className="font-display text-xl font-semibold">How it works</h2>
        <p className="mt-3 leading-relaxed text-ink-muted">{project.summary}</p>
        <Link
          href={`/work/${project.slug}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
        >
          Read the full case study
          <ArrowIcon />
        </Link>
      </section>
    </Container>
  );
}

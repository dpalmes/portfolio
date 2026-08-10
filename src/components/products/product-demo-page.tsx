import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowIcon, Container, Eyebrow, Tag } from "@/components/ui";
import { getProject } from "@/content/projects";

/**
 * Shared chrome for the product demos.
 *
 * Says up front what the demo is and is not. These are the parts of a product
 * that are worth building carefully, not a whole product — and claiming
 * otherwise would be the sort of thing a technical reviewer checks.
 */
export function ProductDemoPage({
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
        <p className="mt-5 leading-relaxed text-ink-muted">{project.summary}</p>

        <ul className="mt-5 flex flex-wrap gap-1.5">
          {project.stack.map((item) => (
            <li key={item}>
              <Tag>{item}</Tag>
            </li>
          ))}
          {project.testCount ? (
            <li>
              <Tag>{project.testCount} tests</Tag>
            </li>
          ) : null}
        </ul>
      </header>

      <div className="mt-10">{children}</div>

      {notes ? (
        <div className="mt-8 max-w-2xl space-y-4 text-sm leading-relaxed text-ink-muted">
          {notes}
        </div>
      ) : null}

      <section className="mt-14 max-w-2xl border-t border-line pt-8">
        <h2 className="font-display text-xl font-semibold">
          What this is, and what it is not
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          This is the part of the product that is worth building carefully: the
          rules that decide what can be sold, for how much, and what happens when
          the answer is no. It is a real engine with tests beside it, running in
          your browser with no server involved.
        </p>
        <p className="mt-4 leading-relaxed text-ink-muted">
          It is not a whole product. There is no login, no database and no
          payment provider — those are known quantities, and building them here
          would demonstrate nothing that the interesting half does not already
          demonstrate better. State lives in the page and resets when you reload
          it.
        </p>

        <Link
          href={`/work/${project.slug}`}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
        >
          Read the full case study
          <ArrowIcon />
        </Link>
      </section>
    </Container>
  );
}

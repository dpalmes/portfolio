import Link from "next/link";
import type { Project } from "@/content/projects";
import { ArrowIcon, Tag } from "./ui";

export function ProjectCard({ project }: { project: Project }) {
  // Lab work is best met by pressing a button; backend work is met by reading
  // the case study. The card leads with whichever that is.
  const href = project.demoHref ?? `/work/${project.slug}`;
  const action = project.demoHref ? "Open demo" : "Read case study";

  return (
    <article className="panel group relative flex flex-col p-6 transition-colors duration-300 hover:border-accent-line">
      <div className="mb-4">
        <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
          {project.domain}
        </p>
        <h3 className="mt-2 font-display text-xl font-semibold">
          {/*
            The whole card is the hit target, via a stretched pseudo-element on
            this link. That keeps one link per card for screen readers instead
            of wrapping the article and repeating the name.
          */}
          <Link
            href={href}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {project.title}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-ink-muted">{project.tagline}</p>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{project.summary}</p>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        {project.stack.map((item) => (
          <li key={item}>
            <Tag>{item}</Tag>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-accent">
          {action}
          <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
        </p>
        {project.testCount ? (
          <p className="tabular text-xs text-ink-faint">
            {project.testCount} tests
          </p>
        ) : null}
      </div>
    </article>
  );
}

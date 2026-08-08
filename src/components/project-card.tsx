import Link from "next/link";
import type { Project } from "@/content/projects";
import { ArrowIcon, Tag } from "./ui";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="panel group relative flex flex-col p-6 transition-colors duration-300 hover:border-accent-line">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.12em] text-ink-faint uppercase">
            {project.domain}
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold">
            {/*
              The whole card is the hit target, via a stretched pseudo-element
              on this link. That keeps one link per card for screen readers
              instead of wrapping the article and repeating the name.
            */}
            <Link
              href={project.demoHref}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {project.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{project.tagline}</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{project.summary}</p>

      <ul className="mt-5 flex flex-wrap gap-1.5">
        {project.stack.map((item) => (
          <li key={item}>
            <Tag>{item}</Tag>
          </li>
        ))}
      </ul>

      <p className="mt-6 flex items-center gap-1.5 text-sm font-medium text-accent">
        Open demo
        <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
      </p>
    </article>
  );
}

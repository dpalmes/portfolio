import Link from "next/link";
import { activeSocials, displayName, site } from "@/content/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold">
            {displayName}
            <span className="text-accent">.</span>
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {site.location ? `${site.location} · ` : ""}
            <a
              href={`mailto:${site.email}`}
              className="underline decoration-line underline-offset-4 transition-colors hover:decoration-accent"
            >
              {site.email}
            </a>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-muted">
          {activeSocials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-ink"
            >
              {social.label}
            </a>
          ))}
          <Link href="/lab" className="transition-colors hover:text-ink">
            Lab
          </Link>
          <Link href="/work" className="transition-colors hover:text-ink">
            Work
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 pb-10">
        <p className="text-xs text-ink-faint">
          Built with Next.js and the Web Audio API. Every demo runs entirely in
          your browser — no audio is uploaded or recorded.
        </p>
      </div>
    </footer>
  );
}

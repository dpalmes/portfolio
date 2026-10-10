import type { ReactNode } from "react";
import { Container, Eyebrow } from "@/components/ui";

/**
 * Policy pages for the Comic Story Animations publishing tool. TikTok's
 * developer portal requires public privacy and terms URLs before it will
 * register an app, so these exist for that. They are deliberately left out of
 * the navigation and the sitemap and marked noindex: they belong to a side
 * project, not to the portfolio.
 */
export const effectiveDate = "11 October 2026";
export const toolName = "Comic Reel Publisher";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="py-16 sm:py-20">
      <article className="max-w-2xl">
        <Eyebrow>Comic Story Animations</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-3 font-mono text-sm text-ink-faint">Effective {effectiveDate}</p>
        <div className="mt-10 space-y-8 leading-relaxed text-ink-muted">{children}</div>
      </article>
    </Container>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium text-ink">{heading}</h2>
      {children}
    </section>
  );
}

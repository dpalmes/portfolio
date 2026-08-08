import type { Metadata } from "next";
import { ArrowIcon, ButtonLink, Container, Eyebrow } from "@/components/ui";
import { activeSocials, displayName, site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: site.intro,
};

export default function AboutPage() {
  return (
    <Container className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <Eyebrow>About</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">{displayName}</h1>
        <p className="mt-3 text-lg text-ink-muted">{site.role}</p>

        <div className="mt-8 space-y-5">
          {site.bio.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-ink-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {site.roles.length > 0 ? (
        <section className="mt-16 max-w-2xl">
          <h2 className="font-mono text-xs tracking-[0.14em] text-accent uppercase">
            Experience
          </h2>
          <ol className="mt-6 space-y-8">
            {site.roles.map((role) => (
              <li key={`${role.organisation}-${role.title}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-display text-lg font-semibold">
                    {role.title}
                    <span className="text-ink-muted"> · {role.organisation}</span>
                  </h3>
                  <span className="font-mono text-xs text-ink-faint">
                    {role.period}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-ink-muted">
                  {role.summary}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="mt-16 max-w-2xl border-t border-line pt-10">
        <h2 className="font-display text-xl font-semibold">
          How this site is built
        </h2>
        <p className="mt-4 leading-relaxed text-ink-muted">
          Next.js and React on the front, Tailwind for styling, and no audio
          libraries at all — the pitch detection, the sequencer clock and the
          music theory are written from scratch and covered by 154 unit tests
          that run in Node in well under a second.
        </p>
        <p className="mt-4 leading-relaxed text-ink-muted">
          The hero graphic on the front page is generated at build time by the
          same pitch-detection code the tuner uses, which felt more honest than
          drawing a picture of it.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href={`mailto:${site.email}`}>{site.email}</ButtonLink>
          <ButtonLink href="/lab" variant="secondary">
            Try the demos
            <ArrowIcon />
          </ButtonLink>
          {activeSocials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-sm text-ink-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-accent"
            >
              {social.label}
            </a>
          ))}
        </div>
      </section>
    </Container>
  );
}

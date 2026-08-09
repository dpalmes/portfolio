import type { Metadata } from "next";
import { ArrowIcon, ButtonLink, Container, Eyebrow, Tag } from "@/components/ui";
import { activeSocials, displayName, site } from "@/content/site";
import { stats } from "@/content/stats";

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
        {site.location ? (
          <p className="mt-1 font-mono text-sm text-ink-faint">
            {site.location}
          </p>
        ) : null}

        <div className="mt-8 space-y-5">
          {site.bio.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed text-ink-muted">
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {site.skills.length > 0 ? (
        <section className="mt-16">
          <SectionLabel>Skills</SectionLabel>
          <dl className="mt-6 grid gap-6 sm:grid-cols-3">
            {site.skills.map((group) => (
              <div key={group.label}>
                <dt className="text-sm font-medium text-ink">{group.label}</dt>
                <dd>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <li key={item}>
                        <Tag>{item}</Tag>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {site.roles.length > 0 ? (
        <section className="mt-16">
          <SectionLabel>Experience</SectionLabel>
          <ol className="mt-6 space-y-12">
            {site.roles.map((role) => (
              <li
                key={`${role.organisation}-${role.title}`}
                className="grid gap-4 md:grid-cols-[13rem_1fr]"
              >
                <div>
                  <p className="font-mono text-xs text-ink-faint">
                    {role.period}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold">
                    {role.organisation}
                  </p>
                </div>

                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {role.title}
                  </h3>
                  <p className="mt-2 max-w-2xl leading-relaxed text-ink-muted">
                    {role.summary}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {role.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-px w-4 shrink-0 bg-accent"
                        />
                        <span className="leading-relaxed">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {site.education.length > 0 ? (
        <section className="mt-16">
          <SectionLabel>Education</SectionLabel>
          <ol className="mt-6 space-y-8">
            {site.education.map((entry) => (
              <li
                key={entry.institution}
                className="grid gap-4 md:grid-cols-[13rem_1fr]"
              >
                <p className="font-mono text-xs text-ink-faint">
                  {entry.period}
                </p>
                <div>
                  <h3 className="font-display text-lg font-semibold">
                    {entry.qualification}
                  </h3>
                  <p className="mt-1 text-ink-muted">{entry.institution}</p>
                  <ul className="mt-3 space-y-1.5">
                    {entry.notes.map((note) => (
                      <li
                        key={note}
                        className="flex gap-3 text-sm text-ink-muted"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-px w-4 shrink-0 bg-accent"
                        />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
          music theory are written from scratch and covered by {stats.tests}{" "}
          unit tests that run in Node in well under a second.
        </p>
        <p className="mt-4 leading-relaxed text-ink-muted">
          The curve on the front page is generated at build time by the same
          pitch-detection code the tuner uses, which felt more honest than
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

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="border-b border-line pb-3 font-mono text-xs tracking-[0.14em] text-accent uppercase">
      {children}
    </h2>
  );
}

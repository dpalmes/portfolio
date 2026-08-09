import { HeroCurve } from "@/components/hero-curve";
import { ProjectCard } from "@/components/project-card";
import {
  ArrowIcon,
  ButtonLink,
  Container,
  Eyebrow,
  SectionHeading,
  Stat,
  Tag,
} from "@/components/ui";
import { externalProjects, projects } from "@/content/projects";
import { activeSocials, displayName, site } from "@/content/site";
import { stats } from "@/content/stats";

export default function HomePage() {
  const [currentRole] = site.roles;

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="bg-grid pointer-events-none absolute inset-0 opacity-60"
        />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-2xl">
            <Eyebrow>Java · Kafka · GCP · TypeScript</Eyebrow>
            <h1 className="text-4xl leading-[1.05] font-semibold sm:text-6xl">
              {displayName}
              <span className="text-accent">.</span>
            </h1>
            <p className="mt-5 font-display text-xl text-ink sm:text-2xl">
              {site.role}
            </p>
            <p className="mt-5 max-w-xl leading-relaxed text-ink-muted">
              {site.intro}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/about">
                About me
                <ArrowIcon />
              </ButtonLink>
              <ButtonLink href="/lab" variant="secondary">
                Try the demos
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {currentRole ? (
        <section className="border-b border-line py-16 sm:py-20">
          <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
              <div>
                <Eyebrow>Currently</Eyebrow>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  {currentRole.title}
                </h2>
                <p className="mt-2 text-lg text-ink-muted">
                  {currentRole.organisation}
                  <span className="text-ink-faint">
                    {" "}
                    · {currentRole.period}
                  </span>
                </p>
                <p className="mt-5 leading-relaxed text-ink-muted">
                  {currentRole.summary}
                </p>
                <ButtonLink
                  href="/about"
                  variant="secondary"
                  className="mt-7"
                >
                  Full background
                  <ArrowIcon />
                </ButtonLink>
              </div>

              <div>
                <ul className="space-y-3">
                  {currentRole.highlights.slice(0, 4).map((highlight) => (
                    <li
                      key={highlight}
                      className="flex gap-3 text-ink-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2.5 h-px w-4 shrink-0 bg-accent"
                      />
                      <span className="leading-relaxed">{highlight}</span>
                    </li>
                  ))}
                </ul>

                <ul className="mt-8 flex flex-wrap gap-1.5">
                  {site.skills
                    .flatMap((group) => group.items)
                    .slice(0, 14)
                    .map((item) => (
                      <li key={item}>
                        <Tag>{item}</Tag>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>
      ) : null}

      <section className="py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Lab"
            title="Three things that had to be built, not installed"
            description="Real-time problems, taken apart in the browser: pitch detection, sample-accurate scheduling, and chord-shape search. Each runs on a tested, dependency-free core, and the case studies explain the algorithm behind it."
            action={
              <ButtonLink href="/lab" variant="secondary">
                All demos
                <ArrowIcon />
              </ButtonLink>
            }
          />

          <HeroCurve className="mb-10" />

          <div className="grid gap-5 md:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-line bg-surface py-16">
        <Container>
          <Eyebrow>How it is built</Eyebrow>
          <dl className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <Stat
              label="Tests"
              value={stats.tests}
              hint="Pure logic, run in Node — no browser needed"
            />
            <Stat
              label="Audio deps"
              value={stats.audioDependencies}
              hint="YIN, scheduling and theory written from scratch"
            />
            <Stat
              label="Pitch accuracy"
              value="<1¢"
              hint="Across the guitar range, on synthetic tones"
            />
            <Stat
              label="Timing drift"
              value="0"
              hint="Proven over 200 irregular polling intervals"
            />
          </dl>

          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink-muted">
            The interesting logic here is deliberately kept away from the DOM.
            Pitch detection takes an array of samples and a sample rate; the
            sequencer&rsquo;s clock is told what time it is and asked what is
            due. Neither knows the browser exists, which is why both can be
            tested exhaustively in a fifth of a second instead of driven through
            a headless browser and hoped over.
          </p>
        </Container>
      </section>

      {externalProjects.length > 0 ? (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading
              eyebrow="Elsewhere"
              title="Also building"
              description="Work that lives in its own repository."
            />
            <ul className="grid gap-5 sm:grid-cols-2">
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
                  {project.href ? (
                    <a
                      href={project.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
                    >
                      View project
                      <ArrowIcon />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      <section className="pb-8">
        <Container>
          <div className="panel relative overflow-hidden p-8 sm:p-12">
            <div
              aria-hidden="true"
              className="bg-grid pointer-events-none absolute inset-0 opacity-40"
            />
            <div className="relative max-w-xl">
              <Eyebrow>Contact</Eyebrow>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Get in touch
              </h2>
              <p className="mt-3 text-ink-muted">
                The quickest way to reach me is email. I read everything.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href={`mailto:${site.email}`}>
                  {site.email}
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
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

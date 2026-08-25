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
import { externalProjects, labProjects } from "@/content/projects";
import { automationProjects } from "@/content/automation-projects";
import { backendProjects } from "@/content/backend-projects";
import { productProjects } from "@/content/product-projects";
import { activeSocials, displayName, site } from "@/content/site";
import { totalTests } from "@/content/stats";

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
            <Eyebrow>Java · Middleware · Kafka · Cloud</Eyebrow>
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
            eyebrow="Backend"
            title="Java services, built to be tested"
            description="Streaming, middleware and API security — the same problems as the day job, taken apart in repositories you can build and run. Each one is covered by a suite that needs no broker, no backend and no Docker."
            action={
              <ButtonLink href="/work" variant="secondary">
                All case studies
                <ArrowIcon />
              </ButtonLink>
            }
          />

          <div className="grid gap-5 md:grid-cols-3">
            {backendProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Automation"
            title="AI put to work, with the same discipline"
            description="A receipt-extraction pipeline where code verifies every number the model produces, and a lead-triage workflow for n8n where the model answers one narrow question and tested rules decide the rest. Multi-provider — Claude, GPT, Gemini, Groq — and every suite runs with no API key."
            action={
              <ButtonLink href="/work" variant="secondary">
                Case studies
                <ArrowIcon />
              </ButtonLink>
            }
          />

          <div className="grid gap-5 md:grid-cols-2">
            {automationProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Products"
            title="Three products, built from the rules outward"
            description="A resort booking engine, a coffee shop's reservations and menu, and a store's inventory and till. Each one is the half of the product worth building carefully — the rules that decide what can be sold, and what happens when the answer is no."
            action={
              <ButtonLink href="/lab" variant="secondary">
                Try them
                <ArrowIcon />
              </ButtonLink>
            }
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {productProjects.map((project) => (
              <ProjectCard key={project.slug} project={project} />
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-20 sm:py-24">
        <Container>
          <SectionHeading
            eyebrow="Lab"
            title="And three that run on algorithms"
            description="Pitch detection, sample-accurate scheduling and chord-shape search, written from the algorithms up with no audio libraries. Same instinct as the backend work, somewhere you can hear the result."
            action={
              <ButtonLink href="/lab" variant="secondary">
                All demos
                <ArrowIcon />
              </ButtonLink>
            }
          />

          <HeroCurve className="mb-10" />

          <div className="grid gap-5 md:grid-cols-3">
            {labProjects.map((project) => (
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
              value={totalTests}
              hint="Across four repositories, Java and TypeScript"
            />
            <Stat
              label="Infrastructure to run them"
              value="None"
              hint="No broker, no database, no Docker, no backend"
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
            The same rule runs through all of it: keep the logic that matters
            away from the infrastructure it happens to run on. A Kafka topology
            is a pure function from config to a topology object, so the whole
            pipeline runs under a test driver with event time controlled to the
            millisecond. Pitch detection takes an array of samples and a sample
            rate. Neither knows what it is deployed into, which is why the
            awkward cases — a duplicate delivery, an event arriving after its
            window closed, a backend that fails twice and then recovers — are
            ordinary unit tests instead of a QA exercise.
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

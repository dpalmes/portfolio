import type { Metadata } from "next";
import Link from "next/link";
import { SecureApiDemo } from "@/components/lab/secure-api-demo";
import { ArrowIcon, Container, Eyebrow } from "@/components/ui";
import { getProject } from "@/content/projects";

export const metadata: Metadata = {
  title: "Secure API — live",
  description:
    "A live walkthrough of a deployed Spring Security API: object-level authorization, PII masking by scope, and per-caller rate limiting, shown as real HTTP traffic.",
};

export default function SecureApiLabPage() {
  const project = getProject("secure-api");

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
        <Eyebrow>Live service · Spring Security</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">Secure API</h1>
        <p className="mt-3 text-lg text-ink-muted">
          A real Java service, deployed and answering
        </p>
        <p className="mt-5 leading-relaxed text-ink-muted">
          Everything below is a genuine HTTP request to a running Spring Boot
          application, not a simulation in the page. The tokens are minted by
          the service for a tenant created just for you, so you are exercising
          the same authorization rules as any other caller — including the ones
          that stop you reading somebody else&rsquo;s data.
        </p>
      </header>

      <div className="mt-10">
        <SecureApiDemo />
      </div>

      <section className="mt-14 max-w-2xl border-t border-line pt-8">
        <h2 className="font-display text-xl font-semibold">
          Why a demo API can be safely public
        </h2>
        <div className="mt-4 space-y-4 leading-relaxed text-ink-muted">
          <p>
            A browser cannot be trusted with a signing key, so it never gets
            one. The page asks the service for a session, and the service mints
            short-lived tokens for a randomly generated tenant with a fixed set
            of scopes. The caller chooses nothing — a parameter for the tenant or
            the scopes would turn that endpoint into &ldquo;mint me any
            token&rdquo;, which is the same as publishing the key.
          </p>
          <p>
            Giving every visitor their own tenant is also what makes a shared
            in-memory store safe in public: two people clicking at the same
            moment cannot see each other&rsquo;s records, because the
            authorization rules this page is demonstrating are the same ones
            keeping them apart.
          </p>
          <p>
            The store is capped and evicts the oldest entries, the service caps
            its own instance count, and every endpoint is rate limited. A public
            demo is a public load generator, and the interesting part of
            deploying one is deciding what it must refuse to do.
          </p>
        </div>

        {project ? (
          <Link
            href={`/work/${project.slug}`}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
          >
            Read the full case study
            <ArrowIcon />
          </Link>
        ) : null}
      </section>
    </Container>
  );
}

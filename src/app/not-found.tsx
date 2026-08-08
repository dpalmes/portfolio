import { ArrowIcon, ButtonLink, Container, Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <Container className="py-24 sm:py-32">
      <div className="max-w-xl">
        <Eyebrow>404</Eyebrow>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Nothing here
        </h1>
        <p className="mt-4 leading-relaxed text-ink-muted">
          That page does not exist. The demos are the best place to start.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/lab">
            Go to the lab
            <ArrowIcon />
          </ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { displayName, site } from "@/content/site";
import { LegalPage, Section, toolName } from "../legal-page";

export const metadata: Metadata = {
  title: `${toolName}: Terms of Service`,
  description: `Terms for ${toolName}, the publishing tool behind Comic Story Animations.`,
  robots: { index: false, follow: false },
};

export default function ComicReelTermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <Section heading="What this is">
        <p>
          {toolName} is a personal tool run by {displayName} to publish Comic Story Animations videos, created by
          the operator, to the operator&apos;s own YouTube, Instagram and TikTok accounts. It is not offered to the public, and
          no one other than the operator may use it.
        </p>
      </Section>

      <Section heading="Use of the platforms">
        <p>
          The tool is used in line with the terms and policies of each platform it connects to, including the
          TikTok Developer Terms of Service, the Meta Platform Terms and the YouTube API Services Terms of
          Service. Content published through it follows each platform&apos;s community guidelines, and
          AI-generated narration is labelled where the platform asks for it.
        </p>
      </Section>

      <Section heading="Content">
        <p>
          The operator is responsible for everything published through the tool. Comic book covers and characters
          belong to their respective owners and appear for commentary and education.
        </p>
      </Section>

      <Section heading="No warranty">
        <p>
          The tool is provided as is, without warranties of any kind. The operator may change or stop it at any
          time.
        </p>
      </Section>

      <Section heading="Privacy">
        <p>
          How the tool handles data is described in the{" "}
          <Link className="text-ink underline" href="/legal/comic-reel/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions:{" "}
          <a className="text-ink underline" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

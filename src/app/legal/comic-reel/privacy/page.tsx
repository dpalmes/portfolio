import type { Metadata } from "next";
import { displayName, site } from "@/content/site";
import { LegalPage, Section, toolName } from "../legal-page";

export const metadata: Metadata = {
  title: `${toolName}: Privacy Policy`,
  description: `How ${toolName}, the publishing tool behind Comic Story Animations, handles data.`,
  robots: { index: false, follow: false },
};

export default function ComicReelPrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {toolName} is a personal tool run by {displayName}. It publishes videos for the Comic Story Animations
        channels, created by the operator, to the operator&apos;s own accounts on YouTube, Instagram
        and TikTok. It is not a public service: nobody else can sign in to it or use it.
      </p>

      <Section heading="What the tool accesses">
        <p>
          When an account is connected, the platform issues an access token for the
          permissions approved. On TikTok these are basic profile information (<code>user.info.basic</code>),
          used to confirm the right account is connected, and uploading videos to that account&apos;s drafts
          (<code>video.upload</code>). On Instagram and YouTube the permissions cover publishing videos and
          reading the account&apos;s own basic profile.
        </p>
        <p>
          The tool does not access, collect or store information about any other person, including viewers,
          followers or commenters.
        </p>
      </Section>

      <Section heading="Where data is kept">
        <p>
          Access tokens and app credentials are stored only in local files on the operator&apos;s own computer.
          They are not sent to any server other than the platform that issued them. Videos are sent only to the
          platform they are being published to.
        </p>
      </Section>

      <Section heading="Sharing">
        <p>
          No data is sold, rented or shared with third parties, and none is used for advertising or analytics.
        </p>
      </Section>

      <Section heading="Retention and deletion">
        <p>
          Tokens are kept only while the tool is in use and can be deleted at any time by removing the local
          files. Access can also be revoked from the platform&apos;s own settings, for example TikTok&apos;s
          <em> Manage app permissions</em> or Instagram&apos;s <em>Apps and websites</em>.
        </p>
      </Section>

      <Section heading="Children">
        <p>The tool is not directed at children and does not knowingly process children&apos;s data.</p>
      </Section>

      <Section heading="Changes and contact">
        <p>
          If this policy changes, the effective date above will be updated. Questions:{" "}
          <a className="text-ink underline" href={`mailto:${site.email}`}>
            {site.email}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}

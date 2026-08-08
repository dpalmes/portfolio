/**
 * Everything personal lives here.
 *
 * The rest of the site reads from this file, so editing it is the whole job of
 * making the portfolio yours — no hunting through components for hard-coded
 * strings.
 *
 * Fields marked TODO are placeholders. They are deliberately *not* filled with
 * invented detail: a portfolio that claims employers or timelines you did not
 * have is worse than one with a gap. Anything left empty is simply not
 * rendered, so the site looks finished either way.
 */

export interface SocialLink {
  label: string;
  href: string;
}

export interface Role {
  title: string;
  organisation: string;
  period: string;
  summary: string;
}

export interface Site {
  name: string;
  surname: string;
  role: string;
  intro: string;
  bio: string[];
  email: string;
  socials: SocialLink[];
  roles: Role[];
  url: string;
  location: string;
}

export const site: Site = {
  /** Used in the browser tab, structured data, and the footer. */
  name: "Vince",

  /** TODO: your surname, if you want it shown. Leave "" to display first name only. */
  surname: "",

  /** One line, shown under the hero heading. Say what you build, not what you are. */
  role: "Software engineer building things you can hear",

  /**
   * The hero sentence. Two or three lines at most — anything longer stops being
   * read.
   */
  intro:
    "I build interactive audio on the web: pitch detection, sequencing, and music theory implemented from the algorithms up rather than pulled off the shelf. Everything on this site runs in your browser, and the code behind it is tested.",

  /** Longer bio for the About section. */
  bio: [
    "I like problems where the correct answer is checkable. Signal processing and music theory both qualify: a tuner is either reporting the right note or it isn't, and a chord either contains the notes it claims to or it doesn't. That makes them unusually satisfying to build — and unusually easy to test.",
    "TODO: replace this paragraph with your own background — how you got into engineering, what you're looking for, what you're currently working on.",
  ],

  /** TODO: set to your public email, or leave as-is. */
  email: "dvdpalmes@gmail.com",

  /** TODO: fill in the ones you use; delete the rest. Empty hrefs are hidden. */
  socials: [
    { label: "GitHub", href: "" },
    { label: "LinkedIn", href: "" },
  ],

  /**
   * TODO: your own history. Left empty by default — the Experience section
   * disappears entirely rather than showing placeholder jobs.
   */
  roles: [],

  /** Canonical origin, used for metadata and Open Graph URLs. */
  url: "https://example.com",

  /** Shown in the footer. */
  location: "",
};

export const displayName = [site.name, site.surname].filter(Boolean).join(" ");

export const activeSocials = site.socials.filter((link) => link.href.length > 0);

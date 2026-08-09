/**
 * Everything personal lives here.
 *
 * The rest of the site reads from this file, so editing it is the whole job of
 * keeping the portfolio current — no hunting through components for hard-coded
 * strings.
 *
 * Details are taken from the CV. Two things were deliberately left out:
 * the mobile number, because publishing one on a public page mostly attracts
 * spam (add it below if you disagree), and `url`, which needs the real domain
 * before deploying.
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
  /** Selected achievements. Keep these concrete and measurable. */
  highlights: string[];
}

export interface Education {
  qualification: string;
  institution: string;
  period: string;
  notes: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Site {
  name: string;
  surname: string;
  /** Used for the compact wordmark in the header and footer. */
  shortName: string;
  role: string;
  intro: string;
  bio: string[];
  email: string;
  /** Optional. Left empty on purpose — see the note at the top of this file. */
  phone: string;
  socials: SocialLink[];
  roles: Role[];
  education: Education[];
  skills: SkillGroup[];
  url: string;
  location: string;
}

export const site: Site = {
  name: "Dann Vincent",
  surname: "Palmes",
  shortName: "Vince",

  role: "Software engineer — backend systems and real-time data",

  intro:
    "I build backend services and streaming data pipelines. For the past three years that has meant systems at Globe Telecom that carry subscriber data for more than 70 million people — Java and Quarkus microservices, Kafka pipelines, and the encryption and KYC plumbing underneath them.",

  bio: [
    "I am a software engineer in Bay, Laguna, working on backend systems and real-time data at Globe Telecom. Most of what I do is unglamorous and load-bearing: moving subscriber records between Snowflake, Aerospike and cloud storage without losing any, resolving queued messages fast enough that a promo notification is still worth sending, encrypting things that must stay encrypted.",
    "Working at that scale teaches you to distrust code you cannot check. A pipeline that is subtly wrong about 70 million records is worse than one that is loudly broken, so I have ended up caring a great deal about the boundary between logic you can test and infrastructure you can only observe.",
    "The demos on this site come out of the same instinct, applied somewhere less serious. Pitch detection and step sequencing are real-time problems with checkable answers: a tuner is either reporting the right note or it is not, and a beat either lands on time or it does not. Building them from the algorithms up, with the logic kept away from the browser so it could be tested properly, was the point.",
  ],

  email: "dvdpalmes@gmail.com",
  phone: "",

  socials: [
    {
      label: "LinkedIn",
      href: "https://linkedin.com/in/dann-vincent-palmes-71245a207",
    },
    // TODO: add your GitHub profile URL to show it in the header and footer.
    { label: "GitHub", href: "" },
  ],

  roles: [
    {
      // Non-breaking space before the slash so a line break never leaves the
      // "/" stranded at the start of the next line.
      title: "Java Developer / Data Engineer",
      organisation: "Globe Telecom",
      period: "Sep 2022 – Present",
      summary:
        "Backend and data engineering on nationwide subscriber systems, from SIM registration and KYC through to the real-time pipelines that feed promotions and business intelligence.",
      highlights: [
        "Built and deployed microservices handling nationwide SIM registration data for more than 70 million subscribers.",
        "Developed a Snowflake-to-Aerospike pipeline keeping 70M+ subscriber records updated daily.",
        "Built a Kafka-based real-time system for subscriber data, enabling faster promo provisioning and BI insights.",
        "Built a scalable Quarkus queue-message resolver on Kafka for high-throughput promo notifications over email, SMS and push.",
        "Developed a core encryption and decryption API using Ubiq structured encryption.",
        "Built AWS S3 and Google Cloud Storage integrations to process file-based subscriber events as part of a KYC system.",
        "Developed a geo-detection system that improved subscriber location accuracy for targeted campaigns.",
        "Designed reusable core services — Cloud Storage to Aerospike, Kafka to Cloud Storage, Aerospike CRUD — standardising integration across projects.",
      ],
    },
    {
      title: "Software Engineer Intern",
      organisation: "Honeywell Philippines",
      period: "Jul 2021 – Oct 2021",
      summary: "Automation and test tooling for internal ERP workflows.",
      highlights: [
        "Automated ERP workflows, cutting manual effort by 40% with data-driven scripts.",
        "Built Ranorex test suites that were adopted across internal teams.",
      ],
    },
  ],

  education: [
    {
      qualification: "BS Computer Science",
      institution: "University of the Philippines – Los Baños",
      period: "2018 – 2022",
      notes: [
        "Graduated Cum Laude (1.70 UPGPA)",
        "UP Presidential Undergraduate Scholar, 2019–2022",
        "PhilDev Foundation Scholar, 2020–2022",
      ],
    },
  ],

  skills: [
    {
      label: "Languages & frameworks",
      items: [
        "Java",
        "Spring Boot",
        "Quarkus",
        "Apache Camel",
        "Python",
        "TypeScript",
        "R",
        "Flutter",
      ],
    },
    {
      label: "Data & messaging",
      items: [
        "Kafka",
        "SQL",
        "Aerospike",
        "Snowflake",
        "DynamoDB",
        "Firebase",
      ],
    },
    {
      label: "Cloud & DevOps",
      items: [
        "GCP",
        "AWS",
        "Kubernetes",
        "OpenShift",
        "Jenkins",
        "ArgoCD",
      ],
    },
  ],

  // TODO: set this to your real domain before deploying. It is the base for
  // canonical URLs, the sitemap and the Open Graph tags.
  url: "https://example.com",

  location: "Bay, Laguna, Philippines",
};

export const displayName = [site.name, site.surname].filter(Boolean).join(" ");

export const activeSocials = site.socials.filter((link) => link.href.length > 0);

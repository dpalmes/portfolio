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

/**
 * Your own domain, once you have one. Setting this wins over everything else,
 * because a custom domain is a deliberate choice and a platform-generated URL
 * is not.
 */
const CUSTOM_DOMAIN = "";

/**
 * The base for canonical URLs, the sitemap and the Open Graph tags.
 *
 * This is resolved rather than written down because getting it wrong is
 * expensive and silent: a placeholder shipped to production tells every
 * crawler that the canonical home of these pages is somewhere else, and
 * nothing about the site looks broken while it happens.
 *
 * Vercel exposes the project's production domain to the build as
 * VERCEL_PROJECT_PRODUCTION_URL, without a scheme, and points it at a custom
 * domain once one is attached. Using it means the first deploy is already
 * correct and stays correct.
 */
function resolveSiteUrl(): string {
  if (CUSTOM_DOMAIN) return CUSTOM_DOMAIN;

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelDomain) return `https://${vercelDomain}`;

  // Local development. Absolute because metadataBase demands one.
  return "http://localhost:3000";
}

export const site: Site = {
  name: "Dann Vincent",
  surname: "Palmes",
  shortName: "Vince",

  role: "Software engineer — backend Java, middleware and real-time data",

  intro:
    "I build backend services and integration layers for telecom systems. Four years of Java: at Vocus, the middleware carrying orders between Australia\u2019s national broadband network and the providers reselling it, and before that the Kafka pipelines and microservices at Globe Telecom that carried subscriber data for more than 70 million people.",

  bio: [
    "I am a software engineer in Bay, Laguna, working on enterprise Java and systems integration for Vocus through Tech Mahindra. The work sits in the middle of things, literally: the middleware between NBN \u2014 the government-owned network most Australian broadband runs over \u2014 and the retail providers reselling it. An order has to cross an organisational boundary intact, and when it does not, somebody has to be able to say which side it stopped on.",
    "Before that I spent nearly four years at Globe Telecom on backend and data engineering — moving subscriber records between Snowflake, Aerospike and cloud storage without losing any, resolving queued messages fast enough that a promo notification was still worth sending, encrypting things that had to stay encrypted.",
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
    { label: "GitHub", href: "https://github.com/dpalmes" },
  ],

  roles: [
    {
      title: "Software Engineer — Java / Middleware",
      organisation: "Vocus (via Tech Mahindra)",
      period: "Jul 2026 – Present",
      summary:
        "Middleware and web-service integration for Vocus's wholesale broadband business — the systems carrying orders between NBN, Australia's government-owned national network, and the retail providers reselling it — across the full lifecycle from interpreting a requirement through development and testing to production support.",
      // Scope rather than measured results: this role started in July 2026.
      // The shape of the work is accurate; add numbers — order volumes,
      // throughput, the size of an incident avoided — as they become
      // quotable, the way the Globe entry below reads.
      highlights: [
        "Order and provisioning traffic in both directions: a reseller's order turned into a request NBN will accept, and NBN's response turned back into something the reseller's own systems can act on.",
        "Integration over SOAP and REST across BSS, OSS and product platforms, exercised and debugged with SoapUI — the far end is somebody else's system, so most of the work is agreeing precisely what each side promises.",
        "Core Java middleware — EJB, JPA and Hibernate, built with Maven and deployed to JBoss/WildFly.",
        "Production support on that integration — tracing an order that stalled somewhere between the two sides and establishing which side it stalled on, working the data back through SQL Server in SSMS.",
        "Full SDLC in an Agile team — analysis, development, automated testing, profiling, deployment and support — with design specifications and process documentation alongside it.",
        "Works across testing, product, network operations and project management teams.",
      ],
    },
    {
      // Non-breaking space before the slash so a line break never leaves the
      // "/" stranded at the start of the next line.
      title: "Java Developer / Data Engineer",
      organisation: "Globe Telecom",
      period: "Sep 2022 – Jul 2026",
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
        "EJB",
        "JPA",
        "Hibernate",
        "Apache Camel",
        "Maven",
        "Python",
        "TypeScript",
        "R",
        "Flutter",
      ],
    },
    {
      label: "Integration & messaging",
      items: [
        "Kafka",
        "REST",
        "SOAP",
        "SQL",
        "SQL Server",
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
        "JBoss/WildFly",
        "Jenkins",
        "ArgoCD",
      ],
    },
    {
      label: "Tools",
      items: ["SoapUI", "SSMS", "Maven", "Git"],
    },
    {
      label: "AI & Automation",
      items: [
        "LLM APIs (Claude, GPT, Gemini, Groq)",
        "n8n",
        "Prompt evals",
        "Python",
      ],
    },
  ],

  url: resolveSiteUrl(),

  location: "Bay, Laguna, Philippines",
};

export const displayName = [site.name, site.surname].filter(Boolean).join(" ");

export const activeSocials = site.socials.filter((link) => link.href.length > 0);

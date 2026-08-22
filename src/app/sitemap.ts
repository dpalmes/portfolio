import type { MetadataRoute } from "next";
import { allProjects } from "@/content/projects";
import { site } from "@/content/site";

/**
 * Derived from `allProjects` — the same list `/work/[slug]` generates its
 * pages from — rather than from one category of project. An earlier version
 * iterated only the audio projects, so every backend case study and every
 * product demo added afterwards was missing from the sitemap without anything
 * appearing broken. `sitemap.test.ts` now fails if the two drift apart again.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/lab", "/work", "/about"];
  const demoRoutes = allProjects
    .map((project) => project.demoHref)
    .filter((href): href is string => Boolean(href));
  const caseStudyRoutes = allProjects.map((project) => `/work/${project.slug}`);

  return [...staticRoutes, ...demoRoutes, ...caseStudyRoutes].map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}

import type { MetadataRoute } from "next";
import { projects } from "@/content/projects";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/lab", "/work", "/about"];
  const demoRoutes = projects.map((project) => project.demoHref);
  const caseStudyRoutes = projects.map((project) => `/work/${project.slug}`);

  return [...staticRoutes, ...demoRoutes, ...caseStudyRoutes].map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}

import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { allProjects } from "@/content/projects";
import { site } from "@/content/site";

const paths = () =>
  sitemap().map((entry) => entry.url.replace(site.url, "") || "/");

describe("sitemap", () => {
  it("lists a case study for every project", () => {
    // The regression this exists for: the sitemap iterated one category of
    // project, so anything added to another category was silently unlisted.
    for (const project of allProjects) {
      expect(paths()).toContain(`/work/${project.slug}`);
    }
  });

  it("lists the demo page of every project that has one", () => {
    for (const project of allProjects) {
      if (!project.demoHref) continue;
      expect(paths()).toContain(project.demoHref);
    }
  });

  it("covers each project category, not just the first", () => {
    // Named explicitly so deleting a whole category is a deliberate act
    // rather than something a broken derivation does quietly.
    expect(paths()).toContain("/work/secure-api");
    expect(paths()).toContain("/work/invoice-extraction");
    expect(paths()).toContain("/work/resort");
    expect(paths()).toContain("/work/tuner");
    expect(paths()).toContain("/lab/crm");
  });

  it("has no duplicates and no relative or malformed URLs", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const url of urls) expect(() => new URL(url)).not.toThrow();
  });
});

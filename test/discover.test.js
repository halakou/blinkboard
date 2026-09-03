import test from "node:test";
import assert from "node:assert/strict";
import { robotsTxt, sitemapXml, llmsTxt, openApiSpec } from "../src/discover.js";
import { pageMarkdown } from "../src/html.js";

test("robots and sitemap point at public origin", () => {
  const r = robotsTxt("https://blinkboard.pages.dev");
  assert.ok(r.includes("Sitemap: https://blinkboard.pages.dev/sitemap.xml"));
  assert.ok(r.includes("Disallow: /admin"));
  const s = sitemapXml("https://blinkboard.pages.dev");
  assert.ok(s.includes("/preview"));
  assert.ok(s.includes("/how"));
  assert.ok(s.includes("/faq"));
});

test("llms.txt and openapi mention live API", () => {
  const t = llmsTxt("https://blinkboard.pages.dev");
  assert.ok(t.includes("/api/live"));
  const spec = openApiSpec("https://blinkboard.pages.dev");
  assert.equal(spec.openapi, "3.1.0");
  assert.ok(spec.paths["/api/plans"]);
});

test("markdown pages exist", () => {
  assert.ok(pageMarkdown("how").startsWith("# "));
  assert.ok(pageMarkdown("faq").includes("Stars"));
});

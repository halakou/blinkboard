import test from "node:test";
import assert from "node:assert/strict";
import { robotsTxt, sitemapXml, llmsTxt, openApiSpec, securityTxt, jsonLd, aiTxt, pageJsonLd } from "../src/discover.js";
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

test("security.txt has contact and expiry", () => {
  const s = securityTxt("https://blinkboard.pages.dev");
  assert.ok(s.includes("Contact: https://t.me/BlinkboardBot"));
  assert.ok(s.includes("Expires: "));
  assert.ok(s.includes("Canonical: https://blinkboard.pages.dev/.well-known/security.txt"));
  assert.ok(s.includes("Policy: https://blinkboard.pages.dev/rules"));
});

test("json-ld names the product", () => {
  const j = jsonLd("https://blinkboard.pages.dev");
  assert.equal(j["@context"], "https://schema.org");
  assert.ok(j["@graph"].some((n) => n["@type"] === "SoftwareApplication" && n.name === "Blinkboard"));
  assert.ok(j["@graph"].some((n) => n["@type"] === "WebSite"));
  assert.ok(j["@graph"].some((n) => n["@type"] === "FAQPage" && n.mainEntity.length === 5));
});

test("sitemap has lastmod and llms-full", () => {
  const s = sitemapXml("https://blinkboard.pages.dev");
  assert.ok(s.includes("<lastmod>2026-09-04</lastmod>"));
  assert.ok(s.includes("/llms-full.txt"));
  assert.ok(s.includes("<priority>1.0</priority>"));
});

test("ai.txt and extra AI bots", () => {
  const r = robotsTxt("https://blinkboard.pages.dev");
  assert.ok(r.includes("User-agent: Claude-Web"));
  assert.ok(r.includes("User-agent: Applebot-Extended"));
  const a = aiTxt("https://blinkboard.pages.dev");
  assert.ok(a.includes("Allow: /api/live"));
  assert.ok(a.includes("https://blinkboard.pages.dev/llms.txt"));
});

test("page JSON-LD keeps FAQ only on /faq", () => {
  const home = pageJsonLd("https://blinkboard.pages.dev", { path: "/", title: "Home" });
  assert.ok(!home["@graph"].some((n) => n["@type"] === "FAQPage"));
  const faq = pageJsonLd("https://blinkboard.pages.dev", { path: "/faq", title: "FAQ" });
  assert.ok(faq["@graph"].some((n) => n["@type"] === "FAQPage"));
  assert.ok(faq["@graph"].some((n) => n["@type"] === "BreadcrumbList"));
});

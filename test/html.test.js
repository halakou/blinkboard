import test from "node:test";
import assert from "node:assert/strict";
import { renderBoard, renderPreview, renderSampleIndex } from "../src/html.js";

test("board HTML escapes user title and body", () => {
  const html = renderBoard({
    code: "A2B3",
    kind: "promo",
    title: '<img src=x onerror="alert(1)">',
    body: "Hello <script>alert(1)</script>",
    cta_url: "https://example.com/a",
    expires_at: Date.now() + 1000,
  }, "https://blinkboard.pages.dev");
  assert.equal(html.includes("<script>alert"), false);
  assert.equal(html.includes("<img src=x"), false);
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("https://example.com/a"));
  assert.ok(html.includes("/a/A2B3"));
});

test("preview includes sample image and qr", () => {
  const html = renderPreview("poster", "https://blinkboard.pages.dev");
  assert.ok(html.includes("/samples/poster.svg"));
  assert.ok(html.includes("/q/preview/poster.svg"));
  assert.ok(html.includes("ONE NIGHT ONLY"));
  assert.equal(html.includes("/m/"), false);
});

test("sample index lists four themes", () => {
  const html = renderSampleIndex("https://blinkboard.pages.dev");
  assert.ok(html.includes("/preview/classic"));
  assert.ok(html.includes("/preview/eightbit"));
  assert.ok(html.includes("/preview/midnight"));
  assert.ok(html.includes("/preview/poster"));
});

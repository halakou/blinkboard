import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTheme, THEMES } from "../src/themes.js";
import { renderBoard, renderPreview } from "../src/html.js";

test("unknown theme falls back to classic", () => {
  assert.equal(normalizeTheme("eightbit"), "eightbit");
  assert.equal(normalizeTheme("nope"), "classic");
  assert.equal(THEMES.length, 4);
});

test("board links a theme stylesheet and escapes", () => {
  const html = renderBoard({
    code: "A2B3",
    kind: "promo",
    title: '<img src=x onerror="alert(1)">',
    body: "Hello <script>alert(1)</script>",
    cta_url: "https://example.com/a",
    theme: "eightbit",
    expires_at: Date.now() + 1000,
  }, "https://blinkboard.pages.dev");
  assert.ok(html.includes("/themes/eightbit.css"));
  assert.ok(html.includes("theme-eightbit"));
  assert.equal(html.includes("<script>alert"), false);
  assert.ok(html.includes("&lt;img"));
});

test("preview uses sample copy", () => {
  const html = renderPreview("poster", "https://blinkboard.pages.dev");
  assert.ok(html.includes("theme-poster"));
  assert.ok(html.includes("Neon Dumpling"));
});

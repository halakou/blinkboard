import test from "node:test";
import assert from "node:assert/strict";
import { moderatePage, moderateText, validateHttpsUrl } from "../src/moderate.js";
import { escapeHtml } from "../src/escape.js";

test("https urls only, no ip/shortener/userinfo", () => {
  assert.equal(validateHttpsUrl("https://example.com/x").ok, true);
  assert.equal(validateHttpsUrl("http://example.com").ok, false);
  assert.equal(validateHttpsUrl("https://127.0.0.1/x").ok, false);
  assert.equal(validateHttpsUrl("https://192.168.0.1/x").ok, false);
  assert.equal(validateHttpsUrl("https://bit.ly/x").ok, false);
  assert.equal(validateHttpsUrl("https://user:pass@example.com").ok, false);
  assert.equal(validateHttpsUrl("javascript:alert(1)").ok, false);
  assert.equal(validateHttpsUrl("https://localhost/x").ok, false);
});

test("scam phishing malware csam blocked, normal ads pass", () => {
  assert.equal(moderateText("Summer sale 20% off bikes in Berlin").ok, true);
  assert.equal(moderateText("Send your seed phrase to claim").ok, false);
  assert.equal(moderateText("Connect your wallet to continue").ok, false);
  assert.equal(moderateText("Free crypto airdrop now").ok, false);
  assert.equal(moderateText("Verify your account immediately").ok, false);
  assert.equal(moderateText("Install this ransomware tool").ok, false);
  assert.equal(moderateText("child sexual content here").ok, false);
});

test("page model without free HTML", () => {
  const ok = moderatePage({
    kind: "promo",
    title: "Studio open",
    body: "Drop in this weekend. Coffee on us.",
    ctaUrl: "https://example.com/shop",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.ctaUrl, "https://example.com/shop");
  const need = moderatePage({ kind: "link", title: "Go", body: "Tap through", ctaUrl: "" });
  assert.equal(need.ok, false);
  const html = escapeHtml('<img src=x onerror=alert(1)>');
  assert.equal(html.includes("<img"), false);
  assert.ok(html.includes("&lt;img"));
});
